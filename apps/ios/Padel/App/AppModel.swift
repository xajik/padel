@preconcurrency import PadelShared
import SwiftUI
import WidgetKit

enum Route: Hashable {
    case game(String)
    case newGame
}

/// App state: the shared Kotlin repository plus navigation, polling and the widget / Live
/// Activity mirrors. Everything runs on the main actor (Kotlin suspend calls require it).
@MainActor
@Observable
final class AppModel {
    /// Same deployment as the web app, so links, codes and QR codes work across both.
    static let baseURL = "https://padel-web.xajik0.workers.dev"

    let repo: GameRepository
    private(set) var games: [LocalGame] = []
    var path: [Route] = []
    var showJoin = false
    var joinPrefill: String?
    var banner: String?

    /// The game on screen: synced every few seconds, like the web's live view.
    var openCode: String?

    private var watcher: Cancellable?
    private var pollTask: Task<Void, Never>?
    private let activities = LiveActivityController()

    init(store: KeyValueStore = DefaultsStore.shared, baseURL: String = AppModel.baseURL) {
        // UI tests and screenshot runs start from a clean phone.
        if ProcessInfo.processInfo.arguments.contains("-reset") {
            store.write(key: GameRepository.companion.STORE_KEY, value: nil)
            SharedStore.writeSnapshot(nil)
        }
        repo = GameRepository(baseUrl: baseURL, store: store)
        games = repo.games.value as? [LocalGame] ?? []
        // Kotlin calls this on a coroutine thread: not main-actor isolated, so hop explicitly.
        watcher = repo.watch { @Sendable [weak self] list in
            nonisolated(unsafe) let games = list
            Task { @MainActor in self?.update(games) }
        }
        if ProcessInfo.processInfo.arguments.contains("-demo") {
            Task { await DemoData.seed(self) }
        }
    }

    func game(_ code: String) -> LocalGame? { games.first { $0.code == code } }

    private func update(_ list: [LocalGame]) {
        // Registration swaps a provisional code for the server's: follow it on screen.
        if let open = openCode, repo.resolve(code: open) != open {
            let code = repo.resolve(code: open)
            path = path.map { $0 == .game(open) ? .game(code) : $0 }
            openCode = code
        }
        games = list
        publishSnapshot()
    }

    // MARK: - Polling

    func startPolling() {
        pollTask?.cancel()
        pollTask = Task { [weak self] in
            var tick = 0
            while !Task.isCancelled {
                guard let self else { return }
                if let code = self.openCode { try? await self.repo.sync(code: code) }
                // Everything else (queued offline edits, followed games) less often.
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

    // MARK: - Actions

    func create(name: String, settings: PadelShared.Settings, names: [String], sides: [Side]?) async throws -> LocalGame {
        let g = try await repo.create(name: name, settings: settings, names: names, sides: sides)
        path = [.game(g.code)]
        return g
    }

    /// Join by code, pasted link or scanned QR. Returns an error message for the form.
    func join(_ input: String) async -> String? {
        do {
            let g = try await repo.join(input: input)
            showJoin = false
            path = [.game(g.code)]
            return nil
        } catch {
            return (error as NSError).kotlinMessage
        }
    }

    /// padel://g/CODE?key=…, https://…/g/CODE (universal link) or …/join?code=…
    func handle(url: URL) {
        guard GameLinks.shared.parse(input: url.absoluteString) != nil else { return }
        Task {
            if let message = await join(url.absoluteString) { banner = message }
        }
    }

    /// Runs an edit and turns engine errors into a banner instead of failing silently.
    func perform(_ edit: @escaping () async throws -> Void) {
        Task {
            do { try await edit() } catch { banner = (error as NSError).kotlinMessage }
        }
    }

    // MARK: - Widgets & Live Activity

    private func publishSnapshot() {
        let active = repo.activeGame()
        let snapshot = active.map(GameSnapshot.init)
        if snapshot != SharedStore.readSnapshot() {
            SharedStore.writeSnapshot(snapshot)
            WidgetCenter.shared.reloadAllTimelines()
        }
        activities.sync(with: games)
    }

    func toggleLiveActivity(for code: String) {
        guard let g = game(code) else { return }
        activities.toggle(GameSnapshot(g))
    }

    func isLiveActivityRunning(_ code: String) -> Bool { activities.isRunning(code) }
}

extension NSError {
    /// Kotlin exceptions arrive as NSError with the original message in userInfo.
    var kotlinMessage: String {
        if let e = userInfo["KotlinException"] as? KotlinThrowable, let m = e.message { return m }
        return localizedDescription
    }
}

extension GameSnapshot {
    init(_ local: LocalGame) {
        let g = local.game
        let state = g.state
        let names = Dictionary(uniqueKeysWithValues: state.players.map { ($0.id, $0.name) })
        let team = { (ids: [String]) in ids.map { names[$0] ?? "?" }.joined(separator: " & ") }
        let round = state.rounds[Int(state.current)]
        let table = StandingsKt.computeStandings(state: state, uptoRound: Int32.max)
        self.init(
            code: g.code,
            name: g.name,
            modeName: ModesKt.modeInfo(id: state.settings.mode).name,
            round: Int(state.current) + 1,
            plannedRounds: state.plannedRounds?.intValue,
            finished: g.status == .done,
            courts: round.matches.map {
                Court(court: Int($0.court), teamA: team($0.teamA), teamB: team($0.teamB), scoreA: $0.scoreA?.intValue, scoreB: $0.scoreB?.intValue)
            },
            sittingOut: round.byes.map { names[$0] ?? "?" },
            leaders: table.prefix(3).map { Leader(rank: Int($0.rank), name: $0.name, score: formatScore($0.score)) },
            updatedAt: Date(timeIntervalSince1970: Double(g.updatedAt) / 1000)
        )
    }
}

func formatScore(_ value: Double) -> String {
    value.rounded() == value ? String(Int(value)) : String(format: "%.1f", value)
}
