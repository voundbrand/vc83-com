import Foundation
import SevenLayersProtocol

public enum DesktopNodeTransport {
    public static let contractVersion = "sevenlayers_macos_node_gateway_v1"
}

public enum DesktopNodeGatewayError: Error, Equatable {
    case transportDisabled(reason: String)
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

public struct DesktopNodeTransportFailurePolicy: Equatable {
    public let maxConsecutiveRuntimeFailures: Int
    public let disableDurationSeconds: TimeInterval

    public init(
        maxConsecutiveRuntimeFailures: Int = 3,
        disableDurationSeconds: TimeInterval = 120
    ) {
        self.maxConsecutiveRuntimeFailures = max(1, maxConsecutiveRuntimeFailures)
        self.disableDurationSeconds = max(0, disableDurationSeconds)
    }
}

public struct DesktopNodeRuntimeDiagnostics: Equatable {
    public let transportHealth: MacCompanionTransportHealth
    public let retryPolicyState: MacCompanionRetryPolicyState
    public let rollbackState: MacCompanionRollbackState
    public let retryAttempt: Int?
    public let disableReason: String?
    public let fallbackReasons: [String]
    public let gateOutcome: MacCompanionGateOutcome?
    public let approvalStatus: MacCompanionApprovalStatus?
    public let deliveryFailureReason: String?
    public let operatorDiagnostics: [String]

    public init(
        transportHealth: MacCompanionTransportHealth,
        retryPolicyState: MacCompanionRetryPolicyState,
        rollbackState: MacCompanionRollbackState,
        retryAttempt: Int? = nil,
        disableReason: String? = nil,
        fallbackReasons: [String] = [],
        gateOutcome: MacCompanionGateOutcome? = nil,
        approvalStatus: MacCompanionApprovalStatus? = nil,
        deliveryFailureReason: String? = nil,
        operatorDiagnostics: [String] = []
    ) {
        self.transportHealth = transportHealth
        self.retryPolicyState = retryPolicyState
        self.rollbackState = rollbackState
        self.retryAttempt = retryAttempt
        self.disableReason = disableReason
        self.fallbackReasons = fallbackReasons
        self.gateOutcome = gateOutcome
        self.approvalStatus = approvalStatus
        self.deliveryFailureReason = deliveryFailureReason
        self.operatorDiagnostics = operatorDiagnostics
    }
}

public protocol DesktopRuntimeDiagnosticsProviding {
    func currentRuntimeDiagnostics() -> DesktopNodeRuntimeDiagnostics
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

public final class DesktopNodeGateway: DesktopRuntimeDiagnosticsProviding {
    private let nodeID: String
    private let bridge: any CompanionBridgeBoundary
    private let captureApprovalGate: any CaptureApprovalGating
    private let screenCaptureConnector: ScreenCaptureConnector
    private let telemetryRecorder: any MacCompanionTelemetryRecording
    private let makeCorrelationID: () -> String
    private let failurePolicy: DesktopNodeTransportFailurePolicy
    private let now: () -> Date
    private let runtimeStateLock = NSLock()
    private var runtimeState = RuntimeState()

    public init(
        nodeID: String = "sevenlayers.macos.node",
        bridge: any CompanionBridgeBoundary = MacCompanionBridge(),
        captureApprovalGate: any CaptureApprovalGating = FailClosedCaptureApprovalGate(),
        screenCaptureProvider: any ScreenCaptureProviding = CoreGraphicsScreenCaptureProvider(),
        telemetryRecorder: any MacCompanionTelemetryRecording = NoopMacCompanionTelemetryRecorder(),
        makeCorrelationID: @escaping () -> String = { UUID().uuidString },
        failurePolicy: DesktopNodeTransportFailurePolicy = DesktopNodeTransportFailurePolicy(),
        now: @escaping () -> Date = Date.init
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
        self.failurePolicy = failurePolicy
        self.now = now
    }

