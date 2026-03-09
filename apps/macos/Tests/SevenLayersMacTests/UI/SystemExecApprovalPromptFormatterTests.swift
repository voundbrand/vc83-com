import XCTest
@testable import SevenLayersMac
@testable import SevenLayersProtocol

final class SystemExecApprovalPromptFormatterTests: XCTestCase {
    func testFormatterShowsArtifactScopeAndHashes() {
        let prompt = SystemExecApprovalPromptContract(
            liveSessionID: "live_fmt_1",
            correlationID: "corr_fmt_1",
            executablePath: "/usr/bin/echo",
            arguments: ["status"],
            commandSHA256: SystemExecHasher.commandSHA256("/usr/bin/echo"),
            argumentsSHA256: SystemExecHasher.argumentsSHA256(["status"]),
            requestedWorkingDirectory: "/tmp/mcr/session-fmt",
            requiredWorkingDirectoryScope: "/tmp/mcr",
            policyOutcome: .ready,
            policyReason: nil
        )

        let viewModel = SystemExecApprovalPromptFormatter.makeViewModel(from: prompt)

        XCTAssertEqual(viewModel.title, "Exec approval required")
        XCTAssertEqual(
            viewModel.subtitle,
            "Desktop is ingress/control only. Backend remains mutation authority."
        )
        XCTAssertTrue(viewModel.details.contains("Token class: approval.action"))
        XCTAssertTrue(viewModel.details.contains("Mutation authority: vc83_backend"))
        XCTAssertTrue(
            viewModel.details.contains("Command SHA256: \(prompt.commandSHA256)")
        )
        XCTAssertTrue(
            viewModel.details.contains("Arguments SHA256: \(prompt.argumentsSHA256)")
        )
        XCTAssertTrue(viewModel.details.contains("Required scope: /tmp/mcr"))
    }

    func testFormatterShowsPersistedDenyState() {
        let prompt = SystemExecApprovalPromptContract(
            liveSessionID: "live_fmt_2",
            correlationID: "corr_fmt_2",
            executablePath: "/usr/bin/whoami",
            arguments: [],
            commandSHA256: SystemExecHasher.commandSHA256("/usr/bin/whoami"),
            argumentsSHA256: SystemExecHasher.argumentsSHA256([]),
            requestedWorkingDirectory: "/tmp/mcr/session-fmt-2",
            requiredWorkingDirectoryScope: "/tmp/mcr/session-fmt-2",
            policyOutcome: .deniedPersisted,
            policyReason: "persisted_policy_deny"
        )

        let viewModel = SystemExecApprovalPromptFormatter.makeViewModel(from: prompt)

        XCTAssertEqual(viewModel.title, "Exec request denied (persisted)")
        XCTAssertTrue(viewModel.details.contains("Policy reason: persisted_policy_deny"))
    }
}
