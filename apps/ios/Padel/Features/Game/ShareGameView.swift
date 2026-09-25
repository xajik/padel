import CoreImage.CIFilterBuiltins
@preconcurrency import PadelShared
import SwiftUI

/// Share sheet (web `ShareDialog`): the QR encodes the same https link the web shows, so it opens
/// the app where installed and the web everywhere else.
struct ShareGameView: View {
    let game: LocalGame
    let baseURL: String
    @Environment(\.dismiss) private var dismiss

    private var spectatorURL: String { GameLinks.shared.spectatorUrl(baseUrl: baseURL, code: game.code) }
    private var organizerURL: String? {
        game.organizerKey.map { GameLinks.shared.organizerUrl(baseUrl: baseURL, code: game.code, key: $0) }
    }

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
                        Text("Anyone with the link can follow the scores live, in the app or on the web.")
                            .font(.geist(Tokens.FontSize.sm))
                            .foregroundStyle(Palette.mutedForeground)
                            .multilineTextAlignment(.center)
                        QRCodeView(text: spectatorURL)
                            .frame(width: 220, height: 220)
                            .accessibilityLabel("QR code for \(spectatorURL)")
                        VStack(spacing: Tokens.Space.s1) {
                            Text("Game code").font(.geist(Tokens.FontSize.xs)).foregroundStyle(Palette.mutedForeground)
                            Text(game.code)
                                .font(.custom(PadelFont.mono, size: Tokens.FontSize.xl3, relativeTo: .largeTitle).weight(.semibold))
                                .tracking(6)
                                .textSelection(.enabled)
                                .accessibilityIdentifier("share-code")
                        }
                        ShareLink(item: URL(string: spectatorURL)!, subject: Text(game.game.name), message: Text("Follow \(game.game.name) live")) {
                            Label("Share link", systemImage: "square.and.arrow.up")
                        }
                        .buttonStyle(PrimaryButtonStyle())
                        Button {
                            UIPasteboard.general.string = spectatorURL
                        } label: {
                            Label("Copy link", systemImage: "doc.on.doc")
                        }
                        .buttonStyle(SecondaryButtonStyle())

                        if let organizerURL {
                            VStack(alignment: .leading, spacing: Tokens.Space.s2) {
                                Text("Co-organizer link").font(.geist(Tokens.FontSize.base, weight: .semibold))
                                Text("Lets another phone or the web enter scores. Share it only with people you trust.")
                                    .font(.geist(Tokens.FontSize.sm))
                                    .foregroundStyle(Palette.mutedForeground)
                                ShareLink(item: URL(string: organizerURL)!) {
                                    Label("Share organizer link", systemImage: "key")
                                }
                                .buttonStyle(SecondaryButtonStyle())
                            }
                            .card()
                        }
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
