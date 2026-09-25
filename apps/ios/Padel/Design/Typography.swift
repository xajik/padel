import SwiftUI

/// Geist (bundled, variable weight) at token sizes. Uses Dynamic Type scaling relative to `textStyle`,
/// so text grows with the user's setting like the system font does.
extension Font {
    static func geist(_ size: CGFloat, weight: Font.Weight = .regular, relativeTo textStyle: Font.TextStyle = .body) -> Font {
        .custom(PadelFont.family, size: size, relativeTo: textStyle).weight(weight)
    }

    /// Tabular figures for scores and standings, so columns don't jitter while numbers change.
    static func score(_ size: CGFloat = Tokens.FontSize.score, weight: Font.Weight = .semibold) -> Font {
        .custom(PadelFont.family, size: size, relativeTo: .largeTitle).weight(weight).monospacedDigit()
    }
}
