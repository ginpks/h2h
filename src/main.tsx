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
  Gauge,
  LoaderCircle,
  Medal,
  Send,
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
  stats?: Record<string, number | string | null>;
  opponentStats?: Record<string, number | string | null>;
  odds?: { player: string | null; opponent: string | null };
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
  rapidId?: number;
  tour?: "M" | "W";
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
  apiStats?: {
    source: string;
    fetchedAt: string;
    rapidId?: number;
    recentGames?: string[];
    careerRecord?: { wins: number; losses: number };
    totalMatches?: number;
    matchLogCount?: number;
    bestRank?: { position?: number; date?: string } | null;
    favouriteCourt?: { wins?: number; losses?: number; surface?: string } | null;
    singlesCount?: number;
    publicStats?: {
      source: string;
      url: string;
      fetchedAt: string;
      profile?: {
        age?: number;
        hand?: string | null;
        serveSpeed?: string | null;
        serveSpeedPercentile?: number;
      };
      recentForm?: MatchResult[];
      currentYearRecord?: { wins: number; losses: number; winRate: number } | null;
      careerRecord?: { wins: number; losses: number; totalMatches: number; winRate: number } | null;
      surfaceCareer?: Record<string, { percent: number; wins: number; losses: number; total: number }>;
      matchSet?: {
        currentYear?: Record<string, { percent: number | null; last12MonthsPercent: number | null; percentile: number }>;
        career?: Record<string, { percent: number | null; number: string; percentile: number }>;
      };
    } | null;
  };
};

type HeadToHead = {
  playerAId: string;
  playerBId: string;
  winsA: number;
  winsB: number;
  meetings: Match[];
};

type Analysis = {
  headline: string;
  pick: string;
  conviction: string;
  narrative: string;
  generatedBy: string;
  confidence: string;
  edges: string[];
  redFlags: string[];
  risks: string[];
  focus: string[];
};

