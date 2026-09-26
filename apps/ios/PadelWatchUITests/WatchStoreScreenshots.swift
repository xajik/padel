import XCTest

/// App Store Apple Watch screenshots from the real app with the demo games.
/// Runs only when asked: `make watch-screenshots` (TEST_RUNNER_STORE_SCREENSHOTS=1).
final class WatchStoreScreenshots: XCTestCase {
    func testStoreScreenshots() throws {
        guard ProcessInfo.processInfo.environment["STORE_SCREENSHOTS"] == "1" else { throw XCTSkip("Store screenshots run via make watch-screenshots") }
        continueAfterFailure = true
        let app = XCUIApplication()
        app.launchArguments = ["-reset", "-demo", "-AppleLanguages", "(en)", "-AppleLocale", "en_US"]
        app.launch()

        // Demo games register with the server first.
        let live = app.buttons.containing(NSPredicate(format: "label CONTAINS 'Tuesday Club Night'")).firstMatch
        XCTAssertTrue(live.waitForExistence(timeout: 60))
        sleep(3)
        live.tap()
        let court2 = app.buttons["court-2"]
        XCTAssertTrue(court2.waitForExistence(timeout: 10))
        sleep(1)
        snap("01-round")

        court2.tap()
        let picker = app.descendants(matching: .any)["score-picker"].firstMatch
        XCTAssertTrue(app.buttons["save-score"].waitForExistence(timeout: 5))
        // A short drag: 12 → a couple of points higher, the other pair gets the rest.
        let from = picker.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.6))
        from.press(forDuration: 0.05, thenDragTo: picker.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.2)))
        sleep(1)
        snap("02-score")
        app.buttons["save-score"].tap()

        // The list builds rows lazily: scroll until the button at the bottom is on screen.
        let next = app.buttons["next-round"]
        sleep(2)
        for _ in 0..<4 where !(next.exists && next.isHittable) { app.swipeUp() }
        XCTAssertTrue(next.isHittable)
        app.swipeUp() // all the way down: the whole button, not just its top edge
        sleep(1)
        snap("03-next-round")

        app.navigationBars.buttons.firstMatch.tap()
        let sunday = app.buttons.containing(NSPredicate(format: "label CONTAINS 'Sunday Mexicano'")).firstMatch
        for _ in 0..<4 where !(sunday.exists && sunday.isHittable) { app.swipeUp() }
        app.swipeUp() // both groups in full at the end of the list
        sleep(1)
        snap("04-start-again")

        sunday.tap()
        XCTAssertTrue(app.buttons["start-again"].waitForExistence(timeout: 5))
        sleep(1)
        snap("05-group")
    }

    private func snap(_ name: String) {
        let shot = XCTAttachment(screenshot: XCUIApplication().screenshot())
        shot.name = name
        shot.lifetime = .keepAlways
        add(shot)
    }
}
