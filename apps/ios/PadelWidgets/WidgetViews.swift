import SwiftUI
import WidgetKit

// Widget and Live Activity views, separate from the widget bundle so the app's tests can render them.

struct ActiveGameWidgetContent: View {
    let snapshot: GameSnapshot?
    let family: WidgetFamily

    var body: some View {
        if let s = snapshot {
            switch family {
            case .accessoryInline:
                Text("\(s.name) · \(s.roundLabel)")
            case .accessoryRectangular:
                VStack(alignment: .leading, spacing: 1) {
                    Text(s.name).font(.headline).widgetAccentable()
                    Text("\(s.roundLabel) · \(s.scoredCourts)/\(s.courts.count) scored")
                    if let leader = s.leaders.first { Text("1. \(leader.name) \(leader.score)") }
                }
                .font(.caption)
            case .systemMedium:
                // Same layout as the Lock Screen Live Activity: header, full-width courts, leaders.
                LockScreenView(s: s)
            default:
                VStack(alignment: .leading, spacing: 6) {
                    header(s)
                    Spacer(minLength: 0)
                    LeadersView(leaders: Array(s.leaders.prefix(3)))
                }
            }
        } else {
            VStack(alignment: .leading, spacing: 6) {
                Image("icon-logo").resizable().frame(width: 22, height: 22)
                Text("No game running").font(.custom("Geist", size: 15).weight(.semibold))
                Text("Start or join a game in Padel.").font(.custom("Geist", size: 12)).foregroundStyle(WidgetPalette.muted)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }

    private func header(_ s: GameSnapshot) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(s.name).font(.custom("Geist", size: 15).weight(.semibold)).lineLimit(2).minimumScaleFactor(0.85)
            Text(s.finished ? "Finished" : s.roundLabel).font(.custom("Geist", size: 12)).foregroundStyle(WidgetPalette.muted).monospacedDigit()
            Text("\(s.scoredCourts)/\(s.courts.count) courts scored").font(.custom("Geist", size: 12)).foregroundStyle(WidgetPalette.muted).monospacedDigit()
        }
        .foregroundStyle(WidgetPalette.foreground)
    }
}

struct LockScreenView: View {
    let s: GameSnapshot

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image("icon-logo").resizable().frame(width: 20, height: 20)
                Text(s.name).font(.custom("Geist", size: 16).weight(.semibold)).lineLimit(1)
                Spacer()
                Text(s.finished ? "Finished" : s.roundLabel).font(.custom("Geist", size: 13)).monospacedDigit().foregroundStyle(WidgetPalette.muted)
            }
            ForEach(s.courts.prefix(3), id: \.court) { CourtLine(court: $0) }
            if !s.leaders.isEmpty { LeadersView(leaders: Array(s.leaders.prefix(3)), inline: true) }
        }
        .foregroundStyle(WidgetPalette.foreground)
    }
}

struct CourtLine: View {
    let court: GameSnapshot.Court

    var body: some View {
        HStack(spacing: 6) {
            Text("C\(court.court)").font(.custom("Geist Mono", size: 11)).foregroundStyle(WidgetPalette.muted)
            Text("\(court.teamA) v \(court.teamB)").font(.custom("Geist", size: 12)).lineLimit(1)
            Spacer(minLength: 4)
            Text(court.scored ? "\(court.scoreA!)–\(court.scoreB!)" : "–").font(.custom("Geist", size: 12).weight(.semibold)).monospacedDigit()
        }
    }
}

struct LeadersView: View {
    let leaders: [GameSnapshot.Leader]
    var inline = false

    var body: some View {
        if inline {
            Text(leaders.map { "\($0.rank). \($0.name) \($0.score)" }.joined(separator: "   "))
                .font(.custom("Geist", size: 12)).monospacedDigit().foregroundStyle(WidgetPalette.muted).lineLimit(1)
        } else {
            VStack(alignment: .leading, spacing: 2) {
                ForEach(leaders, id: \.rank) { l in
                    HStack {
                        Text("\(l.rank)").foregroundStyle(WidgetPalette.muted)
                        Text(l.name).lineLimit(1)
                        Spacer(minLength: 2)
                        Text(l.score).fontWeight(.semibold)
                    }
                    .font(.custom("Geist", size: 12)).monospacedDigit()
                }
            }
            .foregroundStyle(WidgetPalette.foreground)
        }
    }
}

/// Widget-side copy of the monochrome palette (the extension doesn't link the app's Tokens.swift).
enum WidgetPalette {
    static let background = Color("WidgetBackground")
    static let foreground = Color.primary
    static let muted = Color.secondary
}

extension GameSnapshot {
    static let sample = GameSnapshot(
        code: "K7Q2MX", name: "Tuesday Americano", modeName: "Americano", round: 3, plannedRounds: 7, finished: false,
        courts: [
            .init(court: 1, teamA: "Anna & Mikko", teamB: "Laura & Jussi", scoreA: 14, scoreB: 10),
            .init(court: 2, teamA: "Sara & Pekka", teamB: "Emma & Olli", scoreA: nil, scoreB: nil),
        ],
        sittingOut: [], leaders: [.init(rank: 1, name: "Anna", score: "40"), .init(rank: 2, name: "Mikko", score: "38"), .init(rank: 3, name: "Sara", score: "35")],
        updatedAt: .now
    )
}
