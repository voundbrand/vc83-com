import Foundation

public struct DesktopAuthURLBuilder {
    public let configuration: DesktopAuthConfiguration

    public init(configuration: DesktopAuthConfiguration) {
        self.configuration = configuration
    }

    public func makeAuthorizationURL(
        state: String,
        provider: DesktopAuthOAuthProvider? = nil
    ) throws -> URL {
        guard var components = URLComponents(url: configuration.webBaseURL, resolvingAgainstBaseURL: false) else {
            throw DesktopAuthError.invalidAuthorizationURL
        }

        let selectedProvider = provider ?? configuration.preferredOAuthProvider

        components.path = "/api/auth/login/init"
        components.queryItems = [
            URLQueryItem(name: "client", value: "macos_companion"),
            URLQueryItem(name: "provider", value: selectedProvider.rawValue),
            URLQueryItem(name: "callback", value: configuration.callbackURL.absoluteString),
            URLQueryItem(name: "state", value: state),
        ]

        guard let url = components.url else {
            throw DesktopAuthError.invalidAuthorizationURL
        }

        return url
    }
}
