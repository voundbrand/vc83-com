import Foundation
import SevenLayersProtocol

public struct SystemExecExecutionRequest: Equatable {
    public let liveSessionID: String
    public let correlationID: String
    public let executablePath: String
    public let arguments: [String]
    public let workingDirectory: String?
    public let environment: [String: String]
    public let approvalArtifact: SystemExecApprovalArtifact?

    public init(
        liveSessionID: String,
        correlationID: String,
        executablePath: String,
        arguments: [String] = [],
        workingDirectory: String? = nil,
        environment: [String: String] = [:],
        approvalArtifact: SystemExecApprovalArtifact?
    ) {
        self.liveSessionID = liveSessionID
        self.correlationID = correlationID
        self.executablePath = executablePath
        self.arguments = arguments
        self.workingDirectory = workingDirectory
        self.environment = environment
        self.approvalArtifact = approvalArtifact
    }
}

public struct SystemExecRunnerOutput: Equatable {
    public let exitCode: Int32
    public let timedOut: Bool
    public let stdout: Data
    public let stderr: Data

    public init(
        exitCode: Int32,
        timedOut: Bool = false,
        stdout: Data = Data(),
        stderr: Data = Data()
    ) {
        self.exitCode = exitCode
        self.timedOut = timedOut
        self.stdout = stdout
        self.stderr = stderr
    }
}

public protocol SystemExecCommandRunning {
    func run(
        command: String,
        arguments: [String],
        workingDirectory: String,
        environment: [String: String],
        timeoutMs: Int
    ) throws -> SystemExecRunnerOutput
}

public enum SystemExecExecutionStatus: String, Equatable {
    case succeeded
    case failed
}

public struct SystemExecExecutionEnvelope: Equatable {
    public static let contractVersion = "system_exec_envelope_v1"
    public static let source = "macos_system_exec_connector"

    public let contractVersion: String
    public let source: String
    public let liveSessionID: String
    public let correlationID: String
    public let allowlistRuleID: String
    public let executablePath: String
    public let arguments: [String]
    public let workingDirectory: String
    public let commandSHA256: String
    public let argumentsSHA256: String
    public let approvalArtifactID: String
    public let mutationAuthority: MutationAuthority
    public let startedAt: Date
    public let finishedAt: Date
    public let durationMs: Int
    public let exitCode: Int32
    public let timedOut: Bool
    public let status: SystemExecExecutionStatus

    public init(
        liveSessionID: String,
        correlationID: String,
        allowlistRuleID: String,
        executablePath: String,
        arguments: [String],
        workingDirectory: String,
        commandSHA256: String,
        argumentsSHA256: String,
        approvalArtifactID: String,
        startedAt: Date,
        finishedAt: Date,
        durationMs: Int,
        exitCode: Int32,
        timedOut: Bool,
        status: SystemExecExecutionStatus,
        mutationAuthority: MutationAuthority = .vc83Backend
    ) {
        contractVersion = Self.contractVersion
        source = Self.source
        self.liveSessionID = liveSessionID
        self.correlationID = correlationID
        self.allowlistRuleID = allowlistRuleID
        self.executablePath = executablePath
        self.arguments = arguments
        self.workingDirectory = workingDirectory
        self.commandSHA256 = commandSHA256
        self.argumentsSHA256 = argumentsSHA256
        self.approvalArtifactID = approvalArtifactID
        self.mutationAuthority = mutationAuthority
        self.startedAt = startedAt
        self.finishedAt = finishedAt
        self.durationMs = durationMs
        self.exitCode = exitCode
        self.timedOut = timedOut
        self.status = status
    }
}

public struct SystemExecAuditDescriptor: Equatable {
    public let reportPath: String
    public let cleanupPath: String

    public init(reportPath: String, cleanupPath: String) {
        self.reportPath = reportPath
        self.cleanupPath = cleanupPath
    }
}

public struct SystemExecAuditReport: Equatable {
    public let descriptor: SystemExecAuditDescriptor
    public let envelope: SystemExecExecutionEnvelope
    public let stdoutBytes: Int
    public let stderrBytes: Int
    public let stdoutPreview: String
    public let stderrPreview: String

    public init(
        descriptor: SystemExecAuditDescriptor,
        envelope: SystemExecExecutionEnvelope,
        stdoutBytes: Int,
        stderrBytes: Int,
        stdoutPreview: String,
        stderrPreview: String
    ) {
        self.descriptor = descriptor
        self.envelope = envelope
        self.stdoutBytes = stdoutBytes
        self.stderrBytes = stderrBytes
        self.stdoutPreview = stdoutPreview
        self.stderrPreview = stderrPreview
    }
}

public protocol SystemExecAuditReporting {
    func write(report: SystemExecAuditReport) throws
    func cleanupArtifacts(at path: String) throws
}

public struct NoopSystemExecAuditReporter: SystemExecAuditReporting {
    public init() {}

    public func write(report: SystemExecAuditReport) throws {}

    public func cleanupArtifacts(at path: String) throws {}
}

public struct SystemExecExecutionResult: Equatable {
    public let envelope: SystemExecExecutionEnvelope
    public let audit: SystemExecAuditDescriptor

    public init(envelope: SystemExecExecutionEnvelope, audit: SystemExecAuditDescriptor) {
        self.envelope = envelope
        self.audit = audit
    }
}

public final class SystemExecConnector {
    private let policy: SystemExecExecutionPolicy
    private let runner: any SystemExecCommandRunning
    private let auditReporter: any SystemExecAuditReporting
    private let now: () -> Date

