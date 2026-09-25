import ActivityKit
import Foundation

/// Live Activity for the game in progress: current round, courts and the leader, on the Lock
/// Screen and in the Dynamic Island.
struct GameActivityAttributes: ActivityAttributes {
    struct ContentState: Codable, Hashable {
        var snapshot: GameSnapshot
    }

    var code: String
    var name: String
}
