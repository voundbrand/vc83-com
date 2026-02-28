import Foundation

public struct MicrophoneCaptureSession: Equatable {
    public let voiceSessionId: String
    public let startedAt: Date
    public let sampleRateHz: Int?
    public let channels: Int?

    public init(
        voiceSessionId: String,
        startedAt: Date,
        sampleRateHz: Int? = nil,
        channels: Int? = nil
    ) {
        self.voiceSessionId = voiceSessionId
        self.startedAt = startedAt
        self.sampleRateHz = sampleRateHz
        self.channels = channels
    }
}

public protocol MicrophoneCaptureProviding {
    func startCapture() throws -> MicrophoneCaptureSession
    func stopCapture(voiceSessionId: String) throws -> Date
}

public struct MicrophoneCaptureStartRequest: Equatable {
    public let liveSessionId: String
    public let approvalToken: CaptureApprovalToken?

    public init(liveSessionId: String, approvalToken: CaptureApprovalToken?) {
        self.liveSessionId = liveSessionId
        self.approvalToken = approvalToken
    }
}

public struct MicrophoneCaptureStopRequest: Equatable {
    public let liveSessionId: String
    public let voiceSessionId: String
    public let fallbackReason: String?
    public let runtimeError: String?
    public let approvalToken: CaptureApprovalToken?

    public init(
        liveSessionId: String,
        voiceSessionId: String,
        fallbackReason: String? = nil,
        runtimeError: String? = nil,
        approvalToken: CaptureApprovalToken?
    ) {
        self.liveSessionId = liveSessionId
        self.voiceSessionId = voiceSessionId
        self.fallbackReason = fallbackReason
        self.runtimeError = runtimeError
        self.approvalToken = approvalToken
    }
}

public struct MicrophoneCaptureStartResult: Equatable {
    public let session: MicrophoneCaptureSession
    public let ingressContext: CaptureIngressContext
}

public struct MicrophoneCaptureStopResult: Equatable {
    public let voiceSessionId: String
    public let stoppedAt: Date
    public let ingressContext: CaptureIngressContext
}

public struct MicrophoneCaptureConnector {
    private let provider: any MicrophoneCaptureProviding
    private let approvalGate: any CaptureApprovalGating

    public init(
        provider: any MicrophoneCaptureProviding,
        approvalGate: any CaptureApprovalGating = FailClosedCaptureApprovalGate()
    ) {
        self.provider = provider
        self.approvalGate = approvalGate
    }

    public func startCapture(
        _ request: MicrophoneCaptureStartRequest
    ) throws -> MicrophoneCaptureStartResult {
        let liveSessionId = try validateCaptureAuthorization(
            liveSessionId: request.liveSessionId,
            capability: .microphone,
            approvalToken: request.approvalToken,
            gate: approvalGate
        )

        let session = try provider.startCapture()

        let metadata = try CaptureIngressMetadata(
            liveSessionId: liveSessionId,
            voiceRuntime: VoiceRuntimeMetadata(
                voiceSessionId: session.voiceSessionId,
                sessionState: "capturing"
            )
        )

        return MicrophoneCaptureStartResult(
            session: session,
            ingressContext: CaptureIngressContext(metadata: metadata)
        )
    }

    public func stopCapture(
        _ request: MicrophoneCaptureStopRequest
    ) throws -> MicrophoneCaptureStopResult {
        let liveSessionId = try validateCaptureAuthorization(
            liveSessionId: request.liveSessionId,
            capability: .microphone,
            approvalToken: request.approvalToken,
            gate: approvalGate
        )

        let stoppedAt = try provider.stopCapture(voiceSessionId: request.voiceSessionId)

        let metadata = try CaptureIngressMetadata(
            liveSessionId: liveSessionId,
            voiceRuntime: VoiceRuntimeMetadata(
                voiceSessionId: request.voiceSessionId,
                sessionState: "stopped",
                runtimeError: request.runtimeError,
                fallbackReason: request.fallbackReason
            )
        )

        return MicrophoneCaptureStopResult(
            voiceSessionId: request.voiceSessionId,
            stoppedAt: stoppedAt,
            ingressContext: CaptureIngressContext(metadata: metadata)
        )
    }
}
