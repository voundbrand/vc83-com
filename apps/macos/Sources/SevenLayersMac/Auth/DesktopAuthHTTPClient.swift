import Foundation

public enum DesktopAuthHTTPClientError: Error, Equatable {
    case invalidHTTPResponse
}

public final class DesktopAuthHTTPClient {
    private let requestAuthorizer: DesktopAuthRequestAuthorizer
    private let dataLoader: (URLRequest) async throws -> (Data, URLResponse)

    public init(
        requestAuthorizer: DesktopAuthRequestAuthorizer,
        dataLoader: @escaping (URLRequest) async throws -> (Data, URLResponse) = {
            try await URLSession.shared.data(for: $0)
        }
    ) {
        self.requestAuthorizer = requestAuthorizer
        self.dataLoader = dataLoader
    }

    public func send(_ request: URLRequest) async throws -> (Data, HTTPURLResponse) {
        let authorizedRequest = try requestAuthorizer.authorize(request)
        let (data, response) = try await dataLoader(authorizedRequest)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw DesktopAuthHTTPClientError.invalidHTTPResponse
        }

        _ = requestAuthorizer.handleResponse(statusCode: httpResponse.statusCode)
        return (data, httpResponse)
    }
}
