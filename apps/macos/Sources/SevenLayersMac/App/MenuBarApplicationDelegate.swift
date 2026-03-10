import AppKit
import Foundation

public final class MenuBarApplicationDelegate: NSObject, NSApplicationDelegate {
    private struct CaptureAuthorizationContext {
        let gate: any CaptureApprovalGating
        let approvalToken: CaptureApprovalToken?
    }

    private var bridge: MacCompanionBridge?
    private var desktopNodeGateway: DesktopNodeGateway?
    private var mediaRuntimeController: NativeChatMediaRuntimeController?
    private var quickChatSession: QuickChatSessionController?
    private var workflowRecommendationSession: WorkflowRecommendationSessionController?
    private var nativeChatSession: NativeChatWindowSessionController?
    private var nativeChatWindowController: NativeChatWindowController?
    private var popoverHost: PopoverHostController?
    private var statusItemController: StatusItemController?
    private var authSessionController: DesktopAuthSessionController?
    private var authHTTPClient: DesktopAuthHTTPClient?
    private var hotkeyController: GlobalHotkeyController?

    private var pendingApprovalsObserverToken: UUID?

    public override init() {
        super.init()
    }

    @MainActor
    public func applicationDidFinishLaunching(_ notification: Notification) {
        let bridge = MacCompanionBridge()
        let authCoordinator = makeDefaultAuthCoordinator()
        let authSessionController = DesktopAuthSessionController(coordinator: authCoordinator)
        authSessionController.restoreSession()
        let authHTTPClient = DesktopAuthHTTPClient(
            requestAuthorizer: DesktopAuthRequestAuthorizer(
                credentialProvider: authSessionController
            )
        )
        let captureAuthorization = makeCaptureAuthorizationContext()
        let quickChatSession = QuickChatSessionController(
            bridge: bridge,
            authStateProvider: authSessionController
        )
        let nativeChatSession = NativeChatWindowSessionController(
            quickChatSession: quickChatSession
        )
        let desktopNodeGateway = DesktopNodeGateway(
            bridge: bridge,
            captureApprovalGate: captureAuthorization.gate,
            screenCaptureProvider: CoreGraphicsScreenCaptureProvider()
        )
        let voiceRuntime = DesktopVoiceRuntimeLoop(
            bridge: bridge,
            microphoneConnector: MicrophoneCaptureConnector(
                provider: AVFoundationMicrophoneCaptureProvider(),
                approvalGate: captureAuthorization.gate
            )
        )
        let mediaRuntimeController = NativeChatMediaRuntimeController(
            voiceRuntime: voiceRuntime,
            cameraConnector: CameraCaptureConnector(
                provider: AVFoundationCameraCaptureProvider(),
                approvalGate: captureAuthorization.gate
            ),
            screenGateway: desktopNodeGateway,
            sourceCatalog: CoreGraphicsCaptureSourceCatalog(),
            liveSessionId: "macos_native_chat_\(UUID().uuidString)",
            approvalTokenProvider: { captureAuthorization.approvalToken },
            authStateProvider: authSessionController
        )
        let nativeChatWindowController = NativeChatWindowController(
            sessionController: nativeChatSession,
            mediaRuntimeController: mediaRuntimeController,
            authStateProvider: authSessionController,
            onSignIn: { [weak self] in
                self?.startLoginFlow()
            },
            onSignOut: { [weak self] in
                self?.signOut()
            }
        )
        let workflowRecommendationSession = WorkflowRecommendationSessionController(
            activityMonitor: NSWorkspaceApplicationMonitor(),
            recommendationEngine: AgenticWorkflowRecommendationEngine()
        )
        let popoverHost = PopoverHostController(
            quickChatSession: quickChatSession,
            workflowSession: workflowRecommendationSession,
            dashboardOpener: makeDashboardOpener(),
            chatWindowOpener: nativeChatWindowController,
            diagnosticsProvider: desktopNodeGateway,
            authStateProvider: authSessionController,
            onSignIn: { [weak self] in
                self?.startLoginFlow()
            },
            onSignOut: { [weak self] in
                self?.signOut()
            }
        )
        let statusController = StatusItemController(
            popoverHost: popoverHost,
            authStateProvider: authSessionController,
            onSignIn: { [weak self] in
                self?.startLoginFlow()
            },
            onSignOut: { [weak self] in
                self?.signOut()
            },
            onPrimaryAction: { [weak nativeChatWindowController] in
                nativeChatWindowController?.openNativeChatWindow()
            },
            onQuit: { NSApplication.shared.terminate(nil) }
        )

        let hotkeyController = GlobalHotkeyController { [weak statusController] in
            Task { @MainActor [weak statusController] in
                statusController?.togglePopoverFromHotkey()
            }
        }

        self.bridge = bridge
        self.desktopNodeGateway = desktopNodeGateway
        self.mediaRuntimeController = mediaRuntimeController
        self.quickChatSession = quickChatSession
        self.workflowRecommendationSession = workflowRecommendationSession
        self.nativeChatSession = nativeChatSession
        self.nativeChatWindowController = nativeChatWindowController
        self.popoverHost = popoverHost
        self.statusItemController = statusController
        self.authSessionController = authSessionController
        self.authHTTPClient = authHTTPClient
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
        guard let authSessionController else {
            return
        }

        for url in urls {
            do {
                _ = try authSessionController.handleOpenURL(url)
            } catch {
                NSLog("SevenLayersMac auth callback rejected for URL %@: %@", url.absoluteString, String(describing: error))
            }
        }
    }

