import SwiftUI

@main
struct PadelWatchApp: App {
    @State private var model = WatchModel()
    @Environment(\.scenePhase) private var phase

    var body: some Scene {
        WindowGroup {
            WatchHomeView()
                .environment(model)
                .onChange(of: phase, initial: true) { _, phase in
                    if phase == .active { model.startPolling() } else { model.stopPolling() }
                }
        }
    }
}
