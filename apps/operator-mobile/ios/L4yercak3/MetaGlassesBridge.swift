import Foundation
import React
#if canImport(MWDATCore) && canImport(MWDATCamera)
import MWDATCore
import MWDATCamera
#endif

private final class MetaDatRuntimeConnector {
#if canImport(MWDATCore) && canImport(MWDATCamera)
  private var started = false
  private var activeDeviceTask: Task<Void, Never>?
  private var streamSession: StreamSession?
  private var stateListenerToken: AnyListenerToken?
  private var videoFrameListenerToken: AnyListenerToken?
  private var errorListenerToken: AnyListenerToken?
  private var audioFailurePublished = false
#endif

  func start() {
#if canImport(MWDATCore) && canImport(MWDATCamera)
    guard !started else {
      return
    }
    started = true

    do {
      try Wearables.configure()
    } catch {
      MetaGlassesBridgeRuntime.publishFailure(
        "dat_sdk_configure_failed",
        message: "Failed to configure DAT SDK: \(error.localizedDescription)",
        recoverable: NSNumber(booleanLiteral: true)
      )
      return
    }

    let wearables = Wearables.shared
    let selector = AutoDeviceSelector(wearables: wearables)

    activeDeviceTask = Task { @MainActor in
      for await device in selector.activeDeviceStream() {
        guard self.started else {
          return
        }
        if let activeDevice = device {
          let resolvedDeviceId = String(describing: activeDevice)
          let deviceLabel = resolvedDeviceId.isEmpty ? "Ray-Ban Meta" : resolvedDeviceId
          let sourceId = "meta_glasses:meta_dat_bridge:\(self.sanitizeToken(deviceLabel))"
          MetaGlassesBridgeRuntime.publishDeviceConnected(
            sourceId,
            providerId: "meta_dat_bridge",
            deviceId: resolvedDeviceId,
            deviceLabel: deviceLabel,
            connectedAtMs: NSNumber(value: Date().timeIntervalSince1970 * 1_000)
          )
        } else {
          MetaGlassesBridgeRuntime.publishDeviceDisconnected("dat_device_disconnected")
        }
      }
    }

    let sessionConfig = StreamSessionConfig(
      videoCodec: .raw,
      resolution: .low,
      frameRate: 24
    )
    let session = StreamSession(streamSessionConfig: sessionConfig, deviceSelector: selector)
    streamSession = session

    stateListenerToken = session.statePublisher.listen { state in
      switch state {
      case .stopped:
        MetaGlassesBridgeRuntime.publishDeviceDisconnected("dat_stream_stopped")
      case .waitingForDevice, .starting, .stopping, .paused, .streaming:
        break
      @unknown default:
        break
      }
    }

    videoFrameListenerToken = session.videoFramePublisher.listen { _ in
      MetaGlassesBridgeRuntime.publishFrameIngress(
        NSNumber(value: Date().timeIntervalSince1970 * 1_000),
        droppedFrames: NSNumber(value: 0)
      )
    }

    errorListenerToken = session.errorPublisher.listen { error in
      MetaGlassesBridgeRuntime.publishFailure(
        self.resolveStreamErrorCode(error),
        message: String(describing: error),
        recoverable: NSNumber(booleanLiteral: true)
      )
    }

    if !audioFailurePublished {
      audioFailurePublished = true
      // TODO(meta-dat-sdk): Bind DAT-native audio packet callbacks when SDK surface is available.
      MetaGlassesBridgeRuntime.publishFailure(
        "dat_audio_ingress_listener_unavailable",
        message: "DAT video stream is connected but DAT audio packet listener is unavailable in this target.",
        recoverable: NSNumber(booleanLiteral: true)
      )
    }

    Task {
      await session.start()
    }
#endif
  }

