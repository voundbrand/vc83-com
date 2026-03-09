import AppKit
import Foundation

public enum NotificationDeepLinkKind: String, Equatable {
    case approval
    case escalation
    case capture
}

public enum NotificationTrustGateMode: String, Equatable {
    case readOnly = "read_only"
    case approvalAction = "approval_action"
}

public struct NotificationDeepLinkRoute: Equatable {
    public static let requiredApprovalTokenClass = "approval.action"

    public let kind: NotificationDeepLinkKind
    public let correlationID: String
    public let evidenceURL: URL
    public let approvalArtifactID: String?
    public let approvalTokenClass: String?
    public let gateMode: NotificationTrustGateMode

    public init(
        kind: NotificationDeepLinkKind,
        correlationID: String,
        evidenceURL: URL,
        approvalArtifactID: String?,
        approvalTokenClass: String? = nil,
        gateMode: NotificationTrustGateMode
    ) {
        self.kind = kind
        self.correlationID = correlationID.trimmingCharacters(in: .whitespacesAndNewlines)
        self.evidenceURL = evidenceURL
        self.approvalArtifactID = approvalArtifactID?
            .trimmingCharacters(in: .whitespacesAndNewlines)
        self.approvalTokenClass = approvalTokenClass?
            .trimmingCharacters(in: .whitespacesAndNewlines)
        self.gateMode = gateMode
    }
}

public enum NotificationDeepLinkError: Error, Equatable {
    case missingCorrelationID
    case missingEvidenceURL
    case malformedEvidenceURL
    case invalidGateMode(String)
}

public struct NotificationDeepLinkCodecConfiguration: Equatable {
    public let scheme: String
    public let host: String

    public init(
        scheme: String = "vc83-mac",
        host: String = "notification"
    ) {
        self.scheme = scheme.lowercased()
        self.host = host.lowercased()
    }
}

public struct NotificationDeepLinkCodec {
    private let configuration: NotificationDeepLinkCodecConfiguration

    public init(configuration: NotificationDeepLinkCodecConfiguration = NotificationDeepLinkCodecConfiguration()) {
        self.configuration = configuration
    }

    public func encode(_ route: NotificationDeepLinkRoute) throws -> URL {
        let correlationID = route.correlationID.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !correlationID.isEmpty else {
            throw NotificationDeepLinkError.missingCorrelationID
        }

        let evidenceValue = route.evidenceURL.absoluteString.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !evidenceValue.isEmpty else {
            throw NotificationDeepLinkError.missingEvidenceURL
        }

        var components = URLComponents()
        components.scheme = configuration.scheme
        components.host = configuration.host
        switch route.kind {
        case .approval:
            components.path = "/approval"
        case .escalation:
            components.path = "/escalation"
        case .capture:
            components.path = "/capture"
        }

        var queryItems: [URLQueryItem] = [
            URLQueryItem(name: QueryKey.correlationID, value: correlationID),
            URLQueryItem(name: QueryKey.evidenceURL, value: route.evidenceURL.absoluteString),
            URLQueryItem(name: QueryKey.gateMode, value: route.gateMode.rawValue),
        ]

        if let approvalArtifactID = route.approvalArtifactID, !approvalArtifactID.isEmpty {
            queryItems.append(URLQueryItem(name: QueryKey.approvalArtifactID, value: approvalArtifactID))
        }
        if let approvalTokenClass = route.approvalTokenClass, !approvalTokenClass.isEmpty {
            queryItems.append(URLQueryItem(name: QueryKey.approvalTokenClass, value: approvalTokenClass))
        }

        components.queryItems = queryItems

        return components.url ?? route.evidenceURL
    }

