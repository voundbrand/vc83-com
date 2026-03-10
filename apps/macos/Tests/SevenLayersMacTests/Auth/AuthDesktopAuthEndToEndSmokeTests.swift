import Foundation
import XCTest
@testable import SevenLayersMac
@testable import SevenLayersProtocol

@MainActor
final class AuthDesktopAuthEndToEndSmokeTests: XCTestCase {
    func testAuthCallbackFlowEnablesSignedInRuntimeSubmission() throws {
        let store = EndToEndInMemorySessionStore()
        let configuration = DesktopAuthConfiguration(webBaseURL: URL(string: "https://app.vc83.test")!)
        let coordinator = DesktopAuthCoordinator(
            configuration: configuration,
            credentialStore: store
        )
        let sessionController = DesktopAuthSessionController(coordinator: coordinator)
        let bridge = EndToEndCompanionBridge()
        let quickChatSession = QuickChatSessionController(
            bridge: bridge,
            authStateProvider: sessionController
        )

        sessionController.restoreSession()
        XCTAssertEqual(
            sessionController.authSessionState,
            .signedOut(reason: .missingCredential)
        )
        XCTAssertNil(quickChatSession.submitContextDraft("before auth"))

        var openedAuthorizationURL: URL?
        let loginURL = try sessionController.beginLogin(state: "e2e-state-1") { url in
            openedAuthorizationURL = url
            return true
        }

        XCTAssertEqual(openedAuthorizationURL, loginURL)
        let loginComponents = try XCTUnwrap(
            URLComponents(url: loginURL, resolvingAgainstBaseURL: false)
        )
        XCTAssertEqual(loginComponents.path, "/api/auth/login/init")

        let callbackURL = URL(
            string: "vc83-mac://auth/callback?session_token=session-e2e-1&state=e2e-state-1"
        )!
        let handled = try sessionController.handleOpenURL(callbackURL)
        XCTAssertTrue(handled)
        XCTAssertTrue(sessionController.isAuthenticated)

        let submission = quickChatSession.submitContextDraft("  signed in runtime action  ")
        XCTAssertEqual(submission?.payload, "signed in runtime action")
        XCTAssertEqual(bridge.payloads, ["signed in runtime action"])
        XCTAssertEqual(try coordinator.loadStoredCredential()?.sessionToken, "session-e2e-1")
    }

    func testFailedCallbackCanRetryAndRecoverWithSignedInRuntimeSubmission() throws {
        let store = EndToEndInMemorySessionStore()
        let configuration = DesktopAuthConfiguration(webBaseURL: URL(string: "https://app.vc83.test")!)
        let coordinator = DesktopAuthCoordinator(
            configuration: configuration,
            credentialStore: store
        )
        let sessionController = DesktopAuthSessionController(coordinator: coordinator)
        let bridge = EndToEndCompanionBridge()
        let quickChatSession = QuickChatSessionController(
            bridge: bridge,
            authStateProvider: sessionController
        )

        _ = try sessionController.beginLogin(state: "e2e-fail-1") { _ in true }
        let failedCallbackURL = URL(
            string: "vc83-mac://auth/callback?error=access_denied&state=e2e-fail-1"
        )!

        XCTAssertThrowsError(try sessionController.handleOpenURL(failedCallbackURL))
        XCTAssertEqual(sessionController.authSessionState, .signedOut(reason: .callbackRejected))
        XCTAssertNil(quickChatSession.submitContextDraft("blocked before retry"))

        let retriedLoginURL = try sessionController.beginLogin(state: "e2e-retry-1") { url in
            XCTAssertEqual(url.path, "/api/auth/login/init")
            return true
        }
        XCTAssertEqual(retriedLoginURL.path, "/api/auth/login/init")
        XCTAssertEqual(sessionController.authSessionState, .authorizing)

        let successfulCallbackURL = URL(
            string: "vc83-mac://auth/callback?session_token=session-recovered-1&state=e2e-retry-1"
        )!
        let handled = try sessionController.handleOpenURL(successfulCallbackURL)
        XCTAssertTrue(handled)
        XCTAssertTrue(sessionController.isAuthenticated)

        let submission = quickChatSession.submitContextDraft("retry recovered action")
        XCTAssertEqual(submission?.payload, "retry recovered action")
        XCTAssertEqual(bridge.payloads.last, "retry recovered action")
    }
}

private final class EndToEndInMemorySessionStore: SessionCredentialStore {
    private var credential: DesktopAuthCredential?

    func save(_ credential: DesktopAuthCredential) {
        self.credential = credential
    }

    func load() -> DesktopAuthCredential? {
        credential
    }

    func clear() {
        credential = nil
    }
}

private final class EndToEndCompanionBridge: CompanionBridgeBoundary {
    var payloads: [String] = []

    func makeContextEnvelope(payload: String, correlationID: String) -> IngressEnvelope {
        payloads.append(payload)
        return IngressEnvelope(
            correlationID: correlationID,
            intent: .readOnlyContext(payload: payload),
            approvalArtifactID: nil,
            mutationAuthority: .vc83Backend,
            metadata: IngressEnvelopeMetadata(
                source: "auth_end_to_end_smoke",
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
