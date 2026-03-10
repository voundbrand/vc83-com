import Foundation

public struct DesktopAuthStatusPresentation: Equatable {
    public let indicatorText: String
    public let actionTitle: String
    public let isActionEnabled: Bool

    public init(indicatorText: String, actionTitle: String, isActionEnabled: Bool) {
        self.indicatorText = indicatorText
        self.actionTitle = actionTitle
        self.isActionEnabled = isActionEnabled
    }
}

public extension DesktopAuthSessionState {
    func statusPresentation(canSignIn: Bool, canSignOut: Bool) -> DesktopAuthStatusPresentation {
        switch self {
        case .authenticated:
            return DesktopAuthStatusPresentation(
                indicatorText: "Auth: Signed in",
                actionTitle: "Sign Out",
                isActionEnabled: canSignOut
            )
        case .authorizing:
            return DesktopAuthStatusPresentation(
                indicatorText: "Auth: Signing in (awaiting callback)",
                actionTitle: "Retry Sign In",
                isActionEnabled: canSignIn
            )
        case let .signedOut(reason: reason):
            return DesktopAuthStatusPresentation(
                indicatorText: indicatorText(for: reason),
                actionTitle: actionTitle(for: reason),
                isActionEnabled: canSignIn
            )
        }
    }

    private func indicatorText(for reason: DesktopAuthSignedOutReason) -> String {
        switch reason {
        case .missingCredential:
            return "Auth: Sign in required"
        case .expiredCredential:
            return "Auth: Session expired"
        case .invalidCredential:
            return "Auth: Session invalid"
        case .callbackRejected:
            return "Auth: Callback rejected"
        case .unauthorizedResponse:
            return "Auth: Session unauthorized"
        case .userInitiated:
            return "Auth: Signed out"
        case .loginLaunchFailed:
            return "Auth: Unable to open sign-in"
        }
    }

    private func actionTitle(for reason: DesktopAuthSignedOutReason) -> String {
        switch reason {
        case .missingCredential, .userInitiated:
            return "Sign In"
        case .expiredCredential, .invalidCredential, .callbackRejected, .unauthorizedResponse, .loginLaunchFailed:
            return "Retry Sign In"
        }
    }
}
