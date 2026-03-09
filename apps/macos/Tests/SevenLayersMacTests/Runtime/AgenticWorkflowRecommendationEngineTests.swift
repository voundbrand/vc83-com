import Foundation
import XCTest
@testable import SevenLayersMac

final class AgenticWorkflowRecommendationEngineTests: XCTestCase {
    func testBuildTestShipRecommendationRanksFirstForDeveloperFlow() {
        let engine = AgenticWorkflowRecommendationEngine()

        let recommendations = engine.recommend(
            from: [
                makeEvent("Xcode"),
                makeEvent("Terminal"),
                makeEvent("Safari"),
                makeEvent("Terminal"),
            ],
            referenceDate: Date(timeIntervalSince1970: 1_700_700_000)
        )

        XCTAssertEqual(recommendations.first?.id, "build_test_ship_loop")
    }

    func testFollowUpPipelineRanksFirstForCommunicationAndSchedulingFlow() {
        let engine = AgenticWorkflowRecommendationEngine()

        let recommendations = engine.recommend(
            from: [
                makeEvent("Mail"),
                makeEvent("Calendar"),
                makeEvent("Slack"),
                makeEvent("Calendar"),
            ],
            referenceDate: Date(timeIntervalSince1970: 1_700_700_500)
        )

        XCTAssertEqual(recommendations.first?.id, "follow_up_pipeline")
    }

    func testReturnsNoRecommendationWhenNoEvents() {
        let engine = AgenticWorkflowRecommendationEngine()
        let recommendations = engine.recommend(
            from: [],
            referenceDate: Date(timeIntervalSince1970: 1_700_701_000)
        )
        XCTAssertTrue(recommendations.isEmpty)
    }
}

private func makeEvent(_ appName: String) -> WorkObservationEvent {
    WorkObservationEvent(
        observedAt: Date(timeIntervalSince1970: 1_700_700_000),
        applicationName: appName,
        bundleIdentifier: nil
    )
}
