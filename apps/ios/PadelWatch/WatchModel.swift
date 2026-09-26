@preconcurrency import PadelShared
import SwiftUI

/// Watch state over the shared Kotlin repository: its own copy of the games, synced with the server
/// directly (Wi‑Fi, cellular or through the iPhone), plus organizer keys from the iPhone app.
@MainActor
@Observable
final class WatchModel {
    static let baseURL = UserDefaults.standard.string(forKey: "baseURL") ?? "https://padel-americanoo.com"

    let repo: GameRepository
    private(set) var games: [LocalGame] = []
    var path: [WatchRoute] = []
    var banner: String?
    /// The game on screen, synced every few seconds.
    var openCode: String?

    private var watcher: Cancellable?
    private var pollTask: Task<Void, Never>?

    init() {
        let store = WatchStore()
        // UI tests start from a clean watch.
        if ProcessInfo.processInfo.arguments.contains("-reset") { store.write(key: GameRepository.companion.STORE_KEY, value: nil) }
        repo = GameRepository(baseUrl: WatchModel.baseURL, store: store)
        games = repo.games.value as? [LocalGame] ?? []
        watcher = repo.watch { @Sendable [weak self] list in
            nonisolated(unsafe) let games = list
            Task { @MainActor in self?.update(games) }
        }
        KeySync.shared.start { [weak self] json in
            Task { @MainActor in await self?.importKeys(json) }
        }
        #if DEBUG
        // `-join <organizer link>` adds a game without a paired iPhone (simulator runs).
        if let link = UserDefaults.standard.string(forKey: "join") {
            Task { _ = try? await repo.join(input: link) }
        }
        #endif
    }

    var live: [LocalGame] { games.filter { $0.game.status == .live } }
    var groups: [RecentGroup] { RecentGroupsKt.recentGroups(games: games, limit: 5) }

    func game(_ code: String) -> LocalGame? {
        let current = repo.resolve(code: code)
        return games.first { $0.code == current }
    }

    private func update(_ list: [LocalGame]) {
        games = list
        KeySync.shared.publish(repo.encodeKeys(keys: repo.editorKeys()))
    }

    private func importKeys(_ json: String) async {
        try? await repo.importKeys(keys: repo.decodeKeys(json: json))
    }

    func startPolling() {
        pollTask?.cancel()
        pollTask = Task { [weak self] in
            var tick = 0
            while !Task.isCancelled {
                guard let self else { return }
                if let code = self.openCode { try? await self.repo.sync(code: self.repo.resolve(code: code)) }
                if tick % 8 == 0 { try? await self.repo.syncAll() }
                tick += 1
                try? await Task.sleep(for: .seconds(4))
            }
        }
    }

    func stopPolling() {
        pollTask?.cancel()
        pollTask = nil
    }

    /// A new game with a recent group's players and settings, opened right away.
    func startAgain(_ group: RecentGroup) {
        perform {
            let g = try await self.repo.rematch(group: group)
            self.path = [.game(g.code)]
        }
    }

    /// Runs an edit; engine errors (not an organizer, round incomplete) show as a banner.
    func perform(_ edit: @escaping () async throws -> Void) {
        Task {
            do { try await edit() } catch { banner = (error as NSError).kotlinMessage }
        }
    }
}

enum WatchRoute: Hashable {
    case game(String)
    case again(Int)
    case score(code: String, round: Int, match: Int)
}

/// The watch's own storage (a watch can't read the iPhone's App Group).
final class WatchStore: NSObject, KeyValueStore, @unchecked Sendable {
    private let defaults = UserDefaults.standard
    func read(key: String) -> String? { defaults.string(forKey: key) }
    func write(key: String, value: String?) {
        if let value { defaults.set(value, forKey: key) } else { defaults.removeObject(forKey: key) }
    }
}

extension NSError {
    var kotlinMessage: String {
        if let e = userInfo["KotlinException"] as? KotlinThrowable, let m = e.message { return m }
        return localizedDescription
    }
}

extension GameState {
    func name(_ id: String) -> String { players.first { $0.id == id }?.name ?? "?" }
    func team(_ ids: [String]) -> String { ids.map(name).joined(separator: " & ") }
    var roundLabel: String {
        let n = Int(current) + 1
        if let planned = plannedRounds?.intValue { return "Round \(n) of \(planned)" }
        return "Round \(n)"
    }
}
