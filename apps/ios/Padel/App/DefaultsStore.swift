import Foundation
import PadelShared

/// Persists the shared repository's games in the App Group, next to the widget snapshot.
/// UserDefaults is thread-safe; the Kotlin repository writes from its own coroutine threads.
final class DefaultsStore: NSObject, KeyValueStore, @unchecked Sendable {
    static let shared = DefaultsStore()
    private let defaults = SharedStore.defaults

    func read(key: String) -> String? { defaults.string(forKey: key) }

    func write(key: String, value: String?) {
        if let value { defaults.set(value, forKey: key) } else { defaults.removeObject(forKey: key) }
    }
}