  func stop() {
#if canImport(MWDATCore) && canImport(MWDATCamera)
    guard started else {
      return
    }
    started = false
    activeDeviceTask?.cancel()
    activeDeviceTask = nil
    stateListenerToken = nil
    videoFrameListenerToken = nil
    errorListenerToken = nil
    if let streamSession {
      Task {
        await streamSession.stop()
      }
    }
    streamSession = nil
#endif
  }

#if canImport(MWDATCore) && canImport(MWDATCamera)
  private func sanitizeToken(_ value: String) -> String {
    let normalized = value
      .trimmingCharacters(in: .whitespacesAndNewlines)
      .lowercased()
      .replacingOccurrences(of: "[^a-z0-9._-]+", with: "_", options: .regularExpression)
      .replacingOccurrences(of: "^_+|_+$", with: "", options: .regularExpression)
    return normalized.isEmpty ? "unknown" : normalized
  }

  private func resolveStreamErrorCode(_ error: StreamSessionError) -> String {
    switch error {
    case .internalError:
      return "dat_stream_internal_error"
    case .deviceNotFound:
      return "dat_device_not_found"
    case .deviceNotConnected:
      return "dat_device_not_connected"
    case .timeout:
      return "dat_stream_timeout"
    case .videoStreamingError:
      return "dat_video_stream_error"
    case .audioStreamingError:
      return "dat_audio_stream_error"
    case .permissionDenied:
      return "dat_permission_denied"
    case .hingesClosed:
      return "dat_hinges_closed"
    @unknown default:
      return "dat_stream_unknown_error"
    }
  }
#endif
}

@objc(MetaGlassesBridgeRuntime)
class MetaGlassesBridgeRuntime: NSObject {
  private static let notificationPrefix = "MetaGlassesBridgeRuntime"

  static let deviceConnectedNotification = Notification.Name("\(notificationPrefix).deviceConnected")
  static let deviceDisconnectedNotification = Notification.Name("\(notificationPrefix).deviceDisconnected")
  static let frameIngressNotification = Notification.Name("\(notificationPrefix).frameIngress")
  static let audioIngressNotification = Notification.Name("\(notificationPrefix).audioIngress")
  static let failureNotification = Notification.Name("\(notificationPrefix).failure")

  @objc static func publishDeviceConnected(
    _ sourceId: String,
    providerId: String,
    deviceId: String,
    deviceLabel: String,
    connectedAtMs: NSNumber?
  ) {
    NotificationCenter.default.post(
      name: deviceConnectedNotification,
      object: nil,
      userInfo: [
        "sourceId": sourceId,
        "providerId": providerId,
        "deviceId": deviceId,
        "deviceLabel": deviceLabel,
        "connectedAtMs": connectedAtMs?.doubleValue ?? Date().timeIntervalSince1970 * 1_000,
      ]
    )
  }

  @objc static func publishDeviceDisconnected(_ reasonCode: String?) {
    NotificationCenter.default.post(
      name: deviceDisconnectedNotification,
      object: nil,
      userInfo: [
        "reasonCode": reasonCode as Any,
      ]
    )
  }

  @objc static func publishFrameIngress(_ timestampMs: NSNumber?, droppedFrames: NSNumber?) {
    NotificationCenter.default.post(
      name: frameIngressNotification,
      object: nil,
      userInfo: [
        "timestampMs": timestampMs?.doubleValue ?? Date().timeIntervalSince1970 * 1_000,
        "droppedFrames": droppedFrames?.intValue ?? 0,
      ]
    )
  }

  @objc static func publishAudioIngress(
    _ timestampMs: NSNumber?,
    sampleRate: NSNumber,
    packetDelta: NSNumber?
  ) {
    NotificationCenter.default.post(
      name: audioIngressNotification,
      object: nil,
      userInfo: [
        "timestampMs": timestampMs?.doubleValue ?? Date().timeIntervalSince1970 * 1_000,
        "sampleRate": sampleRate.intValue,
        "packetDelta": packetDelta?.intValue ?? 1,
      ]
    )
  }

