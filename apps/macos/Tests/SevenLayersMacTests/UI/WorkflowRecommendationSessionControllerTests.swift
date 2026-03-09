import Foundation
import XCTest
@testable import SevenLayersMac

@MainActor
final class WorkflowRecommendationSessionControllerTests: XCTestCase {
    func testStartAndStopWatchingUpdatesState() {
        let monitor = StubWorkActivityMonitor()
        let session = WorkflowRecommendationSessionController(
            activityMonitor: monitor,
            recommendationEngine: StubRecommendationEngine(recommendations: [])
        )

        session.startWatching()
        XCTAssertTrue(session.state.isWatching)
        XCTAssertEqual(monitor.startCallCount, 1)

        session.stopWatching()
        XCTAssertFalse(session.state.isWatching)
        XCTAssertEqual(monitor.stopCallCount, 1)
    }

    func testObservationIngestUpdatesRecommendationState() {
        let monitor = StubWorkActivityMonitor()
        let recommendation = AgenticWorkflowRecommendation(
            id: "research_to_outreach",
            title: "Research to Outreach",
            summary: "Summary",
            rationale: "Rationale",
            suggestedSteps: ["Step A", "Step B"],
            confidence: 0.84
        )
        let session = WorkflowRecommendationSessionController(
            activityMonitor: monitor,
            recommendationEngine: StubRecommendationEngine(recommendations: [recommendation]),
            now: { Date(timeIntervalSince1970: 1_700_800_000) }
        )

        session.startWatching()
        monitor.emit(
            WorkObservationEvent(
                observedAt: Date(timeIntervalSince1970: 1_700_800_001),
                applicationName: "Safari",
                bundleIdentifier: "com.apple.Safari"
            )
        )

        // Allow the Task hop in start() callback path to complete.
        RunLoop.main.run(until: Date(timeIntervalSinceNow: 0.01))

        XCTAssertEqual(session.state.observedEventsCount, 1)
        XCTAssertEqual(session.state.topRecommendation?.id, "research_to_outreach")
        XCTAssertEqual(session.state.recentApplications, ["Safari"])
    }

    func testTopRecommendationDraftIncludesCoreFields() {
        let monitor = StubWorkActivityMonitor()
        let recommendation = AgenticWorkflowRecommendation(
            id: "follow_up_pipeline",
            title: "Follow-Up Pipeline",
            summary: "Summary",
            rationale: "You are switching between chat and calendar.",
            suggestedSteps: ["Capture requests", "Schedule follow-ups"],
            confidence: 0.8
        )
        let session = WorkflowRecommendationSessionController(
            activityMonitor: monitor,
            recommendationEngine: StubRecommendationEngine(recommendations: [recommendation])
        )

        session.startWatching()
        monitor.emit(
            WorkObservationEvent(
                observedAt: Date(timeIntervalSince1970: 1_700_800_010),
                applicationName: "Slack",
                bundleIdentifier: nil
            )
        )
        RunLoop.main.run(until: Date(timeIntervalSinceNow: 0.01))

        let draft = session.topRecommendationDraft()
        XCTAssertNotNil(draft)
        XCTAssertTrue(draft?.contains("Follow-Up Pipeline") == true)
        XCTAssertTrue(draft?.contains("Capture requests") == true)
        XCTAssertTrue(draft?.contains("Slack") == true)
    }
}

private final class StubWorkActivityMonitor: WorkActivityMonitoring {
    private var onEvent: (@Sendable (WorkObservationEvent) -> Void)?

    private(set) var startCallCount = 0
    private(set) var stopCallCount = 0

    func start(onEvent: @escaping @Sendable (WorkObservationEvent) -> Void) {
        startCallCount += 1
        self.onEvent = onEvent
    }

    func stop() {
        stopCallCount += 1
        onEvent = nil
    }

    func emit(_ event: WorkObservationEvent) {
        onEvent?(event)
    }
}

private struct StubRecommendationEngine: AgenticWorkflowRecommendationProviding {
    let recommendations: [AgenticWorkflowRecommendation]

    func recommend(
        from events: [WorkObservationEvent],
        referenceDate: Date
    ) -> [AgenticWorkflowRecommendation] {
        _ = events
        _ = referenceDate
        return recommendations
    }
}
