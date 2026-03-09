import AVFoundation
import Foundation

public enum AVFoundationCameraCaptureProviderError: Error, Equatable {
    case permissionDenied
    case invalidSourceID
    case sessionAlreadyActive(sessionId: String)
    case sessionNotFound(sessionId: String)
    case sessionExpired(sessionId: String)
}

public final class AVFoundationCameraCaptureProvider: CameraCaptureProviding {
    public typealias AuthorizationStatusReader = () -> CapturePermissionState
    public typealias PermissionRequester = () -> Bool
    public typealias SessionIDFactory = () -> String
    public typealias Clock = () -> Date

    private struct ActiveSession {
        let sessionId: String
        let sourceId: String
        let startedAt: Date
    }

    private let maxSessionDuration: TimeInterval
    private let readAuthorizationStatus: AuthorizationStatusReader
    private let requestPermission: PermissionRequester
    private let makeSessionID: SessionIDFactory
    private let now: Clock
    private let lock = NSLock()

    private var activeSession: ActiveSession?

    public init(
        maxSessionDuration: TimeInterval = 10 * 60,
        readAuthorizationStatus: @escaping AuthorizationStatusReader = AVFoundationCameraCaptureProvider.defaultAuthorizationStatus,
        requestPermission: @escaping PermissionRequester = AVFoundationCameraCaptureProvider.defaultPermissionRequest,
        makeSessionID: @escaping SessionIDFactory = { UUID().uuidString },
        now: @escaping Clock = Date.init
    ) {
        self.maxSessionDuration = max(1, maxSessionDuration)
        self.readAuthorizationStatus = readAuthorizationStatus
        self.requestPermission = requestPermission
        self.makeSessionID = makeSessionID
        self.now = now
    }

    public func startCapture(sourceId: String) throws -> CameraCaptureSession {
        let normalizedSourceID = sourceId.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !normalizedSourceID.isEmpty else {
            throw AVFoundationCameraCaptureProviderError.invalidSourceID
        }

        guard hasCapturePermission() else {
            throw AVFoundationCameraCaptureProviderError.permissionDenied
        }

        let startedAt = now()
        let sessionID = makeSessionID().trimmingCharacters(in: .whitespacesAndNewlines)
        let resolvedSessionID = sessionID.isEmpty ? UUID().uuidString : sessionID

        lock.lock()
        defer { lock.unlock() }

        if let activeSession {
            if isExpired(activeSession, at: startedAt) {
                self.activeSession = nil
            } else {
                throw AVFoundationCameraCaptureProviderError.sessionAlreadyActive(
                    sessionId: activeSession.sessionId
                )
            }
        }

        let session = ActiveSession(
            sessionId: resolvedSessionID,
            sourceId: normalizedSourceID,
            startedAt: startedAt
        )
        activeSession = session

        return CameraCaptureSession(
            sessionId: session.sessionId,
            sourceId: session.sourceId,
            provider: "avfoundation",
            startedAt: session.startedAt,
            frameCaptureCount: 0
        )
    }

    public func stopCapture(sessionId: String) throws -> Date {
        let normalizedSessionID = sessionId.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !normalizedSessionID.isEmpty else {
            throw AVFoundationCameraCaptureProviderError.sessionNotFound(sessionId: sessionId)
        }

        let stoppedAt = now()

        lock.lock()
        defer { lock.unlock() }

        guard let activeSession else {
            throw AVFoundationCameraCaptureProviderError.sessionNotFound(sessionId: normalizedSessionID)
        }

        guard activeSession.sessionId == normalizedSessionID else {
            throw AVFoundationCameraCaptureProviderError.sessionNotFound(sessionId: normalizedSessionID)
        }

        guard !isExpired(activeSession, at: stoppedAt) else {
            self.activeSession = nil
            throw AVFoundationCameraCaptureProviderError.sessionExpired(sessionId: normalizedSessionID)
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
        switch AVCaptureDevice.authorizationStatus(for: .video) {
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
        AVCaptureDevice.requestAccess(for: .video) { decision in
            permissionBox.set(decision)
            semaphore.signal()
        }
        semaphore.wait()
        return permissionBox.get()
    }
}
