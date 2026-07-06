import React from "react";
import { createRoot } from "react-dom/client";
import {
  Activity,
  AlertCircle,
  ArrowDownUp,
  Bot,
  CalendarDays,
  Crown,
  Database,
  ExternalLink,
  Gauge,
  Medal,
  RefreshCw,
  Search,
  ShieldCheck,
  Swords,
  Trophy,
} from "lucide-react";
import "./styles.css";

type Surface = "Hard" | "Clay" | "Grass" | "Indoor";
type MatchResult = "W" | "L";

type SurfaceRecord = {
  surface: Surface;
  wins: number;
  losses: number;
};

type Match = {
  date: string;
  tournament: string;
  round: string;
  opponent: string;
  opponentRank: number;
  surface: Surface;
  result: MatchResult;
  score: string;
};

type UpcomingMatch = {
  date: string;
  tournament: string;
  round: string;
  surface: Surface;
  opponent: string;
};

type Player = {
  id: string;
  name: string;
  country: string;
  age: number;
  ranking: number;
  points: number;
  titles: number;
  seasonRecord: { wins: number; losses: number };
  careerSurfaces: SurfaceRecord[];
  matches: Match[];
  upcomingMatches?: UpcomingMatch[];
};

type HeadToHead = {
  playerAId: string;
  playerBId: string;
  winsA: number;
  winsB: number;
  meetings: Match[];
};

type DataSource = {
  name: string;
  url: string;
  covers: string[];
  note: string;
};

type Analysis = {
  headline: string;
  generatedBy: string;
  confidence: string;
  edges: string[];
  risks: string[];
  focus: string[];
};

type AppStatus = {
  dataMode: "sample" | "hybrid" | "live";
  analysisMode: "local" | "openai";
  dataUpdatedAt: string;
  providers: Array<{ name: string; status: "ready" | "planned" | "offline"; detail: string }>;
};

type PlayerSearchResult = {
  id: string;
  name: string;
  country: string;
  ranking: number;
  tour?: "M" | "W";
  source?: string;
};

