import { logger } from "./logger";

// Final scores come from ESPN's public scoreboard. It needs no API key, has every
// past match day, and doesn't use Odds API credits (those are kept for odds).
const ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports/soccer";
const DAY_MS = 24 * 60 * 60 * 1000;

type EspnGame = {
  home: string;
  away: string;
  homeScore: number;
  awayScore: number;
  completed: boolean;
};

export type FixtureLike = {
  competition: string | null;
  homeTeam: string;
  awayTeam: string;
  startTime: Date;
};

export type FinalScore = { homeScore: number; awayScore: number };

// "not_finished": ESPN has the match but it isn't over (or was postponed).
// null: ESPN has no matching match on or around that date.
export type LookupResult = FinalScore | "not_finished" | null;

export function espnLeagueFor(competition: string | null | undefined): string {
  return /world cup/i.test(competition ?? "") ? "fifa.world" : "eng.1";
}

// Different feeds spell clubs differently ("AFC Bournemouth" vs "Bournemouth",
// "Brighton & Hove Albion" vs "Brighton and Hove Albion"), so compare normalized names.
const ALIASES: Record<string, string> = {
  mancity: "manchestercity",
  manutd: "manchesterunited",
  manunited: "manchesterunited",
  spurs: "tottenhamhotspur",
  tottenham: "tottenhamhotspur",
  wolves: "wolverhamptonwanderers",
  nottmforest: "nottinghamforest",
  brighton: "brightonandhovealbion",
  newcastle: "newcastleunited",
  westham: "westhamunited",
  leeds: "leedsunited",
  ipswich: "ipswichtown",
  leicester: "leicestercity",
  sheffieldutd: "sheffieldunited",
  usa: "unitedstates",
  korearepublic: "southkorea",
};

export function normalizeTeam(name: string): string {
  const key = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\b(afc|fc)\b/g, " ")
    .replace(/[^a-z0-9]/g, "");
  return ALIASES[key] ?? key;
}

function sameTeam(a: string, b: string): boolean {
  if (a === b) return true;
  // "ipswichtown" vs "ipswich" style leftovers; both sides must match for a hit, so this is safe.
  return Math.min(a.length, b.length) >= 5 && (a.startsWith(b) || b.startsWith(a));
}

function espnDate(date: Date): string {
  return date.toISOString().slice(0, 10).replace(/-/g, "");
}

async function fetchEspnDay(slug: string, day: string): Promise<EspnGame[] | null> {
  const url = `${ESPN_BASE}/${slug}/scoreboard?dates=${day}`;
  try {
    const res = await fetch(url, { headers: { accept: "application/json" } });
    if (!res.ok) {
      logger.warn({ status: res.status, slug, day }, "ESPN scoreboard request failed");
      return null;
    }
    const data: any = await res.json();
    const games: EspnGame[] = [];
    for (const event of data?.events ?? []) {
      const competition = event?.competitions?.[0];
      const home = competition?.competitors?.find((c: any) => c.homeAway === "home");
      const away = competition?.competitors?.find((c: any) => c.homeAway === "away");
      if (!home || !away) continue;
      games.push({
        home: normalizeTeam(home.team?.displayName ?? ""),
        away: normalizeTeam(away.team?.displayName ?? ""),
        homeScore: Number(home.score),
        awayScore: Number(away.score),
        completed: competition?.status?.type?.completed === true,
      });
    }
    return games;
  } catch (err) {
    logger.warn({ err, slug, day }, "ESPN scoreboard request errored");
    return null;
  }
}

// One finder per settlement run, so each match day is fetched at most once.
export function createResultFinder() {
  const days = new Map<string, Promise<EspnGame[] | null>>();
  const gamesOn = (slug: string, day: string) => {
    const key = `${slug}:${day}`;
    if (!days.has(key)) days.set(key, fetchEspnDay(slug, day));
    return days.get(key)!;
  };

  return async function findResult(fixture: FixtureLike): Promise<LookupResult> {
    const slug = espnLeagueFor(fixture.competition);
    const home = normalizeTeam(fixture.homeTeam);
    const away = normalizeTeam(fixture.awayTeam);

    // The listed date can be a day off (time zones, late kick-offs), so check either side too.
    for (const offset of [0, -1, 1]) {
      const games = await gamesOn(slug, espnDate(new Date(fixture.startTime.getTime() + offset * DAY_MS)));
      if (!games) continue;

      const direct = games.find((g) => sameTeam(g.home, home) && sameTeam(g.away, away));
      // Neutral venues (World Cup) can list the teams the other way round.
      const swapped = direct ? undefined : games.find((g) => sameTeam(g.home, away) && sameTeam(g.away, home));
      const game = direct ?? swapped;
      if (!game) continue;

      if (!game.completed || !Number.isFinite(game.homeScore) || !Number.isFinite(game.awayScore)) return "not_finished";
      return direct
        ? { homeScore: game.homeScore, awayScore: game.awayScore }
        : { homeScore: game.awayScore, awayScore: game.homeScore };
    }
    return null;
  };
}
