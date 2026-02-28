import Foundation
import XCTest
@testable import SevenLayersMac

final class AuthKeychainSessionCredentialStoreTests: XCTestCase {
    func testSaveAndLoadRoundTrip() throws {
        let client = FakeKeychainDataClient()
        let store = KeychainSessionCredentialStore(
            service: "svc.test",
            account: "acct.test",
            keychainClient: client
        )

        let credential = DesktopAuthCredential(
            sessionToken: "session-1",
            refreshToken: "refresh-1",
            expiresAt: Date(timeIntervalSince1970: 1_700_001_000),
            issuedAt: Date(timeIntervalSince1970: 1_700_000_000)
        )

        try store.save(credential)

        XCTAssertEqual(try store.load(), credential)
    }

    func testLoadReturnsNilWhenNoCredentialExists() throws {
        let client = FakeKeychainDataClient()
        let store = KeychainSessionCredentialStore(
            service: "svc.test",
            account: "acct.test",
            keychainClient: client
        )

        XCTAssertNil(try store.load())
    }

    func testClearDeletesStoredCredential() throws {
        let client = FakeKeychainDataClient()
        let store = KeychainSessionCredentialStore(
            service: "svc.test",
            account: "acct.test",
            keychainClient: client
        )

        try store.save(
            DesktopAuthCredential(
                sessionToken: "session-1",
                refreshToken: nil,
                expiresAt: nil,
                issuedAt: Date(timeIntervalSince1970: 1_700_000_000)
            )
        )

        XCTAssertNotNil(try store.load())
        try store.clear()
        XCTAssertNil(try store.load())
    }

    func testLoadThrowsForInvalidPayload() {
        let client = FakeKeychainDataClient()
        client.storage["svc.test::acct.test"] = Data("not-json".utf8)

        let store = KeychainSessionCredentialStore(
            service: "svc.test",
            account: "acct.test",
            keychainClient: client
        )

        XCTAssertThrowsError(try store.load()) { error in
            XCTAssertEqual(error as? KeychainSessionStoreError, .invalidPayload)
        }
    }
}

private final class FakeKeychainDataClient: KeychainDataClient {
    var storage: [String: Data] = [:]

    func read(service: String, account: String) -> Data? {
        storage[makeKey(service: service, account: account)]
    }

    func write(_ data: Data, service: String, account: String) {
        storage[makeKey(service: service, account: account)] = data
    }

    func delete(service: String, account: String) {
        storage.removeValue(forKey: makeKey(service: service, account: account))
    }

    private func makeKey(service: String, account: String) -> String {
        "\(service)::\(account)"
    }
}
