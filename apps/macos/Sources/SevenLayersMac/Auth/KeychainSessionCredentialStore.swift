import Foundation
import LocalAuthentication
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

    private func nonInteractiveContext() -> LAContext {
        let context = LAContext()
        context.interactionNotAllowed = true
        return context
    }

    public func read(service: String, account: String) throws -> Data? {
        let query: [CFString: Any] = [
            kSecClass: kSecClassGenericPassword,
            kSecAttrService: service,
            kSecAttrAccount: account,
            kSecReturnData: true,
            kSecMatchLimit: kSecMatchLimitOne,
            kSecUseAuthenticationContext: nonInteractiveContext(),
        ]

        var result: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &result)

        if status == errSecItemNotFound || status == errSecInteractionNotAllowed {
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
            kSecUseAuthenticationContext: nonInteractiveContext(),
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
            kSecUseAuthenticationContext: nonInteractiveContext(),
        ]

        let status = SecItemDelete(query as CFDictionary)

        if status == errSecSuccess || status == errSecItemNotFound {
            return
        }

        throw KeychainSessionStoreError.unexpectedStatus(status)
    }
}

public final class KeychainSessionCredentialStore: SessionCredentialStore {
    private static let currentService = "com.vc83.sevenlayers.macos.auth.v2"
    private static let legacyService = "com.vc83.sevenlayers.macos.auth"

    private let service: String
    private let legacyService: String?
    private let account: String
    private let keychainClient: KeychainDataClient

    private let encoder = JSONEncoder()
    private let decoder = JSONDecoder()

    public init(
        service: String? = nil,
        legacyService: String? = nil,
        account: String = "active-session",
        keychainClient: KeychainDataClient = SystemKeychainDataClient()
    ) {
        self.service = service ?? KeychainSessionCredentialStore.currentService
        self.legacyService = legacyService ?? KeychainSessionCredentialStore.legacyService
        self.account = account
        self.keychainClient = keychainClient
    }

    public func save(_ credential: DesktopAuthCredential) throws {
        let payload = try encoder.encode(credential)
        try keychainClient.write(payload, service: service, account: account)
    }

    public func load() throws -> DesktopAuthCredential? {
        if let payload = try keychainClient.read(service: service, account: account) {
            guard let credential = try? decoder.decode(DesktopAuthCredential.self, from: payload) else {
                throw KeychainSessionStoreError.invalidPayload
            }
            return credential
        }

        guard let legacyService,
              legacyService != service,
              let legacyPayload = try keychainClient.read(service: legacyService, account: account)
        else {
            return nil
        }

        guard let credential = try? decoder.decode(DesktopAuthCredential.self, from: legacyPayload) else {
            throw KeychainSessionStoreError.invalidPayload
        }

        try? save(credential)
        return credential
    }

    public func clear() throws {
        try keychainClient.delete(service: service, account: account)
        if let legacyService, legacyService != service {
            try? keychainClient.delete(service: legacyService, account: account)
        }
    }
}
