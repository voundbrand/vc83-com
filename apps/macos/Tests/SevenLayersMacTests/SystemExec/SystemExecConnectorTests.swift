import Foundation
import XCTest
@testable import SevenLayersMac
@testable import SevenLayersProtocol

final class SystemExecConnectorTests: XCTestCase {
    func testExecuteAllowsAllowlistedCommandAndBuildsScopedEnvelope() throws {
        let runner = StubSystemExecRunner()
        runner.nextOutput = SystemExecRunnerOutput(
            exitCode: 0,
            stdout: Data("ok".utf8),
            stderr: Data()
        )
        let reporter = SpySystemExecAuditReporter()
        let clock = StubClock(
            values: [
                Date(timeIntervalSince1970: 1_700_900_000),
                Date(timeIntervalSince1970: 1_700_900_001),
            ]
        )
        let connector = SystemExecConnector(
            policy: makePolicy(),
            runner: runner,
            auditReporter: reporter,
            now: clock.now
        )

        let request = SystemExecExecutionRequest(
            liveSessionID: "live_session_1",
            correlationID: "corr_1",
            executablePath: "/usr/bin/echo",
            arguments: ["health"],
            workingDirectory: "/tmp/mcr/session-1",
            approvalArtifact: makeApproval(
                correlationID: "corr_1",
                executablePath: "/usr/bin/echo",
                arguments: ["health"],
                workingDirectoryScope: "/tmp/mcr"
            )
        )

        let result = try connector.execute(request)

        XCTAssertEqual(result.envelope.status, .succeeded)
        XCTAssertEqual(result.envelope.allowlistRuleID, "echo-health")
        XCTAssertEqual(result.envelope.mutationAuthority, .vc83Backend)
        XCTAssertEqual(result.envelope.approvalArtifactID, "approval-1")
        XCTAssertEqual(result.envelope.durationMs, 1_000)

        let invocation = try XCTUnwrap(runner.invocations.first)
        XCTAssertEqual(invocation.command, "/usr/bin/echo")
        XCTAssertEqual(invocation.arguments, ["health"])
        XCTAssertEqual(invocation.workingDirectory, "/tmp/mcr/session-1")
        XCTAssertEqual(invocation.timeoutMs, 1_500)

        XCTAssertEqual(reporter.reports.count, 1)
        XCTAssertEqual(reporter.cleanupPaths.count, 1)
        XCTAssertEqual(reporter.reports.first?.descriptor, result.audit)
        XCTAssertEqual(reporter.cleanupPaths.first, result.audit.cleanupPath)
    }

    func testExecuteRejectsCommandThatIsNotAllowlisted() {
        let runner = StubSystemExecRunner()
        let reporter = SpySystemExecAuditReporter()
        let connector = SystemExecConnector(
            policy: makePolicy(),
            runner: runner,
            auditReporter: reporter
        )

        let request = SystemExecExecutionRequest(
            liveSessionID: "live_session_1",
            correlationID: "corr_2",
            executablePath: "/usr/bin/whoami",
            arguments: [],
            workingDirectory: "/tmp/mcr/session-2",
            approvalArtifact: makeApproval(
                correlationID: "corr_2",
                executablePath: "/usr/bin/whoami",
                arguments: [],
                workingDirectoryScope: "/tmp/mcr"
            )
        )

        XCTAssertThrowsError(try connector.execute(request)) { error in
            XCTAssertEqual(
                error as? SystemExecConnectorError,
                .commandNotAllowlisted("/usr/bin/whoami")
            )
        }

        XCTAssertEqual(runner.invocations.count, 0)
        XCTAssertEqual(reporter.reports.count, 0)
        XCTAssertEqual(reporter.cleanupPaths.count, 0)
    }

    func testExecuteFailsClosedWhenApprovalArtifactIsMissing() {
        let runner = StubSystemExecRunner()
        let connector = SystemExecConnector(policy: makePolicy(), runner: runner)

        let request = SystemExecExecutionRequest(
            liveSessionID: "live_session_1",
            correlationID: "corr_3",
            executablePath: "/usr/bin/echo",
            arguments: ["health"],
            workingDirectory: "/tmp/mcr/session-3",
            approvalArtifact: nil
        )

        XCTAssertThrowsError(try connector.execute(request)) { error in
            XCTAssertEqual(error as? SystemExecConnectorError, .approvalRequired)
        }

        XCTAssertEqual(runner.invocations.count, 0)
    }

