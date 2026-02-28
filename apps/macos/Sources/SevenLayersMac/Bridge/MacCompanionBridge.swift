import Foundation
import SevenLayersProtocol

public struct MacCompanionBridge: CompanionBridgeBoundary {
    public let source: String

    public init(source: String = "macos_menu_bar_shell") {
        self.source = source
    }

    public func makeContextEnvelope(payload: String, correlationID: String) -> IngressEnvelope {
        IngressEnvelope(
            correlationID: correlationID,
            intent: .readOnlyContext(payload: payload),
            approvalArtifactID: nil,
            mutationAuthority: .vc83Backend,
            metadata: makeMetadata(messageClass: .chat, sessionID: nil)
        )
    }

    public func makeMutatingEnvelope(
        tool: String,
        arguments: [String: String],
        correlationID: String,
        approval: ApprovalArtifact?
    ) throws -> IngressEnvelope {
        guard let approval else {
            throw CompanionBridgeError.missingApprovalArtifact
        }

        return IngressEnvelope(
            correlationID: correlationID,
            intent: .mutatingToolIntent(tool: tool, arguments: arguments),
            approvalArtifactID: approval.id,
            mutationAuthority: .vc83Backend,
            metadata: makeMetadata(messageClass: .session, sessionID: resolveSessionID(arguments: arguments))
        )
    }

    private func makeMetadata(messageClass: IngressMessageClass, sessionID: String?) -> IngressEnvelopeMetadata {
        IngressEnvelopeMetadata(
            source: source,
            messageClass: messageClass,
            sessionID: sessionID,
            localMutationAllowed: false
        )
    }

    private func resolveSessionID(arguments: [String: String]) -> String? {
        normalizeNonEmptyString(arguments["liveSessionId"])
            ?? normalizeNonEmptyString(arguments["sessionId"])
    }

    private func normalizeNonEmptyString(_ value: String?) -> String? {
        guard let value else {
            return nil
        }
        let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
        return trimmed.isEmpty ? nil : trimmed
    }
}
