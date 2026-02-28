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
            updateStatusText("Enter context before sending.")
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
    private lazy var windowController = makeWindowController()

    public init(sessionController: NativeChatWindowSessionController) {
        self.sessionController = sessionController
        super.init()
    }

    public func openNativeChatWindow() {
        windowController.showWindow(nil)
        windowController.window?.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
    }

    private func makeWindowController() -> NSWindowController {
        let contentViewController = NativeChatWindowViewController(
            sessionController: sessionController
        )
        let window = NSWindow(
            contentRect: NSRect(x: 0, y: 0, width: 620, height: 520),
            styleMask: [.titled, .closable, .miniaturizable, .resizable],
            backing: .buffered,
            defer: false
        )
        window.title = "SevenLayers Chat"
        window.contentViewController = contentViewController
        return NSWindowController(window: window)
    }
}

@MainActor
private final class NativeChatWindowViewController: NSViewController {
    private let sessionController: NativeChatWindowSessionController
    private var stateObserverToken: UUID?

    private let titleLabel = NSTextField(labelWithString: "Native Chat")
    private let subtitleLabel = NSTextField(
        labelWithString: "Same ingress contract as iPhone/webchat. Desktop remains approval-gated and fail-closed."
    )
    private let pendingLabel = NSTextField(labelWithString: "Pending approvals: 0")
    private let transcriptScrollView = NSScrollView()
    private let transcriptTextView = NSTextView()
    private let draftField = NSTextField(string: "")
    private let sendButton = NSButton(title: "Send", target: nil, action: nil)
    private let statusLabel = NSTextField(labelWithString: "Ready")

    init(sessionController: NativeChatWindowSessionController) {
        self.sessionController = sessionController
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
    }

    override func loadView() {
        view = NSView(frame: NSRect(x: 0, y: 0, width: 620, height: 520))
        configureControls()
        layoutControls()
        wireActions()
    }

    private func configureControls() {
        titleLabel.font = NSFont.systemFont(ofSize: 20, weight: .semibold)

        subtitleLabel.textColor = .secondaryLabelColor
        subtitleLabel.maximumNumberOfLines = 2
        subtitleLabel.lineBreakMode = .byWordWrapping

        pendingLabel.font = NSFont.monospacedDigitSystemFont(ofSize: 12, weight: .medium)

        transcriptTextView.isEditable = false
        transcriptTextView.font = NSFont.monospacedSystemFont(ofSize: 12, weight: .regular)
        transcriptTextView.drawsBackground = false
        transcriptScrollView.hasVerticalScroller = true
        transcriptScrollView.documentView = transcriptTextView
        transcriptScrollView.borderType = .bezelBorder

        draftField.placeholderString = "Type operator message"
        statusLabel.textColor = .secondaryLabelColor
        statusLabel.maximumNumberOfLines = 2
    }

    private func layoutControls() {
        let width = view.frame.width
        let margin: CGFloat = 20

        titleLabel.frame = NSRect(x: margin, y: 484, width: 240, height: 24)
        subtitleLabel.frame = NSRect(x: margin, y: 446, width: width - (margin * 2), height: 34)
        pendingLabel.frame = NSRect(x: margin, y: 424, width: width - (margin * 2), height: 18)

        transcriptScrollView.frame = NSRect(x: margin, y: 118, width: width - (margin * 2), height: 296)

        draftField.frame = NSRect(x: margin, y: 78, width: width - (margin * 2) - 104, height: 30)
        sendButton.frame = NSRect(x: width - margin - 96, y: 78, width: 96, height: 30)
        statusLabel.frame = NSRect(x: margin, y: 30, width: width - (margin * 2), height: 40)

        view.addSubview(titleLabel)
        view.addSubview(subtitleLabel)
        view.addSubview(pendingLabel)
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

        stateObserverToken = sessionController.addStateObserver { [weak self] state in
            self?.render(state: state)
        }
    }

    @objc
    private func sendDraft() {
        let didSubmit = sessionController.submitDraft(draftField.stringValue)
        if didSubmit {
            draftField.stringValue = ""
        }
    }

    private func render(state: NativeChatWindowState) {
        pendingLabel.stringValue = "Pending approvals: \(state.pendingApprovalsCount)"
        pendingLabel.textColor = state.pendingApprovalsCount > 0 ? .systemOrange : .secondaryLabelColor
        statusLabel.stringValue = state.statusText
        transcriptTextView.string = renderTranscript(messages: state.messages)
        transcriptTextView.scrollToEndOfDocument(nil)
    }

    private func renderTranscript(messages: [NativeChatMessage]) -> String {
        if messages.isEmpty {
            return "No messages yet."
        }

        return messages.map { message in
            let prefix = message.role == .operatorContext ? "You" : "Runtime"
            return "\(prefix): \(message.text)"
        }.joined(separator: "\n\n")
    }
}
