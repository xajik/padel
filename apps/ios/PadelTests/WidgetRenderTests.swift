import SwiftUI
import WidgetKit
import XCTest
@testable import Padel

/// Renders the widget and Lock Screen Live Activity views to images (attached to the test result)
/// so their layout can be reviewed; placing widgets on a simulator home screen can't be automated.
@MainActor
final class WidgetRenderTests: XCTestCase {
    func testWidgetLayouts() throws {
        let cases: [(String, WidgetFamily, CGSize)] = [
            ("widget-small", .systemSmall, CGSize(width: 170, height: 170)),
            ("widget-medium", .systemMedium, CGSize(width: 364, height: 170)),
            ("widget-lock-rectangular", .accessoryRectangular, CGSize(width: 172, height: 76)),
        ]
        for (name, family, size) in cases {
            try render(name, ActiveGameWidgetContent(snapshot: .sample, family: family).padding(16).frame(width: size.width, height: size.height))
        }
        try render("widget-empty", ActiveGameWidgetContent(snapshot: nil, family: .systemSmall).padding(16).frame(width: 170, height: 170))
        try render("live-activity-lock-screen", LockScreenView(s: .sample).padding(16).frame(width: 370))
    }

    private func render(_ name: String, _ view: some View) throws {
        for scheme in [ColorScheme.light, .dark] {
            let content = view
                .background(scheme == .dark ? Color.black : Color.white)
                .environment(\.colorScheme, scheme)
            let renderer = ImageRenderer(content: content)
            renderer.scale = 3
            let image = try XCTUnwrap(renderer.uiImage, "\(name) did not render")
            XCTAssertGreaterThan(image.size.width, 0)
            let attachment = XCTAttachment(image: image)
            attachment.name = "\(name)-\(scheme == .dark ? "dark" : "light")"
            attachment.lifetime = .keepAlways
            add(attachment)
        }
    }
}
