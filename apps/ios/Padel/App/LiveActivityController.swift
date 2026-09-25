import ActivityKit
@preconcurrency import PadelShared
import Foundation

/// Lock Screen / Dynamic Island activity for games being followed on this phone.
///
/// Updates are pushed from the app whenever the game changes (a score entered here, or a change
/// picked up by polling). Remote updates while the app is closed would need APNs push tokens.
@MainActor
final class LiveActivityController {
    private var byCode: [String: Activity<GameActivityAttributes>] {
        Dictionary(Activity<GameActivityAttributes>.activities.map { ($0.attributes.code, $0) }, uniquingKeysWith: { a, _ in a })
    }

    func isRunning(_ code: String) -> Bool { byCode[code] != nil }

    func toggle(_ snapshot: GameSnapshot) {
        if let activity = byCode[snapshot.code] {
            Task { await activity.end(nil, dismissalPolicy: .immediate) }
        } else {
            start(snapshot)
        }
    }

    func start(_ snapshot: GameSnapshot) {
        guard ActivityAuthorizationInfo().areActivitiesEnabled, !snapshot.finished else { return }
        _ = try? Activity.request(
            attributes: GameActivityAttributes(code: snapshot.code, name: snapshot.name),
            content: content(snapshot),
            pushType: nil
        )
    }

    /// Keep running activities in step with the games; end them when a game finishes or is removed.
    func sync(with games: [LocalGame]) {
        let snapshots = Dictionary(games.map { ($0.code, GameSnapshot($0)) }, uniquingKeysWith: { a, _ in a })
        for (code, activity) in byCode {
            guard let snapshot = snapshots[code] else {
                Task { await activity.end(nil, dismissalPolicy: .immediate) }
                continue
            }
            if snapshot.finished {
                Task { await activity.end(content(snapshot), dismissalPolicy: .after(.now + 60 * 30)) }
            } else if activity.content.state.snapshot != snapshot {
                Task { await activity.update(content(snapshot)) }
            }
        }
    }

    private func content(_ snapshot: GameSnapshot) -> ActivityContent<GameActivityAttributes.ContentState> {
        // A game rarely pauses for long; mark the activity stale after an hour without news.
        ActivityContent(state: .init(snapshot: snapshot), staleDate: .now + 60 * 60)
    }
}
