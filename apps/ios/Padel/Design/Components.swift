@preconcurrency import PadelShared
import SwiftUI

struct PrimaryButtonStyle: ButtonStyle {
    @Environment(\.isEnabled) private var isEnabled

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.geist(Tokens.FontSize.base, weight: .semibold))
            .frame(maxWidth: .infinity, minHeight: Tokens.touchTarget + 4)
            .foregroundStyle(Palette.primaryForeground)
            .background(Palette.primary.opacity(isEnabled ? 1 : 0.35), in: RoundedRectangle(cornerRadius: Tokens.Radius.md))
            .opacity(configuration.isPressed ? 0.85 : 1)
            .animation(.easeOut(duration: Tokens.motionFast), value: configuration.isPressed)
            .sensoryFeedback(.impact(weight: .light), trigger: configuration.isPressed) { _, pressed in pressed }
    }
}

struct SecondaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.geist(Tokens.FontSize.base, weight: .semibold))
            .frame(maxWidth: .infinity, minHeight: Tokens.touchTarget + 4)
            .foregroundStyle(Palette.foreground)
            .background(configuration.isPressed ? Palette.muted : Palette.background, in: RoundedRectangle(cornerRadius: Tokens.Radius.md))
            .overlay(RoundedRectangle(cornerRadius: Tokens.Radius.md).stroke(Palette.border))
            .animation(.easeOut(duration: Tokens.motionFast), value: configuration.isPressed)
    }
}

/// Bordered surface card, the web's `Card`.
struct CardModifier: ViewModifier {
    var padding: CGFloat = Tokens.Space.s4

    func body(content: Content) -> some View {
        content
            .padding(padding)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Palette.surface, in: RoundedRectangle(cornerRadius: Tokens.Radius.lg))
            .overlay(RoundedRectangle(cornerRadius: Tokens.Radius.lg).stroke(Palette.border))
    }
}

extension View {
    /// iPad: a readable centred column, like the web's max-w container.
    func readableWidth() -> some View { frame(maxWidth: 720).frame(maxWidth: .infinity) }

    func card(padding: CGFloat = Tokens.Space.s4) -> some View { modifier(CardModifier(padding: padding)) }
}

struct SectionTitle: View {
    let text: String
    var trailing: String?

    init(_ text: String, trailing: String? = nil) {
        self.text = text
        self.trailing = trailing
    }

    var body: some View {
        HStack {
            Text(text).font(.geist(Tokens.FontSize.lg, weight: .semibold, relativeTo: .headline))
            Spacer()
            if let trailing {
                Text(trailing).font(.geist(Tokens.FontSize.sm)).foregroundStyle(Palette.mutedForeground)
            }
        }
        .foregroundStyle(Palette.foreground)
    }
}

/// *Live · view only*, *Synced*, *Offline — 3 changes waiting* (FR-2.10).
struct StatusLine: View {
    let game: LocalGame

    var body: some View {
        HStack(spacing: Tokens.Space.s2) {
            Circle().fill(dotColor).frame(width: 7, height: 7)
            Text(text)
        }
        .font(.geist(Tokens.FontSize.sm, relativeTo: .subheadline))
        .foregroundStyle(Palette.mutedForeground)
        .accessibilityElement(children: .combine)
    }

    private var text: String {
        var parts = [game.game.status == .done ? "Finished" : "Live"]
        if !game.canEdit { parts.append("view only") }
        switch game.syncState {
        case .localOnly: parts.append("on this phone — shares when online")
        case .pending: parts.append("offline · \(game.pending.count) change\(game.pending.count == 1 ? "" : "s") waiting")
        default: break
        }
        return parts.joined(separator: " · ")
    }

    private var dotColor: Color {
        if game.game.status == .done { return Palette.mutedForeground }
        return game.syncState == .synced ? Palette.foreground : Palette.mutedForeground
    }
}

extension ModeInfo {
    /// Same mapping as the web mode cards.
    var icon: PadelIcon {
        switch id {
        case .americano: .rotate
        case .teamAmericano, .teamMexicano: .pair
        case .mexicano: .ladder
        case .mixicano: .mixed
        case .beatTheBox: .box
        case .upAndDown, .teamUpAndDown: .updown
        default: .racket
        }
    }
}

extension PadelIcon {
    func view(_ size: CGFloat = Tokens.iconSize) -> some View {
        image.resizable().scaledToFit().frame(width: size, height: size)
    }
}

extension GameState {
    func name(_ id: String) -> String { players.first { $0.id == id }?.name ?? "?" }
    func team(_ ids: [String]) -> String { ids.map(name).joined(separator: " & ") }
    var mode: ModeInfo { ModesKt.modeInfo(id: settings.mode) }
    var roundLabel: String {
        let n = Int(current) + 1
        if let planned = plannedRounds?.intValue { return "Round \(n) of \(planned)" }
        return "Round \(n)"
    }
}