const players: Player[] = [
  {
    id: "sinner",
    name: "Jannik Sinner",
    country: "ITA",
    age: 24,
    ranking: 1,
    points: 11330,
    titles: 19,
    seasonRecord: { wins: 42, losses: 5 },
    careerSurfaces: [
      { surface: "Hard", wins: 223, losses: 64 },
      { surface: "Clay", wins: 88, losses: 37 },
      { surface: "Grass", wins: 35, losses: 16 },
      { surface: "Indoor", wins: 72, losses: 23 },
    ],
    matches: [
      { date: "2026-06-30", tournament: "Wimbledon", round: "R128", opponent: "Luca Nardi", opponentRank: 81, surface: "Grass", result: "W", score: "6-4 6-2 6-3" },
      { date: "2026-06-22", tournament: "Halle", round: "Final", opponent: "Daniil Medvedev", opponentRank: 8, surface: "Grass", result: "W", score: "7-6 6-4" },
      { date: "2026-06-20", tournament: "Halle", round: "Semi", opponent: "Alexander Zverev", opponentRank: 3, surface: "Grass", result: "W", score: "6-3 3-6 6-3" },
      { date: "2026-06-07", tournament: "Roland Garros", round: "Final", opponent: "Carlos Alcaraz", opponentRank: 2, surface: "Clay", result: "L", score: "6-4 4-6 4-6 6-4 5-7" },
      { date: "2026-06-05", tournament: "Roland Garros", round: "Semi", opponent: "Novak Djokovic", opponentRank: 5, surface: "Clay", result: "W", score: "6-2 7-5 6-3" },
      { date: "2026-06-03", tournament: "Roland Garros", round: "Quarter", opponent: "Holger Rune", opponentRank: 11, surface: "Clay", result: "W", score: "7-6 6-4 6-4" },
      { date: "2026-06-01", tournament: "Roland Garros", round: "R16", opponent: "Ben Shelton", opponentRank: 14, surface: "Clay", result: "W", score: "6-4 6-4 7-6" },
      { date: "2026-05-30", tournament: "Roland Garros", round: "R32", opponent: "Tomas Machac", opponentRank: 24, surface: "Clay", result: "W", score: "6-2 6-3 6-4" },
      { date: "2026-05-18", tournament: "Rome", round: "Final", opponent: "Alexander Zverev", opponentRank: 3, surface: "Clay", result: "W", score: "6-4 6-7 6-3" },
      { date: "2026-05-16", tournament: "Rome", round: "Semi", opponent: "Taylor Fritz", opponentRank: 5, surface: "Clay", result: "W", score: "6-3 6-4" },
    ],
  },
  {
    id: "alcaraz",
    name: "Carlos Alcaraz",
    country: "ESP",
    age: 23,
    ranking: 2,
    points: 8850,
    titles: 22,
    seasonRecord: { wins: 39, losses: 7 },
    careerSurfaces: [
      { surface: "Hard", wins: 174, losses: 48 },
      { surface: "Clay", wins: 130, losses: 31 },
      { surface: "Grass", wins: 42, losses: 8 },
      { surface: "Indoor", wins: 28, losses: 14 },
    ],
    matches: [
      { date: "2026-07-01", tournament: "Wimbledon", round: "R128", opponent: "Daniel Altmaier", opponentRank: 54, surface: "Grass", result: "W", score: "6-3 7-6 6-4" },
      { date: "2026-06-23", tournament: "Queen's Club", round: "Final", opponent: "Jack Draper", opponentRank: 6, surface: "Grass", result: "L", score: "6-7 6-4 4-6" },
      { date: "2026-06-21", tournament: "Queen's Club", round: "Semi", opponent: "Alex de Minaur", opponentRank: 9, surface: "Grass", result: "W", score: "6-4 6-4" },
      { date: "2026-06-07", tournament: "Roland Garros", round: "Final", opponent: "Jannik Sinner", opponentRank: 1, surface: "Clay", result: "W", score: "4-6 6-4 6-4 4-6 7-5" },
      { date: "2026-06-05", tournament: "Roland Garros", round: "Semi", opponent: "Casper Ruud", opponentRank: 10, surface: "Clay", result: "W", score: "6-1 7-6 6-2" },
      { date: "2026-06-03", tournament: "Roland Garros", round: "Quarter", opponent: "Stefanos Tsitsipas", opponentRank: 16, surface: "Clay", result: "W", score: "6-3 6-4 6-2" },
      { date: "2026-06-01", tournament: "Roland Garros", round: "R16", opponent: "Andrey Rublev", opponentRank: 13, surface: "Clay", result: "W", score: "7-5 6-3 6-4" },
      { date: "2026-05-30", tournament: "Roland Garros", round: "R32", opponent: "Felix Auger-Aliassime", opponentRank: 22, surface: "Clay", result: "W", score: "6-4 7-6 6-3" },
      { date: "2026-05-17", tournament: "Rome", round: "Semi", opponent: "Jannik Sinner", opponentRank: 1, surface: "Clay", result: "L", score: "4-6 6-4 3-6" },
      { date: "2026-05-15", tournament: "Rome", round: "Quarter", opponent: "Tommy Paul", opponentRank: 12, surface: "Clay", result: "W", score: "6-4 6-4" },
    ],
  },
  {
    id: "swiatek",
    name: "Iga Swiatek",
    country: "POL",
    age: 25,
    ranking: 3,
    points: 8120,
    titles: 26,
    seasonRecord: { wins: 36, losses: 6 },
    careerSurfaces: [
      { surface: "Hard", wins: 205, losses: 58 },
      { surface: "Clay", wins: 115, losses: 18 },
      { surface: "Grass", wins: 24, losses: 15 },
      { surface: "Indoor", wins: 34, losses: 11 },
    ],
    matches: [
      { date: "2026-07-02", tournament: "Wimbledon", round: "R128", opponent: "Emma Navarro", opponentRank: 17, surface: "Grass", result: "W", score: "6-4 6-3" },
      { date: "2026-06-19", tournament: "Bad Homburg", round: "Quarter", opponent: "Daria Kasatkina", opponentRank: 12, surface: "Grass", result: "L", score: "5-7 6-3 4-6" },
      { date: "2026-06-08", tournament: "Roland Garros", round: "Final", opponent: "Aryna Sabalenka", opponentRank: 1, surface: "Clay", result: "W", score: "6-2 6-4" },
      { date: "2026-06-06", tournament: "Roland Garros", round: "Semi", opponent: "Coco Gauff", opponentRank: 2, surface: "Clay", result: "W", score: "6-3 7-5" },
      { date: "2026-06-04", tournament: "Roland Garros", round: "Quarter", opponent: "Elena Rybakina", opponentRank: 6, surface: "Clay", result: "W", score: "7-6 6-2" },
      { date: "2026-06-02", tournament: "Roland Garros", round: "R16", opponent: "Madison Keys", opponentRank: 8, surface: "Clay", result: "W", score: "6-4 6-1" },
      { date: "2026-05-31", tournament: "Roland Garros", round: "R32", opponent: "Marta Kostyuk", opponentRank: 21, surface: "Clay", result: "W", score: "6-3 6-2" },
      { date: "2026-05-18", tournament: "Rome", round: "Final", opponent: "Aryna Sabalenka", opponentRank: 1, surface: "Clay", result: "W", score: "6-3 6-4" },
      { date: "2026-05-16", tournament: "Rome", round: "Semi", opponent: "Jessica Pegula", opponentRank: 5, surface: "Clay", result: "W", score: "6-2 7-5" },
      { date: "2026-05-14", tournament: "Rome", round: "Quarter", opponent: "Qinwen Zheng", opponentRank: 7, surface: "Clay", result: "L", score: "4-6 6-4 5-7" },
    ],
  },
  {
    id: "sabalenka",
    name: "Aryna Sabalenka",
    country: "BLR",
    age: 28,
    ranking: 1,
    points: 10340,
    titles: 21,
    seasonRecord: { wins: 41, losses: 8 },
    careerSurfaces: [
      { surface: "Hard", wins: 286, losses: 97 },
      { surface: "Clay", wins: 91, losses: 42 },
      { surface: "Grass", wins: 39, losses: 22 },
      { surface: "Indoor", wins: 58, losses: 26 },
    ],
    matches: [
      { date: "2026-07-01", tournament: "Wimbledon", round: "R128", opponent: "Marie Bouzkova", opponentRank: 42, surface: "Grass", result: "W", score: "6-2 6-4" },
      { date: "2026-06-22", tournament: "Berlin", round: "Final", opponent: "Coco Gauff", opponentRank: 2, surface: "Grass", result: "W", score: "7-5 6-4" },
      { date: "2026-06-20", tournament: "Berlin", round: "Semi", opponent: "Jessica Pegula", opponentRank: 5, surface: "Grass", result: "W", score: "6-3 4-6 6-3" },
      { date: "2026-06-08", tournament: "Roland Garros", round: "Final", opponent: "Iga Swiatek", opponentRank: 3, surface: "Clay", result: "L", score: "2-6 4-6" },
      { date: "2026-06-06", tournament: "Roland Garros", round: "Semi", opponent: "Mirra Andreeva", opponentRank: 7, surface: "Clay", result: "W", score: "6-4 7-6" },
      { date: "2026-06-04", tournament: "Roland Garros", round: "Quarter", opponent: "Marketa Vondrousova", opponentRank: 18, surface: "Clay", result: "W", score: "6-2 6-4" },
      { date: "2026-06-02", tournament: "Roland Garros", round: "R16", opponent: "Daria Kasatkina", opponentRank: 12, surface: "Clay", result: "W", score: "7-5 6-3" },
      { date: "2026-05-31", tournament: "Roland Garros", round: "R32", opponent: "Leylah Fernandez", opponentRank: 25, surface: "Clay", result: "W", score: "6-4 6-2" },
      { date: "2026-05-18", tournament: "Rome", round: "Final", opponent: "Iga Swiatek", opponentRank: 3, surface: "Clay", result: "L", score: "3-6 4-6" },
      { date: "2026-05-16", tournament: "Rome", round: "Semi", opponent: "Elena Rybakina", opponentRank: 6, surface: "Clay", result: "W", score: "6-4 3-6 6-3" },
    ],
  },
];

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ?? "";

