import Foundation
import SevenLayersProtocol

public enum DesktopNodeTransport {
    public static let contractVersion = "sevenlayers_macos_node_gateway_v1"
}

public struct DesktopNodeCapabilityDescriptor: Equatable {
    public let command: String
    public let capability: CaptureCapability
    public let permissionKey: String
    public let requiresApprovalTokenClass: String
    public let enabled: Bool

    public init(
        command: String,
        capability: CaptureCapability,
        permissionKey: String,
        requiresApprovalTokenClass: String,
        enabled: Bool
    ) {
        self.command = command
        self.capability = capability
        self.permissionKey = permissionKey
        self.requiresApprovalTokenClass = requiresApprovalTokenClass
        self.enabled = enabled
    }
}

public struct DesktopNodeCapabilityDiscovery: Equatable {
    public let transportContractVersion: String
    public let nodeID: String
    public let permissions: [String: Bool]
    public let capabilities: [DesktopNodeCapabilityDescriptor]

    public init(
        transportContractVersion: String = DesktopNodeTransport.contractVersion,
        nodeID: String,
        permissions: [String: Bool],
        capabilities: [DesktopNodeCapabilityDescriptor]
    ) {
        self.transportContractVersion = transportContractVersion
        self.nodeID = nodeID
        self.permissions = permissions
        self.capabilities = capabilities
    }
}

public struct DesktopScreenSnapshotInvocation: Equatable {
    public let liveSessionID: String
    public let correlationID: String?
    public let sourceID: String?
    public let approvalToken: CaptureApprovalToken?

    public init(
        liveSessionID: String,
        correlationID: String? = nil,
        sourceID: String? = nil,
        approvalToken: CaptureApprovalToken?
    ) {
        self.liveSessionID = liveSessionID
        self.correlationID = correlationID
        self.sourceID = sourceID
        self.approvalToken = approvalToken
    }
}

public struct DesktopScreenSnapshotExecution: Equatable {
    public let artifact: ScreenSnapshotArtifact
    public let envelope: IngressEnvelope
    public let observabilitySignal: MacCompanionObservabilitySignal

    public init(
        artifact: ScreenSnapshotArtifact,
        envelope: IngressEnvelope,
        observabilitySignal: MacCompanionObservabilitySignal
    ) {
        self.artifact = artifact
        self.envelope = envelope
        self.observabilitySignal = observabilitySignal
    }
}

public protocol MacCompanionTelemetryRecording {
    func record(signal: MacCompanionObservabilitySignal)
}

public struct NoopMacCompanionTelemetryRecorder: MacCompanionTelemetryRecording {
    public init() {}

    public func record(signal: MacCompanionObservabilitySignal) {}
}

public enum DesktopNodeCommand {
    public static let screenSnapshot = "desktop.capture.screen.snapshot"
    public static let screenRecord = "desktop.capture.screen.record"
    public static let camera = "desktop.capture.camera"
    public static let microphone = "desktop.capture.microphone"
}

public final class DesktopNodeGateway {
    private let nodeID: String
    private let bridge: any CompanionBridgeBoundary
    private let captureApprovalGate: any CaptureApprovalGating
    private let screenCaptureConnector: ScreenCaptureConnector
    private let telemetryRecorder: any MacCompanionTelemetryRecording
    private let makeCorrelationID: () -> String

    public init(
        nodeID: String = "sevenlayers.macos.node",
        bridge: any CompanionBridgeBoundary = MacCompanionBridge(),
        captureApprovalGate: any CaptureApprovalGating = FailClosedCaptureApprovalGate(),
        screenCaptureProvider: any ScreenCaptureProviding = CoreGraphicsScreenCaptureProvider(),
        telemetryRecorder: any MacCompanionTelemetryRecording = NoopMacCompanionTelemetryRecorder(),
        makeCorrelationID: @escaping () -> String = { UUID().uuidString }
    ) {
        self.nodeID = nodeID
        self.bridge = bridge
        self.captureApprovalGate = captureApprovalGate
        self.screenCaptureConnector = ScreenCaptureConnector(
            provider: screenCaptureProvider,
            approvalGate: captureApprovalGate
        )
        self.telemetryRecorder = telemetryRecorder
        self.makeCorrelationID = makeCorrelationID
    }

    public func discoverCapabilities() -> DesktopNodeCapabilityDiscovery {
        let capabilityStates: [(CaptureCapability, String, String)] = [
            (.screenSnapshot, DesktopNodeCommand.screenSnapshot, "screenRecording"),
            (.screenRecord, DesktopNodeCommand.screenRecord, "screenRecording"),
            (.camera, DesktopNodeCommand.camera, "camera"),
            (.microphone, DesktopNodeCommand.microphone, "microphone"),
        ]

        var permissions: [String: Bool] = [:]
        var capabilities: [DesktopNodeCapabilityDescriptor] = []

        for state in capabilityStates {
            let isEnabled = captureApprovalGate.isCapabilityEnabled(state.0)
            permissions[state.2] = (permissions[state.2] ?? false) || isEnabled
            capabilities.append(
                DesktopNodeCapabilityDescriptor(
                    command: state.1,
                    capability: state.0,
                    permissionKey: state.2,
                    requiresApprovalTokenClass: CaptureApprovalToken.requiredTokenClass,
                    enabled: isEnabled
                )
            )
        }

        return DesktopNodeCapabilityDiscovery(
            nodeID: nodeID,
            permissions: permissions,
            capabilities: capabilities
        )
    }

