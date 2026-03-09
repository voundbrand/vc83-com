import Foundation

public struct SystemExecApprovalPromptViewModel: Equatable {
    public let title: String
    public let subtitle: String
    public let details: [String]

    public init(title: String, subtitle: String, details: [String]) {
        self.title = title
        self.subtitle = subtitle
        self.details = details
    }
}

public enum SystemExecApprovalPromptFormatter {
    public static func makeViewModel(
        from prompt: SystemExecApprovalPromptContract
    ) -> SystemExecApprovalPromptViewModel {
        let outcomeTitle: String
        switch prompt.policyOutcome {
        case .ready:
            outcomeTitle = "Exec approval required"
        case .deniedByDefault:
            outcomeTitle = "Exec request denied"
        case .deniedPersisted:
            outcomeTitle = "Exec request denied (persisted)"
        }

        let subtitle = "Desktop is ingress/control only. Backend remains mutation authority."
        var details: [String] = [
            "Token class: \(prompt.requiredApprovalTokenClass)",
            "Mutation authority: \(prompt.mutationAuthority.rawValue)",
            "Executable: \(prompt.executablePath)",
            "Arguments: \(prompt.arguments.joined(separator: " "))",
            "Command SHA256: \(prompt.commandSHA256)",
            "Arguments SHA256: \(prompt.argumentsSHA256)",
        ]

        if let requestedWorkingDirectory = prompt.requestedWorkingDirectory {
            details.append("Requested directory: \(requestedWorkingDirectory)")
        }

        if let requiredWorkingDirectoryScope = prompt.requiredWorkingDirectoryScope {
            details.append("Required scope: \(requiredWorkingDirectoryScope)")
        }

        if let policyReason = prompt.policyReason {
            details.append("Policy reason: \(policyReason)")
        }

        return SystemExecApprovalPromptViewModel(
            title: outcomeTitle,
            subtitle: subtitle,
            details: details
        )
    }
}
