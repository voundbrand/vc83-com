import Foundation

public enum NativeChatMediaPipelineState: Equatable {
    case idle
    case requestingPermission
    case active
    case error(String)
}

public struct NativeChatMediaRuntimeState: Equatable {
    public let liveSessionId: String
    public let voice: NativeChatMediaPipelineState
    public let video: NativeChatMediaPipelineState

    public init(
        liveSessionId: String,
        voice: NativeChatMediaPipelineState = .idle,
        video: NativeChatMediaPipelineState = .idle
    ) {
        self.liveSessionId = liveSessionId
        self.voice = voice
        self.video = video
    }
}

public enum NativeChatMediaRuntimeError: Error, Equatable {
    case authenticationRequired(String)
}

public protocol DesktopVoiceRuntimeControlling: AnyObject {
    var state: DesktopVoiceRuntimeState { get }
    func beginPushToTalk(_ request: DesktopVoiceActivationRequest) throws
    func endPushToTalk() throws
}

extension DesktopVoiceRuntimeLoop: DesktopVoiceRuntimeControlling {}

public protocol DesktopScreenSnapshotExecuting {
    func captureScreenSnapshot(
        _ invocation: DesktopScreenSnapshotInvocation
    ) throws -> DesktopScreenSnapshotExecution
}

extension DesktopNodeGateway: DesktopScreenSnapshotExecuting {}

@MainActor
public final class NativeChatMediaRuntimeController {
    private let voiceRuntime: any DesktopVoiceRuntimeControlling
    private let cameraConnector: CameraCaptureConnector
    private let screenGateway: any DesktopScreenSnapshotExecuting
    private let sourceCatalog: any ScreenCaptureSourceListing
    private let approvalTokenProvider: () -> CaptureApprovalToken?
    private let authStateProvider: (any DesktopAuthStateProviding)?

    private var stateObservers: [UUID: (NativeChatMediaRuntimeState) -> Void] = [:]
    private var activeCameraSession: CameraCaptureSession?

    public private(set) var state: NativeChatMediaRuntimeState {
        didSet {
            for observer in stateObservers.values {
                observer(state)
            }
        }
    }

    public init(
        voiceRuntime: any DesktopVoiceRuntimeControlling,
        cameraConnector: CameraCaptureConnector,
        screenGateway: any DesktopScreenSnapshotExecuting,
        sourceCatalog: any ScreenCaptureSourceListing,
        liveSessionId: String = "macos_live_\(UUID().uuidString)",
        approvalTokenProvider: @escaping () -> CaptureApprovalToken?,
        authStateProvider: (any DesktopAuthStateProviding)? = nil
    ) {
        self.voiceRuntime = voiceRuntime
        self.cameraConnector = cameraConnector
        self.screenGateway = screenGateway
        self.sourceCatalog = sourceCatalog
        self.approvalTokenProvider = approvalTokenProvider
        self.authStateProvider = authStateProvider
        self.state = NativeChatMediaRuntimeState(liveSessionId: liveSessionId)
    }

    @discardableResult
    public func addStateObserver(_ observer: @escaping (NativeChatMediaRuntimeState) -> Void) -> UUID {
        let token = UUID()
        stateObservers[token] = observer
        observer(state)
        return token
    }

    public func removeStateObserver(_ token: UUID) {
        stateObservers.removeValue(forKey: token)
    }

    public func listCaptureSources() -> [ScreenCaptureSourceDescriptor] {
        sourceCatalog.listCaptureSources()
    }

    @discardableResult
    public func toggleVoiceCapture() -> String {
        if state.voice == .active {
            return stopVoiceCapture()
        }

        if let authFailureMessage = resolveAuthenticationFailureMessage() {
            mutateVoiceState(.error(authFailureMessage))
            return authFailureMessage
        }

        return startVoiceCapture()
    }

    @discardableResult
    public func toggleVideoCapture() -> String {
        if state.video == .active {
            return stopVideoCapture()
        }

        if let authFailureMessage = resolveAuthenticationFailureMessage() {
            mutateVideoState(.error(authFailureMessage))
            return authFailureMessage
        }

        return startVideoCapture()
    }

    public func captureSnapshot(sourceId: String) throws -> DesktopScreenSnapshotExecution {
        if let authFailureMessage = resolveAuthenticationFailureMessage() {
            throw NativeChatMediaRuntimeError.authenticationRequired(authFailureMessage)
        }

        return try screenGateway.captureScreenSnapshot(
            DesktopScreenSnapshotInvocation(
                liveSessionID: state.liveSessionId,
                sourceID: sourceId,
                approvalToken: approvalTokenProvider()
            )
        )
    }

