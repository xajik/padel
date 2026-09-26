import XCTest

/// Starts the Live Activity from the game menu and checks it on the Home Screen / Dynamic Island.
final class LiveActivityUITests: XCTestCase {
    func testFollowOnLockScreenShowsLiveActivity() throws {
        let app = XCUIApplication()
        app.launchArguments = ["-reset"] + TestServer.appArguments
        app.launch()
        app.buttons["new-game"].tap()
        app.buttons["start-game"].tap()
        XCTAssertTrue(app.descendants(matching: .any)["court-1"].waitForExistence(timeout: 15))
        app.descendants(matching: .any)["court-1"].tap()
        app.buttons["score-14"].tap()

        app.buttons["game-menu"].tap()
        let follow = app.buttons["Follow on Lock Screen"]
        XCTAssertTrue(follow.waitForExistence(timeout: 5))
        follow.tap()
        // First run: iOS asks whether to allow Live Activities.
        let springboard = XCUIApplication(bundleIdentifier: "com.apple.springboard")
        let allow = springboard.buttons["Allow"]
        if allow.waitForExistence(timeout: 3) { allow.tap() }
        sleep(2)

        XCUIDevice.shared.press(.home)
        sleep(3)
        let shot = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
        shot.name = "live-activity-island"
        shot.lifetime = .keepAlways
        add(shot)

        // Long-press the island to expand the activity.
        let island = springboard.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.025))
        island.press(forDuration: 1.2)
        sleep(2)
        let expanded = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
        expanded.name = "live-activity-expanded"
        expanded.lifetime = .keepAlways
        add(expanded)
    }
}
