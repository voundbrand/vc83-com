import Foundation

public enum CompanionNotificationAction: String, Equatable {
    case openApproval = "sevenlayers.notification.follow_through.approval"
    case openEscalation = "sevenlayers.notification.follow_through.escalation"
    case openCapture = "sevenlayers.notification.follow_through.capture"

    public var deepLinkKind: NotificationDeepLinkKind {
        switch self {
        case .openApproval:
            return .approval
        case .openEscalation:
            return .escalation
        case .openCapture:
            return .capture
        }
    }
}

public enum CompanionNotificationActionHandlingResult: Equatable {
    case ignored
    case invalidPayload
    case opened(destinationURL: URL)
    case failedToOpen(destinationURL: URL)
}

@MainActor
public final class CompanionNotificationActionHandler {
    private let deepLinkCodec: NotificationDeepLinkCodec
    private let deepLinkHandler: NotificationDeepLinkHandler

    public init(
        deepLinkCodec: NotificationDeepLinkCodec = NotificationDeepLinkCodec(),
        deepLinkHandler: NotificationDeepLinkHandler
    ) {
        self.deepLinkCodec = deepLinkCodec
        self.deepLinkHandler = deepLinkHandler
    }

    public func handleAction(
        identifier: String,
        userInfo: [AnyHashable: Any]
    ) -> CompanionNotificationActionHandlingResult {
        let trimmedIdentifier = identifier.trimmingCharacters(in: .whitespacesAndNewlines)
        guard let action = CompanionNotificationAction(rawValue: trimmedIdentifier) else {
            return .ignored
        }

        guard let route = makeRoute(action: action, userInfo: userInfo) else {
            return .invalidPayload
        }

        do {
            let deepLinkURL = try deepLinkCodec.encode(route)
            let handling = try deepLinkHandler.handle(deepLinkURL)
            switch handling {
            case .ignored:
                return .ignored
            case .opened(let destinationURL):
                return .opened(destinationURL: destinationURL)
            case .failedToOpen(let destinationURL):
                return .failedToOpen(destinationURL: destinationURL)
            }
        } catch {
            return .invalidPayload
        }
    }

    private func makeRoute(
        action: CompanionNotificationAction,
        userInfo: [AnyHashable: Any]
    ) -> NotificationDeepLinkRoute? {
        guard
            let correlationID = normalizedString(userInfo[NotificationUserInfoKey.correlationID]),
            let evidenceURLValue = normalizedString(userInfo[NotificationUserInfoKey.evidenceURL]),
            let evidenceURL = URL(string: evidenceURLValue)
        else {
            return nil
        }

        let gateModeRaw = normalizedString(userInfo[NotificationUserInfoKey.gateMode])
        let gateMode = gateModeRaw.flatMap(NotificationTrustGateMode.init(rawValue:)) ?? .readOnly
        let approvalArtifactID = normalizedString(userInfo[NotificationUserInfoKey.approvalArtifactID])
        let approvalTokenClass = normalizedString(userInfo[NotificationUserInfoKey.approvalTokenClass])

        return NotificationDeepLinkRoute(
            kind: action.deepLinkKind,
            correlationID: correlationID,
            evidenceURL: evidenceURL,
            approvalArtifactID: approvalArtifactID,
            approvalTokenClass: approvalTokenClass,
            gateMode: gateMode
        )
    }

    private func normalizedString(_ value: Any?) -> String? {
        guard let string = value as? String else {
            return nil
        }
        let trimmed = string.trimmingCharacters(in: .whitespacesAndNewlines)
        return trimmed.isEmpty ? nil : trimmed
    }
}