  @objc static func publishFailure(_ reasonCode: String, message: String?, recoverable: NSNumber?) {
    NotificationCenter.default.post(
      name: failureNotification,
      object: nil,
      userInfo: [
        "reasonCode": reasonCode,
        "message": message as Any,
        "recoverable": recoverable?.boolValue ?? true,
      ]
    )
  }
}

@objc(MetaGlassesBridge)
class MetaGlassesBridge: RCTEventEmitter {
  private static let statusEvent = "metaBridgeStatusDidChange"

  private var hasListeners = false
  private var connectionState = "disconnected"
  private var fallbackReason: String?
  private var failure: [String: Any]?

  private var sourceId: String?
  private var providerId = "meta_dat_bridge"
  private var deviceId: String?
  private var deviceLabel: String?
  private var connectedAtMs: Double?

  private var totalFrames = 0
  private var droppedFrames = 0
  private var lastFrameTs: Double?

  private var sampleRate = 16_000
  private var packetCount = 0
  private var lastPacketTs: Double?

  private var runtimeObservers: [NSObjectProtocol] = []
  private let datRuntimeConnector = MetaDatRuntimeConnector()

  @objc
  override static func requiresMainQueueSetup() -> Bool {
    true
  }

  override init() {
    super.init()
    registerRuntimeObservers()
    datRuntimeConnector.start()
  }

  deinit {
    datRuntimeConnector.stop()
    runtimeObservers.forEach { NotificationCenter.default.removeObserver($0) }
    runtimeObservers.removeAll()
  }

  override func supportedEvents() -> [String]! {
    [Self.statusEvent]
  }

  override func startObserving() {
    hasListeners = true
  }

  override func stopObserving() {
    hasListeners = false
  }

  @objc(connect:rejecter:)
  func connect(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    if connectionState == "connected" {
      resolve(buildSnapshot())
      return
    }

    datRuntimeConnector.start()

    connectionState = "connecting"
    failure = nil
    fallbackReason = nil
    emitStatus()

    if !isDatSdkAvailable() {
      applyFailure(
        reasonCode: "dat_sdk_unavailable",
        message: "Meta DAT SDK not linked in the native target.",
        recoverable: true,
        fallback: "dat_sdk_missing"
      )
      resolve(buildSnapshot())
      return
    }

    if hasActiveDevice() {
      connectionState = "connected"
      failure = nil
      fallbackReason = nil
      emitStatus()
      resolve(buildSnapshot())
      return
    }

    applyFailure(
      reasonCode: "dat_device_identity_unavailable",
      message: "Awaiting DAT runtime device identity callback.",
      recoverable: true,
      fallback: "awaiting_dat_device_identity"
    )
    resolve(buildSnapshot())
  }

  @objc(disconnect:rejecter:)
  func disconnect(
    _ resolve: RCTPromiseResolveBlock,
    rejecter reject: RCTPromiseRejectBlock
  ) {
    connectionState = "disconnected"
    sourceId = nil
    deviceId = nil
    deviceLabel = nil
    connectedAtMs = nil
    fallbackReason = nil
    failure = nil

    emitStatus()
    resolve(buildSnapshot())
  }

  @objc(getStatus:rejecter:)
  func getStatus(
    _ resolve: RCTPromiseResolveBlock,
    rejecter reject: RCTPromiseRejectBlock
  ) {
    resolve(buildSnapshot())
  }

  @objc(recordFrameIngress:resolver:rejecter:)
  func recordFrameIngress(
    _ payload: [String: Any]?,
    resolver resolve: RCTPromiseResolveBlock,
    rejecter reject: RCTPromiseRejectBlock
  ) {
    let timestampMs = (payload?["timestampMs"] as? NSNumber)?.doubleValue ?? nowMs()
    let dropped = (payload?["droppedFrames"] as? NSNumber)?.intValue ?? 0
    ingestFrame(timestampMs: timestampMs, dropped: dropped)
    resolve(buildSnapshot())
  }

