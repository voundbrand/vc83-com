import XCTest
@testable import SevenLayersMac
@testable import SevenLayersProtocol

@MainActor
final class QuickChatSessionControllerTests: XCTestCase {
    func testSubmitContextDraftRoutesReadOnlyEnvelope() {
        let bridge = StubCompanionBridge()
        let session = QuickChatSessionController(bridge: bridge)

        let submission = session.submitContextDraft("  operator context preview  ")

        XCTAssertEqual(submission?.payload, "operator context preview")
        XCTAssertEqual(submission?.schemaVersion, "tcg_ingress_envelope_v1")
        XCTAssertEqual(submission?.mutationAuthority, .vc83Backend)
        XCTAssertEqual(bridge.contextPayloads, ["operator context preview"])
        XCTAssertEqual(session.lastSubmission, submission)
    }

    func testSubmitContextDraftIgnoresBlankText() {
        let bridge = StubCompanionBridge()
        let session = QuickChatSessionController(bridge: bridge)

        let submission = session.submitContextDraft("   \n  ")

        XCTAssertNil(submission)
        XCTAssertTrue(bridge.contextPayloads.isEmpty)
        XCTAssertNil(session.lastSubmission)
    }

    func testSubmitContextDraftFailsClosedWhenSignedOut() {
        let bridge = StubCompanionBridge()
        let authState = AuthStateStub(
            authSessionState: .signedOut(reason: .missingCredential),
            authStatusText: "Sign in required before running privileged actions."
        )
        let session = QuickChatSessionController(
            bridge: bridge,
            authStateProvider: authState
        )

        let submission = session.submitContextDraft("operator context preview")

        XCTAssertNil(submission)
        XCTAssertEqual(
            session.lastSubmissionBlockReason,
            "Sign in required before running privileged actions."
        )
        XCTAssertTrue(bridge.contextPayloads.isEmpty)
    }

    func testPendingApprovalsObserverReceivesInitialAndUpdatedValues() {
        let session = QuickChatSessionController(bridge: StubCompanionBridge())
        var observedValues: [Int] = []

        let token = session.addPendingApprovalsObserver { count in
            observedValues.append(count)
        }

        session.incrementPendingApprovals()
        session.setPendingApprovalsCount(5)
        session.clearPendingApprovals()
        session.removePendingApprovalsObserver(token)

        XCTAssertEqual(observedValues, [0, 1, 5, 0])
    }
}

private final class StubCompanionBridge: CompanionBridgeBoundary {
    var contextPayloads: [String] = []

    func makeContextEnvelope(payload: String, correlationID: String) -> IngressEnvelope {
        contextPayloads.append(payload)
        return IngressEnvelope(
            correlationID: correlationID,
            intent: .readOnlyContext(payload: payload),
            approvalArtifactID: nil,
            mutationAuthority: .vc83Backend,
            metadata: IngressEnvelopeMetadata(
                source: "stub_companion_bridge",
                messageClass: .chat,
                sessionID: nil,
                localMutationAllowed: false,
                ingressedAt: Date(timeIntervalSince1970: 1_700_000_300)
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

private final class AuthStateStub: DesktopAuthStateProviding {
    let authSessionState: DesktopAuthSessionState
    let authStatusText: String

    init(authSessionState: DesktopAuthSessionState, authStatusText: String) {
        self.authSessionState = authSessionState
        self.authStatusText = authStatusText
    }

    var isAuthenticated: Bool {
        if case .authenticated = authSessionState {
            return true
        }
        return false
    }
}