    @MainActor
    private func startLoginFlow() {
        guard let authSessionController else {
            return
        }

        do {
            _ = try authSessionController.beginLogin { NSWorkspace.shared.open($0) }
        } catch {
            NSLog("SevenLayersMac failed to start login flow: %@", String(describing: error))
        }
    }

    @MainActor
    private func signOut() {
        guard let authSessionController else {
            return
        }

        do {
            try authSessionController.logout()
        } catch {
            NSLog("SevenLayersMac failed to sign out: %@", String(describing: error))
        }
    }

    @MainActor
    private func makeDashboardOpener() -> DashboardDeepLinkOpener {
        let config = DashboardDeepLinkConfiguration(webBaseURL: URL(string: "https://app.l4yercak3.com")!)
        return DashboardDeepLinkOpener(configuration: config)
    }

    private func makeDefaultAuthCoordinator() -> DesktopAuthCoordinator {
        let webBaseURL = URL(string: "https://app.l4yercak3.com")!
        let config = DesktopAuthConfiguration(webBaseURL: webBaseURL)
        return DesktopAuthCoordinator(configuration: config)
    }

    private func makeCaptureAuthorizationContext(
        processInfo: ProcessInfo = .processInfo
    ) -> CaptureAuthorizationContext {
        let environment = processInfo.environment
        let tokenID = normalizedNonEmpty(environment["SEVENLAYERS_CAPTURE_APPROVAL_TOKEN_ID"])
        let tokenClass = normalizedNonEmpty(environment["SEVENLAYERS_CAPTURE_APPROVAL_TOKEN_CLASS"])
            ?? CaptureApprovalToken.requiredTokenClass
        let enabledCapabilities = parseEnabledCaptureCapabilities(
            normalizedNonEmpty(environment["SEVENLAYERS_CAPTURE_ENABLED_CAPABILITIES"])
        )

        guard let tokenID,
              !enabledCapabilities.isEmpty,
              tokenClass == CaptureApprovalToken.requiredTokenClass
        else {
            return CaptureAuthorizationContext(
                gate: FailClosedCaptureApprovalGate(),
                approvalToken: nil
            )
        }

        let approvalToken = CaptureApprovalToken(
            id: tokenID,
            tokenClass: tokenClass
        )

        return CaptureAuthorizationContext(
            gate: StaticCaptureApprovalGate(
                enabledCapabilities: enabledCapabilities,
                acceptedTokenIDs: [approvalToken.id]
            ),
            approvalToken: approvalToken
        )
    }

    private func parseEnabledCaptureCapabilities(_ raw: String?) -> Set<CaptureCapability> {
        guard let raw else {
            return []
        }

        let items = raw
            .split(separator: ",")
            .map { $0.trimmingCharacters(in: .whitespacesAndNewlines).lowercased() }
            .filter { !$0.isEmpty }

        var capabilities: Set<CaptureCapability> = []

        for item in items {
            switch item {
            case "screen_snapshot", "screen-snapshot", "snapshot", "screen":
                capabilities.insert(.screenSnapshot)
            case "screen_record", "screen-record", "record":
                capabilities.insert(.screenRecord)
            case "camera", "video":
                capabilities.insert(.camera)
            case "microphone", "mic", "voice", "audio":
                capabilities.insert(.microphone)
            default:
                continue
            }
        }

        return capabilities
    }

    private func normalizedNonEmpty(_ raw: String?) -> String? {
        guard let raw else {
            return nil
        }
        let normalized = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        return normalized.isEmpty ? nil : normalized
    }
}