function apiPath(path: string) {
  return `${apiBaseUrl}${path}`;
}

const headToHeads: HeadToHead[] = [
  {
    playerAId: "sinner",
    playerBId: "alcaraz",
    winsA: 5,
    winsB: 8,
    meetings: [
      { date: "2026-06-07", tournament: "Roland Garros", round: "Final", opponent: "Carlos Alcaraz", opponentRank: 2, surface: "Clay", result: "L", score: "6-4 4-6 4-6 6-4 5-7" },
      { date: "2025-11-16", tournament: "ATP Finals", round: "Final", opponent: "Carlos Alcaraz", opponentRank: 2, surface: "Indoor", result: "W", score: "6-4 7-6" },
      { date: "2025-09-07", tournament: "US Open", round: "Semi", opponent: "Carlos Alcaraz", opponentRank: 2, surface: "Hard", result: "L", score: "4-6 6-3 3-6 4-6" },
    ],
  },
  {
    playerAId: "swiatek",
    playerBId: "sabalenka",
    winsA: 9,
    winsB: 4,
    meetings: [
      { date: "2026-06-08", tournament: "Roland Garros", round: "Final", opponent: "Aryna Sabalenka", opponentRank: 1, surface: "Clay", result: "W", score: "6-2 6-4" },
      { date: "2025-11-08", tournament: "WTA Finals", round: "Semi", opponent: "Aryna Sabalenka", opponentRank: 1, surface: "Hard", result: "L", score: "6-4 3-6 4-6" },
      { date: "2025-05-18", tournament: "Rome", round: "Final", opponent: "Aryna Sabalenka", opponentRank: 2, surface: "Clay", result: "W", score: "6-3 6-2" },
    ],
  },
];

const dataSources: DataSource[] = [
  {
    name: "ATP Tour",
    url: "https://www.atptour.com/en/rankings/singles/live",
    covers: ["ATP rankings", "player profiles", "official men's stats"],
    note: "Primary source for ATP ranking, points, official player metadata, and tour-level stat pages.",
  },
  {
    name: "WTA Tour",
    url: "https://www.wtatennis.com/rankings/singles",
    covers: ["WTA rankings", "player profiles", "official women's stats", "WTA head-to-head"],
    note: "Primary source for WTA ranking, points, match context, and official women's player pages.",
  },
  {
    name: "Tennis Abstract",
    url: "https://www.tennisabstract.com/",
    covers: ["surface records", "match logs", "head-to-head history", "career splits"],
    note: "Useful normalized source for surface splits, match history, and H2H tables across ATP and WTA.",
  },
  {
    name: "OpenAI Responses API",
    url: "https://developers.openai.com/api/reference/responses/overview/",
    covers: ["matchup summary", "risk notes", "analysis narrative"],
    note: "OpenAI should analyze already-fetched tennis facts; it should not be treated as the source of the raw stats.",
  },
];

