import CoreGraphics
import Foundation

public enum ScreenCaptureSourceKind: String, Equatable {
    case display
    case window
}

public struct ScreenCaptureSourceDescriptor: Equatable {
    public let sourceId: String
    public let kind: ScreenCaptureSourceKind
    public let displayId: UInt32?
    public let windowId: UInt32?
    public let ownerName: String?
    public let title: String?
    public let workspaceId: Int?
    public let isOnScreen: Bool?

    public init(
        sourceId: String,
        kind: ScreenCaptureSourceKind,
        displayId: UInt32? = nil,
        windowId: UInt32? = nil,
        ownerName: String? = nil,
        title: String? = nil,
        workspaceId: Int? = nil,
        isOnScreen: Bool? = nil
    ) {
        self.sourceId = sourceId
        self.kind = kind
        self.displayId = displayId
        self.windowId = windowId
        self.ownerName = ownerName
        self.title = title
        self.workspaceId = workspaceId
        self.isOnScreen = isOnScreen
    }
}

public protocol ScreenCaptureSourceListing {
    func listCaptureSources() -> [ScreenCaptureSourceDescriptor]
}

public final class CoreGraphicsCaptureSourceCatalog: ScreenCaptureSourceListing {
    public typealias WindowInfoProvider = (_ options: CGWindowListOption, _ relativeToWindow: CGWindowID) -> [[String: Any]]
    public typealias DisplayIDProvider = () -> [UInt32]
    public typealias MainDisplayIDProvider = () -> UInt32

    private let windowInfoProvider: WindowInfoProvider
    private let displayIDProvider: DisplayIDProvider
    private let mainDisplayIDProvider: MainDisplayIDProvider

    public init(
        windowInfoProvider: @escaping WindowInfoProvider = CoreGraphicsCaptureSourceCatalog.defaultWindowInfoProvider,
        displayIDProvider: @escaping DisplayIDProvider = CoreGraphicsCaptureSourceCatalog.defaultDisplayIDProvider,
        mainDisplayIDProvider: @escaping MainDisplayIDProvider = { CGMainDisplayID() }
    ) {
        self.windowInfoProvider = windowInfoProvider
        self.displayIDProvider = displayIDProvider
        self.mainDisplayIDProvider = mainDisplayIDProvider
    }

    public func listCaptureSources() -> [ScreenCaptureSourceDescriptor] {
        listDisplaySources() + listWindowSources()
    }

    private func listDisplaySources() -> [ScreenCaptureSourceDescriptor] {
        let mainDisplayID = mainDisplayIDProvider()
        let allDisplayIDs = Array(Set(displayIDProvider())).sorted()

        var sources: [ScreenCaptureSourceDescriptor] = [
            ScreenCaptureSourceDescriptor(
                sourceId: "desktop:primary",
                kind: .display,
                displayId: mainDisplayID
            ),
        ]

        for displayID in allDisplayIDs where displayID != mainDisplayID {
            sources.append(
                ScreenCaptureSourceDescriptor(
                    sourceId: "display:\(displayID)",
                    kind: .display,
                    displayId: displayID
                )
            )
        }

        return sources
    }

    private func listWindowSources() -> [ScreenCaptureSourceDescriptor] {
        let windowInfo = windowInfoProvider(.optionAll, kCGNullWindowID)
        var windows: [ScreenCaptureSourceDescriptor] = []

        for entry in windowInfo {
            guard let descriptor = makeWindowDescriptor(from: entry) else {
                continue
            }
            windows.append(descriptor)
        }

        return windows.sorted(by: orderWindowDescriptors)
    }

    private func makeWindowDescriptor(from entry: [String: Any]) -> ScreenCaptureSourceDescriptor? {
        guard let layer = entry[kCGWindowLayer as String] as? Int, layer == 0 else {
            return nil
        }

        let sharingState = (entry[kCGWindowSharingState as String] as? NSNumber)?.intValue ?? 0
        guard sharingState != 0 else {
            return nil
        }

        let alpha = (entry[kCGWindowAlpha as String] as? NSNumber)?.doubleValue ?? 1
        guard alpha > 0.01 else {
            return nil
        }

        guard let number = entry[kCGWindowNumber as String] as? NSNumber else {
            return nil
        }
        let windowID = number.uint32Value

        let ownerName = normalize(entry[kCGWindowOwnerName as String] as? String)
        if ownerName == "Window Server" {
            return nil
        }

        let title = normalize(entry[kCGWindowName as String] as? String)
        if ownerName == nil, title == nil {
            return nil
        }

        let workspaceID = (entry["kCGWindowWorkspace"] as? NSNumber)?.intValue
        let isOnScreen = (entry[kCGWindowIsOnscreen as String] as? NSNumber)?.boolValue

        return ScreenCaptureSourceDescriptor(
            sourceId: "window:\(windowID)",
            kind: .window,
            windowId: windowID,
            ownerName: ownerName,
            title: title,
            workspaceId: workspaceID,
            isOnScreen: isOnScreen
        )
    }

    private func orderWindowDescriptors(
        lhs: ScreenCaptureSourceDescriptor,
        rhs: ScreenCaptureSourceDescriptor
    ) -> Bool {
        let lhsOwner = (lhs.ownerName ?? "").lowercased()
        let rhsOwner = (rhs.ownerName ?? "").lowercased()
        if lhsOwner != rhsOwner {
            return lhsOwner < rhsOwner
        }

        let lhsTitle = (lhs.title ?? "").lowercased()
        let rhsTitle = (rhs.title ?? "").lowercased()
        if lhsTitle != rhsTitle {
            return lhsTitle < rhsTitle
        }

        let lhsWorkspace = lhs.workspaceId ?? Int.max
        let rhsWorkspace = rhs.workspaceId ?? Int.max
        if lhsWorkspace != rhsWorkspace {
            return lhsWorkspace < rhsWorkspace
        }

        return (lhs.windowId ?? 0) < (rhs.windowId ?? 0)
    }

    private func normalize(_ value: String?) -> String? {
        guard let value else {
            return nil
        }
        let normalized = value.trimmingCharacters(in: .whitespacesAndNewlines)
        return normalized.isEmpty ? nil : normalized
    }

    public static func defaultWindowInfoProvider(
        options: CGWindowListOption,
        relativeToWindow: CGWindowID
    ) -> [[String: Any]] {
        guard let list = CGWindowListCopyWindowInfo(options, relativeToWindow) as? [[String: Any]] else {
            return []
        }
        return list
    }

    public static func defaultDisplayIDProvider() -> [UInt32] {
        var count: UInt32 = 0
        let firstResult = CGGetActiveDisplayList(0, nil, &count)
        guard firstResult == .success, count > 0 else {
            return [CGMainDisplayID()]
        }

        var displayIDs = [CGDirectDisplayID](repeating: 0, count: Int(count))
        let secondResult = CGGetActiveDisplayList(count, &displayIDs, &count)
        guard secondResult == .success else {
            return [CGMainDisplayID()]
        }

        return Array(displayIDs.prefix(Int(count)))
    }
}
