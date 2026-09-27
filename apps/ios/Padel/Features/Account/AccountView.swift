import AuthenticationServices
import SwiftUI

/// Account sheet: optional Google / Apple sign-in, sign out and in-app account deletion.
struct AccountView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    @Environment(\.colorScheme) private var colorScheme
    @State private var confirmDelete = false

    private var account: AccountModel { model.account }

    var body: some View {
        @Bindable var account = model.account
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: Tokens.Space.s4) {
                    if account.signedIn, let profile = account.profile {
                        signedIn(profile)
                    } else {
                        signedOut
                    }
                    if let error = account.error {
                        Label(error, systemImage: "exclamationmark.circle")
                            .font(.geist(Tokens.FontSize.sm))
                            .foregroundStyle(Palette.error)
                    }
                }
                .padding(Tokens.Space.s4)
                .readableWidth()
            }
            .background(Palette.background)
            .navigationTitle("Account")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() } }
            }
            .disabled(account.busy)
            .overlay { if account.busy { ProgressView() } }
            .confirmationDialog("Delete your account?", isPresented: $confirmDelete, titleVisibility: .visible) {
                Button("Delete account", role: .destructive) {
                    Task { if await account.deleteAccount() { model.banner = "Your account was deleted" } }
                }
            } message: {
                Text("Your sign-in, name, email address and the games list of your account are deleted. Games stay on this phone. This can’t be undone.")
            }
        }
    }

    private var signedOut: some View {
        VStack(alignment: .leading, spacing: Tokens.Space.s4) {
            Text("Keep your games everywhere")
                .font(.geist(Tokens.FontSize.xl, weight: .semibold, relativeTo: .title2))
            Text("Signing in is optional. With an account, your games show up on your other devices, on padel-americanoo.com and in your AI assistant.")
                .font(.geist(Tokens.FontSize.base))
                .foregroundStyle(Palette.mutedForeground)
            if account.available {
                SignInWithAppleButton(.continue) { account.prepare($0) } onCompletion: { result in
                    Task { await account.complete(result) }
                }
                .signInWithAppleButtonStyle(colorScheme == .dark ? .white : .black)
                .frame(height: Tokens.touchTarget + 4)
                .clipShape(RoundedRectangle(cornerRadius: Tokens.Radius.md))
                .accessibilityIdentifier("sign-in-apple")

                Button { Task { await account.signInWithGoogle() } } label: {
                    Label("Continue with Google", systemImage: "g.circle")
                }
                .buttonStyle(SecondaryButtonStyle())
                .accessibilityIdentifier("sign-in-google")
            } else {
                Text("Sign-in isn’t available in this build.")
                    .font(.geist(Tokens.FontSize.sm))
                    .foregroundStyle(Palette.mutedForeground)
            }
        }
    }

    private func signedIn(_ profile: AccountModel.Profile) -> some View {
        VStack(alignment: .leading, spacing: Tokens.Space.s4) {
            VStack(alignment: .leading, spacing: Tokens.Space.s1) {
                Text(profile.name ?? "Signed in")
                    .font(.geist(Tokens.FontSize.xl, weight: .semibold, relativeTo: .title2))
                if let email = profile.email {
                    Text(email).font(.geist(Tokens.FontSize.sm)).foregroundStyle(Palette.mutedForeground)
                }
                Text(profile.provider == "apple.com" ? "Signed in with Apple" : "Signed in with Google")
                    .font(.geist(Tokens.FontSize.sm))
                    .foregroundStyle(Palette.mutedForeground)
            }
            .card()

            Button { Task { await account.syncAccount() } } label: {
                Label("Get games from my account", systemImage: "arrow.triangle.2.circlepath")
            }
            .buttonStyle(SecondaryButtonStyle())

            Button { account.signOut() } label: {
                Label("Sign out", systemImage: "rectangle.portrait.and.arrow.right")
            }
            .buttonStyle(SecondaryButtonStyle())
            .accessibilityIdentifier("sign-out")

            Button(role: .destructive) { confirmDelete = true } label: {
                Text("Delete account").frame(maxWidth: .infinity, minHeight: Tokens.touchTarget)
            }
            .font(.geist(Tokens.FontSize.base, weight: .semibold))
            .foregroundStyle(Palette.error)
            .accessibilityIdentifier("delete-account")
        }
    }
}
