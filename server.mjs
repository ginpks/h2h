import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));
const dist = join(root, "dist");
const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || (process.env.RENDER ? "0.0.0.0" : "127.0.0.1");
const allowedOrigin = process.env.ALLOWED_ORIGIN || "*";
const rapidTennisHost = process.env.RAPID_TENNIS_HOST || "tennis-api-atp-wta-itf.p.rapidapi.com";
const rapidTennisBaseUrl = process.env.RAPID_TENNIS_BASE_URL || `https://${rapidTennisHost}`;
const rapidTennisKey = process.env.RAPID_TENNIS_API_KEY || process.env.RAPIDAPI_KEY || "";
const rapidCache = new Map();
const rapidCacheTtlMs = Number(process.env.RAPID_TENNIS_CACHE_TTL_MS || 5 * 60 * 1000);
const rapidMatchPageLimit = Number(process.env.RAPID_TENNIS_MATCH_PAGE_LIMIT || 100);
const rapidMatchMaxPages = Number(process.env.RAPID_TENNIS_MATCH_MAX_PAGES || 6);
const tennisStatsFetchEnabled = process.env.TENNISSTATS_ENABLE_FETCH === "1";
const tennisStatsSearchEnabled = tennisStatsFetchEnabled || process.env.TENNISSTATS_ENABLE_SEARCH === "1";
const fallbackSearchEnabled = process.env.SEARCH_FALLBACK_ENABLE !== "0";
let tennisAbstractPlayerListCache = { fetchedAt: 0, players: [] };
const verifiedPublicSearchPlayers = [
  { id: "tennisabstract:m:izan-almazan-valiente", name: "Izan Almazan Valiente", country: "ESP", ranking: 585, tour: "M", source: "Tennis Abstract" },
  { id: "tennisabstract:m:dominik-palan", name: "Dominik Palan", country: "CZE", ranking: 498, tour: "M", source: "Tennis Abstract" },
];
const bundledSearchPlayers = [
  { id: "sample-M:Jannik Sinner", name: "Jannik Sinner", country: "ITA", ranking: 1, tour: "M", source: "Demo dataset" },
  { id: "sample-M:Carlos Alcaraz", name: "Carlos Alcaraz", country: "ESP", ranking: 2, tour: "M", source: "Demo dataset" },
  { id: "sample-W:Iga Swiatek", name: "Iga Swiatek", country: "POL", ranking: 3, tour: "W", source: "Demo dataset" },
  { id: "sample-W:Aryna Sabalenka", name: "Aryna Sabalenka", country: "BLR", ranking: 1, tour: "W", source: "Demo dataset" },
];

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
};

createServer(async (request, response) => {
  try {
    setCorsHeaders(response);
    if (request.method === "OPTIONS") {
      response.writeHead(204);
      response.end();
      return;
    }

    const url = new URL(request.url || "/", `http://${request.headers.host}`);

    if (request.method === "GET" && url.pathname === "/api/status") {
      writeJson(response, {
        dataMode: process.env.TENNIS_DATA_MODE === "live" ? "live" : "hybrid",
        analysisMode: process.env.OPENAI_API_KEY ? "openai" : "local",
        dataUpdatedAt: process.env.TENNIS_DATA_UPDATED_AT || "2026-07-05T00:00:00.000Z",
        providers: [
          {
            name: "Demo dataset",
            status: "ready",
            detail: "Bundled sample rankings, matches, surface records, and recent form",
          },
          {
            name: "OpenAI",
            status: process.env.OPENAI_API_KEY ? "ready" : "planned",
            detail: process.env.OPENAI_API_KEY ? "Responses API analysis is enabled" : "Set OPENAI_API_KEY to enable model analysis",
          },
          {
            name: "Live tennis providers",
            status: "ready",
            detail: fallbackSearchEnabled
              ? "Rapid Tennis API is primary; public search fallbacks stay available if Rapid quota is exhausted"
              : "Rapid Tennis API is the structured source for search, player stats, match history, and live context",
          },
          {
            name: "Rapid Tennis API",
            status: rapidTennisKey ? "ready" : "planned",
            detail: rapidTennisKey ? "Live events and live-score context are enabled" : "Set RAPID_TENNIS_API_KEY to enable live-score context",
          },
          {
            name: "Search fallbacks",
            status: fallbackSearchEnabled ? "ready" : "planned",
            detail: fallbackSearchEnabled
              ? `Wikidata${tennisStatsSearchEnabled ? ", TennisStats," : ""} and demo roster search can fill in when Rapid search is unavailable`
              : "Set SEARCH_FALLBACK_ENABLE=1 to enable non-Rapid player search",
          },
        ],
      });
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/live-events") {
      try {
        writeJson(response, await fetchRapidLiveEvents());
      } catch (error) {
        console.error("Rapid Tennis live events failed:", error);
        response.writeHead(502, { "Content-Type": mimeTypes[".json"] });
        response.end(JSON.stringify({ error: "Could not fetch live events", detail: error instanceof Error ? error.message : "Unknown upstream error" }));
      }
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/live-event") {
      const eventId = url.searchParams.get("id") || "";
      if (!eventId.trim()) {
        response.writeHead(400, { "Content-Type": mimeTypes[".json"] });
        response.end(JSON.stringify({ error: "Expected event id" }));
        return;
      }
      try {
        writeJson(response, await fetchRapidLiveScore(eventId));
      } catch (error) {
        console.error("Rapid Tennis live score failed:", error);
        response.writeHead(502, { "Content-Type": mimeTypes[".json"] });
        response.end(JSON.stringify({ error: "Could not fetch live score", detail: error instanceof Error ? error.message : "Unknown upstream error" }));
      }
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/search") {
      const query = url.searchParams.get("q") || "";
      writeJson(response, await searchPlayers(query));
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/player") {
      const name = url.searchParams.get("name") || "";
      const tour = url.searchParams.get("tour") || "M";
      if (!name.trim()) {
        response.writeHead(400, { "Content-Type": mimeTypes[".json"] });
        response.end(JSON.stringify({ error: "Expected player name" }));
        return;
      }
      try {
        writeJson(response, await fetchRapidPlayerProfile(name, tour));
      } catch (error) {
        if (fallbackSearchEnabled && isRapidFallbackError(error)) {
          const reason = isRapidQuotaError(error) ? "quota" : error instanceof Error ? error.message : "unavailable";
          console.warn(`Rapid Tennis player fetch unavailable for ${name} (${reason}); using public fallback profile.`);
          writeJson(response, await buildFallbackPlayerProfile(name, tour, error));
        } else {
          console.error("Rapid Tennis player fetch failed:", error);
          response.writeHead(502, { "Content-Type": mimeTypes[".json"] });
          response.end(
            JSON.stringify({
              error: "Could not fetch player from Rapid Tennis API",
              detail: error instanceof Error ? error.message : "Unknown upstream error",
            }),
          );
        }
      }
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/analyze") {
      const body = await readJson(request);
      if (!body.first || !body.second) {
        response.writeHead(400, { "Content-Type": mimeTypes[".json"] });
        response.end(JSON.stringify({ error: "Expected first and second players" }));
        return;
      }
      const analysis = await createOpenAiAnalysis(body);
      writeJson(response, analysis);
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/chat") {
      const body = await readJson(request);
      if (!body.first || !body.second || !body.question) {
        response.writeHead(400, { "Content-Type": mimeTypes[".json"] });
        response.end(JSON.stringify({ error: "Expected first, second, and question" }));
        return;
      }
      writeJson(response, await createOpenAiChatReply(body));
      return;
    }

    if (request.method !== "GET") {
      response.writeHead(405);
      response.end("Method not allowed");
      return;
    }

    const assetPath = safeAssetPath(url.pathname);
    const file = await readFile(assetPath);
    response.writeHead(200, { "Content-Type": mimeTypes[extname(assetPath)] || "application/octet-stream" });
    response.end(file);
  } catch (error) {
    if (error?.code === "ENOENT") {
      const file = await readFile(join(dist, "index.html"));
      response.writeHead(200, { "Content-Type": mimeTypes[".html"] });
      response.end(file);
      return;
    }

    response.writeHead(500, { "Content-Type": mimeTypes[".json"] });
    response.end(JSON.stringify({ error: "Server error" }));
  }
}).listen(port, host, () => {
  console.log(`Tennis dashboard running at http://${host}:${port}/`);
});

function setCorsHeaders(response) {
  response.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  response.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
}

function safeAssetPath(pathname) {
  const requested = pathname === "/" ? "/index.html" : pathname;
  const assetPath = normalize(join(dist, requested));
  if (!assetPath.startsWith(dist)) {
    return join(dist, "index.html");
  }
  return assetPath;
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let raw = "";
    request.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 1_000_000) {
        request.destroy();
        reject(new Error("Payload too large"));
      }
    });
    request.on("end", () => {
      try {
        resolve(JSON.parse(raw || "{}"));
      } catch (error) {
        reject(error);
      }
    });
    request.on("error", reject);
  });
}

function writeJson(response, value) {
  response.writeHead(200, { "Content-Type": mimeTypes[".json"] });
  response.end(JSON.stringify(value));
}

function unwrapData(value) {
  if (value?.data !== undefined) return value.data;
  if (value?.value !== undefined) return value.value;
  return value;
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.value)) return value.value;
  if (Array.isArray(value?.data)) return value.data;
  return [];
}

function samePlayer(first, second) {
  return normalizePlayerName(first) === normalizePlayerName(second);
}

function parseIsoDate(value) {
  return String(value || "").slice(0, 10) || new Date().toISOString().slice(0, 10);
}

function ageFromDate(value) {
  const birth = new Date(value);
  if (Number.isNaN(birth.getTime())) return 0;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  if (now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) {
    age -= 1;
  }
  return age;
}

async function fetchRapidLiveEvents() {
  const data = await fetchRapidTennisJson("/tennis/v2/extend/api/events/live");
  const results = Array.isArray(data.results) ? data.results : [];
  return {
    source: "Rapid Tennis API",
    fetchedAt: new Date().toISOString(),
    count: Number(data.count || results.length),
    events: results.filter(Boolean).map(normalizeRapidLiveEvent),
  };
}

async function fetchRapidLiveScore(eventId) {
  const data = await fetchRapidTennisJson(`/tennis/v2/extend/api/event/live-score/get/${encodeURIComponent(eventId)}`);
  return {
    source: "Rapid Tennis API",
    fetchedAt: new Date().toISOString(),
    event: normalizeRapidLiveEvent(data.result || {}),
  };
}

async function searchRapidPlayers(query) {
  const normalized = query.trim();
  if (normalized.length < 2) {
    return [];
  }

  const groups = await fetchRapidTennisJson(`/tennis/v2/ms-api/search/${encodeURIComponent(normalized)}`);
  return asArray(groups)
    .filter((group) => String(group.category || "").startsWith("player_"))
    .flatMap((group) => {
      const tour = String(group.category || "").endsWith("wta") ? "W" : "M";
      return asArray(group.result).map((player) => ({
        id: `${tour}:${player.name}`,
        name: String(player.name || ""),
        country: String(player.countryAcr || ""),
        ranking: numberOrZero(player.currentRank),
        tour,
        source: "Rapid Tennis API",
      }));
    })
    .filter((player) => player.name)
    .slice(0, 12);
}

