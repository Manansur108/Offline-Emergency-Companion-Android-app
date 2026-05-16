import Capacitor
import Foundation
import UIKit

@objc(ShareExportPlugin)
public class ShareExportPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "ShareExportPlugin"
    public let jsName = "ShareExport"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "shareText", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "exportTextFile", returnType: CAPPluginReturnPromise)
    ]

    @objc public func shareText(_ call: CAPPluginCall) {
        let text = call.getString("text") ?? ""
        presentShare(items: [text], call: call, path: nil)
    }

    @objc public func exportTextFile(_ call: CAPPluginCall) {
        let text = call.getString("text") ?? ""
        let fileName = sanitizeFileName(call.getString("fileName") ?? "offline-ai-export.md")
        let url = FileManager.default.temporaryDirectory.appendingPathComponent(fileName)

        do {
            try text.write(to: url, atomically: true, encoding: .utf8)
            presentShare(items: [url], call: call, path: url.path)
        } catch {
            call.reject("Export failed: \(error.localizedDescription)")
        }
    }

    private func presentShare(items: [Any], call: CAPPluginCall, path: String?) {
        DispatchQueue.main.async {
            let controller = UIActivityViewController(activityItems: items, applicationActivities: nil)
            self.bridge?.viewController?.present(controller, animated: true) {
                var response: JSObject = ["shared": true]
                if let path {
                    response["path"] = path
                }
                call.resolve(response)
            }
        }
    }

    private func sanitizeFileName(_ value: String) -> String {
        let allowed = CharacterSet(charactersIn: "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789._-")
        let scalars = value.unicodeScalars.map { allowed.contains($0) ? Character($0) : "_" }
        let clean = String(scalars)
        return clean.isEmpty ? "offline-ai-export.md" : clean
    }
}
