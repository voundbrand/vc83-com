import XCTest
@testable import SevenLayersMac

final class AuthDesktopAuthCoordinatorTests: XCTestCase {
    func testCoordinatorStoresCredentialAfterCallback() throws {
        let store = InMemorySessionStore()
        let config = DesktopAuthConfiguration(webBaseURL: URL(string: "https://app.vc83.test")!)
        let coordinator = DesktopAuthCoordinator(configuration: config, credentialStore: store)

        let signInURL = try coordinator.beginSignIn(state: "state-42")
        XCTAssertEqual(signInURL.path, "/auth/desktop")

        let callbackURL = URL(string: "vc83-mac://auth/callback?session_token=session-42&state=state-42")!
        let credential = try coordinator.handleCallback(callbackURL)

        XCTAssertEqual(credential.sessionToken, "session-42")
        XCTAssertEqual(try coordinator.loadStoredCredential()?.sessionToken, "session-42")
    }

    func testCoordinatorCanClearSession() throws {
        let store = InMemorySessionStore()
        let config = DesktopAuthConfiguration(webBaseURL: URL(string: "https://app.vc83.test")!)
        let coordinator = DesktopAuthCoordinator(configuration: config, credentialStore: store)

        let callbackURL = URL(string: "vc83-mac://auth/callback?session_token=session-55")!
        _ = try coordinator.handleCallback(callbackURL)
        XCTAssertNotNil(try coordinator.loadStoredCredential())

        try coordinator.clearSession()

        XCTAssertNil(try coordinator.loadStoredCredential())
    }
}

private final class InMemorySessionStore: SessionCredentialStore {
    private var credential: DesktopAuthCredential?

    func save(_ credential: DesktopAuthCredential) {
        self.credential = credential
    }

    func load() -> DesktopAuthCredential? {
        credential
    }

    func clear() {
        credential = nil
    }
}
