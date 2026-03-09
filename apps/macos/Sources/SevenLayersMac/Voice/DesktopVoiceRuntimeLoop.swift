import Foundation
import SevenLayersProtocol

public enum DesktopVoiceActivationMode: String, Equatable {
    case wake = "wake"
    case pushToTalk = "push_to_talk"
}

public enum DesktopVoiceTranscriptEventType: String, Equatable {
    case partialTranscript = "partial_transcript"
    case finalTranscript = "final_transcript"
}

public struct DesktopVoiceActivationRequest: Equatable {
    public let liveSessionId: String
    public let approvalToken: CaptureApprovalToken?
    public let sourceId: String?
    public let providerId: String?

    public init(
        liveSessionId: String,
        approvalToken: CaptureApprovalToken?,
        sourceId: String? = nil,
        providerId: String? = nil
    ) {
        self.liveSessionId = liveSessionId
        self.approvalToken = approvalToken
        self.sourceId = sourceId?.trimmingCharacters(in: .whitespacesAndNewlines)
        self.providerId = providerId?.trimmingCharacters(in: .whitespacesAndNewlines)
    }
}

public struct DesktopVoiceTranscriptFrame: Equatable {
    public let eventType: DesktopVoiceTranscriptEventType
    public let transcriptText: String
    public let capturedAt: Date

    public init(
        eventType: DesktopVoiceTranscriptEventType,
        transcriptText: String,
        capturedAt: Date = Date()
    ) {
        self.eventType = eventType
        self.transcriptText = transcriptText
        self.capturedAt = capturedAt
    }
}

public enum DesktopVoiceRuntimeLifecycleState: String, Equatable {
    case idle = "idle"
    case wakeMonitoring = "wake_monitoring"
    case capturing = "capturing"
    case degraded = "degraded"
}

public struct DesktopVoiceRuntimeState: Equatable {
    public let lifecycleState: DesktopVoiceRuntimeLifecycleState
    public let liveSessionId: String?
    public let voiceSessionId: String?
    public let activationMode: DesktopVoiceActivationMode?
    public let transcriptForwardCount: Int
    public let fallbackReason: String?
    public let runtimeError: String?

    public init(
        lifecycleState: DesktopVoiceRuntimeLifecycleState = .idle,
        liveSessionId: String? = nil,
        voiceSessionId: String? = nil,
        activationMode: DesktopVoiceActivationMode? = nil,
        transcriptForwardCount: Int = 0,
        fallbackReason: String? = nil,
        runtimeError: String? = nil
    ) {
        self.lifecycleState = lifecycleState
        self.liveSessionId = liveSessionId
        self.voiceSessionId = voiceSessionId
        self.activationMode = activationMode
        self.transcriptForwardCount = max(0, transcriptForwardCount)
        self.fallbackReason = fallbackReason
        self.runtimeError = runtimeError
    }
}

public enum DesktopVoiceRuntimeLoopError: Error, Equatable {
    case wakeLoopNotArmed
    case activeCaptureMissing
    case emptyTranscript
    case missingApprovalArtifact
}

public struct DesktopVoiceTranscriptForwardingEnvelope: Equatable {
    public let envelope: IngressEnvelope
    public let liveSessionId: String
    public let voiceSessionId: String
    public let transcriptEvent: DesktopVoiceTranscriptEventType
    public let transcriptText: String
    public let voiceRuntime: [String: String]
}

public protocol DesktopVoiceTranscriptForwarding {
    func forward(_ envelope: DesktopVoiceTranscriptForwardingEnvelope) throws
}

public struct NoopDesktopVoiceTranscriptForwarder: DesktopVoiceTranscriptForwarding {
    public init() {}

    public func forward(_ envelope: DesktopVoiceTranscriptForwardingEnvelope) throws {}
}

public enum DesktopVoiceRuntimeCommand {
    public static let transcriptForward = "desktop.voice.transcript.forward"
}

