import AppKit
import Foundation

@MainActor
public final class PopoverHostController {
    public let popover: NSPopover

    public var isShown: Bool {
        popover.isShown
    }

    public init(
        quickChatSession: QuickChatSessionController,
        dashboardOpener: DashboardDeepLinkOpening,
        chatWindowOpener: NativeChatWindowOpening
    ) {
        self.popover = NSPopover()

        popover.behavior = .transient
        popover.contentSize = NSSize(width: 380, height: 300)
        popover.contentViewController = QuickChatPopoverViewController(
            quickChatSession: quickChatSession,
            dashboardOpener: dashboardOpener,
            chatWindowOpener: chatWindowOpener
        )
    }

    public func show(relativeTo button: NSStatusBarButton) {
        popover.show(relativeTo: button.bounds, of: button, preferredEdge: .minY)
    }

    public func close() {
        popover.performClose(nil)
    }
}

@MainActor
private final class QuickChatPopoverViewController: NSViewController {
    private let quickChatSession: QuickChatSessionController
    private let dashboardOpener: DashboardDeepLinkOpening
    private let chatWindowOpener: NativeChatWindowOpening

    private let titleLabel = NSTextField(labelWithString: "Quick Chat")
    private let subtitleLabel = NSTextField(labelWithString: "Ingress/control surface only. Backend remains mutation authority.")
    private let pendingLabel = NSTextField(labelWithString: "Pending approvals: 0")
    private let draftField = NSTextField(string: "")
    private let sendContextButton = NSButton(title: "Send Context", target: nil, action: nil)
    private let openNativeChatButton = NSButton(title: "Open Native Chat", target: nil, action: nil)
    private let openDashboardButton = NSButton(title: "Open Dashboard", target: nil, action: nil)
    private let incrementApprovalButton = NSButton(title: "+ Approval", target: nil, action: nil)
    private let clearApprovalsButton = NSButton(title: "Clear", target: nil, action: nil)
    private let statusLabel = NSTextField(labelWithString: "Ready")

    init(
        quickChatSession: QuickChatSessionController,
        dashboardOpener: DashboardDeepLinkOpening,
        chatWindowOpener: NativeChatWindowOpening
    ) {
        self.quickChatSession = quickChatSession
        self.dashboardOpener = dashboardOpener
        self.chatWindowOpener = chatWindowOpener
        super.init(nibName: nil, bundle: nil)
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) {
        fatalError("init(coder:) is not supported")
    }

    override func loadView() {
        let root = NSView(frame: NSRect(x: 0, y: 0, width: 380, height: 300))

        titleLabel.font = NSFont.systemFont(ofSize: 16, weight: .semibold)
        titleLabel.frame = NSRect(x: 18, y: 264, width: 150, height: 22)

        subtitleLabel.textColor = .secondaryLabelColor
        subtitleLabel.maximumNumberOfLines = 2
        subtitleLabel.lineBreakMode = .byWordWrapping
        subtitleLabel.frame = NSRect(x: 18, y: 220, width: 344, height: 36)

        pendingLabel.font = NSFont.monospacedDigitSystemFont(ofSize: 12, weight: .medium)
        pendingLabel.frame = NSRect(x: 18, y: 193, width: 170, height: 20)

        incrementApprovalButton.frame = NSRect(x: 195, y: 188, width: 82, height: 26)
        clearApprovalsButton.frame = NSRect(x: 282, y: 188, width: 80, height: 26)

        draftField.placeholderString = "Type quick operator context"
        draftField.frame = NSRect(x: 18, y: 152, width: 344, height: 28)

        sendContextButton.frame = NSRect(x: 18, y: 116, width: 164, height: 28)
        openDashboardButton.frame = NSRect(x: 198, y: 116, width: 164, height: 28)
        openNativeChatButton.frame = NSRect(x: 18, y: 82, width: 344, height: 28)

        statusLabel.maximumNumberOfLines = 3
        statusLabel.lineBreakMode = .byWordWrapping
        statusLabel.textColor = .secondaryLabelColor
        statusLabel.frame = NSRect(x: 18, y: 18, width: 344, height: 56)

        root.addSubview(titleLabel)
        root.addSubview(subtitleLabel)
        root.addSubview(pendingLabel)
        root.addSubview(incrementApprovalButton)
        root.addSubview(clearApprovalsButton)
        root.addSubview(draftField)
        root.addSubview(sendContextButton)
        root.addSubview(openDashboardButton)
        root.addSubview(openNativeChatButton)
        root.addSubview(statusLabel)

        view = root

        wireActions()
    }

    private func wireActions() {
        sendContextButton.target = self
        sendContextButton.action = #selector(sendContextDraft)

        openDashboardButton.target = self
        openDashboardButton.action = #selector(openDashboard)

        openNativeChatButton.target = self
        openNativeChatButton.action = #selector(openNativeChat)

        incrementApprovalButton.target = self
        incrementApprovalButton.action = #selector(incrementPendingApprovals)

        clearApprovalsButton.target = self
        clearApprovalsButton.action = #selector(clearPendingApprovals)
        updatePendingLabel(count: quickChatSession.pendingApprovalsCount)
    }

    @objc
    private func sendContextDraft() {
        guard let submission = quickChatSession.submitContextDraft(draftField.stringValue) else {
            statusLabel.stringValue = "Enter context before sending."
            return
        }

        draftField.stringValue = ""
        let shortCorrelation = String(submission.correlationID.prefix(8))
        statusLabel.stringValue = "Sent read-only context (`\(submission.schemaVersion)`) as corr \(shortCorrelation)."
    }

    @objc
    private func openDashboard() {
        let opened = dashboardOpener.openDashboard()
        statusLabel.stringValue = opened
            ? "Opened dashboard: \(dashboardOpener.dashboardURL.absoluteString)"
            : "Unable to open dashboard URL."
    }

    @objc
    private func openNativeChat() {
        chatWindowOpener.openNativeChatWindow()
        statusLabel.stringValue = "Opened native chat window."
    }

    @objc
    private func incrementPendingApprovals() {
        quickChatSession.incrementPendingApprovals()
        updatePendingLabel(count: quickChatSession.pendingApprovalsCount)
    }

    @objc
    private func clearPendingApprovals() {
        quickChatSession.clearPendingApprovals()
        updatePendingLabel(count: quickChatSession.pendingApprovalsCount)
    }

    private func updatePendingLabel(count: Int) {
        pendingLabel.stringValue = "Pending approvals: \(count)"
        pendingLabel.textColor = count > 0 ? .systemOrange : .secondaryLabelColor
    }
}
