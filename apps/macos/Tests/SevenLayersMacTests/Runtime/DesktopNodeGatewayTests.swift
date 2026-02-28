import Foundation
import XCTest
@testable import SevenLayersMac
@testable import SevenLayersProtocol

final class DesktopNodeGatewayTests: XCTestCase {
    func testDiscoverCapabilitiesPublishesPermissionMapAndApprovalClass() {
        let gateway = DesktopNodeGateway(
            nodeID: "sevenlayers.test.node",
            captureApprovalGate: StaticCaptureApprovalGate(
                enabledCapabilities: [.screenSnapshot, .microphone]
            ),
            screenCaptureProvider: StubScreenCaptureProvider(),
            telemetryRecorder: TelemetryRecorderSpy()
        )

        let discovery = gateway.discoverCapabilities()

        XCTAssertEqual(discovery.transportContractVersion, "sevenlayers_macos_node_gateway_v1")
        XCTAssertEqual(discovery.nodeID, "sevenlayers.test.node")
        XCTAssertEqual(discovery.permissions["screenRecording"], true)
        XCTAssertEqual(discovery.permissions["camera"], false)
        XCTAssertEqual(discovery.permissions["microphone"], true)

        let snapshotCapability = discovery.capabilities.first {
            $0.command == DesktopNodeCommand.screenSnapshot
        }
        XCTAssertEqual(snapshotCapability?.enabled, true)
        XCTAssertEqual(
            snapshotCapability?.requiresApprovalTokenClass,
            CaptureApprovalToken.requiredTokenClass
        )
    }

    func testCaptureScreenSnapshotBuildsIngressEnvelopeAndEmitsTelemetry() throws {
        let telemetryRecorder = TelemetryRecorderSpy()
        let provider = StubScreenCaptureProvider()
        let gateway = DesktopNodeGateway(
            nodeID: "sevenlayers.test.node",
            captureApprovalGate: StaticCaptureApprovalGate(
                enabledCapabilities: [.screenSnapshot],
                acceptedTokenIDs: ["approval-screen-1"]
            ),
            screenCaptureProvider: provider,
            telemetryRecorder: telemetryRecorder,
            makeCorrelationID: { "corr-fixed-1" }
        )

        let execution = try gateway.captureScreenSnapshot(
            DesktopScreenSnapshotInvocation(
                liveSessionID: "live_screen_1",
                sourceID: "desktop:primary",
                approvalToken: CaptureApprovalToken(id: "approval-screen-1")
            )
        )

        XCTAssertEqual(provider.snapshotCallCount, 1)
        XCTAssertEqual(execution.artifact.sourceId, "desktop:primary")
        XCTAssertEqual(execution.envelope.approvalArtifactID, "approval-screen-1")
        XCTAssertEqual(execution.envelope.mutationAuthority, .vc83Backend)
        XCTAssertEqual(execution.envelope.metadata.messageClass, .session)
        XCTAssertEqual(execution.envelope.metadata.sessionID, "live_screen_1")
        XCTAssertFalse(execution.envelope.metadata.localMutationAllowed)

        if case let .mutatingToolIntent(tool, arguments) = execution.envelope.intent {
            XCTAssertEqual(tool, DesktopNodeCommand.screenSnapshot)
            XCTAssertEqual(arguments["liveSessionId"], "live_screen_1")
            XCTAssertEqual(arguments["capability"], CaptureCapability.screenSnapshot.rawValue)
            XCTAssertEqual(arguments["nodeId"], "sevenlayers.test.node")
        } else {
            XCTFail("Expected mutating tool intent for screen snapshot execution.")
        }

        XCTAssertEqual(execution.observabilitySignal.gateOutcome, .executed)
        XCTAssertEqual(execution.observabilitySignal.approvalStatus, .grantedOrNotRequired)
        XCTAssertEqual(execution.observabilitySignal.approvalArtifactIDs, ["approval-screen-1"])
        XCTAssertEqual(telemetryRecorder.signals, [execution.observabilitySignal])
    }

