import Foundation

public final class DesktopAuthRequestAuthorizer {
    private let credentialProvider: any DesktopAuthCredentialProviding

    public init(credentialProvider: any DesktopAuthCredentialProviding) {
        self.credentialProvider = credentialProvider
    }

    public func authorize(_ request: URLRequest) throws -> URLRequest {
        let credential = try credentialProvider.activeCredential()
        var request = request
        request.setValue("Bearer \(credential.sessionToken)", forHTTPHeaderField: "Authorization")
        return request
    }

    @discardableResult
    public func handleResponse(statusCode: Int) -> Bool {
        credentialProvider.handleUnauthorizedResponse(statusCode: statusCode)
    }
}
