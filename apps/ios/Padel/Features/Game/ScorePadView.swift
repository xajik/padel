@preconcurrency import PadelShared
import SwiftUI

/// Score entry sized for a sweaty thumb (web `ScorePad`): one tap for total-points games,
/// where the other side is filled in so both add up to the total.
struct ScorePadView: View {
    let game: LocalGame
    let round: Int
    let match: Int
    /// (scoreA, scoreB); (nil, nil) clears the match.
    let onSave: (Int?, Int?) -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var a: Int?
    @State private var b: Int?

    private var state: GameState { game.game.state }
    private var m: Match { state.rounds[round].matches[match] }
    private var scoring: Scoring { state.settings.scoring }
    private var total: Int { scoring.points?.intValue ?? 24 }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: Tokens.Space.s4) {
                    teams
                    switch scoring.type {
                    case .total: totalPad
                    case .firstTo: firstToPad
                    case .off: winLossPad
                    default: timedPad
                    }
                }
                .padding(Tokens.Space.s4)
            }
            .background(Palette.background)
            .navigationTitle("Court \(m.court)")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                if m.scoreA != nil {
                    ToolbarItem(placement: .destructiveAction) {
                        Button("Clear") { save(nil, nil) }.foregroundStyle(Palette.error)
                    }
                }
            }
        }
        .onAppear {
            a = m.scoreA?.intValue
            b = m.scoreB?.intValue
        }
    }

    private var teams: some View {
        HStack(alignment: .top) {
            side(state.team(m.teamA), a)
            Text("–").font(.score(Tokens.FontSize.xl3)).foregroundStyle(Palette.mutedForeground)
            side(state.team(m.teamB), b)
        }
        .foregroundStyle(Palette.foreground)
    }

    private func side(_ name: String, _ score: Int?) -> some View {
        VStack(spacing: Tokens.Space.s1) {
            Text(score.map(String.init) ?? "–").font(.score(Tokens.FontSize.score))
            Text(name).font(.geist(Tokens.FontSize.sm)).multilineTextAlignment(.center).foregroundStyle(Palette.mutedForeground)
        }
        .frame(maxWidth: .infinity)
    }

    /// Tap team A's points; team B gets the rest.
    private var totalPad: some View {
        VStack(alignment: .leading, spacing: Tokens.Space.s2) {
            Text("Points for \(state.team(m.teamA))").font(.geist(Tokens.FontSize.sm)).foregroundStyle(Palette.mutedForeground)
            numberGrid(0...total, selected: a) { v in save(v, total - v) }
        }
    }

    private var firstToPad: some View {
        VStack(alignment: .leading, spacing: Tokens.Space.s3) {
            Text("Who reached \(total)?").font(.geist(Tokens.FontSize.sm)).foregroundStyle(Palette.mutedForeground)
            HStack(spacing: Tokens.Space.s2) {
                choice(state.team(m.teamA), selected: a == total) { a = total; if b == total { b = nil } }
                choice(state.team(m.teamB), selected: b == total) { b = total; if a == total { a = nil } }
            }
            if a == total || b == total {
                Text("Loser's points").font(.geist(Tokens.FontSize.sm)).foregroundStyle(Palette.mutedForeground)
                numberGrid(0...(total - 1), selected: a == total ? b : a) { v in
                    if a == total { save(total, v) } else { save(v, total) }
                }
            }
        }
    }

    private var winLossPad: some View {
        HStack(spacing: Tokens.Space.s2) {
            choice("\(state.team(m.teamA)) won", selected: a == 1) { save(1, 0) }
            choice("Draw", selected: a == 0 && b == 0) { save(0, 0) }
            choice("\(state.team(m.teamB)) won", selected: b == 1) { save(0, 1) }
        }
    }

    private var timedPad: some View {
        VStack(spacing: Tokens.Space.s3) {
            Stepper(value: Binding(get: { a ?? 0 }, set: { a = $0 }), in: 0...99) { Text(state.team(m.teamA)).font(.geist(Tokens.FontSize.base)) }
            Stepper(value: Binding(get: { b ?? 0 }, set: { b = $0 }), in: 0...99) { Text(state.team(m.teamB)).font(.geist(Tokens.FontSize.base)) }
            Button("Save score") { save(a ?? 0, b ?? 0) }.buttonStyle(PrimaryButtonStyle())
        }
        .card()
    }

    private func numberGrid(_ range: ClosedRange<Int>, selected: Int?, pick: @escaping (Int) -> Void) -> some View {
        LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: Tokens.Space.s2), count: 5), spacing: Tokens.Space.s2) {
            ForEach(Array(range), id: \.self) { v in
                Button { pick(v) } label: {
                    Text("\(v)")
                        .font(.score(Tokens.FontSize.xl, weight: .medium))
                        .frame(maxWidth: .infinity, minHeight: 52)
                        .foregroundStyle(v == selected ? Palette.primaryForeground : Palette.foreground)
                        .background(v == selected ? Palette.primary : Palette.surface, in: RoundedRectangle(cornerRadius: Tokens.Radius.md))
                        .overlay(RoundedRectangle(cornerRadius: Tokens.Radius.md).stroke(Palette.border))
                }
                .buttonStyle(.plain)
                .accessibilityIdentifier("score-\(v)")
            }
        }
        .sensoryFeedback(.selection, trigger: selected)
    }

    private func choice(_ title: String, selected: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(title)
                .font(.geist(Tokens.FontSize.sm, weight: .semibold))
                .multilineTextAlignment(.center)
                .frame(maxWidth: .infinity, minHeight: 56)
                .foregroundStyle(selected ? Palette.primaryForeground : Palette.foreground)
                .background(selected ? Palette.primary : Palette.surface, in: RoundedRectangle(cornerRadius: Tokens.Radius.md))
                .overlay(RoundedRectangle(cornerRadius: Tokens.Radius.md).stroke(Palette.border))
        }
        .buttonStyle(.plain)
    }

    private func save(_ a: Int?, _ b: Int?) {
        onSave(a, b)
        dismiss()
    }
}
