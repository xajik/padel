import AmplitudeSwift
import Foundation

/// Amplitude product analytics (NFR-12), with the same event names as the web app. Never send player names.
enum Analytics {
    enum Event: String {
        case createdGame = "Created Game"
        case joinedGame = "Joined Game"
        case enteredScore = "Entered Score"
        case startedRound = "Started Round"
        case finishedGame = "Finished Game"
        case openedShare = "Opened Share"
    }

    /// Amplitude.plist (API_KEY) is gitignored like GoogleService-Info.plist: builds without it (CI, forks) skip analytics.
    nonisolated(unsafe) private static let client: Amplitude? = {
        guard let url = Bundle.main.url(forResource: "Amplitude", withExtension: "plist"),
              let plist = NSDictionary(contentsOf: url),
              let key = plist["API_KEY"] as? String, !key.isEmpty
        else {
            print("Amplitude API key missing — analytics disabled")
            return nil
        }
        // No element interactions: button labels can carry player names.
        return Amplitude(configuration: Configuration(apiKey: key, autocapture: [.sessions, .appLifecycles, .screenViews]))
    }()

    static func start() { _ = client }

    static func track(_ event: Event, _ props: [String: Any] = [:]) {
        client?.track(eventType: event.rawValue, eventProperties: props)
    }
}
