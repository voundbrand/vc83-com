import XCTest
@testable import SevenLayersMac

final class AuthDesktopAuthURLBuilderTests: XCTestCase {
    func testBuildsDesktopAuthorizationURLWithCustomCallbackRoute() throws {
        let config = DesktopAuthConfiguration(
            webBaseURL: URL(string: "https://app.vc83.test")!,
            callbackScheme: "vc83-mac",
            callbackHost: "auth",
            callbackPath: "/callback"
        )

        let builder = DesktopAuthURLBuilder(configuration: config)
        let authURL = try builder.makeAuthorizationURL(state: "state-abc")
        let components = try XCTUnwrap(URLComponents(url: authURL, resolvingAgainstBaseURL: false))
        let query = Dictionary(uniqueKeysWithValues: (components.queryItems ?? []).map { ($0.name, $0.value ?? "") })

        XCTAssertEqual(components.path, "/api/auth/login/init")
        XCTAssertEqual(query["client"], "macos_companion")
        XCTAssertEqual(query["callback"], "vc83-mac://auth/callback")
        XCTAssertEqual(query["state"], "state-abc")
    }
}
