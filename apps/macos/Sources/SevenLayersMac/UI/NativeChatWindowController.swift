import AppKit
import Foundation

public enum NativeChatMessageRole: Equatable {
    case operatorContext
    case runtime
}

public struct NativeChatMessage: Equatable {
    public let role: NativeChatMessageRole
    public let text: String
    public let correlationID: String?
    public let timestamp: Date

    public init(
        role: NativeChatMessageRole,
        text: String,
        correlationID: String? = nil,
        timestamp: Date
    ) {
        self.role = role
        self.text = text
        self.correlationID = correlationID
        self.timestamp = timestamp
    }
}

public struct NativeChatWindowState: Equatable {
    public let messages: [NativeChatMessage]
    public let pendingApprovalsCount: Int
    public let statusText: String

    public init(
        messages: [NativeChatMessage] = [],
        pendingApprovalsCount: Int = 0,
        statusText: String = "Ready"
    ) {
        self.messages = messages
        self.pendingApprovalsCount = max(0, pendingApprovalsCount)
        self.statusText = statusText
    }
}

@MainActor
public final class NativeChatWindowSessionController {
    private let quickChatSession: QuickChatSessionController
    private let now: () -> Date

    private var quickChatObserverToken: UUID?
    private var stateObservers: [UUID: (NativeChatWindowState) -> Void] = [:]

    public private(set) var state = NativeChatWindowState() {
        didSet {
            for observer in stateObservers.values {
                observer(state)
            }
        }
    }

    public init(
        quickChatSession: QuickChatSessionController,
        now: @escaping () -> Date = Date.init
    ) {
        self.quickChatSession = quickChatSession
        self.now = now
        state = NativeChatWindowState(
            messages: [],
            pendingApprovalsCount: quickChatSession.pendingApprovalsCount,
            statusText: "Ready"
        )

        quickChatObserverToken = quickChatSession.addPendingApprovalsObserver { [weak self] count in
            self?.applyPendingApprovals(count)
        }
    }

    @discardableResult
    public func submitDraft(_ draft: String) -> Bool {
        guard let submission = quickChatSession.submitContextDraft(draft) else {
            updateStatusText(
                quickChatSession.lastSubmissionBlockReason ?? "Enter context before sending."
            )
            return false
        }

        let operatorMessage = NativeChatMessage(
            role: .operatorContext,
            text: submission.payload,
            correlationID: submission.correlationID,
            timestamp: now()
        )

        let runtimeMessage = NativeChatMessage(
            role: .runtime,
            text: "Context forwarded to backend ingress (\(submission.schemaVersion)).",
            correlationID: submission.correlationID,
            timestamp: now()
        )

        state = NativeChatWindowState(
            messages: state.messages + [operatorMessage, runtimeMessage],
            pendingApprovalsCount: state.pendingApprovalsCount,
            statusText: "Sent corr \(String(submission.correlationID.prefix(8)))."
        )

        return true
    }

    @discardableResult
    public func addStateObserver(_ observer: @escaping (NativeChatWindowState) -> Void) -> UUID {
        let token = UUID()
        stateObservers[token] = observer
        observer(state)
        return token
    }

    public func removeStateObserver(_ token: UUID) {
        stateObservers.removeValue(forKey: token)
    }

    private func applyPendingApprovals(_ count: Int) {
        state = NativeChatWindowState(
            messages: state.messages,
            pendingApprovalsCount: count,
            statusText: state.statusText
        )
    }

    private func updateStatusText(_ text: String) {
        state = NativeChatWindowState(
            messages: state.messages,
            pendingApprovalsCount: state.pendingApprovalsCount,
            statusText: text
        )
    }
}

@MainActor
public protocol NativeChatWindowOpening: AnyObject {
    func openNativeChatWindow()
}

@MainActor
public final class NativeChatWindowController: NSObject, NativeChatWindowOpening {
    private let sessionController: NativeChatWindowSessionController
    private let mediaRuntimeController: NativeChatMediaRuntimeController
    private let authStateProvider: (any DesktopAuthStateProviding)?
    private let onSignIn: (() -> Void)?
    private let onSignOut: (() -> Void)?
    private lazy var windowController = makeWindowController()

