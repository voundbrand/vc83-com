import AVFoundation
import Foundation

public enum AVFoundationMicrophoneCaptureProviderError: Error, Equatable {
    case permissionDenied
    case sessionAlreadyActive(voiceSessionId: String)
    case sessionNotFound(voiceSessionId: String)
    case sessionExpired(voiceSessionId: String)
}

public final class AVFoundationMicrophoneCaptureProvider: MicrophoneCaptureProviding {
    public typealias AuthorizationStatusReader = () -> CapturePermissionState
    public typealias PermissionRequester = () -> Bool
    public typealias VoiceSessionIDFactory = () -> String
    public typealias Clock = () -> Date

    private struct ActiveSession {
        let voiceSessionId: String
        let startedAt: Date
    }

    private let maxSessionDuration: TimeInterval
    private let readAuthorizationStatus: AuthorizationStatusReader
    private let requestPermission: PermissionRequester
    private let makeVoiceSessionID: VoiceSessionIDFactory
    private let now: Clock
    private let lock = NSLock()

    private var activeSession: ActiveSession?

    public init(
        maxSessionDuration: TimeInterval = 10 * 60,
        readAuthorizationStatus: @escaping AuthorizationStatusReader = AVFoundationMicrophoneCaptureProvider.defaultAuthorizationStatus,
        requestPermission: @escaping PermissionRequester = AVFoundationMicrophoneCaptureProvider.defaultPermissionRequest,
        makeVoiceSessionID: @escaping VoiceSessionIDFactory = { UUID().uuidString },
        now: @escaping Clock = Date.init
    ) {
        self.maxSessionDuration = max(1, maxSessionDuration)
        self.readAuthorizationStatus = readAuthorizationStatus
        self.requestPermission = requestPermission
        self.makeVoiceSessionID = makeVoiceSessionID
        self.now = now
    }

    public func startCapture() throws -> MicrophoneCaptureSession {
        guard hasCapturePermission() else {
            throw AVFoundationMicrophoneCaptureProviderError.permissionDenied
        }

        let startedAt = now()
        let voiceSessionID = makeVoiceSessionID().trimmingCharacters(in: .whitespacesAndNewlines)
        let resolvedVoiceSessionID = voiceSessionID.isEmpty ? UUID().uuidString : voiceSessionID

        lock.lock()
        defer { lock.unlock() }

        if let activeSession {
            if isExpired(activeSession, at: startedAt) {
                self.activeSession = nil
            } else {
                throw AVFoundationMicrophoneCaptureProviderError.sessionAlreadyActive(
                    voiceSessionId: activeSession.voiceSessionId
                )
            }
        }

        let session = ActiveSession(
            voiceSessionId: resolvedVoiceSessionID,
            startedAt: startedAt
        )
        activeSession = session

        return MicrophoneCaptureSession(
            voiceSessionId: session.voiceSessionId,
            startedAt: session.startedAt
        )
    }

    public func stopCapture(voiceSessionId: String) throws -> Date {
        let normalizedVoiceSessionID = voiceSessionId.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !normalizedVoiceSessionID.isEmpty else {
            throw AVFoundationMicrophoneCaptureProviderError.sessionNotFound(
                voiceSessionId: voiceSessionId
            )
        }

        let stoppedAt = now()

        lock.lock()
        defer { lock.unlock() }

        guard let activeSession else {
            throw AVFoundationMicrophoneCaptureProviderError.sessionNotFound(
                voiceSessionId: normalizedVoiceSessionID
            )
        }

        guard activeSession.voiceSessionId == normalizedVoiceSessionID else {
            throw AVFoundationMicrophoneCaptureProviderError.sessionNotFound(
                voiceSessionId: normalizedVoiceSessionID
            )
        }

        guard !isExpired(activeSession, at: stoppedAt) else {
            self.activeSession = nil
            throw AVFoundationMicrophoneCaptureProviderError.sessionExpired(
                voiceSessionId: normalizedVoiceSessionID
            )
        }

        self.activeSession = nil
        return stoppedAt
    }

    private func isExpired(_ session: ActiveSession, at moment: Date) -> Bool {
        moment.timeIntervalSince(session.startedAt) > maxSessionDuration
    }

    private func hasCapturePermission() -> Bool {
        switch readAuthorizationStatus() {
        case .authorized:
            return true
        case .notDetermined:
            return requestPermission()
        case .denied, .restricted:
            return false
        }
    }

    public static func defaultAuthorizationStatus() -> CapturePermissionState {
        switch AVCaptureDevice.authorizationStatus(for: .audio) {
        case .authorized:
            return .authorized
        case .notDetermined:
            return .notDetermined
        case .denied:
            return .denied
        case .restricted:
            return .restricted
        @unknown default:
            return .denied
        }
    }

    public static func defaultPermissionRequest() -> Bool {
        final class PermissionBox: @unchecked Sendable {
            private let lock = NSLock()
            private var value: Bool = false

            func set(_ value: Bool) {
                lock.lock()
                self.value = value
                lock.unlock()
            }

            func get() -> Bool {
                lock.lock()
                defer { lock.unlock() }
                return value
            }
        }

        let permissionBox = PermissionBox()
        let semaphore = DispatchSemaphore(value: 0)
        AVCaptureDevice.requestAccess(for: .audio) { decision in
            permissionBox.set(decision)
            semaphore.signal()
        }
        semaphore.wait()
        return permissionBox.get()
    }
}
