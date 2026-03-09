import Foundation
import XCTest
@testable import SevenLayersMac
@testable import SevenLayersProtocol

final class DesktopVoiceRuntimeLoopTests: XCTestCase {
    func testPushToTalkForwardsCanonicalTranscriptEnvelope() throws {
        let provider = StubMicrophoneProvider(
            session: MicrophoneCaptureSession(
                voiceSessionId: "voice_session_1",
                startedAt: Date(timeIntervalSince1970: 1_700_900_000)
            )
        )
        let forwarder = TranscriptForwarderSpy()
        let loop = DesktopVoiceRuntimeLoop(
            nodeId: "sevenlayers.node.test",
            bridge: MacCompanionBridge(source: "macos_voice_runtime_test"),
            microphoneConnector: MicrophoneCaptureConnector(
                provider: provider,
                approvalGate: StaticCaptureApprovalGate(
                    enabledCapabilities: [.microphone],
                    acceptedTokenIDs: ["approval_voice_1"]
                )
            ),
            transcriptForwarder: forwarder,
            makeCorrelationId: { "corr_voice_1" }
        )

        try loop.beginPushToTalk(
            DesktopVoiceActivationRequest(
                liveSessionId: " live_voice_1 ",
                approvalToken: CaptureApprovalToken(id: "approval_voice_1"),
                sourceId: "desktop:menu_bar",
                providerId: "avfoundation"
            )
        )

        let forwarded = try loop.forwardTranscript(
            DesktopVoiceTranscriptFrame(
                eventType: .finalTranscript,
                transcriptText: "  hello from desktop runtime  ",
                capturedAt: Date(timeIntervalSince1970: 1_700_900_010)
            )
        )

        XCTAssertEqual(loop.state.lifecycleState, .capturing)
        XCTAssertEqual(loop.state.transcriptForwardCount, 1)
        XCTAssertEqual(forwarded.liveSessionId, "live_voice_1")
        XCTAssertEqual(forwarded.voiceSessionId, "voice_session_1")
        XCTAssertEqual(forwarded.transcriptText, "hello from desktop runtime")
        XCTAssertEqual(forwarded.voiceRuntime["voiceSessionId"], "voice_session_1")
        XCTAssertEqual(forwarder.forwardedEnvelopes, [forwarded])
        XCTAssertEqual(forwarded.envelope.schemaVersion, IngressEnvelope.schemaVersion)
        XCTAssertEqual(forwarded.envelope.mutationAuthority, .vc83Backend)
        XCTAssertFalse(forwarded.envelope.metadata.localMutationAllowed)
        XCTAssertEqual(forwarded.envelope.metadata.sessionID, "live_voice_1")

        if case let .mutatingToolIntent(tool, arguments) = forwarded.envelope.intent {
            XCTAssertEqual(tool, DesktopVoiceRuntimeCommand.transcriptForward)
            XCTAssertEqual(arguments["nodeId"], "sevenlayers.node.test")
            XCTAssertEqual(arguments["liveSessionId"], "live_voice_1")
            XCTAssertEqual(arguments["voiceSessionId"], "voice_session_1")
            XCTAssertEqual(arguments["activationMode"], "push_to_talk")
            XCTAssertEqual(arguments["transcript"], "hello from desktop runtime")
            XCTAssertEqual(arguments["transcriptEvent"], "final_transcript")
            XCTAssertEqual(arguments["sourceId"], "desktop:menu_bar")
            XCTAssertEqual(arguments["providerId"], "avfoundation")
            XCTAssertNotNil(arguments["voiceRuntime"])
        } else {
            XCTFail("Expected mutating transcript-forwarding envelope.")
        }
    }

    func testWakeMonitoringTransitionsToCapturingWhenWakeDetected() throws {
        let loop = DesktopVoiceRuntimeLoop(
            microphoneConnector: MicrophoneCaptureConnector(
                provider: StubMicrophoneProvider(
                    session: MicrophoneCaptureSession(
                        voiceSessionId: "voice_wake_1",
                        startedAt: Date(timeIntervalSince1970: 1_700_901_000)
                    )
                ),
                approvalGate: StaticCaptureApprovalGate(
                    enabledCapabilities: [.microphone],
                    acceptedTokenIDs: ["approval_wake_1"]
                )
            )
        )

        loop.beginWakeMonitoring(
            DesktopVoiceActivationRequest(
                liveSessionId: "live_wake_1",
                approvalToken: CaptureApprovalToken(id: "approval_wake_1")
            )
        )
        XCTAssertEqual(loop.state.lifecycleState, .wakeMonitoring)

        try loop.triggerWakeDetected()

        XCTAssertEqual(loop.state.lifecycleState, .capturing)
        XCTAssertEqual(loop.state.activationMode, .wake)
        XCTAssertEqual(loop.state.liveSessionId, "live_wake_1")
        XCTAssertEqual(loop.state.voiceSessionId, "voice_wake_1")
    }