const tennisApi = {
  async getStatus() {
    try {
      const response = await fetch(apiPath("/api/status"));
      if (response.ok) {
        return (await response.json()) as AppStatus;
      }
    } catch {
      // Vite-only mode falls back to local sample status.
    }

    return {
      dataMode: "hybrid",
      analysisMode: "local",
      dataUpdatedAt: "2026-07-05T00:00:00.000Z",
      providers: [
        { name: "Demo dataset", status: "ready", detail: "Bundled sample players and matches" },
        { name: "OpenAI", status: "planned", detail: "Set OPENAI_API_KEY and run npm run serve" },
        { name: "Tennis Abstract", status: "ready", detail: "Live player search and stat fetch" },
      ],
    } satisfies AppStatus;
  },
  async getPlayers() {
    await new Promise((resolve) => window.setTimeout(resolve, 350));
    return players;
  },
  async searchPlayers(query: string) {
    if (query.trim().length < 2) return [];
    try {
      const response = await fetch(apiPath(`/api/search?q=${encodeURIComponent(query)}`));
      if (response.ok) {
        return (await response.json()) as PlayerSearchResult[];
      }
    } catch {
      // Search remains usable against bundled players when the backend is unavailable.
    }
    return [];
  },
  async getPlayer(result: PlayerSearchResult) {
    const response = await fetch(apiPath(`/api/player?name=${encodeURIComponent(result.name)}&tour=${encodeURIComponent(result.tour || "M")}`));
    if (!response.ok) {
      throw new Error("Could not fetch player");
    }
    return (await response.json()) as Player;
  },
  async compare(playerAId: string, playerBId: string, roster = players) {
    await new Promise((resolve) => window.setTimeout(resolve, 300));
    const first = roster.find((player) => player.id === playerAId);
    const second = roster.find((player) => player.id === playerBId);
    if (!first || !second) {
      throw new Error("Player not found");
    }
    return {
      first,
      second,
      headToHead: findHeadToHead(playerAId, playerBId) ?? deriveHeadToHead(first, second),
      upcomingMatch: findUpcomingMatch(first, second),
    };
  },
  async analyze(first: Player, second: Player, headToHead: HeadToHead | null) {
    try {
      const response = await fetch(apiPath("/api/analyze"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ first, second, headToHead }),
      });
      if (response.ok) {
        return (await response.json()) as Analysis;
      }
    } catch {
      // The Vite-only frontend still works without the optional OpenAI backend.
    }

    await new Promise((resolve) => window.setTimeout(resolve, 380));
    return buildAnalysis(first, second, headToHead);
  },
};

function findHeadToHead(playerAId: string, playerBId: string) {
  const record = headToHeads.find(
    (item) =>
      (item.playerAId === playerAId && item.playerBId === playerBId) ||
      (item.playerAId === playerBId && item.playerBId === playerAId),
  );

  if (!record) {
    return null;
  }

  if (record.playerAId === playerAId) {
    return record;
  }

  return {
    ...record,
    playerAId,
    playerBId,
    winsA: record.winsB,
    winsB: record.winsA,
    meetings: record.meetings.map((meeting) => ({
      ...meeting,
      result: meeting.result === "W" ? "L" : "W",
      opponent: players.find((player) => player.id === playerBId)?.name ?? meeting.opponent,
    })),
  };
}

function deriveHeadToHead(first: Player, second: Player): HeadToHead | null {
  const meetings = first.matches.filter((match) => match.opponent === second.name);
  if (!meetings.length) {
    return null;
  }

  const winsA = meetings.filter((match) => match.result === "W").length;
  return {
    playerAId: first.id,
    playerBId: second.id,
    winsA,
    winsB: meetings.length - winsA,
    meetings,
  };
}

function findUpcomingMatch(first: Player, second: Player): UpcomingMatch | null {
  const secondName = normalizePlayerName(second.name);
  const firstName = normalizePlayerName(first.name);
  const fromFirst = first.upcomingMatches?.find((match) => normalizePlayerName(match.opponent) === secondName);
  if (fromFirst) return fromFirst;

  const fromSecond = second.upcomingMatches?.find((match) => normalizePlayerName(match.opponent) === firstName);
  if (!fromSecond) return null;

  return {
    ...fromSecond,
    opponent: first.name,
  };
}

