import XCTest
@testable import SevenLayersMac

final class AuthDesktopAuthStatusPresentationTests: XCTestCase {
    func testAuthorizingStateIsRetryable() {
        let presentation = DesktopAuthSessionState.authorizing.statusPresentation(
            canSignIn: true,
            canSignOut: true
        )

        XCTAssertEqual(presentation.indicatorText, "Auth: Signing in (awaiting callback)")
        XCTAssertEqual(presentation.actionTitle, "Retry Sign In")
        XCTAssertTrue(presentation.isActionEnabled)
    }

    func testCallbackRejectedSignedOutShowsRetry() {
        let presentation = DesktopAuthSessionState
            .signedOut(reason: .callbackRejected)
            .statusPresentation(canSignIn: true, canSignOut: false)

        XCTAssertEqual(presentation.indicatorText, "Auth: Callback rejected")
        XCTAssertEqual(presentation.actionTitle, "Retry Sign In")
        XCTAssertTrue(presentation.isActionEnabled)
    }

    func testAuthenticatedShowsSignOut() {
        let credential = DesktopAuthCredential(
            sessionToken: "session-1",
            refreshToken: nil,
            expiresAt: nil,
            issuedAt: Date(timeIntervalSince1970: 1_700_000_000)
        )
        let presentation = DesktopAuthSessionState
            .authenticated(credential)
            .statusPresentation(canSignIn: true, canSignOut: true)

        XCTAssertEqual(presentation.indicatorText, "Auth: Signed in")
        XCTAssertEqual(presentation.actionTitle, "Sign Out")
        XCTAssertTrue(presentation.isActionEnabled)
    }
}
