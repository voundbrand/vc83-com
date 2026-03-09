import AppKit
import Foundation

@MainActor
public final class PopoverHostController {
    public let popover: NSPopover
    private let diagnosticsProvider: (any DesktopRuntimeDiagnosticsProviding)?

    public var isShown: Bool {
        popover.isShown
    }

    public init(
        quickChatSession: QuickChatSessionController,
        workflowSession: WorkflowRecommendationSessionController,
        dashboardOpener: DashboardDeepLinkOpening,
        chatWindowOpener: NativeChatWindowOpening,
        diagnosticsProvider: (any DesktopRuntimeDiagnosticsProviding)? = nil
    ) {
        self.popover = NSPopover()
        self.diagnosticsProvider = diagnosticsProvider

        popover.behavior = .transient
        popover.contentSize = NSSize(width: 380, height: 386)
        popover.contentViewController = QuickChatPopoverViewController(
            quickChatSession: quickChatSession,
            workflowSession: workflowSession,
            dashboardOpener: dashboardOpener,
            chatWindowOpener: chatWindowOpener,
            diagnosticsProvider: diagnosticsProvider
        )
    }

    public func show(relativeTo button: NSStatusBarButton) {
        (popover.contentViewController as? QuickChatPopoverViewController)?.refreshRuntimeDiagnostics()
        popover.show(relativeTo: button.bounds, of: button, preferredEdge: .minY)
    }

    public func close() {
        popover.performClose(nil)
    }
}

@MainActor
private final class QuickChatPopoverViewController: NSViewController {
    private let quickChatSession: QuickChatSessionController
    private let workflowSession: WorkflowRecommendationSessionController
    private let dashboardOpener: DashboardDeepLinkOpening
    private let chatWindowOpener: NativeChatWindowOpening
    private let diagnosticsProvider: (any DesktopRuntimeDiagnosticsProviding)?
    private var workflowObserverToken: UUID?

    private let titleLabel = NSTextField(labelWithString: "Quick Chat")
    private let subtitleLabel = NSTextField(labelWithString: "Ingress/control surface only. Backend remains mutation authority.")
    private let pendingLabel = NSTextField(labelWithString: "Pending approvals: 0")
    private let draftField = NSTextField(string: "")
    private let sendContextButton = NSButton(title: "Send Context", target: nil, action: nil)
    private let openNativeChatButton = NSButton(title: "Open Native Chat", target: nil, action: nil)
    private let openDashboardButton = NSButton(title: "Open Dashboard", target: nil, action: nil)
    private let incrementApprovalButton = NSButton(title: "+ Approval", target: nil, action: nil)
    private let clearApprovalsButton = NSButton(title: "Clear", target: nil, action: nil)
    private let workflowTitleLabel = NSTextField(labelWithString: "Workflow Recommendations")
    private let workflowStatusLabel = NSTextField(labelWithString: "No recommendation yet.")
    private let toggleWatchButton = NSButton(title: "Start Watch", target: nil, action: nil)
    private let recommendButton = NSButton(title: "Recommend", target: nil, action: nil)
    private let useInDraftButton = NSButton(title: "Use in Draft", target: nil, action: nil)
    private let diagnosticsLabel = NSTextField(labelWithString: "Runtime health: healthy | retry: not_applicable")
    private let statusLabel = NSTextField(labelWithString: "Ready")

    init(
        quickChatSession: QuickChatSessionController,
        workflowSession: WorkflowRecommendationSessionController,
        dashboardOpener: DashboardDeepLinkOpening,
        chatWindowOpener: NativeChatWindowOpening,
        diagnosticsProvider: (any DesktopRuntimeDiagnosticsProviding)?
    ) {
        self.quickChatSession = quickChatSession
        self.workflowSession = workflowSession
        self.dashboardOpener = dashboardOpener
        self.chatWindowOpener = chatWindowOpener
        self.diagnosticsProvider = diagnosticsProvider
        super.init(nibName: nil, bundle: nil)
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) {
        fatalError("init(coder:) is not supported")
    }