    func testExecuteRejectsInvalidApprovalTokenClass() {
        let runner = StubSystemExecRunner()
        let connector = SystemExecConnector(policy: makePolicy(), runner: runner)

        let request = SystemExecExecutionRequest(
            liveSessionID: "live_session_1",
            correlationID: "corr_4",
            executablePath: "/usr/bin/echo",
            arguments: ["health"],
            workingDirectory: "/tmp/mcr/session-4",
            approvalArtifact: SystemExecApprovalArtifact(
                approval: ApprovalArtifact(
                    id: "approval-1",
                    tokenClass: "approval.session",
                    issuedAt: Date(timeIntervalSince1970: 1_700_900_100)
                ),
                binding: SystemExecApprovalBinding.make(
                    correlationID: "corr_4",
                    executablePath: "/usr/bin/echo",
                    arguments: ["health"],
                    workingDirectoryScope: "/tmp/mcr"
                )
            )
        )

        XCTAssertThrowsError(try connector.execute(request)) { error in
            XCTAssertEqual(
                error as? SystemExecConnectorError,
                .invalidApprovalTokenClass(expected: "approval.action", actual: "approval.session")
            )
        }

        XCTAssertEqual(runner.invocations.count, 0)
    }

    func testExecuteFailsClosedOnApprovalCommandHashMismatch() {
        let runner = StubSystemExecRunner()
        let connector = SystemExecConnector(policy: makePolicy(), runner: runner)

        let request = SystemExecExecutionRequest(
            liveSessionID: "live_session_1",
            correlationID: "corr_5",
            executablePath: "/usr/bin/echo",
            arguments: ["health"],
            workingDirectory: "/tmp/mcr/session-5",
            approvalArtifact: makeApproval(
                correlationID: "corr_5",
                executablePath: "/usr/bin/printf",
                arguments: ["health"],
                workingDirectoryScope: "/tmp/mcr"
            )
        )

        XCTAssertThrowsError(try connector.execute(request)) { error in
            XCTAssertEqual(
                error as? SystemExecConnectorError,
                .approvalCommandHashMismatch(
                    expected: SystemExecHasher.commandSHA256("/usr/bin/echo"),
                    actual: SystemExecHasher.commandSHA256("/usr/bin/printf")
                )
            )
        }

        XCTAssertEqual(runner.invocations.count, 0)
    }

    func testExecuteFailsClosedOnApprovalScopeMismatch() {
        let runner = StubSystemExecRunner()
        let connector = SystemExecConnector(policy: makePolicy(), runner: runner)

        let request = SystemExecExecutionRequest(
            liveSessionID: "live_session_1",
            correlationID: "corr_6",
            executablePath: "/usr/bin/echo",
            arguments: ["health"],
            workingDirectory: "/tmp/mcr/session-6",
            approvalArtifact: makeApproval(
                correlationID: "corr_6",
                executablePath: "/usr/bin/echo",
                arguments: ["health"],
                workingDirectoryScope: "/tmp/mcr/restricted"
            )
        )

        XCTAssertThrowsError(try connector.execute(request)) { error in
            XCTAssertEqual(
                error as? SystemExecConnectorError,
                .approvalScopeMismatch(expected: "/tmp/mcr", actual: "/tmp/mcr/restricted")
            )
        }

        XCTAssertEqual(runner.invocations.count, 0)
    }

