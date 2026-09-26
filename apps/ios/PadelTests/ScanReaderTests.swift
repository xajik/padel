@preconcurrency import PadelShared
import SwiftUI
import XCTest
@testable import Padel

/// The photo path end to end on real pixels: a rendered share sheet (QR + letter-spaced code) and
/// a plain "code on a whiteboard" image are read back to the game code.
@MainActor
final class ScanReaderTests: XCTestCase {
    private func image(_ view: some View) throws -> CIImage {
        let renderer = ImageRenderer(content: view.environment(\.colorScheme, .light))
        renderer.scale = 3
        return try XCTUnwrap(renderer.cgImage.map { CIImage(cgImage: $0) })
    }

    func testReadsQRCode() throws {
        let url = "https://padel-americanoo.com/g/K7Q2MX"
        let text = ScanReader.read(try image(QRCodeView(text: url).frame(width: 240, height: 240).background(.white)))
        XCTAssertEqual(GameLinks.shared.candidates(text: text).first?.code, "K7Q2MX")
    }

    func testReadsWrittenGameCode() throws {
        let view = VStack(spacing: 8) {
            Text("Tonight's game").font(.system(size: 22))
            Text("Game code").font(.system(size: 18))
            Text("B8RARS").font(.system(size: 44, weight: .semibold, design: .monospaced)).tracking(6)
        }
        .padding(40).background(.white).foregroundStyle(.black)
        let text = ScanReader.read(try image(view))
        XCTAssertEqual(GameLinks.shared.candidates(text: text).first?.code, "B8RARS", "OCR read: \(text)")
    }

    func testNothingToJoin() throws {
        let text = ScanReader.read(try image(Text("Just a padel court").font(.system(size: 30)).padding(40).background(.white).foregroundStyle(.black)))
        XCTAssertFalse(ScanReader.hasGame(text), "OCR read: \(text)")
    }
}
