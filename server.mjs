import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));
const dist = join(root, "dist");
const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || "127.0.0.1";
const allowedOrigin = process.env.ALLOWED_ORIGIN || "*";

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
            detail: "Tennis Abstract search and player-profile fetch are enabled; ATP/WTA official pages remain listed as source references",
          },
        ],
      });
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/search") {
      const query = url.searchParams.get("q") || "";
      writeJson(response, await searchTennisAbstractPlayers(query));
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
        writeJson(response, await fetchTennisAbstractPlayer(name, tour));
      } catch (error) {
        console.error("Tennis Abstract player fetch failed:", error);
        response.writeHead(502, { "Content-Type": mimeTypes[".json"] });
        response.end(
          JSON.stringify({
            error: "Could not fetch player from Tennis Abstract",
            detail: error instanceof Error ? error.message : "Unknown upstream error",
          }),
        );
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

const tennisAbstract = {
  playerList: null,
};

async function searchTennisAbstractPlayers(query) {
  const normalized = query.trim().toLowerCase();
  if (normalized.length < 2) {
    return [];
  }

  const list = await getTennisAbstractPlayerList();
  return list
    .filter((player) => player.name.toLowerCase().includes(normalized))
    .slice(0, 12)
    .map((player) => ({
      id: player.id,
      name: player.name,
      country: "",
      ranking: 0,
      tour: player.tour,
      source: "Tennis Abstract",
    }));
}

async function getTennisAbstractPlayerList() {
  if (tennisAbstract.playerList) {
    return tennisAbstract.playerList;
  }

  const text = await fetchTennisAbstractText("https://www.tennisabstract.com/mwplayerlist.js");
  const json = text.replace(/^var playerlist=/, "").replace(/;\s*$/, "");
  tennisAbstract.playerList = JSON.parse(json).map((entry) => {
    const tour = entry.slice(1, 2);
    const name = entry.slice(4);
    return {
      id: `${tour}:${slugifyPlayerName(name)}`,
      tour,
      name,
    };
  });
  return tennisAbstract.playerList;
}

async function fetchTennisAbstractPlayer(name, tour = "M") {
  const slug = slugifyPlayerName(name);
  const playerPath = tour === "W" ? "wplayer.cgi" : "player.cgi";
  const pageUrl = `https://www.tennisabstract.com/cgi-bin/${playerPath}?p=${slug}`;
  const fragmentUrl = `https://www.tennisabstract.com/jsfrags/${slug}.js`;
  const [page, fragment] = await Promise.all([fetchTennisAbstractText(pageUrl), fetchTennisAbstractText(fragmentUrl)]);
  const metadata = parsePlayerMetadata(page, name, slug, tour);
  const matches = parseRecentMatches(fragment, metadata);
  const season = parseSeasonStats(fragment, "2026") ?? deriveRecord(matches);
  const careerSurfaces = parseSurfaceRecords(fragment, matches);

  return {
    id: `${tour.toLowerCase()}-${slug.toLowerCase()}`,
    name: metadata.fullname,
    country: metadata.country || "",
    age: metadata.age || 0,
    ranking: metadata.ranking || 0,
    points: metadata.eloRating || 0,
    titles: parseCareerTitles(fragment),
    seasonRecord: { wins: season.wins, losses: season.losses },
    careerSurfaces,
    matches,
    source: {
      name: "Tennis Abstract",
      url: pageUrl,
      fetchedAt: new Date().toISOString(),
    },
  };
}

async function fetchTennisAbstractText(url) {
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,text/javascript,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });

  if (!response.ok) {
    throw new Error(`Tennis Abstract returned ${response.status} for ${url}`);
  }

  return response.text();
}

function parsePlayerMetadata(page, fallbackName, slug, tour) {
  const vars = Object.fromEntries([...page.matchAll(/var\s+([a-zA-Z0-9_]+)\s*=\s*([^;]+);/g)].map((match) => [match[1], parseJsValue(match[2])]));
  const dob = String(vars.dob || "");
  return {
    slug,
    tour,
    fullname: String(vars.fullname || fallbackName),
    lastname: String(vars.lastname || fallbackName.split(" ").at(-1) || fallbackName),
    country: String(vars.country || ""),
    ranking: numberOrZero(vars.currentrank),
    eloRating: numberOrZero(vars.elo_rating),
    age: dob.length === 8 ? ageFromYYYYMMDD(dob) : 0,
  };
}

