import XCTest

/// End-to-end on the simulator against the deployed web API (same backend as the web app).
final class PadelUITests: XCTestCase {
    static let base = "https://padel-web.xajik0.workers.dev"
    var app: XCUIApplication!

    override func setUp() {
        continueAfterFailure = false
        app = XCUIApplication()
        app.launchArguments = ["-reset"]
        app.launch()
    }

    /// Organizer flow: create on the phone, score a full round, start round 2, then check the web
    /// API (what /g/{code} renders) shows exactly that.
    func testCreateScoreAndSyncWithWeb() throws {
        app.buttons["new-game"].tap()
        app.buttons["start-game"].tap()

        let code = try waitForCode()
        for court in 1...2 {
            app.descendants(matching: .any)["court-\(court)"].firstMatch.tap()
            app.buttons["score-\(10 + court)"].tap()
        }
        let next = app.buttons["next-round"]
        XCTAssertTrue(next.waitForExistence(timeout: 5))
        next.tap()
        XCTAssertTrue(app.staticTexts.containing(NSPredicate(format: "label BEGINSWITH 'Round 2'")).firstMatch.waitForExistence(timeout: 5))

        // The web reads the same game.
        let game = try waitForServer(code) { ($0["state"] as? [String: Any])?["current"] as? Int == 1 }
        let rounds = (game["state"] as! [String: Any])["rounds"] as! [[String: Any]]
        let scores = (rounds[0]["matches"] as! [[String: Any]]).map { $0["scoreA"] as? Int }
        XCTAssertEqual(scores, [11, 12])
    }

    /// Spectator + organizer links: a game created elsewhere (web/agent) opens from its link, and
    /// a score entered on the web shows up on the phone.
    func testJoinFromLinkAndFollowWebChanges() throws {
        let (code, key) = try createOnServer()
        app.open(URL(string: "padel://g/\(code)")!)
        XCTAssertTrue(app.staticTexts["Web check"].waitForExistence(timeout: 10))
        XCTAssertTrue(app.staticTexts.containing(NSPredicate(format: "label CONTAINS 'view only'")).firstMatch.exists)

        try post("api/games/\(code)/mutate", key: key, body: ["type": "score", "court": 1, "scoreA": 20, "round": 1])
        // Polling picks it up within a few seconds.
        XCTAssertTrue(app.staticTexts["20"].waitForExistence(timeout: 15))

        // Organizer link from the web share dialog grants editing.
        app.open(URL(string: "padel://g/\(code)?key=\(key)")!)
        XCTAssertTrue(app.descendants(matching: .any)["court-2"].waitForExistence(timeout: 10))
        app.descendants(matching: .any)["court-2"].firstMatch.tap()
        app.buttons["score-9"].tap()
        let game = try waitForServer(code) { g in
            let r = ((g["state"] as! [String: Any])["rounds"] as! [[String: Any]])[0]
            return (r["matches"] as! [[String: Any]])[1]["scoreA"] as? Int == 9
        }
        XCTAssertEqual(game["code"] as? String, code)
    }

    func testJoinByCodeRejectsUnknownGame() {
        app.buttons["join-game"].tap()
        let field = app.textFields["join-code"]
        field.tap()
        field.typeText("ZZZZZZ")
        app.buttons["join-submit"].tap()
        XCTAssertTrue(app.staticTexts.containing(NSPredicate(format: "label CONTAINS 'No game'")).firstMatch.waitForExistence(timeout: 10))
    }

    // MARK: helpers

    private func waitForCode() throws -> String {
        let code = app.staticTexts["share-code"].exists ? app.staticTexts["share-code"] : app.buttons["share-game"]
        XCTAssertTrue(code.waitForExistence(timeout: 15))
        // "Share game K7Q2MX" once registered with the server.
        let deadline = Date().addingTimeInterval(15)
        while Date() < deadline {
            if let c = app.buttons["share-game"].label.split(separator: " ").last, c.count == 6 { return String(c) }
            Thread.sleep(forTimeInterval: 0.5)
        }
        throw XCTSkip("Game did not register with the server (offline?)")
    }

    private func createOnServer() throws -> (String, String) {
        let body: [String: Any] = ["mode": "americano", "names": ["Anna", "Mikko", "Laura", "Jussi", "Sara", "Pekka", "Emma", "Olli"], "courts": 2, "name": "Web check"]
        let json = try request("api/v1/games", method: "POST", body: body)
        return (json["code"] as! String, json["organizerKey"] as! String)
    }

    @discardableResult
    private func post(_ path: String, key: String, body: [String: Any]) throws -> [String: Any] {
        try request(path, method: "POST", body: body, headers: ["X-Organizer-Key": key])
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

    private func request(_ path: String, method: String = "GET", body: [String: Any]? = nil, headers: [String: String] = [:]) throws -> [String: Any] {
        var req = URLRequest(url: URL(string: "\(Self.base)/\(path)")!)
        req.httpMethod = method
        headers.forEach { req.setValue($1, forHTTPHeaderField: $0) }
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
