import { logger } from "./logger";

// Final scores come from ESPN's public scoreboard. It needs no API key, has every
// past match day, and doesn't use Odds API credits (those are kept for odds).
const ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports/soccer";
const DAY_MS = 24 * 60 * 60 * 1000;

type EspnGame = {
  id: string;
  status: string;
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

// Our competition names (set in apiFootball.ts) -> ESPN league slugs.
const ESPN_LEAGUES: Record<string, string> = {
  "Premier League": "eng.1",
  "Champions League": "uefa.champions",
};

export function espnLeagueFor(competition: string | null | undefined): string {
  if (competition && ESPN_LEAGUES[competition]) return ESPN_LEAGUES[competition];
  return /world cup/i.test(competition ?? "") ? "fifa.world" : "eng.1";
}

// The Odds API and ESPN spell some clubs differently ("Inter Milan" vs "Internazionale",
// "Brighton and Hove Albion" vs "Brighton & Hove Albion"), so compare normalized names.
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
  // Champions League (Odds API spelling -> ESPN spelling)
  inter: "internazionale",
  intermilan: "internazionale",
  sportinglisbon: "sportingcp",
  slaviapraha: "slaviaprague",
  lask: "lasklinz",
  rclens: "lens",
  skslovanbratislava: "slovanbratislava",
  psg: "parissaintgermain",
  atleticodemadrid: "atleticomadrid",
  bayernmunchen: "bayernmunich",
  olympiakos: "olympiacos",
  sportingbraga: "braga",
  scbraga: "braga",
};

// Letters that don't split into a base letter + accent, so accent stripping misses them.
const FOLDS: Record<string, string> = { "ø": "o", "æ": "ae", "œ": "oe", "ß": "ss", "ł": "l", "đ": "d", "ı": "i" };

export function normalizeTeam(name: string): string {
  const key = name
    .toLowerCase()
    .replace(/[øæœßłđı]/g, (ch) => FOLDS[ch] ?? ch)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " and ")
    .replace(/\b(afc|fc)\b/g, " ")
    .replace(/[^a-z0-9]/g, "");
  return ALIASES[key] ?? key;
}

function sameTeam(a: string, b: string): boolean {
  if (a === b) return true;
  // "feyenoord" vs "feyenoordrotterdam" style leftovers; both teams must match for a hit, so this is safe.
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
        id: String(event.id),
        status: String(competition?.status?.type?.name ?? ""),
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

type Side = "home" | "away";

// Picks are Win/Draw/Win on 90 minutes, like bookmakers' odds. When a game went to extra
// time or penalties, the scoreboard shows the later score, so work out the 90-minute score
// from the match summary. Two-legged ties can go to extra time from any 90-minute score
// (e.g. 3-0), so it can't be assumed to be a draw.
async function fetchNinetyMinuteScore(slug: string, eventId: string): Promise<{ home: number; away: number } | null> {
  const url = `${ESPN_BASE}/${slug}/summary?event=${eventId}`;
  let data: any;
  try {
    const res = await fetch(url, { headers: { accept: "application/json" } });
    if (!res.ok) {
      logger.warn({ status: res.status, slug, eventId }, "ESPN summary request failed");
      return null;
    }
    data = await res.json();
  } catch (err) {
    logger.warn({ err, slug, eventId }, "ESPN summary request errored");
    return null;
  }

  const competitors: any[] = data?.header?.competitions?.[0]?.competitors ?? [];
  const sideOf = (s: Side) => competitors.find((c) => c.homeAway === s);
  const finals = { home: Number(sideOf("home")?.score), away: Number(sideOf("away")?.score) };
  if (!Number.isFinite(finals.home) || !Number.isFinite(finals.away)) return null;
  const teamIds = { home: String(sideOf("home")?.team?.id ?? sideOf("home")?.id ?? ""), away: String(sideOf("away")?.team?.id ?? sideOf("away")?.id ?? "") };

  // 1. Goal timeline: count goals in periods 1-2 (normal time) and 3-4 (extra time), ignoring
  //    the shootout. Trust it only if it adds up to the final score; own goals may be listed
  //    under either team, so try both readings.
  const goals = (data?.keyEvents ?? []).filter((k: any) => {
    const period = Number(k?.period?.number);
    return k?.scoringPlay && !k?.shootout && period >= 1 && period <= 4;
  });
  for (const flipOwnGoals of [false, true]) {
    const tally = { home: [0, 0], away: [0, 0] };
    let readable = true;
    for (const goal of goals) {
      const teamId = String(goal?.team?.id ?? "");
      let side: Side | null = teamId === teamIds.home ? "home" : teamId === teamIds.away ? "away" : null;
      if (!side) {
        readable = false;
        break;
      }
      if (flipOwnGoals && /own goal/i.test(goal?.type?.text ?? "")) side = side === "home" ? "away" : "home";
      tally[side][Number(goal.period.number) <= 2 ? 0 : 1]++;
    }
    if (readable && tally.home[0] + tally.home[1] === finals.home && tally.away[0] + tally.away[1] === finals.away) {
      return { home: tally.home[0], away: tally.away[0] };
    }
  }

  // 2. Per-half scores, but only when they look clean (ESPN sometimes stores corrections
  //    as negative numbers in a later period).
  const periodsOf = (s: Side) => ((sideOf(s)?.linescores ?? []) as any[]).map((p) => Number(p?.displayValue ?? p?.value));
  const clean = (p: number[], final: number) =>
    p.length >= 2 && p.slice(0, 4).every((v) => Number.isFinite(v) && v >= 0) && p.slice(0, 4).reduce((a, b) => a + b, 0) === final;
  const home = periodsOf("home");
  const away = periodsOf("away");
  if (clean(home, finals.home) && clean(away, finals.away)) return { home: home[0] + home[1], away: away[0] + away[1] };

  logger.warn({ slug, eventId }, "Could not work out the 90-minute score; will retry next run");
  return null;
}

const WENT_PAST_90 = /AET|PEN/;

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
      // Neutral venues can list the teams the other way round.
      const swapped = direct ? undefined : games.find((g) => sameTeam(g.home, away) && sameTeam(g.away, home));
      const game = direct ?? swapped;
      if (!game) continue;

      if (!game.completed || !Number.isFinite(game.homeScore) || !Number.isFinite(game.awayScore)) return "not_finished";

      let espnHome = game.homeScore;
      let espnAway = game.awayScore;
      if (WENT_PAST_90.test(game.status)) {
        const ninety = await fetchNinetyMinuteScore(slug, game.id);
        if (!ninety) return "not_finished"; // try again on the next run
        espnHome = ninety.home;
        espnAway = ninety.away;
      }
      return direct
        ? { homeScore: espnHome, awayScore: espnAway }
        : { homeScore: espnAway, awayScore: espnHome };
    }
    return null;
  };
}
