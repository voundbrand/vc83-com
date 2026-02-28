import Foundation
import XCTest
@testable import SevenLayersMac
@testable import SevenLayersProtocol

@MainActor
final class NativeChatWindowSessionControllerTests: XCTestCase {
    func testSubmitDraftAddsOperatorAndRuntimeMessages() {
        let quickChatSession = QuickChatSessionController(bridge: StubNativeChatBridge())
        let session = NativeChatWindowSessionController(
            quickChatSession: quickChatSession,
            now: { Date(timeIntervalSince1970: 1_700_600_000) }
        )

        let didSubmit = session.submitDraft("  parity slice message  ")

        XCTAssertTrue(didSubmit)
        XCTAssertEqual(session.state.messages.count, 2)
        XCTAssertEqual(session.state.messages[0].role, .operatorContext)
        XCTAssertEqual(session.state.messages[0].text, "parity slice message")
        XCTAssertEqual(session.state.messages[1].role, .runtime)
        XCTAssertEqual(
            session.state.messages[1].text,
            "Context forwarded to backend ingress (tcg_ingress_envelope_v1)."
        )
        XCTAssertTrue(session.state.statusText.hasPrefix("Sent corr "))
    }

    func testSubmitDraftRejectsBlankInputAndUpdatesStatus() {
        let quickChatSession = QuickChatSessionController(bridge: StubNativeChatBridge())
        let session = NativeChatWindowSessionController(quickChatSession: quickChatSession)

        let didSubmit = session.submitDraft("  \n ")

        XCTAssertFalse(didSubmit)
        XCTAssertEqual(session.state.messages, [])
        XCTAssertEqual(session.state.statusText, "Enter context before sending.")
    }

    func testPendingApprovalsMirrorsQuickChatSessionObserver() {
        let quickChatSession = QuickChatSessionController(bridge: StubNativeChatBridge())
        let session = NativeChatWindowSessionController(quickChatSession: quickChatSession)

        quickChatSession.setPendingApprovalsCount(4)

        XCTAssertEqual(session.state.pendingApprovalsCount, 4)
    }
}

private final class StubNativeChatBridge: CompanionBridgeBoundary {
    func makeContextEnvelope(payload: String, correlationID: String) -> IngressEnvelope {
        IngressEnvelope(
            correlationID: correlationID,
            intent: .readOnlyContext(payload: payload),
            approvalArtifactID: nil,
            mutationAuthority: .vc83Backend,
            metadata: IngressEnvelopeMetadata(
                source: "native_chat_bridge_stub",
                messageClass: .chat,
                sessionID: nil,
                localMutationAllowed: false
            )
        )
    }

    func makeMutatingEnvelope(
        tool: String,
        arguments: [String : String],
        correlationID: String,
        approval: ApprovalArtifact?
    ) throws -> IngressEnvelope {
        throw CompanionBridgeError.missingApprovalArtifact
    }
}