public final class DesktopVoiceRuntimeLoop {
    private struct ActiveCaptureContext {
        let mode: DesktopVoiceActivationMode
        let liveSessionId: String
        let voiceSessionId: String
        let sourceId: String?
        let providerId: String?
        let approvalToken: CaptureApprovalToken
    }

    private let nodeId: String
    private let bridge: any CompanionBridgeBoundary
    private let microphoneConnector: MicrophoneCaptureConnector
    private let transcriptForwarder: any DesktopVoiceTranscriptForwarding
    private let makeCorrelationId: () -> String

    private var pendingWakeRequest: DesktopVoiceActivationRequest?
    private var activeCaptureContext: ActiveCaptureContext?

    public private(set) var state = DesktopVoiceRuntimeState()

    public init(
        nodeId: String = "sevenlayers.macos.node",
        bridge: any CompanionBridgeBoundary = MacCompanionBridge(),
        microphoneConnector: MicrophoneCaptureConnector,
        transcriptForwarder: any DesktopVoiceTranscriptForwarding = NoopDesktopVoiceTranscriptForwarder(),
        makeCorrelationId: @escaping () -> String = { UUID().uuidString }
    ) {
        self.nodeId = nodeId
        self.bridge = bridge
        self.microphoneConnector = microphoneConnector
        self.transcriptForwarder = transcriptForwarder
        self.makeCorrelationId = makeCorrelationId
    }

    public func beginWakeMonitoring(_ request: DesktopVoiceActivationRequest) {
        pendingWakeRequest = request
        clearCaptureOnlyState(lifecycle: .wakeMonitoring)
    }

    public func triggerWakeDetected() throws {
        guard let request = pendingWakeRequest else {
            throw DesktopVoiceRuntimeLoopError.wakeLoopNotArmed
        }
        try startCapture(mode: .wake, request: request)
    }

    public func beginPushToTalk(_ request: DesktopVoiceActivationRequest) throws {
        pendingWakeRequest = nil
        try startCapture(mode: .pushToTalk, request: request)
    }

    public func endPushToTalk() throws {
        guard let activeCaptureContext else {
            throw DesktopVoiceRuntimeLoopError.activeCaptureMissing
        }
        _ = try microphoneConnector.stopCapture(
            MicrophoneCaptureStopRequest(
                liveSessionId: activeCaptureContext.liveSessionId,
                voiceSessionId: activeCaptureContext.voiceSessionId,
                approvalToken: activeCaptureContext.approvalToken
            )
        )

        state = DesktopVoiceRuntimeState(
            lifecycleState: .idle,
            liveSessionId: activeCaptureContext.liveSessionId,
            transcriptForwardCount: state.transcriptForwardCount
        )
        self.activeCaptureContext = nil
    }

    public func forwardTranscript(_ frame: DesktopVoiceTranscriptFrame) throws -> DesktopVoiceTranscriptForwardingEnvelope {
        guard let activeCaptureContext else {
            throw DesktopVoiceRuntimeLoopError.activeCaptureMissing
        }

        let normalizedTranscript = frame.transcriptText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !normalizedTranscript.isEmpty else {
            throw DesktopVoiceRuntimeLoopError.emptyTranscript
        }

        let approvalArtifact = ApprovalArtifact(
            id: activeCaptureContext.approvalToken.id,
            tokenClass: activeCaptureContext.approvalToken.tokenClass,
            issuedAt: activeCaptureContext.approvalToken.issuedAt
        )
        guard !approvalArtifact.id.isEmpty else {
            throw DesktopVoiceRuntimeLoopError.missingApprovalArtifact
        }

        let runtimeMetadata = resolveRuntimeMetadata(
            activeCaptureContext: activeCaptureContext,
            frame: frame,
            transcript: normalizedTranscript
        )

        let envelope = try bridge.makeMutatingEnvelope(
            tool: DesktopVoiceRuntimeCommand.transcriptForward,
            arguments: makeTranscriptArguments(
                activeCaptureContext: activeCaptureContext,
                frame: frame,
                transcript: normalizedTranscript,
                runtimeMetadata: runtimeMetadata
            ),
            correlationID: makeCorrelationId(),
            approval: approvalArtifact
        )

        let forwardingEnvelope = DesktopVoiceTranscriptForwardingEnvelope(
            envelope: envelope,
            liveSessionId: activeCaptureContext.liveSessionId,
            voiceSessionId: activeCaptureContext.voiceSessionId,
            transcriptEvent: frame.eventType,
            transcriptText: normalizedTranscript,
            voiceRuntime: runtimeMetadata
        )

        do {
            try transcriptForwarder.forward(forwardingEnvelope)
        } catch {
            applyDegradedFallback(
                fallbackReason: "transcript_forwarding_failed",
                runtimeError: String(describing: error)
            )
            throw error
        }

        state = DesktopVoiceRuntimeState(
            lifecycleState: .capturing,
            liveSessionId: activeCaptureContext.liveSessionId,
            voiceSessionId: activeCaptureContext.voiceSessionId,
            activationMode: activeCaptureContext.mode,
            transcriptForwardCount: state.transcriptForwardCount + 1
        )

        return forwardingEnvelope
    }

