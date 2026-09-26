import FirebaseCore
import SwiftUI

final class AppDelegate: NSObject, UIApplicationDelegate {
    func application(_ application: UIApplication,
                     didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil) -> Bool {
        // GoogleService-Info.plist is gitignored (public repo): builds without it (CI, forks) skip Firebase.
        if Bundle.main.path(forResource: "GoogleService-Info", ofType: "plist") != nil {
            FirebaseApp.configure()
        }
        return true
    }
}

@main
struct PadelApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) private var delegate
    @State private var model = AppModel()
    @Environment(\.scenePhase) private var scenePhase

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(model)
                .tint(Palette.primary)
                // americanoo://g/CODE?key=… (QR codes, widgets, Live Activity) and universal links.
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
