import AppKit
import Foundation

public struct DashboardDeepLinkConfiguration: Equatable {
    public let webBaseURL: URL
    public let source: String

    public init(webBaseURL: URL, source: String = "macos_menu_bar") {
        self.webBaseURL = webBaseURL
        self.source = source
    }
}

public protocol WorkspaceOpening {
    @discardableResult
    func open(_ url: URL) -> Bool
}

extension NSWorkspace: WorkspaceOpening {}

@MainActor
public protocol DashboardDeepLinkOpening {
    var dashboardURL: URL { get }

    @discardableResult
    func openDashboard() -> Bool
}

@MainActor
public final class DashboardDeepLinkOpener: DashboardDeepLinkOpening {
    private let configuration: DashboardDeepLinkConfiguration
    private let workspace: WorkspaceOpening

    public init(
        configuration: DashboardDeepLinkConfiguration,
        workspace: WorkspaceOpening = NSWorkspace.shared
    ) {
        self.configuration = configuration
        self.workspace = workspace
    }

    public var dashboardURL: URL {
        var components = URLComponents(url: configuration.webBaseURL, resolvingAgainstBaseURL: false)
        components?.path = "/dashboard"
        components?.queryItems = [
            URLQueryItem(name: "source", value: configuration.source),
        ]

        return components?.url ?? configuration.webBaseURL
    }

    @discardableResult
    public func openDashboard() -> Bool {
        workspace.open(dashboardURL)
    }
}
