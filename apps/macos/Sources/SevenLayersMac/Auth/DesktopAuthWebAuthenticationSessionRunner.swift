import AppKit
@preconcurrency import AuthenticationServices
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
    private var currentSession: ASWebAuthenticationSession?
    private weak var activePresentationAnchor: NSWindow?
    private let fallbackPresentationAnchor: NSWindow

    @MainActor
    public override init() {
        self.fallbackPresentationAnchor = NSWindow(
            contentRect: NSRect(x: -10_000, y: -10_000, width: 1, height: 1),
            styleMask: [.borderless],
            backing: .buffered,
            defer: true
        )
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

        activePresentationAnchor = resolvePresentationAnchor()

        let session = ASWebAuthenticationSession(
            url: authorizationURL,
            callbackURLScheme: callbackURLScheme
        ) { [weak self] callbackURL, error in
            DispatchQueue.main.async {
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
        }

        session.presentationContextProvider = self
        session.prefersEphemeralWebBrowserSession = false

        guard session.start() else {
            return false
        }

        currentSession = session
        return true
    }

    @MainActor
    public func cancel() {
        currentSession?.cancel()
        currentSession = nil
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

        return fallbackPresentationAnchor
    }
}

extension DesktopAuthWebAuthenticationSessionRunner: ASWebAuthenticationPresentationContextProviding {
    public func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        if Thread.isMainThread {
            return activePresentationAnchor ?? fallbackPresentationAnchor
        }

        var anchor: ASPresentationAnchor?
        DispatchQueue.main.sync {
            anchor = activePresentationAnchor ?? fallbackPresentationAnchor
        }
        return anchor ?? fallbackPresentationAnchor
    }
}
