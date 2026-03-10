import Foundation
import XCTest
@testable import SevenLayersMac
@testable import SevenLayersProtocol

@MainActor
final class NativeChatMediaRuntimeControllerTests: XCTestCase {
    func testToggleVoiceTransitionsIdleRequestingActiveAndBackToIdle() {
        let voiceRuntime = VoiceRuntimeStub()
        let gateway = ScreenGatewayStub()
        let sources = SourceCatalogStub(
            sources: [
                ScreenCaptureSourceDescriptor(sourceId: "desktop:primary", kind: .display, displayId: 1),
            ]
        )
        let controller = NativeChatMediaRuntimeController(
            voiceRuntime: voiceRuntime,
            cameraConnector: CameraCaptureConnector(
                provider: CameraProviderStub(),
                approvalGate: StaticCaptureApprovalGate(
                    enabledCapabilities: [.camera],
                    acceptedTokenIDs: ["approval_1"]
                )
            ),
            screenGateway: gateway,
            sourceCatalog: sources,
            liveSessionId: "live_voice_1",
            approvalTokenProvider: { CaptureApprovalToken(id: "approval_1") }
        )

        var observedVoiceStates: [NativeChatMediaPipelineState] = []
        _ = controller.addStateObserver { state in
            observedVoiceStates.append(state.voice)
        }

        let startMessage = controller.toggleVoiceCapture()
        let stopMessage = controller.toggleVoiceCapture()

        XCTAssertEqual(startMessage, "Voice runtime active.")
        XCTAssertEqual(stopMessage, "Voice runtime idle.")
        XCTAssertEqual(voiceRuntime.beginCallCount, 1)
        XCTAssertEqual(voiceRuntime.endCallCount, 1)
        XCTAssertEqual(
            observedVoiceStates,
            [.idle, .requestingPermission, .active, .idle]
        )
    }

    func testToggleVoiceFailsClosedWhenApprovalIsMissing() {
        let voiceRuntime = VoiceRuntimeStub()
        voiceRuntime.beginError = CaptureConnectorError.approvalRequired(.microphone)

        let controller = NativeChatMediaRuntimeController(
            voiceRuntime: voiceRuntime,
            cameraConnector: CameraCaptureConnector(
                provider: CameraProviderStub(),
                approvalGate: StaticCaptureApprovalGate(enabledCapabilities: [.camera])
            ),
            screenGateway: ScreenGatewayStub(),
            sourceCatalog: SourceCatalogStub(
                sources: [
                    ScreenCaptureSourceDescriptor(sourceId: "desktop:primary", kind: .display, displayId: 1),
                ]
            ),
            liveSessionId: "live_voice_2",
            approvalTokenProvider: { nil }
        )

        let message = controller.toggleVoiceCapture()

        XCTAssertEqual(message, "Voice runtime failed: Approval required for microphone.")
        switch controller.state.voice {
        case let .error(description):
            XCTAssertEqual(description, "Approval required for microphone.")
        default:
            XCTFail("Expected voice pipeline to surface an error state.")
        }
    }

    func testToggleVideoTransitionsIdleRequestingActiveAndBackToIdle() {
        let cameraProvider = CameraProviderStub()
        let controller = NativeChatMediaRuntimeController(
            voiceRuntime: VoiceRuntimeStub(),
            cameraConnector: CameraCaptureConnector(
                provider: cameraProvider,
                approvalGate: StaticCaptureApprovalGate(
                    enabledCapabilities: [.camera],
                    acceptedTokenIDs: ["approval_cam_1"]
                )
            ),
            screenGateway: ScreenGatewayStub(),
            sourceCatalog: SourceCatalogStub(
                sources: [
                    ScreenCaptureSourceDescriptor(sourceId: "desktop:primary", kind: .display, displayId: 1),
                ]
            ),
            liveSessionId: "live_video_1",
            approvalTokenProvider: { CaptureApprovalToken(id: "approval_cam_1") }
        )

        var observedVideoStates: [NativeChatMediaPipelineState] = []
        _ = controller.addStateObserver { state in
            observedVideoStates.append(state.video)
        }

        let startMessage = controller.toggleVideoCapture()
        let stopMessage = controller.toggleVideoCapture()

        XCTAssertEqual(startMessage, "Video runtime active.")
        XCTAssertEqual(stopMessage, "Video runtime idle.")
        XCTAssertEqual(cameraProvider.startCaptureCallCount, 1)
        XCTAssertEqual(cameraProvider.stopCaptureCallCount, 1)
        XCTAssertEqual(
            observedVideoStates,
            [.idle, .requestingPermission, .active, .idle]
        )
    }

    func testCaptureSnapshotPassesSourceSelectionAndApprovalTokenToGateway() throws {
        let gateway = ScreenGatewayStub()
        let controller = NativeChatMediaRuntimeController(
            voiceRuntime: VoiceRuntimeStub(),
            cameraConnector: CameraCaptureConnector(
                provider: CameraProviderStub(),
                approvalGate: StaticCaptureApprovalGate(enabledCapabilities: [.camera])
            ),
            screenGateway: gateway,
            sourceCatalog: SourceCatalogStub(
                sources: [
                    ScreenCaptureSourceDescriptor(
                        sourceId: "window:77",
                        kind: .window,
                        windowId: 77,
                        ownerName: "Xcode",
                        title: "Project"
                    ),
                ]
            ),
            liveSessionId: "live_capture_1",
            approvalTokenProvider: { CaptureApprovalToken(id: "approval_capture_1") }
        )

        _ = try controller.captureSnapshot(sourceId: "window:77")

        XCTAssertEqual(gateway.invocations.count, 1)
        XCTAssertEqual(gateway.invocations[0].liveSessionID, "live_capture_1")
        XCTAssertEqual(gateway.invocations[0].sourceID, "window:77")
        XCTAssertEqual(gateway.invocations[0].approvalToken?.id, "approval_capture_1")
    }

