import Foundation
import XCTest
@testable import SevenLayersMac

final class AuthDesktopAuthHTTPClientTests: XCTestCase {
    func testSendInjectsAuthorizationHeader() async throws {
        let store = HTTPClientInMemorySessionStore()
        store.save(
            DesktopAuthCredential(
                sessionToken: "session-http-1",
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
        let requestAuthorizer = DesktopAuthRequestAuthorizer(credentialProvider: sessionController)

        var capturedRequest: URLRequest?
        let client = DesktopAuthHTTPClient(
            requestAuthorizer: requestAuthorizer,
            dataLoader: { request in
                capturedRequest = request
                let response = try XCTUnwrap(
                    HTTPURLResponse(
                        url: try XCTUnwrap(request.url),
                        statusCode: 200,
                        httpVersion: nil,
                        headerFields: nil
                    )
                )
                return (Data(), response)
            }
        )

        let request = URLRequest(url: URL(string: "https://api.vc83.test/v1/profile")!)
        let (_, response) = try await client.send(request)

        XCTAssertEqual(response.statusCode, 200)
        XCTAssertEqual(
            capturedRequest?.value(forHTTPHeaderField: "Authorization"),
            "Bearer session-http-1"
        )
    }

    func testSendHandles401ByTransitioningToSignedOut() async throws {
        let store = HTTPClientInMemorySessionStore()
        store.save(
            DesktopAuthCredential(
                sessionToken: "session-http-401",
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
        let requestAuthorizer = DesktopAuthRequestAuthorizer(credentialProvider: sessionController)

        let client = DesktopAuthHTTPClient(
            requestAuthorizer: requestAuthorizer,
            dataLoader: { request in
                let response = try XCTUnwrap(
                    HTTPURLResponse(
                        url: try XCTUnwrap(request.url),
                        statusCode: 401,
                        httpVersion: nil,
                        headerFields: nil
                    )
                )
                return (Data(), response)
            }
        )

        let request = URLRequest(url: URL(string: "https://api.vc83.test/v1/profile")!)
        let (_, response) = try await client.send(request)

        XCTAssertEqual(response.statusCode, 401)
        XCTAssertEqual(
            sessionController.authSessionState,
            .signedOut(reason: .unauthorizedResponse)
        )
        XCTAssertNil(store.load())
    }

    private func makeSessionController(
        store: HTTPClientInMemorySessionStore,
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

private final class HTTPClientInMemorySessionStore: SessionCredentialStore {
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
