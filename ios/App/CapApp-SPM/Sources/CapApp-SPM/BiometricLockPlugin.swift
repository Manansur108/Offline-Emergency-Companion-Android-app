import Capacitor
import Foundation
import LocalAuthentication

@objc(BiometricLockPlugin)
public class BiometricLockPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "BiometricLockPlugin"
    public let jsName = "BiometricLock"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getStatus", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "authenticate", returnType: CAPPluginReturnPromise)
    ]

    @objc public func getStatus(_ call: CAPPluginCall) {
        let context = LAContext()
        var error: NSError?
        let available = context.canEvaluatePolicy(.deviceOwnerAuthentication, error: &error)
        call.resolve([
            "platform": "ios",
            "available": available,
            "enrolled": available,
            "message": available ? "Face ID, Touch ID, or passcode unlock is available." : (error?.localizedDescription ?? "Biometric unlock is not available.")
        ])
    }

    @objc public func authenticate(_ call: CAPPluginCall) {
        let reason = call.getString("reason") ?? "Unlock Offline AI Base"
        let context = LAContext()
        context.evaluatePolicy(.deviceOwnerAuthentication, localizedReason: reason) { success, error in
            if success {
                call.resolve(["authenticated": true])
            } else {
                call.reject(error?.localizedDescription ?? "Authentication failed.")
            }
        }
    }
}
