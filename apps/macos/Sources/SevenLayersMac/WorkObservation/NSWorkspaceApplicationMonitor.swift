import AppKit
import Foundation

public protocol WorkActivityMonitoring: AnyObject {
    func start(onEvent: @escaping @Sendable (WorkObservationEvent) -> Void)
    func stop()
}

public final class NSWorkspaceApplicationMonitor: WorkActivityMonitoring {
    private let workspace: NSWorkspace
    private let notificationCenter: NotificationCenter
    private let now: @Sendable () -> Date

    private var activationObserver: NSObjectProtocol?

    public init(
        workspace: NSWorkspace = .shared,
        notificationCenter: NotificationCenter = NSWorkspace.shared.notificationCenter,
        now: @escaping @Sendable () -> Date = Date.init
    ) {
        self.workspace = workspace
        self.notificationCenter = notificationCenter
        self.now = now
    }

    deinit {
        stop()
    }

    public func start(onEvent: @escaping @Sendable (WorkObservationEvent) -> Void) {
        guard activationObserver == nil else {
            return
        }

        activationObserver = notificationCenter.addObserver(
            forName: NSWorkspace.didActivateApplicationNotification,
            object: workspace,
            queue: .main
        ) { [now] notification in
            guard
                let runningApplication = notification.userInfo?[NSWorkspace.applicationUserInfoKey]
                    as? NSRunningApplication
            else {
                return
            }

            let appName = (runningApplication.localizedName ?? "")
                .trimmingCharacters(in: .whitespacesAndNewlines)
            let bundleIdentifier = runningApplication.bundleIdentifier?
                .trimmingCharacters(in: .whitespacesAndNewlines)

            let resolvedName: String
            if !appName.isEmpty {
                resolvedName = appName
            } else if let bundleIdentifier, !bundleIdentifier.isEmpty {
                resolvedName = bundleIdentifier
            } else {
                return
            }

            onEvent(
                WorkObservationEvent(
                    observedAt: now(),
                    applicationName: resolvedName,
                    bundleIdentifier: bundleIdentifier
                )
            )
        }
    }

    public func stop() {
        guard let activationObserver else {
            return
        }

        notificationCenter.removeObserver(activationObserver)
        self.activationObserver = nil
    }
}
