import Darwin
import Foundation

public enum LaunchAgentLifecycleError: Error, Equatable {
    case missingLabel
    case missingExecutablePath
    case unmanagedExistingPlist(path: String)
}

public enum LaunchAgentDesiredState: Equatable {
    case enabled
    case disabled
}

public struct LaunchAgentRuntimeState: Equatable {
    public let isLoaded: Bool
    public let isDisabled: Bool

    public init(isLoaded: Bool, isDisabled: Bool) {
        self.isLoaded = isLoaded
        self.isDisabled = isDisabled
    }

    public var isEnabled: Bool {
        !isDisabled
    }
}

public struct LaunchAgentStateSnapshot: Equatable {
    public let plistPath: String
    public let plistExists: Bool
    public let plistManagedBySevenLayers: Bool
    public let runtimeState: LaunchAgentRuntimeState

    public init(
        plistPath: String,
        plistExists: Bool,
        plistManagedBySevenLayers: Bool,
        runtimeState: LaunchAgentRuntimeState
    ) {
        self.plistPath = plistPath
        self.plistExists = plistExists
        self.plistManagedBySevenLayers = plistManagedBySevenLayers
        self.runtimeState = runtimeState
    }
}

public enum LaunchAgentLifecycleAction: Equatable {
    case installPlist(path: String)
    case updatePlist(path: String)
    case bootstrap(service: String)
    case enable(service: String)
    case kickstart(service: String)
    case disable(service: String)
    case bootout(service: String)
    case removePlist(path: String)
    case noOp(reason: String)
}

public struct LaunchAgentLifecycleReport: Equatable {
    public let before: LaunchAgentStateSnapshot
    public let after: LaunchAgentStateSnapshot
    public let actions: [LaunchAgentLifecycleAction]

    public init(
        before: LaunchAgentStateSnapshot,
        after: LaunchAgentStateSnapshot,
        actions: [LaunchAgentLifecycleAction]
    ) {
        self.before = before
        self.after = after
        self.actions = actions
    }
}

public struct LaunchAgentReconcileReport: Equatable {
    public let desiredState: LaunchAgentDesiredState
    public let before: LaunchAgentStateSnapshot
    public let after: LaunchAgentStateSnapshot
    public let actions: [LaunchAgentLifecycleAction]

    public init(
        desiredState: LaunchAgentDesiredState,
        before: LaunchAgentStateSnapshot,
        after: LaunchAgentStateSnapshot,
        actions: [LaunchAgentLifecycleAction]
    ) {
        self.desiredState = desiredState
        self.before = before
        self.after = after
        self.actions = actions
    }
}

public struct LaunchAgentConfiguration: Equatable {
    public let label: String
    public let executablePath: String
    public let additionalArguments: [String]
    public let environment: [String: String]
    public let launchAgentsDirectory: String
    public let standardOutLogPath: String
    public let standardErrorLogPath: String
    public let reconnectThrottleIntervalSeconds: Int
    public let runAtLoad: Bool
    public let keepAliveOnNetworkState: Bool
    public let restartOnUncleanExit: Bool
    public let userID: uid_t

    public init(
        label: String = "com.vc83.sevenlayers.macos.companion",
        executablePath: String,
        additionalArguments: [String] = ["--background-reconnect"],
        environment: [String: String] = ["SEVENLAYERS_BACKGROUND_RECONNECT": "1"],
        launchAgentsDirectory: String = "~/Library/LaunchAgents",
        standardOutLogPath: String = "~/Library/Logs/SevenLayers/companion.stdout.log",
        standardErrorLogPath: String = "~/Library/Logs/SevenLayers/companion.stderr.log",
        reconnectThrottleIntervalSeconds: Int = 15,
        runAtLoad: Bool = true,
        keepAliveOnNetworkState: Bool = true,
        restartOnUncleanExit: Bool = true,
        userID: uid_t = getuid()
    ) {
        self.label = label.trimmingCharacters(in: .whitespacesAndNewlines)
        self.executablePath = executablePath.trimmingCharacters(in: .whitespacesAndNewlines)
        self.additionalArguments = additionalArguments
        self.environment = environment
        self.launchAgentsDirectory = launchAgentsDirectory
        self.standardOutLogPath = standardOutLogPath
        self.standardErrorLogPath = standardErrorLogPath
        self.reconnectThrottleIntervalSeconds = max(1, reconnectThrottleIntervalSeconds)
        self.runAtLoad = runAtLoad
        self.keepAliveOnNetworkState = keepAliveOnNetworkState
        self.restartOnUncleanExit = restartOnUncleanExit
        self.userID = userID
    }

    public var launchCtlDomainTarget: String {
        "gui/\(userID)"
    }

    public var launchCtlServiceTarget: String {
        "\(launchCtlDomainTarget)/\(label)"
    }

    public var resolvedLaunchAgentsDirectory: String {
        (launchAgentsDirectory as NSString).expandingTildeInPath
    }

    public var resolvedStandardOutLogPath: String {
        (standardOutLogPath as NSString).expandingTildeInPath
    }

    public var resolvedStandardErrorLogPath: String {
        (standardErrorLogPath as NSString).expandingTildeInPath
    }

    public var plistPath: String {
        NSString(string: resolvedLaunchAgentsDirectory)
            .appendingPathComponent("\(label).plist")
    }

    public var programArguments: [String] {
        [executablePath] + additionalArguments
    }
}
