import Foundation
import XCTest
@testable import SevenLayersMac

@MainActor
final class DashboardDeepLinkOpenerTests: XCTestCase {
    func testDashboardURLContainsSourceQuery() {
        let workspace = FakeWorkspace()
        let opener = DashboardDeepLinkOpener(
            configuration: DashboardDeepLinkConfiguration(
                webBaseURL: URL(string: "https://vc83.app")!,
                source: "macos_menu_bar"
            ),
            workspace: workspace
        )

        XCTAssertEqual(
            opener.dashboardURL.absoluteString,
            "https://vc83.app/dashboard?source=macos_menu_bar"
        )
    }

    func testOpenDashboardDelegatesToWorkspace() {
        let workspace = FakeWorkspace()
        workspace.result = true

        let opener = DashboardDeepLinkOpener(
            configuration: DashboardDeepLinkConfiguration(webBaseURL: URL(string: "https://vc83.app")!),
            workspace: workspace
        )

        let opened = opener.openDashboard()

        XCTAssertTrue(opened)
        XCTAssertEqual(workspace.openedURLs, [URL(string: "https://vc83.app/dashboard?source=macos_menu_bar")!])
    }
}

private final class FakeWorkspace: WorkspaceOpening {
    var result = false
    var openedURLs: [URL] = []

    func open(_ url: URL) -> Bool {
        openedURLs.append(url)
        return result
    }
}