    public func decode(_ url: URL) throws -> NotificationDeepLinkRoute? {
        guard
            url.scheme?.lowercased() == configuration.scheme,
            url.host?.lowercased() == configuration.host
        else {
            return nil
        }

        let kind: NotificationDeepLinkKind
        switch url.path {
        case "/approval":
            kind = .approval
        case "/escalation":
            kind = .escalation
        case "/capture":
            kind = .capture
        default:
            return nil
        }

        guard let components = URLComponents(url: url, resolvingAgainstBaseURL: false) else {
            return nil
        }

        let correlationID = (components.value(for: QueryKey.correlationID) ?? "")
            .trimmingCharacters(in: .whitespacesAndNewlines)
        guard !correlationID.isEmpty else {
            throw NotificationDeepLinkError.missingCorrelationID
        }

        let evidenceValue = (components.value(for: QueryKey.evidenceURL) ?? "")
            .trimmingCharacters(in: .whitespacesAndNewlines)
        guard !evidenceValue.isEmpty else {
            throw NotificationDeepLinkError.missingEvidenceURL
        }
        guard let evidenceURL = URL(string: evidenceValue) else {
            throw NotificationDeepLinkError.malformedEvidenceURL
        }

        let gateMode: NotificationTrustGateMode
        if let gateModeValue = components.value(for: QueryKey.gateMode)?
            .trimmingCharacters(in: .whitespacesAndNewlines),
            !gateModeValue.isEmpty
        {
            guard let parsedGateMode = NotificationTrustGateMode(rawValue: gateModeValue) else {
                throw NotificationDeepLinkError.invalidGateMode(gateModeValue)
            }
            gateMode = parsedGateMode
        } else {
            gateMode = .readOnly
        }

        let approvalArtifactID = components.value(for: QueryKey.approvalArtifactID)?
            .trimmingCharacters(in: .whitespacesAndNewlines)
        let approvalTokenClass = components.value(for: QueryKey.approvalTokenClass)?
            .trimmingCharacters(in: .whitespacesAndNewlines)

        return NotificationDeepLinkRoute(
            kind: kind,
            correlationID: correlationID,
            evidenceURL: evidenceURL,
            approvalArtifactID: approvalArtifactID?.isEmpty == true ? nil : approvalArtifactID,
            approvalTokenClass: approvalTokenClass?.isEmpty == true ? nil : approvalTokenClass,
            gateMode: gateMode
        )
    }
}

public enum NotificationGateFallbackReason: String, Equatable {
    case missingApprovalEvidence = "missing_approval_evidence"
    case invalidApprovalTokenClass = "invalid_approval_token_class"
}

public struct NotificationRouteResolution: Equatable {
    public let requestedGateMode: NotificationTrustGateMode
    public let effectiveRoute: NotificationDeepLinkRoute
    public let fallbackReason: NotificationGateFallbackReason?

    public init(
        requestedGateMode: NotificationTrustGateMode,
        effectiveRoute: NotificationDeepLinkRoute,
        fallbackReason: NotificationGateFallbackReason?
    ) {
        self.requestedGateMode = requestedGateMode
        self.effectiveRoute = effectiveRoute
        self.fallbackReason = fallbackReason
    }
}

public struct NotificationTrustPortalConfiguration: Equatable {
    public let webBaseURL: URL
    public let source: String

    public init(
        webBaseURL: URL,
        source: String = "macos_notification"
    ) {
        self.webBaseURL = webBaseURL
        self.source = source
    }
}

public struct NotificationTrustPortalURLBuilder {
    private let configuration: NotificationTrustPortalConfiguration

    public init(configuration: NotificationTrustPortalConfiguration) {
        self.configuration = configuration
    }

    public func makeDestinationURL(for resolution: NotificationRouteResolution) -> URL {
        let route = resolution.effectiveRoute
        var components = URLComponents(url: configuration.webBaseURL, resolvingAgainstBaseURL: false)

        switch route.kind {
        case .approval:
            components?.path = "/dashboard/approvals"
        case .escalation:
            components?.path = "/dashboard/escalations"
        case .capture:
            components?.path = "/dashboard/capture"
        }

        var queryItems: [URLQueryItem] = [
            URLQueryItem(name: QueryKey.source, value: configuration.source),
            URLQueryItem(name: QueryKey.kind, value: route.kind.rawValue),
            URLQueryItem(name: QueryKey.correlationID, value: route.correlationID),
            URLQueryItem(name: QueryKey.evidenceURL, value: route.evidenceURL.absoluteString),
            URLQueryItem(name: QueryKey.gateMode, value: route.gateMode.rawValue),
            URLQueryItem(name: QueryKey.requestedGateMode, value: resolution.requestedGateMode.rawValue),
        ]

        if let approvalArtifactID = route.approvalArtifactID, !approvalArtifactID.isEmpty {
            queryItems.append(URLQueryItem(name: QueryKey.approvalArtifactID, value: approvalArtifactID))
        }
        if let approvalTokenClass = route.approvalTokenClass, !approvalTokenClass.isEmpty {
            queryItems.append(URLQueryItem(name: QueryKey.approvalTokenClass, value: approvalTokenClass))
        }
        if let fallbackReason = resolution.fallbackReason?.rawValue {
            queryItems.append(URLQueryItem(name: QueryKey.gateFallbackReason, value: fallbackReason))
        }

        components?.queryItems = queryItems
        return components?.url ?? configuration.webBaseURL
    }
}

