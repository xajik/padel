@preconcurrency import PadelShared
import SwiftUI

/// Mirrors the web home (`/`): brand, primary actions, your games and the formats list.
struct HomeView: View {
    @Environment(AppModel.self) private var model

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Tokens.Space.s6) {
                header
                actions
                if !model.games.isEmpty { yourGames }
                formats
            }
            .padding(.horizontal, Tokens.Space.s4)
            .padding(.vertical, Tokens.Space.s6)
            .readableWidth()
        }
        .background(Palette.background)
        .refreshable { try? await model.repo.syncAll() }
        .toolbar {
            ToolbarItem(placement: .principal) {
                HStack(spacing: Tokens.Space.s2) {
                    PadelIcon.logo.view(22)
                    Text("Americanoo").font(.geist(Tokens.FontSize.lg, weight: .semibold, relativeTo: .headline))
                }
                .foregroundStyle(Palette.foreground)
                .accessibilityAddTraits(.isHeader)
            }
        }
        .navigationBarTitleDisplayMode(.inline)
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: Tokens.Space.s2) {
            Text("Run your padel session")
                .font(.geist(Tokens.FontSize.xl3, weight: .bold, relativeTo: .largeTitle))
            Text("Fair rotations, scores on court and a live leaderboard. No account needed.")
                .font(.geist(Tokens.FontSize.base))
                .foregroundStyle(Palette.mutedForeground)
        }
        .foregroundStyle(Palette.foreground)
    }

    private var actions: some View {
        VStack(spacing: Tokens.Space.s3) {
            Button { model.path.append(.newGame) } label: {
                Label("New game", systemImage: "plus")
            }
            .buttonStyle(PrimaryButtonStyle())
            .accessibilityIdentifier("new-game")

            Button {
                model.joinPrefill = nil
                model.showJoin = true
            } label: {
                Label("Join with a code", systemImage: "qrcode.viewfinder")
            }
            .buttonStyle(SecondaryButtonStyle())
            .accessibilityIdentifier("join-game")
        }
    }

    private var yourGames: some View {
        VStack(alignment: .leading, spacing: Tokens.Space.s3) {
            SectionTitle("Your games")
            ForEach(model.games, id: \.code) { g in
                Button { model.path.append(.game(g.code)) } label: { GameRow(game: g) }
                    .buttonStyle(.plain)
                    .contextMenu {
                        Button("Remove from this phone", systemImage: "trash", role: .destructive) { model.repo.remove(code: g.code) }
                    }
            }
        }
    }

    private var formats: some View {
        VStack(alignment: .leading, spacing: Tokens.Space.s3) {
            SectionTitle("Formats")
            ForEach(Engine.modes, id: \.name) { mode in
                ModeRow(mode: mode)
            }
        }
    }
}

private struct GameRow: View {
    let game: LocalGame

    var body: some View {
        let state = game.game.state
        HStack(spacing: Tokens.Space.s3) {
            state.mode.icon.view()
            VStack(alignment: .leading, spacing: Tokens.Space.s1) {
                Text(game.game.name).font(.geist(Tokens.FontSize.base, weight: .semibold))
                Text("\(state.mode.name) · \(state.players.count) players · \(game.game.status == .done ? "Finished" : state.roundLabel)")
                    .font(.geist(Tokens.FontSize.sm, relativeTo: .subheadline).monospacedDigit())
                    .foregroundStyle(Palette.mutedForeground)
                StatusLine(game: game)
            }
            Spacer(minLength: 0)
            Text(game.code)
                .font(.custom(PadelFont.mono, size: Tokens.FontSize.sm, relativeTo: .caption))
                .tracking(2)
                .foregroundStyle(Palette.mutedForeground)
            Image(systemName: "chevron.right").font(.footnote).foregroundStyle(Palette.mutedForeground)
        }
        .foregroundStyle(Palette.foreground)
        .card()
        .contentShape(Rectangle())
    }
}

private struct ModeRow: View {
    let mode: ModeInfo

    var body: some View {
        let estimate = Engine.estimate(Engine.defaultSettings(mode.id, players: 8), players: 8)
        HStack(alignment: .top, spacing: Tokens.Space.s3) {
            mode.icon.view()
            VStack(alignment: .leading, spacing: Tokens.Space.s1) {
                Text(mode.name).font(.geist(Tokens.FontSize.base, weight: .semibold))
                Text(mode.summary)
                    .font(.geist(Tokens.FontSize.sm, relativeTo: .subheadline))
                    .foregroundStyle(Palette.mutedForeground)
                Text("8 players · \(estimate.rounds) rounds · ~\(Engine.formatDuration(minutes: estimate.minutes))")
                    .font(.geist(Tokens.FontSize.xs, relativeTo: .caption).monospacedDigit())
                    .foregroundStyle(Palette.mutedForeground)
            }
            Spacer(minLength: 0)
        }
        .foregroundStyle(Palette.foreground)
        .card()
    }
}

#Preview {
    NavigationStack { HomeView() }.environment(AppModel())
}
