import UIKit
import UniformTypeIdentifiers

private let appGroupId = "group.gd.eggs.diary"
private let sharedTextKey = "pendingShareText"
private let pasteboardPrefix = "guanming-share-v1:"
private let appScheme = "guanming://share-pending"

final class ShareViewController: UIViewController {

    private let logoLabel = UILabel()

    override func viewDidLoad() {
        super.viewDidLoad()
        buildView()
        processShare()
    }

    // MARK: – Minimal loading UI

    private func buildView() {
        view.backgroundColor = UIColor(red: 0.055, green: 0.051, blue: 0.043, alpha: 1)

        logoLabel.translatesAutoresizingMaskIntoConstraints = false
        logoLabel.text = "觀明"
        logoLabel.textColor = UIColor(red: 0.77, green: 0.65, blue: 0.45, alpha: 0)
        logoLabel.font = UIFont.systemFont(ofSize: 32, weight: .light)
        logoLabel.textAlignment = .center
        view.addSubview(logoLabel)

        NSLayoutConstraint.activate([
            logoLabel.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            logoLabel.centerYAnchor.constraint(equalTo: view.centerYAnchor)
        ])

        UIView.animate(withDuration: 0.15) {
            self.logoLabel.textColor = UIColor(red: 0.77, green: 0.65, blue: 0.45, alpha: 1)
        }
    }

    // MARK: – Core flow

    private func processShare() {
        extractText { [weak self] text in
            guard let self else { return }
            let cleaned = text?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
            if !cleaned.isEmpty {
                self.saveText(cleaned)
            }
            self.openMainApp()
        }
    }

    // MARK: – Text extraction

    private func extractText(completion: @escaping (String?) -> Void) {
        let providers = (extensionContext?.inputItems as? [NSExtensionItem])?
            .flatMap { $0.attachments ?? [] } ?? []

        if let p = providers.first(where: { $0.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) }) {
            p.loadItem(forTypeIdentifier: UTType.plainText.identifier, options: nil) { item, _ in
                DispatchQueue.main.async {
                    switch item {
                    case let str as String: completion(str)
                    case let url as URL:    completion(url.absoluteString)
                    default:               completion(nil)
                    }
                }
            }
            return
        }

        if let p = providers.first(where: { $0.hasItemConformingToTypeIdentifier(UTType.url.identifier) }) {
            p.loadItem(forTypeIdentifier: UTType.url.identifier, options: nil) { item, _ in
                DispatchQueue.main.async {
                    if let url = item as? URL { completion(url.absoluteString) }
                    else { completion(nil) }
                }
            }
            return
        }

        DispatchQueue.main.async { completion(nil) }
    }

    // MARK: – Storage

    private func saveText(_ text: String) {
        // Primary: App Group shared container (requires provisioning)
        if let shared = UserDefaults(suiteName: appGroupId) {
            shared.set(text, forKey: sharedTextKey)
            shared.synchronize()
        }
        // Fallback: system pasteboard
        UIPasteboard.general.string = "\(pasteboardPrefix)\(text)"
    }

    // MARK: – Open containing app

    private func openMainApp() {
        guard let url = URL(string: appScheme) else {
            complete()
            return
        }

        // Try the standard extension API first
        extensionContext?.open(url) { [weak self] success in
            DispatchQueue.main.async {
                if !success {
                    // Fallback: walk responder chain to reach UIApplication
                    self?.openViaResponderChain(url)
                }
                self?.complete()
            }
        }
    }

    /// Walks the responder chain to find UIApplication and opens a URL.
    /// Works in Share Extensions where UIApplication.shared is not directly accessible.
    private func openViaResponderChain(_ url: URL) {
        var responder: UIResponder? = self
        while let r = responder {
            if let app = r as? UIApplication {
                app.open(url, options: [:], completionHandler: nil)
                return
            }
            responder = r.next
        }
    }

    private func complete() {
        extensionContext?.completeRequest(returningItems: nil)
    }
}