function normalizePlayerName(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function winRate(wins: number, losses: number) {
  const total = wins + losses;
  return total === 0 ? 0 : Math.round((wins / total) * 100);
}

function surfaceWinRate(record: SurfaceRecord) {
  return winRate(record.wins, record.losses);
}

function bestSurface(player: Player) {
  return [...player.careerSurfaces].sort((a, b) => {
    const totalDiff = b.wins + b.losses - (a.wins + a.losses);
    if (totalDiff !== 0) return totalDiff;
    return surfaceWinRate(b) - surfaceWinRate(a);
  })[0];
}

function recentWinRate(player: Player) {
  const recentMatches = latestMatches(player, 10);
  const recentWins = recentMatches.filter((match) => match.result === "W").length;
  return winRate(recentWins, recentMatches.length - recentWins);
}

function formatRecord(wins: number, losses: number) {
  return `${wins}-${losses}`;
}

function latestMatches(player: Player, limit = 10) {
  return [...player.matches].sort((a, b) => b.date.localeCompare(a.date)).slice(0, limit);
}

function currentYearMatches(player: Player) {
  return player.matches.filter((match) => match.date.startsWith("2026-"));
}

function matchRecord(matches: Match[]) {
  const wins = matches.filter((match) => match.result === "W").length;
  return {
    wins,
    losses: matches.length - wins,
    winRate: winRate(wins, matches.length - wins),
  };
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(`${value}T12:00:00`));
}

function buildAnalysis(first: Player, second: Player, headToHead: HeadToHead | null): Analysis {
  const firstSurface = bestSurface(first);
  const secondSurface = bestSurface(second);
  const firstForm = recentWinRate(first);
  const secondForm = recentWinRate(second);
  const firstSeason = matchRecord(currentYearMatches(first));
  const secondSeason = matchRecord(currentYearMatches(second));
  const formLeader = firstForm >= secondForm ? first : second;
  const surfaceLeader = surfaceWinRate(firstSurface) >= surfaceWinRate(secondSurface) ? first : second;
  const h2hText = headToHead
    ? `${first.name} is ${headToHead.winsA}-${headToHead.winsB} against ${second.name} in the loaded H2H sample.`
    : "No direct meeting is loaded for this pair, so this read leans more heavily on form and surface profile.";

  return {
    headline: `${formLeader.name} has the sharper recent form; ${surfaceLeader.name} owns the cleaner surface signal.`,
    generatedBy: "OpenAI-ready local analysis",
    confidence: headToHead ? "Medium - includes direct H2H sample" : "Low - no H2H sample in current data",
    edges: [
      `${first.name}: ${firstForm}% winrate over last ${latestMatches(first).length}, ${formatRecord(firstSeason.wins, firstSeason.losses)} in loaded 2026 matches, with ${firstSurface.surface} as the highest-volume career surface (${formatRecord(firstSurface.wins, firstSurface.losses)}).`,
      `${second.name}: ${secondForm}% winrate over last ${latestMatches(second).length}, ${formatRecord(secondSeason.wins, secondSeason.losses)} in loaded 2026 matches, with ${secondSurface.surface} as the highest-volume career surface (${formatRecord(secondSurface.wins, secondSurface.losses)}).`,
      h2hText,
    ],
    risks: [
      "Surface records are career-level and should be weighted against current tournament surface.",
      "The current-year sample is only as complete as the selected data provider, so source timestamps still matter.",
    ],
    focus: [
      `Start with ${formLeader.name}'s first two service games to validate the form read.`,
      `Check whether the match surface amplifies ${surfaceLeader.name}'s preferred pattern.`,
      "Use live odds or point-by-point stats only after confirming the source timestamp.",
    ],
  };
}