    func testExecuteAlwaysReportsAndCleansDeterministicPathsOnProcessFailure() {
        let runner = StubSystemExecRunner()
        runner.nextOutput = SystemExecRunnerOutput(
            exitCode: 7,
            stdout: Data("partial".utf8),
            stderr: Data("boom".utf8)
        )
        let reporter = SpySystemExecAuditReporter()
        let clock = StubClock(
            values: [
                Date(timeIntervalSince1970: 1_700_900_200),
                Date(timeIntervalSince1970: 1_700_900_201),
            ]
        )
        let connector = SystemExecConnector(
            policy: makePolicy(),
            runner: runner,
            auditReporter: reporter,
            now: clock.now
        )

        let request = SystemExecExecutionRequest(
            liveSessionID: "live_session_1",
            correlationID: "corr_fail",
            executablePath: "/usr/bin/echo",
            arguments: ["status"],
            workingDirectory: "/tmp/mcr/session-7",
            approvalArtifact: makeApproval(
                correlationID: "corr_fail",
                executablePath: "/usr/bin/echo",
                arguments: ["status"],
                workingDirectoryScope: "/tmp/mcr"
            )
        )

        XCTAssertThrowsError(try connector.execute(request)) { error in
            XCTAssertEqual(
                error as? SystemExecConnectorError,
                .processFailed(exitCode: 7)
            )
        }

        XCTAssertEqual(reporter.reports.count, 1)
        XCTAssertEqual(reporter.cleanupPaths.count, 1)

        let commandHash = SystemExecHasher.commandSHA256("/usr/bin/echo")
        let expectedBasePath = "system_exec/live_session_1/corr_fail/\(String(commandHash.prefix(12)))"
        let report = reporter.reports[0]
        XCTAssertEqual(report.descriptor.reportPath, "\(expectedBasePath)/report.json")
        XCTAssertEqual(report.descriptor.cleanupPath, "\(expectedBasePath)/artifacts")
        XCTAssertEqual(reporter.cleanupPaths[0], "\(expectedBasePath)/artifacts")
        XCTAssertEqual(report.envelope.status, .failed)
        XCTAssertEqual(report.envelope.exitCode, 7)
    }
}

private struct RunnerInvocation: Equatable {
    let command: String
    let arguments: [String]
    let workingDirectory: String
    let timeoutMs: Int
}

private final class StubSystemExecRunner: SystemExecCommandRunning {
    var nextOutput: SystemExecRunnerOutput = .init(exitCode: 0)
    var invocations: [RunnerInvocation] = []

    func run(
        command: String,
        arguments: [String],
        workingDirectory: String,
        environment: [String: String],
        timeoutMs: Int
    ) throws -> SystemExecRunnerOutput {
        invocations.append(
            RunnerInvocation(
                command: command,
                arguments: arguments,
                workingDirectory: workingDirectory,
                timeoutMs: timeoutMs
            )
        )
        return nextOutput
    }
}

private final class SpySystemExecAuditReporter: SystemExecAuditReporting {
    var reports: [SystemExecAuditReport] = []
    var cleanupPaths: [String] = []

    func write(report: SystemExecAuditReport) throws {
        reports.append(report)
    }

    func cleanupArtifacts(at path: String) throws {
        cleanupPaths.append(path)
    }
}

private final class StubClock {
    private var values: [Date]

    init(values: [Date]) {
        self.values = values
    }

    func now() -> Date {
        guard !values.isEmpty else {
            return Date(timeIntervalSince1970: 1_700_999_999)
        }
        return values.removeFirst()
    }
}

private func makePolicy() -> SystemExecExecutionPolicy {
    SystemExecExecutionPolicy(
        isEnabled: true,
        allowlist: [
            SystemExecAllowlistRule(
                id: "echo-health",
                executablePath: "/usr/bin/echo",
                allowedArguments: ["health", "status"],
                workingDirectoryScope: "/tmp/mcr",
                timeoutMs: 1_500
            ),
        ]
    )
}

private func makeApproval(
    correlationID: String,
    executablePath: String,
    arguments: [String],
    workingDirectoryScope: String
) -> SystemExecApprovalArtifact {
    SystemExecApprovalArtifact.makeBoundApproval(
        id: "approval-1",
        issuedAt: Date(timeIntervalSince1970: 1_700_900_050),
        correlationID: correlationID,
        executablePath: executablePath,
        arguments: arguments,
        workingDirectoryScope: workingDirectoryScope
    )
}
