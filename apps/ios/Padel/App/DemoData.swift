@preconcurrency import PadelShared
import Foundation

/// `-demo` launch argument: realistic games for App Store screenshots and UI walkthroughs.
/// Uses the normal repository, so demo games are real, shareable games on the server.
@MainActor
enum DemoData {
    static let names = ["Anna", "Mikko", "Laura", "Jussi", "Sara", "Pekka", "Emma", "Olli"]

    static func seed(_ model: AppModel) async {
        let repo = model.repo
        do {
            // A finished Mexicano from last week, for the podium and "Your games".
            let done = try await repo.create(
                name: "Sunday Mexicano", settings: GameSetup.shared.settings(mode: .mexicano, playerCount: 8, courts: 2, scoringType: .total, points: 24, rounds: KotlinInt(int: 3), byeAverage: false),
                names: ["Iida", "Timo", "Nea", "Eero", "Ella", "Juho", "Siiri", "Aku"], sides: nil
            )
            for r in 0..<3 {
                try await scoreRound(repo, done.code, round: r, seed: r + 3)
                if r < 2 { try await repo.next(code: done.code) }
            }
            try await repo.finish(code: done.code)

            // Tonight's Americano: round 3 in play, one court already scored.
            let live = try await repo.create(
                name: "Tuesday Club Night", settings: GameSetup.shared.settings(mode: .americano, playerCount: 8, courts: 2, scoringType: .total, points: 24, rounds: nil, byeAverage: false),
                names: names, sides: nil
            )
            for r in 0..<2 {
                try await scoreRound(repo, live.code, round: r, seed: r)
                try await repo.next(code: live.code)
            }
            _ = try await repo.score(code: live.code, roundIndex: 2, matchIndex: 0, scoreA: KotlinInt(int: 15), scoreB: nil)
            try await repo.syncAll()
        } catch {
            model.banner = "Demo data: \((error as NSError).kotlinMessage)"
        }
    }

    private static func scoreRound(_ repo: GameRepository, _ code: String, round: Int, seed: Int) async throws {
        let scores = [15, 11, 17, 13, 9, 16]
        let matches = repo.game(code: code)!.game.state.rounds[round].matches.count
        for m in 0..<matches {
            _ = try await repo.score(code: code, roundIndex: Int32(round), matchIndex: Int32(m), scoreA: KotlinInt(int: Int32(scores[(seed + m) % scores.count])), scoreB: nil)
        }
    }
}