    public func captureScreenSnapshot(
        _ invocation: DesktopScreenSnapshotInvocation
    ) throws -> DesktopScreenSnapshotExecution {
        let correlationID = normalizedNonEmpty(invocation.correlationID) ?? makeCorrelationID()
        let approvalArtifactID = normalizedNonEmpty(invocation.approvalToken?.id)

        do {
            let snapshotResult = try screenCaptureConnector.captureSnapshot(
                ScreenSnapshotRequest(
                    liveSessionId: invocation.liveSessionID,
                    sourceId: invocation.sourceID,
                    approvalToken: invocation.approvalToken
                )
            )

            guard let approvalToken = invocation.approvalToken else {
                throw CaptureConnectorError.approvalRequired(.screenSnapshot)
            }

            let envelope = try bridge.makeMutatingEnvelope(
                tool: DesktopNodeCommand.screenSnapshot,
                arguments: makeSnapshotArguments(snapshotResult),
                correlationID: correlationID,
                approval: ApprovalArtifact(
                    id: approvalToken.id,
                    tokenClass: approvalToken.tokenClass,
                    issuedAt: approvalToken.issuedAt
                )
            )

            let signal = MacCompanionObservabilitySignal(
                sessionId: correlationID,
                liveSessionId: snapshotResult.ingressContext.metadata.liveSessionId,
                gateOutcome: .executed,
                approvalStatus: .grantedOrNotRequired,
                approvalArtifactIDs: approvalArtifactID.map { [$0] } ?? []
            )

            telemetryRecorder.record(signal: signal)

            return DesktopScreenSnapshotExecution(
                artifact: snapshotResult.artifact,
                envelope: envelope,
                observabilitySignal: signal
            )
        } catch {
            let signal = makeFailureSignal(
                error: error,
                correlationID: correlationID,
                liveSessionID: invocation.liveSessionID,
                approvalArtifactID: approvalArtifactID
            )
            telemetryRecorder.record(signal: signal)
            throw error
        }
    }

    private func makeSnapshotArguments(
        _ snapshotResult: ScreenSnapshotResult
    ) -> [String: String] {
        var arguments: [String: String] = [
            "nodeId": nodeID,
            "capability": CaptureCapability.screenSnapshot.rawValue,
            "liveSessionId": snapshotResult.ingressContext.metadata.liveSessionId,
            "sourceId": snapshotResult.artifact.sourceId,
            "capturedAtUnixMs": unixMilliseconds(snapshotResult.artifact.capturedAt),
            "mimeType": snapshotResult.artifact.mimeType,
        ]

        if let payloadRef = normalizedNonEmpty(snapshotResult.artifact.payloadRef) {
            arguments["payloadRef"] = payloadRef
        }

        return arguments
    }

    private func makeFailureSignal(
        error: Error,
        correlationID: String,
        liveSessionID: String,
        approvalArtifactID: String?
    ) -> MacCompanionObservabilitySignal {
        let normalizedLiveSessionID = normalizedNonEmpty(liveSessionID)
        let artifactIDs = approvalArtifactID.map { [$0] } ?? []

        switch error {
        case CaptureConnectorError.approvalRequired,
             CaptureConnectorError.invalidApprovalTokenClass,
             CaptureConnectorError.approvalRejected:
            return MacCompanionObservabilitySignal(
                sessionId: correlationID,
                liveSessionId: normalizedLiveSessionID,
                gateOutcome: .approvalRequired,
                approvalStatus: .failedOrMissing,
                approvalArtifactIDs: artifactIDs,
                fallbackReasons: ["approval_required"]
            )

        case CaptureConnectorError.capabilityDisabled:
            return MacCompanionObservabilitySignal(
                sessionId: correlationID,
                liveSessionId: normalizedLiveSessionID,
                gateOutcome: .blocked,
                approvalStatus: .none,
                approvalArtifactIDs: artifactIDs,
                fallbackReasons: ["capability_disabled"]
            )

        case CaptureConnectorError.missingLiveSessionId:
            return MacCompanionObservabilitySignal(
                sessionId: correlationID,
                liveSessionId: nil,
                gateOutcome: .blocked,
                approvalStatus: .failedOrMissing,
                approvalArtifactIDs: artifactIDs,
                fallbackReasons: ["missing_live_session_id"]
            )

        default:
            return MacCompanionObservabilitySignal(
                sessionId: correlationID,
                liveSessionId: normalizedLiveSessionID,
                gateOutcome: .executedWithFailures,
                approvalStatus: artifactIDs.isEmpty ? .none : .failedOrMissing,
                approvalArtifactIDs: artifactIDs,
                fallbackReasons: ["runtime_error"],
                deliveryFailureReason: String(describing: error)
            )
        }
    }

    private func normalizedNonEmpty(_ value: String?) -> String? {
        guard let value else {
            return nil
        }
        let normalized = value.trimmingCharacters(in: .whitespacesAndNewlines)
        return normalized.isEmpty ? nil : normalized
    }

    private func unixMilliseconds(_ date: Date) -> String {
        String(Int((date.timeIntervalSince1970 * 1000).rounded()))
    }
}
