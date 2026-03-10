import CoreGraphics
import Foundation
import ImageIO
import UniformTypeIdentifiers

public enum CoreGraphicsScreenCaptureProviderError: Error, Equatable {
    case permissionDenied
    case unsupportedDisplaySource(String)
    case unsupportedWindowSource(String)
    case windowSourceNotFound(windowID: UInt32)
    case imageUnavailable(displayID: UInt32)
    case windowImageUnavailable(windowID: UInt32)
    case outputDirectoryCreationFailed(String)
    case pngEncodeFailed(String)
    case evidenceEncodeFailed(String)
    case recordingNotImplemented
}

public struct CoreGraphicsScreenCaptureProvider: ScreenCaptureProviding {
    public typealias ScreenCapturePermissionReader = () -> Bool
    public typealias DisplayImageCapturer = (_ displayID: UInt32) -> CGImage?
    public typealias WindowImageCapturer = (_ windowID: UInt32) -> CGImage?
    public typealias WindowInfoReader = (_ windowID: UInt32) -> [String: Any]?

    private enum ResolvedSource {
        case display(
            displayID: UInt32,
            normalizedSourceID: String,
            metadata: ScreenSnapshotSourceMetadata
        )
        case window(
            windowID: UInt32,
            normalizedSourceID: String,
            metadata: ScreenSnapshotSourceMetadata
        )
    }

    private let fileManager: FileManager
    private let outputDirectoryURL: URL
    private let now: () -> Date
    private let hasScreenCapturePermission: ScreenCapturePermissionReader
    private let captureDisplayImage: DisplayImageCapturer
    private let captureWindowImage: WindowImageCapturer
    private let readWindowInfo: WindowInfoReader

    public init(
        fileManager: FileManager = .default,
        outputDirectoryURL: URL = URL(fileURLWithPath: NSTemporaryDirectory())
            .appendingPathComponent("sevenlayers-screen-snapshots", isDirectory: true),
        now: @escaping () -> Date = Date.init,
        hasScreenCapturePermission: @escaping ScreenCapturePermissionReader = { CGPreflightScreenCaptureAccess() },
        captureDisplayImage: @escaping DisplayImageCapturer = { CGDisplayCreateImage($0) },
        captureWindowImage: @escaping WindowImageCapturer = {
            CGWindowListCreateImage(
                .null,
                .optionIncludingWindow,
                CGWindowID($0),
                [.bestResolution, .boundsIgnoreFraming]
            )
        },
        readWindowInfo: @escaping WindowInfoReader = CoreGraphicsScreenCaptureProvider.defaultWindowInfoReader
    ) {
        self.fileManager = fileManager
        self.outputDirectoryURL = outputDirectoryURL
        self.now = now
        self.hasScreenCapturePermission = hasScreenCapturePermission
        self.captureDisplayImage = captureDisplayImage
        self.captureWindowImage = captureWindowImage
        self.readWindowInfo = readWindowInfo
    }

    public func captureSnapshot(sourceId: String) throws -> ScreenSnapshotArtifact {
        let resolvedSource = try resolveSource(sourceId: sourceId)

        guard hasScreenCapturePermission() else {
            throw CoreGraphicsScreenCaptureProviderError.permissionDenied
        }

        let image: CGImage
        let normalizedSourceID: String
        let sourceMetadata: ScreenSnapshotSourceMetadata

        switch resolvedSource {
        case let .display(displayID, sourceID, metadata):
            guard let capturedImage = captureDisplayImage(displayID) else {
                throw CoreGraphicsScreenCaptureProviderError.imageUnavailable(displayID: displayID)
            }
            image = capturedImage
            normalizedSourceID = sourceID
            sourceMetadata = metadata
        case let .window(windowID, sourceID, metadata):
            guard let capturedImage = captureWindowImage(windowID) else {
                throw CoreGraphicsScreenCaptureProviderError.windowImageUnavailable(windowID: windowID)
            }
            image = capturedImage
            normalizedSourceID = sourceID
            sourceMetadata = metadata
        }

        try ensureOutputDirectoryExists()
        let capturedAt = now()
        let outputURL = makeOutputURL(
            normalizedSourceID: normalizedSourceID,
            capturedAt: capturedAt
        )

        guard let destination = CGImageDestinationCreateWithURL(
            outputURL as CFURL,
            UTType.png.identifier as CFString,
            1,
            nil
        ) else {
            throw CoreGraphicsScreenCaptureProviderError.pngEncodeFailed(outputURL.path)
        }

        CGImageDestinationAddImage(destination, image, nil)
        guard CGImageDestinationFinalize(destination) else {
            throw CoreGraphicsScreenCaptureProviderError.pngEncodeFailed(outputURL.path)
        }

        let evidenceURL = outputURL.deletingPathExtension().appendingPathExtension("json")
        try writeSnapshotEvidence(
            outputURL: outputURL,
            evidenceURL: evidenceURL,
            sourceID: normalizedSourceID,
            sourceMetadata: sourceMetadata,
            capturedAt: capturedAt
        )

        return ScreenSnapshotArtifact(
            sourceId: normalizedSourceID,
            capturedAt: capturedAt,
            mimeType: "image/png",
            payloadRef: outputURL.path,
            sourceMetadata: sourceMetadata,
            evidenceRef: evidenceURL.path
        )
    }

    public func startRecording(
        sourceId: String,
        boundedDurationMs: Int,
        withMicAudio: Bool,
        withSystemAudio: Bool
    ) throws -> ScreenRecordingArtifact {
        throw CoreGraphicsScreenCaptureProviderError.recordingNotImplemented
    }

