import PadelShared

/// Swift-side conveniences over the shared Kotlin engine (apps/mobile-shared).
/// Top-level Kotlin functions surface as `<File>Kt` classes; keep call sites tidy here.
enum Engine {
    static var modes: [ModeInfo] { ModesKt.MODES }

    static func defaultSettings(_ mode: ModeId, players: Int) -> PadelShared.Settings {
        ModesKt.defaultSettings(mode: mode, playerCount: Int32(players))
    }

    static func estimate(_ settings: PadelShared.Settings, players: Int) -> Estimate {
        EstimateKt.estimate(settings: settings, playerCount: Int32(players))
    }

    static func formatDuration(minutes: Int32) -> String {
        EstimateKt.formatDuration(minutes: minutes)
    }
}
