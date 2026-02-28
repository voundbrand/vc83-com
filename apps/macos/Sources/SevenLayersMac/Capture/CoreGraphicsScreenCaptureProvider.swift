import CoreGraphics
import Foundation
import ImageIO
import UniformTypeIdentifiers

public enum CoreGraphicsScreenCaptureProviderError: Error, Equatable {
    case permissionDenied
    case unsupportedDisplaySource(String)
    case imageUnavailable(displayID: UInt32)
    case outputDirectoryCreationFailed(String)
    case pngEncodeFailed(String)
    case recordingNotImplemented
}

public struct CoreGraphicsScreenCaptureProvider: ScreenCaptureProviding {
    private let fileManager: FileManager
    private let outputDirectoryURL: URL
    private let now: () -> Date

    public init(
        fileManager: FileManager = .default,
        outputDirectoryURL: URL = URL(fileURLWithPath: NSTemporaryDirectory())
            .appendingPathComponent("sevenlayers-screen-snapshots", isDirectory: true),
        now: @escaping () -> Date = Date.init
    ) {
        self.fileManager = fileManager
        self.outputDirectoryURL = outputDirectoryURL
        self.now = now
    }

    public func captureSnapshot(sourceId: String) throws -> ScreenSnapshotArtifact {
        let resolvedSource = try resolveDisplaySource(sourceId: sourceId)

        guard CGPreflightScreenCaptureAccess() else {
            throw CoreGraphicsScreenCaptureProviderError.permissionDenied
        }

        guard let image = CGDisplayCreateImage(resolvedSource.displayID) else {
            throw CoreGraphicsScreenCaptureProviderError.imageUnavailable(displayID: resolvedSource.displayID)
        }

        try ensureOutputDirectoryExists()
        let capturedAt = now()
        let outputURL = makeOutputURL(
            normalizedSourceID: resolvedSource.normalizedSourceID,
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

        return ScreenSnapshotArtifact(
            sourceId: resolvedSource.normalizedSourceID,
            capturedAt: capturedAt,
            mimeType: "image/png",
            payloadRef: outputURL.path
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

    private func resolveDisplaySource(sourceId: String) throws -> (displayID: UInt32, normalizedSourceID: String) {
        let normalized = sourceId.trimmingCharacters(in: .whitespacesAndNewlines)
        if normalized.isEmpty || normalized == "desktop:primary" {
            let displayID = CGMainDisplayID()
            return (displayID, "display:\(displayID)")
        }

        if normalized.hasPrefix("display:"),
           let rawDisplayID = UInt32(normalized.dropFirst("display:".count))
        {
            return (rawDisplayID, "display:\(rawDisplayID)")
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
}
