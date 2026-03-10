import AppKit
import AuthenticationServices
import Foundation

public enum DesktopAuthInteractiveSessionError: Error, Equatable {
    case missingCallbackURL
}

@MainActor
public protocol DesktopAuthInteractiveSessionRunning: AnyObject {
    @discardableResult
    func begin(
        authorizationURL: URL,
        callbackURLScheme: String,
        onCompletion: @escaping (Result<URL, Error>) -> Void
    ) -> Bool

    func cancel()
}

@MainActor
public final class DesktopAuthWebAuthenticationSessionRunner: NSObject, DesktopAuthInteractiveSessionRunning {
    private var currentSession: ASWebAuthenticationSession?
    private lazy var fallbackPresentationAnchor: NSWindow = {
        NSWindow(
            contentRect: NSRect(x: -10_000, y: -10_000, width: 1, height: 1),
            styleMask: [.borderless],
            backing: .buffered,
            defer: true
        )
    }()

    @discardableResult
    public func begin(
        authorizationURL: URL,
        callbackURLScheme: String,
        onCompletion: @escaping (Result<URL, Error>) -> Void
    ) -> Bool {
        cancel()

        let session = ASWebAuthenticationSession(
            url: authorizationURL,
            callbackURLScheme: callbackURLScheme
        ) { [weak self] callbackURL, error in
            self?.currentSession = nil

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

        currentSession = session
        return true
    }

    public func cancel() {
        currentSession?.cancel()
        currentSession = nil
    }
}

@MainActor
extension DesktopAuthWebAuthenticationSessionRunner: ASWebAuthenticationPresentationContextProviding {
    public func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        if let keyWindow = NSApp.keyWindow {
            return keyWindow
        }

        if let mainWindow = NSApp.mainWindow {
            return mainWindow
        }

        if let firstWindow = NSApp.windows.first {
            return firstWindow
        }

        return fallbackPresentationAnchor
    }
}
