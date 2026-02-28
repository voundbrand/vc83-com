import Foundation

public struct DesktopAuthConfiguration: Equatable {
    public let webBaseURL: URL
    public let callbackScheme: String
    public let callbackHost: String
    public let callbackPath: String

    public init(
        webBaseURL: URL,
        callbackScheme: String = "vc83-mac",
        callbackHost: String = "auth",
        callbackPath: String = "/callback"
    ) {
        self.webBaseURL = webBaseURL
        self.callbackScheme = callbackScheme.lowercased()
        self.callbackHost = callbackHost.lowercased()
        self.callbackPath = callbackPath.hasPrefix("/") ? callbackPath : "/\(callbackPath)"
    }

    public var callbackURL: URL {
        var components = URLComponents()
        components.scheme = callbackScheme
        components.host = callbackHost
        components.path = callbackPath
        return components.url!
    }
}

public struct DesktopAuthCallbackPayload: Equatable {
    public let sessionToken: String
    public let refreshToken: String?
    public let state: String?
    public let expiresAt: Date?

    public init(sessionToken: String, refreshToken: String?, state: String?, expiresAt: Date?) {
        self.sessionToken = sessionToken
        self.refreshToken = refreshToken
        self.state = state
        self.expiresAt = expiresAt
    }
}

public struct DesktopAuthCredential: Codable, Equatable {
    public let sessionToken: String
    public let refreshToken: String?
    public let expiresAt: Date?
    public let issuedAt: Date

    public init(sessionToken: String, refreshToken: String?, expiresAt: Date?, issuedAt: Date) {
        self.sessionToken = sessionToken
        self.refreshToken = refreshToken
        self.expiresAt = expiresAt
        self.issuedAt = issuedAt
    }
}

public enum DesktopAuthError: Error, Equatable {
    case invalidAuthorizationURL
    case callbackRouteMismatch
    case missingQueryItem(String)
    case malformedExpiration
    case stateMismatch(expected: String, received: String?)
}

public protocol SessionCredentialStore {
    func save(_ credential: DesktopAuthCredential) throws
    func load() throws -> DesktopAuthCredential?
    func clear() throws
}