  @objc(recordAudioIngress:resolver:rejecter:)
  func recordAudioIngress(
    _ payload: [String: Any]?,
    resolver resolve: RCTPromiseResolveBlock,
    rejecter reject: RCTPromiseRejectBlock
  ) {
    let timestampMs = (payload?["timestampMs"] as? NSNumber)?.doubleValue ?? nowMs()
    let packets = (payload?["packets"] as? NSNumber)?.intValue ?? 1
    let inboundSampleRate = (payload?["sampleRate"] as? NSNumber)?.intValue ?? sampleRate

    ingestAudio(timestampMs: timestampMs, sampleRateValue: inboundSampleRate, packetDelta: packets)
    resolve(buildSnapshot())
  }

  private func registerRuntimeObservers() {
    let center = NotificationCenter.default

    runtimeObservers.append(
      center.addObserver(
        forName: MetaGlassesBridgeRuntime.deviceConnectedNotification,
        object: nil,
        queue: .main
      ) { [weak self] notification in
        guard let self else { return }
        let payload = notification.userInfo ?? [:]
        guard
          let sourceId = payload["sourceId"] as? String,
          let providerId = payload["providerId"] as? String,
          let deviceId = payload["deviceId"] as? String,
          let deviceLabel = payload["deviceLabel"] as? String
        else {
          return
        }

        self.sourceId = sourceId
        self.providerId = providerId
        self.deviceId = deviceId
        self.deviceLabel = deviceLabel
        self.connectedAtMs = payload["connectedAtMs"] as? Double ?? self.nowMs()
        self.connectionState = "connected"
        self.failure = nil
        self.fallbackReason = nil
        self.emitStatus()
      }
    )

    runtimeObservers.append(
      center.addObserver(
        forName: MetaGlassesBridgeRuntime.deviceDisconnectedNotification,
        object: nil,
        queue: .main
      ) { [weak self] notification in
        guard let self else { return }
        self.connectionState = "disconnected"
        self.fallbackReason = notification.userInfo?["reasonCode"] as? String
        self.sourceId = nil
        self.deviceId = nil
        self.deviceLabel = nil
        self.connectedAtMs = nil
        self.emitStatus()
      }
    )

    runtimeObservers.append(
      center.addObserver(
        forName: MetaGlassesBridgeRuntime.frameIngressNotification,
        object: nil,
        queue: .main
      ) { [weak self] notification in
        guard let self else { return }
        let payload = notification.userInfo ?? [:]
        let timestampMs = payload["timestampMs"] as? Double ?? self.nowMs()
        let droppedFrames = payload["droppedFrames"] as? Int ?? 0
        self.ingestFrame(timestampMs: timestampMs, dropped: droppedFrames)
      }
    )

    runtimeObservers.append(
      center.addObserver(
        forName: MetaGlassesBridgeRuntime.audioIngressNotification,
        object: nil,
        queue: .main
      ) { [weak self] notification in
        guard let self else { return }
        let payload = notification.userInfo ?? [:]
        let timestampMs = payload["timestampMs"] as? Double ?? self.nowMs()
        let sampleRate = payload["sampleRate"] as? Int ?? self.sampleRate
        let packetDelta = payload["packetDelta"] as? Int ?? 1
        self.ingestAudio(
          timestampMs: timestampMs,
          sampleRateValue: sampleRate,
          packetDelta: packetDelta
        )
      }
    )

    runtimeObservers.append(
      center.addObserver(
        forName: MetaGlassesBridgeRuntime.failureNotification,
        object: nil,
        queue: .main
      ) { [weak self] notification in
        guard let self else { return }
        let payload = notification.userInfo ?? [:]
        guard let reasonCode = payload["reasonCode"] as? String else {
          return
        }
        self.applyFailure(
          reasonCode: reasonCode,
          message: payload["message"] as? String,
          recoverable: payload["recoverable"] as? Bool ?? true,
          fallback: reasonCode
        )
      }
    )
  }

