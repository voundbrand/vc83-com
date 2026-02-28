import Foundation
import XCTest
@testable import SevenLayersMac
@testable import SevenLayersProtocol

final class LocalCaptureConnectorsTests: XCTestCase {
    func testScreenSnapshotFailsClosedWhenCapabilityNotEnabled() {
        let provider = StubScreenCaptureProvider()
        let connector = ScreenCaptureConnector(
            provider: provider,
            approvalGate: FailClosedCaptureApprovalGate()
        )

        XCTAssertThrowsError(
            try connector.captureSnapshot(
                ScreenSnapshotRequest(
                    liveSessionId: "live_screen_1",
                    approvalToken: CaptureApprovalToken(id: "approval-screen")
                )
            )
        ) { error in
            XCTAssertEqual(
                error as? CaptureConnectorError,
                .capabilityDisabled(.screenSnapshot)
            )
        }

        XCTAssertEqual(provider.snapshotCallCount, 0)
    }

    func testScreenSnapshotRejectsNonSessionApprovalTokenClass() {
        let provider = StubScreenCaptureProvider()
        let connector = ScreenCaptureConnector(
            provider: provider,
            approvalGate: StaticCaptureApprovalGate(enabledCapabilities: [.screenSnapshot])
        )

        XCTAssertThrowsError(
            try connector.captureSnapshot(
                ScreenSnapshotRequest(
                    liveSessionId: "live_screen_2",
                    approvalToken: CaptureApprovalToken(
                        id: "approval-screen",
                        tokenClass: "approval.action"
                    )
                )
            )
        ) { error in
            XCTAssertEqual(
                error as? CaptureConnectorError,
                .invalidApprovalTokenClass(
                    expected: CaptureApprovalToken.requiredTokenClass,
                    actual: "approval.action"
                )
            )
        }

        XCTAssertEqual(provider.snapshotCallCount, 0)
    }

    func testCameraStartBuildsCanonicalCameraRuntimeMetadataAndKeepsBackendAuthority() throws {
        let startAt = Date(timeIntervalSince1970: 1_700_111_000)
        let lastFrameAt = Date(timeIntervalSince1970: 1_700_111_005)
        let provider = StubCameraCaptureProvider(
            startSession: CameraCaptureSession(
                sessionId: "camera-session-1",
                sourceId: "webcam:primary",
                provider: "avfoundation",
                startedAt: startAt,
                lastFrameCapturedAt: lastFrameAt,
                frameCaptureCount: 24
            )
        )
        let connector = CameraCaptureConnector(
            provider: provider,
            approvalGate: StaticCaptureApprovalGate(
                enabledCapabilities: [.camera],
                acceptedTokenIDs: ["approval-camera"]
            )
        )

        let result = try connector.startCapture(
            CameraCaptureStartRequest(
                liveSessionId: " live_camera_1 ",
                approvalToken: CaptureApprovalToken(id: "approval-camera")
            )
        )

        XCTAssertEqual(result.ingressContext.mutationAuthority, .vc83Backend)

        let metadata = result.ingressContext.metadata.bridgeMetadata()
        XCTAssertEqual(metadata[CaptureMetadataContractKey.liveSessionId] as? String, "live_camera_1")

        let cameraRuntime = metadata[CaptureMetadataContractKey.cameraRuntime] as? [String: Any]
        XCTAssertEqual(cameraRuntime?["provider"] as? String, "avfoundation")
        XCTAssertEqual(cameraRuntime?["sessionState"] as? String, "capturing")
        XCTAssertEqual(cameraRuntime?["frameCaptureCount"] as? Int, 24)
        XCTAssertEqual(cameraRuntime?["startedAt"] as? Int, 1_700_111_000_000)
        XCTAssertEqual(cameraRuntime?["lastFrameCapturedAt"] as? Int, 1_700_111_005_000)

        XCTAssertNil(metadata[CaptureMetadataContractKey.voiceRuntime])
        XCTAssertEqual(provider.startCaptureCallCount, 1)
    }

