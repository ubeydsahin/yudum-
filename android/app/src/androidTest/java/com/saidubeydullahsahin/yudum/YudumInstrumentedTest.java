package com.saidubeydullahsahin.yudum;

import static org.junit.Assert.assertEquals;

import android.content.Context;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import org.junit.Test;
import org.junit.runner.RunWith;

/**
 * Instrumented smoke test verifying Yudum's Android application package ID.
 */
@RunWith(AndroidJUnit4.class)
public class YudumInstrumentedTest {

    @Test
    public void useAppContext() {
        Context appContext = InstrumentationRegistry.getInstrumentation().getTargetContext();
        assertEquals("com.saidubeydullahsahin.yudum", appContext.getPackageName());
    }
}
