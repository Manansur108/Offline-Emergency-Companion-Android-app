package com.manan.offlineai;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

public class NativeReminderReceiver extends BroadcastReceiver {
    static final String CHANNEL_ID = "offline_ai_reminders";

    @Override
    public void onReceive(Context context, Intent intent) {
        createChannel(context);

        int id = intent.getIntExtra("id", (int) System.currentTimeMillis());
        String title = intent.getStringExtra("title");
        String body = intent.getStringExtra("body");
        if (title == null || title.trim().isEmpty()) {
            title = "Offline AI reminder";
        }
        if (body == null) {
            body = "";
        }

        Intent launchIntent = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        PendingIntent contentIntent = PendingIntent.getActivity(
                context,
                id,
                launchIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
                .setSmallIcon(com.manan.offlineai.R.drawable.ic_stat_notifications)
                .setContentTitle(title)
                .setContentText(body)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
                .setPriority(NotificationCompat.PRIORITY_DEFAULT)
                .setAutoCancel(true)
                .setContentIntent(contentIntent);

        NotificationManagerCompat.from(context).notify(id, builder.build());
    }

    static void createChannel(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return;
        }

        NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Offline AI reminders",
                NotificationManager.IMPORTANCE_DEFAULT
        );
        channel.setDescription("Local task and camera capture reminders");

        NotificationManager manager = context.getSystemService(NotificationManager.class);
        if (manager != null) {
            manager.createNotificationChannel(channel);
        }
    }
}
