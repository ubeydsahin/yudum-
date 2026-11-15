package com.saidubeydullahsahin.yudum;

import android.Manifest;
import android.content.Context;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.os.Build;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

@CapacitorPlugin(
    name = "StepCounter",
    permissions = {
        @Permission(alias = "activity", strings = { Manifest.permission.ACTIVITY_RECOGNITION })
    }
)
public class StepCounterPlugin extends Plugin implements SensorEventListener {

    private static final String PREFS = "yudum_steps";
    private static final String K_DAY = "day";
    private static final String K_STEPS = "steps";
    private static final String K_LAST_RAW = "last_raw";
    private static final String K_ENABLED = "enabled";

    private SensorManager sensorManager;
    private Sensor stepCounterSensor;
    private Sensor stepDetectorSensor;
    private boolean isListening = false;

    @Override
    public void load() {
        Context ctx = getContext();
        sensorManager = (SensorManager) ctx.getSystemService(Context.SENSOR_SERVICE);
        if (sensorManager != null) {
            stepCounterSensor = sensorManager.getDefaultSensor(Sensor.TYPE_STEP_COUNTER);
            if (stepCounterSensor == null) {
                stepDetectorSensor = sensorManager.getDefaultSensor(Sensor.TYPE_STEP_DETECTOR);
            }
        }
        ensureToday();
        if (getPrefs().getBoolean(K_ENABLED, false) && hasActivityPermission()) {
            startSensor();
        }
    }

    @Override
    protected void handleOnResume() {
        ensureToday();
        if (getPrefs().getBoolean(K_ENABLED, false) && hasActivityPermission()) {
            startSensor();
        }
    }

    @Override
    protected void handleOnPause() {
        stopSensor();
    }

    @Override
    protected void handleOnDestroy() {
        stopSensor();
    }

    private SharedPreferences getPrefs() {
        return getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    private String todayStr() {
        return new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date());
    }

    private void ensureToday() {
        SharedPreferences prefs = getPrefs();
        String today = todayStr();
        String storedDay = prefs.getString(K_DAY, "");
        if (StepCounterLogic.isNewDay(storedDay, today)) {
            prefs.edit().putString(K_DAY, today).putLong(K_STEPS, 0L).apply();
        }
    }

    private boolean isSensorAvailable() {
        return stepCounterSensor != null || stepDetectorSensor != null;
    }

    private String getSensorType() {
        if (stepCounterSensor != null) return "counter";
        if (stepDetectorSensor != null) return "detector";
        return "none";
    }

    private boolean hasActivityPermission() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
            return true;
        }
        return ContextCompat.checkSelfPermission(getContext(), Manifest.permission.ACTIVITY_RECOGNITION)
            == PackageManager.PERMISSION_GRANTED;
    }

    private String getPermString() {
        if (hasActivityPermission()) return "granted";
        PermissionState st = getPermissionState("activity");
        if (st == PermissionState.DENIED) return "denied";
        return "prompt";
    }

    private void startSensor() {
        if (isListening || sensorManager == null || !isSensorAvailable() || !hasActivityPermission()) {
            return;
        }
        Sensor target = stepCounterSensor != null ? stepCounterSensor : stepDetectorSensor;
        if (target != null) {
            boolean ok = sensorManager.registerListener(this, target, SensorManager.SENSOR_DELAY_NORMAL);
            isListening = ok;
        }
    }

    private void stopSensor() {
        if (isListening && sensorManager != null) {
            sensorManager.unregisterListener(this);
            isListening = false;
        }
    }

    private JSObject buildStatus() {
        ensureToday();
        SharedPreferences prefs = getPrefs();
        JSObject ret = new JSObject();
        ret.put("available", isSensorAvailable());
        ret.put("sensorType", getSensorType());
        ret.put("permission", getPermString());
        ret.put("running", isListening);
        ret.put("enabled", prefs.getBoolean(K_ENABLED, false));
        ret.put("steps", prefs.getLong(K_STEPS, 0L));
        ret.put("day", prefs.getString(K_DAY, todayStr()));
        return ret;
    }

    @PluginMethod
    public void getStatus(PluginCall call) {
        if (getPrefs().getBoolean(K_ENABLED, false) && hasActivityPermission()) {
            startSensor();
        }
        call.resolve(buildStatus());
    }

    @PluginMethod
    public void start(PluginCall call) {
        getPrefs().edit().putBoolean(K_ENABLED, true).apply();
        if (!isSensorAvailable()) {
            call.resolve(buildStatus());
            return;
        }
        if (!hasActivityPermission()) {
            requestPermissionForAlias("activity", call, "onActivityPermResult");
            return;
        }
        startSensor();
        call.resolve(buildStatus());
    }

    @PluginMethod
    public void stop(PluginCall call) {
        getPrefs().edit().putBoolean(K_ENABLED, false).apply();
        stopSensor();
        call.resolve(buildStatus());
    }

    @PermissionCallback
    private void onActivityPermResult(PluginCall call) {
        if (hasActivityPermission()) {
            startSensor();
        } else {
            getPrefs().edit().putBoolean(K_ENABLED, false).apply();
        }
        call.resolve(buildStatus());
    }

    @Override
    public void onSensorChanged(SensorEvent event) {
        if (event == null || event.sensor == null || event.values == null || event.values.length == 0) {
            return;
        }
        ensureToday();
        SharedPreferences prefs = getPrefs();
        if (event.sensor.getType() == Sensor.TYPE_STEP_COUNTER) {
            long raw = (long) event.values[0];
            long prevRaw = prefs.getLong(K_LAST_RAW, -1L);
            long delta = StepCounterLogic.computeCounterDelta(raw, prevRaw);
            long total = prefs.getLong(K_STEPS, 0L) + delta;
            prefs.edit().putLong(K_LAST_RAW, raw).putLong(K_STEPS, total).apply();
            notifyListeners("stepsUpdate", buildStatus());
        } else if (event.sensor.getType() == Sensor.TYPE_STEP_DETECTOR) {
            long add = Math.max(1L, Math.round(event.values[0]));
            long total = prefs.getLong(K_STEPS, 0L) + add;
            prefs.edit().putLong(K_STEPS, total).apply();
            notifyListeners("stepsUpdate", buildStatus());
        }
    }

    @Override
    public void onAccuracyChanged(Sensor sensor, int accuracy) {
        // Not needed for step counting.
    }
}
