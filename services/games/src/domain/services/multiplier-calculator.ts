export const calculateCurrentMultiplierBps = (runningStartedAt: Date, now = new Date()): number => {
  const elapsedMs = Math.max(0, now.getTime() - runningStartedAt.getTime());
  const maxMultiplierBps = Number(process.env.GAMES_MAX_CRASH_MULTIPLIER_BPS ?? 500);

  return Math.min(maxMultiplierBps, 100 + Math.floor(elapsedMs / 100));
};
