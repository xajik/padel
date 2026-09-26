import XCTest

/// Which game server the UI tests (and the app they launch) talk to.
/// Default: the deployed API. Local stack: `make e2e-local` sets PADEL_BASE_URL=http://localhost:3100.
enum TestServer {
    static let base = ProcessInfo.processInfo.environment["PADEL_BASE_URL"] ?? "https://padel-web.xajik0.workers.dev"

    /// Launch arguments that point the app at the same server.
    static var appArguments: [String] {
        ProcessInfo.processInfo.environment["PADEL_BASE_URL"] == nil ? [] : ["-baseURL", base]
    }
}