function parseJsValue(value) {
  const trimmed = value.trim();
  if (/^['"]/.test(trimmed)) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseRecentMatches(fragment, metadata) {
  const table = extractTable(fragment, "recent-results");
  const rows = extractRows(table).slice(0, 20);
  return rows
    .map((row) => parseRecentMatch(row, metadata))
    .filter(Boolean)
    .slice(0, 10);
}

function parseRecentMatch(row, metadata) {
  const cells = extractCells(row);
  if (cells.length < 8) return null;
  const score = cleanText(cells[7]);
  const descriptionHtml = cells[6];
  const description = cleanText(descriptionHtml);
  if (!score || score === "W/O" || description.includes(" vs ")) return null;

  const opponent = extractOpponentName(descriptionHtml, metadata.fullname, metadata.lastname);
  const result = descriptionHtml.includes(`<b>${metadata.lastname}</b> d.`) || descriptionHtml.includes(`<b>${metadata.fullname}</b> d.`) ? "W" : "L";

  return {
    date: parseTennisAbstractDate(cleanText(cells[0])),
    tournament: cleanText(cells[1]),
    surface: normalizeSurface(cleanText(cells[2])),
    round: cleanText(cells[3]),
    opponent,
    opponentRank: numberOrZero(cleanText(cells[5])),
    result,
    score,
  };
}

function extractOpponentName(html, fullname, lastname) {
  const linkedNames = [...html.matchAll(/<a [^>]*>(.*?)<\/a>/g)].map((match) => cleanText(match[1]));
  const linkedOpponent = linkedNames.find((name) => name !== fullname && name !== lastname);
  if (linkedOpponent) return linkedOpponent;
  return cleanText(html).replace(/\([^)]*\)/g, "").replace(/\[[^\]]*\]/g, "").replace(/\bd\.\b/g, "").replace(lastname, "").trim() || "Unknown";
}

function parseSeasonStats(fragment, year) {
  const table = extractTable(fragment, "tour-years");
  const row = extractRows(table).find((candidate) => cleanText(extractCells(candidate)[0] || "") === year);
  if (!row) return null;
  const cells = extractCells(row).map(cleanText);
  const [tbWins, tbLosses] = parseRecord(cells[9]);
  return {
    wins: numberOrZero(cells[2]),
    losses: numberOrZero(cells[3]),
    holdRate: percentOrZero(cells[12]),
    breakRate: percentOrZero(cells[13]),
    firstServeIn: percentOrZero(cells[16]),
    firstServeWon: percentOrZero(cells[17]),
    secondServeWon: percentOrZero(cells[18]),
    returnPointsWon: percentOrZero(cells[20]),
    tieBreakRecord: { wins: tbWins, losses: tbLosses },
  };
}

function parseSurfaceRecords(fragment, matches) {
  const table = extractTable(fragment, "career-splits");
  const surfaces = ["Hard", "Clay", "Grass", "Indoor"];
  const parsed = surfaces.map((surface) => {
    const row = extractRows(table).find((candidate) => cleanText(extractCells(candidate)[0] || "") === surface);
    if (!row) return null;
    const cells = extractCells(row).map(cleanText);
    return { surface, wins: numberOrZero(cells[2]), losses: numberOrZero(cells[3]) };
  });
  const valid = parsed.filter(Boolean);
  if (valid.length) return valid;

  return surfaces.map((surface) => {
    const surfaceMatches = matches.filter((match) => match.surface === surface);
    const wins = surfaceMatches.filter((match) => match.result === "W").length;
    return { surface, wins, losses: surfaceMatches.length - wins };
  });
}

function parseCareerTitles(fragment) {
  const table = extractTable(fragment, "recent-finals");
  return extractRows(table).filter((row) => cleanText(row).includes(" d. ")).length;
}

function deriveRecord(matches) {
  const wins = matches.filter((match) => match.result === "W").length;
  return { wins, losses: matches.length - wins };
}

