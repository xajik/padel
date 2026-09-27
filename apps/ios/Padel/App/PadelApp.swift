import FirebaseCore
import GoogleSignIn
import SwiftUI

@main
struct PadelApp: App {
    @State private var model: AppModel
    @Environment(\.scenePhase) private var scenePhase

    init() {
        // Before AppModel: its account model needs Firebase Auth.
        // GoogleService-Info.plist is gitignored (public repo): builds without it (CI, forks) skip Firebase.
        if FirebaseApp.app() == nil, Bundle.main.path(forResource: "GoogleService-Info", ofType: "plist") != nil {
            FirebaseApp.configure()
        }
        Analytics.start()
        _model = State(initialValue: AppModel())
    }

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(model)
                .tint(Palette.primary)
                // americanoo://g/CODE?key=… (QR codes, widgets, Live Activity) and universal links.
                .onOpenURL { url in
                    if GIDSignIn.sharedInstance.handle(url) { return }
                    model.handle(url: url)
                }
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
        .sheet(isPresented: $model.showAccount) {
            AccountView()
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