async function searchPlayers(query) {
  const normalized = query.trim();
  if (normalized.length < 2) {
    return [];
  }

  try {
    const rapidResults = await searchRapidPlayers(normalized);
    if (rapidResults.length || !fallbackSearchEnabled) {
      return rapidResults;
    }
    console.warn(`Rapid Tennis search returned no players for "${normalized}"; trying fallback search providers.`);
    return searchFallbackPlayers(normalized);
  } catch (error) {
    if (!fallbackSearchEnabled) {
      throw error;
    }
    const reason = isRapidQuotaError(error) ? "quota exhausted" : error instanceof Error ? error.message : "upstream error";
    console.warn(`Rapid Tennis search unavailable (${reason}); trying fallback search providers.`);
    return searchFallbackPlayers(normalized);
  }
}

async function searchFallbackPlayers(query) {
  const results = [];
  results.push(...searchVerifiedPublicPlayers(query));

  if (tennisStatsSearchEnabled) {
    try {
      results.push(...(await searchTennisStatsPlayers(query)));
    } catch (error) {
      console.warn("TennisStats search fallback failed:", error instanceof Error ? error.message : error);
    }
  }

  try {
    results.push(...(await searchTennisAbstractPlayers(query)));
  } catch (error) {
    console.warn("TennisAbstract player-list fallback failed:", error instanceof Error ? error.message : error);
  }

  try {
    results.push(...(await searchDuckDuckGoTennisPlayers(query)));
  } catch (error) {
    console.warn("DuckDuckGo tennis search fallback failed:", error instanceof Error ? error.message : error);
  }

  try {
    results.push(...(await searchWikidataTennisPlayers(query)));
  } catch (error) {
    console.warn("Wikidata search fallback failed:", error instanceof Error ? error.message : error);
  }

  results.push(...searchBundledPlayers(query));
  return dedupeSearchResults(results).slice(0, 12);
}

function searchVerifiedPublicPlayers(query) {
  const normalized = normalizePlayerName(query);
  const tokens = normalized.split(" ").filter((token) => token.length > 1);
  if (!tokens.length) return [];
  return verifiedPublicSearchPlayers.filter((player) => {
    const haystack = normalizePlayerName(`${player.name} ${player.country}`);
    return tokens.every((token) => haystack.includes(token));
  });
}

async function searchTennisStatsPlayers(query) {
  const url = `https://tennisstats.com/?s=${encodeURIComponent(query)}`;
  const response = await fetch(url, {
    headers: tennisStatsHeaders(),
  });
  if (!response.ok) {
    throw new Error(`TennisStats search returned ${response.status}`);
  }

  const html = await response.text();
  const matches = [...html.matchAll(/href=["']https?:\/\/tennisstats\.com\/players\/([^"'?#/]+)\/?["'][\s\S]{0,220}?>([^<]+)</gi)];
  return matches
    .map((match) => {
      const name = decodeHtmlEntities(match[2]).replace(/\s+-\s+Tennis Stats.*$/i, "").trim();
      return {
        id: `tennisstats:${match[1]}`,
        name,
        country: "",
        ranking: 0,
        tour: undefined,
        source: "TennisStats",
      };
    })
    .filter((player) => player.name && normalizePlayerName(player.name).includes(normalizePlayerName(query)));
}

async function searchTennisAbstractPlayers(query) {
  const normalized = normalizePlayerName(query);
  const tokens = normalized.split(" ").filter((token) => token.length > 1);
  if (!tokens.length) return [];

  const players = await getTennisAbstractPlayerList();
  return players
    .filter((player) => {
      const haystack = normalizePlayerName(player.name);
      return tokens.every((token) => haystack.includes(token));
    })
    .slice(0, 20)
    .map((player) => ({
      id: `tennisabstract:${player.tour.toLowerCase()}:${slugifyTennisStatsPlayerName(player.name)}`,
      name: player.name,
      country: "",
      ranking: 0,
      tour: player.tour,
      source: "Tennis Abstract",
    }));
}

async function getTennisAbstractPlayerList() {
  const now = Date.now();
  if (tennisAbstractPlayerListCache.players.length && now - tennisAbstractPlayerListCache.fetchedAt < 6 * 60 * 60 * 1000) {
    return tennisAbstractPlayerListCache.players;
  }

  const response = await fetch("https://www.tennisabstract.com/mwplayerlist.js", { headers: tennisAbstractHeaders() });
  if (!response.ok) {
    throw new Error(`TennisAbstract player list returned ${response.status}`);
  }
  const source = await response.text();
  const match = source.match(/var\s+playerlist\s*=\s*(\[[\s\S]*?\]);?/);
  if (!match) {
    throw new Error("TennisAbstract player list was not parseable");
  }
  const entries = JSON.parse(match[1]);
  const players = asArray(entries)
    .map((entry) => {
      const parsed = String(entry || "").match(/^\(([MW])\)\s+(.+)$/);
      if (!parsed) return null;
      return { tour: parsed[1], name: parsed[2].trim() };
    })
    .filter(Boolean);
  tennisAbstractPlayerListCache = { fetchedAt: now, players };
  return players;
}

async function searchDuckDuckGoTennisPlayers(query) {
  const url = `https://duckduckgo.com/html/?q=${encodeURIComponent(`${query} tennis player`)}`;
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });
  if (!response.ok) {
    throw new Error(`DuckDuckGo returned ${response.status}`);
  }

  const html = await response.text();
  const matches = [...html.matchAll(/<a[^>]+class=["'][^"']*result__a[^"']*["'][^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)];
  return matches
    .map((match) => {
      const sourceUrl = decodeDuckDuckGoResultUrl(match[1]);
      const title = stripHtml(match[2]);
      const name = playerNameFromSearchResult(title, sourceUrl, query);
      if (!name) return null;
      return {
        id: `public:${slugifyTennisStatsPlayerName(name)}`,
        name,
        country: "",
        ranking: 0,
        tour: inferTourFromPublicPlayerUrl(sourceUrl),
        source: publicSearchSourceName(sourceUrl),
      };
    })
    .filter(Boolean);
}

async function searchWikidataTennisPlayers(query) {
  const url = new URL("https://www.wikidata.org/w/api.php");
  url.searchParams.set("action", "wbsearchentities");
  url.searchParams.set("format", "json");
  url.searchParams.set("language", "en");
  url.searchParams.set("limit", "12");
  url.searchParams.set("search", query);
  const response = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "h2h-tennis-dashboard/0.1" },
  });
  if (!response.ok) {
    throw new Error(`Wikidata returned ${response.status}`);
  }

  const data = await response.json();
  return asArray(data.search)
    .filter((item) => /tennis/i.test(String(item.description || "")))
    .map((item) => ({
      id: `wikidata:${item.id}`,
      name: String(item.label || ""),
      country: "",
      ranking: 0,
      tour: undefined,
      source: "Wikidata",
    }))
    .filter((player) => player.name);
}

function searchBundledPlayers(query) {
  const normalized = normalizePlayerName(query);
  return bundledSearchPlayers.filter((player) => normalizePlayerName(`${player.name} ${player.country}`).includes(normalized));
}