    public init(
        sessionController: NativeChatWindowSessionController,
        mediaRuntimeController: NativeChatMediaRuntimeController,
        authStateProvider: (any DesktopAuthStateProviding)? = nil,
        onSignIn: (() -> Void)? = nil,
        onSignOut: (() -> Void)? = nil
    ) {
        self.sessionController = sessionController
        self.mediaRuntimeController = mediaRuntimeController
        self.authStateProvider = authStateProvider
        self.onSignIn = onSignIn
        self.onSignOut = onSignOut
        super.init()
    }

    public func openNativeChatWindow() {
        windowController.showWindow(nil)
        windowController.window?.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
    }

    private func makeWindowController() -> NSWindowController {
        let contentViewController = NativeChatWindowViewController(
            sessionController: sessionController,
            mediaRuntimeController: mediaRuntimeController,
            authStateProvider: authStateProvider,
            onSignIn: onSignIn,
            onSignOut: onSignOut
        )
        let window = NSWindow(
            contentRect: NSRect(x: 0, y: 0, width: 1040, height: 680),
            styleMask: [.titled, .closable, .miniaturizable, .resizable],
            backing: .buffered,
            defer: false
        )
        window.title = "SevenLayers Chat"
        window.minSize = NSSize(width: 900, height: 620)
        window.collectionBehavior.insert([.fullScreenAuxiliary, .canJoinAllSpaces])
        window.contentViewController = contentViewController
        return NSWindowController(window: window)
    }
}

@MainActor
private final class NativeChatWindowViewController: NSViewController {
    private enum ThemeMode: Int {
        case dark
        case sepia
    }

    private enum ControlStyle {
        case primary
        case secondary
        case active
        case error
    }

    private struct ThemePalette {
        let background: NSColor
        let surface: NSColor
        let elevated: NSColor
        let primaryText: NSColor
        let secondaryText: NSColor
        let border: NSColor
        let accent: NSColor
        let error: NSColor
    }

    private let sessionController: NativeChatWindowSessionController
    private let mediaRuntimeController: NativeChatMediaRuntimeController
    private let authStateProvider: (any DesktopAuthStateProviding)?
    private let onSignIn: (() -> Void)?
    private let onSignOut: (() -> Void)?

    private var stateObserverToken: UUID?
    private var runtimeObserverToken: UUID?
    private var authObserverToken: UUID?
    private var followCursorTimer: Timer?
    private var localSystemMessages: [String] = []
    private var themeMode: ThemeMode = .dark
    private var followsCursor = false
    private var currentAuthState: DesktopAuthSessionState = .signedOut(reason: .missingCredential)

    private var captureSources: [ScreenCaptureSourceDescriptor] = []
    private var selectedCaptureSourceID: String = "desktop:primary"

    private let titleLabel = NSTextField(labelWithString: "What can I help you with today?")
    private let subtitleLabel = NSTextField(
        labelWithString: "Instant desktop chat shell. Backend remains mutation authority."
    )
    private let themeControl = NSSegmentedControl(
        labels: ["", ""],
        trackingMode: .selectOne,
        target: nil,
        action: nil
    )
    private let authStatusLabel = NSTextField(labelWithString: "Auth: Signed out")
    private let authActionButton = NSButton(title: "Sign In", target: nil, action: nil)
    private let pendingLabel = NSTextField(labelWithString: "Pending approvals: 0")
    private let captureSourceLabel = NSTextField(labelWithString: "Capture Source")
    private let captureSourcePopup = NSPopUpButton(frame: .zero, pullsDown: false)
    private let refreshSourcesButton = NSButton(title: "Refresh Sources", target: nil, action: nil)
    private let transcriptScrollView = NSScrollView()
    private let transcriptTextView = NSTextView()
    private let voiceButton = NSButton(title: "Voice", target: nil, action: nil)
    private let videoButton = NSButton(title: "Video", target: nil, action: nil)
    private let screenshotButton = NSButton(title: "Screenshot", target: nil, action: nil)
    private let allDisplaysButton = NSButton(title: "All Displays", target: nil, action: nil)
    private let followCursorButton = NSButton(title: "Follow Cursor", target: nil, action: nil)
    private let draftField = NSTextField(string: "")
    private let sendButton = NSButton(title: "Send Message", target: nil, action: nil)
    private let statusLabel = NSTextField(labelWithString: "Ready")

