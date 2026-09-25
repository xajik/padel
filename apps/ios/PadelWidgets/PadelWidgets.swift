import SwiftUI
import WidgetKit

@main
struct PadelWidgets: WidgetBundle {
    var body: some Widget {
        ActiveGameWidget()
        GameLiveActivity()
    }
}

// MARK: - Home & Lock Screen widget

struct GameEntry: TimelineEntry {
    let date: Date
    let snapshot: GameSnapshot?
}

struct ActiveGameProvider: TimelineProvider {
    func placeholder(in context: Context) -> GameEntry { GameEntry(date: .now, snapshot: .sample) }

    func getSnapshot(in context: Context, completion: @escaping (GameEntry) -> Void) {
        completion(GameEntry(date: .now, snapshot: context.isPreview ? (SharedStore.readSnapshot() ?? .sample) : SharedStore.readSnapshot()))
    }

    /// The app reloads timelines whenever the game changes; this is only a fallback refresh.
    func getTimeline(in context: Context, completion: @escaping (Timeline<GameEntry>) -> Void) {
        let entry = GameEntry(date: .now, snapshot: SharedStore.readSnapshot())
        completion(Timeline(entries: [entry], policy: .after(.now + 15 * 60)))
    }
}

struct ActiveGameWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "ActiveGame", provider: ActiveGameProvider()) { entry in
            ActiveGameWidgetView(entry: entry)
                .containerBackground(for: .widget) { WidgetPalette.background }
                .widgetURL(entry.snapshot?.url)
        }
        .configurationDisplayName("Current game")
        .description("Round, courts and leaders of the game you're running or following.")
        .supportedFamilies([.systemSmall, .systemMedium, .accessoryRectangular, .accessoryInline])
    }
}

/// Reads the family from the environment (read-only in SwiftUI) and hands it to the content view,
/// which tests can render for each family.
struct ActiveGameWidgetView: View {
    let entry: GameEntry
    @Environment(\.widgetFamily) private var family

    var body: some View { ActiveGameWidgetContent(snapshot: entry.snapshot, family: family) }
}

// MARK: - Live Activity

struct GameLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: GameActivityAttributes.self) { context in
            LockScreenView(s: context.state.snapshot)
                .padding(16)
                .activityBackgroundTint(WidgetPalette.background)
                .activitySystemActionForegroundColor(WidgetPalette.foreground)
                .widgetURL(context.state.snapshot.url)
        } dynamicIsland: { context in
            let s = context.state.snapshot
            return DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    Label(s.roundLabel, image: "icon-scoreboard")
                        .font(.caption.weight(.semibold)).monospacedDigit()
                        .lineLimit(1).minimumScaleFactor(0.8)
                        .padding(.leading, 6)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Text("\(s.scoredCourts)/\(s.courts.count) scored")
                        .font(.caption).monospacedDigit()
                        .lineLimit(1).minimumScaleFactor(0.8)
                        .padding(.trailing, 6)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    VStack(alignment: .leading, spacing: 4) {
                        ForEach(s.courts.prefix(2), id: \.court) { CourtLine(court: $0) }
                        if let leader = s.leaders.first {
                            Text("Leader: \(leader.name) · \(leader.score)").font(.caption2).foregroundStyle(.secondary)
                        }
                    }
                    .padding(.horizontal, 6)
                }
            } compactLeading: {
                Image("icon-racket").resizable().frame(width: 16, height: 16)
            } compactTrailing: {
                Text("R\(s.round)").font(.caption.weight(.semibold)).monospacedDigit()
            } minimal: {
                Text("\(s.round)").font(.caption.weight(.semibold)).monospacedDigit()
            }
            .widgetURL(s.url)
        }
    }
}

