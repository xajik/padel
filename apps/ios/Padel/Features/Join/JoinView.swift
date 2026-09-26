import PhotosUI
@preconcurrency import PadelShared
import SwiftUI
import VisionKit

/// Join by code (web `/join`), pasted link, camera QR scan or a QR in a photo/screenshot.
struct JoinView: View {
    var prefill: String?
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    @State private var input = ""
    @State private var error: String?
    @State private var joining = false
    @State private var scanning = false
    @State private var photo: PhotosPickerItem?
    @FocusState private var focused: Bool

    private var canScan: Bool { DataScannerViewController.isSupported && DataScannerViewController.isAvailable }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: Tokens.Space.s4) {
                    Text("Enter the 6-character code from the organizer, or scan their QR code or game code.")
                        .font(.geist(Tokens.FontSize.base))
                        .foregroundStyle(Palette.mutedForeground)
                    TextField("K7Q2MX", text: $input)
                        .font(.custom(PadelFont.mono, size: Tokens.FontSize.xl2, relativeTo: .title).weight(.semibold))
                        .tracking(4)
                        .textInputAutocapitalization(.characters)
                        .autocorrectionDisabled()
                        .keyboardType(.asciiCapable)
                        .submitLabel(.join)
                        .focused($focused)
                        .onSubmit { Task { await join(input) } }
                        .padding(.horizontal, Tokens.Space.s4)
                        .frame(minHeight: 56)
                        .overlay(RoundedRectangle(cornerRadius: Tokens.Radius.md).stroke(Palette.border))
                        .accessibilityIdentifier("join-code")
                    if let error {
                        Label(error, systemImage: "exclamationmark.circle").font(.geist(Tokens.FontSize.sm)).foregroundStyle(Palette.error)
                    }
                    Button {
                        Task { await join(input) }
                    } label: {
                        if joining { ProgressView().tint(Palette.primaryForeground) } else { Text("Join game") }
                    }
                    .buttonStyle(PrimaryButtonStyle())
                    .disabled(GameLinks.shared.parse(input: input) == nil || joining)
                    .accessibilityIdentifier("join-submit")

                    HStack(spacing: Tokens.Space.s2) {
                        if canScan {
                            Button { scanning = true } label: { Label("Scan code", systemImage: "qrcode.viewfinder") }
                                .accessibilityHint("Point the camera at a QR code or a game code")
                                .buttonStyle(SecondaryButtonStyle())
                        }
                        PhotosPicker(selection: $photo, matching: .images) {
                            Label("From photo", systemImage: "photo")
                        }
                        .accessibilityHint("A photo or screenshot with a QR code or a game code")
                        .buttonStyle(SecondaryButtonStyle())
                    }
                    PasteButton(payloadType: String.self) { strings in
                        if let text = strings.first { input = text; Task { await join(text) } }
                    }
                    .labelStyle(.titleAndIcon)
                    .buttonBorderShape(.roundedRectangle(radius: Tokens.Radius.md))
                    .tint(Palette.muted)
                    .foregroundStyle(Palette.foreground)
                }
                .padding(Tokens.Space.s4)
                .readableWidth()
            }
            .background(Palette.background)
            .navigationTitle("Join a game")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } } }
            .onAppear {
                if let prefill { input = prefill } else { focused = true }
            }
            .onChange(of: photo) { _, item in
                guard let item else { return }
                Task {
                    var text = ""
                    if let data = try? await item.loadTransferable(type: Data.self) { text = await ScanReader.read(data) }
                    photo = nil
                    await joinScanned(text, source: "that image")
                }
            }
            .fullScreenCover(isPresented: $scanning) {
                CodeScannerView { text in
                    scanning = false
                    Task { await joinScanned(text, source: "the camera") }
                }
                .ignoresSafeArea()
                .overlay(alignment: .topTrailing) {
                    Button("Cancel") { scanning = false }.padding().buttonStyle(.borderedProminent)
                }
            }
        }
    }

    private func join(_ text: String) async {
        guard GameLinks.shared.parse(input: text) != nil else {
            error = "That doesn't look like a game code or link."
            return
        }
        joining = true
        error = await model.join(text)
        joining = false
    }

    /// Photo or camera: QR payloads and recognised text, confirmed against the server.
    private func joinScanned(_ text: String, source: String) async {
        guard ScanReader.hasGame(text) else {
            error = "No QR code or game code found in \(source)."
            return
        }
        if let code = GameLinks.shared.candidates(text: text).first?.code { input = code }
        joining = true
        error = await model.joinScanned(text)
        joining = false
    }
}

/// Live camera scanning (VisionKit) of QR codes and game codes written or shown anywhere.
/// Only offered on devices that support it.
struct CodeScannerView: UIViewControllerRepresentable {
    let onFound: (String) -> Void

    func makeUIViewController(context: Context) -> DataScannerViewController {
        let vc = DataScannerViewController(recognizedDataTypes: [.barcode(symbologies: [.qr]), .text()], isHighlightingEnabled: true)
        vc.delegate = context.coordinator
        try? vc.startScanning()
        return vc
    }

    func updateUIViewController(_ vc: DataScannerViewController, context: Context) {}

    func makeCoordinator() -> Coordinator { Coordinator(onFound: onFound) }

    final class Coordinator: NSObject, DataScannerViewControllerDelegate {
        let onFound: (String) -> Void
        private var done = false
        init(onFound: @escaping (String) -> Void) { self.onFound = onFound }

        func dataScanner(_ scanner: DataScannerViewController, didAdd items: [RecognizedItem], allItems: [RecognizedItem]) {
            // Everything in view at once, so a QR wins over nearby text and a code split across
            // lines still reads as one.
            let text = allItems.map { item -> String in
                switch item {
                case .barcode(let code): code.payloadStringValue ?? ""
                case .text(let text): text.transcript
                @unknown default: ""
                }
            }.joined(separator: "\n")
            if !done, ScanReader.hasGame(text) {
                done = true
                UINotificationFeedbackGenerator().notificationOccurred(.success)
                onFound(text)
            }
        }
    }
}