    func testMicrophoneStartRequiresApprovalToken() {
        let provider = StubMicrophoneCaptureProvider(
            session: MicrophoneCaptureSession(
                voiceSessionId: "voice_session_1",
                startedAt: Date(timeIntervalSince1970: 1_700_222_000)
            )
        )
        let connector = MicrophoneCaptureConnector(
            provider: provider,
            approvalGate: StaticCaptureApprovalGate(enabledCapabilities: [.microphone])
        )

        XCTAssertThrowsError(
            try connector.startCapture(
                MicrophoneCaptureStartRequest(
                    liveSessionId: "live_voice_1",
                    approvalToken: nil
                )
            )
        ) { error in
            XCTAssertEqual(
                error as? CaptureConnectorError,
                .approvalRequired(.microphone)
            )
        }

        XCTAssertEqual(provider.startCaptureCallCount, 0)
    }

    func testMicrophoneStartBuildsCanonicalVoiceRuntimeMetadata() throws {
        let provider = StubMicrophoneCaptureProvider(
            session: MicrophoneCaptureSession(
                voiceSessionId: "voice_session_2",
                startedAt: Date(timeIntervalSince1970: 1_700_222_010)
            )
        )
        let connector = MicrophoneCaptureConnector(
            provider: provider,
            approvalGate: StaticCaptureApprovalGate(
                enabledCapabilities: [.microphone],
                acceptedTokenIDs: ["approval-voice"]
            )
        )

        let result = try connector.startCapture(
            MicrophoneCaptureStartRequest(
                liveSessionId: "live_voice_2",
                approvalToken: CaptureApprovalToken(id: "approval-voice")
            )
        )

        XCTAssertEqual(result.ingressContext.mutationAuthority, .vc83Backend)

        let metadata = result.ingressContext.metadata.bridgeMetadata()
        XCTAssertEqual(metadata[CaptureMetadataContractKey.liveSessionId] as? String, "live_voice_2")

        let voiceRuntime = metadata[CaptureMetadataContractKey.voiceRuntime] as? [String: Any]
        XCTAssertEqual(voiceRuntime?["voiceSessionId"] as? String, "voice_session_2")
        XCTAssertEqual(voiceRuntime?["sessionState"] as? String, "capturing")

        XCTAssertNil(metadata[CaptureMetadataContractKey.cameraRuntime])
        XCTAssertEqual(provider.startCaptureCallCount, 1)
    }
}

private final class StubScreenCaptureProvider: ScreenCaptureProviding {
    private(set) var snapshotCallCount: Int = 0

    func captureSnapshot(sourceId: String) throws -> ScreenSnapshotArtifact {
        snapshotCallCount += 1
        return ScreenSnapshotArtifact(
            sourceId: sourceId,
            capturedAt: Date(timeIntervalSince1970: 1_700_333_000),
            mimeType: "image/png",
            payloadRef: "storage://screen/snapshot-1"
        )
    }

    func startRecording(
        sourceId: String,
        boundedDurationMs: Int,
        withMicAudio: Bool,
        withSystemAudio: Bool
    ) throws -> ScreenRecordingArtifact {
        ScreenRecordingArtifact(
            sourceId: sourceId,
            recordingId: "recording-1",
            startedAt: Date(timeIntervalSince1970: 1_700_333_010),
            boundedDurationMs: boundedDurationMs,
            withMicAudio: withMicAudio,
            withSystemAudio: withSystemAudio
        )
    }
}

private final class StubCameraCaptureProvider: CameraCaptureProviding {
    private(set) var startCaptureCallCount: Int = 0
    private let startSession: CameraCaptureSession

    init(startSession: CameraCaptureSession) {
        self.startSession = startSession
    }

    func startCapture(sourceId: String) throws -> CameraCaptureSession {
        startCaptureCallCount += 1
        return startSession
    }

    func stopCapture(sessionId: String) throws -> Date {
        Date(timeIntervalSince1970: 1_700_111_999)
    }
}

private final class StubMicrophoneCaptureProvider: MicrophoneCaptureProviding {
    private(set) var startCaptureCallCount: Int = 0
    private let session: MicrophoneCaptureSession

    init(session: MicrophoneCaptureSession) {
        self.session = session
    }

    func startCapture() throws -> MicrophoneCaptureSession {
        startCaptureCallCount += 1
        return session
    }

    func stopCapture(voiceSessionId: String) throws -> Date {
        Date(timeIntervalSince1970: 1_700_222_999)
    }
}
