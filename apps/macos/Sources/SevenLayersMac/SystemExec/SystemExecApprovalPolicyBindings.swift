import Foundation
import SevenLayersProtocol

public struct SystemExecDenyPolicyKey: Equatable, Hashable {
    public let commandSHA256: String
    public let argumentsSHA256: String
    public let workingDirectoryScope: String

    public init(
        commandSHA256: String,
        argumentsSHA256: String,
        workingDirectoryScope: String
    ) {
        self.commandSHA256 = commandSHA256.trimmingCharacters(in: .whitespacesAndNewlines)
        self.argumentsSHA256 = argumentsSHA256.trimmingCharacters(in: .whitespacesAndNewlines)
        self.workingDirectoryScope = normalizeAbsolutePath(workingDirectoryScope)
            ?? workingDirectoryScope.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    public static func make(
        executablePath: String,
        arguments: [String],
        workingDirectoryScope: String
    ) -> SystemExecDenyPolicyKey {
        SystemExecDenyPolicyKey(
            commandSHA256: SystemExecHasher.commandSHA256(executablePath),
            argumentsSHA256: SystemExecHasher.argumentsSHA256(arguments),
            workingDirectoryScope: workingDirectoryScope
        )
    }

    fileprivate var storageKey: String {
        [commandSHA256, argumentsSHA256, workingDirectoryScope].joined(separator: "|")
    }
}

public protocol SystemExecDenyPolicyStoring {
    func hasPersistedDeny(_ key: SystemExecDenyPolicyKey) -> Bool
    func persistDeny(_ key: SystemExecDenyPolicyKey)
    func clearPersistedDeny(_ key: SystemExecDenyPolicyKey)
}

public struct NoopSystemExecDenyPolicyStore: SystemExecDenyPolicyStoring {
    public init() {}

    public func hasPersistedDeny(_ key: SystemExecDenyPolicyKey) -> Bool {
        false
    }

    public func persistDeny(_ key: SystemExecDenyPolicyKey) {}

    public func clearPersistedDeny(_ key: SystemExecDenyPolicyKey) {}
}

public final class InMemorySystemExecDenyPolicyStore: SystemExecDenyPolicyStoring {
    private var deniedKeys: Set<SystemExecDenyPolicyKey>

    public init(deniedKeys: Set<SystemExecDenyPolicyKey> = []) {
        self.deniedKeys = deniedKeys
    }

    public func hasPersistedDeny(_ key: SystemExecDenyPolicyKey) -> Bool {
        deniedKeys.contains(key)
    }

    public func persistDeny(_ key: SystemExecDenyPolicyKey) {
        deniedKeys.insert(key)
    }

    public func clearPersistedDeny(_ key: SystemExecDenyPolicyKey) {
        deniedKeys.remove(key)
    }
}

public final class UserDefaultsSystemExecDenyPolicyStore: SystemExecDenyPolicyStoring {
    private let defaults: UserDefaults
    private let defaultsKey: String

    public init(
        defaults: UserDefaults = .standard,
        defaultsKey: String = "sevenlayers.macos.systemExec.persistedDenies.v1"
    ) {
        self.defaults = defaults
        self.defaultsKey = defaultsKey
    }

    public func hasPersistedDeny(_ key: SystemExecDenyPolicyKey) -> Bool {
        persistedStorage().contains(key.storageKey)
    }

    public func persistDeny(_ key: SystemExecDenyPolicyKey) {
        var storage = persistedStorage()
        storage.insert(key.storageKey)
        defaults.set(Array(storage).sorted(), forKey: defaultsKey)
    }

    public func clearPersistedDeny(_ key: SystemExecDenyPolicyKey) {
        var storage = persistedStorage()
        storage.remove(key.storageKey)
        defaults.set(Array(storage).sorted(), forKey: defaultsKey)
    }

