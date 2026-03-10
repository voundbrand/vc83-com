import Foundation
import XCTest
@testable import SevenLayersMac

final class AuthDesktopAuthSessionControllerTests: XCTestCase {
    func testRestoreSessionWithoutCredentialFailsClosed() {
        let store = InMemorySessionCredentialStore()
        let controller = makeController(store: store)

        controller.restoreSession()

        XCTAssertEqual(
            controller.authSessionState,
            .signedOut(reason: .missingCredential)
        )
        XCTAssertFalse(controller.isAuthenticated)
    }

    func testRestoreSessionClearsExpiredCredential() throws {
        let store = InMemorySessionCredentialStore()
        let controller = makeController(
            store: store,
            now: { Date(timeIntervalSince1970: 1_700_000_100) }
        )
        store.save(
            DesktopAuthCredential(
                sessionToken: "session-expired",
                refreshToken: nil,
                expiresAt: Date(timeIntervalSince1970: 1_700_000_000),
                issuedAt: Date(timeIntervalSince1970: 1_699_999_000)
            )
        )

        controller.restoreSession()

        XCTAssertEqual(
            controller.authSessionState,
            .signedOut(reason: .expiredCredential)
        )
        XCTAssertNil(store.load())
    }

    func testBeginLoginAndCallbackTransitionToAuthenticated() throws {
        let store = InMemorySessionCredentialStore()
        let controller = makeController(store: store)
        var observedStates: [DesktopAuthSessionState] = []
        _ = controller.addStateObserver { observedStates.append($0) }

        var openedURLs: [URL] = []
        let signInURL = try controller.beginLogin(state: "state-auth-1") { url in
            openedURLs.append(url)
            return true
        }

        XCTAssertEqual(signInURL, openedURLs.first)
        XCTAssertEqual(controller.authSessionState, .authorizing)

        let callbackURL = URL(
            string: "vc83-mac://auth/callback?session_token=session-auth-1&state=state-auth-1"
        )!
        let handled = try controller.handleOpenURL(callbackURL)

        XCTAssertTrue(handled)
        XCTAssertTrue(controller.isAuthenticated)

        guard case let .authenticated(credential) = controller.authSessionState else {
            XCTFail("Expected authenticated auth session state.")
            return
        }
        XCTAssertEqual(credential.sessionToken, "session-auth-1")
        XCTAssertEqual(store.load()?.sessionToken, "session-auth-1")

        XCTAssertEqual(observedStates.count, 3)
        XCTAssertEqual(observedStates[0], .signedOut(reason: .missingCredential))
        XCTAssertEqual(observedStates[1], .authorizing)
        if case let .authenticated(observedCredential) = observedStates[2] {
            XCTAssertEqual(observedCredential.sessionToken, "session-auth-1")
        } else {
            XCTFail("Expected third state to be authenticated.")
        }
    }

    func testHandleCallbackStateMismatchFailsClosed() throws {
        let store = InMemorySessionCredentialStore()
        let controller = makeController(store: store)
        _ = try controller.beginLogin(state: "expected-state") { _ in true }

        let callbackURL = URL(
            string: "vc83-mac://auth/callback?session_token=session-1&state=wrong-state"
        )!

        XCTAssertThrowsError(try controller.handleOpenURL(callbackURL))
        XCTAssertEqual(
            controller.authSessionState,
            .signedOut(reason: .callbackRejected)
        )
        XCTAssertNil(store.load())
    }

    func testBeginLoginCanBeRetriedWhileAuthorizing() throws {
        let store = InMemorySessionCredentialStore()
        let controller = makeController(store: store)

        let firstURL = try controller.beginLogin(state: "first-state") { _ in true }
        XCTAssertEqual(controller.authSessionState, .authorizing)

        let retryURL = try controller.beginLogin(state: "retry-state") { _ in true }
        XCTAssertEqual(controller.authSessionState, .authorizing)

        let firstQuery = try XCTUnwrap(URLComponents(url: firstURL, resolvingAgainstBaseURL: false)?.queryItems)
        let retryQuery = try XCTUnwrap(URLComponents(url: retryURL, resolvingAgainstBaseURL: false)?.queryItems)
        XCTAssertNotEqual(
            firstQuery.first(where: { $0.name == "state" })?.value,
            retryQuery.first(where: { $0.name == "state" })?.value
        )
    }

    func testBeginLoginSupportsPerLoginProviderSelection() throws {
        let store = InMemorySessionCredentialStore()
        let controller = makeController(store: store)

        let signInURL = try controller.beginLogin(
            state: "provider-state-1",
            provider: .github
        ) { _ in true }

        let queryItems = try XCTUnwrap(
            URLComponents(url: signInURL, resolvingAgainstBaseURL: false)?.queryItems
        )
        let query = Dictionary(uniqueKeysWithValues: queryItems.map { ($0.name, $0.value ?? "") })

        XCTAssertEqual(query["provider"], "github")
        XCTAssertEqual(query["state"], "provider-state-1")
    }

    func testCompleteAuthorizingStateWithoutCallbackSetsSignedOutReason() throws {
        let store = InMemorySessionCredentialStore()
        let controller = makeController(store: store)
        _ = try controller.beginLogin(state: "state-cancel-1") { _ in true }

        controller.completeAuthorizingStateWithoutCallback(reason: .userInitiated)

        XCTAssertEqual(controller.authSessionState, .signedOut(reason: .userInitiated))
    }

    private func makeController(
        store: InMemorySessionCredentialStore,
        now: @escaping () -> Date = Date.init
    ) -> DesktopAuthSessionController {
        let configuration = DesktopAuthConfiguration(webBaseURL: URL(string: "https://app.vc83.test")!)
        let coordinator = DesktopAuthCoordinator(
            configuration: configuration,
            credentialStore: store
        )
        return DesktopAuthSessionController(
            coordinator: coordinator,
            now: now
        )
    }
}

private final class InMemorySessionCredentialStore: SessionCredentialStore {
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
