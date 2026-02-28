import Foundation

public enum CaptureCapability: String, Hashable, Sendable {
    case screenSnapshot = "screen_snapshot"
    case screenRecord = "screen_record"
    case camera = "camera"
    case microphone = "microphone"
}

public struct CaptureApprovalToken: Equatable {
    public static let requiredTokenClass = "approval.session"

    public let id: String
    public let tokenClass: String
    public let issuedAt: Date

    public init(
        id: String,
        tokenClass: String = CaptureApprovalToken.requiredTokenClass,
        issuedAt: Date = Date()
    ) {
        self.id = id.trimmingCharacters(in: .whitespacesAndNewlines)
        self.tokenClass = tokenClass.trimmingCharacters(in: .whitespacesAndNewlines)
        self.issuedAt = issuedAt
    }
}

public enum CaptureConnectorError: Error, Equatable {
    case missingLiveSessionId
    case capabilityDisabled(CaptureCapability)
    case approvalRequired(CaptureCapability)
    case invalidApprovalTokenClass(expected: String, actual: String)
    case approvalRejected(CaptureCapability)
}

public protocol CaptureApprovalGating {
    func isCapabilityEnabled(_ capability: CaptureCapability) -> Bool

    func validatesSessionApproval(
        token: CaptureApprovalToken,
        capability: CaptureCapability,
        liveSessionId: String
    ) -> Bool
}

public struct FailClosedCaptureApprovalGate: CaptureApprovalGating {
    public init() {}

    public func isCapabilityEnabled(_ capability: CaptureCapability) -> Bool {
        false
    }

    public func validatesSessionApproval(
        token: CaptureApprovalToken,
        capability: CaptureCapability,
        liveSessionId: String
    ) -> Bool {
        false
    }
}

public struct StaticCaptureApprovalGate: CaptureApprovalGating {
    private let enabledCapabilities: Set<CaptureCapability>
    private let acceptedTokenIDs: Set<String>

    public init(
        enabledCapabilities: Set<CaptureCapability>,
        acceptedTokenIDs: Set<String> = []
    ) {
        self.enabledCapabilities = enabledCapabilities
        self.acceptedTokenIDs = acceptedTokenIDs
    }

    public func isCapabilityEnabled(_ capability: CaptureCapability) -> Bool {
        enabledCapabilities.contains(capability)
    }

    public func validatesSessionApproval(
        token: CaptureApprovalToken,
        capability: CaptureCapability,
        liveSessionId: String
    ) -> Bool {
        if acceptedTokenIDs.isEmpty {
            return true
        }
        return acceptedTokenIDs.contains(token.id)
    }
}

func validateCaptureAuthorization(
    liveSessionId: String,
    capability: CaptureCapability,
    approvalToken: CaptureApprovalToken?,
    gate: any CaptureApprovalGating
) throws -> String {
    let normalizedLiveSessionId = liveSessionId
        .trimmingCharacters(in: .whitespacesAndNewlines)
    guard !normalizedLiveSessionId.isEmpty else {
        throw CaptureConnectorError.missingLiveSessionId
    }

    guard gate.isCapabilityEnabled(capability) else {
        throw CaptureConnectorError.capabilityDisabled(capability)
    }

    guard let approvalToken else {
        throw CaptureConnectorError.approvalRequired(capability)
    }

    guard approvalToken.tokenClass == CaptureApprovalToken.requiredTokenClass else {
        throw CaptureConnectorError.invalidApprovalTokenClass(
            expected: CaptureApprovalToken.requiredTokenClass,
            actual: approvalToken.tokenClass
        )
    }

    guard gate.validatesSessionApproval(
        token: approvalToken,
        capability: capability,
        liveSessionId: normalizedLiveSessionId
    ) else {
        throw CaptureConnectorError.approvalRejected(capability)
    }

    return normalizedLiveSessionId
}
