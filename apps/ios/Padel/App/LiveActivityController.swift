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
        if byCode[snapshot.code] != nil {
            Task { await Self.end(snapshot.code) }
        } else {
            start(snapshot)
        }
    }

    func start(_ snapshot: GameSnapshot) {
        guard ActivityAuthorizationInfo().areActivitiesEnabled, !snapshot.finished else { return }
        _ = try? Activity.request(
            attributes: GameActivityAttributes(code: snapshot.code, name: snapshot.name),
            content: Self.content(snapshot),
            pushType: nil
        )
    }

    /// Keep running activities in step with the games; end them when a game finishes or is removed.
    func sync(with games: [LocalGame]) {
        let snapshots = Dictionary(games.map { ($0.code, GameSnapshot($0)) }, uniquingKeysWith: { a, _ in a })
        for (code, activity) in byCode {
            guard let snapshot = snapshots[code] else {
                Task { await Self.end(code) }
                continue
            }
            if snapshot.finished {
                Task { await Self.end(code, snapshot: snapshot) }
            } else if activity.content.state.snapshot != snapshot {
                Task { await Self.update(code, snapshot: snapshot) }
            }
        }
    }

    // ActivityKit's Activity is not Sendable. Look it up within the async operation instead
    // of transferring a main-actor-owned instance to its nonisolated update/end methods.
    nonisolated private static func end(_ code: String, snapshot: GameSnapshot? = nil) async {
        guard let activity = Activity<GameActivityAttributes>.activities.first(where: { $0.attributes.code == code }) else { return }
        await activity.end(snapshot.map(content), dismissalPolicy: snapshot == nil ? .immediate : .after(.now + 60 * 30))
    }

    nonisolated private static func update(_ code: String, snapshot: GameSnapshot) async {
        guard let activity = Activity<GameActivityAttributes>.activities.first(where: { $0.attributes.code == code }) else { return }
        await activity.update(content(snapshot))
    }

    nonisolated private static func content(_ snapshot: GameSnapshot) -> ActivityContent<GameActivityAttributes.ContentState> {
        // A game rarely pauses for long; mark the activity stale after an hour without news.
        ActivityContent(state: .init(snapshot: snapshot), staleDate: .now + 60 * 60)
    }
}
