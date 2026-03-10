import Foundation

public struct DesktopAuthCallbackParser {
    public let configuration: DesktopAuthConfiguration

    public init(configuration: DesktopAuthConfiguration) {
        self.configuration = configuration
    }

    public func parse(_ callbackURL: URL, expectedState: String?) throws -> DesktopAuthCallbackPayload {
        guard let components = URLComponents(url: callbackURL, resolvingAgainstBaseURL: false),
              components.scheme?.lowercased() == configuration.callbackScheme,
              components.host?.lowercased() == configuration.callbackHost,
              components.path == configuration.callbackPath
        else {
            throw DesktopAuthError.callbackRouteMismatch
        }

        let queryMap = Dictionary(uniqueKeysWithValues: (components.queryItems ?? []).map { ($0.name, $0.value) })

        let sessionToken = queryMap["session_token"] ?? queryMap["token"] ?? nil
        guard let sessionToken, !sessionToken.isEmpty else {
            throw DesktopAuthError.missingQueryItem("session_token")
        }

        let state = queryMap["state"] ?? nil
        if let expectedState, expectedState != (state ?? "") {
            throw DesktopAuthError.stateMismatch(expected: expectedState, received: state)
        }

        let expiresAt = try parseExpiration(queryMap["expires_at"] ?? nil)

        return DesktopAuthCallbackPayload(
            sessionToken: sessionToken,
            refreshToken: queryMap["refresh_token"] ?? nil,
            state: state,
            expiresAt: expiresAt
        )
    }

    private func parseExpiration(_ raw: String?) throws -> Date? {
        guard let raw else {
            return nil
        }

        if let unixSeconds = TimeInterval(raw) {
            return Date(timeIntervalSince1970: unixSeconds)
        }

        let iso8601 = ISO8601DateFormatter()
        if let isoDate = iso8601.date(from: raw) {
            return isoDate
        }

        throw DesktopAuthError.malformedExpiration
    }
}
