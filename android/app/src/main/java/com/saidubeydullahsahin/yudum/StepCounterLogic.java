package com.saidubeydullahsahin.yudum;

/**
 * Pure step-counter delta and day-rollover calculations shared by StepCounterPlugin.
 */
final class StepCounterLogic {

    private StepCounterLogic() {}

    static boolean isNewDay(String storedDay, String today) {
        return today != null && !today.equals(storedDay);
    }

    static long computeCounterDelta(long raw, long prevRaw) {
        if (raw < 0L || prevRaw < 0L) {
            return 0L;
        }
        long delta = raw >= prevRaw ? (raw - prevRaw) : raw;
        return Math.max(0L, delta);
    }
}