    override func loadView() {
        let root = NSView(frame: NSRect(x: 0, y: 0, width: 380, height: 386))

        titleLabel.font = NSFont.systemFont(ofSize: 16, weight: .semibold)
        titleLabel.frame = NSRect(x: 18, y: 324, width: 150, height: 22)

        subtitleLabel.textColor = .secondaryLabelColor
        subtitleLabel.maximumNumberOfLines = 2
        subtitleLabel.lineBreakMode = .byWordWrapping
        subtitleLabel.frame = NSRect(x: 18, y: 282, width: 344, height: 36)

        pendingLabel.font = NSFont.monospacedDigitSystemFont(ofSize: 12, weight: .medium)
        pendingLabel.frame = NSRect(x: 18, y: 255, width: 170, height: 20)

        incrementApprovalButton.frame = NSRect(x: 195, y: 250, width: 82, height: 26)
        clearApprovalsButton.frame = NSRect(x: 282, y: 250, width: 80, height: 26)

        draftField.placeholderString = "Type quick operator context"
        draftField.frame = NSRect(x: 18, y: 214, width: 344, height: 28)

        sendContextButton.frame = NSRect(x: 18, y: 178, width: 164, height: 28)
        openDashboardButton.frame = NSRect(x: 198, y: 178, width: 164, height: 28)
        openNativeChatButton.frame = NSRect(x: 18, y: 144, width: 344, height: 28)

        workflowTitleLabel.font = NSFont.systemFont(ofSize: 13, weight: .semibold)
        workflowTitleLabel.frame = NSRect(x: 18, y: 130, width: 344, height: 18)

        workflowStatusLabel.textColor = .secondaryLabelColor
        workflowStatusLabel.maximumNumberOfLines = 2
        workflowStatusLabel.lineBreakMode = .byWordWrapping
        workflowStatusLabel.frame = NSRect(x: 18, y: 104, width: 344, height: 24)

        toggleWatchButton.frame = NSRect(x: 18, y: 72, width: 110, height: 26)
        recommendButton.frame = NSRect(x: 135, y: 72, width: 110, height: 26)
        useInDraftButton.frame = NSRect(x: 252, y: 72, width: 110, height: 26)

        diagnosticsLabel.textColor = .secondaryLabelColor
        diagnosticsLabel.maximumNumberOfLines = 2
        diagnosticsLabel.lineBreakMode = .byWordWrapping
        diagnosticsLabel.frame = NSRect(x: 18, y: 44, width: 344, height: 24)

        statusLabel.maximumNumberOfLines = 3
        statusLabel.lineBreakMode = .byWordWrapping
        statusLabel.textColor = .secondaryLabelColor
        statusLabel.frame = NSRect(x: 18, y: 10, width: 344, height: 30)

        root.addSubview(titleLabel)
        root.addSubview(subtitleLabel)
        root.addSubview(pendingLabel)
        root.addSubview(incrementApprovalButton)
        root.addSubview(clearApprovalsButton)
        root.addSubview(draftField)
        root.addSubview(sendContextButton)
        root.addSubview(openDashboardButton)
        root.addSubview(openNativeChatButton)
        root.addSubview(workflowTitleLabel)
        root.addSubview(workflowStatusLabel)
        root.addSubview(toggleWatchButton)
        root.addSubview(recommendButton)
        root.addSubview(useInDraftButton)
        root.addSubview(diagnosticsLabel)
        root.addSubview(statusLabel)

        view = root

        wireActions()
    }

    override func viewWillDisappear() {
        super.viewWillDisappear()
        if let workflowObserverToken {
            workflowSession.removeStateObserver(workflowObserverToken)
            self.workflowObserverToken = nil
        }
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

        toggleWatchButton.target = self
        toggleWatchButton.action = #selector(toggleWorkflowWatch)

        recommendButton.target = self
        recommendButton.action = #selector(refreshWorkflowRecommendation)

        useInDraftButton.target = self
        useInDraftButton.action = #selector(useWorkflowRecommendationInDraft)

        workflowObserverToken = workflowSession.addStateObserver { [weak self] state in
            self?.renderWorkflowState(state)
        }

        refreshRuntimeDiagnostics()
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

    @objc
    private func toggleWorkflowWatch() {
        if workflowSession.state.isWatching {
            workflowSession.stopWatching()
        } else {
            workflowSession.startWatching()
        }
    }

    @objc
    private func refreshWorkflowRecommendation() {
        workflowSession.refreshRecommendations()
        statusLabel.stringValue = workflowSession.state.statusText
    }

    @objc
    private func useWorkflowRecommendationInDraft() {
        guard let draft = workflowSession.topRecommendationDraft() else {
            statusLabel.stringValue = "No recommendation available yet."
            return
        }

        draftField.stringValue = draft
        statusLabel.stringValue = "Inserted recommendation into draft."
    }

    private func updatePendingLabel(count: Int) {
        pendingLabel.stringValue = "Pending approvals: \(count)"
        pendingLabel.textColor = count > 0 ? .systemOrange : .secondaryLabelColor
    }

    private func renderWorkflowState(_ state: WorkflowRecommendationState) {
        toggleWatchButton.title = state.isWatching ? "Stop Watch" : "Start Watch"
        useInDraftButton.isEnabled = state.topRecommendation != nil

        if let topRecommendation = state.topRecommendation {
            workflowStatusLabel.stringValue = "\(topRecommendation.title) (\(topRecommendation.confidencePercent)%): \(topRecommendation.summary)"
        } else {
            workflowStatusLabel.stringValue = "No recommendation yet."
        }
    }

    func refreshRuntimeDiagnostics() {
        guard let diagnosticsProvider else {
            diagnosticsLabel.stringValue = "Runtime health: healthy | retry: not_applicable"
            return
        }

        let diagnostics = diagnosticsProvider.currentRuntimeDiagnostics()
        var summary = "Runtime health: \(diagnostics.transportHealth.rawValue) | retry: \(diagnostics.retryPolicyState.rawValue)"
        if let disableReason = diagnostics.disableReason {
            summary.append(" | disable: \(disableReason)")
        } else if let rollbackReason = diagnostics.fallbackReasons.first {
            summary.append(" | fallback: \(rollbackReason)")
        }
        diagnosticsLabel.stringValue = summary
    }
}