    func testPushToTalkFailsClosedWhenApprovalMissing() {
        let loop = DesktopVoiceRuntimeLoop(
            microphoneConnector: MicrophoneCaptureConnector(
                provider: StubMicrophoneProvider(
                    session: MicrophoneCaptureSession(
                        voiceSessionId: "voice_missing_approval",
                        startedAt: Date(timeIntervalSince1970: 1_700_902_000)
                    )
                ),
                approvalGate: StaticCaptureApprovalGate(enabledCapabilities: [.microphone])
            )
        )

        XCTAssertThrowsError(
            try loop.beginPushToTalk(
                DesktopVoiceActivationRequest(
                    liveSessionId: "live_missing_approval",
                    approvalToken: nil
                )
            )
        ) { error in
            XCTAssertEqual(
                error as? CaptureConnectorError,
                .approvalRequired(.microphone)
            )
        }

        XCTAssertEqual(loop.state.lifecycleState, .degraded)
        XCTAssertEqual(loop.state.fallbackReason, "approval_required")
        XCTAssertNotNil(loop.state.runtimeError)
    }

    func testRuntimeStreamDegradeStopsCaptureAndEntersFallbackState() throws {
        let provider = StubMicrophoneProvider(
            session: MicrophoneCaptureSession(
                voiceSessionId: "voice_stream_1",
                startedAt: Date(timeIntervalSince1970: 1_700_903_000)
            )
        )
        let loop = DesktopVoiceRuntimeLoop(
            microphoneConnector: MicrophoneCaptureConnector(
                provider: provider,
                approvalGate: StaticCaptureApprovalGate(
                    enabledCapabilities: [.microphone],
                    acceptedTokenIDs: ["approval_stream_1"]
                )
            )
        )

        try loop.beginPushToTalk(
            DesktopVoiceActivationRequest(
                liveSessionId: "live_stream_1",
                approvalToken: CaptureApprovalToken(id: "approval_stream_1")
            )
        )
        XCTAssertEqual(loop.state.lifecycleState, .capturing)

        loop.handleRuntimeStreamDegraded(
            fallbackReason: "transcription_stream_degraded",
            runtimeError: "stt_timeout"
        )

        XCTAssertEqual(loop.state.lifecycleState, .degraded)
        XCTAssertEqual(loop.state.fallbackReason, "transcription_stream_degraded")
        XCTAssertEqual(loop.state.runtimeError, "stt_timeout")
        XCTAssertEqual(provider.stopCaptureCallCount, 1)
        XCTAssertEqual(provider.lastStoppedVoiceSessionID, "voice_stream_1")
    }

    func testForwardTranscriptRequiresActiveCapture() {
        let loop = DesktopVoiceRuntimeLoop(
            microphoneConnector: MicrophoneCaptureConnector(
                provider: StubMicrophoneProvider(
                    session: MicrophoneCaptureSession(
                        voiceSessionId: "voice_unused",
                        startedAt: Date(timeIntervalSince1970: 1_700_904_000)
                    )
                ),
                approvalGate: StaticCaptureApprovalGate(enabledCapabilities: [.microphone])
            )
        )

        XCTAssertThrowsError(
            try loop.forwardTranscript(
                DesktopVoiceTranscriptFrame(
                    eventType: .partialTranscript,
                    transcriptText: "hello"
                )
            )
        ) { error in
            XCTAssertEqual(error as? DesktopVoiceRuntimeLoopError, .activeCaptureMissing)
        }
    }
}

private final class StubMicrophoneProvider: MicrophoneCaptureProviding {
    private let session: MicrophoneCaptureSession
    private let startError: Error?
    private let stopError: Error?

    private(set) var stopCaptureCallCount = 0
    private(set) var lastStoppedVoiceSessionID: String?

    init(
        session: MicrophoneCaptureSession,
        startError: Error? = nil,
        stopError: Error? = nil
    ) {
        self.session = session
        self.startError = startError
        self.stopError = stopError
    }

    func startCapture() throws -> MicrophoneCaptureSession {
        if let startError {
            throw startError
        }
        return session
    }

    func stopCapture(voiceSessionId: String) throws -> Date {
        stopCaptureCallCount += 1
        lastStoppedVoiceSessionID = voiceSessionId
        if let stopError {
            throw stopError
        }
        return Date(timeIntervalSince1970: 1_700_903_010)
    }
}

private final class TranscriptForwarderSpy: DesktopVoiceTranscriptForwarding {
    private(set) var forwardedEnvelopes: [DesktopVoiceTranscriptForwardingEnvelope] = []

    func forward(_ envelope: DesktopVoiceTranscriptForwardingEnvelope) throws {
        forwardedEnvelopes.append(envelope)
    }
}
