@preconcurrency import PadelShared
import SwiftUI

/// Live games and "Start again" for recent groups. A single running game opens straight away.
struct WatchHomeView: View {
    @Environment(WatchModel.self) private var model
    @State private var autoOpened = false

    var body: some View {
        @Bindable var model = model
        NavigationStack(path: $model.path) {
            List {
                ForEach(model.live, id: \.code) { g in
                    NavigationLink(value: WatchRoute.game(g.code)) {
                        VStack(alignment: .leading) {
                            Text(g.game.name).lineLimit(1)
                            Text("Round \(Int(g.game.state.current) + 1) · \(g.canEdit ? "Live" : "Watching")")
                                .font(.footnote).foregroundStyle(.secondary)
                        }
                    }
                }
                if !model.groups.isEmpty {
                    Section("Start again") {
                        ForEach(Array(model.groups.enumerated()), id: \.offset) { i, group in
                            NavigationLink(value: WatchRoute.again(i)) {
                                VStack(alignment: .leading) {
                                    Text(group.name).lineLimit(1)
                                    Text("\(group.names.count) players · \(group.modeName)").font(.footnote).foregroundStyle(.secondary)
                                }
                            }
                        }
                    }
                }
                if model.games.isEmpty {
                    Text("Create a game on your iPhone or at padel-americanoo.com to score it here.")
                        .font(.footnote).foregroundStyle(.secondary).multilineTextAlignment(.center)
                        .listRowBackground(Color.clear)
                }
            }
            .navigationTitle("Americanoo")
            .navigationDestination(for: WatchRoute.self) { route in
                switch route {
                case .game(let code): WatchGameView(code: code)
                case .again(let i): StartAgainView(group: model.groups.indices.contains(i) ? model.groups[i] : nil)
                case .score(let code, let round, let match): WatchScoreView(code: code, round: round, match: match)
                }
            }
        }
        .onAppear {
            guard !autoOpened else { return }
            autoOpened = true
            if model.live.count == 1, let g = model.live.first { model.path = [.game(g.code)] }
        }
        .alert(model.banner ?? "", isPresented: Binding(get: { model.banner != nil }, set: { if !$0 { model.banner = nil } })) {
            Button("OK", role: .cancel) {}
        }
    }
}

struct StartAgainView: View {
    @Environment(WatchModel.self) private var model
    let group: RecentGroup?

    var body: some View {
        if let group {
            ScrollView {
                VStack(spacing: 8) {
                    Text(group.name).font(.headline).multilineTextAlignment(.center)
                    let courts = Int(group.settings.courts)
                    Text("\(group.modeName) · \(courts) court\(courts == 1 ? "" : "s")").font(.footnote).foregroundStyle(.secondary)
                    Text(group.names.joined(separator: ", ")).font(.footnote).multilineTextAlignment(.center)
                    Button("Start") { model.startAgain(group) }
                        .primaryButton()
                        .accessibilityIdentifier("start-again")
                        .padding(.top, 4)
                }
            }
            .navigationTitle("Start again")
        }
    }
}

/// The current round, one row per court; scroll to the bottom for the next round.
struct WatchGameView: View {
    @Environment(WatchModel.self) private var model
    let code: String
    @State private var confirmFinish = false

    var body: some View {
        if let local = model.game(code) {
            let state = local.game.state
            let round = state.rounds[Int(state.current)]
            let editable = local.canEdit && local.game.status == .live
            List {
                Section(state.roundLabel) {
                    ForEach(Array(round.matches.enumerated()), id: \.offset) { i, m in
                        NavigationLink(value: WatchRoute.score(code: local.code, round: Int(state.current), match: i)) {
                            MatchRow(state: state, match: m)
                        }
                        .accessibilityIdentifier("court-\(m.court)")
                        .disabled(!editable)
                    }
                }
                if !round.byes.isEmpty {
                    Text("Sitting out: " + round.byes.map(state.name).joined(separator: ", "))
                        .font(.footnote).foregroundStyle(.secondary).listRowBackground(Color.clear)
                }
                Section { footer(local, editable: editable) }
            }
            .navigationTitle(local.game.name)
            .onAppear { model.openCode = local.code }
            .onDisappear { model.openCode = nil }
            .confirmationDialog("Finish the game?", isPresented: $confirmFinish) {
                Button("Finish game", role: .destructive) { model.perform { try await model.repo.finish(code: local.code) } }
            }
        }
    }

