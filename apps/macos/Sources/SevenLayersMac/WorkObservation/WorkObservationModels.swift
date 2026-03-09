import Foundation

public struct WorkObservationEvent: Equatable, Sendable {
    public let observedAt: Date
    public let applicationName: String
    public let bundleIdentifier: String?

    public init(
        observedAt: Date,
        applicationName: String,
        bundleIdentifier: String? = nil
    ) {
        self.observedAt = observedAt
        self.applicationName = applicationName.trimmingCharacters(in: .whitespacesAndNewlines)
        let normalizedBundleID = bundleIdentifier?.trimmingCharacters(in: .whitespacesAndNewlines)
        self.bundleIdentifier = normalizedBundleID?.isEmpty == true ? nil : normalizedBundleID
    }
}

public struct AgenticWorkflowRecommendation: Equatable, Sendable {
    public let id: String
    public let title: String
    public let summary: String
    public let rationale: String
    public let suggestedSteps: [String]
    public let confidence: Double

    public var confidencePercent: Int {
        Int((confidence * 100).rounded())
    }

    public init(
        id: String,
        title: String,
        summary: String,
        rationale: String,
        suggestedSteps: [String],
        confidence: Double
    ) {
        self.id = id.trimmingCharacters(in: .whitespacesAndNewlines)
        self.title = title.trimmingCharacters(in: .whitespacesAndNewlines)
        self.summary = summary.trimmingCharacters(in: .whitespacesAndNewlines)
        self.rationale = rationale.trimmingCharacters(in: .whitespacesAndNewlines)
        self.suggestedSteps = suggestedSteps
            .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty }
        self.confidence = min(1, max(0, confidence))
    }
}

public protocol AgenticWorkflowRecommendationProviding {
    func recommend(
        from events: [WorkObservationEvent],
        referenceDate: Date
    ) -> [AgenticWorkflowRecommendation]
}
