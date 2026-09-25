@preconcurrency import PadelShared
import SwiftUI

/// New game, mirroring the web setup wizard (`/new`) on one scrolling form.
/// Rules, defaults and validation come from the shared `GameSetup`.
struct NewGameView: View {
    @Environment(AppModel.self) private var model

    @State private var mode: ModeId = .americano
    @State private var name = ""
    @State private var names: [String] = Array(repeating: "", count: 8)
    @State private var sides: [Side] = (0..<8).map { $0 % 2 == 0 ? .a : .b }
    @State private var courts = 2
    @State private var scoring: ScoringType = .total
    @State private var points = 24
    @State private var roundsChoice: RoundsChoice = .auto
    @State private var fixedRounds = 7
    @State private var byeAverage = false
    @State private var creating = false
    @State private var error: String?
    @FocusState private var focused: Int?

    enum RoundsChoice: String, CaseIterable { case auto = "Auto", fixed = "Fixed", open = "Open" }

    private var info: ModeInfo { ModesKt.modeInfo(id: mode) }
    private var roster: [String] { names.enumerated().map { $1.trimmingCharacters(in: .whitespaces).isEmpty ? "Player \($0 + 1)" : $1 } }
    private var maxCourts: Int { Int(ModesKt.maxCourts(playerCount: Int32(names.count))) }

    private var settings: PadelShared.Settings {
        let rounds: KotlinInt? = switch roundsChoice {
        case .auto: nil
        case .open: KotlinInt(int: 0)
        case .fixed: KotlinInt(int: Int32(fixedRounds))
        }
        return GameSetup.shared.settings(
            mode: mode, playerCount: Int32(names.count), courts: Int32(courts),
            scoringType: scoring, points: Int32(points), rounds: rounds, byeAverage: byeAverage
        )
    }