    public func currentRuntimeDiagnostics() -> DesktopNodeRuntimeDiagnostics {
        runtimeStateLock.lock()
        defer { runtimeStateLock.unlock() }
        if let lastSignal = runtimeState.lastSignal {
            return DesktopNodeRuntimeDiagnostics(
                transportHealth: lastSignal.transportHealth,
                retryPolicyState: lastSignal.retryPolicyState,
                rollbackState: lastSignal.rollbackState,
                retryAttempt: lastSignal.retryAttempt,
                disableReason: lastSignal.transportDisableReason,
                fallbackReasons: lastSignal.fallbackReasons,
                gateOutcome: lastSignal.gateOutcome,
                approvalStatus: lastSignal.approvalStatus,
                deliveryFailureReason: lastSignal.deliveryFailureReason,
                operatorDiagnostics: lastSignal.operatorDiagnostics
            )
        }

        return DesktopNodeRuntimeDiagnostics(
            transportHealth: .healthy,
            retryPolicyState: .notApplicable,
            rollbackState: .none,
            retryAttempt: nil,
            disableReason: nil,
            fallbackReasons: [],
            gateOutcome: nil,
            approvalStatus: nil,
            deliveryFailureReason: nil,
            operatorDiagnostics: ["transport_health:healthy"]
        )
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
        if let disabledReason = resolveActiveTransportDisableReason() {
            let signal = makeTransportDisabledSignal(
                correlationID: correlationID,
                liveSessionID: invocation.liveSessionID,
                approvalArtifactID: approvalArtifactID,
                disableReason: disabledReason
            )
            record(signal: signal)
            throw DesktopNodeGatewayError.transportDisabled(reason: disabledReason)
        }

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
                approvalArtifactIDs: approvalArtifactID.map { [$0] } ?? [],
                transportHealth: .healthy,
                retryPolicyState: resetFailureStateAfterSuccess(),
                rollbackState: .none
            )
            let enrichedSignal = appendOperatorDiagnostics(signal)

            record(signal: enrichedSignal)

            return DesktopScreenSnapshotExecution(
                artifact: snapshotResult.artifact,
                envelope: envelope,
                observabilitySignal: enrichedSignal
            )
        } catch {
            let signal = makeFailureSignal(
                error: error,
                correlationID: correlationID,
                liveSessionID: invocation.liveSessionID,
                approvalArtifactID: approvalArtifactID
            )
            record(signal: signal)
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
        let runtimePolicy = updateFailurePolicyState(for: error)

        switch error {
        case CaptureConnectorError.approvalRequired,
             CaptureConnectorError.invalidApprovalTokenClass,
             CaptureConnectorError.approvalRejected:
            let signal = MacCompanionObservabilitySignal(
                sessionId: correlationID,
                liveSessionId: normalizedLiveSessionID,
                gateOutcome: .approvalRequired,
                approvalStatus: .failedOrMissing,
                approvalArtifactIDs: artifactIDs,
                fallbackReasons: ["approval_required"],
                transportHealth: runtimePolicy.transportHealth,
                retryPolicyState: runtimePolicy.retryPolicyState,
                retryAttempt: runtimePolicy.retryAttempt,
                transportDisableReason: runtimePolicy.disableReason,
                rollbackState: .failClosedDeny
            )
            return appendOperatorDiagnostics(signal)

        case CaptureConnectorError.capabilityDisabled:
            let signal = MacCompanionObservabilitySignal(
                sessionId: correlationID,
                liveSessionId: normalizedLiveSessionID,
                gateOutcome: .blocked,
                approvalStatus: .none,
                approvalArtifactIDs: artifactIDs,
                fallbackReasons: ["capability_disabled"],
                transportHealth: runtimePolicy.transportHealth,
                retryPolicyState: runtimePolicy.retryPolicyState,
                retryAttempt: runtimePolicy.retryAttempt,
                transportDisableReason: runtimePolicy.disableReason,
                rollbackState: .failClosedDeny
            )
            return appendOperatorDiagnostics(signal)

        case CaptureConnectorError.missingLiveSessionId:
            let signal = MacCompanionObservabilitySignal(
                sessionId: correlationID,
                liveSessionId: nil,
                gateOutcome: .blocked,
                approvalStatus: .failedOrMissing,
                approvalArtifactIDs: artifactIDs,
                fallbackReasons: ["missing_live_session_id"],
                transportHealth: runtimePolicy.transportHealth,
                retryPolicyState: runtimePolicy.retryPolicyState,
                retryAttempt: runtimePolicy.retryAttempt,
                transportDisableReason: runtimePolicy.disableReason,
                rollbackState: .failClosedDeny
            )
            return appendOperatorDiagnostics(signal)

        default:
            var fallbackReasons = ["runtime_error"]
            if runtimePolicy.retryPolicyState == .retrying {
                fallbackReasons.append("transport_retry_pending")
            }
            if runtimePolicy.retryPolicyState == .disabled {
                fallbackReasons.append("transport_disabled_by_policy")
            }

            let signal = MacCompanionObservabilitySignal(
                sessionId: correlationID,
                liveSessionId: normalizedLiveSessionID,
                gateOutcome: .executedWithFailures,
                approvalStatus: artifactIDs.isEmpty ? .none : .failedOrMissing,
                approvalArtifactIDs: artifactIDs,
                fallbackReasons: fallbackReasons,
                deliveryFailureReason: String(describing: error),
                transportHealth: runtimePolicy.transportHealth,
                retryPolicyState: runtimePolicy.retryPolicyState,
                retryAttempt: runtimePolicy.retryAttempt,
                transportDisableReason: runtimePolicy.disableReason,
                rollbackState: runtimePolicy.retryPolicyState == .disabled ? .transportDisabled : .readOnlyFallback
            )
            return appendOperatorDiagnostics(signal)
        }
    }

