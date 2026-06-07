export const STARTING_BANKROLL = 10000;
export const SOLVENT_THRESHOLD = 500;
export const DAILY_AMOUNT = 100;
export const BAILOUT_AMOUNT = 100;
export const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Recompute the bankruptcy flag from a new balance, mirroring the client rules:
 * a balance at or below zero is bankrupt; rising back above the solvent
 * threshold clears it; in between, the prior state is preserved.
 */
export function nextBankrupt(currentBankrupt: boolean, newPoints: number): boolean {
  if (newPoints <= 0) return true;
  if (newPoints > SOLVENT_THRESHOLD) return false;
  return currentBankrupt;
}
