import XCTest

/// A real, continuous app walkthrough, recorded by scripts/ios-recording.py.
@MainActor
final class StoreFlowRecording: XCTestCase {
    func testAppFlow() throws {
        guard ProcessInfo.processInfo.environment["STORE_RECORDING"] == "1" else {
            throw XCTSkip("Run via make ios-recording")
        }
        continueAfterFailure = false
        let app = XCUIApplication()
        app.launchArguments = ["-reset", "-demo", "-AppleLanguages", "(en)", "-AppleLocale", "en_US"] + TestServer.appArguments
        app.launch()
        let live = app.buttons.containing(NSPredicate(format: "label CONTAINS 'Tuesday Club Night' AND label CONTAINS 'Round 3'")).firstMatch
        XCTAssertTrue(live.waitForExistence(timeout: 60))
        sleep(2)
        print("STORE_FLOW_START \(Date().timeIntervalSince1970)")
        sleep(3)
        live.tap()
        let court = app.descendants(matching: .any)["court-2"].firstMatch
        XCTAssertTrue(court.waitForExistence(timeout: 10))
        sleep(3)
        court.tap()
        XCTAssertTrue(app.buttons["score-13"].waitForExistence(timeout: 5))
        sleep(3)
        app.buttons["score-13"].tap()
        let next = app.buttons["next-round"]
        XCTAssertTrue(next.waitForExistence(timeout: 10))
        sleep(2)
        next.tap()
        sleep(3)
        app.buttons["Leaderboard"].tap()
        sleep(3)
        app.buttons["Round"].tap()
        app.buttons["share-game"].tap()
        XCTAssertTrue(app.staticTexts["share-code"].waitForExistence(timeout: 5))
        sleep(3)
        app.buttons["Done"].tap()
        app.navigationBars.buttons.firstMatch.tap()
        app.buttons.containing(NSPredicate(format: "label CONTAINS 'Sunday Mexicano'")).firstMatch.tap()
        sleep(3)
        app.navigationBars.buttons.firstMatch.tap()
        app.buttons["new-game"].tap()
        XCTAssertTrue(app.buttons["start-game"].waitForExistence(timeout: 5))
        sleep(3)
        print("STORE_FLOW_END \(Date().timeIntervalSince1970)")
    }
}