    init(
        sessionController: NativeChatWindowSessionController,
        mediaRuntimeController: NativeChatMediaRuntimeController,
        authStateProvider: (any DesktopAuthStateProviding)?,
        onSignIn: (() -> Void)?,
        onSignOut: (() -> Void)?
    ) {
        self.sessionController = sessionController
        self.mediaRuntimeController = mediaRuntimeController
        self.authStateProvider = authStateProvider
        self.onSignIn = onSignIn
        self.onSignOut = onSignOut
        super.init(nibName: nil, bundle: nil)
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) {
        fatalError("init(coder:) is not supported")
    }

    override func viewWillDisappear() {
        super.viewWillDisappear()

        if let stateObserverToken {
            sessionController.removeStateObserver(stateObserverToken)
            self.stateObserverToken = nil
        }
        if let runtimeObserverToken {
            mediaRuntimeController.removeStateObserver(runtimeObserverToken)
            self.runtimeObserverToken = nil
        }
        if let authObserverToken {
            authStateProvider?.removeAuthStateObserver(authObserverToken)
            self.authObserverToken = nil
        }

        stopFollowingCursor()
        _ = mediaRuntimeController.stopAllActivePipelines()
    }

    override func loadView() {
        view = NSView(frame: NSRect(x: 0, y: 0, width: 1040, height: 680))
        configureControls()
        layoutControls()
        wireActions()
        reloadCaptureSources(preserveSelection: false)
        renderRuntimeState(mediaRuntimeController.state)
    }

    private func configureControls() {
        titleLabel.font = headingFont(size: 28)

        subtitleLabel.maximumNumberOfLines = 2
        subtitleLabel.lineBreakMode = .byWordWrapping
        subtitleLabel.font = bodyFont(size: 13, weight: .medium)

        authStatusLabel.font = bodyFont(size: 12, weight: .medium)
        authStatusLabel.alignment = .right

        pendingLabel.font = bodyFont(size: 12, weight: .medium)
        themeControl.selectedSegment = 0
        themeControl.segmentStyle = .capsule
        themeControl.setWidth(40, forSegment: 0)
        themeControl.setWidth(40, forSegment: 1)
        themeControl.toolTip = "Theme: Moon = dark, Sun = sepia"
        themeControl.wantsLayer = true
        updateThemeControlIcons()

        captureSourceLabel.font = bodyFont(size: 12, weight: .semibold)
        captureSourcePopup.font = bodyFont(size: 12, weight: .medium)

        transcriptTextView.isEditable = false
        transcriptTextView.font = bodyFont(size: 14, weight: .regular)
        transcriptTextView.drawsBackground = false
        transcriptTextView.textContainerInset = NSSize(width: 12, height: 12)

        transcriptScrollView.hasVerticalScroller = true
        transcriptScrollView.documentView = transcriptTextView
        transcriptScrollView.borderType = .noBorder

        draftField.placeholderString = "Message SevenLayers agent..."
        draftField.font = bodyFont(size: 14, weight: .regular)

        statusLabel.maximumNumberOfLines = 2
        statusLabel.lineBreakMode = .byWordWrapping
        statusLabel.font = bodyFont(size: 12, weight: .medium)

        [
            voiceButton,
            videoButton,
            screenshotButton,
            allDisplaysButton,
            followCursorButton,
            refreshSourcesButton,
            authActionButton,
            sendButton,
        ].forEach {
            $0.isBordered = false
            $0.wantsLayer = true
            $0.font = bodyFont(size: 13, weight: .semibold)
            $0.contentTintColor = .white
        }

        captureSourcePopup.wantsLayer = true

        view.wantsLayer = true
        applyTheme()
    }

