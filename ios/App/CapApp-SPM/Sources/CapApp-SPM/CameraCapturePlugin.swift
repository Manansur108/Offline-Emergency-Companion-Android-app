import Capacitor
import Foundation
import UIKit

@objc(CameraCapturePlugin)
public class CameraCapturePlugin: CAPPlugin, CAPBridgedPlugin, UIImagePickerControllerDelegate, UINavigationControllerDelegate {
    public let identifier = "CameraCapturePlugin"
    public let jsName = "CameraCapture"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "capturePhoto", returnType: CAPPluginReturnPromise)
    ]

    private var pendingCall: CAPPluginCall?

    @objc public func capturePhoto(_ call: CAPPluginCall) {
        guard UIImagePickerController.isSourceTypeAvailable(.camera) else {
            call.reject("Camera is not available on this device.")
            return
        }

        pendingCall = call
        DispatchQueue.main.async {
            let picker = UIImagePickerController()
            picker.sourceType = .camera
            picker.delegate = self
            self.bridge?.viewController?.present(picker, animated: true)
        }
    }

    public func imagePickerController(_ picker: UIImagePickerController, didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey : Any]) {
        picker.dismiss(animated: true)

        guard let call = pendingCall else {
            return
        }
        pendingCall = nil

        guard let image = info[.originalImage] as? UIImage, let data = image.jpegData(compressionQuality: 0.92) else {
            call.reject("No photo was captured.")
            return
        }

        let formatter = DateFormatter()
        formatter.dateFormat = "yyyyMMdd_HHmmss"
        let name = "offline_ai_\(formatter.string(from: Date())).jpg"
        let directory = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0].appendingPathComponent("camera", isDirectory: true)
        let url = directory.appendingPathComponent(name)

        do {
            try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
            try data.write(to: url)
            call.resolve([
                "path": url.path,
                "uri": url.absoluteString,
                "name": name,
                "sizeBytes": data.count,
                "capturedAt": ISO8601DateFormatter().string(from: Date())
            ])
        } catch {
            call.reject("Could not save photo: \(error.localizedDescription)")
        }
    }

    public func imagePickerControllerDidCancel(_ picker: UIImagePickerController) {
        picker.dismiss(animated: true)
        pendingCall?.reject("No photo was captured.")
        pendingCall = nil
    }
}
