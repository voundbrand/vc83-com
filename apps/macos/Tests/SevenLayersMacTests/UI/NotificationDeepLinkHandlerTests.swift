import Foundation
import XCTest
@testable import SevenLayersMac

@MainActor
final class NotificationDeepLinkHandlerTests: XCTestCase {
    func testCodecRoundTripForApprovalRoute() throws {
        let codec = NotificationDeepLinkCodec()
        let route = NotificationDeepLinkRoute(
            kind: .approval,
            correlationID: "corr-approval-1",
            evidenceURL: URL(string: "https://ops.vc83.app/evidence/ev-1")!,
            approvalArtifactID: "approval-1",
            approvalTokenClass: "approval.action",
            gateMode: .approvalAction
        )

        let url = try codec.encode(route)
        let decoded = try codec.decode(url)

        XCTAssertEqual(decoded, route)
    }

    func testHandlerOpensTrustPortalURLWithCorrelationAndEvidence() throws {
        let workspace = FakeWorkspace()
        workspace.result = true
        let codec = NotificationDeepLinkCodec()
        let handler = NotificationDeepLinkHandler(
            codec: codec,
            trustPortalURLBuilder: NotificationTrustPortalURLBuilder(
                configuration: NotificationTrustPortalConfiguration(
                    webBaseURL: URL(string: "https://vc83.app")!,
                    source: "macos_notification"
                )
            ),
            workspace: workspace
        )
        let deepLink = try codec.encode(
            NotificationDeepLinkRoute(
                kind: .approval,
                correlationID: "corr-9",
                evidenceURL: URL(string: "https://ops.vc83.app/evidence/ev-9")!,
                approvalArtifactID: "approval-9",
                approvalTokenClass: "approval.action",
                gateMode: .approvalAction
            )
        )

        let result = try handler.handle(deepLink)

        guard case .opened(let destinationURL) = result else {
            XCTFail("Expected .opened result")
            return
        }

        let destinationComponents = URLComponents(url: destinationURL, resolvingAgainstBaseURL: false)
        XCTAssertEqual(destinationComponents?.path, "/dashboard/approvals")
        XCTAssertEqual(destinationComponents?.value(for: "source"), "macos_notification")
        XCTAssertEqual(destinationComponents?.value(for: "kind"), "approval")
        XCTAssertEqual(destinationComponents?.value(for: "correlation_id"), "corr-9")
        XCTAssertEqual(destinationComponents?.value(for: "evidence_url"), "https://ops.vc83.app/evidence/ev-9")
        XCTAssertEqual(destinationComponents?.value(for: "gate_mode"), "approval_action")
        XCTAssertEqual(destinationComponents?.value(for: "requested_gate_mode"), "approval_action")
        XCTAssertEqual(destinationComponents?.value(for: "approval_artifact_id"), "approval-9")
        XCTAssertEqual(destinationComponents?.value(for: "approval_token_class"), "approval.action")
        XCTAssertEqual(workspace.openedURLs, [destinationURL])
    }

    func testHandlerIgnoresUnrelatedURL() throws {
        let workspace = FakeWorkspace()
        let handler = NotificationDeepLinkHandler(
            webBaseURL: URL(string: "https://vc83.app")!,
            workspace: workspace
        )

        let result = try handler.handle(
            URL(string: "vc83-mac://auth/callback?session_token=session-1&state=state-1")!
        )

        XCTAssertEqual(result, .ignored)
        XCTAssertTrue(workspace.openedURLs.isEmpty)
    }

    func testCodecRejectsRecognizedRouteMissingCorrelationID() {
        let codec = NotificationDeepLinkCodec()

        XCTAssertThrowsError(
            try codec.decode(
                URL(
                    string: "vc83-mac://notification/approval?evidence_url=https://ops.vc83.app/evidence/ev-77"
                )!
            )
        ) { error in
            XCTAssertEqual(error as? NotificationDeepLinkError, .missingCorrelationID)
        }
    }

    func testHandlerDowngradesApprovalActionToReadOnlyWhenApprovalEvidenceMissing() throws {
        let workspace = FakeWorkspace()
        workspace.result = true
        let handler = NotificationDeepLinkHandler(
            webBaseURL: URL(string: "https://vc83.app")!,
            workspace: workspace
        )

        let result = try handler.handle(
            URL(
                string: "vc83-mac://notification/approval?correlation_id=corr-10&evidence_url=https://ops.vc83.app/evidence/ev-10&gate_mode=approval_action"
            )!
        )

        guard case .opened(let destinationURL) = result else {
            XCTFail("Expected .opened result")
            return
        }

        let destinationComponents = URLComponents(url: destinationURL, resolvingAgainstBaseURL: false)
        XCTAssertEqual(destinationComponents?.path, "/dashboard/approvals")
        XCTAssertEqual(destinationComponents?.value(for: "gate_mode"), "read_only")
        XCTAssertEqual(destinationComponents?.value(for: "requested_gate_mode"), "approval_action")
        XCTAssertEqual(destinationComponents?.value(for: "gate_fallback_reason"), "missing_approval_evidence")
        XCTAssertNil(destinationComponents?.value(for: "approval_artifact_id"))
        XCTAssertNil(destinationComponents?.value(for: "approval_token_class"))
    }

    func testHandlerOpensCaptureRoute() throws {
        let workspace = FakeWorkspace()
        workspace.result = true
        let codec = NotificationDeepLinkCodec()
        let handler = NotificationDeepLinkHandler(
            webBaseURL: URL(string: "https://vc83.app")!,
            workspace: workspace
        )
        let deepLink = try codec.encode(
            NotificationDeepLinkRoute(
                kind: .capture,
                correlationID: "corr-cap-1",
                evidenceURL: URL(string: "https://ops.vc83.app/evidence/ev-cap-1")!,
                approvalArtifactID: nil,
                gateMode: .readOnly
            )
        )

        let result = try handler.handle(deepLink)

        guard case .opened(let destinationURL) = result else {
            XCTFail("Expected .opened result")
            return
        }

        let destinationComponents = URLComponents(url: destinationURL, resolvingAgainstBaseURL: false)
        XCTAssertEqual(destinationComponents?.path, "/dashboard/capture")
        XCTAssertEqual(destinationComponents?.value(for: "kind"), "capture")
    }
}

private final class FakeWorkspace: WorkspaceOpening {
    var result: Bool = false
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
