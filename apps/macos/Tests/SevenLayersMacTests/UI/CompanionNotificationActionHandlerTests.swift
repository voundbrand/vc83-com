import Foundation
import XCTest
@testable import SevenLayersMac

@MainActor
final class CompanionNotificationActionHandlerTests: XCTestCase {
    func testHandleActionBuildsCaptureRouteAndOpensTrustPortal() {
        let workspace = FakeWorkspace()
        workspace.result = true
        let deepLinkHandler = NotificationDeepLinkHandler(
            webBaseURL: URL(string: "https://vc83.app")!,
            workspace: workspace
        )
        let actionHandler = CompanionNotificationActionHandler(
            deepLinkHandler: deepLinkHandler
        )

        let result = actionHandler.handleAction(
            identifier: CompanionNotificationAction.openCapture.rawValue,
            userInfo: [
                NotificationUserInfoKey.correlationID: "corr-cap-follow-1",
                NotificationUserInfoKey.evidenceURL: "https://ops.vc83.app/evidence/ev-cap-follow-1",
                NotificationUserInfoKey.gateMode: NotificationTrustGateMode.readOnly.rawValue,
            ]
        )

        guard case .opened(let destinationURL) = result else {
            XCTFail("Expected destination URL to be opened.")
            return
        }

        let components = URLComponents(url: destinationURL, resolvingAgainstBaseURL: false)
        XCTAssertEqual(components?.path, "/dashboard/capture")
        XCTAssertEqual(components?.value(for: "kind"), "capture")
        XCTAssertEqual(components?.value(for: "gate_mode"), "read_only")
    }

    func testHandleActionFailsClosedWhenApprovalActionEvidenceIsMissing() {
        let workspace = FakeWorkspace()
        workspace.result = true
        let deepLinkHandler = NotificationDeepLinkHandler(
            webBaseURL: URL(string: "https://vc83.app")!,
            workspace: workspace
        )
        let actionHandler = CompanionNotificationActionHandler(
            deepLinkHandler: deepLinkHandler
        )

        let result = actionHandler.handleAction(
            identifier: CompanionNotificationAction.openApproval.rawValue,
            userInfo: [
                NotificationUserInfoKey.correlationID: "corr-approval-follow-1",
                NotificationUserInfoKey.evidenceURL: "https://ops.vc83.app/evidence/ev-approval-follow-1",
                NotificationUserInfoKey.gateMode: NotificationTrustGateMode.approvalAction.rawValue,
            ]
        )

        guard case .opened(let destinationURL) = result else {
            XCTFail("Expected destination URL to be opened.")
            return
        }

        let components = URLComponents(url: destinationURL, resolvingAgainstBaseURL: false)
        XCTAssertEqual(components?.path, "/dashboard/approvals")
        XCTAssertEqual(components?.value(for: "gate_mode"), "read_only")
        XCTAssertEqual(components?.value(for: "requested_gate_mode"), "approval_action")
        XCTAssertEqual(components?.value(for: "gate_fallback_reason"), "missing_approval_evidence")
    }

    func testHandleActionReturnsInvalidPayloadWhenRequiredFieldsMissing() {
        let deepLinkHandler = NotificationDeepLinkHandler(
            webBaseURL: URL(string: "https://vc83.app")!,
            workspace: FakeWorkspace()
        )
        let actionHandler = CompanionNotificationActionHandler(
            deepLinkHandler: deepLinkHandler
        )

        let result = actionHandler.handleAction(
            identifier: CompanionNotificationAction.openEscalation.rawValue,
            userInfo: [:]
        )

        XCTAssertEqual(result, .invalidPayload)
    }

    func testHandleActionIgnoresUnknownIdentifier() {
        let deepLinkHandler = NotificationDeepLinkHandler(
            webBaseURL: URL(string: "https://vc83.app")!,
            workspace: FakeWorkspace()
        )
        let actionHandler = CompanionNotificationActionHandler(
            deepLinkHandler: deepLinkHandler
        )

        let result = actionHandler.handleAction(
            identifier: "sevenlayers.notification.unknown",
            userInfo: [:]
        )

        XCTAssertEqual(result, .ignored)
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

private extension URLComponents {
    func value(for name: String) -> String? {
        queryItems?.first(where: { $0.name == name })?.value
    }
}