    public func handleRuntimeStreamDegraded(
        fallbackReason: String = "runtime_stream_degraded",
        runtimeError: String
    ) {
        guard let activeCaptureContext else {
            applyDegradedFallback(
                fallbackReason: fallbackReason,
                runtimeError: runtimeError
            )
            return
        }

        _ = try? microphoneConnector.stopCapture(
            MicrophoneCaptureStopRequest(
                liveSessionId: activeCaptureContext.liveSessionId,
                voiceSessionId: activeCaptureContext.voiceSessionId,
                fallbackReason: fallbackReason,
                runtimeError: runtimeError,
                approvalToken: activeCaptureContext.approvalToken
            )
        )

        applyDegradedFallback(
            fallbackReason: fallbackReason,
            runtimeError: runtimeError
        )
    }

    private func startCapture(mode: DesktopVoiceActivationMode, request: DesktopVoiceActivationRequest) throws {
        do {
            let startResult = try microphoneConnector.startCapture(
                MicrophoneCaptureStartRequest(
                    liveSessionId: request.liveSessionId,
                    approvalToken: request.approvalToken
                )
            )

            guard let approvalToken = request.approvalToken else {
                applyDegradedFallback(
                    fallbackReason: "approval_required",
                    runtimeError: "missing_approval_token"
                )
                throw DesktopVoiceRuntimeLoopError.missingApprovalArtifact
            }

            let liveSessionId = startResult.ingressContext.metadata.liveSessionId
            let active = ActiveCaptureContext(
                mode: mode,
                liveSessionId: liveSessionId,
                voiceSessionId: startResult.session.voiceSessionId,
                sourceId: request.sourceId,
                providerId: request.providerId,
                approvalToken: approvalToken
            )

            activeCaptureContext = active
            state = DesktopVoiceRuntimeState(
                lifecycleState: .capturing,
                liveSessionId: liveSessionId,
                voiceSessionId: startResult.session.voiceSessionId,
                activationMode: mode,
                transcriptForwardCount: state.transcriptForwardCount
            )
        } catch {
            applyDegradedFallback(
                fallbackReason: fallbackReason(from: error),
                runtimeError: String(describing: error)
            )
            throw error
        }
    }

    private func clearCaptureOnlyState(lifecycle: DesktopVoiceRuntimeLifecycleState) {
        state = DesktopVoiceRuntimeState(
            lifecycleState: lifecycle,
            liveSessionId: state.liveSessionId,
            transcriptForwardCount: state.transcriptForwardCount
        )
        activeCaptureContext = nil
    }

    private func applyDegradedFallback(fallbackReason: String, runtimeError: String?) {
        state = DesktopVoiceRuntimeState(
            lifecycleState: .degraded,
            liveSessionId: activeCaptureContext?.liveSessionId ?? state.liveSessionId,
            voiceSessionId: activeCaptureContext?.voiceSessionId,
            transcriptForwardCount: state.transcriptForwardCount,
            fallbackReason: fallbackReason,
            runtimeError: runtimeError
        )
        activeCaptureContext = nil
    }

