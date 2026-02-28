import Foundation

public struct DesktopAuthURLBuilder {
    public let configuration: DesktopAuthConfiguration

    public init(configuration: DesktopAuthConfiguration) {
        self.configuration = configuration
    }

    public func makeAuthorizationURL(state: String) throws -> URL {
        guard var components = URLComponents(url: configuration.webBaseURL, resolvingAgainstBaseURL: false) else {
            throw DesktopAuthError.invalidAuthorizationURL
        }

        components.path = "/auth/desktop"
        components.queryItems = [
            URLQueryItem(name: "redirect_uri", value: configuration.callbackURL.absoluteString),
            URLQueryItem(name: "state", value: state),
            URLQueryItem(name: "platform", value: "macos_companion"),
        ]

        guard let url = components.url else {
            throw DesktopAuthError.invalidAuthorizationURL
        }

        return url
    }
}
