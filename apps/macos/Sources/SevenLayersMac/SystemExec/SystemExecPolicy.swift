import CryptoKit
import Foundation
import SevenLayersProtocol

public enum SystemExecConnectorError: Error, Equatable {
    case capabilityDisabled
    case missingLiveSessionID
    case missingCorrelationID
    case invalidExecutablePath(String)
    case prohibitedExecutable(String)
    case commandNotAllowlisted(String)
    case argumentNotAllowlisted(String)
    case workingDirectoryOutOfScope(expectedScope: String, actual: String)
    case approvalRequired
    case invalidApprovalArtifactID
    case invalidApprovalTokenClass(expected: String, actual: String)
    case approvalCorrelationMismatch(expected: String, actual: String)
    case approvalCommandHashMismatch(expected: String, actual: String)
    case approvalArgumentsHashMismatch(expected: String, actual: String)
    case approvalScopeMismatch(expected: String, actual: String)
    case commandTimedOut
    case processFailed(exitCode: Int32)
    case runnerFailed(String)
    case auditReportFailed(String)
    case cleanupFailed(String)
}

public struct SystemExecAllowlistRule: Equatable {
    public let id: String
    public let executablePath: String
    public let allowedArguments: Set<String>
    public let workingDirectoryScope: String
    public let timeoutMs: Int

    public init(
        id: String,
        executablePath: String,
        allowedArguments: Set<String> = [],
        workingDirectoryScope: String,
        timeoutMs: Int = 10_000
    ) {
        self.id = id.trimmingCharacters(in: .whitespacesAndNewlines)
        self.executablePath = normalizeAbsolutePath(executablePath)
            ?? executablePath.trimmingCharacters(in: .whitespacesAndNewlines)
        self.allowedArguments = Set(allowedArguments.compactMap(normalizedNonEmpty))
        self.workingDirectoryScope = normalizeAbsolutePath(workingDirectoryScope)
            ?? workingDirectoryScope.trimmingCharacters(in: .whitespacesAndNewlines)
        self.timeoutMs = max(250, timeoutMs)
    }
}

public struct SystemExecExecutionPolicy: Equatable {
    public static let defaultProhibitedExecutables: Set<String> = [
        "/usr/bin/sudo",
        "/bin/sh",
        "/bin/bash",
        "/bin/zsh",
        "/usr/bin/env",
    ]

    public static var failClosed: SystemExecExecutionPolicy {
        SystemExecExecutionPolicy(isEnabled: false, allowlist: [])
    }

    public let isEnabled: Bool
    public let allowlist: [SystemExecAllowlistRule]
    public let prohibitedExecutables: Set<String>

    public init(
        isEnabled: Bool,
        allowlist: [SystemExecAllowlistRule],
        prohibitedExecutables: Set<String> = SystemExecExecutionPolicy.defaultProhibitedExecutables
    ) {
        self.isEnabled = isEnabled
        self.allowlist = allowlist
        self.prohibitedExecutables = Set(
            prohibitedExecutables.compactMap(normalizeAbsolutePath)
        )
    }

