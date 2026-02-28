import Foundation

public final class LaunchAgentLifecycleManager {
    private let fileManager: FileManager
    private let launchCtl: any LaunchCtlControlling
    private let plistRenderer: LaunchAgentPlistRenderer

    public init(
        fileManager: FileManager = .default,
        launchCtl: any LaunchCtlControlling = SystemLaunchCtlClient(),
        plistRenderer: LaunchAgentPlistRenderer = LaunchAgentPlistRenderer()
    ) {
        self.fileManager = fileManager
        self.launchCtl = launchCtl
        self.plistRenderer = plistRenderer
    }

    public func snapshot(for configuration: LaunchAgentConfiguration) throws -> LaunchAgentStateSnapshot {
        let plistPath = configuration.plistPath
        let plistExists = fileManager.fileExists(atPath: plistPath)

        let managedBySevenLayers: Bool
        if plistExists {
            let contents = try String(contentsOfFile: plistPath, encoding: .utf8)
            managedBySevenLayers = plistRenderer.isManagedPlist(contents: contents)
        } else {
            managedBySevenLayers = false
        }

        let runtimeState = try launchCtl.runtimeState(
            domainTarget: configuration.launchCtlDomainTarget,
            label: configuration.label
        )

        return LaunchAgentStateSnapshot(
            plistPath: plistPath,
            plistExists: plistExists,
            plistManagedBySevenLayers: managedBySevenLayers,
            runtimeState: runtimeState
        )
    }

    public func install(
        configuration: LaunchAgentConfiguration
    ) throws -> LaunchAgentLifecycleReport {
        let before = try snapshot(for: configuration)
        let plistPath = configuration.plistPath

        if before.plistExists && !before.plistManagedBySevenLayers {
            throw LaunchAgentLifecycleError.unmanagedExistingPlist(path: plistPath)
        }

        let renderedPlist = try plistRenderer.render(configuration: configuration)
        var actions: [LaunchAgentLifecycleAction] = []

        if before.plistExists {
            let existing = try String(contentsOfFile: plistPath, encoding: .utf8)
            if existing == renderedPlist {
                actions.append(.noOp(reason: "launch-agent-plist-unchanged"))
            } else {
                try writePlist(renderedPlist, to: plistPath, directory: configuration.resolvedLaunchAgentsDirectory)
                actions.append(.updatePlist(path: plistPath))
            }
        } else {
            try writePlist(renderedPlist, to: plistPath, directory: configuration.resolvedLaunchAgentsDirectory)
            actions.append(.installPlist(path: plistPath))
        }

        let after = try snapshot(for: configuration)
        return LaunchAgentLifecycleReport(before: before, after: after, actions: actions)
    }

    public func enable(
        configuration: LaunchAgentConfiguration
    ) throws -> LaunchAgentLifecycleReport {
        let installReport = try install(configuration: configuration)
        var actions = installReport.actions
        var current = installReport.after
        let serviceTarget = configuration.launchCtlServiceTarget

        if plistWriteOccurred(actions), current.runtimeState.isLoaded {
            try launchCtl.bootout(
                domainTarget: configuration.launchCtlDomainTarget,
                label: configuration.label
            )
            actions.append(.bootout(service: serviceTarget))
            current = try snapshot(for: configuration)
        }

        if !current.runtimeState.isLoaded {
            try launchCtl.bootstrap(
                domainTarget: configuration.launchCtlDomainTarget,
                label: configuration.label,
                plistPath: configuration.plistPath
            )
            actions.append(.bootstrap(service: serviceTarget))
            current = try snapshot(for: configuration)
        }

        if current.runtimeState.isDisabled {
            try launchCtl.enable(
                domainTarget: configuration.launchCtlDomainTarget,
                label: configuration.label
            )
            actions.append(.enable(service: serviceTarget))
            current = try snapshot(for: configuration)
        }

        try launchCtl.kickstart(
            domainTarget: configuration.launchCtlDomainTarget,
            label: configuration.label
        )
        actions.append(.kickstart(service: serviceTarget))

        let after = try snapshot(for: configuration)
        return LaunchAgentLifecycleReport(
            before: installReport.before,
            after: after,
            actions: actions
        )
    }

    public func disable(
        configuration: LaunchAgentConfiguration
    ) throws -> LaunchAgentLifecycleReport {
        let before = try snapshot(for: configuration)
        let plistPath = configuration.plistPath

        if before.plistExists && !before.plistManagedBySevenLayers {
            throw LaunchAgentLifecycleError.unmanagedExistingPlist(path: plistPath)
        }

        var actions: [LaunchAgentLifecycleAction] = []
        let serviceTarget = configuration.launchCtlServiceTarget
        let shouldControlRuntime = before.runtimeState.isLoaded || before.plistExists

        if shouldControlRuntime && !before.runtimeState.isDisabled {
            try launchCtl.disable(
                domainTarget: configuration.launchCtlDomainTarget,
                label: configuration.label
            )
            actions.append(.disable(service: serviceTarget))
        }

        if before.runtimeState.isLoaded {
            try launchCtl.bootout(
                domainTarget: configuration.launchCtlDomainTarget,
                label: configuration.label
            )
            actions.append(.bootout(service: serviceTarget))
        }

        if before.plistExists {
            try fileManager.removeItem(atPath: plistPath)
            actions.append(.removePlist(path: plistPath))
        } else {
            actions.append(.noOp(reason: "launch-agent-plist-absent"))
        }

        let after = try snapshot(for: configuration)
        return LaunchAgentLifecycleReport(before: before, after: after, actions: actions)
    }

    public func reconcile(
        configuration: LaunchAgentConfiguration,
        desiredState: LaunchAgentDesiredState
    ) throws -> LaunchAgentReconcileReport {
        let before = try snapshot(for: configuration)

        let report: LaunchAgentLifecycleReport
        switch desiredState {
        case .enabled:
            report = try enable(configuration: configuration)
        case .disabled:
            report = try disable(configuration: configuration)
        }

        return LaunchAgentReconcileReport(
            desiredState: desiredState,
            before: before,
            after: report.after,
            actions: report.actions
        )
    }

    private func writePlist(_ contents: String, to path: String, directory: String) throws {
        try ensureDirectoryExists(directory)
        try contents.write(toFile: path, atomically: true, encoding: .utf8)
        try fileManager.setAttributes(
            [.posixPermissions: NSNumber(value: Int16(0o600))],
            ofItemAtPath: path
        )
    }

    private func ensureDirectoryExists(_ path: String) throws {
        var isDirectory: ObjCBool = false
        if fileManager.fileExists(atPath: path, isDirectory: &isDirectory) {
            guard isDirectory.boolValue else {
                throw CocoaError(.fileWriteFileExists)
            }
            return
        }

        try fileManager.createDirectory(
            atPath: path,
            withIntermediateDirectories: true
        )
    }

    private func plistWriteOccurred(_ actions: [LaunchAgentLifecycleAction]) -> Bool {
        actions.contains {
            switch $0 {
            case .installPlist, .updatePlist:
                return true
            default:
                return false
            }
        }
    }
}
