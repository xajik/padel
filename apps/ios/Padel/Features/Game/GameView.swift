@preconcurrency import PadelShared
import SwiftUI

/// The live game (`/g/{code}` on the web): current round, scoring, leaderboard and rounds.
struct GameView: View {
    let code: String
    @Environment(AppModel.self) private var model
    @State private var tab: Tab = .round
    @State private var viewedRound: Int?
    @State private var scoring: ScoreTarget?
    @State private var sharing = false
    @State private var confirmFinish = false

    enum Tab: String, CaseIterable { case round = "Round", leaderboard = "Leaderboard", rounds = "Rounds" }

    struct ScoreTarget: Identifiable {
        let round: Int
        let match: Int
        var id: String { "\(round)-\(match)" }
    }

    var body: some View {
        Group {
            if let game = model.game(code) {
                content(game)
            } else {
                ContentUnavailableView("Game not found", systemImage: "questionmark.circle", description: Text("It may have been removed from this phone."))
            }
        }
        .background(Palette.background)
        .navigationBarTitleDisplayMode(.inline)
        .onAppear { model.openCode = code }
        .onDisappear { if model.openCode == code { model.openCode = nil } }
    }

    @ViewBuilder
    private func content(_ game: LocalGame) -> some View {
        let state = game.game.state
        let current = Int(state.current)
        let shown = min(viewedRound ?? current, current)
        ScrollView {
            VStack(alignment: .leading, spacing: Tokens.Space.s5) {
                header(game)
                if game.game.status == .done { PodiumView(state: state) }
                Picker("View", selection: $tab) {
                    ForEach(Tab.allCases, id: \.self) { Text($0.rawValue).tag($0) }
                }
                .pickerStyle(.segmented)

                switch tab {
                case .round:
                    roundTab(game, shown: shown)
                case .leaderboard:
                    LeaderboardView(state: state, limit: nil)
                case .rounds:
                    RoundsHistory(state: state) { viewedRound = $0; tab = .round }
                }
                if let error = game.lastError {
                    Label(error, systemImage: "exclamationmark.triangle")
                        .font(.geist(Tokens.FontSize.sm))
                        .foregroundStyle(Palette.mutedForeground)
                }
            }
            .padding(.horizontal, Tokens.Space.s4)
            .padding(.vertical, Tokens.Space.s4)
            .readableWidth()
        }
        .refreshable { try? await model.repo.sync(code: code) }
        .safeAreaInset(edge: .bottom) {
            if game.canEdit && tab == .round { actionBar(game) }
        }
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Menu {
                    Button("Share game", systemImage: "square.and.arrow.up") { sharing = true }
                    if game.game.status == .live {
                        Button(model.isLiveActivityRunning(code) ? "Stop Live Activity" : "Follow on Lock Screen", systemImage: "livephoto") {
                            model.toggleLiveActivity(for: code)
                        }
                    }
                    if game.canEdit && game.game.status == .done {
                        Button("Reopen game", systemImage: "arrow.uturn.backward") { model.perform { try await model.repo.reopen(code: code) } }
                    }
                } label: {
                    Image(systemName: "ellipsis.circle")
                }
                .accessibilityIdentifier("game-menu")
            }
        }
        .sheet(item: $scoring) { target in
            ScorePadView(game: game, round: target.round, match: target.match) { a, b in
                model.perform { _ = try await model.repo.score(code: code, roundIndex: Int32(target.round), matchIndex: Int32(target.match), scoreA: a.map { KotlinInt(int: Int32($0)) }, scoreB: b.map { KotlinInt(int: Int32($0)) }) }
            }
            .presentationDetents([.medium, .large])
            .presentationDragIndicator(.visible)
        }
        .sheet(isPresented: $sharing) {
            ShareGameView(game: game, baseURL: model.repo.baseUrl)
                .presentationDetents([.large])
        }
        .confirmationDialog("Finish the game?", isPresented: $confirmFinish, titleVisibility: .visible) {
            Button("Finish and show the podium") { model.perform { try await model.repo.finish(code: code) } }
        } message: {
            Text("Results freeze for everyone following. You can reopen it later.")
        }
    }

    private func header(_ game: LocalGame) -> some View {
        let state = game.game.state
        return HStack(alignment: .top, spacing: Tokens.Space.s3) {
            VStack(alignment: .leading, spacing: Tokens.Space.s1) {
                Text(game.game.name)
                    .font(.geist(Tokens.FontSize.xl2, weight: .bold, relativeTo: .title))
                Text("\(state.mode.name) · \(state.players.count) players · \(state.settings.courts) court\(state.settings.courts == 1 ? "" : "s")")
                    .font(.geist(Tokens.FontSize.base))
                    .foregroundStyle(Palette.mutedForeground)
                StatusLine(game: game)
            }
            .foregroundStyle(Palette.foreground)
            Spacer(minLength: 0)
            Button { sharing = true } label: {
                HStack(spacing: Tokens.Space.s2) {
                    PadelIcon.share.view(18)
                    Text(game.needsCreate ? "Share" : game.code)
                        .font(.custom(PadelFont.mono, size: Tokens.FontSize.base, relativeTo: .body).weight(.semibold))
                        .tracking(2)
                }
                .padding(.horizontal, Tokens.Space.s3)
                .frame(minHeight: Tokens.touchTarget)
                .foregroundStyle(Palette.foreground)
                .overlay(RoundedRectangle(cornerRadius: Tokens.Radius.md).stroke(Palette.border))
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Share game \(game.code)")
            .accessibilityIdentifier("share-game")
        }
    }

    @ViewBuilder
    private func roundTab(_ game: LocalGame, shown: Int) -> some View {
        let state = game.game.state
        let round = state.rounds[shown]
        HStack {
            Text("Round \(shown + 1)").font(.geist(Tokens.FontSize.base, weight: .semibold))
                + Text(state.plannedRounds.map { " of \($0.intValue)" } ?? "").font(.geist(Tokens.FontSize.base)).foregroundColor(Palette.mutedForeground)
            Spacer()
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: Tokens.Space.s2) {
                    ForEach(0...Int(state.current), id: \.self) { i in
                        Button("\(i + 1)") { viewedRound = i }
                            .font(.geist(Tokens.FontSize.base).monospacedDigit())
                            .frame(width: Tokens.touchTarget, height: Tokens.touchTarget)
                            .foregroundStyle(i == shown ? Palette.primaryForeground : Palette.foreground)
                            .background(i == shown ? Palette.primary : Palette.background, in: RoundedRectangle(cornerRadius: Tokens.Radius.md))
                            .overlay(RoundedRectangle(cornerRadius: Tokens.Radius.md).stroke(Palette.border))
                            .buttonStyle(.plain)
                    }
                }
            }
            .defaultScrollAnchor(.trailing)
            .frame(maxWidth: 200)
        }
        .foregroundStyle(Palette.foreground)

        ForEach(Array(round.matches.enumerated()), id: \.offset) { i, match in
            CourtCard(state: state, match: match, editable: game.canEdit && game.game.status == .live) {
                scoring = ScoreTarget(round: shown, match: i)
            }
        }
        if !round.byes.isEmpty {
            HStack(spacing: Tokens.Space.s2) {
                PadelIcon.sitout.view(18)
                Text("Sitting out: ").font(.geist(Tokens.FontSize.sm, weight: .medium))
                    + Text(round.byes.map(state.name).joined(separator: ", ")).font(.geist(Tokens.FontSize.sm))
            }
            .foregroundStyle(Palette.mutedForeground)
        }
        SectionTitle("Leaderboard")
        LeaderboardView(state: state, limit: 4)
    }

    private func actionBar(_ game: LocalGame) -> some View {
        let status = GameKt.advanceStatus(state: game.game.state)
        return VStack(spacing: Tokens.Space.s2) {
            if game.game.status == .live {
                switch status {
                case .ready:
                    Button("Start round \(Int(game.game.state.current) + 2)") {
                        viewedRound = nil
                        model.perform { try await model.repo.next(code: code) }
                    }
                    .buttonStyle(PrimaryButtonStyle())
                    .accessibilityIdentifier("next-round")
                case .finished:
                    Button("Finish game") { confirmFinish = true }
                        .buttonStyle(PrimaryButtonStyle())
                        .accessibilityIdentifier("finish-game")
                default:
                    let left = game.game.state.rounds[Int(game.game.state.current)].matches.filter { !StandingsKt.isScored(m: $0) }.count
                    Text("Enter \(left) more score\(left == 1 ? "" : "s") to start the next round")
                        .font(.geist(Tokens.FontSize.sm))
                        .foregroundStyle(Palette.mutedForeground)
                        .frame(maxWidth: .infinity, minHeight: Tokens.touchTarget)
                }
            }
        }
        .padding(.horizontal, Tokens.Space.s4)
        .padding(.vertical, Tokens.Space.s2)
        .background(.bar)
    }
}