    private var problem: ValidationError? {
        GameSetup.shared.problem(settings: settings, names: roster, sides: info.sides ? sides : nil)
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Tokens.Space.s6) {
                formatSection
                playersSection
                if !info.fullCourts { courtsSection }
                scoringSection
                roundsSection
            }
            .padding(.horizontal, Tokens.Space.s4)
            .padding(.vertical, Tokens.Space.s4)
            .readableWidth()
        }
        .scrollDismissesKeyboard(.interactively)
        .background(Palette.background)
        .navigationTitle("New game")
        .navigationBarTitleDisplayMode(.inline)
        .safeAreaInset(edge: .bottom) { footer }
        .onChange(of: names.count) { _, n in courts = min(courts, Int(ModesKt.maxCourts(playerCount: Int32(n)))) }
    }

    // MARK: Sections

    private var formatSection: some View {
        VStack(alignment: .leading, spacing: Tokens.Space.s3) {
            SectionTitle("Format")
            LazyVGrid(columns: [GridItem(.flexible(), spacing: Tokens.Space.s2), GridItem(.flexible())], spacing: Tokens.Space.s2) {
                ForEach(Engine.modes, id: \.name) { m in
                    let selected = m.id == mode
                    Button {
                        mode = m.id
                        if m.fullCourts { fitFullCourts() }
                    } label: {
                        HStack(spacing: Tokens.Space.s2) {
                            m.icon.view(20)
                            Text(m.name).font(.geist(Tokens.FontSize.sm, weight: .semibold)).lineLimit(1).minimumScaleFactor(0.8)
                            Spacer(minLength: 0)
                        }
                        .padding(.horizontal, Tokens.Space.s3)
                        .frame(minHeight: Tokens.touchTarget)
                        .foregroundStyle(selected ? Palette.primaryForeground : Palette.foreground)
                        .background(selected ? Palette.primary : Palette.surface, in: RoundedRectangle(cornerRadius: Tokens.Radius.md))
                        .overlay(RoundedRectangle(cornerRadius: Tokens.Radius.md).stroke(selected ? Palette.primary : Palette.border))
                    }
                    .buttonStyle(.plain)
                    .accessibilityAddTraits(selected ? .isSelected : [])
                }
            }
            Text(info.summary).font(.geist(Tokens.FontSize.sm)).foregroundStyle(Palette.mutedForeground)
            TextField("Game name (optional)", text: $name, prompt: Text(info.name))
                .font(.geist(Tokens.FontSize.base))
                .padding(.horizontal, Tokens.Space.s3)
                .frame(minHeight: Tokens.touchTarget)
                .overlay(RoundedRectangle(cornerRadius: Tokens.Radius.md).stroke(Palette.border))
        }
    }

    private var playersSection: some View {
        VStack(alignment: .leading, spacing: Tokens.Space.s3) {
            SectionTitle("Players", trailing: "\(names.count)")
            VStack(spacing: 0) {
                ForEach(names.indices, id: \.self) { i in
                    if info.teams && i % 2 == 0 {
                        Text("Team \(i / 2 + 1)")
                            .font(.geist(Tokens.FontSize.xs, weight: .medium, relativeTo: .caption))
                            .foregroundStyle(Palette.mutedForeground)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(.top, i == 0 ? 0 : Tokens.Space.s3)
                            .padding(.bottom, Tokens.Space.s1)
                    }
                    playerRow(i)
                    if i < names.count - 1 && !(info.teams && i % 2 == 1) { Divider().overlay(Palette.border) }
                }
            }
            .card(padding: Tokens.Space.s3)
            HStack(spacing: Tokens.Space.s2) {
                Button {
                    names.append("")
                    sides.append(names.count % 2 == 1 ? .a : .b)
                    focused = names.count - 1
                } label: { Label("Add player", systemImage: "plus") }
                    .buttonStyle(SecondaryButtonStyle())
                    .disabled(names.count >= Int(ModesKt.MAX_PLAYERS))
                if info.teams {
                    Button {
                        names.append(contentsOf: ["", ""])
                        sides.append(contentsOf: [.a, .b])
                    } label: { Label("Add team", systemImage: "person.2") }
                        .buttonStyle(SecondaryButtonStyle())
                }
            }
        }
    }

    private func playerRow(_ i: Int) -> some View {
        HStack(spacing: Tokens.Space.s2) {
            Text("\(i + 1)")
                .font(.geist(Tokens.FontSize.sm).monospacedDigit())
                .foregroundStyle(Palette.mutedForeground)
                .frame(width: 22, alignment: .trailing)
            TextField("Player \(i + 1)", text: $names[i])
                .font(.geist(Tokens.FontSize.base))
                .textInputAutocapitalization(.words)
                .autocorrectionDisabled()
                .submitLabel(i == names.count - 1 ? .done : .next)
                .focused($focused, equals: i)
                .onSubmit { focused = i + 1 < names.count ? i + 1 : nil }
                .frame(minHeight: Tokens.touchTarget)
            if info.sides {
                Picker("Side", selection: $sides[i]) {
                    Text("A").tag(Side.a)
                    Text("B").tag(Side.b)
                }
                .pickerStyle(.segmented)
                .frame(width: 88)
            }
            if names.count > Int(ModesKt.MIN_PLAYERS) {
                Button {
                    names.remove(at: i)
                    sides.remove(at: i)
                } label: {
                    Image(systemName: "minus.circle").foregroundStyle(Palette.mutedForeground)
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Remove player \(i + 1)")
            }
        }
    }

    private var courtsSection: some View {
        VStack(alignment: .leading, spacing: Tokens.Space.s3) {
            SectionTitle("Courts")
            Stepper(value: $courts, in: 1...max(1, maxCourts)) {
                Text("\(courts) court\(courts == 1 ? "" : "s")").font(.geist(Tokens.FontSize.base)).monospacedDigit()
            }
            .card(padding: Tokens.Space.s3)
        }
    }

    private var scoringSection: some View {
        VStack(alignment: .leading, spacing: Tokens.Space.s3) {
            SectionTitle("Scoring")
            Picker("Scoring", selection: $scoring) {
                Text("Total points").tag(ScoringType.total)
                Text("First to").tag(ScoringType.firstTo)
                Text("Timed").tag(ScoringType.timed)
                Text("Win/loss").tag(ScoringType.off)
            }
            .pickerStyle(.segmented)
            if scoring == .total || scoring == .firstTo {
                HStack(spacing: Tokens.Space.s2) {
                    ForEach(GameSetup.shared.POINT_OPTIONS.map(\.intValue), id: \.self) { p in
                        Button("\(p)") { points = p }
                            .font(.geist(Tokens.FontSize.base, weight: .semibold).monospacedDigit())
                            .frame(maxWidth: .infinity, minHeight: Tokens.touchTarget)
                            .foregroundStyle(p == points ? Palette.primaryForeground : Palette.foreground)
                            .background(p == points ? Palette.primary : Palette.surface, in: RoundedRectangle(cornerRadius: Tokens.Radius.md))
                            .overlay(RoundedRectangle(cornerRadius: Tokens.Radius.md).stroke(p == points ? Palette.primary : Palette.border))
                            .buttonStyle(.plain)
                    }
                }
                Text(scoring == .total ? "Both scores add up to \(points), e.g. \(points / 2 + 3)–\(points / 2 - 3)." : "First team to \(points) wins the match.")
                    .font(.geist(Tokens.FontSize.sm)).foregroundStyle(Palette.mutedForeground)
            }
        }
    }

    private var roundsSection: some View {
        VStack(alignment: .leading, spacing: Tokens.Space.s3) {
            SectionTitle("Rounds")
            Picker("Rounds", selection: $roundsChoice) {
                ForEach(RoundsChoice.allCases, id: \.self) { Text($0.rawValue).tag($0) }
            }
            .pickerStyle(.segmented)
            if roundsChoice == .fixed {
                Stepper(value: $fixedRounds, in: 1...30) {
                    Text("\(fixedRounds) rounds").font(.geist(Tokens.FontSize.base)).monospacedDigit()
                }
                .card(padding: Tokens.Space.s3)
            }
            Toggle(isOn: $byeAverage) {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Credit sit-outs").font(.geist(Tokens.FontSize.base))
                    Text("Players sitting out get their average points.").font(.geist(Tokens.FontSize.sm)).foregroundStyle(Palette.mutedForeground)
                }
            }
            .tint(Palette.primary)
        }
    }

    private var footer: some View {
        VStack(spacing: Tokens.Space.s2) {
            if let problem {
                Label(problem.message, systemImage: "exclamationmark.circle")
                    .font(.geist(Tokens.FontSize.sm))
                    .foregroundStyle(Palette.error)
            } else if let e = GameSetup.shared.estimateFor(settings: settings, playerCount: Int32(names.count)) {
                Text(e.openEnded
                     ? "Open-ended · \(e.matches / max(e.rounds, 1)) matches per round · ~\(Engine.formatDuration(minutes: e.minutes / max(e.rounds, 1))) per round"
                     : "\(e.rounds) rounds · \(e.matches) matches · ~\(Engine.formatDuration(minutes: e.minutes))")
                    .font(.geist(Tokens.FontSize.sm).monospacedDigit())
                    .foregroundStyle(Palette.mutedForeground)
            }
            if let error {
                Text(error).font(.geist(Tokens.FontSize.sm)).foregroundStyle(Palette.error)
            }
            Button {
                Task { await create() }
            } label: {
                if creating { ProgressView().tint(Palette.primaryForeground) } else { Text("Start game") }
            }
            .buttonStyle(PrimaryButtonStyle())
            .disabled(problem != nil || creating)
            .accessibilityIdentifier("start-game")
        }
        .padding(.horizontal, Tokens.Space.s4)
        .padding(.vertical, Tokens.Space.s3)
        .background(.bar)
    }

    private func fitFullCourts() {
        // Beat the Box / Up & Down need exactly 4 per court: round down to a multiple of 4.
        let target = max(4, names.count / 4 * 4)
        if names.count > target { names.removeLast(names.count - target); sides.removeLast(sides.count - target) }
    }

    private func create() async {
        creating = true
        defer { creating = false }
        do {
            _ = try await model.create(name: name, settings: settings, names: roster, sides: info.sides ? sides : nil)
        } catch {
            self.error = (error as NSError).kotlinMessage
        }
    }
}