    private func resolveSource(sourceId: String) throws -> ResolvedSource {
        let normalized = sourceId.trimmingCharacters(in: .whitespacesAndNewlines)
        if normalized.isEmpty || normalized == "desktop:primary" {
            let displayID = CGMainDisplayID()
            return .display(
                displayID: displayID,
                normalizedSourceID: "display:\(displayID)",
                metadata: ScreenSnapshotSourceMetadata(
                    sourceKind: .display,
                    displayId: displayID
                )
            )
        }

        if normalized.hasPrefix("display:"),
           let rawDisplayID = UInt32(normalized.dropFirst("display:".count))
        {
            return .display(
                displayID: rawDisplayID,
                normalizedSourceID: "display:\(rawDisplayID)",
                metadata: ScreenSnapshotSourceMetadata(
                    sourceKind: .display,
                    displayId: rawDisplayID
                )
            )
        }

        if normalized.hasPrefix("window:") {
            let rawWindowIdentifier = normalized.dropFirst("window:".count)
            guard let rawWindowID = UInt32(rawWindowIdentifier) else {
                throw CoreGraphicsScreenCaptureProviderError.unsupportedWindowSource(normalized)
            }

            guard let windowInfo = readWindowInfo(rawWindowID) else {
                throw CoreGraphicsScreenCaptureProviderError.windowSourceNotFound(windowID: rawWindowID)
            }

            let ownerName = normalize(windowInfo[kCGWindowOwnerName as String] as? String)
            let title = normalize(windowInfo[kCGWindowName as String] as? String)
            let workspaceID = (windowInfo["kCGWindowWorkspace"] as? NSNumber)?.intValue
            let isOnScreen = (windowInfo[kCGWindowIsOnscreen as String] as? NSNumber)?.boolValue

            return .window(
                windowID: rawWindowID,
                normalizedSourceID: "window:\(rawWindowID)",
                metadata: ScreenSnapshotSourceMetadata(
                    sourceKind: .window,
                    windowId: rawWindowID,
                    ownerName: ownerName,
                    title: title,
                    workspaceId: workspaceID,
                    isOnScreen: isOnScreen
                )
            )
        }

        throw CoreGraphicsScreenCaptureProviderError.unsupportedDisplaySource(normalized)
    }

    private func ensureOutputDirectoryExists() throws {
        do {
            try fileManager.createDirectory(
                at: outputDirectoryURL,
                withIntermediateDirectories: true
            )
        } catch {
            throw CoreGraphicsScreenCaptureProviderError.outputDirectoryCreationFailed(
                outputDirectoryURL.path
            )
        }
    }

    private func makeOutputURL(normalizedSourceID: String, capturedAt: Date) -> URL {
        let unixMs = Int((capturedAt.timeIntervalSince1970 * 1000).rounded())
        let filename = [
            "snapshot",
            sanitizePathComponent(normalizedSourceID),
            String(unixMs),
        ].joined(separator: "-") + ".png"

        return outputDirectoryURL.appendingPathComponent(filename)
    }

    private func sanitizePathComponent(_ raw: String) -> String {
        let sanitized = raw.map { character -> Character in
            if character.isLetter || character.isNumber || character == "-" || character == "_" {
                return character
            }
            return "-"
        }
        return String(sanitized)
    }

    private func writeSnapshotEvidence(
        outputURL: URL,
        evidenceURL: URL,
        sourceID: String,
        sourceMetadata: ScreenSnapshotSourceMetadata,
        capturedAt: Date
    ) throws {
        var evidence: [String: Any] = [
            "schemaVersion": "sevenlayers_screen_snapshot_evidence_v1",
            "capturedAtUnixMs": Int((capturedAt.timeIntervalSince1970 * 1000).rounded()),
            "sourceId": sourceID,
            "sourceKind": sourceMetadata.sourceKind.rawValue,
            "mimeType": "image/png",
            "payloadRef": outputURL.path,
        ]

        if let displayId = sourceMetadata.displayId {
            evidence["displayId"] = displayId
        }
        if let windowId = sourceMetadata.windowId {
            evidence["windowId"] = windowId
        }
        if let ownerName = sourceMetadata.ownerName {
            evidence["ownerName"] = ownerName
        }
        if let title = sourceMetadata.title {
            evidence["title"] = title
        }
        if let workspaceId = sourceMetadata.workspaceId {
            evidence["workspaceId"] = workspaceId
        }
        if let isOnScreen = sourceMetadata.isOnScreen {
            evidence["isOnScreen"] = isOnScreen
        }

        guard JSONSerialization.isValidJSONObject(evidence) else {
            throw CoreGraphicsScreenCaptureProviderError.evidenceEncodeFailed(evidenceURL.path)
        }

        do {
            let data = try JSONSerialization.data(withJSONObject: evidence, options: [.sortedKeys])
            try data.write(to: evidenceURL, options: .atomic)
        } catch {
            throw CoreGraphicsScreenCaptureProviderError.evidenceEncodeFailed(evidenceURL.path)
        }
    }

    private func normalize(_ value: String?) -> String? {
        guard let value else {
            return nil
        }
        let normalized = value.trimmingCharacters(in: .whitespacesAndNewlines)
        return normalized.isEmpty ? nil : normalized
    }

    public static func defaultWindowInfoReader(windowID: UInt32) -> [String: Any]? {
        guard let list = CGWindowListCopyWindowInfo([.optionIncludingWindow], CGWindowID(windowID)) as? [[String: Any]],
              let window = list.first
        else {
            return nil
        }
        return window
    }
}
