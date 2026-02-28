import Foundation
import SevenLayersProtocol
import UserNotifications

public struct NotificationConsentPreference: Equatable {
    public static let requiredTokenClass = "consent.preference"

    public let tokenID: String
    public let tokenClass: String

    public init(
        tokenID: String,
        tokenClass: String = NotificationConsentPreference.requiredTokenClass
    ) {
        self.tokenID = tokenID.trimmingCharacters(in: .whitespacesAndNewlines)
        self.tokenClass = tokenClass.trimmingCharacters(in: .whitespacesAndNewlines)
    }
}

public struct CompanionNotificationEvent: Equatable {
    public let kind: NotificationDeepLinkKind
    public let title: String
    public let body: String
    public let correlationID: String
    public let evidenceURL: URL
    public let consentPreference: NotificationConsentPreference
    public let approvalArtifact: ApprovalArtifact?
    public let deliveryDelaySeconds: TimeInterval

    public init(
        kind: NotificationDeepLinkKind,
        title: String,
        body: String,
        correlationID: String,
        evidenceURL: URL,
        consentPreference: NotificationConsentPreference,
        approvalArtifact: ApprovalArtifact? = nil,
        deliveryDelaySeconds: TimeInterval = 1
    ) {
        self.kind = kind
        self.title = title
        self.body = body
        self.correlationID = correlationID.trimmingCharacters(in: .whitespacesAndNewlines)
        self.evidenceURL = evidenceURL
        self.consentPreference = consentPreference
        self.approvalArtifact = approvalArtifact
        self.deliveryDelaySeconds = max(1, deliveryDelaySeconds)
    }
}

public enum CompanionNotificationAuthorizationStatus: Equatable {
    case notDetermined
    case denied
    case authorized
}

public struct CompanionNotificationRequest: Equatable {
    public let identifier: String
    public let title: String
    public let body: String
    public let userInfo: [String: String]
    public let deliveryDelaySeconds: TimeInterval

    public init(
        identifier: String,
        title: String,
        body: String,
        userInfo: [String: String],
        deliveryDelaySeconds: TimeInterval
    ) {
        self.identifier = identifier
        self.title = title
        self.body = body
        self.userInfo = userInfo
        self.deliveryDelaySeconds = deliveryDelaySeconds
    }
}

public protocol CompanionNotificationCenterClient {
    func authorizationStatus() async -> CompanionNotificationAuthorizationStatus
    func requestAuthorization() async throws -> Bool
    func add(_ request: CompanionNotificationRequest) async throws
}

public enum CompanionNotificationBridgeError: Error, Equatable {
    case consentPreferenceRequired
    case invalidConsentTokenClass(expected: String, actual: String)
    case missingCorrelationID
    case missingEvidenceURL
    case notificationAuthorizationDenied
}

public struct CompanionNotificationDelivery: Equatable {
    public let requestID: String
    public let deepLinkURL: URL
    public let trustGateMode: NotificationTrustGateMode

    public init(
        requestID: String,
        deepLinkURL: URL,
        trustGateMode: NotificationTrustGateMode
    ) {
        self.requestID = requestID
        self.deepLinkURL = deepLinkURL
        self.trustGateMode = trustGateMode
    }
}

public final class CompanionNotificationBridge {
    private let notificationCenterClient: any CompanionNotificationCenterClient
    private let deepLinkCodec: NotificationDeepLinkCodec

    public init(
        notificationCenterClient: any CompanionNotificationCenterClient = SystemCompanionNotificationCenterClient(),
        deepLinkCodec: NotificationDeepLinkCodec = NotificationDeepLinkCodec()
    ) {
        self.notificationCenterClient = notificationCenterClient
        self.deepLinkCodec = deepLinkCodec
    }

    public func deliver(
        _ event: CompanionNotificationEvent
    ) async throws -> CompanionNotificationDelivery {
        try validateConsent(event.consentPreference)

        let correlationID = event.correlationID.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !correlationID.isEmpty else {
            throw CompanionNotificationBridgeError.missingCorrelationID
        }

        let evidenceValue = event.evidenceURL.absoluteString.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !evidenceValue.isEmpty else {
            throw CompanionNotificationBridgeError.missingEvidenceURL
        }

        let trustGateMode = resolveTrustGateMode(from: event.approvalArtifact)
        let deepLinkRoute = NotificationDeepLinkRoute(
            kind: event.kind,
            correlationID: correlationID,
            evidenceURL: event.evidenceURL,
            approvalArtifactID: trustGateMode == .approvalAction ? event.approvalArtifact?.id : nil,
            gateMode: trustGateMode
        )
        let deepLinkURL = try deepLinkCodec.encode(deepLinkRoute)

        try await ensureNotificationAuthorization()

        let request = CompanionNotificationRequest(
            identifier: makeIdentifier(kind: event.kind, correlationID: correlationID),
            title: event.title,
            body: event.body,
            userInfo: makeUserInfo(
                event: event,
                correlationID: correlationID,
                deepLinkURL: deepLinkURL,
                trustGateMode: trustGateMode
            ),
            deliveryDelaySeconds: event.deliveryDelaySeconds
        )

        try await notificationCenterClient.add(request)

        return CompanionNotificationDelivery(
            requestID: request.identifier,
            deepLinkURL: deepLinkURL,
            trustGateMode: trustGateMode
        )
    }

