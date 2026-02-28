import XCTest
@testable import SevenLayersMac

final class MacCompanionObservabilityContractTests: XCTestCase {
    func testSignalNormalizesWhitespaceAndDeduplicatesLists() {
        let signal = MacCompanionObservabilitySignal(
            sessionId: " session-1 ",
            liveSessionId: " live-1 ",
            voiceSessionId: " voice-1 ",
            gateOutcome: .approvalRequired,
            approvalStatus: .pending,
            approvalArtifactIDs: [" approval-2 ", "approval-1", "approval-1"],
            fallbackReasons: ["network_degraded", " network_degraded ", "capture_backpressure"],
            deliveryFailureReason: " "
        )

        XCTAssertEqual(signal.sessionId, "session-1")
        XCTAssertEqual(signal.liveSessionId, "live-1")
        XCTAssertEqual(signal.voiceSessionId, "voice-1")
        XCTAssertEqual(signal.approvalArtifactIDs, ["approval-1", "approval-2"])
        XCTAssertEqual(signal.fallbackReasons, ["capture_backpressure", "network_degraded"])
        XCTAssertNil(signal.deliveryFailureReason)
    }

    func testBridgeMetadataContainsGateAndApprovalObservabilityShape() {
        let signal = MacCompanionObservabilitySignal(
            sessionId: "session-2",
            gateOutcome: .executedWithFailures,
            approvalStatus: .failedOrMissing,
            approvalArtifactIDs: ["approval-3"],
            fallbackReasons: ["runtime_error"],
            deliveryFailureReason: "outbound_delivery_unconfirmed"
        )

        let metadata = signal.bridgeMetadata()

        XCTAssertEqual(metadata[MacCompanionObservabilityKey.sessionId] as? String, "session-2")
        XCTAssertEqual(
            metadata[MacCompanionObservabilityKey.gateOutcome] as? String,
            "executed_with_failures"
        )
        XCTAssertEqual(
            metadata[MacCompanionObservabilityKey.approvalStatus] as? String,
            "failed_or_missing"
        )
        XCTAssertEqual(
            metadata[MacCompanionObservabilityKey.approvalArtifactIDs] as? [String],
            ["approval-3"]
        )
        XCTAssertEqual(
            metadata[MacCompanionObservabilityKey.fallbackReasons] as? [String],
            ["runtime_error"]
        )
        XCTAssertEqual(
            metadata[MacCompanionObservabilityKey.deliveryFailureReason] as? String,
            "outbound_delivery_unconfirmed"
        )
    }
}