    func testPrivilegedActionsFailClosedWhenSignedOut() {
        let gateway = ScreenGatewayStub()
        let authState = MediaRuntimeAuthStateStub(
            authSessionState: .signedOut(reason: .missingCredential),
            authStatusText: "Sign in required before running privileged actions."
        )
        let controller = NativeChatMediaRuntimeController(
            voiceRuntime: VoiceRuntimeStub(),
            cameraConnector: CameraCaptureConnector(
                provider: CameraProviderStub(),
                approvalGate: StaticCaptureApprovalGate(
                    enabledCapabilities: [.camera],
                    acceptedTokenIDs: ["approval_1"]
                )
            ),
            screenGateway: gateway,
            sourceCatalog: SourceCatalogStub(
                sources: [
                    ScreenCaptureSourceDescriptor(sourceId: "desktop:primary", kind: .display, displayId: 1),
                ]
            ),
            liveSessionId: "live_signed_out_1",
            approvalTokenProvider: { CaptureApprovalToken(id: "approval_1") },
            authStateProvider: authState
        )

        let voiceMessage = controller.toggleVoiceCapture()

        XCTAssertEqual(voiceMessage, "Sign in required before running privileged actions.")
        switch controller.state.voice {
        case let .error(message):
            XCTAssertEqual(message, "Sign in required before running privileged actions.")
        default:
            XCTFail("Expected voice state to be blocked by auth.")
        }

        XCTAssertThrowsError(try controller.captureSnapshot(sourceId: "desktop:primary")) { error in
            XCTAssertEqual(
                error as? NativeChatMediaRuntimeError,
                .authenticationRequired("Sign in required before running privileged actions.")
            )
        }
        XCTAssertTrue(gateway.invocations.isEmpty)
    }
}

private final class VoiceRuntimeStub: DesktopVoiceRuntimeControlling {
    var state = DesktopVoiceRuntimeState()
    var beginError: Error?
    var endError: Error?
    private(set) var beginCallCount = 0
    private(set) var endCallCount = 0

    func beginPushToTalk(_ request: DesktopVoiceActivationRequest) throws {
        beginCallCount += 1
        if let beginError {
            throw beginError
        }
        state = DesktopVoiceRuntimeState(
            lifecycleState: .capturing,
            liveSessionId: request.liveSessionId,
            voiceSessionId: "voice_session_stub",
            activationMode: .pushToTalk
        )
    }

    func endPushToTalk() throws {
        endCallCount += 1
        if let endError {
            throw endError
        }
        state = DesktopVoiceRuntimeState(
            lifecycleState: .idle,
            liveSessionId: state.liveSessionId
        )
    }
}

private final class CameraProviderStub: CameraCaptureProviding {
    private(set) var startCaptureCallCount = 0
    private(set) var stopCaptureCallCount = 0

    func startCapture(sourceId: String) throws -> CameraCaptureSession {
        startCaptureCallCount += 1
        return CameraCaptureSession(
            sessionId: "camera_session_stub",
            sourceId: sourceId,
            provider: "avfoundation",
            startedAt: Date(timeIntervalSince1970: 1_700_800_000),
            frameCaptureCount: 0
        )
    }

    func stopCapture(sessionId: String) throws -> Date {
        stopCaptureCallCount += 1
        return Date(timeIntervalSince1970: 1_700_800_030)
    }
}

private final class ScreenGatewayStub: DesktopScreenSnapshotExecuting {
    private(set) var invocations: [DesktopScreenSnapshotInvocation] = []

    func captureScreenSnapshot(_ invocation: DesktopScreenSnapshotInvocation) throws -> DesktopScreenSnapshotExecution {
        invocations.append(invocation)

        let artifact = ScreenSnapshotArtifact(
            sourceId: invocation.sourceID ?? "desktop:primary",
            capturedAt: Date(timeIntervalSince1970: 1_700_800_050),
            payloadRef: "/tmp/snapshot-stub.png",
            sourceMetadata: ScreenSnapshotSourceMetadata(
                sourceKind: invocation.sourceID?.hasPrefix("window:") == true ? .window : .display
            ),
            evidenceRef: "/tmp/snapshot-stub.json"
        )
        let envelope = IngressEnvelope(
            correlationID: "corr_snapshot_stub",
            intent: .mutatingToolIntent(
                tool: DesktopNodeCommand.screenSnapshot,
                arguments: ["sourceId": artifact.sourceId]
            ),
            approvalArtifactID: invocation.approvalToken?.id,
            mutationAuthority: .vc83Backend,
            metadata: IngressEnvelopeMetadata(
                source: "native_chat_runtime_controller_tests",
                messageClass: .session,
                sessionID: invocation.liveSessionID,
                localMutationAllowed: false
            )
        )

        return DesktopScreenSnapshotExecution(
            artifact: artifact,
            envelope: envelope,
            observabilitySignal: MacCompanionObservabilitySignal(
                sessionId: "corr_snapshot_stub",
                liveSessionId: invocation.liveSessionID,
                gateOutcome: .executed,
                approvalStatus: .grantedOrNotRequired,
                transportHealth: .healthy,
                retryPolicyState: .notApplicable,
                rollbackState: .none
            )
        )
    }
}

private struct SourceCatalogStub: ScreenCaptureSourceListing {
    let sources: [ScreenCaptureSourceDescriptor]

    func listCaptureSources() -> [ScreenCaptureSourceDescriptor] {
        sources
    }
}

private final class MediaRuntimeAuthStateStub: DesktopAuthStateProviding {
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