    private func layoutControls() {
        let width = view.frame.width
        let margin: CGFloat = 24
        let controlHeight: CGFloat = 34

        titleLabel.frame = NSRect(x: margin, y: 632, width: width - 320, height: 32)
        themeControl.frame = NSRect(x: width - 124, y: 634, width: 92, height: 28)
        authStatusLabel.frame = NSRect(x: width - 350, y: 608, width: 170, height: 18)
        authActionButton.frame = NSRect(x: width - 176, y: 602, width: 152, height: 30)
        subtitleLabel.frame = NSRect(x: margin, y: 606, width: width - 390, height: 20)
        pendingLabel.frame = NSRect(x: margin, y: 584, width: 220, height: 18)

        captureSourceLabel.frame = NSRect(x: margin, y: 548, width: 96, height: 18)
        captureSourcePopup.frame = NSRect(x: margin + 104, y: 542, width: width - 460, height: controlHeight)
        refreshSourcesButton.frame = NSRect(x: width - 324, y: 542, width: 140, height: controlHeight)
        followCursorButton.frame = NSRect(x: width - 176, y: 542, width: 152, height: controlHeight)

        voiceButton.frame = NSRect(x: margin, y: 500, width: 112, height: controlHeight)
        videoButton.frame = NSRect(x: margin + 120, y: 500, width: 112, height: controlHeight)
        screenshotButton.frame = NSRect(x: margin + 240, y: 500, width: 136, height: controlHeight)
        allDisplaysButton.frame = NSRect(x: margin + 384, y: 500, width: 140, height: controlHeight)

        transcriptScrollView.frame = NSRect(x: margin, y: 142, width: width - (margin * 2), height: 346)

        draftField.frame = NSRect(x: margin, y: 84, width: width - (margin * 2) - 164, height: 42)
        sendButton.frame = NSRect(x: width - margin - 156, y: 84, width: 156, height: 42)
        statusLabel.frame = NSRect(x: margin, y: 34, width: width - (margin * 2), height: 38)

        view.addSubview(titleLabel)
        view.addSubview(themeControl)
        view.addSubview(authStatusLabel)
        view.addSubview(authActionButton)
        view.addSubview(subtitleLabel)
        view.addSubview(pendingLabel)
        view.addSubview(captureSourceLabel)
        view.addSubview(captureSourcePopup)
        view.addSubview(refreshSourcesButton)
        view.addSubview(followCursorButton)
        view.addSubview(voiceButton)
        view.addSubview(videoButton)
        view.addSubview(screenshotButton)
        view.addSubview(allDisplaysButton)
        view.addSubview(transcriptScrollView)
        view.addSubview(draftField)
        view.addSubview(sendButton)
        view.addSubview(statusLabel)
    }

    private func wireActions() {
        sendButton.target = self
        sendButton.action = #selector(sendDraft)

        draftField.target = self
        draftField.action = #selector(sendDraft)

        themeControl.target = self
        themeControl.action = #selector(changeTheme)

        authActionButton.target = self
        authActionButton.action = #selector(runAuthAction)

        voiceButton.target = self
        voiceButton.action = #selector(toggleVoice)

        videoButton.target = self
        videoButton.action = #selector(toggleVideo)

        screenshotButton.target = self
        screenshotButton.action = #selector(captureSelectedSnapshot)

        allDisplaysButton.target = self
        allDisplaysButton.action = #selector(captureAllDisplaySnapshots)

        followCursorButton.target = self
        followCursorButton.action = #selector(toggleFollowCursor)

        refreshSourcesButton.target = self
        refreshSourcesButton.action = #selector(refreshCaptureSources)

        captureSourcePopup.target = self
        captureSourcePopup.action = #selector(captureSourceDidChange)

        stateObserverToken = sessionController.addStateObserver { [weak self] state in
            self?.render(state: state)
        }
        runtimeObserverToken = mediaRuntimeController.addStateObserver { [weak self] runtimeState in
            self?.renderRuntimeState(runtimeState)
        }
        if let authStateProvider {
            authObserverToken = authStateProvider.addAuthStateObserver { [weak self] state in
                self?.renderAuthState(state)
            }
        } else {
            renderAuthState(.signedOut(reason: .missingCredential))
            authActionButton.isEnabled = false
        }
    }

    @objc
    private func sendDraft() {
        let didSubmit = sessionController.submitDraft(draftField.stringValue)
        if didSubmit {
            draftField.stringValue = ""
        }
    }

    @objc
    private func changeTheme() {
        themeMode = themeControl.selectedSegment == 1 ? .sepia : .dark
        applyTheme()
    }

    @objc
    private func runAuthAction() {
        if case .authenticated = currentAuthState {
            onSignOut?()
            appendSystemMessage("Signing out...")
        } else {
            onSignIn?()
            appendSystemMessage("Starting sign-in flow...")
        }
    }

    @objc
    private func toggleVoice() {
        let message = mediaRuntimeController.toggleVoiceCapture()
        appendSystemMessage(message)
    }

