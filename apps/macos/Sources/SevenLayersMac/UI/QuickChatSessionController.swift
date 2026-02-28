import Foundation
import SevenLayersProtocol

public struct QuickChatSubmission: Equatable {
    public let correlationID: String
    public let payload: String
    public let schemaVersion: String
    public let mutationAuthority: MutationAuthority
    public let timestamp: Date
}

@MainActor
public final class QuickChatSessionController {
    private let bridge: CompanionBridgeBoundary

    private var pendingApprovalObservers: [UUID: (Int) -> Void] = [:]

    public private(set) var pendingApprovalsCount: Int = 0 {
        didSet {
            for observer in pendingApprovalObservers.values {
                observer(pendingApprovalsCount)
            }
        }
    }

    public private(set) var lastSubmission: QuickChatSubmission?

    public init(bridge: CompanionBridgeBoundary) {
        self.bridge = bridge
    }

    @discardableResult
    public func submitContextDraft(_ draft: String) -> QuickChatSubmission? {
        let payload = draft.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !payload.isEmpty else {
            return nil
        }

        let correlationID = UUID().uuidString
        let envelope = bridge.makeContextEnvelope(payload: payload, correlationID: correlationID)

        let submission = QuickChatSubmission(
            correlationID: envelope.correlationID,
            payload: payload,
            schemaVersion: envelope.schemaVersion,
            mutationAuthority: envelope.mutationAuthority,
            timestamp: Date()
        )

        lastSubmission = submission
        return submission
    }

    public func setPendingApprovalsCount(_ count: Int) {
        pendingApprovalsCount = max(0, count)
    }

    public func incrementPendingApprovals() {
        setPendingApprovalsCount(pendingApprovalsCount + 1)
    }

    public func clearPendingApprovals() {
        setPendingApprovalsCount(0)
    }

    @discardableResult
    public func addPendingApprovalsObserver(_ observer: @escaping (Int) -> Void) -> UUID {
        let token = UUID()
        pendingApprovalObservers[token] = observer
        observer(pendingApprovalsCount)
        return token
    }

    public func removePendingApprovalsObserver(_ token: UUID) {
        pendingApprovalObservers.removeValue(forKey: token)
    }
}