function dedupeSearchResults(results) {
  const seen = new Set();
  return results.filter((result) => {
    const key = normalizePlayerName(result.name);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function decodeDuckDuckGoResultUrl(value) {
  const href = decodeHtmlEntities(value || "");
  try {
    const url = new URL(href.startsWith("//") ? `https:${href}` : href);
    return url.searchParams.get("uddg") ? decodeURIComponent(url.searchParams.get("uddg") || "") : url.href;
  } catch {
    return href;
  }
}

function stripHtml(value) {
  return decodeHtmlEntities(String(value || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

function playerNameFromSearchResult(title, sourceUrl, query) {
  const url = String(sourceUrl || "").toLowerCase();
  const trustedPlayerUrl = [
    "atptour.com/",
    "wtatennis.com/",
    "itftennis.com/en/players/",
    "sofascore.com/tennis/player/",
    "flashscore.com/player/",
    "flashscoreusa.com/player/",
    "tennisexplorer.com/player/",
    "tennisabstract.com/cgi-bin/player.cgi",
  ].some((domain) => url.includes(domain));
  if (!trustedPlayerUrl) return "";

  const cleaned = stripHtml(title)
    .replace(/^tennis:\s*/i, "")
    .replace(/\s+\|\s+.*$/i, "")
    .replace(/\s+-\s+(ATP Tour|WTA Tennis|ITF|Tennis Explorer|Sofascore|Flashscore|Tennis Abstract).*$/i, "")
    .replace(/\s+(live score.*|scores.*|stats.*|player profile.*|overview.*|tennis player profile.*|tennis)$/i, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned || /\b(vs\.?|versus|prediction|fixtures?|results?)\b/i.test(cleaned)) return "";
  const queryTokens = normalizePlayerName(query).split(" ").filter((token) => token.length > 1);
  const normalizedCleaned = normalizePlayerName(cleaned);
  if (!queryTokens.every((token) => normalizedCleaned.includes(token))) return "";
  return cleaned;
}

function inferTourFromPublicPlayerUrl(sourceUrl) {
  const url = String(sourceUrl || "").toLowerCase();
  if (url.includes("wtatennis.com") || /\/wta|\/wt\//.test(url)) return "W";
  if (url.includes("atptour.com") || /\/atp|\/mt\//.test(url)) return "M";
  return undefined;
}

function publicSearchSourceName(sourceUrl) {
  const url = String(sourceUrl || "").toLowerCase();
  if (url.includes("atptour.com")) return "ATP Tour";
  if (url.includes("wtatennis.com")) return "WTA";
  if (url.includes("itftennis.com")) return "ITF";
  if (url.includes("sofascore.com")) return "Sofascore";
  if (url.includes("flashscore")) return "Flashscore";
  if (url.includes("tennisexplorer.com")) return "Tennis Explorer";
  if (url.includes("tennisabstract.com")) return "Tennis Abstract";
  return "Public tennis search";
}

async function fetchRapidPlayerProfile(name, tour = "M") {
  const [profileResult, statsResult, surfaceResult, matchesResult, publicStatsResult] = await Promise.allSettled([
    fetchRapidTennisJson(`/tennis/v2/ms-api/profile/${encodeURIComponent(name)}`),
    fetchRapidTennisJson(`/tennis/v2/ms-api/profile/${encodeURIComponent(name)}/statistics`),
    fetchRapidTennisJson(`/tennis/v2/ms-api/profile/${encodeURIComponent(name)}/surface-summary`),
    fetchRapidPlayerMatches(name),
    tennisStatsFetchEnabled ? fetchTennisStatsPlayerStats(name) : Promise.resolve(null),
  ]);

  if (profileResult.status === "rejected" && statsResult.status === "rejected" && matchesResult.status === "rejected") {
    throw profileResult.reason;
  }

  const profile = profileResult.status === "fulfilled" ? unwrapData(profileResult.value) : {};
  const stats = statsResult.status === "fulfilled" ? unwrapData(statsResult.value) : {};
  const surfaceSummary = surfaceResult.status === "fulfilled" ? unwrapData(surfaceResult.value) : [];
  const matchPayload = matchesResult.status === "fulfilled" ? unwrapData(matchesResult.value) : {};
  const publicStats = publicStatsResult.status === "fulfilled" ? publicStatsResult.value : null;
  const singles = asArray(matchPayload.singles);
  const sampleMatch = singles.find((match) => samePlayer(match.player1?.name, name) || samePlayer(match.player2?.name, name));
  const playerFromMatch = samePlayer(sampleMatch?.player1?.name, name) ? sampleMatch.player1 : sampleMatch?.player2 || {};
  const rapidId = numberOrZero(profile.id || playerFromMatch.id);
  const normalizedTour = String(profile.type || (tour === "W" ? "wta" : "atp")).toLowerCase() === "wta" ? "W" : "M";
  const matches = singles.map((match) => normalizeRapidMatch(match, name)).filter(Boolean);
  const record = parseRecord(stats.total);

  return {
    id: `rapid-${normalizedTour.toLowerCase()}-${slugifyPlayerName(profile.name || name).toLowerCase()}`,
    rapidId,
    tour: normalizedTour,
    name: String(profile.name || name),
    country: String(profile.country?.acronym || playerFromMatch.countryAcr || ""),
    age: profile.birthday ? ageFromDate(profile.birthday) : 0,
    ranking: numberOrZero(stats.currentRank || profile.currentRank || playerFromMatch.currentRank),
    points: numberOrZero(profile.points || playerFromMatch.points),
    titles: numberOrZero(stats.totalTitles || stats.totalTitlesWon),
    seasonRecord: deriveSeasonRecord(surfaceSummary, new Date().getFullYear()) || deriveRecord(matches.filter((match) => match.date.startsWith(String(new Date().getFullYear())))),
    careerSurfaces: normalizeRapidSurfaceRecords(surfaceSummary, stats, matches),
    matches,
    apiStats: {
      source: "Rapid Tennis API",
      fetchedAt: new Date().toISOString(),
      rapidId,
      recentGames: asArray(stats.recentGames),
      careerRecord: { wins: record[0], losses: record[1] },
      totalMatches: record[0] + record[1] || numberOrZero(matchPayload.singlesCount) || matches.length,
      matchLogCount: matches.length,
      bestRank: stats.bestRank || null,
      favouriteCourt: stats.favouriteCourt || null,
      singlesCount: numberOrZero(matchPayload.singlesCount),
      publicStats,
    },
    source: {
      name: "Rapid Tennis API",
      url: "https://tennisapidoc.matchstat.com/",
      fetchedAt: new Date().toISOString(),
    },
  };
}

async function buildFallbackPlayerProfile(name, tour = "M", cause = null) {
  const publicStats = tennisStatsFetchEnabled ? await fetchOptionalTennisStatsPlayerStats(name) : null;
  const abstractProfile = await fetchOptionalTennisAbstractProfile(name, tour);
  const publicSurfaces = publicStats?.surfaceCareer || {};
  const careerSurfaces = abstractProfile?.careerSurfaces?.some((surface) => surface.wins + surface.losses > 0)
    ? abstractProfile.careerSurfaces
    : ["Hard", "Clay", "Grass", "Indoor"].map((surface) => ({
        surface,
        wins: numberOrZero(publicSurfaces[surface]?.wins),
        losses: numberOrZero(publicSurfaces[surface]?.losses),
      }));
  const careerRecord = publicStats?.careerRecord || { wins: 0, losses: 0 };
  const currentYearRecord = publicStats?.currentYearRecord || { wins: 0, losses: 0 };
  const normalizedTour = tour === "W" ? "W" : "M";
  const matches = abstractProfile?.matches || [];
  const derivedCareer = deriveRecord(matches);
  const derivedSeason = deriveRecord(matches.filter((match) => match.date.startsWith(String(new Date().getFullYear()))));
  const fallbackCareer = derivedCareer.wins + derivedCareer.losses ? derivedCareer : { wins: numberOrZero(careerRecord.wins), losses: numberOrZero(careerRecord.losses) };
  const fallbackSeason = derivedSeason.wins + derivedSeason.losses ? derivedSeason : { wins: numberOrZero(currentYearRecord.wins), losses: numberOrZero(currentYearRecord.losses) };

  return {
    id: `fallback-${normalizedTour.toLowerCase()}-${slugifyPlayerName(name).toLowerCase()}`,
    tour: normalizedTour,
    name: abstractProfile?.name || name,
    country: abstractProfile?.country || "",
    age: abstractProfile?.age || numberOrZero(publicStats?.profile?.age),
    ranking: abstractProfile?.ranking || 0,
    points: 0,
    titles: 0,
    seasonRecord: fallbackSeason,
    careerSurfaces,
    matches,
    apiStats: {
      source: abstractProfile ? "TennisAbstract public fallback" : publicStats ? "TennisStats public fallback" : "Public-source fallback",
      fetchedAt: new Date().toISOString(),
      careerRecord: fallbackCareer,
      totalMatches: numberOrZero(careerRecord.totalMatches) || fallbackCareer.wins + fallbackCareer.losses,
      matchLogCount: matches.length,
      publicStats: publicStats || abstractProfile?.publicStats || null,
      fallbackReason: cause instanceof Error ? cause.message : "Rapid Tennis API unavailable",
    },
    source: {
      name: abstractProfile ? "TennisAbstract fallback" : publicStats ? "TennisStats fallback" : "Public-source fallback",
      url: abstractProfile?.url || publicStats?.url || "https://www.wikidata.org/",
      fetchedAt: new Date().toISOString(),
    },
  };
}

async function fetchOptionalTennisAbstractProfile(name, tour = "M") {
  try {
    return await fetchTennisAbstractProfile(name, tour);
  } catch (error) {
    console.warn(`TennisAbstract fallback failed for ${name}:`, error instanceof Error ? error.message : error);
    return null;
  }
}

async function fetchTennisAbstractProfile(name, tour = "M") {
  const slug = slugifyTennisAbstractPlayerName(name);
  const basePath = tour === "W" ? "wplayer.cgi" : "player.cgi";
  const url = `https://www.tennisabstract.com/cgi-bin/${basePath}?p=${slug}`;
  const pageResponse = await fetch(url, { headers: tennisAbstractHeaders() });
  if (!pageResponse.ok) {
    throw new Error(`TennisAbstract returned ${pageResponse.status}`);
  }
  const page = await pageResponse.text();
  const resolvedName = jsVarString(page, "fullname") || name;
  const jsSlug = jsVarString(page, "nameparam") || slug;
  const fragUrl = `https://www.tennisabstract.com/jsfrags/${encodeURIComponent(jsSlug)}.js`;
  const fragResponse = await fetch(fragUrl, { headers: tennisAbstractHeaders() });
  const fragment = fragResponse.ok ? await fragResponse.text() : "";
  const matches = parseTennisAbstractRecentMatches(fragment, resolvedName);
  const careerSurfaces = ["Hard", "Clay", "Grass", "Indoor"].map((surface) => {
    const surfaceMatches = matches.filter((match) => match.surface === surface);
    const wins = surfaceMatches.filter((match) => match.result === "W").length;
    return { surface, wins, losses: surfaceMatches.length - wins };
  });
  const dob = jsVarNumber(page, "dob");
  const hand = jsVarString(page, "hand");
  return {
    name: resolvedName,
    country: jsVarString(page, "country"),
    age: dob ? ageFromYYYYMMDD(String(dob)) : 0,
    ranking: jsVarNumber(page, "currentrank"),
    careerSurfaces,
    matches,
    url,
    publicStats: {
      source: "TennisAbstract",
      url,
      fetchedAt: new Date().toISOString(),
      profile: {
        age: dob ? ageFromYYYYMMDD(String(dob)) : 0,
        hand: hand === "R" ? "Right-handed" : hand === "L" ? "Left-handed" : null,
      },
    },
  };
}

function parseTennisAbstractRecentMatches(fragment) {
  const seen = new Set();
  const rows = [...String(fragment || "").matchAll(/<tr>([\s\S]*?)<\/tr>/gi)];
  return rows
    .map((row) => {
      const cells = [...row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((match) => match[1]);
      if (cells.length < 8) return null;
      const date = parseTennisAbstractDate(stripHtml(cells[0]));
      const score = stripHtml(cells[7]);
      if (!date || !score) return null;
      const matchup = cells[6];
      const playerWon = /<b>[\s\S]*?<\/b>\s*d\./i.test(matchup);
      const playerLost = /d\.[\s\S]*?<b>[\s\S]*?<\/b>/i.test(matchup);
      if (!playerWon && !playerLost) return null;
      const opponentMatch = matchup.match(/<a[^>]+player\.cgi\?p=[^"']+["'][^>]*>([\s\S]*?)<\/a>/i);
      const opponent = opponentMatch ? stripHtml(opponentMatch[1]) : "Unknown";
      const opponentRank = numberOrZero(stripHtml(cells[5]));
      return {
        date,
        tournament: stripHtml(cells[1]),
        surface: normalizeSurface(stripHtml(cells[2])),
        round: stripHtml(cells[3]),
        opponent,
        opponentRank,
        result: playerWon ? "W" : "L",
        score: playerWon ? score : invertScore(score),
      };
    })
    .filter(Boolean)
    .filter((match) => {
      const key = [match.date, match.tournament, match.round, match.opponent, match.score].join("|");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 80);
}

function parseTennisAbstractDate(value) {
  const match = String(value || "").match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
  if (!match) return "";
  const months = { jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06", jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12" };
  return `${match[3]}-${months[match[2].toLowerCase()] || "01"}-${match[1].padStart(2, "0")}`;
}

function jsVarString(source, name) {
  const match = String(source || "").match(new RegExp(`var\\s+${escapeRegExp(name)}\\s*=\\s*'([^']*)'`));
  return match ? decodeHtmlEntities(match[1]) : "";
}

function jsVarNumber(source, name) {
  const match = String(source || "").match(new RegExp(`var\\s+${escapeRegExp(name)}\\s*=\\s*([0-9]+)`));
  return match ? Number(match[1]) : 0;
}

function slugifyTennisAbstractPlayerName(name) {
  return String(name || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z]/g, "");
}

function tennisAbstractHeaders() {
  return {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
  };
}

async function fetchRapidPlayerMatches(name) {
  const encodedName = encodeURIComponent(name);
  const firstPage = unwrapData(await fetchRapidTennisJson(`/tennis/v2/ms-api/profile/${encodedName}/matches-played?limit=${rapidMatchPageLimit}&page=1`));
  const singles = [...asArray(firstPage.singles)];
  const singlesCount = numberOrZero(firstPage.singlesCount);
  const totalPages = singlesCount ? Math.ceil(singlesCount / rapidMatchPageLimit) : 1;
  const pagesToFetch = Math.min(totalPages, rapidMatchMaxPages);

  for (let page = 2; page <= pagesToFetch; page += 1) {
    try {
      const payload = unwrapData(await fetchRapidTennisJson(`/tennis/v2/ms-api/profile/${encodedName}/matches-played?limit=${rapidMatchPageLimit}&page=${page}`));
      singles.push(...asArray(payload.singles));
      if (!asArray(payload.singles).length) break;
    } catch (error) {
      console.warn(`Rapid Tennis match page ${page} failed for ${name}:`, error instanceof Error ? error.message : error);
      break;
    }
  }

  return { ...firstPage, singles };
}

async function fetchTennisStatsPlayerStats(name) {
  const slug = slugifyTennisStatsPlayerName(name);
  const url = `https://tennisstats.com/players/${slug}`;
  const response = await fetch(url, {
    headers: tennisStatsHeaders(),
  });

  if (!response.ok) {
    throw new Error(`TennisStats returned ${response.status} for ${url}`);
  }

  return parseTennisStatsPlayerPage(await response.text(), name, url);
}

async function fetchOptionalTennisStatsPlayerStats(name) {
  try {
    return await fetchTennisStatsPlayerStats(name);
  } catch (error) {
    console.warn(`TennisStats profile fallback failed for ${name}:`, error instanceof Error ? error.message : error);
    return null;
  }
}

function tennisStatsHeaders() {
  return {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
  };
}

function parseTennisStatsPlayerPage(html, name, url) {
  const lines = htmlToTextLines(html);
  const matchSetStart = lines.findIndex((line) => line === "## Win Percentage (Match / Set)");
  const matchSetEnd = lines.findIndex((line, index) => index > matchSetStart && line.startsWith("## "));
  const matchSetLines = lines.slice(matchSetStart, matchSetEnd === -1 ? undefined : matchSetEnd);
  const currentRows = parseTennisStatsCurrentRows(matchSetLines);
  const careerRows = parseTennisStatsCareerRows(matchSetLines);
  const careerMatchWins = careerRows["Match Wins"];
  const careerRecord = parseTennisStatsCareerRecord(lines, name, careerMatchWins?.number);

  return {
    source: "TennisStats",
    url,
    fetchedAt: new Date().toISOString(),
    profile: parseTennisStatsProfile(lines),
    recentForm: parseTennisStatsRecentForm(lines),
    currentYearRecord: parseTennisStatsCurrentYearRecord(lines, name),
    careerRecord,
    surfaceCareer: parseTennisStatsCareerSurfaces(lines),
    matchSet: {
      currentYear: currentRows,
      career: careerRows,
    },
  };
}

function parseTennisStatsProfile(lines) {
  const forehandIndex = lines.findIndex((line) => line === "Forehand");
  const serveSpeedIndex = lines.findIndex((line) => line === "Serve Speed");
  const ageIndex = lines.findIndex((line) => line === "Age");
  return {
    age: ageIndex === -1 ? 0 : numberOrZero(lines[ageIndex + 1]),
    hand: forehandIndex === -1 ? null : lines[forehandIndex + 1] || null,
    serveSpeed: serveSpeedIndex === -1 ? null : lines[serveSpeedIndex + 3] || null,
    serveSpeedPercentile: serveSpeedIndex === -1 ? 0 : numberOrZero(lines[serveSpeedIndex + 7]),
  };
}

function parseTennisStatsCurrentRows(lines) {
  const rows = {};
  for (const label of tennisStatsMatchSetLabels()) {
    const index = lines.findIndex((line) => line === label);
    if (index === -1) continue;
    rows[label] = {
      percent: percentOrNull(lines[index + 1]),
      last12MonthsPercent: percentOrNull(lines[index + 2]),
      percentile: numberOrZero(lines[index + 3]),
    };
  }
  return rows;
}

function parseTennisStatsCareerRows(lines) {
  const rows = {};
  const careerHeader = lines.findIndex((line, index) => line === "Data Point" && lines[index + 1] === "Percentage" && lines[index + 2] === "Number");
  if (careerHeader === -1) return rows;

  for (const label of tennisStatsMatchSetLabels()) {
    const index = lines.findIndex((line, lineIndex) => lineIndex > careerHeader && line === label);
    if (index === -1) continue;
    rows[label] = {
      percent: percentOrNull(lines[index + 1]),
      number: lines[index + 2] || "",
      percentile: numberOrZero(lines[index + 3]),
    };
  }
  return rows;
}

function tennisStatsMatchSetLabels() {
  return ["Match Wins", "Match Wins (3 Sets)", "Wins in Straight Sets", "Wins From Behind", "Won At Least 1 Set", "Set 1 Win", "Set 2 Win", "Set 3 Win"];
}

function parseTennisStatsRecentForm(lines) {
  const formIndex = lines.findIndex((line) => /\bForm$/.test(line));
  if (formIndex === -1) return [];
  return lines.slice(formIndex + 1, formIndex + 12).filter((line) => line === "W" || line === "L").slice(0, 10);
}

function parseTennisStatsCurrentYearRecord(lines, name) {
  const pattern = new RegExp(`${escapeRegExp(name)}'s record in \\d{4} is (\\d+) wins to (\\d+) losses`, "i");
  const line = lines.find((item) => pattern.test(item));
  const match = line?.match(pattern);
  if (!match) return null;
  const wins = Number(match[1]);
  const losses = Number(match[2]);
  return { wins, losses, winRate: winRate(wins, losses) };
}

function parseTennisStatsCareerRecord(lines, name, fallbackNumber = "") {
  const pattern = new RegExp(`career win record is (\\d+) wins to (\\d+) losses`, "i");
  const line = lines.find((item) => item.includes(name) && pattern.test(item));
  const match = line?.match(pattern);
  if (match) {
    const wins = Number(match[1]);
    const losses = Number(match[2]);
    return { wins, losses, totalMatches: wins + losses, winRate: winRate(wins, losses) };
  }

  const numberMatch = String(fallbackNumber || "").match(/(\d+)\s*\/\s*(\d+)/);
  if (!numberMatch) return null;
  const wins = Number(numberMatch[1]);
  const totalMatches = Number(numberMatch[2]);
  return { wins, losses: Math.max(totalMatches - wins, 0), totalMatches, winRate: winRate(wins, Math.max(totalMatches - wins, 0)) };
}

function parseTennisStatsCareerSurfaces(lines) {
  const start = lines.findIndex((line) => line === "Wins By Surface Type (Career Total)");
  if (start === -1) return {};
  const end = lines.findIndex((line, index) => index > start && line === "Data Point");
  const surfaceLines = lines.slice(start, end === -1 ? start + 40 : end);
  const surfaces = {};
  for (const surface of ["All Surfaces", "Hard", "Clay", "Grass", "Indoor"]) {
    const index = surfaceLines.findIndex((line) => line === surface);
    const value = surfaceLines[index + 1] || "";
    const match = value.match(/(\d+(?:\.\d+)?)%\s*\((\d+)\s*\/\s*(\d+)\)/);
    if (index === -1 || !match) continue;
    const percent = Math.round(Number(match[1]));
    const wins = Number(match[2]);
    const total = Number(match[3]);
    surfaces[surface] = {
      percent,
      wins,
      losses: Math.max(total - wins, 0),
      total,
    };
  }
  return surfaces;
}

function htmlToTextLines(html) {
  return String(html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, "\n")
    .replace(/<style[\s\S]*?<\/style>/gi, "\n")
    .replace(/<[^>]+>/g, "\n")
    .split(/\n+/)
    .map((line) => decodeHtmlEntities(line).replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function decodeHtmlEntities(value) {
  return String(value || "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function percentOrNull(value) {
  if (!/%/.test(String(value || ""))) return null;
  return percentOrZero(value);
}

function escapeRegExp(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function slugifyTennisStatsPlayerName(name) {
  return String(name || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeRapidMatch(match, playerName) {
  const playerIsOne = samePlayer(match.player1?.name, playerName);
  const player = playerIsOne ? match.player1 : match.player2;
  const opponent = playerIsOne ? match.player2 : match.player1;
  if (!player || !opponent || !match.result) return null;
  const result = playerIsOne ? "W" : "L";
  return {
    date: parseIsoDate(match.date),
    tournament: String(match.tournament?.name || ""),
    round: String(match.round?.name || match.roundId || ""),
    opponent: String(opponent.name || "Unknown"),
    opponentRank: numberOrZero(opponent.currentRank),
    surface: normalizeSurface(String(match.tournament?.court?.name || match.tournament?.court || "")),
    result,
    score: result === "L" ? invertScore(match.result) : String(match.result),
    stats: player.stats || null,
    opponentStats: opponent.stats || null,
    odds: {
      player: player.odd || (playerIsOne ? match.odd1 : match.odd2) || null,
      opponent: opponent.odd || (playerIsOne ? match.odd2 : match.odd1) || null,
    },
  };
}

function normalizeRapidSurfaceRecords(surfaceSummary, stats, matches) {
  const years = asArray(surfaceSummary);
  const totals = new Map();
  for (const year of years) {
    for (const [key, label] of [
      ["hard", "Hard"],
      ["clay", "Clay"],
      ["grass", "Grass"],
      ["ihard", "Indoor"],
      ["carpet", "Indoor"],
    ]) {
      const record = year[key];
      if (!record) continue;
      const existing = totals.get(label) || { surface: label, wins: 0, losses: 0 };
      existing.wins += numberOrZero(record.w);
      existing.losses += numberOrZero(record.l);
      totals.set(label, existing);
    }
  }

  const parsed = [...totals.values()].filter((surface) => surface.wins + surface.losses > 0);
  if (parsed.length) return parsed;

  if (stats.favouriteCourt?.surface) {
    return [
      {
        surface: normalizeSurface(stats.favouriteCourt.surface),
        wins: numberOrZero(stats.favouriteCourt.wins),
        losses: numberOrZero(stats.favouriteCourt.losses),
      },
    ];
  }

  return ["Hard", "Clay", "Grass", "Indoor"].map((surface) => {
    const surfaceMatches = matches.filter((match) => match.surface === surface);
    const wins = surfaceMatches.filter((match) => match.result === "W").length;
    return { surface, wins, losses: surfaceMatches.length - wins };
  });
}

function deriveSeasonRecord(surfaceSummary, year) {
  const current = asArray(surfaceSummary).find((item) => Number(item.year) === Number(year));
  if (!current?.sum) return null;
  return { wins: numberOrZero(current.sum.w), losses: numberOrZero(current.sum.l) };
}

async function fetchRapidTennisJson(path) {
  if (!rapidTennisKey) {
    throw new Error("RAPID_TENNIS_API_KEY is not configured");
  }

  const cached = rapidCache.get(path);
  if (cached && Date.now() - cached.timestamp < rapidCacheTtlMs) {
    return cached.data;
  }

  const data = await requestRapidTennisJson(path);
  rapidCache.set(path, { timestamp: Date.now(), data });
  return data;
}

async function requestRapidTennisJson(path, attempt = 1) {
  const response = await fetch(`${rapidTennisBaseUrl}${path}`, {
    headers: {
      "X-RapidAPI-Key": rapidTennisKey,
      "X-RapidAPI-Host": rapidTennisHost,
      Accept: "application/json",
    },
  });

  const text = await response.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  if (!response.ok) {
    const quotaExceeded = isQuotaResponse(response.status, data, text);
    if (response.status === 429 && !quotaExceeded && attempt < 3) {
      const retryAfterSeconds = Number(response.headers.get("retry-after") || 0);
      await delay(Math.max(1000, retryAfterSeconds * 1000 || attempt * 1200));
      return requestRapidTennisJson(path, attempt + 1);
    }
    throw new RapidTennisError(`Rapid Tennis returned ${response.status}${quotaExceeded ? " (quota exceeded)" : ""}`, response.status, quotaExceeded);
  }

  return data;
}

class RapidTennisError extends Error {
  constructor(message, status, quotaExceeded = false) {
    super(message);
    this.name = "RapidTennisError";
    this.status = status;
    this.quotaExceeded = quotaExceeded;
  }
}

function isQuotaResponse(status, data, text) {
  const body = `${JSON.stringify(data || {})} ${text || ""}`.toLowerCase();
  return status === 429 || /\b(quota|limit|rate|too many|exceeded)\b/.test(body);
}

function isRapidQuotaError(error) {
  return Boolean(error?.quotaExceeded || error?.status === 429 || /quota|limit|429|too many|exceeded/i.test(String(error?.message || "")));
}

function isRapidFallbackError(error) {
  return error instanceof RapidTennisError || /RAPID_TENNIS_API_KEY|Rapid Tennis/i.test(String(error?.message || ""));
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeRapidLiveEvent(event) {
  const score = String(event.score || "");
  return {
    id: String(event.id || ""),
    name: String(event.name || [event.participant1, event.participant2].filter(Boolean).join(" vs ")),
    participant1: String(event.participant1 || ""),
    participant2: String(event.participant2 || ""),
    league: String(event.league || ""),
    score,
    sets: parseLiveScore(score),
    points: String(event.points || ""),
    indicator: String(event.indicator || ""),
    status: String(event.status || ""),
    tourType: String(event.tourType || ""),
    startTimestamp: Number(event.startTimestamp || 0),
    matchId: String(event.matchId || ""),
    stats: event.stats || null,
    timeline: Array.isArray(event.timeline) ? event.timeline.filter(Boolean).slice(-8) : [],
  };
}

function parseLiveScore(score) {
  return String(score || "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part, index) => {
      const match = part.match(/^(\d+)-(\d+)/);
      return {
        setNumber: index + 1,
        player1Games: match ? Number(match[1]) : 0,
        player2Games: match ? Number(match[2]) : 0,
      };
    });
}

function deriveRecord(matches) {
  const wins = matches.filter((match) => match.result === "W").length;
  return { wins, losses: matches.length - wins };
}

function normalizeSurface(value) {
  if (value.includes("Clay")) return "Clay";
  if (value.includes("Grass")) return "Grass";
  if (value.includes("Carpet") || value.includes("Indoor")) return "Indoor";
  return "Hard";
}

function parseRecord(value) {
  const match = String(value || "").match(/(\d+)-(\d+)/);
  return match ? [Number(match[1]), Number(match[2])] : [0, 0];
}

function invertScore(score) {
  return String(score || "")
    .split(/\s+/)
    .map((part) => {
      const match = part.match(/^(\d+)-(\d+)(.*)$/);
      return match ? `${match[2]}-${match[1]}${match[3] || ""}` : part;
    })
    .join(" ");
}

function percentOrZero(value) {
  return Math.round(Number(String(value || "").replace("%", ""))) || 0;
}

function numberOrZero(value) {
  const number = Number(String(value || "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(number) ? number : 0;
}

function ageFromYYYYMMDD(value) {
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(4, 6)) - 1;
  const day = Number(value.slice(6, 8));
  const birth = new Date(year, month, day);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  if (now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) {
    age -= 1;
  }
  return age;
}

function slugifyPlayerName(name) {
  return String(name).replace(/[^a-zA-Z]/g, "");
}

async function createOpenAiAnalysis(payload) {
  const enrichedPayload = enrichAnalysisPayload(payload);
  if (!process.env.OPENAI_API_KEY) {
    return localAnalysis(enrichedPayload, "OpenAI endpoint ready - set OPENAI_API_KEY to enable model analysis");
  }

  const apiResponse = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-5.5",
      input: [
        {
          role: "system",
          content:
            "You are a sharp tennis analyst for pre-match and live reads. Use the computed Rapid API stat pack as the structured backbone. Use attached TennisStats publicStats for public percentile, career-count, surface-record, recent-form, age, handedness, serve-speed, and match/set split claims when present. If web search is enabled and a useful public tennis stat is missing, you may verify TennisStats/player/H2H pages or official pages for those exact public rows; keep Rapid as the primary match-log source and do not invent anything. You may also use web search for public context such as school, college roster, injuries, recovery, inactivity, nationality, handedness, age, college roster/accolades, or biographical facts, only if verified from a credible public page. Be direct and easy to read. Do not twist strong records into negatives: 8-2 is good, not 'lost 2 of 10.' Emphasize genuinely glaring edges like first match after long inactivity, very weak career win rate, terrible surface record with sample size, zero or terrible deciding-set record, zero wins from behind, sparse-data pricing risk, undefeated deciding-set records, elite set-specific percentile, weak set-specific win rates, high set-1 closeout rates, highest set win rate, straight-set percentile, straight-set merchant with poor deciding-set record, opponent played a three-setter in their latest loaded match, age/recovery gap, serve-speed percentile, and tiebreak gaps. When the edge is better as a live condition than a pre-match ML, say that plainly: set-1 play if the stronger profile breaks/gets momentum, set-2 play if that is the elite set-specific edge, set-3 play if the opponent has a 0% deciding-set split or is a straight-set merchant with a terrible set-3 split, or hold if price/timing is not there. Handedness must be verified; if sources conflict or the field is blank, say it is unverified instead of calling someone left- or right-handed. The narrative can be a favorite lean OR a favorite-fade/value-underdog read. It should sound like a fast betting note: market misprice or favorite lean, strongest stats, opponent weakness only if truly weak, set/closeout/tiebreak implication, optional verified college/injury/age/handedness note, final lean. Cite concrete numbers and never invent facts. Return valid JSON with headline, pick, conviction, narrative, generatedBy, confidence, edges, redFlags, risks, and focus.",
        },
        {
          role: "user",
          content: JSON.stringify(enrichedPayload),
        },
      ],
      tools: process.env.OPENAI_ENABLE_WEB_SEARCH === "1" ? [{ type: "web_search" }] : undefined,
      text: {
        format: {
          type: "json_schema",
          name: "tennis_matchup_analysis",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["headline", "pick", "conviction", "narrative", "generatedBy", "confidence", "edges", "redFlags", "risks", "focus"],
            properties: {
              headline: { type: "string" },
              pick: { type: "string" },
              conviction: { type: "string" },
              narrative: { type: "string" },
              generatedBy: { type: "string" },
              confidence: { type: "string" },
              edges: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 5 },
              redFlags: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 4 },
              risks: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 4 },
              focus: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 4 },
            },
          },
        },
      },
    }),
  });

  if (!apiResponse.ok) {
    return localAnalysis(enrichedPayload, "OpenAI request failed - showing local analysis");
  }

  const data = await apiResponse.json();
  const text = data.output_text || data.output?.flatMap((item) => item.content || []).find((item) => item.type === "output_text")?.text;
  if (!text) {
    return localAnalysis(enrichedPayload, "OpenAI response had no text - showing local analysis");
  }

  return { ...JSON.parse(text), generatedBy: `OpenAI Responses API (${process.env.OPENAI_MODEL || "gpt-5.5"})` };
}

async function createOpenAiChatReply(payload) {
  const enrichedPayload = enrichAnalysisPayload(payload);
  const fallbackReply = localChatReply(enrichedPayload);
  if (!process.env.OPENAI_API_KEY) {
    return { reply: fallbackReply, generatedBy: "Local fallback" };
  }

  const history = asArray(payload.messages)
    .slice(-8)
    .map((message) => ({
      role: message.role === "user" ? "user" : "assistant",
      content: String(message.content || "").slice(0, 2400),
    }));

  const apiResponse = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-5.5",
      input: [
        {
          role: "system",
          content:
            "You are a concise tennis betting analyst embedded in a matchup dashboard. Answer follow-up questions only from the supplied player data, computed stat pack, and initial analysis. If data is missing, say so plainly. Keep replies under 140 words unless the user asks for detail. Do not invent injuries, handedness, odds, or news.",
        },
        {
          role: "user",
          content: JSON.stringify({
            first: enrichedPayload.first,
            second: enrichedPayload.second,
            headToHead: enrichedPayload.headToHead,
            statPack: enrichedPayload.statPack,
            initialAnalysis: payload.analysis,
          }),
        },
        ...history,
        { role: "user", content: String(payload.question || "") },
      ],
    }),
  });

  if (!apiResponse.ok) {
    return { reply: fallbackReply, generatedBy: "Local fallback" };
  }

  const data = await apiResponse.json();
  const reply = data.output_text || data.output?.flatMap((item) => item.content || []).find((item) => item.type === "output_text")?.text;
  return { reply: reply || fallbackReply, generatedBy: reply ? `OpenAI Responses API (${process.env.OPENAI_MODEL || "gpt-5.5"})` : "Local fallback" };
}

function localChatReply(payload) {
  const analysis = payload.analysis || localAnalysis(payload, "Local analysis");
  const question = String(payload.question || "").toLowerCase();
  if (question.includes("risk")) {
    return `Biggest risks: ${asArray(analysis.risks).slice(0, 2).join(" ") || "limited match-log depth and price timing."}`;
  }
  if (question.includes("surface")) {
    return `${payload.first?.name || "Player one"} best surface: ${payload.statPack?.first?.bestSurface?.surface || "unknown"}. ${payload.second?.name || "Player two"} best surface: ${payload.statPack?.second?.bestSurface?.surface || "unknown"}.`;
  }
  return `${analysis.pick ? `Lean: ${analysis.pick}. ` : ""}${analysis.narrative || "The loaded matchup data is thin, so treat this as a cautious read."}`;
}

function enrichAnalysisPayload(payload) {
  if (!payload?.first || !payload?.second) return payload;
  const firstProfile = buildPlayerProfile(payload.first);
  const secondProfile = buildPlayerProfile(payload.second);
  return {
    ...payload,
    statPack: {
      first: summarizeProfileForPrompt(firstProfile),
      second: summarizeProfileForPrompt(secondProfile),
      generatedFrom: "Rapid Tennis API normalized match logs plus deterministic local calculations",
    },
  };
}

function summarizeProfileForPrompt(profile) {
  return {
    name: profile.player.name,
    recent: profile.recent,
    season: profile.season,
    career: profile.player.apiStats?.careerRecord || profile.career,
    totalMatches: profile.player.apiStats?.totalMatches || profile.totalMatches,
    matchLogCount: profile.player.apiStats?.matchLogCount || profile.player.matches.length,
    setWinRates: profile.setRecords,
    strongestSet: profile.strongestSet,
    weakestSet: profile.weakestSet,
    decidingSet: profile.decidingSet,
    seasonDecidingSet: profile.seasonDecidingSet,
    setOneCloseout: profile.setOneCloseout,
    tieBreaks: profile.tieBreaks,
    straightSets: profile.straightSets,
    bestSurface: profile.bestSurfaceRecord,
    publicStats: profile.player.apiStats?.publicStats || null,
  };
}

function winRate(wins, losses) {
  const total = wins + losses;
  return total === 0 ? 0 : Math.round((wins / total) * 100);
}

function surfaceWinRate(record) {
  return winRate(record.wins, record.losses);
}

function bestSurface(player) {
  return [...player.careerSurfaces].sort((a, b) => {
    const totalDiff = b.wins + b.losses - (a.wins + a.losses);
    if (totalDiff !== 0) return totalDiff;
    return surfaceWinRate(b) - surfaceWinRate(a);
  })[0];
}

function latestMatches(player, limit = 10) {
  return [...player.matches].sort((a, b) => b.date.localeCompare(a.date)).slice(0, limit);
}

function currentYearMatches(player) {
  return player.matches.filter((match) => match.date.startsWith(`${new Date().getFullYear()}-`));
}

function matchRecord(matches) {
  const wins = matches.filter((match) => match.result === "W").length;
  const losses = matches.length - wins;
  return { wins, losses, winRate: winRate(wins, losses) };
}

function parseScoreSets(score) {
  return String(score || "")
    .split(/\s+/)
    .map((part) => part.replace(/\([^)]*\)/g, "").replace(/\[[^\]]*\]/g, ""))
    .map((part) => part.match(/^(\d+)-(\d+)/))
    .filter(Boolean)
    .map((match) => ({ playerGames: Number(match[1]), opponentGames: Number(match[2]) }))
    .filter((set) => Number.isFinite(set.playerGames) && Number.isFinite(set.opponentGames));
}

function setRecord(matches, setNumber) {
  const sets = matches.map((match) => parseScoreSets(match.score)[setNumber - 1]).filter(Boolean);
  const wins = sets.filter((set) => set.playerGames > set.opponentGames).length;
  const losses = sets.filter((set) => set.playerGames < set.opponentGames).length;
  return { setNumber, wins, losses, winRate: winRate(wins, losses) };
}

function resultStreak(matches) {
  const sorted = [...matches].sort((a, b) => b.date.localeCompare(a.date));
  const result = sorted[0]?.result || null;
  if (!result) return { result, count: 0 };
  const breakIndex = sorted.findIndex((match) => match.result !== result);
  return { result, count: breakIndex === -1 ? sorted.length : breakIndex };
}

function decidingSetRecord(matches) {
  const deciding = matches.filter((match) => parseScoreSets(match.score).length >= 3);
  const wins = deciding.filter((match) => match.result === "W").length;
  const losses = deciding.length - wins;
  const streak = resultStreak(deciding);
  return { wins, losses, winRate: winRate(wins, losses), streak: streak.count, streakResult: streak.result };
}

function setOneCloseoutRecord(matches) {
  const afterSetOne = matches.filter((match) => {
    const firstSet = parseScoreSets(match.score)[0];
    return firstSet && firstSet.playerGames > firstSet.opponentGames;
  });
  const matchWins = afterSetOne.filter((match) => match.result === "W").length;
  const straightSetWins = afterSetOne.filter((match) => match.result === "W" && parseScoreSets(match.score).length === 2).length;
  return {
    chances: afterSetOne.length,
    matchWins,
    matchWinRate: winRate(matchWins, afterSetOne.length - matchWins),
    straightSetWins,
    straightSetWinRate: winRate(straightSetWins, afterSetOne.length - straightSetWins),
  };
}

function tieBreakRecord(matches) {
  const tieBreakSets = matches.flatMap((match) => parseScoreSets(match.score).filter((set) => (set.playerGames === 7 && set.opponentGames === 6) || (set.playerGames === 6 && set.opponentGames === 7)));
  const wins = tieBreakSets.filter((set) => set.playerGames > set.opponentGames).length;
  const losses = tieBreakSets.length - wins;
  return { wins, losses, winRate: winRate(wins, losses) };
}

function straightSetsRecord(matches) {
  const straight = matches.filter((match) => {
    const sets = parseScoreSets(match.score);
    return sets.length >= 2 && sets.every((set) => set.playerGames !== set.opponentGames) && new Set(sets.map((set) => set.playerGames > set.opponentGames)).size === 1;
  });
  const wins = straight.filter((match) => match.result === "W").length;
  const losses = straight.length - wins;
  return { wins, losses, winRate: winRate(wins, losses) };
}

function buildPlayerProfile(player) {
  const allMatches = [...player.matches].sort((a, b) => b.date.localeCompare(a.date));
  const recentMatches = allMatches.slice(0, 10);
  const seasonMatches = currentYearMatches(player);
  const career = matchRecord(allMatches);
  const setRecords = [1, 2, 3].map((setNumber) => setRecord(allMatches, setNumber));
  return {
    player,
    recentMatches,
    seasonMatches,
    recent: matchRecord(recentMatches),
    season: matchRecord(seasonMatches),
    career,
    setRecords,
    decidingSet: decidingSetRecord(allMatches),
    seasonDecidingSet: decidingSetRecord(seasonMatches),
    setOneCloseout: setOneCloseoutRecord(allMatches),
    tieBreaks: tieBreakRecord(allMatches),
    straightSets: straightSetsRecord(allMatches),
    strongestSet: [...setRecords].sort((a, b) => b.winRate - a.winRate || b.wins + b.losses - (a.wins + a.losses))[0],
    weakestSet: [...setRecords].sort((a, b) => a.winRate - b.winRate || b.wins + b.losses - (a.wins + a.losses))[0],
    currentStreak: resultStreak(allMatches),
    totalMatches: Math.max(allMatches.length, player.careerSurfaces.reduce((sum, surface) => sum + surface.wins + surface.losses, 0)),
    bestSurfaceRecord: bestSurface(player),
  };
}

function scoreProfile(profile, opponent) {
  return (
    profile.recent.winRate - opponent.recent.winRate +
    (profile.season.winRate - opponent.season.winRate) * 0.8 +
    (profile.decidingSet.winRate - opponent.decidingSet.winRate) * 0.65 +
    (surfaceWinRate(profile.bestSurfaceRecord) - surfaceWinRate(opponent.bestSurfaceRecord)) * 0.3 +
    (profile.currentStreak.result === "W" ? profile.currentStreak.count * 2 : -profile.currentStreak.count * 2)
  );
}

function formatRecord(wins, losses) {
  return `${wins}-${losses}`;
}

function formatStreak(profile) {
  if (!profile.currentStreak.result) return `${profile.player.name} has no loaded recent result streak.`;
  const label = profile.currentStreak.result === "W" ? "won" : "lost";
  return `${profile.player.name} has ${label} ${profile.currentStreak.count} straight loaded matches and is ${formatRecord(profile.recent.wins, profile.recent.losses)} over the last ${profile.recentMatches.length}.`;
}

function publicCurrentRow(profile, label) {
  return profile.player.apiStats?.publicStats?.matchSet?.currentYear?.[label] || null;
}

function publicCareerRow(profile, label) {
  return profile.player.apiStats?.publicStats?.matchSet?.career?.[label] || null;
}

function publicCareerTotal(profile) {
  return profile.player.apiStats?.publicStats?.careerRecord?.totalMatches || profile.player.apiStats?.totalMatches || profile.totalMatches;
}

function publicSeasonRecord(profile) {
  return profile.player.apiStats?.publicStats?.currentYearRecord || profile.season;
}

function publicProfile(profile) {
  return profile.player.apiStats?.publicStats?.profile || {};
}

function publicCareerSurface(profile, surface) {
  return profile.player.apiStats?.publicStats?.surfaceCareer?.[surface] || null;
}

function profileAge(profile) {
  return publicProfile(profile).age || profile.player.age || 0;
}

function publicFormRecord(profile) {
  const form = profile.player.apiStats?.publicStats?.recentForm || [];
  if (form.length < 5) return null;
  const wins = form.filter((result) => result === "W").length;
  const losses = form.length - wins;
  return { wins, losses, total: form.length, winRate: winRate(wins, losses) };
}

function formatPublicSetSentence(favorite, opponent) {
  const labels = ["Set 1 Win", "Set 2 Win", "Set 3 Win"];
  const favoriteRows = labels.map((label) => publicCurrentRow(favorite, label));
  const opponentRows = labels.map((label) => publicCurrentRow(opponent, label));
  if (favoriteRows.some((row) => !row) || opponentRows.some((row) => !row)) return "";

  const favoriteRates = favoriteRows.map((row) => row.percent ?? 0);
  const opponentRates = opponentRows.map((row) => row.percent ?? 0);
  const favoriteHigherEverywhere = favoriteRates.every((rate, index) => rate > opponentRates[index]);
  const strongestIndex = favoriteRates.indexOf(Math.max(...favoriteRates));
  const opponentWeakestIndex = opponentRates.indexOf(Math.min(...opponentRates));
  const setList = (rates) => rates.map((rate) => `${rate}%`).join(" / ");

  if (favoriteHigherEverywhere) {
    return `${favorite.player.name} has the higher current-year set win rate in set 1, set 2, and set 3: ${setList(favoriteRates)} compared to ${opponent.player.name} at ${setList(opponentRates)}.`;
  }

  return `${favorite.player.name}'s best current-year set is set ${strongestIndex + 1} at ${favoriteRates[strongestIndex]}%. ${opponent.player.name}'s lowest current-year split is set ${opponentWeakestIndex + 1} at ${opponentRates[opponentWeakestIndex]}%.`;
}

function formatHandednessRead(favorite, opponent) {
  const favoriteHand = publicProfile(favorite).hand;
  const opponentHand = publicProfile(opponent).hand;
  if (!favoriteHand && !opponentHand) return "";
  if (favoriteHand && opponentHand) {
    return `${favorite.player.name} is ${favoriteHand}; ${opponent.player.name} is ${opponentHand}.`;
  }
  const profile = favoriteHand ? favorite : opponent;
  return `${profile.player.name} is ${publicProfile(profile).hand}.`;
}

function formatAgeRead(favorite, opponent) {
  const favoriteAge = profileAge(favorite);
  const opponentAge = profileAge(opponent);
  if (!favoriteAge || !opponentAge) return "";
  const gap = Math.abs(favoriteAge - opponentAge);
  if (opponentAge >= 35 && gap >= 8) {
    return `${opponent.player.name} is ${opponentAge}. ${favorite.player.name} is ${favoriteAge}, so the age/recovery gap is real if this turns physical.`;
  }
  if (favoriteAge >= 35 && gap >= 8) {
    return `${favorite.player.name} is ${favoriteAge}, so the pick needs the stats to overcome the age/recovery risk against ${opponent.player.name} at ${opponentAge}.`;
  }
  if (gap >= 10) {
    return `${favorite.player.name} is ${favoriteAge}; ${opponent.player.name} is ${opponentAge}. That age gap is worth noting, but it is not the whole case.`;
  }
  return "";
}

function daysSinceLatestMatch(profile) {
  const latest = profile.recentMatches[0]?.date;
  if (!latest) return 0;
  const latestDate = new Date(`${latest}T12:00:00Z`);
  if (Number.isNaN(latestDate.getTime())) return 0;
  return Math.max(0, Math.round((Date.now() - latestDate.getTime()) / (24 * 60 * 60 * 1000)));
}

function formatInactivityRead(favorite, opponent) {
  const favoriteGap = daysSinceLatestMatch(favorite);
  const opponentGap = daysSinceLatestMatch(opponent);
  if (favoriteGap >= 180) {
    return `${favorite.player.name} has a ${favoriteGap}-day gap since the latest loaded singles match. That is not normal favorite behavior unless there is fresher context elsewhere.`;
  }
  if (opponentGap >= 180) {
    return `${opponent.player.name} has a ${opponentGap}-day gap since the latest loaded singles match, so price and live hold matter more than stale career stats.`;
  }
  return "";
}

function localAnalysis({ first, second, headToHead }, generatedBy) {
  const firstProfile = buildPlayerProfile(first);
  const secondProfile = buildPlayerProfile(second);
  const firstScore = scoreProfile(firstProfile, secondProfile);
  const secondScore = scoreProfile(secondProfile, firstProfile);
  const favorite = firstScore >= secondScore ? firstProfile : secondProfile;
  const opponent = favorite === firstProfile ? secondProfile : firstProfile;
  const confidenceGap = Math.round(Math.abs(firstScore - secondScore));
  const setThreeGap = Math.abs(favorite.decidingSet.winRate - opponent.decidingSet.winRate);
  const h2hText = headToHead
    ? `${first.name} is ${headToHead.winsA}-${headToHead.winsB} against ${second.name} in loaded H2H.`
    : "No direct H2H is loaded, so this is driven by form, set splits, surface, and match-history patterns.";
  const totalMatches = publicCareerTotal(favorite);
  const opponentTotalMatches = publicCareerTotal(opponent);
  const favoriteSeason = publicSeasonRecord(favorite);
  const opponentSeason = publicSeasonRecord(opponent);
  const recentSentence = formatRecentRead(favorite, opponent);
  const favoriteSetAverage = Math.round(favorite.setRecords.reduce((sum, record) => sum + record.winRate, 0) / favorite.setRecords.length);
  const opponentSetAverage = Math.round(opponent.setRecords.reduce((sum, record) => sum + record.winRate, 0) / opponent.setRecords.length);
  const setSentence = formatPublicSetSentence(favorite, opponent) || (
    favoriteSetAverage >= opponentSetAverage
      ? `${favorite.player.name}'s highest set win rate is set ${favorite.strongestSet.setNumber} at ${favorite.strongestSet.winRate}%. Set 1/2/3 is ${favorite.setRecords.map((record) => `${record.winRate}%`).join(" / ")} compared to ${opponent.player.name} at ${opponent.setRecords.map((record) => `${record.winRate}%`).join(" / ")}.`
      : `The set profile is the warning, not the reason for the pick: ${favorite.player.name} is ${favorite.setRecords.map((record) => `${record.winRate}%`).join(" / ")} in sets 1/2/3 while ${opponent.player.name} is ${opponent.setRecords.map((record) => `${record.winRate}%`).join(" / ")}.`
  );
  const decidingSentence = formatDecidingSetRead(favorite, opponent);
  const closeoutSentence = formatSetOneCloseoutRead(favorite, opponent);
  const tieBreakSentence = formatTieBreakRead(favorite, opponent);
  const seasonSentence = `${favorite.player.name} is ${formatRecord(favoriteSeason.wins, favoriteSeason.losses)} this year (${favoriteSeason.winRate}%) with ${totalMatches} career matches behind the read. ${opponent.player.name} is ${formatRecord(opponentSeason.wins, opponentSeason.losses)} (${opponentSeason.winRate}%) across ${opponentTotalMatches}.`;
  const pressurePoint = formatPressurePoint(favorite, opponent);
  const conditionalPlay = formatConditionalPlayRead(favorite, opponent);
  const fatigueSentence = formatLatestThreeSetFatigueRead(opponent);
  const inactivitySentence = formatInactivityRead(favorite, opponent);
  const handednessSentence = formatHandednessRead(favorite, opponent);
  const ageSentence = formatAgeRead(favorite, opponent);
  const glaringStats = buildGlaringStats(favorite, opponent);
  const readout = [
    `${favorite.player.name} is the lean here. ${recentSentence}`,
    `${setSentence} ${decidingSentence}`,
    closeoutSentence,
    tieBreakSentence,
    `${seasonSentence} ${pressurePoint}`,
    conditionalPlay,
    fatigueSentence,
    inactivitySentence,
    ageSentence,
    handednessSentence,
    ...glaringStats,
    h2hText,
    `${favorite.player.name.toUpperCase()} ML`,
  ].filter(Boolean).join("\n\n");

  return {
    headline: `${favorite.player.name} ML - ${favorite.recent.wins}/${favorite.recentMatches.length} recent wins, ${favorite.season.winRate}% this year, ${favorite.decidingSet.winRate}% deciding sets.`,
    pick: `${favorite.player.name} ML`,
    conviction: confidenceGap >= 55 ? "High" : confidenceGap >= 28 ? "Medium" : "Thin",
    narrative: readout,
    generatedBy,
    confidence: headToHead ? "Medium - includes direct H2H sample" : "Medium-low - no direct H2H in current data",
    edges: [
      `${favorite.player.name}: ${favorite.recent.winRate}% over last ${favorite.recentMatches.length}; ${favorite.season.winRate}% this season versus ${opponent.player.name} at ${opponent.season.winRate}%.`,
      `Set splits: ${favorite.player.name} set 1/2/3 rates are ${favorite.setRecords.map((record) => `${record.winRate}%`).join(" / ")}; ${opponent.player.name} is ${opponent.setRecords.map((record) => `${record.winRate}%`).join(" / ")}.`,
      `Deciding sets: ${favorite.player.name} ${formatRecord(favorite.decidingSet.wins, favorite.decidingSet.losses)} (${favorite.decidingSet.winRate}%) versus ${opponent.player.name} ${formatRecord(opponent.decidingSet.wins, opponent.decidingSet.losses)} (${opponent.decidingSet.winRate}%), a ${setThreeGap}-point gap.`,
      `Set 1 closeout: ${favorite.player.name} wins ${favorite.setOneCloseout.matchWinRate}% of matches after taking set 1 and closes 2-0 at ${favorite.setOneCloseout.straightSetWinRate}%.`,
      `Tiebreaks: ${favorite.player.name} ${formatRecord(favorite.tieBreaks.wins, favorite.tieBreaks.losses)} (${favorite.tieBreaks.winRate}%) versus ${opponent.player.name} ${formatRecord(opponent.tieBreaks.wins, opponent.tieBreaks.losses)} (${opponent.tieBreaks.winRate}%).`,
      conditionalPlay,
      fatigueSentence,
      `${favorite.player.name} has ${totalMatches} API-backed career/sample matches behind this read; strongest surface sample is ${favorite.bestSurfaceRecord.surface} at ${surfaceWinRate(favorite.bestSurfaceRecord)}%.`,
      h2hText,
    ].filter(Boolean).slice(0, 5),
    redFlags: [
      opponent.strongestSet.winRate >= 60
        ? `${opponent.player.name}'s best set is set ${opponent.strongestSet.setNumber} at ${opponent.strongestSet.winRate}%, so that is a real counter-angle.`
        : `${opponent.player.name}'s best set is set ${opponent.strongestSet.setNumber} at ${opponent.strongestSet.winRate}%; not glaring, but it is their cleanest split.`,
      favorite.straightSets.losses > favorite.straightSets.wins
        ? `${favorite.player.name} has more loaded straight-set losses than wins; avoid chasing if the first-set eye test is bad.`
        : `${favorite.player.name} is ${formatRecord(favorite.straightSets.wins, favorite.straightSets.losses)} in loaded straight-set matches.`,
    ],
    risks: [
      "This is not betting advice; check price, injury/news context, and whether the feed is stale before acting.",
      "Do not treat a good opponent record as weakness; only act when the price and the actual stat gap match.",
    ],
    focus: [
      `If ${favorite.player.name} wins set 1, the loaded closeout rate is ${favorite.setOneCloseout.matchWinRate}% and the 2-0 close rate is ${favorite.setOneCloseout.straightSetWinRate}%.`,
      conditionalPlay,
      fatigueSentence,
      `If this goes to set 3, the loaded deciding-set edge favors ${favorite.decidingSet.winRate >= opponent.decidingSet.winRate ? favorite.player.name : opponent.player.name}.`,
      opponent.weakestSet.winRate <= 45 ? `${opponent.player.name}'s weakest set is set ${opponent.weakestSet.setNumber} at ${opponent.weakestSet.winRate}%.` : `${opponent.player.name} does not have an obvious weak set in the loaded sample.`,
    ].filter(Boolean).slice(0, 4),
  };
}

function formatRecentRead(favorite, opponent) {
  const favoritePublic = publicFormRecord(favorite);
  const opponentPublic = publicFormRecord(opponent);
  if (favoritePublic && opponentPublic) {
    const favoriteAction = favoritePublic.wins >= favoritePublic.losses ? `has won ${favoritePublic.wins} of the last ${favoritePublic.total}` : `has lost ${favoritePublic.losses} of the last ${favoritePublic.total}`;
    const opponentAction = opponentPublic.wins >= 7 ? `is also hot at ${formatRecord(opponentPublic.wins, opponentPublic.losses)} recently` : opponentPublic.losses > opponentPublic.wins ? `has lost ${opponentPublic.losses} of the last ${opponentPublic.total}` : `is ${formatRecord(opponentPublic.wins, opponentPublic.losses)} recently`;
    return `${favorite.player.name} ${favoriteAction}. ${opponent.player.name} ${opponentAction}.`;
  }
  const favoriteText = `${favorite.player.name} is ${formatRecord(favorite.recent.wins, favorite.recent.losses)} over the last ${favorite.recentMatches.length}`;
  const opponentText = `${opponent.player.name} is ${formatRecord(opponent.recent.wins, opponent.recent.losses)} over the same window`;
  if (opponent.recent.winRate >= 70) {
    return `${favoriteText}. ${opponentText}, so this is not a fade based on form alone.`;
  }
  if (opponent.recent.winRate <= 40) {
    return `${favoriteText}. ${opponent.player.name} is struggling at ${formatRecord(opponent.recent.wins, opponent.recent.losses)} recently.`;
  }
  return `${favoriteText}. ${opponentText}.`;
}

function formatDecidingSetRead(favorite, opponent) {
  const favoriteScope = formatMatchLogScope(favorite);
  const opponentScope = formatMatchLogScope(opponent);
  if (opponent.decidingSet.streakResult === "L" && opponent.decidingSet.streak >= 3 && favorite.decidingSet.streakResult === "W" && favorite.decidingSet.streak >= 3) {
    return `${opponent.player.name} has lost ${opponent.decidingSet.streak} straight set-3 matches and has a ${opponent.decidingSet.winRate}% ${opponentScope} set-3 win rate. ${favorite.player.name} has won ${favorite.decidingSet.streak} straight set-3 matches and has a ${favorite.decidingSet.winRate}% ${favoriteScope} set-3 win rate.`;
  }
  if (opponent.decidingSet.streakResult === "L" && opponent.decidingSet.streak >= 3) {
    return `${opponent.player.name} has lost ${opponent.decidingSet.streak} straight set-3 matches and is ${formatRecord(opponent.decidingSet.wins, opponent.decidingSet.losses)} (${opponent.decidingSet.winRate}%) across ${opponentScope} deciding sets.`;
  }
  if (favorite.decidingSet.streakResult === "W" && favorite.decidingSet.streak >= 3) {
    return `${favorite.player.name} has won ${favorite.decidingSet.streak} straight set-3 matches and is ${formatRecord(favorite.decidingSet.wins, favorite.decidingSet.losses)} (${favorite.decidingSet.winRate}%) across ${favoriteScope} deciding sets.`;
  }
  if (favorite.seasonDecidingSet.wins > 0 && favorite.seasonDecidingSet.losses === 0) {
    return `${favorite.player.name} is undefeated this year in deciding-set matches at ${formatRecord(favorite.seasonDecidingSet.wins, favorite.seasonDecidingSet.losses)}.`;
  }
  if (opponent.seasonDecidingSet.losses > 0 && opponent.seasonDecidingSet.wins === 0) {
    return `${opponent.player.name} has not won a deciding-set match this year in the loaded sample (${formatRecord(opponent.seasonDecidingSet.wins, opponent.seasonDecidingSet.losses)}).`;
  }
  return `If this goes late, ${favorite.player.name} is ${formatRecord(favorite.decidingSet.wins, favorite.decidingSet.losses)} in deciding sets (${favorite.decidingSet.winRate}%) while ${opponent.player.name} is ${formatRecord(opponent.decidingSet.wins, opponent.decidingSet.losses)} (${opponent.decidingSet.winRate}%).`;
}

function formatMatchLogScope(profile) {
  const total = profile.player.apiStats?.totalMatches || profile.totalMatches;
  const loaded = profile.player.apiStats?.matchLogCount || profile.player.matches.length;
  return loaded >= total ? "career" : `loaded ${loaded}-match`;
}

function formatSetOneCloseoutRead(favorite, opponent) {
  if (!favorite.setOneCloseout.chances) return "";
  const favoriteLine = `When ${favorite.player.name} wins set 1, they win the match ${favorite.setOneCloseout.matchWinRate}% of the time and close 2-0 ${favorite.setOneCloseout.straightSetWinRate}% of the time.`;
  if (opponent.setOneCloseout.chances) {
    return `${favoriteLine} ${opponent.player.name}'s set-1 closeout rate is ${opponent.setOneCloseout.matchWinRate}% with a ${opponent.setOneCloseout.straightSetWinRate}% 2-0 close rate.`;
  }
  return favoriteLine;
}

function formatTieBreakRead(favorite, opponent) {
  if (favorite.tieBreaks.wins + favorite.tieBreaks.losses === 0 && opponent.tieBreaks.wins + opponent.tieBreaks.losses === 0) return "";
  return `If for whatever reason this gets to a tiebreak, ${favorite.player.name} is ${formatRecord(favorite.tieBreaks.wins, favorite.tieBreaks.losses)} (${favorite.tieBreaks.winRate}%) compared to ${opponent.player.name} at ${formatRecord(opponent.tieBreaks.wins, opponent.tieBreaks.losses)} (${opponent.tieBreaks.winRate}%).`;
}

function formatPressurePoint(favorite, opponent) {
  const setLabels = ["Set 1 Win", "Set 2 Win", "Set 3 Win"];
  const opponentPublicSets = setLabels.map((label, index) => ({ label, setNumber: index + 1, row: publicCurrentRow(opponent, label) })).filter((item) => item.row?.percent !== null && item.row?.percent !== undefined);
  const weakestPublic = [...opponentPublicSets].sort((a, b) => a.row.percent - b.row.percent)[0];
  if (weakestPublic && weakestPublic.row.percent <= 45) {
    return `${opponent.player.name}'s lowest current-year split is set ${weakestPublic.setNumber} at ${weakestPublic.row.percent}%. That is the pressure point.`;
  }
  if (opponent.weakestSet.winRate <= 45) {
    return `${opponent.player.name}'s weakest loaded split is set ${opponent.weakestSet.setNumber} at ${opponent.weakestSet.winRate}%, so that is the pressure point.`;
  }
  if (favorite.strongestSet.winRate - opponent.weakestSet.winRate >= 12) {
    return `${favorite.player.name}'s strongest split is set ${favorite.strongestSet.setNumber} at ${favorite.strongestSet.winRate}%, while ${opponent.player.name}'s lowest is set ${opponent.weakestSet.setNumber} at ${opponent.weakestSet.winRate}%.`;
  }
  return "There is no massive weak-set flag on the other side, so the edge needs to come from form, price, and closeout profile.";
}

function formatSurfaceCollapseRead(profile, surface = "Hard") {
  const row = publicCareerSurface(profile, surface);
  if (!row || row.total < 10 || row.percent > 20) return "";
  return `${profile.player.name} is ${formatRecord(row.wins, row.losses)} career on ${surface.toLowerCase()} (${row.percent}%) across ${row.total} matches. That is not noise anymore.`;
}

function formatConditionalPlayRead(favorite, opponent) {
  const favoriteAtLeastOne = publicCurrentRow(favorite, "Won At Least 1 Set");
  const opponentSetThree = publicCurrentRow(opponent, "Set 3 Win");
  const opponentMatchWins = publicCurrentRow(opponent, "Match Wins");
  const opponentBehind = publicCurrentRow(opponent, "Wins From Behind");
  const straightSetMerchant = formatStraightSetMerchantRead(favorite, opponent);
  if (favoriteAtLeastOne?.percent >= 70 && opponentSetThree?.percent === 0) {
    return `This reads better as a timing spot than a blind chase: ${favorite.player.name} has taken at least one set in ${favoriteAtLeastOne.percent}% of matches this year, while ${opponent.player.name} is 0% in current-year set 3. Set 1 only if ${favorite.player.name} shows the first break/momentum; set 3 is where the profile gets loud.`;
  }
  if (straightSetMerchant) {
    return `${straightSetMerchant} If ${favorite.player.name} starts set 1 strong, that is the live trigger. If it gets to set 3, the matchup gets way louder.`;
  }
  if (opponentMatchWins?.percent <= 25 && opponentBehind?.percent === 0 && favoriteAtLeastOne?.percent >= 65) {
    return `${opponent.player.name} is only ${opponentMatchWins.percent}% in current-year match wins and 0% winning from behind, while ${favorite.player.name} takes a set ${favoriteAtLeastOne.percent}% of the time. Do not force the pre-match price; wait for the match state to confirm it.`;
  }
  return "";
}

function formatLatestThreeSetFatigueRead(profile) {
  const latest = profile.recentMatches[0];
  if (!latest) return "";
  const sets = parseScoreSets(latest.score);
  if (sets.length < 3) return "";
  return `${profile.player.name}'s latest loaded match was a three-setter on ${latest.date} (${latest.score}). That is a real fatigue/recovery note if this match is on a short turnaround.`;
}

function formatEliteSetSpecificRead(profile) {
  const eliteRows = ["Set 1 Win", "Set 2 Win", "Set 3 Win"]
    .map((label, index) => ({ label, setNumber: index + 1, row: publicCurrentRow(profile, label) }))
    .filter((item) => item.row?.percent !== null && item.row?.percent >= 70 && item.row.percentile >= 95)
    .sort((a, b) => b.row.percentile - a.row.percentile || b.row.percent - a.row.percent);
  const elite = eliteRows[0];
  if (!elite) return "";
  return `${profile.player.name}'s set ${elite.setNumber} is the standout split: ${elite.row.percent}% this year, percentile ${elite.row.percentile}.`;
}

function formatStraightSetMerchantRead(favorite, opponent) {
  const favoriteSetThree = publicCurrentRow(favorite, "Set 3 Win");
  const opponentSetThree = publicCurrentRow(opponent, "Set 3 Win");
  const opponentStraightSets = publicCurrentRow(opponent, "Wins in Straight Sets");
  if (!favoriteSetThree || !opponentSetThree || !opponentStraightSets) return "";
  const gap = (favoriteSetThree.percent ?? 0) - (opponentSetThree.percent ?? 0);
  if (opponentStraightSets.percent >= 50 && opponentStraightSets.percentile >= 90 && opponentSetThree.percent <= 25 && gap >= 35) {
    return `${opponent.player.name} has been excellent when it is clean: ${opponentStraightSets.percent}% straight-set wins, percentile ${opponentStraightSets.percentile}. But if the match gets messy, ${favorite.player.name} is ${favoriteSetThree.percent}% in current-year set 3s compared to ${opponent.player.name} at ${opponentSetThree.percent}%.`;
  }
  return "";
}

function buildGlaringStats(favorite, opponent) {
  const stats = [];
  const straightSets = publicCurrentRow(favorite, "Wins in Straight Sets");
  const careerStraightSets = publicCareerRow(favorite, "Wins in Straight Sets");
  const favoriteStraightSets = publicCurrentRow(favorite, "Wins in Straight Sets");
  const opponentAtLeastOneSet = publicCurrentRow(opponent, "Won At Least 1 Set");
  if (favoriteStraightSets?.percent <= 35 && opponentAtLeastOneSet?.percent >= 65) {
    stats.push(`${favorite.player.name} is not a clean 2-0 profile: ${favoriteStraightSets.percent}% current-year straight-set wins while ${opponent.player.name} takes at least one set ${opponentAtLeastOneSet.percent}% of the time.`);
  }
  const opponentCareerWins = publicCareerRow(opponent, "Match Wins");
  const opponentCareerSetThree = publicCareerRow(opponent, "Set 3 Win");
  const opponentCurrentSetThree = publicCurrentRow(opponent, "Set 3 Win");
  const opponentBehind = publicCurrentRow(opponent, "Wins From Behind");
  const opponentSurfaceCollapse = formatSurfaceCollapseRead(opponent, "Hard");
  const straightSetMerchant = formatStraightSetMerchantRead(favorite, opponent);
  const eliteSet = formatEliteSetSpecificRead(favorite);
  if (opponentCareerWins?.percent !== null && opponentCareerWins?.percent <= 15) {
    stats.push(`${opponent.player.name} has a ${opponentCareerWins.percent}% career match win rate${opponentCareerWins.number ? ` (${opponentCareerWins.number})` : ""}. That is the whole warning label.`);
  }
  if (eliteSet) {
    stats.push(eliteSet);
  }
  if (opponentSurfaceCollapse) {
    stats.push(opponentSurfaceCollapse);
  }
  if (opponentCurrentSetThree?.percent === 0) {
    stats.push(`${opponent.player.name} is 0% in current-year set-3 wins. If this gets extended, the profile does not travel.`);
  } else if (opponentCareerSetThree?.percent === 0) {
    stats.push(`${opponent.player.name} has a 0% career set-3 win rate${opponentCareerSetThree.number ? ` (${opponentCareerSetThree.number})` : ""}.`);
  }
  if (opponentBehind?.percent === 0) {
    stats.push(`${opponent.player.name} is 0% current-year winning from behind. Losing set 1 is basically the danger zone.`);
  }
  if (straightSetMerchant) {
    stats.push(straightSetMerchant);
  }
  const weakRows = ["Match Wins", "Match Wins (3 Sets)", "Wins in Straight Sets", "Wins From Behind", "Won At Least 1 Set", "Set 1 Win", "Set 2 Win", "Set 3 Win"]
    .map((label) => ({ label, row: publicCurrentRow(opponent, label) }))
    .filter((item) => item.row?.percentile > 0 && item.row.percentile <= 35 && item.row.percent !== null && item.row.percent <= 45);
  if (weakRows.length >= 5) {
    stats.push(`${opponent.player.name} is bottom-tier across ${weakRows.length} current-year categories: ${weakRows.slice(0, 3).map((item) => `${item.label} ${item.row.percent}%`).join(", ")}.`);
  }
  for (const label of ["Match Wins", "Wins in Straight Sets", "Wins From Behind", "Won At Least 1 Set", "Set 1 Win", "Set 2 Win", "Set 3 Win"]) {
    const row = publicCurrentRow(opponent, label);
    if (row?.percentile > 0 && row.percentile <= 35 && row.percent <= 45) {
      stats.push(`${opponent.player.name} is bottom ${row.percentile}% current-year in ${label.toLowerCase()} at ${row.percent}%.`);
      break;
    }
  }
  const favoritePublicProfile = publicProfile(favorite);
  if (favoritePublicProfile.serveSpeed && favoritePublicProfile.serveSpeedPercentile >= 99) {
    stats.push(`${favorite.player.name}'s 2026 serve speed is ${favoritePublicProfile.serveSpeed}, percentile ${favoritePublicProfile.serveSpeedPercentile}.`);
  }
  if (straightSets?.percent >= 45 && straightSets?.percentile >= 90) {
    stats.push(`${favorite.player.name} is top ${Math.max(1, 100 - straightSets.percentile)}% in current-year straight-set wins at ${straightSets.percent}%${careerStraightSets?.number ? `, with ${careerStraightSets.number} career straight-set wins` : ""}.`);
  }
  if (favorite.seasonDecidingSet.wins >= 2 && favorite.seasonDecidingSet.losses === 0) {
    stats.push(`${favorite.player.name.toUpperCase()} is undefeated in deciding sets this year: ${formatRecord(favorite.seasonDecidingSet.wins, favorite.seasonDecidingSet.losses)}.`);
  }
  if (opponent.decidingSet.streakResult === "L" && opponent.decidingSet.streak >= 4) {
    stats.push(`${opponent.player.name.toUpperCase()} has lost ${opponent.decidingSet.streak} straight deciding-set matches.`);
  }
  if (favorite.decidingSet.streakResult === "W" && favorite.decidingSet.streak >= 4) {
    stats.push(`${favorite.player.name.toUpperCase()} has won ${favorite.decidingSet.streak} straight deciding-set matches.`);
  }
  if (favorite.setOneCloseout.chances >= 5 && favorite.setOneCloseout.straightSetWinRate >= 75) {
    stats.push(`Set 1 matters: ${favorite.player.name} closes 2-0 in ${favorite.setOneCloseout.straightSetWinRate}% of loaded matches after taking the opener.`);
  }
  if (opponent.weakestSet.losses >= 5 && opponent.weakestSet.winRate <= 40) {
    stats.push(`${opponent.player.name.toUpperCase()} has a glaring set ${opponent.weakestSet.setNumber} problem at ${opponent.weakestSet.winRate}%.`);
  }
  return stats.slice(0, 3);
}

function normalizePlayerName(value) {
  return String(value || "").toLowerCase().replace(/\s+/g, " ").trim();
}