function extractTable(html, id) {
  const match = html.match(new RegExp(`<table id="${id}"[\\s\\S]*?<tbody>([\\s\\S]*?)<\\/tbody>`, "i"));
  return match?.[1] || "";
}

function extractRows(html) {
  return [...html.matchAll(/<tr>([\s\S]*?)<\/tr>/gi)].map((match) => match[1]);
}

function extractCells(row) {
  return [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((match) => match[1]);
}

function cleanText(value) {
  return String(value || "")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&#124;/g, "|")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function parseTennisAbstractDate(value) {
  const months = { Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06", Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12" };
  const [day, month, year] = value.split("-");
  return `${year}-${months[month] || "01"}-${String(day).padStart(2, "0")}`;
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
  if (!process.env.OPENAI_API_KEY) {
    return localAnalysis(payload, "OpenAI endpoint ready - set OPENAI_API_KEY to enable model analysis");
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
            "You are a tennis analyst. Use only the JSON stats provided by the app. Return concise valid JSON with headline, generatedBy, confidence, edges, risks, and focus.",
        },
        {
          role: "user",
          content: JSON.stringify(payload),
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "tennis_matchup_analysis",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["headline", "generatedBy", "confidence", "edges", "risks", "focus"],
            properties: {
              headline: { type: "string" },
              generatedBy: { type: "string" },
              confidence: { type: "string" },
              edges: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 5 },
              risks: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 4 },
              focus: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 4 },
            },
          },
        },
      },
    }),
  });

  if (!apiResponse.ok) {
    return localAnalysis(payload, "OpenAI request failed - showing local analysis");
  }

  const data = await apiResponse.json();
  const text = data.output_text || data.output?.flatMap((item) => item.content || []).find((item) => item.type === "output_text")?.text;
  if (!text) {
    return localAnalysis(payload, "OpenAI response had no text - showing local analysis");
  }

  return { ...JSON.parse(text), generatedBy: `OpenAI Responses API (${process.env.OPENAI_MODEL || "gpt-5.5"})` };
}

function localAnalysis({ first, second, headToHead }, generatedBy) {
  const firstRecent = latestMatches(first, 10);
  const secondRecent = latestMatches(second, 10);
  const firstForm = matchRecord(firstRecent).winRate;
  const secondForm = matchRecord(secondRecent).winRate;
  const firstSeason = matchRecord(currentYearMatches(first));
  const secondSeason = matchRecord(currentYearMatches(second));
  const firstSurface = bestSurface(first);
  const secondSurface = bestSurface(second);
  const formLeader = firstForm >= secondForm ? first : second;
  const surfaceLeader = surfaceWinRate(firstSurface) >= surfaceWinRate(secondSurface) ? first : second;

  return {
    headline: `${formLeader.name} has the sharper recent form; ${surfaceLeader.name} owns the cleaner surface signal.`,
    generatedBy,
    confidence: headToHead ? "Medium - includes direct H2H sample" : "Low - no H2H sample in current data",
    edges: [
      `${first.name}: ${firstForm}% over last ${firstRecent.length}, ${firstSeason.wins}-${firstSeason.losses} in loaded current-year matches, strongest loaded surface ${firstSurface.surface}.`,
      `${second.name}: ${secondForm}% over last ${secondRecent.length}, ${secondSeason.wins}-${secondSeason.losses} in loaded current-year matches, strongest loaded surface ${secondSurface.surface}.`,
      headToHead ? `${first.name} is ${headToHead.winsA}-${headToHead.winsB} against ${second.name} in the loaded sample.` : "No direct meeting is loaded for this pair.",
    ],
    risks: [
      "Career surface splits can lag current form.",
      "Current-year history depends on provider completeness and source timestamps.",
    ],
    focus: [`Validate ${formLeader.name}'s form early.`, `Check whether conditions reward ${surfaceLeader.name}'s preferred surface profile.`],
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
  return player.matches.filter((match) => match.date.startsWith("2026-"));
}

function matchRecord(matches) {
  const wins = matches.filter((match) => match.result === "W").length;
  const losses = matches.length - wins;
  return { wins, losses, winRate: winRate(wins, losses) };
}