    private func fallbackReason(from error: Error) -> String {
        if let captureError = error as? CaptureConnectorError {
            switch captureError {
            case .missingLiveSessionId:
                return "missing_live_session_id"
            case .capabilityDisabled:
                return "capability_disabled"
            case .approvalRequired:
                return "approval_required"
            case .invalidApprovalTokenClass:
                return "invalid_approval_token_class"
            case .approvalRejected:
                return "approval_rejected"
            }
        }

        if let providerError = error as? AVFoundationMicrophoneCaptureProviderError {
            switch providerError {
            case .permissionDenied:
                return "microphone_permission_denied"
            case .sessionAlreadyActive:
                return "microphone_session_already_active"
            case .sessionNotFound:
                return "microphone_session_not_found"
            case .sessionExpired:
                return "microphone_session_expired"
            }
        }

        return "capture_runtime_error"
    }

    private func makeTranscriptArguments(
        activeCaptureContext: ActiveCaptureContext,
        frame: DesktopVoiceTranscriptFrame,
        transcript: String,
        runtimeMetadata: [String: String]
    ) -> [String: String] {
        var arguments: [String: String] = [
            "nodeId": nodeId,
            "liveSessionId": activeCaptureContext.liveSessionId,
            "voiceSessionId": activeCaptureContext.voiceSessionId,
            "activationMode": activeCaptureContext.mode.rawValue,
            "transcript": transcript,
            "transcriptEvent": frame.eventType.rawValue,
            "capturedAtUnixMs": unixMilliseconds(frame.capturedAt),
            "source": "macos_native_companion",
            "contractVersion": IngressEnvelope.schemaVersion,
        ]

        if let sourceId = activeCaptureContext.sourceId, !sourceId.isEmpty {
            arguments["sourceId"] = sourceId
        }
        if let providerId = activeCaptureContext.providerId, !providerId.isEmpty {
            arguments["providerId"] = providerId
        }

        if let voiceRuntimePayload = encodedVoiceRuntimePayload(runtimeMetadata) {
            arguments["voiceRuntime"] = voiceRuntimePayload
        }

        return arguments
    }

    private func resolveRuntimeMetadata(
        activeCaptureContext: ActiveCaptureContext,
        frame: DesktopVoiceTranscriptFrame,
        transcript: String
    ) -> [String: String] {
        var runtime: [String: String] = [
            "voiceSessionId": activeCaptureContext.voiceSessionId,
            "sessionState": "transcribed",
            "liveSessionId": activeCaptureContext.liveSessionId,
            "transcriptEvent": frame.eventType.rawValue,
            "transcript": transcript,
            "capturedAtUnixMs": unixMilliseconds(frame.capturedAt),
            "sourceClass": "desktop_native_companion",
            "sourceId": activeCaptureContext.sourceId ?? "sevenlayers_macos_companion",
        ]

        if let providerId = activeCaptureContext.providerId, !providerId.isEmpty {
            runtime["providerId"] = providerId
        }
        if let fallbackReason = state.fallbackReason, !fallbackReason.isEmpty {
            runtime["fallbackReason"] = fallbackReason
        }
        if let runtimeError = state.runtimeError, !runtimeError.isEmpty {
            runtime["runtimeError"] = runtimeError
        }

        return runtime
    }

    private func encodedVoiceRuntimePayload(_ runtimeMetadata: [String: String]) -> String? {
        guard JSONSerialization.isValidJSONObject(runtimeMetadata) else {
            return nil
        }
        guard
            let data = try? JSONSerialization.data(withJSONObject: runtimeMetadata, options: [.sortedKeys]),
            let encoded = String(data: data, encoding: .utf8)
        else {
            return nil
        }
        return encoded
    }
}

private func unixMilliseconds(_ date: Date) -> String {
    String(Int((date.timeIntervalSince1970 * 1000).rounded()))
}