/// One court: both teams with their score boxes (web `CourtCard`).
struct CourtCard: View {
    let state: GameState
    let match: Match
    let editable: Bool
    let onScore: () -> Void

    private var scored: Bool { match.scoreA != nil && match.scoreB != nil }
    private var off: Bool { state.settings.scoring.type == .off }

    var body: some View {
        VStack(spacing: Tokens.Space.s2) {
            HStack {
                Label("Court \(match.court)", systemImage: "square.split.1x2")
                    .labelStyle(.titleAndIcon)
                Spacer()
                Text(scored ? "Final" : "In play")
            }
            .font(.geist(Tokens.FontSize.sm))
            .foregroundStyle(Palette.mutedForeground)

            row(match.teamA, score: match.scoreA?.intValue, won: scored && (match.scoreA?.intValue ?? 0) > (match.scoreB?.intValue ?? 0))
            HStack(spacing: Tokens.Space.s3) {
                Rectangle().fill(Palette.border).frame(height: 1)
                Text("vs").font(.geist(Tokens.FontSize.sm)).foregroundStyle(Palette.mutedForeground)
                Rectangle().fill(Palette.border).frame(height: 1)
            }
            row(match.teamB, score: match.scoreB?.intValue, won: scored && (match.scoreB?.intValue ?? 0) > (match.scoreA?.intValue ?? 0))
        }
        .card()
        .contentShape(Rectangle())
        .onTapGesture { if editable { onScore() } }
        .accessibilityElement(children: .combine)
        .accessibilityAddTraits(editable ? .isButton : [])
        .accessibilityHint(editable ? "Enter the score" : "")
        .accessibilityIdentifier("court-\(match.court)")
    }

