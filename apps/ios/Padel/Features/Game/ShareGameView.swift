import CoreImage.CIFilterBuiltins
@preconcurrency import PadelShared
import SwiftUI

/// Share sheet (web `ShareDialog`): the QR encodes the same https link the web shows, so it opens
/// the app where installed and the web everywhere else.
struct ShareGameView: View {
    let game: LocalGame
    let baseURL: String
    @Environment(\.dismiss) private var dismiss
    /// Shares the organizer link instead, so everyone who opens it can score and start the next rounds.
    @State private var everyoneCanEdit = false

    private var spectatorURL: String { GameLinks.shared.spectatorUrl(baseUrl: baseURL, code: game.code) }
    private var organizerURL: String? {
        game.organizerKey.map { GameLinks.shared.organizerUrl(baseUrl: baseURL, code: game.code, key: $0) }
    }
    private var canShareEditing: Bool { organizerURL != nil && game.game.status == .live }
    private var sharesEditing: Bool { everyoneCanEdit && canShareEditing }
    private var sharedURL: String { sharesEditing ? organizerURL! : spectatorURL }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: Tokens.Space.s5) {
                    if game.needsCreate {
                        Label("This game is on this phone only. It gets a shareable code as soon as you're online.", systemImage: "wifi.slash")
                            .font(.geist(Tokens.FontSize.sm))
                            .foregroundStyle(Palette.mutedForeground)
                            .card()
                    } else {
                        if canShareEditing {
                            Toggle(isOn: $everyoneCanEdit) {
                                VStack(alignment: .leading, spacing: 2) {
                                    Text("Everyone can edit").font(.geist(Tokens.FontSize.base))
                                    Text("People with the link or QR code can enter scores and start the next rounds.")
                                        .font(.geist(Tokens.FontSize.sm))
                                        .foregroundStyle(Palette.mutedForeground)
                                }
                            }
                            .tint(Palette.primary)
                            .accessibilityIdentifier("share-everyone-can-edit")
                            .card(padding: Tokens.Space.s3)
                        }
                        Text(sharesEditing
                             ? "Anyone with the link can score this game, in the app or on the web. Share it only with your group."
                             : "Anyone with the link can follow the scores live, in the app or on the web.")
                            .font(.geist(Tokens.FontSize.sm))
                            .foregroundStyle(Palette.mutedForeground)
                            .multilineTextAlignment(.center)
                        QRCodeView(text: sharedURL)
                            .frame(width: 220, height: 220)
                            .accessibilityLabel("QR code for \(sharedURL)")
                        VStack(spacing: Tokens.Space.s1) {
                            Text("Game code").font(.geist(Tokens.FontSize.xs)).foregroundStyle(Palette.mutedForeground)
                            Text(game.code)
                                .font(.custom(PadelFont.mono, size: Tokens.FontSize.xl3, relativeTo: .largeTitle).weight(.semibold))
                                .tracking(6)
                                .textSelection(.enabled)
                                .accessibilityIdentifier("share-code")
                            if sharesEditing {
                                Text("The code alone opens the game view only.")
                                    .font(.geist(Tokens.FontSize.xs))
                                    .foregroundStyle(Palette.mutedForeground)
                            }
                        }
                        ShareLink(
                            item: URL(string: sharedURL)!,
                            subject: Text(game.game.name),
                            message: Text(sharesEditing ? "Score \(game.game.name) with us" : "Follow \(game.game.name) live")
                        ) {
                            Label("Share link", systemImage: "square.and.arrow.up")
                        }
                        .buttonStyle(PrimaryButtonStyle())
                        Button {
                            UIPasteboard.general.string = sharedURL
                        } label: {
                            Label("Copy link", systemImage: "doc.on.doc")
                        }
                        .buttonStyle(SecondaryButtonStyle())
                    }
                }
                .foregroundStyle(Palette.foreground)
                .padding(Tokens.Space.s4)
                .readableWidth()
            }
            .background(Palette.background)
            .navigationTitle("Share game")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() } } }
            .onAppear { Analytics.track(.openedShare, ["code_length": game.code.count]) }
        }
    }
}

/// Black-on-white QR (scanners need the contrast even in dark mode).
struct QRCodeView: View {
    let text: String

    var body: some View {
        if let image = Self.image(for: text) {
            Image(uiImage: image)
                .interpolation(.none)
                .resizable()
                .scaledToFit()
                .padding(Tokens.Space.s3)
                .background(Color.white, in: RoundedRectangle(cornerRadius: Tokens.Radius.lg))
                .overlay(RoundedRectangle(cornerRadius: Tokens.Radius.lg).stroke(Palette.border))
        }
    }

    static func image(for text: String) -> UIImage? {
        let filter = CIFilter.qrCodeGenerator()
        filter.message = Data(text.utf8)
        filter.correctionLevel = "M"
        guard let output = filter.outputImage?.transformed(by: CGAffineTransform(scaleX: 10, y: 10)),
              let cg = CIContext().createCGImage(output, from: output.extent) else { return nil }
        return UIImage(cgImage: cg)
    }
}
