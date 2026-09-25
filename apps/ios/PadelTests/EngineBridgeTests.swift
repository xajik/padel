import PadelShared
import XCTest
@testable import Padel

/// The Kotlin engine is covered by the shared fixtures; these check the Swift boundary:
/// types map as expected and Kotlin exceptions arrive as Swift errors instead of crashing.
final class EngineBridgeTests: XCTestCase {
    private func players(_ n: Int) -> [Player] {
        (0..<n).map { Player(id: "p\($0)", name: "Player \($0)", side: nil, teamId: nil) }
    }

    func testAmericanoEightPlayersHasSevenRounds() throws {
        let settings = Engine.defaultSettings(.americano, players: 8)
        let game = try GameKt.createGame(settings: settings, players: players(8), seed: "seed-1")
        XCTAssertEqual(game.rounds.count, 7)
        XCTAssertEqual(game.rounds.first?.matches.count, 2)
    }

    func testEngineErrorsBecomeSwiftErrors() {
        let settings = Engine.defaultSettings(.americano, players: 8)
        XCTAssertThrowsError(try GameKt.createGame(settings: settings, players: players(3), seed: "x"))
    }

    func testModesAreExposed() {
        XCTAssertEqual(Engine.modes.count, 8)
        XCTAssertEqual(Engine.estimate(Engine.defaultSettings(.americano, players: 8), players: 8).rounds, 7)
    }
}
