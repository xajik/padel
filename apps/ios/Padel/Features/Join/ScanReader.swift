import CoreImage
@preconcurrency import PadelShared
import Vision

/// Reads everything a photo or screenshot can tell us about a game: QR payloads and printed or
/// on-screen text (a code on a whiteboard, a screenshot of the share sheet). The shared
/// `GameLinks.candidates` / `joinScanned` decide which part is the game.
enum ScanReader {
    static func read(_ data: Data) async -> String {
        guard let image = CIImage(data: data) else { return "" }
        return await Task.detached(priority: .userInitiated) { read(image) }.value
    }

    static func read(_ image: CIImage) -> String {
        // QR via Core Image: Vision's barcode request needs the Neural Engine and returns nothing
        // on the simulator; Core Image's detector works everywhere.
        let detector = CIDetector(ofType: CIDetectorTypeQRCode, context: nil, options: [CIDetectorAccuracy: CIDetectorAccuracyHigh])
        let payloads = (detector?.features(in: image) ?? []).compactMap { ($0 as? CIQRCodeFeature)?.messageString }

        let text = VNRecognizeTextRequest()
        text.recognitionLevel = .accurate
        // Codes aren't words: don't let language correction "fix" K7Q2MX.
        text.usesLanguageCorrection = false
        try? VNImageRequestHandler(ciImage: image, options: [:]).perform([text])
        let lines = (text.results ?? []).compactMap { $0.topCandidates(1).first?.string }

        return (payloads + lines).joined(separator: "\n")
    }

    /// True when scanned text contains something worth trying against the server.
    static func hasGame(_ text: String) -> Bool { !GameLinks.shared.candidates(text: text).isEmpty }
}