  private func ingestFrame(timestampMs: Double, dropped: Int) {
    guard connectionState == "connected" else {
      applyFailure(
        reasonCode: "bridge_unavailable",
        message: "Frame ingress rejected while bridge is disconnected.",
        recoverable: true,
        fallback: "bridge_unavailable"
      )
      return
    }

    totalFrames += 1
    droppedFrames += max(0, dropped)
    lastFrameTs = timestampMs
    failure = nil
    fallbackReason = nil

    emitStatus()
  }

  private func ingestAudio(timestampMs: Double, sampleRateValue: Int, packetDelta: Int) {
    guard connectionState == "connected" else {
      applyFailure(
        reasonCode: "bridge_unavailable",
        message: "Audio ingress rejected while bridge is disconnected.",
        recoverable: true,
        fallback: "bridge_unavailable"
      )
      return
    }

    packetCount += max(1, packetDelta)
    sampleRate = max(8_000, sampleRateValue)
    lastPacketTs = timestampMs
    failure = nil
    fallbackReason = nil

    emitStatus()
  }

  private func applyFailure(reasonCode: String, message: String?, recoverable: Bool, fallback: String) {
    connectionState = "error"
    failure = [
      "reasonCode": reasonCode,
      "message": message as Any,
      "recoverable": recoverable,
      "atMs": nowMs(),
    ]
    fallbackReason = fallback
    emitStatus()
  }

  private func hasActiveDevice() -> Bool {
    guard
      let sourceId,
      let deviceId,
      let deviceLabel
    else {
      return false
    }

    return !sourceId.isEmpty && !deviceId.isEmpty && !deviceLabel.isEmpty
  }

  private func isDatSdkAvailable() -> Bool {
    return NSClassFromString("Wearables") != nil
      || NSClassFromString("MetaWearables.Wearables") != nil
  }

  private func emitStatus() {
    guard hasListeners else {
      return
    }
    sendEvent(withName: Self.statusEvent, body: buildSnapshot())
  }

  private func buildSnapshot() -> [String: Any] {
    let now = nowMs()

    var frameIngress: [String: Any] = [
      "fps": resolveFps(nowMs: now),
      "totalFrames": totalFrames,
      "droppedFrames": droppedFrames,
    ]
    if let lastFrameTs {
      frameIngress["lastFrameTs"] = lastFrameTs
    }

    var audioIngress: [String: Any] = [
      "sampleRate": sampleRate,
      "packetCount": packetCount,
    ]
    if let lastPacketTs {
      audioIngress["lastPacketTs"] = lastPacketTs
    }

    var snapshot: [String: Any] = [
      "connectionState": connectionState,
      "frameIngress": frameIngress,
      "audioIngress": audioIngress,
      "updatedAtMs": now,
    ]
    if let activeDevice = activeDevicePayload() {
      snapshot["activeDevice"] = activeDevice
    }
    if let failure {
      snapshot["failure"] = failure
    }
    if let fallbackReason {
      snapshot["fallbackReason"] = fallbackReason
    }

    return snapshot
  }

  private func activeDevicePayload() -> [String: Any]? {
    guard
      let sourceId,
      let deviceId,
      let deviceLabel
    else {
      return nil
    }

    var payload: [String: Any] = [
      "sourceId": sourceId,
      "sourceClass": "meta_glasses",
      "providerId": providerId,
      "deviceId": deviceId,
      "deviceLabel": deviceLabel,
    ]
    if let connectedAtMs {
      payload["connectedAtMs"] = connectedAtMs
    }
    return payload
  }

  private func resolveFps(nowMs: Double) -> Double {
    guard let connectedAtMs else {
      return 0
    }
    let elapsedSec = max(0.001, (nowMs - connectedAtMs) / 1_000.0)
    return Double(totalFrames) / elapsedSec
  }

  private func nowMs() -> Double {
    Date().timeIntervalSince1970 * 1_000
  }
}
