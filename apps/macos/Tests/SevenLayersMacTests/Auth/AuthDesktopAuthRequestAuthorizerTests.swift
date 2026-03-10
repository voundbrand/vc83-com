import Foundation
import XCTest
@testable import SevenLayersMac

final class AuthDesktopAuthRequestAuthorizerTests: XCTestCase {
    func testAuthorizeInjectsBearerHeader() throws {
        let store = RequestAuthInMemorySessionStore()
        store.save(
            DesktopAuthCredential(
                sessionToken: "session-token-1",
                refreshToken: nil,
                expiresAt: Date(timeIntervalSince1970: 1_900_000_000),
                issuedAt: Date(timeIntervalSince1970: 1_700_000_000)
            )
        )
        let sessionController = makeSessionController(
            store: store,
            now: { Date(timeIntervalSince1970: 1_700_000_001) }
        )
        sessionController.restoreSession()
        let authorizer = DesktopAuthRequestAuthorizer(credentialProvider: sessionController)

        let request = URLRequest(url: URL(string: "https://api.vc83.test/v1/ping")!)
        let authorizedRequest = try authorizer.authorize(request)

        XCTAssertEqual(
            authorizedRequest.value(forHTTPHeaderField: "Authorization"),
            "Bearer session-token-1"
        )
    }

    func testAuthorizeFailsClosedWithoutCredential() {
        let store = RequestAuthInMemorySessionStore()
        let sessionController = makeSessionController(store: store)
        sessionController.restoreSession()
        let authorizer = DesktopAuthRequestAuthorizer(credentialProvider: sessionController)
        let request = URLRequest(url: URL(string: "https://api.vc83.test/v1/ping")!)

        XCTAssertThrowsError(try authorizer.authorize(request)) { error in
            XCTAssertEqual(
                error as? DesktopAuthSessionControllerError,
                .missingCredential
            )
        }
    }

    func testHandle401ClearsSessionAndTransitionsToSignedOut() throws {
        let store = RequestAuthInMemorySessionStore()
        store.save(
            DesktopAuthCredential(
                sessionToken: "session-token-401",
                refreshToken: nil,
                expiresAt: Date(timeIntervalSince1970: 1_900_000_000),
                issuedAt: Date(timeIntervalSince1970: 1_700_000_000)
            )
        )
        let sessionController = makeSessionController(
            store: store,
            now: { Date(timeIntervalSince1970: 1_700_000_001) }
        )
        sessionController.restoreSession()
        let authorizer = DesktopAuthRequestAuthorizer(credentialProvider: sessionController)

        let handled = authorizer.handleResponse(statusCode: 401)

        XCTAssertTrue(handled)
        XCTAssertEqual(
            sessionController.authSessionState,
            .signedOut(reason: .unauthorizedResponse)
        )
        XCTAssertNil(store.load())
    }

    private func makeSessionController(
        store: RequestAuthInMemorySessionStore,
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

private final class RequestAuthInMemorySessionStore: SessionCredentialStore {
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
