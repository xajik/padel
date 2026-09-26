import Foundation
import WatchConnectivity

/// Organizer keys shared between the iPhone and Apple Watch apps, so games started on either one can be
/// scored on both. Each side sends the keys of the live games it can edit as its latest application
/// context; the other side adds those games (`GameRepository.importKeys`). Compiled into both apps.
final class KeySync: NSObject, WCSessionDelegate, @unchecked Sendable {
    static let shared = KeySync()

    private var onKeys: (@Sendable (String) -> Void)?
    /// Main thread only.
    private var latest: String?
    private var sent: String?

    func start(onKeys: @escaping @Sendable (String) -> Void) {
        self.onKeys = onKeys
        guard WCSession.isSupported() else { return }
        WCSession.default.delegate = self
        WCSession.default.activate()
    }

    /// Call on the main thread with `GameRepository.encodeKeys`; unchanged keys aren't sent again.
    func publish(_ json: String) {
        latest = json
        flush()
    }

    private func flush() {
        guard WCSession.isSupported(), let json = latest, json != sent else { return }
        let session = WCSession.default
        guard session.activationState == .activated else { return }
        #if os(iOS)
        guard session.isPaired, session.isWatchAppInstalled else { return }
        #else
        guard session.isCompanionAppInstalled else { return }
        #endif
        do {
            try session.updateApplicationContext(["keys": json])
            sent = json
        } catch {}
    }

    func session(_ session: WCSession, activationDidCompleteWith state: WCSessionActivationState, error: Error?) {
        // Keys the other side sent while this app wasn't running.
        if let json = session.receivedApplicationContext["keys"] as? String { onKeys?(json) }
        DispatchQueue.main.async { self.flush() }
    }

    func session(_ session: WCSession, didReceiveApplicationContext context: [String: Any]) {
        if let json = context["keys"] as? String { onKeys?(json) }
    }

    #if os(iOS)
    func sessionDidBecomeInactive(_ session: WCSession) {}
    /// The user switched to another watch: activate again for the new one.
    func sessionDidDeactivate(_ session: WCSession) { session.activate() }
    func sessionWatchStateDidChange(_ session: WCSession) { DispatchQueue.main.async { self.sent = nil; self.flush() } }
    #endif
}
