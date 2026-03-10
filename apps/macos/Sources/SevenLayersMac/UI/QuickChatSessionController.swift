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
    private let authStateProvider: (any DesktopAuthStateProviding)?

    private var pendingApprovalObservers: [UUID: (Int) -> Void] = [:]

    public private(set) var pendingApprovalsCount: Int = 0 {
        didSet {
            for observer in pendingApprovalObservers.values {
                observer(pendingApprovalsCount)
            }
        }
    }

    public private(set) var lastSubmission: QuickChatSubmission?
    public private(set) var lastSubmissionBlockReason: String?

    public init(
        bridge: CompanionBridgeBoundary,
        authStateProvider: (any DesktopAuthStateProviding)? = nil
    ) {
        self.bridge = bridge
        self.authStateProvider = authStateProvider
    }

    @discardableResult
    public func submitContextDraft(_ draft: String) -> QuickChatSubmission? {
        let payload = draft.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !payload.isEmpty else {
            lastSubmissionBlockReason = "Enter context before sending."
            return nil
        }

        if let authStateProvider, !authStateProvider.isAuthenticated {
            lastSubmissionBlockReason = authStateProvider.authStatusText
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

        lastSubmissionBlockReason = nil
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
