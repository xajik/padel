import AuthenticationServices
import CryptoKit
import FirebaseAuth
import FirebaseCore
import GoogleSignIn
@preconcurrency import PadelShared
import SwiftUI

/// Firebase ID tokens for the shared Kotlin API client (`Authorization: Bearer`, apps/mcp/src/auth.ts).
final class FirebaseTokens: NSObject, AuthTokens, @unchecked Sendable {
    func idToken(callback: @escaping (String?) -> Void) {
        guard FirebaseApp.app() != nil, let user = Auth.auth().currentUser else { return callback(nil) }
        user.getIDToken { token, _ in callback(token) }
    }
}

/// Optional sign-in (FR-3, M6): a silent anonymous Firebase session, linked to Google or Apple when
/// the user signs in so their games follow them to the website, other devices and AI assistants.
@MainActor
@Observable
final class AccountModel {
    struct Profile: Equatable {
        let uid: String
        let name: String?
        let email: String?
        let isAnonymous: Bool
        let provider: String?
    }

    /// False in builds without GoogleService-Info.plist (CI, forks): the app runs without accounts.
    let available: Bool
    private(set) var profile: Profile?
    var busy = false
    var error: String?

    var signedIn: Bool { profile.map { !$0.isAnonymous } ?? false }

    private let repo: GameRepository
    private var listener: AuthStateDidChangeListenerHandle?
    private var appleNonce: String?
    private let apple = AppleAuthorization()

    init(repo: GameRepository) {
        self.repo = repo
        available = FirebaseApp.app() != nil
        guard available else { return }
        repo.auth = FirebaseTokens()
        if let clientID = FirebaseApp.app()?.options.clientID {
            GIDSignIn.sharedInstance.configuration = GIDConfiguration(clientID: clientID)
        }
        listener = Auth.auth().addStateDidChangeListener { [weak self] _, user in
            Task { @MainActor in self?.apply(user) }
        }
    }

    private func apply(_ user: User?) {
        guard let user else {
            profile = nil
            repo.accountUid = nil
            // FR-3.1: every device has a (silent, anonymous) identity for the game API.
            Task { _ = try? await Auth.auth().signInAnonymously() }
            return
        }
        let provider = user.providerData.first?.providerID
        profile = Profile(uid: user.uid, name: user.displayName, email: user.email, isAnonymous: user.isAnonymous, provider: provider)
        repo.accountUid = user.uid
        if !user.isAnonymous { Task { await syncAccount() } }
    }

    /// Pulls the account's games from other devices, the website and assistants.
    func syncAccount() async {
        guard signedIn else { return }
        _ = try? await repo.syncAccount()
    }

    // MARK: - Google

    func signInWithGoogle() async {
        guard available, let presenter = UIApplication.shared.topViewController else { return }
        busy = true
        defer { busy = false }
        do {
            let result = try await GIDSignIn.sharedInstance.signIn(withPresenting: presenter)
            guard let idToken = result.user.idToken?.tokenString else { return }
            let credential = GoogleAuthProvider.credential(withIDToken: idToken, accessToken: result.user.accessToken.tokenString)
            try await signIn(with: credential)
        } catch let e as GIDSignInError where e.code == .canceled {
            return
        } catch {
            self.error = "Couldn't sign in with Google. Please try again."
        }
    }

    // MARK: - Apple

    /// `SignInWithAppleButton` request: a hashed nonce (Firebase checks it) and name + email.
    func prepare(_ request: ASAuthorizationAppleIDRequest) {
        let nonce = Nonce.random()
        appleNonce = nonce
        request.requestedScopes = [.fullName, .email]
        request.nonce = Nonce.sha256(nonce)
    }

    func complete(_ result: Result<ASAuthorization, Error>) async {
        switch result {
        case .failure(let e as ASAuthorizationError) where e.code == .canceled:
            return
        case .failure:
            error = "Couldn't sign in with Apple. Please try again."
        case .success(let authorization):
            guard let credential = appleCredential(authorization) else {
                error = "Couldn't sign in with Apple. Please try again."
                return
            }
            busy = true
            defer { busy = false }
            do {
                try await signIn(with: credential)
                // Apple shares the name only on the first sign-in: keep it on the Firebase profile.
                if let name = (authorization.credential as? ASAuthorizationAppleIDCredential)?.fullName,
                   let user = Auth.auth().currentUser, user.displayName == nil {
                    let change = user.createProfileChangeRequest()
                    change.displayName = PersonNameComponentsFormatter().string(from: name).nilIfEmpty
                    try? await change.commitChanges()
                    apply(Auth.auth().currentUser)
                }
            } catch {
                self.error = "Couldn't sign in with Apple. Please try again."
            }
        }
    }

    private func appleCredential(_ authorization: ASAuthorization) -> OAuthCredential? {
        guard let apple = authorization.credential as? ASAuthorizationAppleIDCredential,
              let nonce = appleNonce,
              let token = apple.identityToken.flatMap({ String(data: $0, encoding: .utf8) }) else { return nil }
        return OAuthProvider.appleCredential(withIDToken: token, rawNonce: nonce, fullName: apple.fullName)
    }

