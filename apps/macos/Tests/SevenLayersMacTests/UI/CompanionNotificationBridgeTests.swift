import Foundation
import XCTest
@testable import SevenLayersMac
@testable import SevenLayersProtocol

final class CompanionNotificationBridgeTests: XCTestCase {
    func testDeliverBuildsNotificationWithCorrelationEvidenceAndDeepLink() async throws {
        let client = FakeCompanionNotificationCenterClient()
        client.status = .notDetermined
        client.requestAuthorizationResult = true

        let bridge = CompanionNotificationBridge(notificationCenterClient: client)
        let event = CompanionNotificationEvent(
            kind: .approval,
            title: "Approval required",
            body: "Review pending approval request.",
            correlationID: "corr-1234",
            evidenceURL: URL(string: "https://ops.vc83.app/evidence/ev-1234")!,
            consentPreference: NotificationConsentPreference(tokenID: "consent-1"),
            approvalArtifact: ApprovalArtifact(
                id: "approval-1234",
                tokenClass: "approval.action",
                issuedAt: Date(timeIntervalSince1970: 1_700_500_001)
            )
        )

        let delivery = try await bridge.deliver(event)

        XCTAssertEqual(client.requestAuthorizationCallCount, 1)
        XCTAssertEqual(delivery.trustGateMode, .approvalAction)
        XCTAssertEqual(client.requests.count, 1)

        let request = try XCTUnwrap(client.requests.first)
        XCTAssertEqual(request.userInfo[NotificationUserInfoKey.correlationID], "corr-1234")
        XCTAssertEqual(
            request.userInfo[NotificationUserInfoKey.evidenceURL],
            "https://ops.vc83.app/evidence/ev-1234"
        )
        XCTAssertEqual(request.userInfo[NotificationUserInfoKey.gateMode], "approval_action")
        XCTAssertEqual(request.userInfo[NotificationUserInfoKey.approvalArtifactID], "approval-1234")

        let deepLinkValue = try XCTUnwrap(request.userInfo[NotificationUserInfoKey.deepLinkURL])
        let deepLinkURL = try XCTUnwrap(URL(string: deepLinkValue))
        let decodedRoute = try NotificationDeepLinkCodec().decode(deepLinkURL)
        XCTAssertEqual(decodedRoute?.kind, .approval)
        XCTAssertEqual(decodedRoute?.correlationID, "corr-1234")
        XCTAssertEqual(decodedRoute?.evidenceURL.absoluteString, "https://ops.vc83.app/evidence/ev-1234")
    }

    func testDeliverFallsBackToReadOnlyWhenApprovalArtifactIsMissing() async throws {
        let client = FakeCompanionNotificationCenterClient()
        client.status = .authorized

        let bridge = CompanionNotificationBridge(notificationCenterClient: client)
        let event = CompanionNotificationEvent(
            kind: .escalation,
            title: "Escalation requested",
            body: "Operator escalation requested from runtime.",
            correlationID: "corr-escalation-1",
            evidenceURL: URL(string: "https://ops.vc83.app/evidence/ev-escalation-1")!,
            consentPreference: NotificationConsentPreference(tokenID: "consent-2"),
            approvalArtifact: nil
        )

        let delivery = try await bridge.deliver(event)
        let request = try XCTUnwrap(client.requests.first)

        XCTAssertEqual(delivery.trustGateMode, .readOnly)
        XCTAssertEqual(request.userInfo[NotificationUserInfoKey.gateMode], "read_only")
        XCTAssertNil(request.userInfo[NotificationUserInfoKey.approvalArtifactID])
    }

    func testDeliverRejectsInvalidConsentTokenClass() async {
        let client = FakeCompanionNotificationCenterClient()
        client.status = .authorized
        let bridge = CompanionNotificationBridge(notificationCenterClient: client)

        let event = CompanionNotificationEvent(
            kind: .approval,
            title: "Approval required",
            body: "Review request.",
            correlationID: "corr-555",
            evidenceURL: URL(string: "https://ops.vc83.app/evidence/ev-555")!,
            consentPreference: NotificationConsentPreference(
                tokenID: "consent-5",
                tokenClass: "approval.action"
            ),
            approvalArtifact: nil
        )

        do {
            _ = try await bridge.deliver(event)
            XCTFail("Expected invalidConsentTokenClass")
        } catch {
            XCTAssertEqual(
                error as? CompanionNotificationBridgeError,
                .invalidConsentTokenClass(expected: "consent.preference", actual: "approval.action")
            )
        }
    }

    func testDeliverRejectsWhenNotificationAuthorizationDenied() async {
        let client = FakeCompanionNotificationCenterClient()
        client.status = .denied
        let bridge = CompanionNotificationBridge(notificationCenterClient: client)

        let event = CompanionNotificationEvent(
            kind: .approval,
            title: "Approval required",
            body: "Review request.",
            correlationID: "corr-777",
            evidenceURL: URL(string: "https://ops.vc83.app/evidence/ev-777")!,
            consentPreference: NotificationConsentPreference(tokenID: "consent-7"),
            approvalArtifact: nil
        )

        do {
            _ = try await bridge.deliver(event)
            XCTFail("Expected notificationAuthorizationDenied")
        } catch {
            XCTAssertEqual(
                error as? CompanionNotificationBridgeError,
                .notificationAuthorizationDenied
            )
        }
    }
}

private final class FakeCompanionNotificationCenterClient: CompanionNotificationCenterClient {
    var status: CompanionNotificationAuthorizationStatus = .authorized
    var requestAuthorizationResult: Bool = false
    var requestAuthorizationCallCount: Int = 0
    var requests: [CompanionNotificationRequest] = []

    func authorizationStatus() async -> CompanionNotificationAuthorizationStatus {
        status
    }

    func requestAuthorization() async throws -> Bool {
        requestAuthorizationCallCount += 1
        if requestAuthorizationResult {
            status = .authorized
        }
        return requestAuthorizationResult
    }

    func add(_ request: CompanionNotificationRequest) async throws {
        requests.append(request)
    }
}