    private func row(_ team: [String], score: Int?, won: Bool) -> some View {
        let lost = scored && !won && match.scoreA != match.scoreB
        return HStack(spacing: Tokens.Space.s3) {
            Text(state.team(team))
                .font(.geist(Tokens.FontSize.lg, weight: won ? .semibold : .regular))
                .foregroundStyle(lost ? Palette.mutedForeground : Palette.foreground)
                .frame(maxWidth: .infinity, alignment: .leading)
            Text(score.map { off ? ($0 == 1 ? "W" : "–") : String($0) } ?? "–")
                .font(.score(Tokens.FontSize.xl2))
                .frame(width: 56, height: 48)
                .foregroundStyle(won ? Palette.primaryForeground : Palette.foreground)
                .background(won ? Palette.primary : Palette.muted, in: RoundedRectangle(cornerRadius: Tokens.Radius.md))
                // Only the editable view looks tappable (matches the web fix for view-only boxes).
                .overlay(RoundedRectangle(cornerRadius: Tokens.Radius.md).stroke(editable && score == nil ? Palette.border : .clear, style: StrokeStyle(lineWidth: 1, dash: [4])))
        }
    }
}

struct LeaderboardView: View {
    let state: GameState
    let limit: Int?

    var body: some View {
        let all = StandingsKt.computeStandings(state: state, uptoRound: Int32.max)
        let rows = limit.map { Array(all.prefix($0)) } ?? all
        let label = state.settings.leaderboard == .wins || state.settings.scoring.type == .off ? "Wins" : state.settings.leaderboard == .average ? "Avg" : "Pts"
        VStack(spacing: 0) {
            HStack {
                Text("#").frame(width: 28, alignment: .leading)
                Text("Player")
                Spacer()
                if limit == nil { Text("P").frame(width: 28); Text("+/−").frame(width: 44) }
                Text(label).frame(width: 52, alignment: .trailing)
            }
            .font(.geist(Tokens.FontSize.sm))
            .foregroundStyle(Palette.mutedForeground)
            .padding(.horizontal, Tokens.Space.s4)
            .padding(.vertical, Tokens.Space.s3)
            ForEach(rows, id: \.id) { s in
                Divider().overlay(Palette.border)
                HStack {
                    Text("\(s.rank)").frame(width: 28, alignment: .leading).monospacedDigit()
                    Text(s.name).font(.geist(Tokens.FontSize.base, weight: .semibold)).lineLimit(1)
                    movement(Int(s.movement))
                    Spacer()
                    if limit == nil {
                        Text("\(s.played)").frame(width: 28).foregroundStyle(Palette.mutedForeground)
                        Text(s.diff > 0 ? "+\(s.diff)" : "\(s.diff)").frame(width: 44).foregroundStyle(Palette.mutedForeground)
                    }
                    Text(formatScore(s.score)).font(.score(Tokens.FontSize.lg)).frame(width: 52, alignment: .trailing)
                }
                .font(.geist(Tokens.FontSize.base).monospacedDigit())
                .foregroundStyle(Palette.foreground)
                .padding(.horizontal, Tokens.Space.s4)
                .frame(minHeight: Tokens.touchTarget)
                .accessibilityElement(children: .combine)
            }
        }
        .background(Palette.surface, in: RoundedRectangle(cornerRadius: Tokens.Radius.lg))
        .overlay(RoundedRectangle(cornerRadius: Tokens.Radius.lg).stroke(Palette.border))
    }

