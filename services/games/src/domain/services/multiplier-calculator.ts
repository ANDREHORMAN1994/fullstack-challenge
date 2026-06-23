export const calculateCurrentMultiplierBps = (runningStartedAt: Date, now = new Date()): number => {
  const elapsedMs = Math.max(0, now.getTime() - runningStartedAt.getTime());

  return 100 + Math.floor(elapsedMs / 100);
};