    // MARK: - Linking

    /// An anonymous session is linked (same UID, FR-3.3). If the Google/Apple account already has a
    /// user, sign in to it and move this session's games there (FR-3.4).
    private func signIn(with credential: AuthCredential) async throws {
        let auth = Auth.auth()
        guard let current = auth.currentUser, current.isAnonymous else {
            try await auth.signIn(with: credential)
            return
        }
        do {
            try await current.link(with: credential)
            apply(auth.currentUser)
        } catch let e as NSError where e.code == AuthErrorCode.credentialAlreadyInUse.rawValue {
            let existing = (e.userInfo[AuthErrorUserInfoUpdatedCredentialKey] as? AuthCredential) ?? credential
            let fromToken = try? await current.getIDToken()
            try await auth.signIn(with: existing)
            if let fromToken { _ = try? await repo.mergeAnonymous(fromIdToken: fromToken) }
            await syncAccount()
        }
    }

    func signOut() {
        GIDSignIn.sharedInstance.signOut()
        try? Auth.auth().signOut()
    }

    // MARK: - Delete (App Store guideline 5.1.1(v))

    /// Deletes the account and its cloud games list (FR-3.7). Firebase needs a recent sign-in, so the
    /// user confirms with Google or Apple first; for Apple the sign-in token is revoked as well.
    func deleteAccount() async -> Bool {
        guard let user = Auth.auth().currentUser, !user.isAnonymous else { return false }
        busy = true
        defer { busy = false }
        do {
            if profile?.provider == "apple.com" {
                let nonce = Nonce.random()
                appleNonce = nonce
                let authorization = try await apple.request(nonce: Nonce.sha256(nonce))
                guard let credential = appleCredential(authorization),
                      let apple = authorization.credential as? ASAuthorizationAppleIDCredential,
                      let code = apple.authorizationCode.flatMap({ String(data: $0, encoding: .utf8) }) else { return false }
                try await user.reauthenticate(with: credential)
                try await Auth.auth().revokeToken(withAuthorizationCode: code)
            } else if let presenter = UIApplication.shared.topViewController {
                let result = try await GIDSignIn.sharedInstance.signIn(withPresenting: presenter)
                guard let idToken = result.user.idToken?.tokenString else { return false }
                try await user.reauthenticate(with: GoogleAuthProvider.credential(withIDToken: idToken, accessToken: result.user.accessToken.tokenString))
            }
            try await repo.deleteAccountData()
            try await user.delete()
            GIDSignIn.sharedInstance.signOut()
            return true
        } catch let e as ASAuthorizationError where e.code == .canceled {
            return false
        } catch let e as GIDSignInError where e.code == .canceled {
            return false
        } catch {
            self.error = "Couldn't delete your account. Please try again, or email us and we'll do it for you."
            return false
        }
    }
}

/// Programmatic Sign in with Apple, for re-authentication before deleting the account.
@MainActor
private final class AppleAuthorization: NSObject, ASAuthorizationControllerDelegate, ASAuthorizationControllerPresentationContextProviding {
    private var continuation: CheckedContinuation<ASAuthorization, Error>?

    func request(nonce: String) async throws -> ASAuthorization {
        let request = ASAuthorizationAppleIDProvider().createRequest()
        request.nonce = nonce
        let controller = ASAuthorizationController(authorizationRequests: [request])
        controller.delegate = self
        controller.presentationContextProvider = self
        return try await withCheckedThrowingContinuation { continuation in
            self.continuation = continuation
            controller.performRequests()
        }
    }

    nonisolated func authorizationController(controller: ASAuthorizationController, didCompleteWithAuthorization authorization: ASAuthorization) {
        nonisolated(unsafe) let authorization = authorization
        MainActor.assumeIsolated {
            continuation?.resume(returning: authorization)
            continuation = nil
        }
    }

    nonisolated func authorizationController(controller: ASAuthorizationController, didCompleteWithError error: Error) {
        MainActor.assumeIsolated {
            continuation?.resume(throwing: error)
            continuation = nil
        }
    }

    nonisolated func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        MainActor.assumeIsolated { UIApplication.shared.keyWindow ?? ASPresentationAnchor() }
    }
}

private enum Nonce {
    static func random(length: Int = 32) -> String {
        let charset = Array("0123456789ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvwxyz-._")
        var generator = SystemRandomNumberGenerator()
        return String((0..<length).map { _ in charset[Int(generator.next(upperBound: UInt(charset.count)))] })
    }

    static func sha256(_ input: String) -> String {
        SHA256.hash(data: Data(input.utf8)).map { String(format: "%02x", $0) }.joined()
    }
}

extension UIApplication {
    var keyWindow: UIWindow? {
        connectedScenes.compactMap { $0 as? UIWindowScene }.flatMap(\.windows).first { $0.isKeyWindow }
    }

    /// The view controller Google Sign-In presents from (the sheet on top, if any).
    var topViewController: UIViewController? {
        var top = keyWindow?.rootViewController
        while let presented = top?.presentedViewController { top = presented }
        return top
    }
}

private extension String {
    var nilIfEmpty: String? { isEmpty ? nil : self }
}
