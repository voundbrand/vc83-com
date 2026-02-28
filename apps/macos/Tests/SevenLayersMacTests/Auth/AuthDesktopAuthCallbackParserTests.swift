import XCTest
@testable import SevenLayersMac

final class AuthDesktopAuthCallbackParserTests: XCTestCase {
    func testParsesValidCallbackAndExtractsTokens() throws {
        let parser = DesktopAuthCallbackParser(
            configuration: DesktopAuthConfiguration(webBaseURL: URL(string: "https://app.vc83.test")!)
        )

        let callbackURL = URL(string: "vc83-mac://auth/callback?session_token=session-1&refresh_token=refresh-1&state=state-123&expires_at=1700000000")!
        let payload = try parser.parse(callbackURL, expectedState: "state-123")

        XCTAssertEqual(payload.sessionToken, "session-1")
        XCTAssertEqual(payload.refreshToken, "refresh-1")
        XCTAssertEqual(payload.state, "state-123")
        XCTAssertEqual(payload.expiresAt, Date(timeIntervalSince1970: 1_700_000_000))
    }

    func testRejectsWrongCallbackRoute() {
        let parser = DesktopAuthCallbackParser(
            configuration: DesktopAuthConfiguration(webBaseURL: URL(string: "https://app.vc83.test")!)
        )

        let callbackURL = URL(string: "vc83-wrong://auth/callback?session_token=session-1")!

        XCTAssertThrowsError(try parser.parse(callbackURL, expectedState: nil)) { error in
            XCTAssertEqual(error as? DesktopAuthError, .callbackRouteMismatch)
        }
    }

    func testRejectsMissingSessionToken() {
        let parser = DesktopAuthCallbackParser(
            configuration: DesktopAuthConfiguration(webBaseURL: URL(string: "https://app.vc83.test")!)
        )

        let callbackURL = URL(string: "vc83-mac://auth/callback?state=state-1")!

        XCTAssertThrowsError(try parser.parse(callbackURL, expectedState: nil)) { error in
            XCTAssertEqual(error as? DesktopAuthError, .missingQueryItem("session_token"))
        }
    }

    func testRejectsMismatchedState() {
        let parser = DesktopAuthCallbackParser(
            configuration: DesktopAuthConfiguration(webBaseURL: URL(string: "https://app.vc83.test")!)
        )

        let callbackURL = URL(string: "vc83-mac://auth/callback?session_token=session-1&state=state-2")!

        XCTAssertThrowsError(try parser.parse(callbackURL, expectedState: "state-1")) { error in
            XCTAssertEqual(
                error as? DesktopAuthError,
                .stateMismatch(expected: "state-1", received: "state-2")
            )
        }
    }
}