type ChatMessage = {
  role: "assistant" | "user";
  content: string;
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
const apiAvailable = Boolean(apiBaseUrl) || import.meta.env.PROD;

function apiPath(path: string) {
  return `${apiBaseUrl}${path}`;
}

function hasBackend() {
  return apiAvailable;
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

const tennisApi = {
  async getStatus() {
    if (!hasBackend()) {
      return {
        dataMode: "sample",
        analysisMode: "local",
        dataUpdatedAt: "2026-07-05T00:00:00.000Z",
        providers: [
          { name: "Demo dataset", status: "ready", detail: "Bundled sample players and matches" },
          { name: "Rapid Tennis API", status: "offline", detail: "Run the Node server or set VITE_API_BASE_URL to connect live tennis data" },
          { name: "OpenAI", status: "offline", detail: "Requires the hosted backend" },
        ],
      } satisfies AppStatus;
    }

    try {
      const response = await fetch(apiPath("/api/status"));
      if (response.ok) {
        return (await response.json()) as AppStatus;
      }
    } catch {
      // Vite-only mode falls back to local sample status.
    }

    return {
      dataMode: "sample",
      analysisMode: "local",
      dataUpdatedAt: "2026-07-05T00:00:00.000Z",
      providers: [
        { name: "Demo dataset", status: "ready", detail: "Bundled sample players and matches" },
        { name: "Rapid Tennis API", status: "offline", detail: "Hosted backend is unavailable" },
        { name: "OpenAI", status: "offline", detail: "Hosted backend is unavailable" },
      ],
    } satisfies AppStatus;
  },
  async getPlayers() {
    await new Promise((resolve) => window.setTimeout(resolve, 350));
    return players;
  },
  async searchPlayers(query: string) {
    if (query.trim().length < 2) return [];
    if (!hasBackend()) return [];
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
  async chat(payload: { first: Player; second: Player; headToHead: HeadToHead | null; analysis: Analysis | null; messages: ChatMessage[]; question: string }) {
    try {
      const response = await fetch(apiPath("/api/chat"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (response.ok) {
        return (await response.json()) as { reply: string; generatedBy: string };
      }
    } catch {
      // Keep the chat box usable in local/static fallback mode.
    }

    const lean = payload.analysis?.pick ? `Current lean: ${payload.analysis.pick}. ` : "";
    return {
      reply: `${lean}I can answer from the loaded matchup, but the OpenAI chat endpoint is not available right now. Key local points: ${payload.analysis?.edges?.slice(0, 2).join(" ") || "load both player profiles first."}`,
      generatedBy: "Local fallback",
    };
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
  return player.matches.filter((match) => match.date.startsWith(`${new Date().getFullYear()}-`));
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

type SetScore = {
  playerGames: number;
  opponentGames: number;
};

type PlayerProfile = {
  player: Player;
  recentMatches: Match[];
  seasonMatches: Match[];
  recent: ReturnType<typeof matchRecord>;
  season: ReturnType<typeof matchRecord>;
  career: ReturnType<typeof matchRecord>;
  setRecords: Array<{ setNumber: number; wins: number; losses: number; winRate: number }>;
  decidingSet: { wins: number; losses: number; winRate: number; streak: number; streakResult: MatchResult | null };
  seasonDecidingSet: { wins: number; losses: number; winRate: number; streak: number; streakResult: MatchResult | null };
  setOneCloseout: { chances: number; matchWins: number; matchWinRate: number; straightSetWins: number; straightSetWinRate: number };
  tieBreaks: { wins: number; losses: number; winRate: number };
  straightSets: { wins: number; losses: number; winRate: number };
  strongestSet: { setNumber: number; wins: number; losses: number; winRate: number };
  weakestSet: { setNumber: number; wins: number; losses: number; winRate: number };
  currentStreak: { result: MatchResult | null; count: number };
  totalMatches: number;
  bestSurfaceRecord: SurfaceRecord;
};

function buildPlayerProfile(player: Player): PlayerProfile {
  const allMatches = [...player.matches].sort((a, b) => b.date.localeCompare(a.date));
  const recentMatches = allMatches.slice(0, 10);
  const seasonMatches = currentYearMatches(player);
  const career = matchRecord(allMatches);
  const setRecords = [1, 2, 3].map((setNumber) => setRecord(allMatches, setNumber));
  const setThree = setRecords[2];
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

function parseScoreSets(score: string): SetScore[] {
  return String(score || "")
    .split(/\s+/)
    .map((part) => part.replace(/\([^)]*\)/g, "").replace(/\[[^\]]*\]/g, ""))
    .map((part) => part.match(/^(\d+)-(\d+)/))
    .filter((match): match is RegExpMatchArray => Boolean(match))
    .map((match) => ({ playerGames: Number(match[1]), opponentGames: Number(match[2]) }))
    .filter((set) => Number.isFinite(set.playerGames) && Number.isFinite(set.opponentGames));
}

function setRecord(matches: Match[], setNumber: number) {
  const sets = matches.map((match) => parseScoreSets(match.score)[setNumber - 1]).filter(Boolean);
  const wins = sets.filter((set) => set.playerGames > set.opponentGames).length;
  const losses = sets.filter((set) => set.playerGames < set.opponentGames).length;
  return { setNumber, wins, losses, winRate: winRate(wins, losses) };
}

function decidingSetRecord(matches: Match[]) {
  const deciding = matches.filter((match) => parseScoreSets(match.score).length >= 3);
  const wins = deciding.filter((match) => match.result === "W").length;
  const losses = deciding.length - wins;
  const streak = resultStreak(deciding);
  return { wins, losses, winRate: winRate(wins, losses), streak: streak.count, streakResult: streak.result };
}

function setOneCloseoutRecord(matches: Match[]) {
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

function tieBreakRecord(matches: Match[]) {
  const tieBreakSets = matches.flatMap((match) => parseScoreSets(match.score).filter((set) => set.playerGames === 7 && set.opponentGames === 6 || set.playerGames === 6 && set.opponentGames === 7));
  const wins = tieBreakSets.filter((set) => set.playerGames > set.opponentGames).length;
  const losses = tieBreakSets.length - wins;
  return { wins, losses, winRate: winRate(wins, losses) };
}

function straightSetsRecord(matches: Match[]) {
  const straight = matches.filter((match) => {
    const sets = parseScoreSets(match.score);
    return sets.length >= 2 && sets.every((set) => set.playerGames !== set.opponentGames) && new Set(sets.map((set) => set.playerGames > set.opponentGames)).size === 1;
  });
  const wins = straight.filter((match) => match.result === "W").length;
  const losses = straight.length - wins;
  return { wins, losses, winRate: winRate(wins, losses) };
}

function resultStreak(matches: Match[]) {
  const sorted = [...matches].sort((a, b) => b.date.localeCompare(a.date));
  const result = sorted[0]?.result ?? null;
  if (!result) return { result, count: 0 };
  return {
    result,
    count: sorted.findIndex((match) => match.result !== result) === -1 ? sorted.length : sorted.findIndex((match) => match.result !== result),
  };
}

function percentagePointGap(firstRate: number, secondRate: number) {
  return Math.abs(firstRate - secondRate);
}

function formatStreak(profile: PlayerProfile) {
  if (!profile.currentStreak.result) return `${profile.player.name} has no loaded recent result streak.`;
  const label = profile.currentStreak.result === "W" ? "won" : "lost";
  return `${profile.player.name} has ${label} ${profile.currentStreak.count} straight loaded matches and is ${formatRecord(profile.recent.wins, profile.recent.losses)} over the last ${profile.recentMatches.length}.`;
}

function publicCurrentRow(profile: PlayerProfile, label: string) {
  return profile.player.apiStats?.publicStats?.matchSet?.currentYear?.[label] ?? null;
}

function publicCareerRow(profile: PlayerProfile, label: string) {
  return profile.player.apiStats?.publicStats?.matchSet?.career?.[label] ?? null;
}

function publicCareerTotal(profile: PlayerProfile) {
  return profile.player.apiStats?.publicStats?.careerRecord?.totalMatches || profile.player.apiStats?.totalMatches || profile.totalMatches;
}

function publicSeasonRecord(profile: PlayerProfile) {
  return profile.player.apiStats?.publicStats?.currentYearRecord || profile.season;
}

function publicBioProfile(profile: PlayerProfile) {
  return profile.player.apiStats?.publicStats?.profile || {};
}

function publicCareerSurface(profile: PlayerProfile, surface: string) {
  return profile.player.apiStats?.publicStats?.surfaceCareer?.[surface] ?? null;
}

function profileAge(profile: PlayerProfile) {
  return publicBioProfile(profile).age || profile.player.age || 0;
}

function publicFormRecord(profile: PlayerProfile) {
  const form = profile.player.apiStats?.publicStats?.recentForm || [];
  if (form.length < 5) return null;
  const wins = form.filter((result) => result === "W").length;
  const losses = form.length - wins;
  return { wins, losses, total: form.length, winRate: winRate(wins, losses) };
}

function formatPublicSetSentence(favorite: PlayerProfile, opponent: PlayerProfile) {
  const labels = ["Set 1 Win", "Set 2 Win", "Set 3 Win"];
  const favoriteRows = labels.map((label) => publicCurrentRow(favorite, label));
  const opponentRows = labels.map((label) => publicCurrentRow(opponent, label));
  if (favoriteRows.some((row) => !row) || opponentRows.some((row) => !row)) return "";

  const favoriteRates = favoriteRows.map((row) => row?.percent ?? 0);
  const opponentRates = opponentRows.map((row) => row?.percent ?? 0);
  const favoriteHigherEverywhere = favoriteRates.every((rate, index) => rate > opponentRates[index]);
  const strongestIndex = favoriteRates.indexOf(Math.max(...favoriteRates));
  const opponentWeakestIndex = opponentRates.indexOf(Math.min(...opponentRates));
  const setList = (rates: number[]) => rates.map((rate) => `${rate}%`).join(" / ");

  if (favoriteHigherEverywhere) {
    return `${favorite.player.name} has the higher current-year set win rate in set 1, set 2, and set 3: ${setList(favoriteRates)} compared to ${opponent.player.name} at ${setList(opponentRates)}.`;
  }

  return `${favorite.player.name}'s best current-year set is set ${strongestIndex + 1} at ${favoriteRates[strongestIndex]}%. ${opponent.player.name}'s lowest current-year split is set ${opponentWeakestIndex + 1} at ${opponentRates[opponentWeakestIndex]}%.`;
}

function formatHandednessRead(favorite: PlayerProfile, opponent: PlayerProfile) {
  const favoriteHand = publicBioProfile(favorite).hand;
  const opponentHand = publicBioProfile(opponent).hand;
  if (!favoriteHand && !opponentHand) return "";
  if (favoriteHand && opponentHand) {
    return `${favorite.player.name} is ${favoriteHand}; ${opponent.player.name} is ${opponentHand}.`;
  }
  const profile = favoriteHand ? favorite : opponent;
  return `${profile.player.name} is ${publicBioProfile(profile).hand}.`;
}

function formatAgeRead(favorite: PlayerProfile, opponent: PlayerProfile) {
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

function daysSinceLatestMatch(profile: PlayerProfile) {
  const latest = profile.recentMatches[0]?.date;
  if (!latest) return 0;
  const latestDate = new Date(`${latest}T12:00:00Z`);
  if (Number.isNaN(latestDate.getTime())) return 0;
  return Math.max(0, Math.round((Date.now() - latestDate.getTime()) / (24 * 60 * 60 * 1000)));
}

function formatInactivityRead(favorite: PlayerProfile, opponent: PlayerProfile) {
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

function scoreProfile(profile: PlayerProfile, opponent: PlayerProfile) {
  return (
    profile.recent.winRate - opponent.recent.winRate +
    (profile.season.winRate - opponent.season.winRate) * 0.8 +
    (profile.decidingSet.winRate - opponent.decidingSet.winRate) * 0.65 +
    (surfaceWinRate(profile.bestSurfaceRecord) - surfaceWinRate(opponent.bestSurfaceRecord)) * 0.3 +
    (profile.currentStreak.result === "W" ? profile.currentStreak.count * 2 : -profile.currentStreak.count * 2)
  );
}

function buildAnalysis(first: Player, second: Player, headToHead: HeadToHead | null): Analysis {
  const firstProfile = buildPlayerProfile(first);
  const secondProfile = buildPlayerProfile(second);
  const firstScore = scoreProfile(firstProfile, secondProfile);
  const secondScore = scoreProfile(secondProfile, firstProfile);
  const favorite = firstScore >= secondScore ? firstProfile : secondProfile;
  const opponent = favorite === firstProfile ? secondProfile : firstProfile;
  const confidenceGap = Math.round(Math.abs(firstScore - secondScore));
  const setThreeGap = percentagePointGap(favorite.decidingSet.winRate, opponent.decidingSet.winRate);
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
    generatedBy: "OpenAI-ready local analysis",
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

function formatRecentRead(favorite: PlayerProfile, opponent: PlayerProfile) {
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

function formatDecidingSetRead(favorite: PlayerProfile, opponent: PlayerProfile) {
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

function formatMatchLogScope(profile: PlayerProfile) {
  const total = profile.player.apiStats?.totalMatches || profile.totalMatches;
  const loaded = profile.player.apiStats?.matchLogCount || profile.player.matches.length;
  return loaded >= total ? "career" : `loaded ${loaded}-match`;
}

function formatSetOneCloseoutRead(favorite: PlayerProfile, opponent: PlayerProfile) {
  if (!favorite.setOneCloseout.chances) {
    return "";
  }
  const favoriteLine = `When ${favorite.player.name} wins set 1, they win the match ${favorite.setOneCloseout.matchWinRate}% of the time and close 2-0 ${favorite.setOneCloseout.straightSetWinRate}% of the time.`;
  if (opponent.setOneCloseout.chances) {
    return `${favoriteLine} ${opponent.player.name}'s set-1 closeout rate is ${opponent.setOneCloseout.matchWinRate}% with a ${opponent.setOneCloseout.straightSetWinRate}% 2-0 close rate.`;
  }
  return favoriteLine;
}

function formatTieBreakRead(favorite: PlayerProfile, opponent: PlayerProfile) {
  if (favorite.tieBreaks.wins + favorite.tieBreaks.losses === 0 && opponent.tieBreaks.wins + opponent.tieBreaks.losses === 0) {
    return "";
  }
  return `If for whatever reason this gets to a tiebreak, ${favorite.player.name} is ${formatRecord(favorite.tieBreaks.wins, favorite.tieBreaks.losses)} (${favorite.tieBreaks.winRate}%) compared to ${opponent.player.name} at ${formatRecord(opponent.tieBreaks.wins, opponent.tieBreaks.losses)} (${opponent.tieBreaks.winRate}%).`;
}

function formatPressurePoint(favorite: PlayerProfile, opponent: PlayerProfile) {
  const setLabels = ["Set 1 Win", "Set 2 Win", "Set 3 Win"];
  const opponentPublicSets = setLabels
    .map((label, index) => ({ label, setNumber: index + 1, row: publicCurrentRow(opponent, label) }))
    .filter((item) => item.row?.percent !== null && item.row?.percent !== undefined);
  const weakestPublic = [...opponentPublicSets].sort((a, b) => (a.row?.percent ?? 0) - (b.row?.percent ?? 0))[0];
  if (weakestPublic && (weakestPublic.row?.percent ?? 100) <= 45) {
    return `${opponent.player.name}'s lowest current-year split is set ${weakestPublic.setNumber} at ${weakestPublic.row?.percent}%. That is the pressure point.`;
  }
  if (opponent.weakestSet.winRate <= 45) {
    return `${opponent.player.name}'s weakest loaded split is set ${opponent.weakestSet.setNumber} at ${opponent.weakestSet.winRate}%, so that is the pressure point.`;
  }
  if (favorite.strongestSet.winRate - opponent.weakestSet.winRate >= 12) {
    return `${favorite.player.name}'s strongest split is set ${favorite.strongestSet.setNumber} at ${favorite.strongestSet.winRate}%, while ${opponent.player.name}'s lowest is set ${opponent.weakestSet.setNumber} at ${opponent.weakestSet.winRate}%.`;
  }
  return "There is no massive weak-set flag on the other side, so the edge needs to come from form, price, and closeout profile.";
}

function formatSurfaceCollapseRead(profile: PlayerProfile, surface = "Hard") {
  const row = publicCareerSurface(profile, surface);
  if (!row || row.total < 10 || row.percent > 20) {
    return "";
  }
  return `${profile.player.name} is ${formatRecord(row.wins, row.losses)} career on ${surface.toLowerCase()} (${row.percent}%) across ${row.total} matches. That is not noise anymore.`;
}

function formatConditionalPlayRead(favorite: PlayerProfile, opponent: PlayerProfile) {
  const favoriteAtLeastOne = publicCurrentRow(favorite, "Won At Least 1 Set");
  const opponentSetThree = publicCurrentRow(opponent, "Set 3 Win");
  const opponentMatchWins = publicCurrentRow(opponent, "Match Wins");
  const opponentBehind = publicCurrentRow(opponent, "Wins From Behind");
  const straightSetMerchant = formatStraightSetMerchantRead(favorite, opponent);
  if ((favoriteAtLeastOne?.percent ?? 0) >= 70 && opponentSetThree?.percent === 0) {
    return `This reads better as a timing spot than a blind chase: ${favorite.player.name} has taken at least one set in ${favoriteAtLeastOne?.percent}% of matches this year, while ${opponent.player.name} is 0% in current-year set 3. Set 1 only if ${favorite.player.name} shows the first break/momentum; set 3 is where the profile gets loud.`;
  }
  if (straightSetMerchant) {
    return `${straightSetMerchant} If ${favorite.player.name} starts set 1 strong, that is the live trigger. If it gets to set 3, the matchup gets way louder.`;
  }
  if ((opponentMatchWins?.percent ?? 100) <= 25 && opponentBehind?.percent === 0 && (favoriteAtLeastOne?.percent ?? 0) >= 65) {
    return `${opponent.player.name} is only ${opponentMatchWins?.percent}% in current-year match wins and 0% winning from behind, while ${favorite.player.name} takes a set ${favoriteAtLeastOne?.percent}% of the time. Do not force the pre-match price; wait for the match state to confirm it.`;
  }
  return "";
}

function formatLatestThreeSetFatigueRead(profile: PlayerProfile) {
  const latest = profile.recentMatches[0];
  if (!latest) {
    return "";
  }
  const sets = parseScoreSets(latest.score);
  if (sets.length < 3) {
    return "";
  }
  return `${profile.player.name}'s latest loaded match was a three-setter on ${latest.date} (${latest.score}). That is a real fatigue/recovery note if this match is on a short turnaround.`;
}

function formatEliteSetSpecificRead(profile: PlayerProfile) {
  const eliteRows = ["Set 1 Win", "Set 2 Win", "Set 3 Win"]
    .map((label, index) => ({ label, setNumber: index + 1, row: publicCurrentRow(profile, label) }))
    .filter((item) => item.row?.percent !== null && (item.row?.percent ?? 0) >= 70 && (item.row?.percentile ?? 0) >= 95)
    .sort((a, b) => (b.row?.percentile ?? 0) - (a.row?.percentile ?? 0) || (b.row?.percent ?? 0) - (a.row?.percent ?? 0));
  const elite = eliteRows[0];
  if (!elite) {
    return "";
  }
  return `${profile.player.name}'s set ${elite.setNumber} is the standout split: ${elite.row?.percent}% this year, percentile ${elite.row?.percentile}.`;
}

function formatStraightSetMerchantRead(favorite: PlayerProfile, opponent: PlayerProfile) {
  const favoriteSetThree = publicCurrentRow(favorite, "Set 3 Win");
  const opponentSetThree = publicCurrentRow(opponent, "Set 3 Win");
  const opponentStraightSets = publicCurrentRow(opponent, "Wins in Straight Sets");
  if (!favoriteSetThree || !opponentSetThree || !opponentStraightSets) {
    return "";
  }
  const gap = (favoriteSetThree.percent ?? 0) - (opponentSetThree.percent ?? 0);
  if ((opponentStraightSets.percent ?? 0) >= 50 && opponentStraightSets.percentile >= 90 && (opponentSetThree.percent ?? 100) <= 25 && gap >= 35) {
    return `${opponent.player.name} has been excellent when it is clean: ${opponentStraightSets.percent}% straight-set wins, percentile ${opponentStraightSets.percentile}. But if the match gets messy, ${favorite.player.name} is ${favoriteSetThree.percent}% in current-year set 3s compared to ${opponent.player.name} at ${opponentSetThree.percent}%.`;
  }
  return "";
}

function buildGlaringStats(favorite: PlayerProfile, opponent: PlayerProfile) {
  const stats: string[] = [];
  const straightSets = publicCurrentRow(favorite, "Wins in Straight Sets");
  const careerStraightSets = publicCareerRow(favorite, "Wins in Straight Sets");
  const favoriteStraightSets = publicCurrentRow(favorite, "Wins in Straight Sets");
  const opponentAtLeastOneSet = publicCurrentRow(opponent, "Won At Least 1 Set");
  if ((favoriteStraightSets?.percent ?? 100) <= 35 && (opponentAtLeastOneSet?.percent ?? 0) >= 65) {
    stats.push(`${favorite.player.name} is not a clean 2-0 profile: ${favoriteStraightSets?.percent}% current-year straight-set wins while ${opponent.player.name} takes at least one set ${opponentAtLeastOneSet?.percent}% of the time.`);
  }
  const opponentCareerWins = publicCareerRow(opponent, "Match Wins");
  const opponentCareerSetThree = publicCareerRow(opponent, "Set 3 Win");
  const opponentCurrentSetThree = publicCurrentRow(opponent, "Set 3 Win");
  const opponentBehind = publicCurrentRow(opponent, "Wins From Behind");
  const opponentSurfaceCollapse = formatSurfaceCollapseRead(opponent, "Hard");
  const straightSetMerchant = formatStraightSetMerchantRead(favorite, opponent);
  const eliteSet = formatEliteSetSpecificRead(favorite);
  if (opponentCareerWins?.percent !== null && (opponentCareerWins?.percent ?? 100) <= 15) {
    stats.push(`${opponent.player.name} has a ${opponentCareerWins?.percent}% career match win rate${opponentCareerWins?.number ? ` (${opponentCareerWins.number})` : ""}. That is the whole warning label.`);
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
    stats.push(`${opponent.player.name} has a 0% career set-3 win rate${opponentCareerSetThree?.number ? ` (${opponentCareerSetThree.number})` : ""}.`);
  }
  if (opponentBehind?.percent === 0) {
    stats.push(`${opponent.player.name} is 0% current-year winning from behind. Losing set 1 is basically the danger zone.`);
  }
  if (straightSetMerchant) {
    stats.push(straightSetMerchant);
  }
  const weakRows = ["Match Wins", "Match Wins (3 Sets)", "Wins in Straight Sets", "Wins From Behind", "Won At Least 1 Set", "Set 1 Win", "Set 2 Win", "Set 3 Win"]
    .map((label) => ({ label, row: publicCurrentRow(opponent, label) }))
    .filter((item) => (item.row?.percentile ?? 100) > 0 && (item.row?.percentile ?? 100) <= 35 && item.row?.percent !== null && (item.row?.percent ?? 100) <= 45);
  if (weakRows.length >= 5) {
    stats.push(`${opponent.player.name} is bottom-tier across ${weakRows.length} current-year categories: ${weakRows.slice(0, 3).map((item) => `${item.label} ${item.row?.percent}%`).join(", ")}.`);
  }
  for (const label of ["Match Wins", "Wins in Straight Sets", "Wins From Behind", "Won At Least 1 Set", "Set 1 Win", "Set 2 Win", "Set 3 Win"]) {
    const row = publicCurrentRow(opponent, label);
    if ((row?.percentile ?? 100) > 0 && (row?.percentile ?? 100) <= 35 && (row?.percent ?? 100) <= 45) {
      stats.push(`${opponent.player.name} is bottom ${row?.percentile}% current-year in ${label.toLowerCase()} at ${row?.percent}%.`);
      break;
    }
  }
  const favoritePublicProfile = publicBioProfile(favorite);
  if (favoritePublicProfile.serveSpeed && (favoritePublicProfile.serveSpeedPercentile ?? 0) >= 99) {
    stats.push(`${favorite.player.name}'s 2026 serve speed is ${favoritePublicProfile.serveSpeed}, percentile ${favoritePublicProfile.serveSpeedPercentile}.`);
  }
  if ((straightSets?.percent ?? 0) >= 45 && straightSets?.percentile && straightSets.percentile >= 90) {
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
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);
  const [chatMessages, setChatMessages] = React.useState<ChatMessage[]>([]);
  const [isChatting, setIsChatting] = React.useState(false);

  React.useEffect(() => {
    tennisApi.getStatus().then(setStatus).catch(() => setError("Could not load app status."));
    tennisApi.getPlayers().then((nextPlayers) => setAvailablePlayers(nextPlayers)).catch(() => setError("Could not load players."));
  }, []);

  const loadComparison = React.useCallback(() => {
    if (!availablePlayers.length) return;
    setIsLoading(true);
    setIsAnalyzing(false);
    setError(null);
    setAnalysis(null);
    tennisApi
      .compare(playerAId, playerBId, availablePlayers)
      .then((nextComparison) => {
        setComparison(nextComparison);
        setIsLoading(false);
        setIsAnalyzing(true);
        return tennisApi.analyze(nextComparison.first, nextComparison.second, nextComparison.headToHead);
      })
      .then((nextAnalysis) => {
        setAnalysis(nextAnalysis);
        setChatMessages([{ role: "assistant", content: formatInitialChatAnalysis(nextAnalysis) }]);
        setIsAnalyzing(false);
      })
      .catch(() => {
        setIsLoading(false);
        setIsAnalyzing(false);
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
      setError(`Could not fetch ${result.name} from the available tennis data sources.`);
    } finally {
      setIsFetchingPlayer(false);
    }
  }, [availablePlayers]);

  return (
    <main className="scorecard-shell">
      <section className="match-controls" aria-label="Player comparison controls">
        <PlayerSearch label="Left player" value={playerAId} onSelect={(result) => selectPlayer(result, "a")} players={availablePlayers} blockedId={playerBId} />
        <button
          className="swap-button"
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
        <PlayerSearch label="Right player" value={playerBId} onSelect={(result) => selectPlayer(result, "b")} players={availablePlayers} blockedId={playerAId} />
      </section>

      {error && <ErrorBanner message={error} onRetry={loadComparison} />}

      {comparison && (
        <div className={isLoading ? "match-board is-loading" : "match-board"}>
          <section className="player-lanes" aria-label="Recent form">
            <PlayerLane player={comparison.first} side="left" />
            <div className="versus-tile">
              <span>H2H</span>
              <strong>{comparison.headToHead ? `${comparison.headToHead.winsA}-${comparison.headToHead.winsB}` : "0-0"}</strong>
              <small>{new Date().getFullYear()} matchup</small>
            </div>
            <PlayerLane player={comparison.second} side="right" />
          </section>

          <section className="info-row" aria-label="Player details">
            <PlayerDetails player={comparison.first} />
            <ProviderBadge status={status} isBusy={isFetchingPlayer || isAnalyzing} onRefresh={loadComparison} />
            <PlayerDetails player={comparison.second} align="right" />
          </section>

          <section className="record-row" aria-label="Season records">
            <YearRecord player={comparison.first} />
            <YearSelector />
            <YearRecord player={comparison.second} />
          </section>

          <section className="surface-scoreboard" aria-label="Surface records">
            {(["Hard", "Clay", "Grass"] as Surface[]).map((surface) => (
              <SurfaceScoreRow key={surface} first={comparison.first} second={comparison.second} surface={surface} />
            ))}
          </section>

          <AiChatPanel
            analysis={analysis}
            comparison={comparison}
            messages={chatMessages}
            isLoading={isAnalyzing}
            isChatting={isChatting}
            onAsk={async (question) => {
              if (!comparison || !question.trim()) return;
              const userMessage: ChatMessage = { role: "user", content: question.trim() };
              const nextMessages = [...chatMessages, userMessage];
              setChatMessages(nextMessages);
              setIsChatting(true);
              try {
                const response = await tennisApi.chat({ ...comparison, analysis, messages: nextMessages, question: question.trim() });
                setChatMessages((current) => [...current, { role: "assistant", content: response.reply }]);
              } catch {
                setChatMessages((current) => [...current, { role: "assistant", content: "I could not reach the AI chat endpoint. The matchup card above is still live." }]);
              } finally {
                setIsChatting(false);
              }
            }}
          />
        </div>
      )}
    </main>
  );
}

function formatInitialChatAnalysis(analysis: Analysis) {
  return `${analysis.headline}\n\nPick: ${analysis.pick} (${analysis.conviction})\n\n${analysis.narrative}`;
}

function PlayerLane({ player, side }: { player: Player; side: "left" | "right" }) {
  const recent = latestMatches(player, 10);
  return (
    <article className={`player-lane ${side}`}>
      <div className="name-plate">
        <span>{player.tour === "W" ? "WTA" : "ATP"}</span>
        <strong>{shortName(player.name)}</strong>
      </div>
      <div className="form-dots" aria-label={`${player.name} recent results`}>
        {recent.map((match) => (
          <span className={match.result === "W" ? "form-dot win" : "form-dot loss"} key={`${player.id}-${match.date}-${match.opponent}`} title={`${match.result} vs ${match.opponent}`}>
            {match.result}
          </span>
        ))}
        <b aria-hidden="true">»»</b>
      </div>
      <div className="lane-facts">
        <span>Age {player.age || "?"}</span>
        <span>{player.country || "UNK"}</span>
        <span>{player.ranking ? `#${player.ranking}` : "Unranked"}</span>
      </div>
    </article>
  );
}

function YearRecord({ player }: { player: Player }) {
  const record = matchRecord(currentYearMatches(player));
  const wins = record.wins || player.seasonRecord.wins;
  const losses = record.losses || player.seasonRecord.losses;
  const rate = winRate(wins, losses);
  return (
    <article className="year-record">
      <strong>
        {wins} - {losses}
      </strong>
      <div className="pie" style={{ "--win": `${rate}%` } as React.CSSProperties}>
        <span>Win</span>
        <b>{rate}%</b>
        <small>Loss</small>
      </div>
    </article>
  );
}

function YearSelector() {
  const year = new Date().getFullYear();
  return (
    <div className="year-stack" aria-label="Selected season">
      <strong>{year}</strong>
      <span>{year - 1}</span>
      <span>{year - 2}</span>
    </div>
  );
}

function SurfaceScoreRow({ first, second, surface }: { first: Player; second: Player; surface: Surface }) {
  const firstRecord = surfaceRecordFor(first, surface);
  const secondRecord = surfaceRecordFor(second, surface);
  return (
    <div className={`surface-score ${surface.toLowerCase()}`}>
      <strong className={surfaceRecordClass(firstRecord)}>{formatRecord(firstRecord.wins, firstRecord.losses)}</strong>
      <span>{surface}</span>
      <strong className={surfaceRecordClass(secondRecord)}>{formatRecord(secondRecord.wins, secondRecord.losses)}</strong>
    </div>
  );
}

function PlayerDetails({ player, align = "left" }: { player: Player; align?: "left" | "right" }) {
  const recent = matchRecord(latestMatches(player, 10));
  const best = bestSurface(player);
  const publicProfile = player.apiStats?.publicStats?.profile;
  return (
    <article className={`detail-card ${align === "right" ? "align-right" : ""}`}>
      <h2>{player.name}</h2>
      <div>
        <span>Age</span>
        <strong>{player.age || publicProfile?.age || "Unknown"}</strong>
      </div>
      <div>
        <span>Recent form</span>
        <strong>{formatRecord(recent.wins, recent.losses)}</strong>
      </div>
      <div>
        <span>Best surface</span>
        <strong>
          {best.surface} {surfaceWinRate(best)}%
        </strong>
      </div>
      {publicProfile?.hand && (
        <div>
          <span>Forehand</span>
          <strong>{publicProfile.hand}</strong>
        </div>
      )}
    </article>
  );
}

function ProviderBadge({ status, isBusy, onRefresh }: { status: AppStatus | null; isBusy: boolean; onRefresh: () => void }) {
  const rapid = status?.providers.find((provider) => provider.name === "Rapid Tennis API");
  const openai = status?.providers.find((provider) => provider.name === "OpenAI");
  return (
    <aside className="provider-badge">
      <button className="refresh-button" type="button" onClick={onRefresh} disabled={isBusy}>
        <RefreshCw size={15} />
        Refresh
      </button>
      <span className={rapid?.status === "ready" ? "ready" : "muted"}>Rapid {rapid?.status || "checking"}</span>
      <span className={openai?.status === "ready" ? "ready" : "muted"}>OpenAI {openai?.status || "checking"}</span>
    </aside>
  );
}

function AiChatPanel({
  analysis,
  comparison,
  messages,
  isLoading,
  isChatting,
  onAsk,
}: {
  analysis: Analysis | null;
  comparison: { first: Player; second: Player; headToHead: HeadToHead | null; upcomingMatch: UpcomingMatch | null };
  messages: ChatMessage[];
  isLoading: boolean;
  isChatting: boolean;
  onAsk: (question: string) => Promise<void>;
}) {
  const [draft, setDraft] = React.useState("");
  const disabled = isLoading || isChatting || !draft.trim();
  return (
    <section className="ai-chat" aria-label="AI matchup chat">
      <div className="chat-heading">
        <div>
          <span>AI read</span>
          <strong>{comparison.first.name} vs {comparison.second.name}</strong>
        </div>
        <Bot size={20} />
      </div>
      <div className="chat-log">
        {isLoading && <div className="chat-message assistant">Building the matchup read...</div>}
        {!isLoading && messages.length === 0 && <div className="chat-message assistant">Analysis will appear here once both profiles load.</div>}
        {messages.map((message, index) => (
          <div className={`chat-message ${message.role}`} key={`${message.role}-${index}`}>
            {message.content}
          </div>
        ))}
        {isChatting && <div className="chat-message assistant">Thinking...</div>}
      </div>
      <form
        className="chat-form"
        onSubmit={(event) => {
          event.preventDefault();
          const question = draft.trim();
          if (!question) return;
          setDraft("");
          void onAsk(question);
        }}
      >
        <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={analysis ? "Ask about timing, surface, risk, or a live angle" : "Waiting for analysis"} />
        <button type="submit" disabled={disabled} aria-label="Send chat question">
          <Send size={18} />
        </button>
      </form>
    </section>
  );
}

function surfaceRecordFor(player: Player, surface: Surface) {
  return player.careerSurfaces.find((record) => record.surface === surface) || { surface, wins: 0, losses: 0 };
}

function surfaceRecordClass(record: SurfaceRecord) {
  const rate = surfaceWinRate(record);
  if (rate >= 58) return "positive";
  if (rate <= 45) return "negative";
  return "neutral";
}

function shortName(name: string) {
  const parts = name.trim().split(/\s+/);
  return parts.at(-1) || name;
}

function DeepLookupPanel({ isFetchingPlayer }: { isFetchingPlayer: boolean }) {
  return (
    <section className="panel lookup-panel" aria-live="polite">
      <div className="lookup-spinner" aria-hidden="true">
        <LoaderCircle size={18} />
      </div>
      <div>
        <strong>{isFetchingPlayer ? "Fetching player profile" : "Building matchup read"}</strong>
        <span>{isFetchingPlayer ? "Pulling Rapid stats and match logs." : "Checking set splits, recent form, public context, and pressure stats."}</span>
      </div>
    </section>
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
                <strong>{isSearching ? (hasBackend() ? "Searching tennis sources" : "Checking sample roster") : "No player found"}</strong>
                <small>{hasBackend() ? "Try the full player name." : "Local dev is in sample mode. Run the Node server or set VITE_API_BASE_URL to search live tennis sources."}</small>
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
      <div className="pick-strip">
        <span>{analysis.conviction}</span>
        <strong>{analysis.pick}</strong>
      </div>
      <p className="analysis-narrative">{analysis.narrative}</p>
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
        <InsightList title="Red flags" items={analysis.redFlags} />
        <InsightList title="Watch" items={analysis.focus} />
      </div>
      <InsightList title="Risk check" items={analysis.risks} />
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

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);


