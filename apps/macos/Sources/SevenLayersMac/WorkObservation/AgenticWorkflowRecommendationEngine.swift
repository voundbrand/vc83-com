import Foundation

public struct AgenticWorkflowRecommendationEngine: AgenticWorkflowRecommendationProviding {
    public init() {}

    public func recommend(
        from events: [WorkObservationEvent],
        referenceDate: Date = Date()
    ) -> [AgenticWorkflowRecommendation] {
        _ = referenceDate

        let normalizedApps = events
            .map { normalizeAppName($0.applicationName) }
            .filter { !$0.isEmpty }

        guard !normalizedApps.isEmpty else {
            return []
        }

        let appSet = Set(normalizedApps)
        let switchRatio = calculateSwitchRatio(normalizedApps)

        var recommendations: [AgenticWorkflowRecommendation] = []

        if hasCommunicationAndSchedulingSignals(appSet) {
            recommendations.append(
                AgenticWorkflowRecommendation(
                    id: "follow_up_pipeline",
                    title: "Follow-Up Pipeline",
                    summary: "Turn incoming conversations into scheduled, trackable follow-ups.",
                    rationale: "You are moving between communication and calendar surfaces.",
                    suggestedSteps: [
                        "Capture every inbound request as a task with owner + due date.",
                        "Auto-classify follow-ups by urgency and relationship stage.",
                        "Send reminder nudges until each task is closed."
                    ],
                    confidence: min(0.95, 0.78 + (switchRatio * 0.15))
                )
            )
        }

        if hasResearchAndOutreachSignals(appSet) {
            recommendations.append(
                AgenticWorkflowRecommendation(
                    id: "research_to_outreach",
                    title: "Research to Outreach",
                    summary: "Convert research sessions into structured outreach actions.",
                    rationale: "You are combining browsing, note capture, and communication apps.",
                    suggestedSteps: [
                        "Extract key findings into a structured brief automatically.",
                        "Generate an outreach draft linked to the brief.",
                        "Queue a follow-up sequence with checkpoints."
                    ],
                    confidence: min(0.94, 0.74 + (switchRatio * 0.18))
                )
            )
        }

        if hasBuildAndDeliverySignals(appSet) {
            recommendations.append(
                AgenticWorkflowRecommendation(
                    id: "build_test_ship_loop",
                    title: "Build-Test-Ship Loop",
                    summary: "Shorten the path from coding to validated release notes and delivery.",
                    rationale: "You are operating across development and runtime tooling.",
                    suggestedSteps: [
                        "Trigger focused tests when relevant files change.",
                        "Draft release notes from commits and test outcomes.",
                        "Post a deployment checklist before shipping."
                    ],
                    confidence: min(0.96, 0.8 + (switchRatio * 0.12))
                )
            )
        }

        if recommendations.isEmpty || switchRatio >= 0.55 {
            recommendations.append(
                AgenticWorkflowRecommendation(
                    id: "context_switch_stabilizer",
                    title: "Context-Switch Stabilizer",
                    summary: "Reduce context loss with one queue and batched execution windows.",
                    rationale: "Recent app switching suggests fragmented execution flow.",
                    suggestedSteps: [
                        "Collect all open loops into one prioritized queue.",
                        "Group tasks by application context into execution blocks.",
                        "Run batched completion + summary checkpoints every 30 minutes."
                    ],
                    confidence: min(0.9, 0.58 + (switchRatio * 0.2))
                )
            )
        }

        return recommendations.sorted { lhs, rhs in
            if lhs.confidence == rhs.confidence {
                return lhs.title < rhs.title
            }
            return lhs.confidence > rhs.confidence
        }
    }

    private func hasCommunicationAndSchedulingSignals(_ appSet: Set<String>) -> Bool {
        hasAny(appSet, from: ["mail", "outlook", "slack", "messages", "telegram"])
            && hasAny(appSet, from: ["calendar", "fantastical"])
    }

    private func hasResearchAndOutreachSignals(_ appSet: Set<String>) -> Bool {
        hasAny(appSet, from: ["safari", "chrome", "arc", "firefox", "edge"])
            && hasAny(appSet, from: ["notes", "notion", "obsidian", "bear"])
            && hasAny(appSet, from: ["mail", "outlook", "slack", "messages", "telegram"])
    }

    private func hasBuildAndDeliverySignals(_ appSet: Set<String>) -> Bool {
        hasAny(appSet, from: ["xcode", "appcode", "cursor", "visual studio code"])
            && hasAny(appSet, from: ["terminal", "iterm2", "warp"])
    }

    private func hasAny(_ appSet: Set<String>, from candidates: [String]) -> Bool {
        candidates.contains { appSet.contains($0) }
    }

    private func normalizeAppName(_ raw: String) -> String {
        raw.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
    }

    private func calculateSwitchRatio(_ normalizedApps: [String]) -> Double {
        guard normalizedApps.count > 1 else {
            return 0
        }

        var switches = 0
        for index in 1..<normalizedApps.count {
            if normalizedApps[index] != normalizedApps[index - 1] {
                switches += 1
            }
        }

        return Double(switches) / Double(normalizedApps.count - 1)
    }
}