    public init(
        policy: SystemExecExecutionPolicy = .failClosed,
        runner: any SystemExecCommandRunning,
        auditReporter: any SystemExecAuditReporting = NoopSystemExecAuditReporter(),
        now: @escaping () -> Date = Date.init
    ) {
        self.policy = policy
        self.runner = runner
        self.auditReporter = auditReporter
        self.now = now
    }

    public func execute(_ request: SystemExecExecutionRequest) throws -> SystemExecExecutionResult {
        guard let liveSessionID = normalizedNonEmpty(request.liveSessionID) else {
            throw SystemExecConnectorError.missingLiveSessionID
        }

        guard let correlationID = normalizedNonEmpty(request.correlationID) else {
            throw SystemExecConnectorError.missingCorrelationID
        }

        let authorizedCommand = try policy.resolveAuthorizedCommand(
            executablePath: request.executablePath,
            arguments: request.arguments,
            workingDirectory: request.workingDirectory
        )

        let approvalArtifact = try validateSystemExecApproval(
            request.approvalArtifact,
            correlationID: correlationID,
            executablePath: authorizedCommand.executablePath,
            arguments: authorizedCommand.arguments,
            workingDirectory: authorizedCommand.workingDirectory,
            requiredScope: authorizedCommand.rule.workingDirectoryScope
        )

        let commandHash = SystemExecHasher.commandSHA256(authorizedCommand.executablePath)
        let argumentsHash = SystemExecHasher.argumentsSHA256(authorizedCommand.arguments)
        let descriptor = makeAuditDescriptor(
            liveSessionID: liveSessionID,
            correlationID: correlationID,
            commandHash: commandHash
        )

        let startedAt = now()

        var runnerOutput: SystemExecRunnerOutput?
        var runnerFailure: String?
        do {
            runnerOutput = try runner.run(
                command: authorizedCommand.executablePath,
                arguments: authorizedCommand.arguments,
                workingDirectory: authorizedCommand.workingDirectory,
                environment: request.environment,
                timeoutMs: authorizedCommand.rule.timeoutMs
            )
        } catch {
            runnerFailure = String(describing: error)
        }

        let finishedAt = now()
        let output = runnerOutput ?? SystemExecRunnerOutput(exitCode: -1)
        let durationMs = max(
            0,
            Int((finishedAt.timeIntervalSince(startedAt) * 1000).rounded())
        )
        let status: SystemExecExecutionStatus = {
            if runnerFailure == nil, output.exitCode == 0, output.timedOut == false {
                return .succeeded
            }
            return .failed
        }()

        let envelope = SystemExecExecutionEnvelope(
            liveSessionID: liveSessionID,
            correlationID: correlationID,
            allowlistRuleID: authorizedCommand.rule.id,
            executablePath: authorizedCommand.executablePath,
            arguments: authorizedCommand.arguments,
            workingDirectory: authorizedCommand.workingDirectory,
            commandSHA256: commandHash,
            argumentsSHA256: argumentsHash,
            approvalArtifactID: approvalArtifact.id,
            startedAt: startedAt,
            finishedAt: finishedAt,
            durationMs: durationMs,
            exitCode: output.exitCode,
            timedOut: output.timedOut,
            status: status
        )

        let report = SystemExecAuditReport(
            descriptor: descriptor,
            envelope: envelope,
            stdoutBytes: output.stdout.count,
            stderrBytes: output.stderr.count,
            stdoutPreview: preview(output.stdout),
            stderrPreview: preview(output.stderr)
        )

        if let persistenceError = persistAudit(report) {
            throw persistenceError
        }

        if let runnerFailure {
            throw SystemExecConnectorError.runnerFailed(runnerFailure)
        }

        if output.timedOut {
            throw SystemExecConnectorError.commandTimedOut
        }

        if output.exitCode != 0 {
            throw SystemExecConnectorError.processFailed(exitCode: output.exitCode)
        }

        return SystemExecExecutionResult(envelope: envelope, audit: descriptor)
    }

    private func makeAuditDescriptor(
        liveSessionID: String,
        correlationID: String,
        commandHash: String
    ) -> SystemExecAuditDescriptor {
        let basePath = [
            "system_exec",
            sanitizePathSegment(liveSessionID),
            sanitizePathSegment(correlationID),
            String(commandHash.prefix(12)),
        ].joined(separator: "/")

        return SystemExecAuditDescriptor(
            reportPath: "\(basePath)/report.json",
            cleanupPath: "\(basePath)/artifacts"
        )
    }

    private func sanitizePathSegment(_ raw: String) -> String {
        let mapped = raw.lowercased().map { character -> Character in
            if character.isLetter || character.isNumber || character == "-" || character == "_" {
                return character
            }
            return "-"
        }

        let value = String(mapped)
        return value.isEmpty ? "unknown" : value
    }

    private func preview(_ data: Data, maxBytes: Int = 512) -> String {
        guard !data.isEmpty else {
            return ""
        }
        return String(decoding: data.prefix(maxBytes), as: UTF8.self)
    }

    private func persistAudit(_ report: SystemExecAuditReport) -> SystemExecConnectorError? {
        var primaryError: SystemExecConnectorError?

        do {
            try auditReporter.write(report: report)
        } catch {
            primaryError = .auditReportFailed(String(describing: error))
        }

        do {
            try auditReporter.cleanupArtifacts(at: report.descriptor.cleanupPath)
        } catch {
            if primaryError == nil {
                primaryError = .cleanupFailed(String(describing: error))
            }
        }

        return primaryError
    }
}