function App() {
  const [availablePlayers, setAvailablePlayers] = React.useState<Player[]>([]);
  const [status, setStatus] = React.useState<AppStatus | null>(null);
  const [playerAId, setPlayerAId] = React.useState("sinner");
  const [playerBId, setPlayerBId] = React.useState("alcaraz");
  const [comparison, setComparison] = React.useState<{
    first: Player;
    second: Player;
    headToHead: HeadToHead | null;
    upcomingMatch: UpcomingMatch | null;
  } | null>(null);
  const [analysis, setAnalysis] = React.useState<Analysis | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isFetchingPlayer, setIsFetchingPlayer] = React.useState(false);

  React.useEffect(() => {
    tennisApi.getStatus().then(setStatus).catch(() => setError("Could not load app status."));
    tennisApi.getPlayers().then((nextPlayers) => setAvailablePlayers(nextPlayers)).catch(() => setError("Could not load players."));
  }, []);

  const loadComparison = React.useCallback(() => {
    if (!availablePlayers.length) return;
    setIsLoading(true);
    setError(null);
    setAnalysis(null);
    tennisApi
      .compare(playerAId, playerBId, availablePlayers)
      .then((nextComparison) => {
        setComparison(nextComparison);
        setIsLoading(false);
        return tennisApi.analyze(nextComparison.first, nextComparison.second, nextComparison.headToHead);
      })
      .then(setAnalysis)
      .catch(() => {
        setIsLoading(false);
        setError("Could not refresh this matchup.");
      });
  }, [availablePlayers, playerAId, playerBId]);

  React.useEffect(() => {
    loadComparison();
  }, [loadComparison]);

  const canSwap = playerAId !== playerBId;
  const selectPlayer = React.useCallback(async (result: PlayerSearchResult, side: "a" | "b") => {
    const existing = availablePlayers.find((player) => player.id === result.id || player.name === result.name);
    if (existing) {
      if (side === "a") setPlayerAId(existing.id);
      else setPlayerBId(existing.id);
      return;
    }

    setIsFetchingPlayer(true);
    setError(null);
    try {
      const player = await tennisApi.getPlayer(result);
      setAvailablePlayers((current) => {
        if (current.some((item) => item.id === player.id)) return current;
        return [...current, player];
      });
      if (side === "a") setPlayerAId(player.id);
      else setPlayerBId(player.id);
    } catch {
      setError(`Could not fetch ${result.name} from Tennis Abstract.`);
    } finally {
      setIsFetchingPlayer(false);
    }
  }, [availablePlayers]);

  return (
    <main className="app-shell">
      <section className="toolbar" aria-label="Player comparison controls">
        <div className="player-search-slot player-search-left">
          <PlayerSearch label="Player one" value={playerAId} onSelect={(result) => selectPlayer(result, "a")} players={availablePlayers} blockedId={playerBId} />
        </div>
        <div className="title-lockup">
          <p className="eyebrow">Tennis analysis</p>
          <h1>Head-to-head dashboard</h1>
          <button
            className="icon-button"
            type="button"
            title="Swap players"
            aria-label="Swap players"
            disabled={!canSwap || isFetchingPlayer}
            onClick={() => {
              setPlayerAId(playerBId);
              setPlayerBId(playerAId);
            }}
          >
            <ArrowDownUp size={18} />
          </button>
        </div>
        <div className="player-search-slot player-search-right">
          <PlayerSearch label="Player two" value={playerBId} onSelect={(result) => selectPlayer(result, "b")} players={availablePlayers} blockedId={playerAId} />
        </div>
      </section>

      <StatusStrip status={status} onRefresh={loadComparison} isLoading={isLoading || isFetchingPlayer} />
      {error && <ErrorBanner message={error} onRetry={loadComparison} />}

      {comparison && (
        <div className={isLoading ? "dashboard is-loading" : "dashboard"}>
          <section className="overview-grid" aria-label="Player overview">
            <PlayerSummary player={comparison.first} />
            <HeadToHeadCard first={comparison.first} second={comparison.second} record={comparison.headToHead} upcomingMatch={comparison.upcomingMatch} />
            <PlayerSummary player={comparison.second} align="right" />
          </section>

          <section className="comparison-grid" aria-label="Comparison details">
            <SurfacePanel player={comparison.first} />
            <SurfacePanel player={comparison.second} />
            <MatchHistory player={comparison.first} />
            <MatchHistory player={comparison.second} />
          </section>

          <section className="insight-grid" aria-label="Analysis and sources">
            {analysis && <AnalysisPanel analysis={analysis} />}
            <SourcesPanel sources={dataSources} />
          </section>
        </div>
      )}
    </main>
  );
}

function PlayerSearch({
  label,
  value,
  onSelect,
  players,
  blockedId,
}: {
  label: string;
  value: string;
  onSelect: (result: PlayerSearchResult) => void;
  players: Player[];
  blockedId: string;
}) {
  const selectedPlayer = players.find((player) => player.id === value);
  const [query, setQuery] = React.useState(selectedPlayer?.name ?? "");
  const [isOpen, setIsOpen] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [remoteResults, setRemoteResults] = React.useState<PlayerSearchResult[]>([]);
  const [isSearching, setIsSearching] = React.useState(false);
  const inputId = React.useId();
  const listId = `${inputId}-list`;
  const localResults = players
    .filter((player) => player.id !== blockedId)
    .filter((player) => {
      const normalized = query.trim().toLowerCase();
      if (!normalized) return true;
      return `${player.name} ${player.country}`.toLowerCase().includes(normalized);
    })
    .map((player) => ({
      id: player.id,
      name: player.name,
      country: player.country,
      ranking: player.ranking,
      source: "Current roster",
    }));
  const filteredPlayers = [...localResults, ...remoteResults.filter((result) => !localResults.some((local) => local.name === result.name))]
    .filter((result) => result.id !== blockedId)
    .slice(0, 8);

  React.useEffect(() => {
    setQuery(selectedPlayer?.name ?? "");
  }, [selectedPlayer?.name]);

  React.useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  React.useEffect(() => {
    const normalized = query.trim();
    if (normalized.length < 2 || normalized === selectedPlayer?.name) {
      setRemoteResults([]);
      return;
    }

    let cancelled = false;
    setIsSearching(true);
    const timeout = window.setTimeout(() => {
      tennisApi
        .searchPlayers(normalized)
        .then((results) => {
          if (!cancelled) setRemoteResults(results);
        })
        .catch(() => {
          if (!cancelled) setRemoteResults([]);
        })
        .finally(() => {
          if (!cancelled) setIsSearching(false);
        });
    }, 180);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [query, selectedPlayer?.name]);

  const choosePlayer = (player: PlayerSearchResult) => {
    onSelect(player);
    setQuery(player.name);
    setIsOpen(false);
  };

  return (
    <label className="search-field">
      <span>{label}</span>
      <div className="search-wrap">
        <Search size={16} aria-hidden="true" />
        <input
          aria-autocomplete="list"
          aria-controls={listId}
          aria-expanded={isOpen}
          autoComplete="off"
          id={inputId}
          placeholder="Type a player name"
          role="combobox"
          value={query}
          onBlur={() => window.setTimeout(() => setIsOpen(false), 120)}
          onChange={(event) => {
            setQuery(event.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setIsOpen(true);
              setActiveIndex((index) => Math.min(index + 1, filteredPlayers.length - 1));
            }
            if (event.key === "ArrowUp") {
              event.preventDefault();
              setActiveIndex((index) => Math.max(index - 1, 0));
            }
            if (event.key === "Enter" && isOpen && filteredPlayers[activeIndex]) {
              event.preventDefault();
              choosePlayer(filteredPlayers[activeIndex]);
            }
            if (event.key === "Escape") {
              setIsOpen(false);
              setQuery(selectedPlayer?.name ?? "");
            }
          }}
        />
        {isOpen && (
          <div className="search-menu" id={listId} role="listbox">
            {filteredPlayers.length > 0 ? (
              filteredPlayers.map((player, index) => (
                <button
                  className={index === activeIndex ? "is-active" : ""}
                  key={player.id}
                  role="option"
                  type="button"
                  aria-selected={player.id === value}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => choosePlayer(player)}
                >
                  <span>{player.name}</span>
                  <small>
                    {player.country ? `${player.country} - ` : ""}
                    {player.ranking ? `#${player.ranking}` : player.tour ? `${player.tour === "W" ? "WTA" : "ATP"} source` : player.source}
                  </small>
                </button>
              ))
            ) : (
              <div className="search-empty">
                <strong>{isSearching ? "Searching Tennis Abstract" : "No player found"}</strong>
                <small>Try a full name like Novak Djokovic, Coco Gauff, Rafael Nadal, or Serena Williams.</small>
              </div>
            )}
          </div>
        )}
      </div>
    </label>
  );
}