public enum NotificationDeepLinkHandlingResult: Equatable {
    case ignored
    case opened(destinationURL: URL)
    case failedToOpen(destinationURL: URL)
}

@MainActor
public final class NotificationDeepLinkHandler {
    private let codec: NotificationDeepLinkCodec
    private let trustPortalURLBuilder: NotificationTrustPortalURLBuilder
    private let workspace: WorkspaceOpening

    public init(
        codec: NotificationDeepLinkCodec,
        trustPortalURLBuilder: NotificationTrustPortalURLBuilder,
        workspace: WorkspaceOpening = NSWorkspace.shared
    ) {
        self.codec = codec
        self.trustPortalURLBuilder = trustPortalURLBuilder
        self.workspace = workspace
    }

    public convenience init(
        webBaseURL: URL,
        source: String = "macos_notification",
        workspace: WorkspaceOpening = NSWorkspace.shared
    ) {
        self.init(
            codec: NotificationDeepLinkCodec(),
            trustPortalURLBuilder: NotificationTrustPortalURLBuilder(
                configuration: NotificationTrustPortalConfiguration(
                    webBaseURL: webBaseURL,
                    source: source
                )
            ),
            workspace: workspace
        )
    }

    public func handle(_ url: URL) throws -> NotificationDeepLinkHandlingResult {
        guard let route = try codec.decode(url) else {
            return .ignored
        }

        let routeResolution = resolveTrustGateRoute(route)
        let destinationURL = trustPortalURLBuilder.makeDestinationURL(for: routeResolution)
        if workspace.open(destinationURL) {
            return .opened(destinationURL: destinationURL)
        }

        return .failedToOpen(destinationURL: destinationURL)
    }

    public func resolveTrustGateRoute(_ route: NotificationDeepLinkRoute) -> NotificationRouteResolution {
        guard route.gateMode == .approvalAction else {
            return NotificationRouteResolution(
                requestedGateMode: route.gateMode,
                effectiveRoute: route.withReadOnlyEvidenceSanitized(),
                fallbackReason: nil
            )
        }

        let artifactID = route.approvalArtifactID?.trimmingCharacters(in: .whitespacesAndNewlines)
        guard let artifactID, !artifactID.isEmpty else {
            return NotificationRouteResolution(
                requestedGateMode: route.gateMode,
                effectiveRoute: route.asReadOnlyFallback(),
                fallbackReason: .missingApprovalEvidence
            )
        }

        let tokenClass = route.approvalTokenClass?.trimmingCharacters(in: .whitespacesAndNewlines)
        guard tokenClass == NotificationDeepLinkRoute.requiredApprovalTokenClass else {
            return NotificationRouteResolution(
                requestedGateMode: route.gateMode,
                effectiveRoute: route.asReadOnlyFallback(),
                fallbackReason: .invalidApprovalTokenClass
            )
        }

        return NotificationRouteResolution(
            requestedGateMode: route.gateMode,
            effectiveRoute: NotificationDeepLinkRoute(
                kind: route.kind,
                correlationID: route.correlationID,
                evidenceURL: route.evidenceURL,
                approvalArtifactID: artifactID,
                approvalTokenClass: tokenClass,
                gateMode: .approvalAction
            ),
            fallbackReason: nil
        )
    }
}

private enum QueryKey {
    static let source = "source"
    static let kind = "kind"
    static let correlationID = "correlation_id"
    static let evidenceURL = "evidence_url"
    static let gateMode = "gate_mode"
    static let requestedGateMode = "requested_gate_mode"
    static let approvalArtifactID = "approval_artifact_id"
    static let approvalTokenClass = "approval_token_class"
    static let gateFallbackReason = "gate_fallback_reason"
}

private extension NotificationDeepLinkRoute {
    func asReadOnlyFallback() -> NotificationDeepLinkRoute {
        NotificationDeepLinkRoute(
            kind: kind,
            correlationID: correlationID,
            evidenceURL: evidenceURL,
            approvalArtifactID: nil,
            approvalTokenClass: nil,
            gateMode: .readOnly
        )
    }

    func withReadOnlyEvidenceSanitized() -> NotificationDeepLinkRoute {
        NotificationDeepLinkRoute(
            kind: kind,
            correlationID: correlationID,
            evidenceURL: evidenceURL,
            approvalArtifactID: nil,
            approvalTokenClass: nil,
            gateMode: .readOnly
        )
    }
}

private extension URLComponents {
    func value(for queryItemName: String) -> String? {
        queryItems?.first(where: { $0.name == queryItemName })?.value
    }
}