    private func resolveActiveTransportDisableReason() -> String? {
        runtimeStateLock.lock()
        defer { runtimeStateLock.unlock() }

        let currentTime = now()
        if let disabledUntil = runtimeState.disabledUntil {
            if currentTime < disabledUntil {
                return runtimeState.disableReason ?? "runtime_failure_threshold_reached"
            }

            // Disable window elapsed; re-enable and reset the retry counter.
            runtimeState.disabledUntil = nil
            runtimeState.disableReason = nil
            runtimeState.consecutiveRuntimeFailures = 0
        }

        return nil
    }

    private func resetFailureStateAfterSuccess() -> MacCompanionRetryPolicyState {
        runtimeStateLock.lock()
        defer { runtimeStateLock.unlock() }

        let hadFailures = runtimeState.consecutiveRuntimeFailures > 0 || runtimeState.disabledUntil != nil
        runtimeState.consecutiveRuntimeFailures = 0
        runtimeState.disabledUntil = nil
        runtimeState.disableReason = nil
        return hadFailures ? .recovered : .notApplicable
    }

    private func updateFailurePolicyState(for error: Error) -> RuntimePolicyState {
        guard isRuntimeFailure(error) else {
            return RuntimePolicyState(
                transportHealth: currentTransportHealth(),
                retryPolicyState: .notApplicable,
                retryAttempt: nil,
                disableReason: currentDisableReason()
            )
        }

        runtimeStateLock.lock()
        defer { runtimeStateLock.unlock() }

        runtimeState.consecutiveRuntimeFailures += 1
        let retryAttempt = runtimeState.consecutiveRuntimeFailures
        if runtimeState.consecutiveRuntimeFailures >= failurePolicy.maxConsecutiveRuntimeFailures {
            runtimeState.disableReason = "runtime_failure_threshold_reached"
            if failurePolicy.disableDurationSeconds > 0 {
                runtimeState.disabledUntil = now().addingTimeInterval(failurePolicy.disableDurationSeconds)
            } else {
                runtimeState.disabledUntil = nil
            }

            return RuntimePolicyState(
                transportHealth: .disabled,
                retryPolicyState: .disabled,
                retryAttempt: retryAttempt,
                disableReason: runtimeState.disableReason
            )
        }

        return RuntimePolicyState(
            transportHealth: .degraded,
            retryPolicyState: .retrying,
            retryAttempt: retryAttempt,
            disableReason: nil
        )
    }

