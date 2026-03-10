import AppKit
import AuthenticationServices
import Foundation

public enum DesktopAuthInteractiveSessionError: Error, Equatable {
    case missingCallbackURL
}

public protocol DesktopAuthInteractiveSessionRunning: AnyObject {
    @MainActor
    @discardableResult
    func begin(
        authorizationURL: URL,
        callbackURLScheme: String,
        onCompletion: @escaping (Result<URL, Error>) -> Void
    ) -> Bool

    @MainActor
    func cancel()
}

public final class DesktopAuthWebAuthenticationSessionRunner: NSObject, DesktopAuthInteractiveSessionRunning {
    private let stateQueue = DispatchQueue(label: "com.vc83.sevenlayers.auth.websession.runner.state")
    private var currentSession: ASWebAuthenticationSession?
    private weak var activePresentationAnchor: NSWindow?
    private var fallbackPresentationAnchor: NSWindow?

    @MainActor
    public override init() {
        super.init()
    }

    @MainActor
    @discardableResult
    public func begin(
        authorizationURL: URL,
        callbackURLScheme: String,
        onCompletion: @escaping (Result<URL, Error>) -> Void
    ) -> Bool {
        cancel()

        let anchor = resolvePresentationAnchor()
        stateQueue.sync {
            activePresentationAnchor = anchor
        }

        let session = ASWebAuthenticationSession(
            url: authorizationURL,
            callbackURLScheme: callbackURLScheme
        ) { [weak self] callbackURL, error in
            self?.clearSessionReference()

            if let callbackURL {
                onCompletion(.success(callbackURL))
                return
            }

            if let error {
                onCompletion(.failure(error))
                return
            }

            onCompletion(.failure(DesktopAuthInteractiveSessionError.missingCallbackURL))
        }

        session.presentationContextProvider = self
        session.prefersEphemeralWebBrowserSession = false

        guard session.start() else {
            return false
        }

        stateQueue.sync {
            currentSession = session
        }
        return true
    }

    @MainActor
    public func cancel() {
        stateQueue.sync {
            currentSession?.cancel()
            currentSession = nil
        }
    }

    private func clearSessionReference() {
        stateQueue.sync {
            currentSession = nil
        }
    }

    @MainActor
    private func resolvePresentationAnchor() -> NSWindow {
        if let keyWindow = NSApp.keyWindow {
            return keyWindow
        }

        if let mainWindow = NSApp.mainWindow {
            return mainWindow
        }

        if let firstWindow = NSApp.windows.first {
            return firstWindow
        }

        if let fallbackPresentationAnchor {
            return fallbackPresentationAnchor
        }

        let fallbackWindow = NSWindow(
            contentRect: NSRect(x: -10_000, y: -10_000, width: 1, height: 1),
            styleMask: [.borderless],
            backing: .buffered,
            defer: true
        )
        self.fallbackPresentationAnchor = fallbackWindow
        return fallbackWindow
    }
}

extension DesktopAuthWebAuthenticationSessionRunner: ASWebAuthenticationPresentationContextProviding {
    public func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        stateQueue.sync {
            if let activePresentationAnchor {
                return activePresentationAnchor
            }

            if let fallbackPresentationAnchor {
                return fallbackPresentationAnchor
            }

            return NSWindow(
                contentRect: NSRect(x: -10_000, y: -10_000, width: 1, height: 1),
                styleMask: [.borderless],
                backing: .buffered,
                defer: true
            )
        }
    }
}