    private func persistedStorage() -> Set<String> {
        let values = defaults.stringArray(forKey: defaultsKey) ?? []
        return Set(values.compactMap(normalizedNonEmpty))
    }
}

public enum SystemExecApprovalPromptPolicyOutcome: String, Equatable {
    case ready
    case deniedByDefault
    case deniedPersisted
}

public struct SystemExecApprovalPromptContract: Equatable {
    public static let contractVersion = "system_exec_approval_prompt_v1"

    public let contractVersion: String
    public let liveSessionID: String
    public let correlationID: String
    public let executablePath: String
    public let arguments: [String]
    public let commandSHA256: String
    public let argumentsSHA256: String
    public let requestedWorkingDirectory: String?
    public let requiredWorkingDirectoryScope: String?
    public let requiredApprovalTokenClass: String
    public let mutationAuthority: MutationAuthority
    public let policyOutcome: SystemExecApprovalPromptPolicyOutcome
    public let policyReason: String?

    public init(
        liveSessionID: String,
        correlationID: String,
        executablePath: String,
        arguments: [String],
        commandSHA256: String,
        argumentsSHA256: String,
        requestedWorkingDirectory: String?,
        requiredWorkingDirectoryScope: String?,
        requiredApprovalTokenClass: String = SystemExecApprovalArtifact.requiredTokenClass,
        mutationAuthority: MutationAuthority = .vc83Backend,
        policyOutcome: SystemExecApprovalPromptPolicyOutcome,
        policyReason: String?
    ) {
        contractVersion = Self.contractVersion
        self.liveSessionID = liveSessionID
        self.correlationID = correlationID
        self.executablePath = executablePath
        self.arguments = arguments
        self.commandSHA256 = commandSHA256
        self.argumentsSHA256 = argumentsSHA256
        self.requestedWorkingDirectory = requestedWorkingDirectory
        self.requiredWorkingDirectoryScope = requiredWorkingDirectoryScope
        self.requiredApprovalTokenClass = requiredApprovalTokenClass
        self.mutationAuthority = mutationAuthority
        self.policyOutcome = policyOutcome
        self.policyReason = policyReason
    }
}

extension SystemExecConnectorError {
    func shouldPersistDenyDecision() -> Bool {
        switch self {
        case .invalidExecutablePath,
             .prohibitedExecutable,
             .commandNotAllowlisted,
             .argumentNotAllowlisted,
             .workingDirectoryOutOfScope:
            return true

        default:
            return false
        }
    }

    func promptPolicyReason() -> String {
        switch self {
        case .missingLiveSessionID:
            return "missing_live_session_id"
        case .missingCorrelationID:
            return "missing_correlation_id"
        case .capabilityDisabled:
            return "capability_disabled"
        case .invalidExecutablePath:
            return "invalid_executable_path"
        case .prohibitedExecutable:
            return "prohibited_executable"
        case .commandNotAllowlisted:
            return "command_not_allowlisted"
        case .argumentNotAllowlisted:
            return "argument_not_allowlisted"
        case .workingDirectoryOutOfScope:
            return "working_directory_out_of_scope"
        case .approvalRequired:
            return "approval_required"
        case .invalidApprovalArtifactID:
            return "invalid_approval_artifact_id"
        case .invalidApprovalTokenClass:
            return "invalid_approval_token_class"
        case .approvalCorrelationMismatch:
            return "approval_correlation_mismatch"
        case .approvalCommandHashMismatch:
            return "approval_command_hash_mismatch"
        case .approvalArgumentsHashMismatch:
            return "approval_arguments_hash_mismatch"
        case .approvalScopeMismatch:
            return "approval_scope_mismatch"
        case .persistedPolicyDeny:
            return "persisted_policy_deny"
        case .commandTimedOut:
            return "command_timed_out"
        case .processFailed:
            return "process_failed"
        case .runnerFailed:
            return "runner_failed"
        case .auditReportFailed:
            return "audit_report_failed"
        case .cleanupFailed:
            return "cleanup_failed"
        }
    }
}
