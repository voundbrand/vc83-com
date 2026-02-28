import Foundation

public struct CameraCaptureSession: Equatable {
    public let sessionId: String
    public let sourceId: String
    public let provider: String
    public let startedAt: Date
    public let lastFrameCapturedAt: Date?
    public let frameCaptureCount: Int?

    public init(
        sessionId: String,
        sourceId: String,
        provider: String,
        startedAt: Date,
        lastFrameCapturedAt: Date? = nil,
        frameCaptureCount: Int? = nil
    ) {
        self.sessionId = sessionId
        self.sourceId = sourceId
        self.provider = provider
        self.startedAt = startedAt
        self.lastFrameCapturedAt = lastFrameCapturedAt
        self.frameCaptureCount = frameCaptureCount
    }
}

public protocol CameraCaptureProviding {
    func startCapture(sourceId: String) throws -> CameraCaptureSession
    func stopCapture(sessionId: String) throws -> Date
}

public struct CameraCaptureStartRequest: Equatable {
    public let liveSessionId: String
    public let sourceId: String?
    public let approvalToken: CaptureApprovalToken?

    public init(
        liveSessionId: String,
        sourceId: String? = nil,
        approvalToken: CaptureApprovalToken?
    ) {
        self.liveSessionId = liveSessionId
        self.sourceId = sourceId
        self.approvalToken = approvalToken
    }
}

public struct CameraCaptureStopRequest: Equatable {
    public let liveSessionId: String
    public let sessionId: String
    public let frameCaptureCount: Int?
    public let fallbackReason: String?
    public let approvalToken: CaptureApprovalToken?

    public init(
        liveSessionId: String,
        sessionId: String,
        frameCaptureCount: Int? = nil,
        fallbackReason: String? = nil,
        approvalToken: CaptureApprovalToken?
    ) {
        self.liveSessionId = liveSessionId
        self.sessionId = sessionId
        self.frameCaptureCount = frameCaptureCount
        self.fallbackReason = fallbackReason
        self.approvalToken = approvalToken
    }
}

public struct CameraCaptureStartResult: Equatable {
    public let session: CameraCaptureSession
    public let ingressContext: CaptureIngressContext
}

public struct CameraCaptureStopResult: Equatable {
    public let sessionId: String
    public let stoppedAt: Date
    public let ingressContext: CaptureIngressContext
}

public struct CameraCaptureConnector {
    private let provider: any CameraCaptureProviding
    private let approvalGate: any CaptureApprovalGating
    private let defaultSourceId: String

    public init(
        provider: any CameraCaptureProviding,
        approvalGate: any CaptureApprovalGating = FailClosedCaptureApprovalGate(),
        defaultSourceId: String = "webcam:primary"
    ) {
        self.provider = provider
        self.approvalGate = approvalGate
        self.defaultSourceId = defaultSourceId
    }

    public func startCapture(
        _ request: CameraCaptureStartRequest
    ) throws -> CameraCaptureStartResult {
        let liveSessionId = try validateCaptureAuthorization(
            liveSessionId: request.liveSessionId,
            capability: .camera,
            approvalToken: request.approvalToken,
            gate: approvalGate
        )

        let sourceId = resolveSourceId(request.sourceId)
        let session = try provider.startCapture(sourceId: sourceId)

        let metadata = try CaptureIngressMetadata(
            liveSessionId: liveSessionId,
            cameraRuntime: CameraRuntimeMetadata(
                provider: session.provider,
                sessionState: "capturing",
                startedAt: session.startedAt,
                lastFrameCapturedAt: session.lastFrameCapturedAt,
                frameCaptureCount: session.frameCaptureCount
            )
        )

        return CameraCaptureStartResult(
            session: session,
            ingressContext: CaptureIngressContext(metadata: metadata)
        )
    }

    public func stopCapture(
        _ request: CameraCaptureStopRequest
    ) throws -> CameraCaptureStopResult {
        let liveSessionId = try validateCaptureAuthorization(
            liveSessionId: request.liveSessionId,
            capability: .camera,
            approvalToken: request.approvalToken,
            gate: approvalGate
        )

        let stoppedAt = try provider.stopCapture(sessionId: request.sessionId)

        let metadata = try CaptureIngressMetadata(
            liveSessionId: liveSessionId,
            cameraRuntime: CameraRuntimeMetadata(
                sessionState: "stopped",
                lastFrameCapturedAt: stoppedAt,
                frameCaptureCount: request.frameCaptureCount,
                fallbackReason: request.fallbackReason
            )
        )

        return CameraCaptureStopResult(
            sessionId: request.sessionId,
            stoppedAt: stoppedAt,
            ingressContext: CaptureIngressContext(metadata: metadata)
        )
    }

    private func resolveSourceId(_ sourceId: String?) -> String {
        let normalized = sourceId?.trimmingCharacters(in: .whitespacesAndNewlines)
        guard let normalized, !normalized.isEmpty else {
            return defaultSourceId
        }
        return normalized
    }
}
