// Badge and rank labels shared by the Global Rankings, huddle leaderboards, profiles,
// the Predict "Your Rank" box and the "How ranks work" page.

export type RankInfo = {
  name: string;
  /** Lowest win rate (whole percent) that earns this rank. */
  minWinRate: number;
  /** Fewest finished picks needed. */
  minPicks: number;
  description: string;
};

/** Finished picks needed before you leave Rookie. */
export const ROOKIE_PICKS = 10;

/** Every rank, best first. Rookie is last: it applies until you have ROOKIE_PICKS finished picks. */
export const RANKS: RankInfo[] = [
  { name: "Oracle", minWinRate: 95, minPicks: 100, description: "Sees the future. Almost never wrong." },
  { name: "GOAT", minWinRate: 85, minPicks: 60, description: "The greatest of all time." },
  { name: "Champion", minWinRate: 70, minPicks: 40, description: "Wins far more than they lose." },
  { name: "All Star", minWinRate: 60, minPicks: 25, description: "Consistently ahead of the pack." },
  { name: "Starter", minWinRate: 50, minPicks: 15, description: "Right at least half the time." },
  { name: "Coin Flipper", minWinRate: 40, minPicks: ROOKIE_PICKS, description: "Hit and miss. Could go either way." },
  { name: "Beginner's Luck", minWinRate: 30, minPicks: ROOKIE_PICKS, description: "A few good calls. Keep at it." },
  { name: "Benchwarmer", minWinRate: 0, minPicks: ROOKIE_PICKS, description: "Rough run. Every pick is a fresh chance." },
  { name: "Rookie", minWinRate: 0, minPicks: 0, description: `New here. Finish ${ROOKIE_PICKS} picks to get your first real rank.` },
];

const ROOKIE = RANKS[RANKS.length - 1];

/** What a rank needs, in words, e.g. "60%+ win rate · 10+ picks". */
export function rankRequirement(rank: RankInfo): string {
  if (rank.name === ROOKIE.name) return `Fewer than ${ROOKIE_PICKS} finished picks`;
  if (rank.minWinRate === 0) {
    // Benchwarmer: anything below the rank above it.
    const above = RANKS[RANKS.indexOf(rank) - 1];
    return `Under ${above.minWinRate}% win rate · ${rank.minPicks}+ picks`;
  }
  return `${rank.minWinRate}%+ win rate · ${rank.minPicks}+ picks`;
}

function rankFor(winRate: number, totalPicks: number): RankInfo {
  if (totalPicks < ROOKIE_PICKS) return ROOKIE;
  return RANKS.find((r) => r.name !== ROOKIE.name && winRate >= r.minWinRate && totalPicks >= r.minPicks) ?? ROOKIE;
}

// Defaults to 5 picks because pick counts don't reach the leaderboard rows yet.
export const getRank = (winRate: number, totalPicks: number = ROOKIE_PICKS) => rankFor(winRate, totalPicks).name;

/** The next rank up and what's still needed, or null at the top. Rookies get rank: null (their first rank depends on their win rate). */
export function nextRank(winRate: number, totalPicks: number): { rank: RankInfo | null; needs: string } | null {
  const current = rankFor(winRate, totalPicks);
  const index = RANKS.indexOf(current);
  if (index <= 0) return null;
  // Rookies move up by finishing picks; everyone else by climbing to the rank above.
  const target = current.name === ROOKIE.name ? null : RANKS[index - 1];
  if (!target) {
    const left = ROOKIE_PICKS - totalPicks;
    return { rank: null, needs: `Finish ${left} more pick${left === 1 ? "" : "s"} to get your first rank.` };
  }
  const parts: string[] = [];
  if (winRate < target.minWinRate) parts.push(`a ${target.minWinRate}% win rate`);
  if (totalPicks < target.minPicks) parts.push(`${target.minPicks} finished picks`);
  return { rank: target, needs: `Reach ${parts.join(" and ")}. You're at ${winRate}% over ${totalPicks} pick${totalPicks === 1 ? "" : "s"}.` };
}

export const getRankSuffix = (i: number) => {
  const j = i % 10, k = i % 100;
  if (j === 1 && k !== 11) return i + "st";
  if (j === 2 && k !== 12) return i + "nd";
  if (j === 3 && k !== 13) return i + "rd";
  return i + "th";
};

// Win rate = picks won / picks settled (won or lost), as a whole percent.
// Same rounding as the database's users.win_rate. Pending picks don't count.
export const winRateOf = (won: number, settled: number) => (settled > 0 ? Math.round((won * 100) / settled) : 0);