    func testCaptureScreenSnapshotFailsClosedWithoutApprovalTokenAndEmitsApprovalRequiredTelemetry() {
        let telemetryRecorder = TelemetryRecorderSpy()
        let gateway = DesktopNodeGateway(
            captureApprovalGate: StaticCaptureApprovalGate(enabledCapabilities: [.screenSnapshot]),
            screenCaptureProvider: StubScreenCaptureProvider(),
            telemetryRecorder: telemetryRecorder,
            makeCorrelationID: { "corr-fixed-2" }
        )

        XCTAssertThrowsError(
            try gateway.captureScreenSnapshot(
                DesktopScreenSnapshotInvocation(
                    liveSessionID: "live_screen_2",
                    approvalToken: nil
                )
            )
        ) { error in
            XCTAssertEqual(
                error as? CaptureConnectorError,
                .approvalRequired(.screenSnapshot)
            )
        }

        XCTAssertEqual(telemetryRecorder.signals.count, 1)
        XCTAssertEqual(telemetryRecorder.signals[0].gateOutcome, .approvalRequired)
        XCTAssertEqual(telemetryRecorder.signals[0].approvalStatus, .failedOrMissing)
        XCTAssertEqual(telemetryRecorder.signals[0].fallbackReasons, ["approval_required"])
    }

    func testCaptureScreenSnapshotBlocksWhenCapabilityDisabledAndEmitsBlockedTelemetry() {
        let telemetryRecorder = TelemetryRecorderSpy()
        let gateway = DesktopNodeGateway(
            captureApprovalGate: StaticCaptureApprovalGate(enabledCapabilities: []),
            screenCaptureProvider: StubScreenCaptureProvider(),
            telemetryRecorder: telemetryRecorder,
            makeCorrelationID: { "corr-fixed-3" }
        )

        XCTAssertThrowsError(
            try gateway.captureScreenSnapshot(
                DesktopScreenSnapshotInvocation(
                    liveSessionID: "live_screen_3",
                    approvalToken: CaptureApprovalToken(id: "approval-screen-3")
                )
            )
        ) { error in
            XCTAssertEqual(
                error as? CaptureConnectorError,
                .capabilityDisabled(.screenSnapshot)
            )
        }

        XCTAssertEqual(telemetryRecorder.signals.count, 1)
        XCTAssertEqual(telemetryRecorder.signals[0].gateOutcome, .blocked)
        XCTAssertEqual(telemetryRecorder.signals[0].approvalStatus, .none)
        XCTAssertEqual(telemetryRecorder.signals[0].fallbackReasons, ["capability_disabled"])
    }
}

private final class StubScreenCaptureProvider: ScreenCaptureProviding {
    private(set) var snapshotCallCount: Int = 0

    func captureSnapshot(sourceId: String) throws -> ScreenSnapshotArtifact {
        snapshotCallCount += 1
        return ScreenSnapshotArtifact(
            sourceId: sourceId,
            capturedAt: Date(timeIntervalSince1970: 1_700_400_000),
            payloadRef: "/tmp/snapshot.png"
        )
    }

    func startRecording(
        sourceId: String,
        boundedDurationMs: Int,
        withMicAudio: Bool,
        withSystemAudio: Bool
    ) throws -> ScreenRecordingArtifact {
        ScreenRecordingArtifact(
            sourceId: sourceId,
            recordingId: "recording-1",
            startedAt: Date(timeIntervalSince1970: 1_700_400_001),
            boundedDurationMs: boundedDurationMs,
            withMicAudio: withMicAudio,
            withSystemAudio: withSystemAudio
        )
    }
}

private final class TelemetryRecorderSpy: MacCompanionTelemetryRecording {
    private(set) var signals: [MacCompanionObservabilitySignal] = []

    func record(signal: MacCompanionObservabilitySignal) {
        signals.append(signal)
    }
}