    /// Colour only for rank movement, always with an arrow (PRD §3a).
    @ViewBuilder
    private func movement(_ m: Int) -> some View {
        if m != 0 {
            Label("\(abs(m))", systemImage: m > 0 ? "arrow.up" : "arrow.down")
                .labelStyle(.titleAndIcon)
                .font(.geist(Tokens.FontSize.xs, weight: .semibold))
                .foregroundStyle(m > 0 ? Palette.up : Palette.down)
                .accessibilityLabel(m > 0 ? "up \(m)" : "down \(-m)")
        }
    }
}

struct PodiumView: View {
    let state: GameState

    var body: some View {
        let top = Array(StandingsKt.computeStandings(state: state, uptoRound: Int32.max).prefix(3))
        HStack(alignment: .bottom, spacing: Tokens.Space.s2) {
            ForEach([1, 0, 2].filter { $0 < top.count }, id: \.self) { i in
                VStack(spacing: Tokens.Space.s2) {
                    if i == 0 { PadelIcon.podium.view(28) }
                    Text(top[i].name).font(.geist(Tokens.FontSize.sm, weight: .semibold)).lineLimit(2).multilineTextAlignment(.center)
                    Text(formatScore(top[i].score)).font(.score(Tokens.FontSize.xl)).foregroundStyle(i == 0 ? Palette.primaryForeground : Palette.foreground)
                        .frame(maxWidth: .infinity, minHeight: [96, 72, 56][i])
                        .background(i == 0 ? Palette.primary : Palette.muted, in: RoundedRectangle(cornerRadius: Tokens.Radius.md))
                    Text(["1st", "2nd", "3rd"][i]).font(.geist(Tokens.FontSize.xs)).foregroundStyle(Palette.mutedForeground)
                }
                .frame(maxWidth: .infinity)
            }
        }
        .foregroundStyle(Palette.foreground)
        .card()
    }
}

struct RoundsHistory: View {
    let state: GameState
    let open: (Int) -> Void

    var body: some View {
        VStack(spacing: Tokens.Space.s2) {
            ForEach(Array(state.rounds.prefix(Int(state.current) + 1).enumerated()), id: \.offset) { i, r in
                Button { open(i) } label: {
                    VStack(alignment: .leading, spacing: Tokens.Space.s1) {
                        Text("Round \(i + 1)").font(.geist(Tokens.FontSize.base, weight: .semibold))
                        ForEach(Array(r.matches.enumerated()), id: \.offset) { _, m in
                            HStack {
                                Text("\(state.team(m.teamA))  vs  \(state.team(m.teamB))").lineLimit(1)
                                Spacer()
                                Text(m.scoreA.map { "\($0)–\(m.scoreB?.intValue ?? 0)" } ?? "–").monospacedDigit()
                            }
                            .font(.geist(Tokens.FontSize.sm))
                            .foregroundStyle(Palette.mutedForeground)
                        }
                    }
                    .foregroundStyle(Palette.foreground)
                    .card(padding: Tokens.Space.s3)
                }
                .buttonStyle(.plain)
            }
        }
    }
}
