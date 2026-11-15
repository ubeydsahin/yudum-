package com.saidubeydullahsahin.yudum;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

/**
 * Unit tests for StepCounterLogic delta and day-rollover helpers.
 */
public class StepCounterPluginTest {

    @Test
    public void computeCounterDelta_firstCalibrationReturnsZero() {
        assertEquals(0L, StepCounterLogic.computeCounterDelta(4200L, -1L));
    }

    @Test
    public void computeCounterDelta_normalIncrementComputesDifference() {
        assertEquals(250L, StepCounterLogic.computeCounterDelta(1250L, 1000L));
        assertEquals(0L, StepCounterLogic.computeCounterDelta(1250L, 1250L));
    }

    @Test
    public void computeCounterDelta_rebootResetUsesNewCounterValue() {
        assertEquals(42L, StepCounterLogic.computeCounterDelta(42L, 5000L));
    }

    @Test
    public void computeCounterDelta_negativeReadingReturnsZero() {
        assertEquals(0L, StepCounterLogic.computeCounterDelta(-5L, 100L));
    }

    @Test
    public void isNewDay_detectsRolloverAccurately() {
        assertTrue(StepCounterLogic.isNewDay("", "2026-11-15"));
        assertTrue(StepCounterLogic.isNewDay("2026-11-14", "2026-11-15"));
        assertFalse(StepCounterLogic.isNewDay("2026-11-15", "2026-11-15"));
        assertFalse(StepCounterLogic.isNewDay("2026-11-15", null));
    }
}