    private func ensureNotificationAuthorization() async throws {
        switch await notificationCenterClient.authorizationStatus() {
        case .authorized:
            return
        case .denied:
            throw CompanionNotificationBridgeError.notificationAuthorizationDenied
        case .notDetermined:
            let granted = try await notificationCenterClient.requestAuthorization()
            guard granted else {
                throw CompanionNotificationBridgeError.notificationAuthorizationDenied
            }
        }
    }

    private func validateConsent(_ consentPreference: NotificationConsentPreference) throws {
        guard !consentPreference.tokenID.isEmpty else {
            throw CompanionNotificationBridgeError.consentPreferenceRequired
        }

        guard consentPreference.tokenClass == NotificationConsentPreference.requiredTokenClass else {
            throw CompanionNotificationBridgeError.invalidConsentTokenClass(
                expected: NotificationConsentPreference.requiredTokenClass,
                actual: consentPreference.tokenClass
            )
        }
    }

    private func resolveTrustGateMode(from approvalArtifact: ApprovalArtifact?) -> NotificationTrustGateMode {
        guard
            let approvalArtifact,
            !approvalArtifact.id.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
            approvalArtifact.tokenClass == "approval.action"
        else {
            return .readOnly
        }
        return .approvalAction
    }

    private func makeIdentifier(kind: NotificationDeepLinkKind, correlationID: String) -> String {
        let normalizedCorrelation = correlationID
            .lowercased()
            .map { character in
                if character.isLetter || character.isNumber || character == "-" {
                    return character
                }
                return "-"
            }
        let correlationFragment = String(normalizedCorrelation.prefix(48))
        return "sevenlayers.\(kind.rawValue).\(correlationFragment)"
    }

    private func makeUserInfo(
        event: CompanionNotificationEvent,
        correlationID: String,
        deepLinkURL: URL,
        trustGateMode: NotificationTrustGateMode
    ) -> [String: String] {
        var userInfo: [String: String] = [
            NotificationUserInfoKey.kind: event.kind.rawValue,
            NotificationUserInfoKey.correlationID: correlationID,
            NotificationUserInfoKey.evidenceURL: event.evidenceURL.absoluteString,
            NotificationUserInfoKey.deepLinkURL: deepLinkURL.absoluteString,
            NotificationUserInfoKey.gateMode: trustGateMode.rawValue,
            NotificationUserInfoKey.consentTokenID: event.consentPreference.tokenID,
        ]

        if trustGateMode == .approvalAction, let approvalArtifact = event.approvalArtifact {
            userInfo[NotificationUserInfoKey.approvalArtifactID] = approvalArtifact.id
        }

        return userInfo
    }
}

public final class SystemCompanionNotificationCenterClient: CompanionNotificationCenterClient {
    private let center: UNUserNotificationCenter

    public init(center: UNUserNotificationCenter = .current()) {
        self.center = center
    }

    public func authorizationStatus() async -> CompanionNotificationAuthorizationStatus {
        await withCheckedContinuation { continuation in
            center.getNotificationSettings { settings in
                continuation.resume(returning: Self.map(settings.authorizationStatus))
            }
        }
    }

    public func requestAuthorization() async throws -> Bool {
        try await withCheckedThrowingContinuation { continuation in
            center.requestAuthorization(options: [.alert, .badge, .sound]) { granted, error in
                if let error {
                    continuation.resume(throwing: error)
                    return
                }
                continuation.resume(returning: granted)
            }
        }
    }

    public func add(_ request: CompanionNotificationRequest) async throws {
        let content = UNMutableNotificationContent()
        content.title = request.title
        content.body = request.body
        content.sound = .default
        content.userInfo = request.userInfo

        let trigger = UNTimeIntervalNotificationTrigger(
            timeInterval: max(1, request.deliveryDelaySeconds),
            repeats: false
        )
        let notificationRequest = UNNotificationRequest(
            identifier: request.identifier,
            content: content,
            trigger: trigger
        )

        try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
            center.add(notificationRequest) { error in
                if let error {
                    continuation.resume(throwing: error)
                    return
                }
                continuation.resume(returning: ())
            }
        }
    }

    private static func map(_ status: UNAuthorizationStatus) -> CompanionNotificationAuthorizationStatus {
        switch status {
        case .notDetermined:
            return .notDetermined
        case .authorized, .provisional, .ephemeral:
            return .authorized
        case .denied:
            return .denied
        @unknown default:
            return .denied
        }
    }
}

public enum NotificationUserInfoKey {
    public static let kind = "notification_kind"
    public static let correlationID = "correlation_id"
    public static let evidenceURL = "evidence_url"
    public static let deepLinkURL = "deep_link_url"
    public static let gateMode = "gate_mode"
    public static let consentTokenID = "consent_token_id"
    public static let approvalArtifactID = "approval_artifact_id"
}