    func resolveAuthorizedCommand(
        executablePath: String,
        arguments: [String],
        workingDirectory: String?
    ) throws -> SystemExecAuthorizedCommand {
        guard isEnabled else {
            throw SystemExecConnectorError.capabilityDisabled
        }

        guard let normalizedExecutablePath = normalizeAbsolutePath(executablePath) else {
            throw SystemExecConnectorError.invalidExecutablePath(executablePath)
        }

        guard !prohibitedExecutables.contains(normalizedExecutablePath) else {
            throw SystemExecConnectorError.prohibitedExecutable(normalizedExecutablePath)
        }

        guard
            let rule = allowlist.first(where: { $0.executablePath == normalizedExecutablePath })
        else {
            throw SystemExecConnectorError.commandNotAllowlisted(normalizedExecutablePath)
        }

        let normalizedArguments = try arguments.map { argument in
            guard let normalizedArgument = normalizedNonEmpty(argument) else {
                throw SystemExecConnectorError.argumentNotAllowlisted(argument)
            }
            guard rule.allowedArguments.contains(normalizedArgument) else {
                throw SystemExecConnectorError.argumentNotAllowlisted(normalizedArgument)
            }
            return normalizedArgument
        }

        let normalizedWorkingDirectory: String
        if let workingDirectory {
            guard let explicitWorkingDirectory = normalizeAbsolutePath(workingDirectory) else {
                throw SystemExecConnectorError.workingDirectoryOutOfScope(
                    expectedScope: rule.workingDirectoryScope,
                    actual: workingDirectory
                )
            }
            normalizedWorkingDirectory = explicitWorkingDirectory
        } else {
            normalizedWorkingDirectory = rule.workingDirectoryScope
        }

        guard isPath(normalizedWorkingDirectory, within: rule.workingDirectoryScope) else {
            throw SystemExecConnectorError.workingDirectoryOutOfScope(
                expectedScope: rule.workingDirectoryScope,
                actual: normalizedWorkingDirectory
            )
        }

        return SystemExecAuthorizedCommand(
            rule: rule,
            executablePath: normalizedExecutablePath,
            arguments: normalizedArguments,
            workingDirectory: normalizedWorkingDirectory
        )
    }
}

public enum SystemExecHasher {
    public static func commandSHA256(_ executablePath: String) -> String {
        sha256Hex(executablePath.trimmingCharacters(in: .whitespacesAndNewlines))
    }

    public static func argumentsSHA256(_ arguments: [String]) -> String {
        let canonical = arguments.map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
            .joined(separator: "\u{001F}")
        return sha256Hex(canonical)
    }

    private static func sha256Hex(_ value: String) -> String {
        let digest = SHA256.hash(data: Data(value.utf8))
        return digest.map { String(format: "%02x", $0) }.joined()
    }
}

public struct SystemExecApprovalBinding: Equatable {
    public let correlationID: String
    public let commandSHA256: String
    public let argumentsSHA256: String
    public let workingDirectoryScope: String

    public init(
        correlationID: String,
        commandSHA256: String,
        argumentsSHA256: String,
        workingDirectoryScope: String
    ) {
        self.correlationID = correlationID.trimmingCharacters(in: .whitespacesAndNewlines)
        self.commandSHA256 = commandSHA256.trimmingCharacters(in: .whitespacesAndNewlines)
        self.argumentsSHA256 = argumentsSHA256.trimmingCharacters(in: .whitespacesAndNewlines)
        self.workingDirectoryScope = normalizeAbsolutePath(workingDirectoryScope)
            ?? workingDirectoryScope.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    public static func make(
        correlationID: String,
        executablePath: String,
        arguments: [String],
        workingDirectoryScope: String
    ) -> SystemExecApprovalBinding {
        SystemExecApprovalBinding(
            correlationID: correlationID,
            commandSHA256: SystemExecHasher.commandSHA256(executablePath),
            argumentsSHA256: SystemExecHasher.argumentsSHA256(arguments),
            workingDirectoryScope: workingDirectoryScope
        )
    }
}

public struct SystemExecApprovalArtifact: Equatable {
    public static let requiredTokenClass = "approval.action"

    public let approval: ApprovalArtifact
    public let binding: SystemExecApprovalBinding

    public init(approval: ApprovalArtifact, binding: SystemExecApprovalBinding) {
        self.approval = approval
        self.binding = binding
    }

