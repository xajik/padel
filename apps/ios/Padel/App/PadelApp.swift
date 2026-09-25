import SwiftUI

@main
struct PadelApp: App {
    @State private var model = AppModel()
    @Environment(\.scenePhase) private var scenePhase

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(model)
                .tint(Palette.primary)
                // padel://g/CODE?key=… (QR codes, widgets, Live Activity) and universal links.
                .onOpenURL { model.handle(url: $0) }
                .onContinueUserActivity(NSUserActivityTypeBrowsingWeb) { activity in
                    if let url = activity.webpageURL { model.handle(url: url) }
                }
        }
        .onChange(of: scenePhase, initial: true) { _, phase in
            if phase == .active { model.startPolling() } else { model.stopPolling() }
        }
    }
}

struct RootView: View {
    @Environment(AppModel.self) private var model

    var body: some View {
        @Bindable var model = model
        NavigationStack(path: $model.path) {
            HomeView()
                .navigationDestination(for: Route.self) { route in
                    switch route {
                    case .game(let code): GameView(code: code)
                    case .newGame: NewGameView()
                    }
                }
        }
        .sheet(isPresented: $model.showJoin) {
            JoinView(prefill: model.joinPrefill)
        }
        .overlay(alignment: .top) {
            if let banner = model.banner {
                Text(banner)
                    .font(.geist(Tokens.FontSize.sm, weight: .medium))
                    .foregroundStyle(Palette.primaryForeground)
                    .padding(.horizontal, Tokens.Space.s4)
                    .padding(.vertical, Tokens.Space.s3)
                    .background(Palette.primary, in: Capsule())
                    .padding(.top, Tokens.Space.s2)
                    .transition(.move(edge: .top).combined(with: .opacity))
                    .task(id: banner) {
                        try? await Task.sleep(for: .seconds(3))
                        withAnimation { model.banner = nil }
                    }
            }
        }
        .animation(.easeOut(duration: Tokens.motionBase), value: model.banner)
    }
}