    public func describe(error: Error) -> String {
        switch error {
        case let authError as NativeChatMediaRuntimeError:
            switch authError {
            case let .authenticationRequired(message):
                return message
            }
        case let captureError as CaptureConnectorError:
            switch captureError {
            case .missingLiveSessionId:
                return "Live session ID is required."
            case let .capabilityDisabled(capability):
                return "Capability disabled by policy: \(capability.rawValue)."
            case let .approvalRequired(capability):
                return "Approval required for \(capability.rawValue)."
            case .invalidApprovalTokenClass:
                return "Approval token class rejected by policy."
            case .approvalRejected:
                return "Approval token rejected by policy."
            }
        case let cameraError as AVFoundationCameraCaptureProviderError:
            switch cameraError {
            case .permissionDenied:
                return "Camera permission denied."
            case .invalidSourceID:
                return "Camera source is invalid."
            case .sessionAlreadyActive:
                return "Camera session already active."
            case .sessionNotFound:
                return "Camera session was not found."
            case .sessionExpired:
                return "Camera session expired."
            }
        case let microphoneError as AVFoundationMicrophoneCaptureProviderError:
            switch microphoneError {
            case .permissionDenied:
                return "Microphone permission denied."
            case .sessionAlreadyActive:
                return "Microphone session already active."
            case .sessionNotFound:
                return "Microphone session was not found."
            case .sessionExpired:
                return "Microphone session expired."
            }
        case let voiceError as DesktopVoiceRuntimeLoopError:
            switch voiceError {
            case .wakeLoopNotArmed:
                return "Wake loop is not armed."
            case .activeCaptureMissing:
                return "Voice capture is not active."
            case .emptyTranscript:
                return "Transcript frame cannot be empty."
            case .missingApprovalArtifact:
                return "Approval artifact missing for voice pipeline."
            }
        default:
            return String(describing: error)
        }
    }

    @discardableResult
    public func stopAllActivePipelines() -> [String] {
        var events: [String] = []

        if state.voice == .active {
            events.append(stopVoiceCapture())
        }
        if state.video == .active {
            events.append(stopVideoCapture())
        }

        return events
    }

    private func startVoiceCapture() -> String {
        mutateVoiceState(.requestingPermission)

        do {
            try voiceRuntime.beginPushToTalk(
                DesktopVoiceActivationRequest(
                    liveSessionId: state.liveSessionId,
                    approvalToken: approvalTokenProvider(),
                    sourceId: "desktop:native_chat",
                    providerId: "avfoundation"
                )
            )
            mutateVoiceState(.active)
            return "Voice runtime active."
        } catch {
            let message = describe(error: error)
            mutateVoiceState(.error(message))
            return "Voice runtime failed: \(message)"
        }
    }

    private func stopVoiceCapture() -> String {
        do {
            try voiceRuntime.endPushToTalk()
            mutateVoiceState(.idle)
            return "Voice runtime idle."
        } catch {
            let message = describe(error: error)
            mutateVoiceState(.error(message))
            return "Voice runtime stop failed: \(message)"
        }
    }

    private func startVideoCapture() -> String {
        mutateVideoState(.requestingPermission)

        do {
            let result = try cameraConnector.startCapture(
                CameraCaptureStartRequest(
                    liveSessionId: state.liveSessionId,
                    sourceId: "webcam:primary",
                    approvalToken: approvalTokenProvider()
                )
            )

            activeCameraSession = result.session
            mutateVideoState(.active)
            return "Video runtime active."
        } catch {
            let message = describe(error: error)
            mutateVideoState(.error(message))
            return "Video runtime failed: \(message)"
        }
    }

    private func stopVideoCapture() -> String {
        guard let activeCameraSession else {
            mutateVideoState(.idle)
            return "Video runtime idle."
        }

        do {
            _ = try cameraConnector.stopCapture(
                CameraCaptureStopRequest(
                    liveSessionId: state.liveSessionId,
                    sessionId: activeCameraSession.sessionId,
                    frameCaptureCount: activeCameraSession.frameCaptureCount,
                    approvalToken: approvalTokenProvider()
                )
            )

            self.activeCameraSession = nil
            mutateVideoState(.idle)
            return "Video runtime idle."
        } catch {
            let message = describe(error: error)
            mutateVideoState(.error(message))
            return "Video runtime stop failed: \(message)"
        }
    }

    private func mutateVoiceState(_ nextState: NativeChatMediaPipelineState) {
        state = NativeChatMediaRuntimeState(
            liveSessionId: state.liveSessionId,
            voice: nextState,
            video: state.video
        )
    }

    private func mutateVideoState(_ nextState: NativeChatMediaPipelineState) {
        state = NativeChatMediaRuntimeState(
            liveSessionId: state.liveSessionId,
            voice: state.voice,
            video: nextState
        )
    }

    private func resolveAuthenticationFailureMessage() -> String? {
        guard let authStateProvider else {
            return nil
        }
        guard !authStateProvider.isAuthenticated else {
            return nil
        }
        return authStateProvider.authStatusText
    }
}
