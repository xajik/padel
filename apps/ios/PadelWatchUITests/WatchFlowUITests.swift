import XCTest

/// The watch flow against the deployed API (PADEL_BASE_URL overrides): open a live game, score a
/// court (the other pair gets the rest of the points), start the next round and start a group again.
final class WatchFlowUITests: XCTestCase {
    static let base = ProcessInfo.processInfo.environment["PADEL_BASE_URL"] ?? "https://padel-americanoo.com"

    override func setUp() { continueAfterFailure = false }

    func testScoreNextRoundAndStartAgain() throws {
        let body: [String: Any] = ["mode": "americano", "names": ["Anna", "Mikko", "Laura", "Jussi", "Sara", "Pekka", "Emma", "Olli"], "courts": 2, "name": "Watch check"]
        let created = try request("api/v1/games", method: "POST", body: body)
        let code = created["code"] as! String
        let link = created["organizerUrl"] as! String

        let app = XCUIApplication()
        app.launchArguments = ["-reset", "-join", link] + (ProcessInfo.processInfo.environment["PADEL_BASE_URL"].map { ["-baseURL", $0] } ?? [])
        app.launch()
        keep(app, "home")
        // The join finishes after launch; relaunch opens the single live game directly.
        Thread.sleep(forTimeInterval: 5)
        app.terminate()
        app.launchArguments = []
        app.launch()

        for court in [1, 2] {
            let row = app.descendants(matching: .any)["court-\(court)"]
            XCTAssertTrue(row.waitForExistence(timeout: 20), app.debugDescription)
            row.tap()
            let save = app.buttons["save-score"]
            XCTAssertTrue(save.waitForExistence(timeout: 5))
            if court == 1 { keep(app, "score") }
            save.tap()
        }
        let game = try waitForServer(code) { g in
            let matches = ((g["state"] as! [String: Any])["rounds"] as! [[String: Any]])[0]["matches"] as! [[String: Any]]
            return matches.allSatisfy { ($0["scoreA"] as? Int) == 12 && ($0["scoreB"] as? Int) == 12 }
        }
        XCTAssertNotNil(game["code"])

        let next = app.buttons["next-round"]
        for _ in 0..<4 where !next.isHittable { app.swipeUp() }
        keep(app, "next-round")
        next.tap()
        _ = try waitForServer(code) { g in (g["state"] as! [String: Any])["current"] as? Int == 1 }
        // Round 2's pairs replace round 1's: court 1 is unscored again.
        XCTAssertTrue(unscored(app).waitForExistence(timeout: 10), app.debugDescription)

        // Back home, start the same group again: a new editable game on the server.
        app.navigationBars.buttons.firstMatch.tap()
        let group = app.buttons.containing(NSPredicate(format: "label CONTAINS '8 players'")).firstMatch
        for _ in 0..<4 where !group.isHittable { app.swipeUp() }
        group.tap()
        let start = app.buttons["start-again"]
        XCTAssertTrue(start.waitForExistence(timeout: 5))
        start.tap()
        XCTAssertTrue(unscored(app).waitForExistence(timeout: 20), app.debugDescription)
        XCTAssertTrue(app.staticTexts["Watch check"].exists)
    }

    private func keep(_ app: XCUIApplication, _ name: String) {
        let shot = XCTAttachment(screenshot: app.screenshot())
        shot.name = name
        shot.lifetime = .keepAlways
        add(shot)
    }

    /// Court 1's row without a score (scored rows end with "12–12").
    private func unscored(_ app: XCUIApplication) -> XCUIElement {
        app.buttons.matching(NSPredicate(format: "identifier == 'court-1' AND NOT (label CONTAINS '–')")).firstMatch
    }

    private func waitForServer(_ code: String, until: ([String: Any]) -> Bool) throws -> [String: Any] {
        let deadline = Date().addingTimeInterval(20)
        while Date() < deadline {
            let g = try request("api/games/\(code)")["game"] as! [String: Any]
            if until(g) { return g }
            Thread.sleep(forTimeInterval: 1)
        }
        XCTFail("Server never reached the expected state for \(code)")
        return [:]
    }

    private func request(_ path: String, method: String = "GET", body: [String: Any]? = nil) throws -> [String: Any] {
        var req = URLRequest(url: URL(string: "\(Self.base)/\(path)")!)
        req.httpMethod = method
        if let body {
            req.setValue("application/json", forHTTPHeaderField: "Content-Type")
            req.httpBody = try JSONSerialization.data(withJSONObject: body)
        }
        var result: Data?
        let done = expectation(description: path)
        URLSession.shared.dataTask(with: req) { data, _, _ in result = data; done.fulfill() }.resume()
        wait(for: [done], timeout: 20)
        return try JSONSerialization.jsonObject(with: result ?? Data()) as? [String: Any] ?? [:]
    }
}
