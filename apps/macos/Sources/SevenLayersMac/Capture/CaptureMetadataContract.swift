import Foundation
import SevenLayersProtocol

public enum CaptureMetadataContractKey {
    public static let liveSessionId = "liveSessionId"
    public static let cameraRuntime = "cameraRuntime"
    public static let voiceRuntime = "voiceRuntime"
}

public struct CameraRuntimeMetadata: Equatable {
    public let provider: String?
    public let sessionState: String
    public let startedAt: Date?
    public let lastFrameCapturedAt: Date?
    public let frameCaptureCount: Int?
    public let fallbackReason: String?

    public init(
        provider: String? = nil,
        sessionState: String,
        startedAt: Date? = nil,
        lastFrameCapturedAt: Date? = nil,
        frameCaptureCount: Int? = nil,
        fallbackReason: String? = nil
    ) {
        self.provider = provider
        self.sessionState = sessionState
        self.startedAt = startedAt
        self.lastFrameCapturedAt = lastFrameCapturedAt
        self.frameCaptureCount = frameCaptureCount
        self.fallbackReason = fallbackReason
    }

    func bridgeDictionary() -> [String: Any] {
        var dictionary: [String: Any] = [
            "sessionState": sessionState,
        ]

        if let provider {
            dictionary["provider"] = provider
        }
        if let startedAt {
            dictionary["startedAt"] = unixMillis(startedAt)
        }
        if let lastFrameCapturedAt {
            dictionary["lastFrameCapturedAt"] = unixMillis(lastFrameCapturedAt)
        }
        if let frameCaptureCount {
            dictionary["frameCaptureCount"] = frameCaptureCount
        }
        if let fallbackReason {
            dictionary["fallbackReason"] = fallbackReason
        }

        return dictionary
    }
}

public struct VoiceRuntimeMetadata: Equatable {
    public let voiceSessionId: String
    public let sessionState: String
    public let runtimeError: String?
    public let fallbackReason: String?

    public init(
        voiceSessionId: String,
        sessionState: String,
        runtimeError: String? = nil,
        fallbackReason: String? = nil
    ) {
        self.voiceSessionId = voiceSessionId
        self.sessionState = sessionState
        self.runtimeError = runtimeError
        self.fallbackReason = fallbackReason
    }

    func bridgeDictionary() -> [String: Any] {
        var dictionary: [String: Any] = [
            "voiceSessionId": voiceSessionId,
            "sessionState": sessionState,
        ]

        if let runtimeError {
            dictionary["runtimeError"] = runtimeError
        }
        if let fallbackReason {
            dictionary["fallbackReason"] = fallbackReason
        }

        return dictionary
    }
}

public struct CaptureIngressMetadata: Equatable {
    public let liveSessionId: String
    public let cameraRuntime: CameraRuntimeMetadata?
    public let voiceRuntime: VoiceRuntimeMetadata?

    public init(
        liveSessionId: String,
        cameraRuntime: CameraRuntimeMetadata? = nil,
        voiceRuntime: VoiceRuntimeMetadata? = nil
    ) throws {
        let normalizedLiveSessionId = liveSessionId
            .trimmingCharacters(in: .whitespacesAndNewlines)
        guard !normalizedLiveSessionId.isEmpty else {
            throw CaptureConnectorError.missingLiveSessionId
        }

        self.liveSessionId = normalizedLiveSessionId
        self.cameraRuntime = cameraRuntime
        self.voiceRuntime = voiceRuntime
    }

    public func bridgeMetadata() -> [String: Any] {
        var metadata: [String: Any] = [
            CaptureMetadataContractKey.liveSessionId: liveSessionId,
        ]

        if let cameraRuntime {
            metadata[CaptureMetadataContractKey.cameraRuntime] = cameraRuntime.bridgeDictionary()
        }
        if let voiceRuntime {
            metadata[CaptureMetadataContractKey.voiceRuntime] = voiceRuntime.bridgeDictionary()
        }

        return metadata
    }
}

public struct CaptureIngressContext: Equatable {
    public let metadata: CaptureIngressMetadata
    public let mutationAuthority: MutationAuthority

    public init(
        metadata: CaptureIngressMetadata,
        mutationAuthority: MutationAuthority = .vc83Backend
    ) {
        self.metadata = metadata
        self.mutationAuthority = mutationAuthority
    }
}

private func unixMillis(_ date: Date) -> Int {
    Int((date.timeIntervalSince1970 * 1000).rounded())
}