    @objc
    private func toggleVideo() {
        let message = mediaRuntimeController.toggleVideoCapture()
        appendSystemMessage(message)
    }

    @objc
    private func captureSelectedSnapshot() {
        captureSnapshots(sourceIds: [selectedCaptureSourceID])
    }

    @objc
    private func captureAllDisplaySnapshots() {
        let sourceIds = captureSources
            .filter { $0.kind == .display }
            .map(\.sourceId)

        let deduplicated = Array(NSOrderedSet(array: sourceIds)) as? [String] ?? []
        guard !deduplicated.isEmpty else {
            appendSystemMessage("No display sources available.")
            return
        }

        captureSnapshots(sourceIds: deduplicated)
    }

    @objc
    private func refreshCaptureSources() {
        reloadCaptureSources(preserveSelection: true)
        let windowCount = captureSources.filter { $0.kind == .window }.count
        appendSystemMessage("Capture sources refreshed (\(windowCount) windows).")
    }

    @objc
    private func captureSourceDidChange() {
        guard captureSourcePopup.indexOfSelectedItem >= 0,
              captureSourcePopup.indexOfSelectedItem < captureSources.count
        else {
            return
        }

        let selected = captureSources[captureSourcePopup.indexOfSelectedItem]
        selectedCaptureSourceID = selected.sourceId
        appendSystemMessage("Selected capture source: \(captureSourceTitle(for: selected)).")
    }

    private func reloadCaptureSources(preserveSelection: Bool) {
        let previousSelection = selectedCaptureSourceID
        let listedSources = mediaRuntimeController.listCaptureSources()

        if listedSources.isEmpty {
            captureSources = [
                ScreenCaptureSourceDescriptor(
                    sourceId: "desktop:primary",
                    kind: .display,
                    displayId: CGMainDisplayID()
                ),
            ]
        } else {
            captureSources = listedSources
        }

        captureSourcePopup.removeAllItems()
        for source in captureSources {
            captureSourcePopup.addItem(withTitle: captureSourceTitle(for: source))
        }

        if preserveSelection,
           let selectedIndex = captureSources.firstIndex(where: { $0.sourceId == previousSelection })
        {
            captureSourcePopup.selectItem(at: selectedIndex)
            selectedCaptureSourceID = previousSelection
        } else {
            captureSourcePopup.selectItem(at: 0)
            selectedCaptureSourceID = captureSources[0].sourceId
        }
    }

    private func captureSnapshots(sourceIds: [String]) {
        var successfulLines: [String] = []
        var failedLines: [String] = []

        for sourceId in sourceIds {
            do {
                let execution = try mediaRuntimeController.captureSnapshot(sourceId: sourceId)
                successfulLines.append(snapshotSummary(execution.artifact))
            } catch {
                failedLines.append("\(sourceId): \(mediaRuntimeController.describe(error: error))")
            }
        }

        var messageParts: [String] = []
        if !successfulLines.isEmpty {
            messageParts.append(
                "Captured \(successfulLines.count) snapshot(s):\n" + successfulLines.joined(separator: "\n")
            )
        }
        if !failedLines.isEmpty {
            messageParts.append(
                "Capture errors:\n" + failedLines.joined(separator: "\n")
            )
        }

        if messageParts.isEmpty {
            appendSystemMessage("No snapshots captured.")
        } else {
            appendSystemMessage(messageParts.joined(separator: "\n\n"))
        }
    }

    @objc
    private func toggleFollowCursor() {
        followsCursor.toggle()
        followCursorButton.title = followsCursor ? "Following Cursor" : "Follow Cursor"
        if followsCursor {
            startFollowingCursor()
            appendSystemMessage("Cursor-follow mode enabled.")
        } else {
            stopFollowingCursor()
            appendSystemMessage("Cursor-follow mode disabled.")
        }
        applyTheme()
    }

    private func startFollowingCursor() {
        stopFollowingCursor()
        followCursorTimer = Timer.scheduledTimer(withTimeInterval: 0.05, repeats: true) { [weak self] _ in
            Task { @MainActor [weak self] in
                self?.followMousePosition()
            }
        }
    }

    private func stopFollowingCursor() {
        followCursorTimer?.invalidate()
        followCursorTimer = nil
    }

