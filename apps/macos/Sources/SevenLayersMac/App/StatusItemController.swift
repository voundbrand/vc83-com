import AppKit

@MainActor
public final class StatusItemController: NSObject {
    private let popoverHost: PopoverHostController
    private let badgeFormatter: StatusItemBadgeFormatter
    private let authStateProvider: (any DesktopAuthStateProviding)?
    private let onSignIn: (() -> Void)?
    private let onSignOut: (() -> Void)?
    private let onQuit: () -> Void
    private let onPrimaryAction: () -> Void

    private var statusItem: NSStatusItem?
    private var statusMenu: NSMenu?
    private var pendingApprovalsCount = 0

    public private(set) var shellState = MenuBarShellState()

    public init(
        popoverHost: PopoverHostController,
        badgeFormatter: StatusItemBadgeFormatter = StatusItemBadgeFormatter(),
        authStateProvider: (any DesktopAuthStateProviding)? = nil,
        onSignIn: (() -> Void)? = nil,
        onSignOut: (() -> Void)? = nil,
        onPrimaryAction: @escaping () -> Void,
        onQuit: @escaping () -> Void
    ) {
        self.popoverHost = popoverHost
        self.badgeFormatter = badgeFormatter
        self.authStateProvider = authStateProvider
        self.onSignIn = onSignIn
        self.onSignOut = onSignOut
        self.onPrimaryAction = onPrimaryAction
        self.onQuit = onQuit
        super.init()
    }

    public func install() {
        let item = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)
        item.button?.target = self
        item.button?.action = #selector(togglePopoverFromMenuBar)
        item.button?.sendAction(on: [.leftMouseUp, .rightMouseUp])
        statusItem = item
        statusMenu = buildStatusMenu()
        applyStatusItemAppearance()
    }

    public func updatePendingApprovals(_ count: Int) {
        pendingApprovalsCount = max(0, count)
        applyStatusItemAppearance()
    }

    public func togglePopoverFromHotkey() {
        togglePopover()
    }

    @objc
    private func togglePopoverFromMenuBar() {
        guard let button = statusItem?.button else {
            return
        }

        if NSApp.currentEvent?.type == .rightMouseUp {
            showStatusMenu(from: button)
            return
        }

        onPrimaryAction()
    }

    private func showStatusMenu(from button: NSStatusBarButton) {
        statusMenu = buildStatusMenu()
        guard let statusMenu else {
            return
        }

        popoverHost.close()
        shellState.markPopoverHidden()
        button.highlight(true)
        statusItem?.menu = statusMenu
        button.performClick(nil)
        statusItem?.menu = nil
        button.highlight(false)
    }

    private func buildStatusMenu() -> NSMenu {
        let menu = NSMenu()
        if let authStateProvider {
            let isAuthenticated = authStateProvider.isAuthenticated
            let authItem = NSMenuItem(
                title: isAuthenticated ? "Sign Out" : "Sign In",
                action: #selector(runAuthActionFromMenu),
                keyEquivalent: ""
            )
            authItem.isEnabled = isAuthenticated ? (onSignOut != nil) : (onSignIn != nil)
            menu.addItem(authItem)
            menu.addItem(.separator())
        }
        menu.addItem(
            NSMenuItem(
                title: "Open SevenLayers",
                action: #selector(openFromMenu),
                keyEquivalent: ""
            )
        )
        menu.addItem(.separator())
        menu.addItem(
            NSMenuItem(
                title: "Quit SevenLayers",
                action: #selector(quitFromMenu),
                keyEquivalent: "q"
            )
        )
        menu.items.forEach { $0.target = self }
        return menu
    }

    @objc
    private func openFromMenu() {
        onPrimaryAction()
    }

    @objc
    private func runAuthActionFromMenu() {
        if authStateProvider?.isAuthenticated == true {
            onSignOut?()
        } else {
            onSignIn?()
        }
    }

    @objc
    private func quitFromMenu() {
        onQuit()
    }

    private func togglePopover() {
        guard let button = statusItem?.button else {
            return
        }

        if popoverHost.isShown {
            popoverHost.close()
        } else {
            popoverHost.show(relativeTo: button)
        }

        shellState.togglePopoverVisibility()
    }

    private func applyStatusItemAppearance() {
        guard let button = statusItem?.button else {
            return
        }

        if let statusIcon = makeStatusIcon() {
            button.image = statusIcon
            button.imagePosition = .imageOnly
            button.title = ""
        } else {
            button.image = nil
            button.title = badgeFormatter.title(pendingApprovals: pendingApprovalsCount)
        }

        button.toolTip = pendingApprovalsCount > 0
            ? "SevenLayers (\(pendingApprovalsCount) pending approvals)"
            : "SevenLayers"
    }

    private func makeStatusIcon() -> NSImage? {
        let iconCandidates = [
            "MenuBarIconWhite",
            "MenuBarIcon",
        ]

        for iconName in iconCandidates {
            guard let iconURL = Bundle.module.url(forResource: iconName, withExtension: "png"),
                  let image = NSImage(contentsOf: iconURL) else {
                continue
            }
            image.size = NSSize(width: 18, height: 18)
            image.isTemplate = true
            return image
        }

        return nil
    }
}