    public static func makeBoundApproval(
        id: String,
        issuedAt: Date,
        correlationID: String,
        executablePath: String,
        arguments: [String],
        workingDirectoryScope: String
    ) -> SystemExecApprovalArtifact {
        SystemExecApprovalArtifact(
            approval: ApprovalArtifact(
                id: id,
                tokenClass: requiredTokenClass,
                issuedAt: issuedAt
            ),
            binding: SystemExecApprovalBinding.make(
                correlationID: correlationID,
                executablePath: executablePath,
                arguments: arguments,
                workingDirectoryScope: workingDirectoryScope
            )
        )
    }
}

func validateSystemExecApproval(
    _ artifact: SystemExecApprovalArtifact?,
    correlationID: String,
    executablePath: String,
    arguments: [String],
    workingDirectory: String,
    requiredScope: String
) throws -> ApprovalArtifact {
    guard let artifact else {
        throw SystemExecConnectorError.approvalRequired
    }

    let approvalID = artifact.approval.id.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !approvalID.isEmpty else {
        throw SystemExecConnectorError.invalidApprovalArtifactID
    }

    guard artifact.approval.tokenClass == SystemExecApprovalArtifact.requiredTokenClass else {
        throw SystemExecConnectorError.invalidApprovalTokenClass(
            expected: SystemExecApprovalArtifact.requiredTokenClass,
            actual: artifact.approval.tokenClass
        )
    }

    let expectedCorrelationID = correlationID.trimmingCharacters(in: .whitespacesAndNewlines)
    let actualCorrelationID = artifact.binding.correlationID
    guard actualCorrelationID == expectedCorrelationID else {
        throw SystemExecConnectorError.approvalCorrelationMismatch(
            expected: expectedCorrelationID,
            actual: actualCorrelationID
        )
    }

    let expectedCommandHash = SystemExecHasher.commandSHA256(executablePath)
    guard artifact.binding.commandSHA256 == expectedCommandHash else {
        throw SystemExecConnectorError.approvalCommandHashMismatch(
            expected: expectedCommandHash,
            actual: artifact.binding.commandSHA256
        )
    }

    let expectedArgumentsHash = SystemExecHasher.argumentsSHA256(arguments)
    guard artifact.binding.argumentsSHA256 == expectedArgumentsHash else {
        throw SystemExecConnectorError.approvalArgumentsHashMismatch(
            expected: expectedArgumentsHash,
            actual: artifact.binding.argumentsSHA256
        )
    }

    let normalizedRequiredScope = normalizeAbsolutePath(requiredScope)
        ?? requiredScope.trimmingCharacters(in: .whitespacesAndNewlines)
    let normalizedArtifactScope = normalizeAbsolutePath(artifact.binding.workingDirectoryScope)
        ?? artifact.binding.workingDirectoryScope.trimmingCharacters(in: .whitespacesAndNewlines)
    guard normalizedArtifactScope == normalizedRequiredScope else {
        throw SystemExecConnectorError.approvalScopeMismatch(
            expected: normalizedRequiredScope,
            actual: normalizedArtifactScope
        )
    }

    guard isPath(workingDirectory, within: normalizedArtifactScope) else {
        throw SystemExecConnectorError.approvalScopeMismatch(
            expected: normalizedArtifactScope,
            actual: workingDirectory
        )
    }

    return artifact.approval
}

struct SystemExecAuthorizedCommand: Equatable {
    let rule: SystemExecAllowlistRule
    let executablePath: String
    let arguments: [String]
    let workingDirectory: String
}

func normalizedNonEmpty(_ value: String) -> String? {
    let normalized = value.trimmingCharacters(in: .whitespacesAndNewlines)
    return normalized.isEmpty ? nil : normalized
}

func normalizeAbsolutePath(_ path: String) -> String? {
    guard let normalized = normalizedNonEmpty(path) else {
        return nil
    }

    let expanded = NSString(string: normalized).expandingTildeInPath
    let standardized = NSString(string: expanded).standardizingPath
    guard standardized.hasPrefix("/") else {
        return nil
    }
    return standardized
}

func isPath(_ path: String, within scope: String) -> Bool {
    let normalizedPath = NSString(string: path).standardizingPath
    let normalizedScope = NSString(string: scope).standardizingPath
    if normalizedPath == normalizedScope {
        return true
    }
    let scopeWithSeparator = normalizedScope.hasSuffix("/")
        ? normalizedScope
        : normalizedScope + "/"
    return normalizedPath.hasPrefix(scopeWithSeparator)
}
