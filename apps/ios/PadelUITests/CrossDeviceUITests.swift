import XCTest

/// iPhone's part of the cross-device scenario driven by scripts/e2e-local.sh:
/// the script creates a game (web organizer), the iPhone scores court 1, Android scores court 2,
/// then the iPhone must show Android's score. Skipped unless E2E_CODE / E2E_KEY / E2E_STEP are set.
final class CrossDeviceUITests: XCTestCase {
    @MainActor
    func testCrossDeviceStep() throws {
        let env = ProcessInfo.processInfo.environment
        guard let code = env["E2E_CODE"], let key = env["E2E_KEY"], let step = env["E2E_STEP"] else {
            throw XCTSkip("Run through scripts/e2e-local.sh")
        }
        let app = XCUIApplication()
        app.launchArguments = ["-reset"] + TestServer.appArguments
        app.launch()
        app.open(URL(string: "americanoo://g/\(code)?key=\(key)")!)
        let court1 = app.descendants(matching: .any)["court-1"]
        XCTAssertTrue(court1.waitForExistence(timeout: 15))

        switch step {
        case "score-court-1":
            court1.tap()
            app.buttons["score-16"].tap()
            // Wait until the phone has synced (status line loses the "waiting" note).
            let pending = app.staticTexts.containing(NSPredicate(format: "label CONTAINS 'waiting'")).firstMatch
            sleep(2)
            XCTAssertFalse(pending.exists, "edit still queued")
        case "see-android":
            // Court 2 was scored 9–15 on Android; polling brings it here.
            let court2 = app.descendants(matching: .any)["court-2"]
            let predicate = NSPredicate(format: "label CONTAINS '9' AND label CONTAINS '15'")
            expectation(for: predicate, evaluatedWith: court2)
            waitForExpectations(timeout: 20)
        default:
            XCTFail("unknown step \(step)")
        }
    }
}
