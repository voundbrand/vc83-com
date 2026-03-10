import CoreGraphics
import XCTest
@testable import SevenLayersMac

final class CoreGraphicsCaptureSourceCatalogTests: XCTestCase {
    func testListCaptureSourcesIncludesDisplaysAndPerWindowWorkspaceMetadataDeterministically() {
        let catalog = CoreGraphicsCaptureSourceCatalog(
            windowInfoProvider: { _, _ in
                [
                    [
                        kCGWindowNumber as String: NSNumber(value: 400),
                        kCGWindowLayer as String: NSNumber(value: 0),
                        kCGWindowSharingState as String: NSNumber(value: 1),
                        kCGWindowAlpha as String: NSNumber(value: 1.0),
                        kCGWindowOwnerName as String: "Xcode",
                        kCGWindowName as String: "workspace.xcworkspace",
                        kCGWindowIsOnscreen as String: NSNumber(value: true),
                        "kCGWindowWorkspace": NSNumber(value: 3),
                    ],
                    [
                        kCGWindowNumber as String: NSNumber(value: 200),
                        kCGWindowLayer as String: NSNumber(value: 0),
                        kCGWindowSharingState as String: NSNumber(value: 1),
                        kCGWindowAlpha as String: NSNumber(value: 1.0),
                        kCGWindowOwnerName as String: "Safari",
                        kCGWindowName as String: "Internal Docs",
                        kCGWindowIsOnscreen as String: NSNumber(value: false),
                        "kCGWindowWorkspace": NSNumber(value: 5),
                    ],
                    [
                        // Filtered out because the window layer is not a standard app window.
                        kCGWindowNumber as String: NSNumber(value: 999),
                        kCGWindowLayer as String: NSNumber(value: 2),
                        kCGWindowSharingState as String: NSNumber(value: 1),
                        kCGWindowAlpha as String: NSNumber(value: 1.0),
                        kCGWindowOwnerName as String: "Ignored App",
                        kCGWindowName as String: "Ignored Window",
                    ],
                ]
            },
            displayIDProvider: { [45, 7] },
            mainDisplayIDProvider: { 7 }
        )

        let sources = catalog.listCaptureSources()

        XCTAssertEqual(sources.count, 4)
        XCTAssertEqual(sources[0], ScreenCaptureSourceDescriptor(
            sourceId: "desktop:primary",
            kind: .display,
            displayId: 7
        ))
        XCTAssertEqual(sources[1], ScreenCaptureSourceDescriptor(
            sourceId: "display:45",
            kind: .display,
            displayId: 45
        ))
        XCTAssertEqual(sources[2].sourceId, "window:200")
        XCTAssertEqual(sources[2].ownerName, "Safari")
        XCTAssertEqual(sources[2].title, "Internal Docs")
        XCTAssertEqual(sources[2].workspaceId, 5)
        XCTAssertEqual(sources[2].isOnScreen, false)

        XCTAssertEqual(sources[3].sourceId, "window:400")
        XCTAssertEqual(sources[3].ownerName, "Xcode")
        XCTAssertEqual(sources[3].title, "workspace.xcworkspace")
        XCTAssertEqual(sources[3].workspaceId, 3)
        XCTAssertEqual(sources[3].isOnScreen, true)
    }

    func testListCaptureSourcesFiltersWindowServerAndInvisibleEntries() {
        let catalog = CoreGraphicsCaptureSourceCatalog(
            windowInfoProvider: { _, _ in
                [
                    [
                        kCGWindowNumber as String: NSNumber(value: 1),
                        kCGWindowLayer as String: NSNumber(value: 0),
                        kCGWindowSharingState as String: NSNumber(value: 1),
                        kCGWindowAlpha as String: NSNumber(value: 1.0),
                        kCGWindowOwnerName as String: "Window Server",
                        kCGWindowName as String: "Ignored",
                    ],
                    [
                        kCGWindowNumber as String: NSNumber(value: 2),
                        kCGWindowLayer as String: NSNumber(value: 0),
                        kCGWindowSharingState as String: NSNumber(value: 0),
                        kCGWindowAlpha as String: NSNumber(value: 1.0),
                        kCGWindowOwnerName as String: "Preview",
                        kCGWindowName as String: "Hidden",
                    ],
                    [
                        kCGWindowNumber as String: NSNumber(value: 3),
                        kCGWindowLayer as String: NSNumber(value: 0),
                        kCGWindowSharingState as String: NSNumber(value: 1),
                        kCGWindowAlpha as String: NSNumber(value: 1.0),
                        kCGWindowOwnerName as String: "Terminal",
                        kCGWindowName as String: "Session",
                    ],
                ]
            },
            displayIDProvider: { [3] },
            mainDisplayIDProvider: { 3 }
        )

        let windowSources = catalog
            .listCaptureSources()
            .filter { $0.kind == .window }

        XCTAssertEqual(windowSources.count, 1)
        XCTAssertEqual(windowSources[0].sourceId, "window:3")
    }
}
