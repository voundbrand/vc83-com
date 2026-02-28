import Foundation

public final class DesktopAuthCoordinator {
    private let urlBuilder: DesktopAuthURLBuilder
    private let callbackParser: DesktopAuthCallbackParser
    private let credentialStore: SessionCredentialStore

    private var pendingState: String?

    public init(
        urlBuilder: DesktopAuthURLBuilder,
        callbackParser: DesktopAuthCallbackParser,
        credentialStore: SessionCredentialStore
    ) {
        self.urlBuilder = urlBuilder
        self.callbackParser = callbackParser
        self.credentialStore = credentialStore
    }

    public convenience init(
        configuration: DesktopAuthConfiguration,
        credentialStore: SessionCredentialStore = KeychainSessionCredentialStore()
    ) {
        self.init(
            urlBuilder: DesktopAuthURLBuilder(configuration: configuration),
            callbackParser: DesktopAuthCallbackParser(configuration: configuration),
            credentialStore: credentialStore
        )
    }

    public func beginSignIn(state: String = UUID().uuidString) throws -> URL {
        pendingState = state
        return try urlBuilder.makeAuthorizationURL(state: state)
    }

    public func handleCallback(_ callbackURL: URL) throws -> DesktopAuthCredential {
        let payload = try callbackParser.parse(callbackURL, expectedState: pendingState)

        let credential = DesktopAuthCredential(
            sessionToken: payload.sessionToken,
            refreshToken: payload.refreshToken,
            expiresAt: payload.expiresAt,
            issuedAt: Date()
        )

        try credentialStore.save(credential)
        pendingState = nil
        return credential
    }

    public func loadStoredCredential() throws -> DesktopAuthCredential? {
        try credentialStore.load()
    }

    public func clearSession() throws {
        pendingState = nil
        try credentialStore.clear()
    }
}
