import XCTest

/// App Store screenshots from real screens and real (demo) games.
/// Runs only when asked: `make ios-screenshots` (TEST_RUNNER_STORE_SCREENSHOTS=1).
final class StoreScreenshots: XCTestCase {
    var app: XCUIApplication!

    override func setUpWithError() throws {
        guard ProcessInfo.processInfo.environment["STORE_SCREENSHOTS"] == "1" else { throw XCTSkip("Store screenshots run via make ios-screenshots") }
        continueAfterFailure = true
        app = XCUIApplication()
        app.launchArguments = ["-reset", "-demo", "-AppleLanguages", "(en)", "-AppleLocale", "en_US"]
        app.launch()
    }

    func testStoreScreenshots() throws {
        // Demo games register with the server first.
        let live = app.buttons.containing(NSPredicate(format: "label CONTAINS 'Tuesday Club Night'")).firstMatch
        XCTAssertTrue(live.waitForExistence(timeout: 60))
        sleep(2)
        snap("05-home")

        live.tap()
        XCTAssertTrue(app.descendants(matching: .any)["court-2"].waitForExistence(timeout: 10))
        sleep(1)
        snap("01-game")

        app.descendants(matching: .any)["court-2"].tap()
        XCTAssertTrue(app.buttons["score-13"].waitForExistence(timeout: 5))
        snap("02-score-pad")
        app.buttons["Cancel"].tap()

        app.buttons["Leaderboard"].tap()
        sleep(1)
        snap("03-leaderboard")
        app.buttons["Round"].tap()

        app.buttons["share-game"].tap()
        XCTAssertTrue(app.staticTexts["share-code"].waitForExistence(timeout: 5))
        sleep(1)
        snap("04-share-qr")
        app.buttons["Done"].tap()

        app.navigationBars.buttons.element(boundBy: 0).tap()
        app.buttons.containing(NSPredicate(format: "label CONTAINS 'Sunday Mexicano'")).firstMatch.tap()
        sleep(1)
        snap("06-podium")
        app.navigationBars.buttons.element(boundBy: 0).tap()

        app.buttons["new-game"].tap()
        sleep(1)
        snap("07-new-game")
    }

    private func snap(_ name: String) {
        let shot = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
        shot.name = name
        shot.lifetime = .keepAlways
        add(shot)
    }
}
