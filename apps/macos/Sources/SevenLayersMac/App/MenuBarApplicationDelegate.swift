import AppKit
import Foundation

public final class MenuBarApplicationDelegate: NSObject, NSApplicationDelegate {
    private var bridge: MacCompanionBridge?
    private var desktopNodeGateway: DesktopNodeGateway?
    private var quickChatSession: QuickChatSessionController?
    private var workflowRecommendationSession: WorkflowRecommendationSessionController?
    private var nativeChatSession: NativeChatWindowSessionController?
    private var nativeChatWindowController: NativeChatWindowController?
    private var popoverHost: PopoverHostController?
    private var statusItemController: StatusItemController?
    private var authCoordinator: DesktopAuthCoordinator?
    private var hotkeyController: GlobalHotkeyController?

    private var pendingApprovalsObserverToken: UUID?

    public override init() {
        super.init()
    }

    @MainActor
    public func applicationDidFinishLaunching(_ notification: Notification) {
        let bridge = MacCompanionBridge()
        let quickChatSession = QuickChatSessionController(bridge: bridge)
        let nativeChatSession = NativeChatWindowSessionController(
            quickChatSession: quickChatSession
        )
        let nativeChatWindowController = NativeChatWindowController(
            sessionController: nativeChatSession
        )
        let workflowRecommendationSession = WorkflowRecommendationSessionController(
            activityMonitor: NSWorkspaceApplicationMonitor(),
            recommendationEngine: AgenticWorkflowRecommendationEngine()
        )
        let desktopNodeGateway = DesktopNodeGateway(bridge: bridge)
        let popoverHost = PopoverHostController(
            quickChatSession: quickChatSession,
            workflowSession: workflowRecommendationSession,
            dashboardOpener: makeDashboardOpener(),
            chatWindowOpener: nativeChatWindowController,
            diagnosticsProvider: desktopNodeGateway
        )
        let statusController = StatusItemController(
            popoverHost: popoverHost,
            onQuit: { NSApplication.shared.terminate(nil) }
        )
        let authCoordinator = makeDefaultAuthCoordinator()

        let hotkeyController = GlobalHotkeyController { [weak statusController] in
            Task { @MainActor [weak statusController] in
                statusController?.togglePopoverFromHotkey()
            }
        }

        self.bridge = bridge
        self.desktopNodeGateway = desktopNodeGateway
        self.quickChatSession = quickChatSession
        self.workflowRecommendationSession = workflowRecommendationSession
        self.nativeChatSession = nativeChatSession
        self.nativeChatWindowController = nativeChatWindowController
        self.popoverHost = popoverHost
        self.statusItemController = statusController
        self.authCoordinator = authCoordinator
        self.hotkeyController = hotkeyController

        pendingApprovalsObserverToken = quickChatSession.addPendingApprovalsObserver { [weak statusController] count in
            statusController?.updatePendingApprovals(count)
        }

        statusController.install()
        hotkeyController.start()
    }

    @MainActor
    public func applicationWillTerminate(_ notification: Notification) {
        if let pendingApprovalsObserverToken, let quickChatSession {
            quickChatSession.removePendingApprovalsObserver(pendingApprovalsObserverToken)
            self.pendingApprovalsObserverToken = nil
        }

        hotkeyController?.stop()
    }

    @MainActor
    public func application(_ application: NSApplication, open urls: [URL]) {
        guard let authCoordinator else {
            return
        }

        for url in urls {
            do {
                _ = try authCoordinator.handleCallback(url)
            } catch {
                NSLog("SevenLayersMac auth callback rejected for URL %@: %@", url.absoluteString, String(describing: error))
            }
        }
    }

    @MainActor
    private func makeDashboardOpener() -> DashboardDeepLinkOpener {
        let config = DashboardDeepLinkConfiguration(webBaseURL: URL(string: "https://vc83.app")!)
        return DashboardDeepLinkOpener(configuration: config)
    }

    private func makeDefaultAuthCoordinator() -> DesktopAuthCoordinator {
        let webBaseURL = URL(string: "https://vc83.app")!
        let config = DesktopAuthConfiguration(webBaseURL: webBaseURL)
        return DesktopAuthCoordinator(configuration: config)
    }
}
