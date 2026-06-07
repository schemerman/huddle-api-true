export function performanceTitle(winRate: number): string {
  if (winRate < 30) return "Benchwarmer";
  if (winRate <= 65) return "Coin Flipper";
  return "The Oracle";
}