function StatusStrip({ status, onRefresh, isLoading }: { status: AppStatus | null; onRefresh: () => void; isLoading: boolean }) {
  const updated = status ? new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(status.dataUpdatedAt)) : "Loading";
  const providerText = status?.providers.map((provider) => `${provider.name}: ${provider.status}`).join(" / ") ?? "Checking providers";

  return (
    <section className="status-strip" aria-label="Application status">
      <div>
        <span className={`status-dot ${status?.analysisMode === "openai" ? "is-live" : ""}`} />
        <strong>{status?.dataMode === "live" ? "Live data" : status?.dataMode === "hybrid" ? "Hybrid data" : "Sample data"}</strong>
        <small>Updated {updated}</small>
      </div>
      <div>
        <ShieldCheck size={16} />
        <span>{status?.analysisMode === "openai" ? "OpenAI analysis enabled" : "Local analysis fallback"}</span>
      </div>
      <div className="provider-summary">
        <Database size={16} />
        <span>{providerText}</span>
      </div>
      <button className="refresh-button" type="button" onClick={onRefresh} disabled={isLoading}>
        <RefreshCw size={15} />
        Refresh
      </button>
    </section>
  );
}

function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <section className="error-banner" role="alert">
      <AlertCircle size={18} />
      <span>{message}</span>
      <button type="button" onClick={onRetry}>
        Try again
      </button>
    </section>
  );
}

function PlayerSummary({ player, align = "left" }: { player: Player; align?: "left" | "right" }) {
  const topSurface = bestSurface(player);
  return (
    <article className={`summary-card ${align === "right" ? "align-right" : ""}`}>
      <div className="player-kicker">
        <span>{player.country}</span>
        <span>{player.age} yrs</span>
      </div>
      <h2>{player.name}</h2>
      <div className="metric-row">
        <Metric icon={<Medal size={18} />} label="Ranking" value={`#${player.ranking}`} detail={`${player.points.toLocaleString()} pts`} />
        <Metric icon={<Trophy size={18} />} label="Career titles" value={player.titles.toString()} detail={`${winRate(player.seasonRecord.wins, player.seasonRecord.losses)}% season`} />
      </div>
      <div className="surface-callout">
        <span>{topSurface.surface}</span>
        <strong>{surfaceWinRate(topSurface)}%</strong>
        <small>
          strongest sample, {topSurface.wins}-{topSurface.losses}
        </small>
      </div>
    </article>
  );
}

function Metric({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: string; detail: string }) {
  return (
    <div className="metric">
      <div className="metric-icon">{icon}</div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{detail}</small>
      </div>
    </div>
  );
}

