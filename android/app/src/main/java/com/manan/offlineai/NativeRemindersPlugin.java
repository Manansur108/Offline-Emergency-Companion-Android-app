package com.manan.offlineai;

import android.Manifest;
import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.time.Instant;

@CapacitorPlugin(
        name = "NativeReminders",
        permissions = {
                @Permission(alias = "notifications", strings = { Manifest.permission.POST_NOTIFICATIONS })
        }
)
public class NativeRemindersPlugin extends Plugin {
    @PluginMethod
    public void requestPermissions(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU || getPermissionState("notifications") == PermissionState.GRANTED) {
            NativeReminderReceiver.createChannel(getContext());
            JSObject response = new JSObject();
            response.put("granted", true);
            call.resolve(response);
            return;
        }

        requestPermissionForAlias("notifications", call, "notificationsPermissionCallback");
    }

    @PermissionCallback
    private void notificationsPermissionCallback(PluginCall call) {
        JSObject response = new JSObject();
        response.put("granted", getPermissionState("notifications") == PermissionState.GRANTED);
        call.resolve(response);
    }

    @PluginMethod
    public void schedule(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU && getPermissionState("notifications") != PermissionState.GRANTED) {
            requestPermissionForAlias("notifications", call, "schedulePermissionCallback");
            return;
        }

        scheduleInternal(call);
    }

    @PermissionCallback
    private void schedulePermissionCallback(PluginCall call) {
        if (getPermissionState("notifications") != PermissionState.GRANTED) {
            call.reject("Notification permission is required to schedule reminders.");
            return;
        }
        scheduleInternal(call);
    }

    private void scheduleInternal(PluginCall call) {
        int id = call.getInt("id", (int) (System.currentTimeMillis() % Integer.MAX_VALUE));
        String title = call.getString("title", "Offline AI reminder");
        String body = call.getString("body", "");
        Long delayMs = call.getLong("delayMs");
        String at = call.getString("at");
        long triggerAt = delayMs == null ? System.currentTimeMillis() + 1000 : System.currentTimeMillis() + Math.max(0, delayMs);

        if (at != null && !at.trim().isEmpty()) {
            try {
                triggerAt = Instant.parse(at).toEpochMilli();
            } catch (Exception ignored) {
                call.reject("Reminder time must be an ISO timestamp.");
                return;
            }
        }

        NativeReminderReceiver.createChannel(getContext());
        AlarmManager alarmManager = (AlarmManager) getContext().getSystemService(Context.ALARM_SERVICE);
        PendingIntent pendingIntent = buildPendingIntent(id, title, body);
        if (alarmManager == null) {
            call.reject("Alarm manager is not available.");
            return;
        }

        alarmManager.set(AlarmManager.RTC_WAKEUP, triggerAt, pendingIntent);

        JSObject response = new JSObject();
        response.put("id", id);
        response.put("scheduledAt", Instant.ofEpochMilli(triggerAt).toString());
        call.resolve(response);
    }

    @PluginMethod
    public void cancel(PluginCall call) {
        int id = call.getInt("id", -1);
        if (id < 0) {
            call.reject("Reminder id is required.");
            return;
        }

        AlarmManager alarmManager = (AlarmManager) getContext().getSystemService(Context.ALARM_SERVICE);
        PendingIntent pendingIntent = buildPendingIntent(id, "", "");
        if (alarmManager != null) {
            alarmManager.cancel(pendingIntent);
        }

        JSObject response = new JSObject();
        response.put("cancelled", true);
        call.resolve(response);
    }

    private PendingIntent buildPendingIntent(int id, String title, String body) {
        Intent intent = new Intent(getContext(), NativeReminderReceiver.class);
        intent.putExtra("id", id);
        intent.putExtra("title", title);
        intent.putExtra("body", body);
        return PendingIntent.getBroadcast(
                getContext(),
                id,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
    }
}