    private func followMousePosition() {
        guard followsCursor, let window = view.window else { return }
        let mouse = NSEvent.mouseLocation
        let currentFrame = window.frame

        var nextOrigin = NSPoint(
            x: mouse.x + 18,
            y: mouse.y - currentFrame.height * 0.35
        )

        if let screen = NSScreen.screens.first(where: { NSMouseInRect(mouse, $0.frame, false) }) {
            let visible = screen.visibleFrame
            nextOrigin.x = min(max(nextOrigin.x, visible.minX), visible.maxX - currentFrame.width)
            nextOrigin.y = min(max(nextOrigin.y, visible.minY), visible.maxY - currentFrame.height)
        }

        window.setFrameOrigin(nextOrigin)
    }

    private func appendSystemMessage(_ message: String) {
        localSystemMessages.append(message)
        if localSystemMessages.count > 12 {
            localSystemMessages.removeFirst(localSystemMessages.count - 12)
        }
        statusLabel.stringValue = message
        render(state: sessionController.state)
    }

    private func render(state: NativeChatWindowState) {
        let palette = palette(for: themeMode)

        pendingLabel.stringValue = "Pending approvals: \(state.pendingApprovalsCount)"
        pendingLabel.textColor = state.pendingApprovalsCount > 0 ? palette.accent : palette.secondaryText

        if localSystemMessages.isEmpty {
            statusLabel.stringValue = state.statusText
        }

        transcriptTextView.string = renderTranscript(messages: state.messages, systemMessages: localSystemMessages)
        transcriptTextView.scrollToEndOfDocument(nil)
    }

    private func renderRuntimeState(_ runtimeState: NativeChatMediaRuntimeState) {
        voiceButton.title = controlTitle(base: "Voice", state: runtimeState.voice)
        videoButton.title = controlTitle(base: "Video", state: runtimeState.video)

        applyTheme()
    }

    private func renderAuthState(_ state: DesktopAuthSessionState) {
        currentAuthState = state
        let presentation = state.statusPresentation(
            canSignIn: onSignIn != nil,
            canSignOut: onSignOut != nil
        )
        authStatusLabel.stringValue = presentation.indicatorText
        authActionButton.title = presentation.actionTitle
        authActionButton.isEnabled = presentation.isActionEnabled

        switch state {
        case .authenticated:
            break
        case .authorizing:
            statusLabel.stringValue = authStateProvider?.authStatusText ?? "Waiting for sign-in callback."
        case .signedOut:
            statusLabel.stringValue = authStateProvider?.authStatusText ?? "Sign in required."
        }

        applyTheme()
    }

    private func renderTranscript(messages: [NativeChatMessage], systemMessages: [String]) -> String {
        if messages.isEmpty && systemMessages.isEmpty {
            return "No messages yet."
        }

        let chatLines = messages.map { message in
            let prefix = message.role == .operatorContext ? "You" : "Runtime"
            return "\(prefix): \(message.text)"
        }

        let systemLines = systemMessages.map { "System: \($0)" }
        return (chatLines + systemLines).joined(separator: "\n\n")
    }

