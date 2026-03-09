import Foundation

public struct WorkflowRecommendationState: Equatable {
    public let isWatching: Bool
    public let observedEventsCount: Int
    public let recentApplications: [String]
    public let recommendations: [AgenticWorkflowRecommendation]
    public let statusText: String

    public var topRecommendation: AgenticWorkflowRecommendation? {
        recommendations.first
    }

    public init(
        isWatching: Bool = false,
        observedEventsCount: Int = 0,
        recentApplications: [String] = [],
        recommendations: [AgenticWorkflowRecommendation] = [],
        statusText: String = "Workflow watcher is idle."
    ) {
        self.isWatching = isWatching
        self.observedEventsCount = max(0, observedEventsCount)
        self.recentApplications = recentApplications
        self.recommendations = recommendations
        self.statusText = statusText
    }
}

@MainActor
public final class WorkflowRecommendationSessionController {
    private let activityMonitor: any WorkActivityMonitoring
    private let recommendationEngine: any AgenticWorkflowRecommendationProviding
    private let now: @Sendable () -> Date
    private let maxEvents: Int

    private var observedEvents: [WorkObservationEvent] = []
    private var stateObservers: [UUID: (WorkflowRecommendationState) -> Void] = [:]

    public private(set) var state = WorkflowRecommendationState() {
        didSet {
            for observer in stateObservers.values {
                observer(state)
            }
        }
    }

    public init(
        activityMonitor: any WorkActivityMonitoring,
        recommendationEngine: any AgenticWorkflowRecommendationProviding,
        now: @escaping @Sendable () -> Date = Date.init,
        maxEvents: Int = 120
    ) {
        self.activityMonitor = activityMonitor
        self.recommendationEngine = recommendationEngine
        self.now = now
        self.maxEvents = max(10, maxEvents)
    }

    public func startWatching() {
        guard state.isWatching == false else {
            return
        }

        activityMonitor.start { [weak self] event in
            Task { @MainActor [weak self] in
                self?.ingestObservation(event)
            }
        }

        updateState(
            isWatching: true,
            recommendations: state.recommendations,
            statusText: "Watching active. Waiting for context..."
        )
    }

    public func stopWatching() {
        guard state.isWatching else {
            return
        }

        activityMonitor.stop()
        updateState(
            isWatching: false,
            recommendations: state.recommendations,
            statusText: "Watching stopped."
        )
    }

    public func refreshRecommendations() {
        let recommendations = recommendationEngine.recommend(
            from: observedEvents,
            referenceDate: now()
        )

        if recommendations.isEmpty {
            updateState(
                isWatching: state.isWatching,
                recommendations: [],
                statusText: "No recommendation yet. Keep watching to gather context."
            )
            return
        }

        updateState(
            isWatching: state.isWatching,
            recommendations: recommendations,
            statusText: "Recommended workflow: \(recommendations[0].title)"
        )
    }

    public func clearHistory() {
        observedEvents = []
        updateState(
            isWatching: state.isWatching,
            recommendations: [],
            statusText: state.isWatching
                ? "History cleared. Watching active."
                : "History cleared."
        )
    }

    public func topRecommendationDraft() -> String? {
        guard let recommendation = state.topRecommendation else {
            return nil
        }

        let recentApps = state.recentApplications.joined(separator: ", ")
        let appContext = recentApps.isEmpty ? "unknown" : recentApps
        let steps = recommendation.suggestedSteps.map { "- \($0)" }.joined(separator: "\n")

        return """
        Observed app context: \(appContext)
        Suggested agentic workflow: \(recommendation.title)
        Why: \(recommendation.rationale)
        Recommended steps:
        \(steps)
        """
    }

    @discardableResult
    public func addStateObserver(
        _ observer: @escaping (WorkflowRecommendationState) -> Void
    ) -> UUID {
        let token = UUID()
        stateObservers[token] = observer
        observer(state)
        return token
    }

    public func removeStateObserver(_ token: UUID) {
        stateObservers.removeValue(forKey: token)
    }

    private func ingestObservation(_ event: WorkObservationEvent) {
        observedEvents.append(event)
        trimEventsIfNeeded()

        refreshRecommendations()
    }

    private func trimEventsIfNeeded() {
        guard observedEvents.count > maxEvents else {
            return
        }

        let overflowCount = observedEvents.count - maxEvents
        observedEvents.removeFirst(overflowCount)
    }

    private func recentApplications(limit: Int = 3) -> [String] {
        var seen: Set<String> = []
        var ordered: [String] = []

        for event in observedEvents.reversed() {
            let name = event.applicationName.trimmingCharacters(in: .whitespacesAndNewlines)
            guard !name.isEmpty else {
                continue
            }
            guard seen.contains(name.lowercased()) == false else {
                continue
            }

            seen.insert(name.lowercased())
            ordered.append(name)
            if ordered.count >= limit {
                break
            }
        }

        return ordered
    }

    private func updateState(
        isWatching: Bool,
        recommendations: [AgenticWorkflowRecommendation],
        statusText: String
    ) {
        state = WorkflowRecommendationState(
            isWatching: isWatching,
            observedEventsCount: observedEvents.count,
            recentApplications: recentApplications(),
            recommendations: recommendations,
            statusText: statusText
        )
    }
}
