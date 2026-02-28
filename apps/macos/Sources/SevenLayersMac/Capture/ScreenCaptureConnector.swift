import Foundation

public struct ScreenSnapshotArtifact: Equatable {
    public let sourceId: String
    public let capturedAt: Date
    public let mimeType: String
    public let payloadRef: String?

    public init(
        sourceId: String,
        capturedAt: Date,
        mimeType: String = "image/png",
        payloadRef: String? = nil
    ) {
        self.sourceId = sourceId
        self.capturedAt = capturedAt
        self.mimeType = mimeType
        self.payloadRef = payloadRef
    }
}

public struct ScreenRecordingArtifact: Equatable {
    public let sourceId: String
    public let recordingId: String
    public let startedAt: Date
    public let boundedDurationMs: Int
    public let withMicAudio: Bool
    public let withSystemAudio: Bool

    public init(
        sourceId: String,
        recordingId: String,
        startedAt: Date,
        boundedDurationMs: Int,
        withMicAudio: Bool,
        withSystemAudio: Bool
    ) {
        self.sourceId = sourceId
        self.recordingId = recordingId
        self.startedAt = startedAt
        self.boundedDurationMs = boundedDurationMs
        self.withMicAudio = withMicAudio
        self.withSystemAudio = withSystemAudio
    }
}

public protocol ScreenCaptureProviding {
    func captureSnapshot(sourceId: String) throws -> ScreenSnapshotArtifact

    func startRecording(
        sourceId: String,
        boundedDurationMs: Int,
        withMicAudio: Bool,
        withSystemAudio: Bool
    ) throws -> ScreenRecordingArtifact
}

public struct ScreenSnapshotRequest: Equatable {
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

public struct ScreenRecordingStartRequest: Equatable {
    public let liveSessionId: String
    public let sourceId: String?
    public let requestedDurationMs: Int
    public let withMicAudio: Bool
    public let withSystemAudio: Bool
    public let approvalToken: CaptureApprovalToken?

    public init(
        liveSessionId: String,
        sourceId: String? = nil,
        requestedDurationMs: Int,
        withMicAudio: Bool = false,
        withSystemAudio: Bool = false,
        approvalToken: CaptureApprovalToken?
    ) {
        self.liveSessionId = liveSessionId
        self.sourceId = sourceId
        self.requestedDurationMs = requestedDurationMs
        self.withMicAudio = withMicAudio
        self.withSystemAudio = withSystemAudio
        self.approvalToken = approvalToken
    }
}

public struct ScreenSnapshotResult: Equatable {
    public let artifact: ScreenSnapshotArtifact
    public let ingressContext: CaptureIngressContext
}

public struct ScreenRecordingStartResult: Equatable {
    public let artifact: ScreenRecordingArtifact
    public let ingressContext: CaptureIngressContext
    public let requestedDurationMs: Int
    public let boundedDurationMs: Int
}

public struct ScreenCaptureConnector {
    private let provider: any ScreenCaptureProviding
    private let approvalGate: any CaptureApprovalGating
    private let defaultSourceId: String
    private let minDurationMs: Int
    private let maxDurationMs: Int

    public init(
        provider: any ScreenCaptureProviding,
        approvalGate: any CaptureApprovalGating = FailClosedCaptureApprovalGate(),
        defaultSourceId: String = "desktop:primary",
        minDurationMs: Int = 250,
        maxDurationMs: Int = 30_000
    ) {
        self.provider = provider
        self.approvalGate = approvalGate
        self.defaultSourceId = defaultSourceId
        self.minDurationMs = max(1, minDurationMs)
        self.maxDurationMs = max(maxDurationMs, self.minDurationMs)
    }

    public func captureSnapshot(
        _ request: ScreenSnapshotRequest
    ) throws -> ScreenSnapshotResult {
        let liveSessionId = try validateCaptureAuthorization(
            liveSessionId: request.liveSessionId,
            capability: .screenSnapshot,
            approvalToken: request.approvalToken,
            gate: approvalGate
        )

        let sourceId = resolveSourceId(request.sourceId)
        let artifact = try provider.captureSnapshot(sourceId: sourceId)
        let ingressContext = CaptureIngressContext(
            metadata: try CaptureIngressMetadata(liveSessionId: liveSessionId)
        )

        return ScreenSnapshotResult(
            artifact: artifact,
            ingressContext: ingressContext
        )
    }

    public func startRecording(
        _ request: ScreenRecordingStartRequest
    ) throws -> ScreenRecordingStartResult {
        let liveSessionId = try validateCaptureAuthorization(
            liveSessionId: request.liveSessionId,
            capability: .screenRecord,
            approvalToken: request.approvalToken,
            gate: approvalGate
        )

        let sourceId = resolveSourceId(request.sourceId)
        let boundedDurationMs = clampDuration(request.requestedDurationMs)
        let artifact = try provider.startRecording(
            sourceId: sourceId,
            boundedDurationMs: boundedDurationMs,
            withMicAudio: request.withMicAudio,
            withSystemAudio: request.withSystemAudio
        )

        let ingressContext = CaptureIngressContext(
            metadata: try CaptureIngressMetadata(liveSessionId: liveSessionId)
        )

        return ScreenRecordingStartResult(
            artifact: artifact,
            ingressContext: ingressContext,
            requestedDurationMs: request.requestedDurationMs,
            boundedDurationMs: boundedDurationMs
        )
    }

    private func resolveSourceId(_ sourceId: String?) -> String {
        let normalized = sourceId?.trimmingCharacters(in: .whitespacesAndNewlines)
        guard let normalized, !normalized.isEmpty else {
            return defaultSourceId
        }
        return normalized
    }

    private func clampDuration(_ requestedDurationMs: Int) -> Int {
        if requestedDurationMs <= 0 {
            return minDurationMs
        }
        return min(maxDurationMs, max(minDurationMs, requestedDurationMs))
    }
}