    private func applyTheme() {
        let palette = palette(for: themeMode)

        view.layer?.backgroundColor = palette.background.cgColor

        titleLabel.textColor = palette.primaryText
        subtitleLabel.textColor = palette.secondaryText
        authStatusLabel.textColor = authStatusTextColor(for: currentAuthState, palette: palette)
        pendingLabel.textColor = palette.secondaryText
        captureSourceLabel.textColor = palette.secondaryText
        statusLabel.textColor = palette.secondaryText

        transcriptTextView.backgroundColor = palette.elevated
        transcriptTextView.textColor = palette.primaryText
        transcriptTextView.insertionPointColor = palette.primaryText

        transcriptScrollView.wantsLayer = true
        transcriptScrollView.layer?.backgroundColor = palette.elevated.cgColor
        transcriptScrollView.layer?.cornerRadius = 12
        transcriptScrollView.layer?.borderWidth = 1
        transcriptScrollView.layer?.borderColor = palette.border.cgColor

        draftField.backgroundColor = palette.surface
        draftField.textColor = palette.primaryText
        draftField.focusRingType = .none
        draftField.wantsLayer = true
        draftField.layer?.cornerRadius = 12
        draftField.layer?.borderWidth = 1
        draftField.layer?.borderColor = palette.border.cgColor

        captureSourcePopup.layer?.cornerRadius = 12
        captureSourcePopup.layer?.borderWidth = 1
        captureSourcePopup.layer?.borderColor = palette.border.cgColor
        captureSourcePopup.layer?.backgroundColor = palette.surface.cgColor

        themeControl.layer?.cornerRadius = 14
        themeControl.layer?.borderWidth = 1
        themeControl.layer?.borderColor = palette.border.cgColor
        themeControl.layer?.backgroundColor = palette.surface.cgColor
        themeControl.selectedSegmentBezelColor = palette.accent.withAlphaComponent(
            themeMode == .dark ? 0.35 : 0.2
        )
        themeControl.appearance = themeMode == .sepia
            ? NSAppearance(named: .aqua)
            : NSAppearance(named: .darkAqua)
        updateThemeControlIcons()

        applyControlStyle(
            voiceButton,
            style: controlStyle(for: mediaRuntimeController.state.voice),
            palette: palette
        )
        applyControlStyle(
            videoButton,
            style: controlStyle(for: mediaRuntimeController.state.video),
            palette: palette
        )
        applyControlStyle(screenshotButton, style: .secondary, palette: palette)
        applyControlStyle(allDisplaysButton, style: .secondary, palette: palette)
        applyControlStyle(refreshSourcesButton, style: .secondary, palette: palette)
        applyControlStyle(authActionButton, style: authActionStyle(for: currentAuthState), palette: palette)
        applyControlStyle(
            followCursorButton,
            style: followsCursor ? .active : .secondary,
            palette: palette
        )
        applyControlStyle(sendButton, style: .primary, palette: palette)
        authActionButton.alphaValue = authActionButton.isEnabled ? 1 : 0.5
    }

    private func applyControlStyle(_ button: NSButton, style: ControlStyle, palette: ThemePalette) {
        guard let layer = button.layer else {
            return
        }

        layer.cornerRadius = 12
        layer.borderWidth = style == .primary ? 0 : 1

        switch style {
        case .primary:
            layer.backgroundColor = palette.accent.cgColor
            layer.borderColor = palette.accent.cgColor
            button.contentTintColor = .white
        case .secondary:
            layer.backgroundColor = palette.surface.cgColor
            layer.borderColor = palette.border.cgColor
            button.contentTintColor = palette.primaryText
        case .active:
            layer.backgroundColor = palette.accent.withAlphaComponent(0.2).cgColor
            layer.borderColor = palette.accent.cgColor
            button.contentTintColor = palette.primaryText
        case .error:
            layer.backgroundColor = palette.error.withAlphaComponent(0.22).cgColor
            layer.borderColor = palette.error.cgColor
            button.contentTintColor = palette.primaryText
        }
    }

    private func controlTitle(base: String, state: NativeChatMediaPipelineState) -> String {
        switch state {
        case .idle:
            return base
        case .requestingPermission:
            return "\(base): Requesting..."
        case .active:
            return "\(base): Active"
        case .error:
            return "\(base): Retry"
        }
    }

    private func controlStyle(for state: NativeChatMediaPipelineState) -> ControlStyle {
        switch state {
        case .active:
            return .active
        case .error:
            return .error
        case .idle, .requestingPermission:
            return .secondary
        }
    }

    private func authActionStyle(for state: DesktopAuthSessionState) -> ControlStyle {
        switch state {
        case .authenticated:
            return .active
        case .authorizing:
            return .secondary
        case .signedOut:
            return .secondary
        }
    }

    private func authStatusTextColor(
        for state: DesktopAuthSessionState,
        palette: ThemePalette
    ) -> NSColor {
        switch state {
        case .authenticated:
            return themeMode == .dark ? NSColor.systemGreen : color(hex: "166534")
        case .authorizing:
            return themeMode == .dark ? NSColor.systemOrange : color(hex: "B45309")
        case let .signedOut(reason: reason):
            if isAuthFailureReason(reason) {
                return themeMode == .dark ? NSColor.systemRed : color(hex: "B42318")
            }
            return palette.secondaryText
        }
    }

    private func isAuthFailureReason(_ reason: DesktopAuthSignedOutReason) -> Bool {
        switch reason {
        case .callbackRejected, .expiredCredential, .invalidCredential, .loginLaunchFailed, .unauthorizedResponse:
            return true
        case .missingCredential, .userInitiated:
            return false
        }
    }