function HeadToHeadCard({
  first,
  second,
  record,
  upcomingMatch,
}: {
  first: Player;
  second: Player;
  record: HeadToHead | null;
  upcomingMatch: UpcomingMatch | null;
}) {
  const firstWins = record?.winsA ?? 0;
  const secondWins = record?.winsB ?? 0;
  const total = firstWins + secondWins;
  const firstShare = total ? Math.round((firstWins / total) * 100) : 50;

  return (
    <article className="h2h-card">
      <div className="card-title">
        <Swords size={18} />
        <span>Head to head</span>
      </div>
      <div className="scoreboard">
        <div>
          <span>{first.name.split(" ").at(-1)}</span>
          <strong>{firstWins}</strong>
        </div>
        <span className="score-divider">:</span>
        <div>
          <span>{second.name.split(" ").at(-1)}</span>
          <strong>{secondWins}</strong>
        </div>
      </div>
      <div className="split-bar" aria-label={`${first.name} ${firstWins} wins, ${second.name} ${secondWins} wins`}>
        <span style={{ width: `${firstShare}%` }} />
      </div>
      {upcomingMatch && (
        <div className="upcoming-match">
          <span>Upcoming matchup</span>
          <strong>
            {first.name} vs {second.name}
          </strong>
          <small>
            {upcomingMatch.tournament} - {formatDate(upcomingMatch.date)} - {upcomingMatch.round} - {upcomingMatch.surface}
          </small>
        </div>
      )}
      {record ? (
        <div className="meeting-list">
          {record.meetings.slice(0, 3).map((meeting) => (
            <div key={`${meeting.date}-${meeting.tournament}`}>
              <span>{formatDate(meeting.date)}</span>
              <strong>{meeting.tournament}</strong>
              <small>
                {meeting.surface} - {meeting.result === "W" ? first.name.split(" ")[0] : second.name.split(" ")[0]} won
              </small>
            </div>
          ))}
        </div>
      ) : (
        <p className="empty-state">No recorded meeting in the current data set.</p>
      )}
    </article>
  );
}

function SurfacePanel({ player }: { player: Player }) {
  const maxMatches = Math.max(...player.careerSurfaces.map((surface) => surface.wins + surface.losses));
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">{player.name}</p>
          <h3>Career surface profile</h3>
        </div>
        <Crown size={18} />
      </div>
      <div className="surface-list">
        {player.careerSurfaces.map((surface) => {
          const total = surface.wins + surface.losses;
          return (
            <div className="surface-row" key={surface.surface}>
              <div className="surface-copy">
                <strong>{surface.surface}</strong>
                <span>
                  {surface.wins}-{surface.losses} - {surfaceWinRate(surface)}%
                </span>
              </div>
              <div className="surface-track">
                <span style={{ width: `${Math.max(8, (total / maxMatches) * 100)}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function MatchHistory({ player }: { player: Player }) {
  const recentMatches = latestMatches(player, 10);
  const season = matchRecord(currentYearMatches(player));
  const recent = matchRecord(recentMatches);

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">{player.name}</p>
          <h3>Last 10 and 2026 form</h3>
        </div>
        <div className="form-pill">
          <Activity size={15} />
          {recentWinRate(player)}%
        </div>
      </div>
      <div className="season-strip">
        <div>
          <span>2026 record</span>
          <strong>{formatRecord(season.wins, season.losses)}</strong>
        </div>
        <div>
          <span>2026 winrate</span>
          <strong>{season.winRate}%</strong>
        </div>
        <div>
          <span>Last 10</span>
          <strong>{formatRecord(recent.wins, recent.losses)}</strong>
        </div>
      </div>
      <div className="match-table">
        {recentMatches.map((match) => (
          <div className="match-row" key={`${player.id}-${match.date}-${match.opponent}`}>
            <div className={match.result === "W" ? "result win" : "result loss"}>{match.result}</div>
            <div>
              <strong>{match.opponent}</strong>
              <span>
                <CalendarDays size={13} />
                {formatDate(match.date)} - {match.tournament} - {match.round}
              </span>
            </div>
            <div className="match-meta">
              <span>{match.surface}</span>
              <small>{match.score}</small>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function AnalysisPanel({ analysis }: { analysis: Analysis }) {
  return (
    <section className="panel analysis-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">OpenAI layer</p>
          <h3>Matchup read</h3>
        </div>
        <Bot size={18} />
      </div>
      <p className="analysis-headline">{analysis.headline}</p>
      <div className="analysis-meta">
        <span>
          <Gauge size={14} />
          {analysis.confidence}
        </span>
        <span>
          <ShieldCheck size={14} />
          {analysis.generatedBy}
        </span>
      </div>
      <div className="analysis-columns">
        <InsightList title="Edges" items={analysis.edges} />
        <InsightList title="Risks" items={analysis.risks} />
        <InsightList title="Watch" items={analysis.focus} />
      </div>
    </section>
  );
}

function InsightList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="insight-list">
      <strong>{title}</strong>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function SourcesPanel({ sources }: { sources: DataSource[] }) {
  return (
    <section className="panel sources-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Fetch plan</p>
          <h3>Sources</h3>
        </div>
        <Database size={18} />
      </div>
      <div className="source-list">
        {sources.map((source) => (
          <a className="source-card" href={source.url} target="_blank" rel="noreferrer" key={source.name}>
            <div>
              <strong>{source.name}</strong>
              <span>{source.covers.join(" - ")}</span>
            </div>
            <ExternalLink size={16} />
            <small>{source.note}</small>
          </a>
        ))}
      </div>
    </section>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);


