import Foundation

public enum DesktopAuthSignedOutReason: String, Equatable {
    case missingCredential = "missing_credential"
    case expiredCredential = "expired_credential"
    case invalidCredential = "invalid_credential"
    case callbackRejected = "callback_rejected"
    case unauthorizedResponse = "unauthorized_response"
    case userInitiated = "user_initiated"
    case loginLaunchFailed = "login_launch_failed"
}

public enum DesktopAuthSessionState: Equatable {
    case signedOut(reason: DesktopAuthSignedOutReason)
    case authorizing
    case authenticated(DesktopAuthCredential)
}

public enum DesktopAuthSessionControllerError: Error, Equatable {
    case authorizationURLOpenFailed
    case missingCredential
    case expiredCredential
}

public protocol DesktopAuthStateProviding: AnyObject {
    var authSessionState: DesktopAuthSessionState { get }
    var isAuthenticated: Bool { get }
    var authStatusText: String { get }
    @discardableResult
    func addAuthStateObserver(_ observer: @escaping (DesktopAuthSessionState) -> Void) -> UUID?
    func removeAuthStateObserver(_ token: UUID)
}

public extension DesktopAuthStateProviding {
    @discardableResult
    func addAuthStateObserver(_ observer: @escaping (DesktopAuthSessionState) -> Void) -> UUID? {
        _ = observer
        return nil
    }

    func removeAuthStateObserver(_ token: UUID) {
        _ = token
    }
}

public protocol DesktopAuthCredentialProviding: AnyObject {
    func activeCredential() throws -> DesktopAuthCredential
    @discardableResult
    func handleUnauthorizedResponse(statusCode: Int) -> Bool
}

public final class DesktopAuthSessionController: DesktopAuthStateProviding, DesktopAuthCredentialProviding {
    private let coordinator: DesktopAuthCoordinator
    private let now: () -> Date

    private var stateObservers: [UUID: (DesktopAuthSessionState) -> Void] = [:]

    public private(set) var authSessionState: DesktopAuthSessionState = .signedOut(reason: .missingCredential) {
        didSet {
            for observer in stateObservers.values {
                observer(authSessionState)
            }
        }
    }

    public var isAuthenticated: Bool {
        if case .authenticated = authSessionState {
            return true
        }
        return false
    }

    public var authStatusText: String {
        switch authSessionState {
        case .signedOut(reason: .missingCredential):
            return "Sign in required before running privileged actions."
        case .signedOut(reason: .expiredCredential):
            return "Session expired. Sign in again."
        case .signedOut(reason: .invalidCredential):
            return "Session invalid. Sign in again."
        case .signedOut(reason: .callbackRejected):
            return "Sign-in callback rejected. Try again."
        case .signedOut(reason: .unauthorizedResponse):
            return "Session unauthorized. Sign in again."
        case .signedOut(reason: .userInitiated):
            return "Signed out."
        case .signedOut(reason: .loginLaunchFailed):
            return "Unable to open sign-in flow."
        case .authorizing:
            return "Waiting for sign-in callback."
        case .authenticated:
            return "Signed in."
        }
    }

    public init(
        coordinator: DesktopAuthCoordinator,
        now: @escaping () -> Date = Date.init
    ) {
        self.coordinator = coordinator
        self.now = now
    }

    public func restoreSession() {
        do {
            guard let credential = try coordinator.loadStoredCredential() else {
                authSessionState = .signedOut(reason: .missingCredential)
                return
            }

            guard !isExpired(credential) else {
                try coordinator.clearSession()
                authSessionState = .signedOut(reason: .expiredCredential)
                return
            }

            authSessionState = .authenticated(credential)
        } catch {
            try? coordinator.clearSession()
            authSessionState = .signedOut(reason: .invalidCredential)
        }
    }

    @discardableResult
    public func beginLogin(
        state: String = UUID().uuidString,
        openAuthorizationURL: (URL) -> Bool
    ) throws -> URL {
        let authorizationURL = try coordinator.beginSignIn(state: state)
        guard openAuthorizationURL(authorizationURL) else {
            authSessionState = .signedOut(reason: .loginLaunchFailed)
            throw DesktopAuthSessionControllerError.authorizationURLOpenFailed
        }

        authSessionState = .authorizing
        return authorizationURL
    }

    @discardableResult
    public func handleOpenURL(_ url: URL) throws -> Bool {
        do {
            let credential = try coordinator.handleCallback(url)
            guard !isExpired(credential) else {
                try coordinator.clearSession()
                authSessionState = .signedOut(reason: .expiredCredential)
                throw DesktopAuthSessionControllerError.expiredCredential
            }

            authSessionState = .authenticated(credential)
            return true
        } catch let callbackError as DesktopAuthError where callbackError == .callbackRouteMismatch {
            return false
        } catch {
            try? coordinator.clearSession()
            authSessionState = .signedOut(reason: .callbackRejected)
            throw error
        }
    }

    public func logout() throws {
        try coordinator.clearSession()
        authSessionState = .signedOut(reason: .userInitiated)
    }

    public func activeCredential() throws -> DesktopAuthCredential {
        guard case let .authenticated(credential) = authSessionState else {
            throw DesktopAuthSessionControllerError.missingCredential
        }

        guard !isExpired(credential) else {
            try coordinator.clearSession()
            authSessionState = .signedOut(reason: .expiredCredential)
            throw DesktopAuthSessionControllerError.expiredCredential
        }

        return credential
    }

    public func authorizationHeaders() throws -> [String: String] {
        let credential = try activeCredential()
        return [
            "Authorization": "Bearer \(credential.sessionToken)",
        ]
    }

    @discardableResult
    public func handleUnauthorizedResponse(statusCode: Int) -> Bool {
        guard statusCode == 401 else {
            return false
        }

        try? coordinator.clearSession()
        authSessionState = .signedOut(reason: .unauthorizedResponse)
        return true
    }

    @discardableResult
    public func addStateObserver(_ observer: @escaping (DesktopAuthSessionState) -> Void) -> UUID {
        let token = UUID()
        stateObservers[token] = observer
        observer(authSessionState)
        return token
    }

    public func removeStateObserver(_ token: UUID) {
        stateObservers.removeValue(forKey: token)
    }

    @discardableResult
    public func addAuthStateObserver(_ observer: @escaping (DesktopAuthSessionState) -> Void) -> UUID? {
        addStateObserver(observer)
    }

    public func removeAuthStateObserver(_ token: UUID) {
        removeStateObserver(token)
    }

    private func isExpired(_ credential: DesktopAuthCredential) -> Bool {
        guard let expiresAt = credential.expiresAt else {
            return false
        }
        return now() >= expiresAt
    }
}
