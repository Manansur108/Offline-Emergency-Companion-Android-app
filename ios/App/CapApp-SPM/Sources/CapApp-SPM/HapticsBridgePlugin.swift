import Capacitor
import Foundation
import UIKit

@objc(HapticsBridgePlugin)
public class HapticsBridgePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "HapticsBridgePlugin"
    public let jsName = "HapticsBridge"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "impact", returnType: CAPPluginReturnPromise)
    ]

    @objc public func impact(_ call: CAPPluginCall) {
        let style = call.getString("style") ?? "light"
        let impactStyle: UIImpactFeedbackGenerator.FeedbackStyle
        switch style {
        case "heavy":
            impactStyle = .heavy
        case "medium":
            impactStyle = .medium
        default:
            impactStyle = .light
        }
        UIImpactFeedbackGenerator(style: impactStyle).impactOccurred()
        call.resolve()
    }
}
