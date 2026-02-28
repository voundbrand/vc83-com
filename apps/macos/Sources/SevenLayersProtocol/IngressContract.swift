import Foundation

public enum EnvelopeIntent: Equatable {
    case readOnlyContext(payload: String)
    case mutatingToolIntent(tool: String, arguments: [String: String])
}

public enum MutationAuthority: String, Equatable {
    case vc83Backend = "vc83_backend"
}

public enum IngressMessageClass: String, Equatable {
    case chat = "chat"
    case session = "session"
}

public struct IngressEnvelopeMetadata: Equatable {
    public static let contractVersion = "tcg_ingress_metadata_v1"

    public let contractVersion: String
    public let source: String
    public let messageClass: IngressMessageClass
    public let sessionID: String?
    public let localMutationAllowed: Bool
    public let ingressedAt: Date

    public init(
        source: String,
        messageClass: IngressMessageClass,
        sessionID: String?,
        localMutationAllowed: Bool = false,
        ingressedAt: Date = Date()
    ) {
        self.contractVersion = Self.contractVersion
        self.source = source
        self.messageClass = messageClass
        self.sessionID = sessionID
        self.localMutationAllowed = localMutationAllowed
        self.ingressedAt = ingressedAt
    }
}

public struct ApprovalArtifact: Equatable {
    public let id: String
    public let tokenClass: String
    public let issuedAt: Date

    public init(id: String, tokenClass: String, issuedAt: Date) {
        self.id = id
        self.tokenClass = tokenClass
        self.issuedAt = issuedAt
    }
}

public struct IngressEnvelope: Equatable {
    public static let schemaVersion = "tcg_ingress_envelope_v1"

    public let schemaVersion: String
    public let correlationID: String
    public let intent: EnvelopeIntent
    public let approvalArtifactID: String?
    public let mutationAuthority: MutationAuthority
    public let metadata: IngressEnvelopeMetadata

    public init(
        correlationID: String,
        intent: EnvelopeIntent,
        approvalArtifactID: String?,
        mutationAuthority: MutationAuthority,
        metadata: IngressEnvelopeMetadata
    ) {
        precondition(
            metadata.localMutationAllowed == false,
            "Ingress envelope metadata must remain local-mutation disabled."
        )
        self.schemaVersion = Self.schemaVersion
        self.correlationID = correlationID
        self.intent = intent
        self.approvalArtifactID = approvalArtifactID
        self.mutationAuthority = mutationAuthority
        self.metadata = metadata
    }
}

public enum CompanionBridgeError: Error, Equatable {
    case missingApprovalArtifact
}

public protocol CompanionBridgeBoundary {
    func makeContextEnvelope(payload: String, correlationID: String) -> IngressEnvelope

    func makeMutatingEnvelope(
        tool: String,
        arguments: [String: String],
        correlationID: String,
        approval: ApprovalArtifact?
    ) throws -> IngressEnvelope
}
