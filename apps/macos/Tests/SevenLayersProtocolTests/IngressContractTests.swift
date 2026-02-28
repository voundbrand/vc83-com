import Foundation
import XCTest
@testable import SevenLayersProtocol

final class IngressContractTests: XCTestCase {
    func testEnvelopeDefaultsToCanonicalSchema() {
        let metadata = IngressEnvelopeMetadata(
            source: "macos_menu_bar_shell",
            messageClass: .chat,
            sessionID: nil,
            localMutationAllowed: false,
            ingressedAt: Date(timeIntervalSince1970: 1_700_000_200)
        )
        let envelope = IngressEnvelope(
            correlationID: "corr-1",
            intent: .readOnlyContext(payload: "preview"),
            approvalArtifactID: nil,
            mutationAuthority: .vc83Backend,
            metadata: metadata
        )

        XCTAssertEqual(envelope.schemaVersion, "tcg_ingress_envelope_v1")
        XCTAssertEqual(envelope.mutationAuthority, .vc83Backend)
        XCTAssertNil(envelope.approvalArtifactID)
        XCTAssertEqual(envelope.metadata.contractVersion, "tcg_ingress_metadata_v1")
        XCTAssertEqual(envelope.metadata.source, "macos_menu_bar_shell")
        XCTAssertEqual(envelope.metadata.messageClass, .chat)
        XCTAssertFalse(envelope.metadata.localMutationAllowed)
    }

    func testApprovalArtifactRetainsIssuedAtForAuditability() {
        let timestamp = Date(timeIntervalSince1970: 1_700_000_000)
        let artifact = ApprovalArtifact(id: "approval-1", tokenClass: "approval.action", issuedAt: timestamp)

        XCTAssertEqual(artifact.id, "approval-1")
        XCTAssertEqual(artifact.tokenClass, "approval.action")
        XCTAssertEqual(artifact.issuedAt, timestamp)
    }
}
