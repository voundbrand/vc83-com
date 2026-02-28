import Foundation
import Security

public enum KeychainSessionStoreError: Error, Equatable {
    case unexpectedStatus(OSStatus)
    case invalidPayload
}

public protocol KeychainDataClient {
    func read(service: String, account: String) throws -> Data?
    func write(_ data: Data, service: String, account: String) throws
    func delete(service: String, account: String) throws
}

public struct SystemKeychainDataClient: KeychainDataClient {
    public init() {}

    public func read(service: String, account: String) throws -> Data? {
        let query: [CFString: Any] = [
            kSecClass: kSecClassGenericPassword,
            kSecAttrService: service,
            kSecAttrAccount: account,
            kSecReturnData: true,
            kSecMatchLimit: kSecMatchLimitOne,
        ]

        var result: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &result)

        if status == errSecItemNotFound {
            return nil
        }

        guard status == errSecSuccess else {
            throw KeychainSessionStoreError.unexpectedStatus(status)
        }

        guard let data = result as? Data else {
            throw KeychainSessionStoreError.invalidPayload
        }

        return data
    }

    public func write(_ data: Data, service: String, account: String) throws {
        let baseQuery: [CFString: Any] = [
            kSecClass: kSecClassGenericPassword,
            kSecAttrService: service,
            kSecAttrAccount: account,
        ]

        var insertQuery = baseQuery
        insertQuery[kSecValueData] = data
        insertQuery[kSecAttrAccessible] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly

        let addStatus = SecItemAdd(insertQuery as CFDictionary, nil)

        if addStatus == errSecSuccess {
            return
        }

        guard addStatus == errSecDuplicateItem else {
            throw KeychainSessionStoreError.unexpectedStatus(addStatus)
        }

        let updateAttributes: [CFString: Any] = [
            kSecValueData: data,
            kSecAttrAccessible: kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly,
        ]

        let updateStatus = SecItemUpdate(baseQuery as CFDictionary, updateAttributes as CFDictionary)
        guard updateStatus == errSecSuccess else {
            throw KeychainSessionStoreError.unexpectedStatus(updateStatus)
        }
    }

    public func delete(service: String, account: String) throws {
        let query: [CFString: Any] = [
            kSecClass: kSecClassGenericPassword,
            kSecAttrService: service,
            kSecAttrAccount: account,
        ]

        let status = SecItemDelete(query as CFDictionary)

        if status == errSecSuccess || status == errSecItemNotFound {
            return
        }

        throw KeychainSessionStoreError.unexpectedStatus(status)
    }
}

public final class KeychainSessionCredentialStore: SessionCredentialStore {
    private let service: String
    private let account: String
    private let keychainClient: KeychainDataClient

    private let encoder = JSONEncoder()
    private let decoder = JSONDecoder()

    public init(
        service: String = "com.vc83.sevenlayers.macos.auth",
        account: String = "active-session",
        keychainClient: KeychainDataClient = SystemKeychainDataClient()
    ) {
        self.service = service
        self.account = account
        self.keychainClient = keychainClient
    }

    public func save(_ credential: DesktopAuthCredential) throws {
        let payload = try encoder.encode(credential)
        try keychainClient.write(payload, service: service, account: account)
    }

    public func load() throws -> DesktopAuthCredential? {
        guard let payload = try keychainClient.read(service: service, account: account) else {
            return nil
        }

        guard let credential = try? decoder.decode(DesktopAuthCredential.self, from: payload) else {
            throw KeychainSessionStoreError.invalidPayload
        }

        return credential
    }

    public func clear() throws {
        try keychainClient.delete(service: service, account: account)
    }
}