    private func snapshotSummary(_ artifact: ScreenSnapshotArtifact) -> String {
        var summary = "\(artifact.sourceId)"

        if let sourceMetadata = artifact.sourceMetadata {
            if sourceMetadata.sourceKind == .window {
                let owner = sourceMetadata.ownerName ?? "Unknown App"
                let title = sourceMetadata.title ?? "Untitled"
                summary += " (\(owner) - \(title))"
                if let workspaceId = sourceMetadata.workspaceId {
                    summary += " [Space \(workspaceId)]"
                }
            }
        }

        if let payloadRef = artifact.payloadRef {
            summary += "\n  payload: \(payloadRef)"
        }
        if let evidenceRef = artifact.evidenceRef {
            summary += "\n  evidence: \(evidenceRef)"
        }

        return summary
    }

    private func captureSourceTitle(for source: ScreenCaptureSourceDescriptor) -> String {
        switch source.kind {
        case .display:
            if source.sourceId == "desktop:primary" {
                return "Primary Display"
            }
            if let displayId = source.displayId {
                return "Display \(displayId)"
            }
            return source.sourceId
        case .window:
            let owner = source.ownerName ?? "Unknown"
            let title = source.title ?? "Untitled"
            var label = "\(owner) - \(title)"
            if let workspaceId = source.workspaceId {
                label += " [Space \(workspaceId)]"
            }
            if source.isOnScreen == false {
                label += " (Off-screen)"
            }
            return label
        }
    }

    private func palette(for mode: ThemeMode) -> ThemePalette {
        switch mode {
        case .dark:
            return ThemePalette(
                background: color(hex: "0A0A0A"),
                surface: color(hex: "141414"),
                elevated: color(hex: "1A1A1A"),
                primaryText: color(hex: "EDEDED"),
                secondaryText: color(hex: "888888"),
                border: color(hex: "262626"),
                accent: color(hex: "E8520A"),
                error: color(hex: "EF4444")
            )
        case .sepia:
            return ThemePalette(
                background: color(hex: "F4F3EF"),
                surface: color(hex: "FFFFFF"),
                elevated: color(hex: "EBE9E0"),
                primaryText: color(hex: "15120F"),
                secondaryText: color(hex: "5C5246"),
                border: color(hex: "D6D0C2"),
                accent: color(hex: "E8520A"),
                error: color(hex: "EF4444")
            )
        }
    }

    private func color(hex: String) -> NSColor {
        let sanitized = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        guard sanitized.count == 6,
              let value = Int(sanitized, radix: 16)
        else {
            return .labelColor
        }

        let red = CGFloat((value >> 16) & 0xFF) / 255.0
        let green = CGFloat((value >> 8) & 0xFF) / 255.0
        let blue = CGFloat(value & 0xFF) / 255.0
        return NSColor(calibratedRed: red, green: green, blue: blue, alpha: 1)
    }

    private func headingFont(size: CGFloat) -> NSFont {
        NSFont(name: "Jost-SemiBold", size: size) ?? NSFont.systemFont(ofSize: size, weight: .semibold)
    }

    private func bodyFont(size: CGFloat, weight: NSFont.Weight) -> NSFont {
        let customName: String
        if weight == .semibold {
            customName = "Manrope-SemiBold"
        } else if weight == .medium {
            customName = "Manrope-Medium"
        } else {
            customName = "Manrope-Regular"
        }

        return NSFont(name: customName, size: size) ?? NSFont.systemFont(ofSize: size, weight: weight)
    }

    private func updateThemeControlIcons() {
        let symbolConfig = NSImage.SymbolConfiguration(pointSize: 12, weight: .semibold)
        if let moon = NSImage(systemSymbolName: "moon.fill", accessibilityDescription: "Dark Theme")?
            .withSymbolConfiguration(symbolConfig) {
            moon.isTemplate = true
            themeControl.setImage(moon, forSegment: 0)
            themeControl.setLabel("", forSegment: 0)
        }

        if let sun = NSImage(systemSymbolName: "sun.max.fill", accessibilityDescription: "Sepia Theme")?
            .withSymbolConfiguration(symbolConfig) {
            sun.isTemplate = true
            themeControl.setImage(sun, forSegment: 1)
            themeControl.setLabel("", forSegment: 1)
        }
    }
}
