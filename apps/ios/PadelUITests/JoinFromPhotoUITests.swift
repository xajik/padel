import XCTest

/// The real user path on iOS: a screenshot showing only a game code is the newest photo; Join →
/// From photo → pick it in the system picker → the game opens. scripts/e2e-local.sh adds the photo
/// (simctl addmedia) and passes E2E_PHOTO_NAME, the game's name.
final class JoinFromPhotoUITests: XCTestCase {
    @MainActor
    func testJoinsGameFromPhotoWithCode() throws {
        guard let name = ProcessInfo.processInfo.environment["E2E_PHOTO_NAME"] else { throw XCTSkip("Run through scripts/e2e-local.sh") }
        let app = XCUIApplication()
        app.launchArguments = ["-reset"] + TestServer.appArguments
        app.launch()
        app.buttons["join-game"].tap()
        app.buttons["From photo"].tap()

        // The system picker's grid shows the newest photo first: the one the script just added.
        let newest = app.images.matching(identifier: "PXGGridLayout-Info").firstMatch
        XCTAssertTrue(newest.waitForExistence(timeout: 10))
        // The picker is a remote view: its cells report "not hittable", so tap by coordinate.
        newest.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)).tap()

        XCTAssertTrue(app.staticTexts[name].waitForExistence(timeout: 30))
    }
}
