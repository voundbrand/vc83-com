import Foundation
import XCTest
@testable import SevenLayersMac
@testable import SevenLayersProtocol

final class MacCompanionBridgeTests: XCTestCase {
    func testContextEnvelopeIsIngressOnly() {
        let bridge = MacCompanionBridge()

        let envelope = bridge.makeContextEnvelope(payload: "snapshot", correlationID: "corr-2")

        XCTAssertEqual(envelope.schemaVersion, "tcg_ingress_envelope_v1")
        XCTAssertEqual(envelope.mutationAuthority, .vc83Backend)
        XCTAssertNil(envelope.approvalArtifactID)
        XCTAssertEqual(envelope.metadata.contractVersion, "tcg_ingress_metadata_v1")
        XCTAssertEqual(envelope.metadata.source, "macos_menu_bar_shell")
        XCTAssertEqual(envelope.metadata.messageClass, .chat)
        XCTAssertNil(envelope.metadata.sessionID)
        XCTAssertFalse(envelope.metadata.localMutationAllowed)
    }

    func testMutatingEnvelopeFailsClosedWithoutApproval() {
        let bridge = MacCompanionBridge()

        XCTAssertThrowsError(
            try bridge.makeMutatingEnvelope(
                tool: "calendar.book",
                arguments: ["time": "10:00"],
                correlationID: "corr-3",
                approval: nil
            )
        ) { error in
            XCTAssertEqual(error as? CompanionBridgeError, .missingApprovalArtifact)
        }
    }

    func testMutatingEnvelopeRequiresApprovalArtifactButKeepsBackendAuthority() throws {
        let bridge = MacCompanionBridge()
        let approval = ApprovalArtifact(
            id: "approval-2",
            tokenClass: "approval.action",
            issuedAt: Date(timeIntervalSince1970: 1_700_000_100)
        )

        let envelope = try bridge.makeMutatingEnvelope(
            tool: "calendar.book",
            arguments: ["time": "10:00", "sessionId": "session-42"],
            correlationID: "corr-4",
            approval: approval
        )

        XCTAssertEqual(envelope.approvalArtifactID, "approval-2")
        XCTAssertEqual(envelope.mutationAuthority, .vc83Backend)
        XCTAssertEqual(envelope.metadata.messageClass, .session)
        XCTAssertEqual(envelope.metadata.sessionID, "session-42")
        XCTAssertFalse(envelope.metadata.localMutationAllowed)
    }
}
