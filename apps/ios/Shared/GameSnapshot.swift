import Foundation

/// What widgets and the Live Activity show about a game. Written by the app into the App Group
/// (the extension has no Kotlin runtime), so keep it small and plain.
struct GameSnapshot: Codable, Hashable {
    struct Court: Codable, Hashable {
        var court: Int
        var teamA: String
        var teamB: String
        var scoreA: Int?
        var scoreB: Int?
        var scored: Bool { scoreA != nil && scoreB != nil }
    }

    struct Leader: Codable, Hashable {
        var rank: Int
        var name: String
        var score: String
    }

    var code: String
    var name: String
    var modeName: String
    var round: Int
    var plannedRounds: Int?
    var finished: Bool
    var courts: [Court]
    var sittingOut: [String]
    var leaders: [Leader]
    var updatedAt: Date

    var roundLabel: String {
        if let planned = plannedRounds { "Round \(round) of \(planned)" } else { "Round \(round)" }
    }

    var scoredCourts: Int { courts.filter(\.scored).count }

    var url: URL { URL(string: "americanoo://g/\(code)")! }
}

enum SharedStore {
    /// Shared with the widget extension (entitlements: com.apple.security.application-groups).
    static let appGroup = "group.app.americanoo"
    static let snapshotKey = "padel.snapshot.v1"

    static var defaults: UserDefaults { UserDefaults(suiteName: appGroup) ?? .standard }

    static func readSnapshot() -> GameSnapshot? {
        guard let data = defaults.data(forKey: snapshotKey) else { return nil }
        return try? JSONDecoder().decode(GameSnapshot.self, from: data)
    }

    static func writeSnapshot(_ snapshot: GameSnapshot?) {
        if let snapshot, let data = try? JSONEncoder().encode(snapshot) {
            defaults.set(data, forKey: snapshotKey)
        } else {
            defaults.removeObject(forKey: snapshotKey)
        }
    }
}
