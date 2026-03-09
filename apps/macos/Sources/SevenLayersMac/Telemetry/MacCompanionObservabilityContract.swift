import Foundation

public enum MacCompanionObservabilityKey {
    public static let sessionId = "sessionId"
    public static let liveSessionId = "liveSessionId"
    public static let voiceSessionId = "voiceSessionId"
    public static let gateOutcome = "gateOutcome"
    public static let approvalStatus = "approvalStatus"
    public static let approvalArtifactIDs = "approvalArtifactIds"
    public static let fallbackReasons = "fallbackReasons"
    public static let deliveryFailureReason = "deliveryFailureReason"
    public static let transportHealth = "transportHealth"
    public static let retryPolicyState = "retryPolicyState"
    public static let retryAttempt = "retryAttempt"
    public static let transportDisableReason = "transportDisableReason"
    public static let rollbackState = "rollbackState"
    public static let operatorDiagnostics = "operatorDiagnostics"
}

public enum MacCompanionGateOutcome: String, Equatable {
    case executed = "executed"
    case approvalRequired = "approval_required"
    case executedWithFailures = "executed_with_failures"
    case blocked = "blocked"
}

public enum MacCompanionApprovalStatus: String, Equatable {
    case none = "none"
    case pending = "pending"
    case grantedOrNotRequired = "granted_or_not_required"
    case failedOrMissing = "failed_or_missing"
    case unknown = "unknown"
}

public enum MacCompanionTransportHealth: String, Equatable {
    case healthy = "healthy"
    case degraded = "degraded"
    case disabled = "disabled"
}

public enum MacCompanionRetryPolicyState: String, Equatable {
    case notApplicable = "not_applicable"
    case retrying = "retrying"
    case disabled = "disabled"
    case recovered = "recovered"
}

public enum MacCompanionRollbackState: String, Equatable {
    case none = "none"
    case failClosedDeny = "fail_closed_deny"
    case readOnlyFallback = "read_only_fallback"
    case transportDisabled = "transport_disabled"
}

public struct MacCompanionObservabilitySignal: Equatable {
    public let sessionId: String
    public let liveSessionId: String?
    public let voiceSessionId: String?
    public let gateOutcome: MacCompanionGateOutcome
    public let approvalStatus: MacCompanionApprovalStatus
    public let approvalArtifactIDs: [String]
    public let fallbackReasons: [String]
    public let deliveryFailureReason: String?
    public let transportHealth: MacCompanionTransportHealth
    public let retryPolicyState: MacCompanionRetryPolicyState
    public let retryAttempt: Int?
    public let transportDisableReason: String?
    public let rollbackState: MacCompanionRollbackState
    public let operatorDiagnostics: [String]

    public init(
        sessionId: String,
        liveSessionId: String? = nil,
        voiceSessionId: String? = nil,
        gateOutcome: MacCompanionGateOutcome,
        approvalStatus: MacCompanionApprovalStatus,
        approvalArtifactIDs: [String] = [],
        fallbackReasons: [String] = [],
        deliveryFailureReason: String? = nil,
        transportHealth: MacCompanionTransportHealth = .healthy,
        retryPolicyState: MacCompanionRetryPolicyState = .notApplicable,
        retryAttempt: Int? = nil,
        transportDisableReason: String? = nil,
        rollbackState: MacCompanionRollbackState = .none,
        operatorDiagnostics: [String] = []
    ) {
        self.sessionId = Self.normalizeRequired(sessionId)
        self.liveSessionId = Self.normalizeOptional(liveSessionId)
        self.voiceSessionId = Self.normalizeOptional(voiceSessionId)
        self.gateOutcome = gateOutcome
        self.approvalStatus = approvalStatus
        self.approvalArtifactIDs = Self.normalizeList(approvalArtifactIDs)
        self.fallbackReasons = Self.normalizeList(fallbackReasons)
        self.deliveryFailureReason = Self.normalizeOptional(deliveryFailureReason)
        self.transportHealth = transportHealth
        self.retryPolicyState = retryPolicyState
        self.retryAttempt = Self.normalizeRetryAttempt(retryAttempt)
        self.transportDisableReason = Self.normalizeOptional(transportDisableReason)
        self.rollbackState = rollbackState
        self.operatorDiagnostics = Self.normalizeList(operatorDiagnostics)
    }

    public func bridgeMetadata() -> [String: Any] {
        var metadata: [String: Any] = [
            MacCompanionObservabilityKey.sessionId: sessionId,
            MacCompanionObservabilityKey.gateOutcome: gateOutcome.rawValue,
            MacCompanionObservabilityKey.approvalStatus: approvalStatus.rawValue,
            MacCompanionObservabilityKey.approvalArtifactIDs: approvalArtifactIDs,
            MacCompanionObservabilityKey.fallbackReasons: fallbackReasons,
            MacCompanionObservabilityKey.transportHealth: transportHealth.rawValue,
            MacCompanionObservabilityKey.retryPolicyState: retryPolicyState.rawValue,
            MacCompanionObservabilityKey.rollbackState: rollbackState.rawValue,
            MacCompanionObservabilityKey.operatorDiagnostics: operatorDiagnostics,
        ]

        if let liveSessionId {
            metadata[MacCompanionObservabilityKey.liveSessionId] = liveSessionId
        }
        if let voiceSessionId {
            metadata[MacCompanionObservabilityKey.voiceSessionId] = voiceSessionId
        }
        if let deliveryFailureReason {
            metadata[MacCompanionObservabilityKey.deliveryFailureReason] = deliveryFailureReason
        }
        if let retryAttempt {
            metadata[MacCompanionObservabilityKey.retryAttempt] = retryAttempt
        }
        if let transportDisableReason {
            metadata[MacCompanionObservabilityKey.transportDisableReason] = transportDisableReason
        }

        return metadata
    }

    private static func normalizeRequired(_ value: String) -> String {
        let normalized = value.trimmingCharacters(in: .whitespacesAndNewlines)
        return normalized.isEmpty ? "unknown_session" : normalized
    }

    private static func normalizeOptional(_ value: String?) -> String? {
        guard let value else {
            return nil
        }
        let normalized = value.trimmingCharacters(in: .whitespacesAndNewlines)
        return normalized.isEmpty ? nil : normalized
    }

    private static func normalizeList(_ values: [String]) -> [String] {
        var normalized = Set<String>()
        for value in values {
            let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
            if !trimmed.isEmpty {
                normalized.insert(trimmed)
            }
        }
        return normalized.sorted()
    }

    private static func normalizeRetryAttempt(_ value: Int?) -> Int? {
        guard let value, value > 0 else {
            return nil
        }
        return value
    }
}
