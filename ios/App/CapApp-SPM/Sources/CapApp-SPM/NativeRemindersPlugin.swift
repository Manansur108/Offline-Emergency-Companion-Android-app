import Capacitor
import Foundation
import UserNotifications

@objc(NativeRemindersPlugin)
public class NativeRemindersPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "NativeRemindersPlugin"
    public let jsName = "NativeReminders"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "requestPermissions", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "schedule", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "cancel", returnType: CAPPluginReturnPromise)
    ]

    @objc public func requestPermissions(_ call: CAPPluginCall) {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { granted, _ in
            call.resolve(["granted": granted])
        }
    }

    @objc public func schedule(_ call: CAPPluginCall) {
        let id = call.getInt("id") ?? Int(Date().timeIntervalSince1970)
        let title = call.getString("title") ?? "Offline AI reminder"
        let body = call.getString("body") ?? ""
        let delayMs = call.getDouble("delayMs") ?? 1000
        let at = call.getString("at")
        let scheduledDate: Date

        if let at, let parsedDate = ISO8601DateFormatter().date(from: at) {
            scheduledDate = parsedDate
        } else {
            scheduledDate = Date().addingTimeInterval(max(1, delayMs / 1000))
        }

        let content = UNMutableNotificationContent()
        content.title = title
        content.body = body
        content.sound = .default

        let interval = max(1, scheduledDate.timeIntervalSinceNow)
        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: interval, repeats: false)
        let request = UNNotificationRequest(identifier: String(id), content: content, trigger: trigger)

        UNUserNotificationCenter.current().add(request) { error in
            if let error {
                call.reject(error.localizedDescription)
                return
            }
            call.resolve(["id": id, "scheduledAt": ISO8601DateFormatter().string(from: scheduledDate)])
        }
    }

    @objc public func cancel(_ call: CAPPluginCall) {
        guard let id = call.getInt("id") else {
            call.reject("Reminder id is required.")
            return
        }
        UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: [String(id)])
        call.resolve(["cancelled": true])
    }
}
