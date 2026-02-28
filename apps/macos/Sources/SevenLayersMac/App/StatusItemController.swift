import AppKit

@MainActor
public final class StatusItemController: NSObject {
    private let popoverHost: PopoverHostController
    private let badgeFormatter: StatusItemBadgeFormatter

    private var statusItem: NSStatusItem?
    private var pendingApprovalsCount = 0

    public private(set) var shellState = MenuBarShellState()

    public init(
        popoverHost: PopoverHostController,
        badgeFormatter: StatusItemBadgeFormatter = StatusItemBadgeFormatter()
    ) {
        self.popoverHost = popoverHost
        self.badgeFormatter = badgeFormatter
        super.init()
    }

    public func install() {
        let item = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)
        item.button?.target = self
        item.button?.action = #selector(togglePopoverFromMenuBar)
        statusItem = item
        applyStatusItemTitle()
    }

    public func updatePendingApprovals(_ count: Int) {
        pendingApprovalsCount = max(0, count)
        applyStatusItemTitle()
    }

    public func togglePopoverFromHotkey() {
        togglePopover()
    }

    @objc
    private func togglePopoverFromMenuBar() {
        togglePopover()
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

    private func applyStatusItemTitle() {
        statusItem?.button?.title = badgeFormatter.title(pendingApprovals: pendingApprovalsCount)
    }
}