    @ViewBuilder
    private func footer(_ local: LocalGame, editable: Bool) -> some View {
        if !local.canEdit {
            Text("Watching: open the organizer link on your iPhone to score.").font(.footnote).foregroundStyle(.secondary)
        } else if local.game.status == .done {
            Text("Game finished").font(.footnote).foregroundStyle(.secondary)
        } else {
            let state = local.game.state
            switch GameKt.advanceStatus(state: state) {
            case .ready:
                Button("Next round") { model.perform { try await model.repo.next(code: local.code) } }
                    .primaryButton()
                    .accessibilityIdentifier("next-round")
            case .finished:
                Button("Finish game") { confirmFinish = true }.primaryButton()
            default:
                let left = state.rounds[Int(state.current)].matches.filter { !StandingsKt.isScored(m: $0) }.count
                Text("Enter \(left) more score\(left == 1 ? "" : "s") for the next round")
                    .font(.footnote).foregroundStyle(.secondary)
            }
        }
    }
}

private struct MatchRow: View {
    let state: GameState
    let match: Match

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            HStack {
                Text("Court \(match.court)").font(.footnote).foregroundStyle(.secondary)
                Spacer()
                if let a = match.scoreA?.intValue, let b = match.scoreB?.intValue {
                    Text("\(a)–\(b)").font(.footnote.monospacedDigit().bold())
                }
            }
            Text(state.team(match.teamA)).lineLimit(2)
            Text(state.team(match.teamB)).lineLimit(2).foregroundStyle(.secondary)
        }
    }
}

/// Score for one match. Total points: turn the crown to the first pair's points, the other pair gets
/// the rest. First to N: pick the winner, then the loser's points. No scoring: pick the result.
struct WatchScoreView: View {
    @Environment(WatchModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    let code: String
    let round: Int
    let match: Int
    @State private var winnerA: Bool?
    @State private var firstScore: Int?

    var body: some View {
        if let local = model.game(code), local.game.state.rounds.indices.contains(round),
           local.game.state.rounds[round].matches.indices.contains(match) {
            let state = local.game.state
            let m = state.rounds[round].matches[match]
            let teamA = state.team(m.teamA)
            let teamB = state.team(m.teamB)
            let total = state.settings.scoring.points?.intValue ?? 24
            switch state.settings.scoring.type {
            case .total:
                PointsPicker(label: teamA, range: 0...total, initial: m.scoreA?.intValue ?? total / 2, other: { "\(teamB) · \(total - $0)" }) {
                    save(local.code, $0, total - $0)
                }
            case .firstTo:
                if let w = winnerA {
                    PointsPicker(label: w ? teamB : teamA, range: 0...(total - 1), initial: 0, other: { _ in "Loser's points" }) {
                        w ? save(local.code, total, $0) : save(local.code, $0, total)
                    }
                } else {
                    List {
                        Section("Who reached \(total)?") {
                            Button(teamA) { winnerA = true }
                            Button(teamB) { winnerA = false }
                        }
                    }
                }
            case .off:
                List {
                    Section("Result") {
                        Button("\(teamA) won") { save(local.code, 1, 0) }
                        Button("Draw") { save(local.code, 0, 0) }
                        Button("\(teamB) won") { save(local.code, 0, 1) }
                    }
                }
            default:
                if let a = firstScore {
                    PointsPicker(label: teamB, range: 0...99, initial: m.scoreB?.intValue ?? 0, other: { _ in "\(teamA) · \(a)" }) {
                        save(local.code, a, $0)
                    }
                } else {
                    PointsPicker(label: teamA, range: 0...99, initial: m.scoreA?.intValue ?? 0, other: { _ in "Next: \(teamB)" }) {
                        firstScore = $0
                    }
                }
            }
        }
    }

    private func save(_ code: String, _ a: Int, _ b: Int) {
        model.perform {
            _ = try await model.repo.score(code: code, roundIndex: Int32(round), matchIndex: Int32(match), scoreA: KotlinInt(int: Int32(a)), scoreB: KotlinInt(int: Int32(b)))
            dismiss()
        }
    }
}

private struct PointsPicker: View {
    let label: String
    let range: ClosedRange<Int>
    let other: (Int) -> String
    let onSave: (Int) -> Void
    @State private var value: Int

    init(label: String, range: ClosedRange<Int>, initial: Int, other: @escaping (Int) -> String, onSave: @escaping (Int) -> Void) {
        self.label = label
        self.range = range
        self.other = other
        self.onSave = onSave
        _value = State(initialValue: min(max(initial, range.lowerBound), range.upperBound))
    }

    var body: some View {
        VStack(spacing: 2) {
            Text(label).font(.footnote).lineLimit(1)
            Picker(label, selection: $value) {
                ForEach(range, id: \.self) { Text("\($0)").font(.title2.monospacedDigit()).tag($0) }
            }
            .pickerStyle(.wheel)
            .labelsHidden()
            Text(other(value)).font(.footnote).foregroundStyle(.secondary).lineLimit(1)
            Button("Save") { onSave(value) }.primaryButton().accessibilityIdentifier("save-score")
        }
        .id(label)
    }
}

extension View {
    /// The app's black & white primary button: white fill, black label.
    func primaryButton() -> some View {
        buttonStyle(.borderedProminent).tint(.white).foregroundStyle(.black)
    }
}