    private func currentTransportHealth() -> MacCompanionTransportHealth {
        runtimeStateLock.lock()
        defer { runtimeStateLock.unlock() }
        if let disabledUntil = runtimeState.disabledUntil, now() < disabledUntil {
            return .disabled
        }
        return .healthy
    }

    private func currentDisableReason() -> String? {
        runtimeStateLock.lock()
        defer { runtimeStateLock.unlock() }
        return runtimeState.disableReason
    }

    private func makeTransportDisabledSignal(
        correlationID: String,
        liveSessionID: String,
        approvalArtifactID: String?,
        disableReason: String
    ) -> MacCompanionObservabilitySignal {
        let signal = MacCompanionObservabilitySignal(
            sessionId: correlationID,
            liveSessionId: normalizedNonEmpty(liveSessionID),
            gateOutcome: .blocked,
            approvalStatus: .failedOrMissing,
            approvalArtifactIDs: approvalArtifactID.map { [$0] } ?? [],
            fallbackReasons: ["transport_disabled_by_policy"],
            deliveryFailureReason: "transport_disabled",
            transportHealth: .disabled,
            retryPolicyState: .disabled,
            transportDisableReason: disableReason,
            rollbackState: .transportDisabled
        )
        return appendOperatorDiagnostics(signal)
    }

    private func appendOperatorDiagnostics(_ signal: MacCompanionObservabilitySignal) -> MacCompanionObservabilitySignal {
        var diagnostics: [String] = [
            "transport_health:\(signal.transportHealth.rawValue)",
            "gate_outcome:\(signal.gateOutcome.rawValue)",
            "approval_status:\(signal.approvalStatus.rawValue)",
            "retry_policy:\(signal.retryPolicyState.rawValue)",
            "rollback_state:\(signal.rollbackState.rawValue)",
        ]

        if let retryAttempt = signal.retryAttempt {
            diagnostics.append("retry_attempt:\(retryAttempt)")
        }
        if let disableReason = signal.transportDisableReason {
            diagnostics.append("transport_disable_reason:\(disableReason)")
        }
        if let deliveryFailureReason = signal.deliveryFailureReason {
            diagnostics.append("delivery_failure_reason:\(deliveryFailureReason)")
        }
        for fallbackReason in signal.fallbackReasons {
            diagnostics.append("fallback_reason:\(fallbackReason)")
        }

        return MacCompanionObservabilitySignal(
            sessionId: signal.sessionId,
            liveSessionId: signal.liveSessionId,
            voiceSessionId: signal.voiceSessionId,
            gateOutcome: signal.gateOutcome,
            approvalStatus: signal.approvalStatus,
            approvalArtifactIDs: signal.approvalArtifactIDs,
            fallbackReasons: signal.fallbackReasons,
            deliveryFailureReason: signal.deliveryFailureReason,
            transportHealth: signal.transportHealth,
            retryPolicyState: signal.retryPolicyState,
            retryAttempt: signal.retryAttempt,
            transportDisableReason: signal.transportDisableReason,
            rollbackState: signal.rollbackState,
            operatorDiagnostics: diagnostics
        )
    }

    private func record(signal: MacCompanionObservabilitySignal) {
        runtimeStateLock.lock()
        runtimeState.lastSignal = signal
        runtimeStateLock.unlock()
        telemetryRecorder.record(signal: signal)
    }

    private func isRuntimeFailure(_ error: Error) -> Bool {
        switch error {
        case CaptureConnectorError.approvalRequired,
             CaptureConnectorError.invalidApprovalTokenClass,
             CaptureConnectorError.approvalRejected,
             CaptureConnectorError.capabilityDisabled,
             CaptureConnectorError.missingLiveSessionId:
            return false
        default:
            return true
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

private struct RuntimeState {
    var consecutiveRuntimeFailures: Int = 0
    var disabledUntil: Date?
    var disableReason: String?
    var lastSignal: MacCompanionObservabilitySignal?
}

private struct RuntimePolicyState {
    let transportHealth: MacCompanionTransportHealth
    let retryPolicyState: MacCompanionRetryPolicyState
    let retryAttempt: Int?
    let disableReason: String?
}
