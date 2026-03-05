import Foundation
import AVFoundation
import CoreBluetooth
import React
#if canImport(MWDATCore) && canImport(MWDATCamera)
import MWDATCore
import MWDATCamera
#endif

private final class MetaDatRuntimeConnector {
#if canImport(MWDATCore) && canImport(MWDATCamera)
  private var started = false
  private var activeDeviceTask: Task<Void, Never>?
  private var devicePollTask: Task<Void, Never>?
  private var activeDeviceFingerprint: String?
  private var streamSession: StreamSession?
  private var streamGeneration = 0
  private var stateListenerToken: AnyListenerToken?
  private var videoFrameListenerToken: AnyListenerToken?
  private var audioIngressListenerToken: Any?
  private var errorListenerToken: AnyListenerToken?
  private var callbackHealthCheckTask: Task<Void, Never>?
  private var didReceiveVideoIngress = false
  private var didReceiveAudioIngress = false
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
      started = false
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
          self.publishResolvedDeviceConnectedIfNeeded(
            self.resolveDeviceIdentity(from: activeDevice)
          )
        } else {
          self.publishDeviceDisconnectedIfNeeded("dat_device_disconnected")
        }
      }
    }

    devicePollTask?.cancel()
    devicePollTask = Task { @MainActor [weak self] in
      guard let self else { return }
      while self.started {
        self.publishActiveDeviceFromWearablesSnapshotIfNeeded()
        try? await Task.sleep(nanoseconds: 1_500_000_000)
      }
    }

    Task { @MainActor in
      self.configureStreamSession(selector: selector)
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
    devicePollTask?.cancel()
    devicePollTask = nil
    activeDeviceFingerprint = nil
    Task { @MainActor in
      await self.teardownStreamSession()
    }
#endif
  }

  func refreshStreamSession() {
#if canImport(MWDATCore) && canImport(MWDATCamera)
    guard started else {
      return
    }
    Task { @MainActor [weak self] in
      guard let self, self.started else { return }
      let selector = AutoDeviceSelector(wearables: Wearables.shared)
      await self.teardownStreamSession()
      self.configureStreamSession(selector: selector)
    }
#endif
  }

#if canImport(MWDATCore) && canImport(MWDATCamera)
  @MainActor
  private func configureStreamSession(selector: AutoDeviceSelector) {
    let sessionConfig = StreamSessionConfig(
      videoCodec: .raw,
      resolution: .low,
      frameRate: 24
    )
    let session = StreamSession(streamSessionConfig: sessionConfig, deviceSelector: selector)
    streamSession = session
    streamGeneration += 1
    didReceiveVideoIngress = false
    didReceiveAudioIngress = false

    stateListenerToken = session.statePublisher.listen { state in
      switch state {
      case .stopped:
        self.publishDeviceDisconnectedIfNeeded("dat_stream_stopped")
      case .waitingForDevice, .starting, .stopping, .paused, .streaming:
        break
      @unknown default:
        break
      }
    }

    videoFrameListenerToken = session.videoFramePublisher.listen { frame in
      self.didReceiveVideoIngress = true
      MetaGlassesBridgeRuntime.publishFrameIngress(
        NSNumber(value: self.resolveNormalizedTimestampMs(from: frame)),
        droppedFrames: NSNumber(value: self.resolveDroppedFrames(from: frame))
      )
      MetaGlassesBridgeRuntime.publishCallbackSurfaceDiagnostics(
        "video",
        status: "healthy",
        reasonCode: nil,
        message: nil
      )
    }

    audioIngressListenerToken = bindAudioIngressListener(session: session)
    if audioIngressListenerToken == nil {
      MetaGlassesBridgeRuntime.publishCallbackSurfaceDiagnostics(
        "audio",
        status: "unavailable",
        reasonCode: "dat_audio_callback_surface_unavailable",
        message: "StreamSession audio ingress callback surface is unavailable on this SDK build."
      )
    }

    errorListenerToken = session.errorPublisher.listen { error in
      MetaGlassesBridgeRuntime.publishFailure(
        self.resolveStreamErrorCode(error),
        message: String(describing: error),
        recoverable: NSNumber(booleanLiteral: true)
      )
    }

    Task {
      await session.start()
    }

    let generationAtStart = streamGeneration
    callbackHealthCheckTask = Task { [weak self] in
      try? await Task.sleep(nanoseconds: 5_000_000_000)
      guard let self, self.started, self.streamGeneration == generationAtStart else {
        return
      }
      if !self.didReceiveVideoIngress {
        MetaGlassesBridgeRuntime.publishCallbackSurfaceDiagnostics(
          "video",
          status: "degraded",
          reasonCode: "dat_video_callback_stalled",
          message: "No DAT video ingress callbacks observed after stream start."
        )
      }
      if self.audioIngressListenerToken != nil && !self.didReceiveAudioIngress {
        MetaGlassesBridgeRuntime.publishCallbackSurfaceDiagnostics(
          "audio",
          status: "degraded",
          reasonCode: "dat_audio_callback_stalled",
          message: "No DAT audio ingress callbacks observed after stream start."
        )
      }
    }
  }

  @MainActor
  private func teardownStreamSession() async {
    streamGeneration += 1
    callbackHealthCheckTask?.cancel()
    callbackHealthCheckTask = nil
    stateListenerToken = nil
    videoFrameListenerToken = nil
    audioIngressListenerToken = nil
    errorListenerToken = nil
    didReceiveVideoIngress = false
    didReceiveAudioIngress = false
    if let streamSession {
      await streamSession.stop()
    }
    streamSession = nil
  }

  @MainActor
  private func publishActiveDeviceFromWearablesSnapshotIfNeeded() {
    guard let resolvedDevice = resolveActiveDeviceFromWearablesSnapshot() else {
      return
    }
    publishResolvedDeviceConnectedIfNeeded(resolvedDevice)
  }

  private struct ResolvedDatDevice {
    let sourceId: String
    let providerId: String
    let deviceId: String
    let deviceLabel: String
  }

  private func publishResolvedDeviceConnectedIfNeeded(_ device: ResolvedDatDevice) {
    let fingerprint = "\(device.deviceId):\(device.deviceLabel)"
    guard activeDeviceFingerprint != fingerprint else {
      return
    }
    activeDeviceFingerprint = fingerprint
    MetaGlassesBridgeRuntime.publishDeviceConnected(
      device.sourceId,
      providerId: device.providerId,
      deviceId: device.deviceId,
      deviceLabel: device.deviceLabel,
      connectedAtMs: NSNumber(value: Date().timeIntervalSince1970 * 1_000)
    )
  }

  private func publishDeviceDisconnectedIfNeeded(_ reasonCode: String?) {
    guard activeDeviceFingerprint != nil else {
      return
    }
    activeDeviceFingerprint = nil
    MetaGlassesBridgeRuntime.publishDeviceDisconnected(reasonCode)
  }

  private func resolveActiveDeviceFromWearablesSnapshot() -> ResolvedDatDevice? {
    let wearables: Any = Wearables.shared
    let holderCandidates = [
      resolveSelectorValue(on: wearables, selectorName: "devices"),
      resolveSelectorValue(on: wearables, selectorName: "getDevices"),
      resolveMirrorChildValue("devices", in: wearables),
      resolveMirrorChildValue("connectedDevices", in: wearables),
      resolveMirrorChildValue("activeDevices", in: wearables),
    ].compactMap { $0 }

    for holder in holderCandidates {
      guard
        let deviceCandidate = resolveFirstDevice(from: unwrapStateContainerValue(holder))
      else {
        continue
      }
      return resolveDeviceIdentity(from: deviceCandidate)
    }

    return nil
  }

  private func resolveDeviceIdentity(from device: Any) -> ResolvedDatDevice {
    let providerId = "meta_dat_bridge"
    let rawDeviceId =
      resolveDeviceString(
        from: device,
        keys: ["deviceId", "identifier", "id"]
      )
      ?? String(describing: device)
    let normalizedDeviceId = sanitizeToken(rawDeviceId)

    let resolvedLabel =
      resolveDeviceString(
        from: device,
        keys: ["name", "label", "displayName"]
      )
      ?? rawDeviceId
    let normalizedLabel = resolvedLabel.trimmingCharacters(in: .whitespacesAndNewlines)
    let deviceLabel = normalizedLabel.isEmpty ? "Ray-Ban Meta" : normalizedLabel
    let sourceId = "meta_glasses:\(providerId):\(sanitizeToken(deviceLabel))"

    return ResolvedDatDevice(
      sourceId: sourceId,
      providerId: providerId,
      deviceId: normalizedDeviceId,
      deviceLabel: deviceLabel
    )
  }

  private func resolveDeviceString(from device: Any, keys: [String]) -> String? {
    if let dictionary = device as? [String: Any] {
      for key in keys {
        if let resolved = resolveString(dictionary[key]) {
          return resolved
        }
      }
    }

    for key in keys {
      if let resolved = resolveString(resolveSelectorValue(on: device, selectorName: key)) {
        return resolved
      }
      let getterSelector = "get\(key.prefix(1).uppercased())\(String(key.dropFirst()))"
      if let resolved = resolveString(resolveSelectorValue(on: device, selectorName: getterSelector)) {
        return resolved
      }
      if let resolved = resolveString(resolveMirrorChildValue(key, in: device)) {
        return resolved
      }
    }

    return nil
  }

  private func resolveString(_ value: Any?) -> String? {
    switch value {
    case let string as String:
      let trimmed = string.trimmingCharacters(in: .whitespacesAndNewlines)
      return trimmed.isEmpty ? nil : trimmed
    case let number as NSNumber:
      let rendered = number.stringValue.trimmingCharacters(in: .whitespacesAndNewlines)
      return rendered.isEmpty ? nil : rendered
    default:
      guard let value else {
        return nil
      }
      let rendered = String(describing: value).trimmingCharacters(in: .whitespacesAndNewlines)
      guard !rendered.isEmpty, rendered.lowercased() != "nil" else {
        return nil
      }
      return rendered
    }
  }

  private func resolveSelectorValue(on target: Any, selectorName: String) -> Any? {
    guard let object = target as? NSObject else {
      return nil
    }
    let selector = NSSelectorFromString(selectorName)
    guard object.responds(to: selector) else {
      return nil
    }
    return object.perform(selector)?.takeUnretainedValue()
  }

  private func resolveMirrorChildValue(_ key: String, in value: Any) -> Any? {
    var currentMirror: Mirror? = Mirror(reflecting: value)
    while let mirror = currentMirror {
      if let child = mirror.children.first(where: { $0.label == key }) {
        return child.value
      }
      currentMirror = mirror.superclassMirror
    }
    return nil
  }

  private func unwrapStateContainerValue(_ holder: Any) -> Any {
    let valueCandidates = [
      resolveSelectorValue(on: holder, selectorName: "value"),
      resolveSelectorValue(on: holder, selectorName: "getValue"),
      resolveSelectorValue(on: holder, selectorName: "currentValue"),
      resolveSelectorValue(on: holder, selectorName: "wrappedValue"),
      resolveMirrorChildValue("value", in: holder),
      resolveMirrorChildValue("currentValue", in: holder),
      resolveMirrorChildValue("wrappedValue", in: holder),
      resolveMirrorChildValue("state", in: holder),
    ]
    for candidate in valueCandidates {
      if let candidate {
        return candidate
      }
    }
    return holder
  }

  private func resolveFirstDevice(from value: Any?) -> Any? {
    guard let value else {
      return nil
    }

    if let array = value as? [Any] {
      return array.first
    }
    if let array = value as? NSArray {
      return array.firstObject
    }
    if let set = value as? NSSet {
      return set.anyObject()
    }

    let mirror = Mirror(reflecting: value)
    switch mirror.displayStyle {
    case .optional:
      return resolveFirstDevice(from: mirror.children.first?.value)
    case .collection, .set:
      return mirror.children.first?.value
    default:
      return nil
    }
  }

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

  private func bindAudioIngressListener(session: StreamSession) -> Any? {
    for publisher in resolveAudioIngressPublishers(session: session) {
      if let token = bindGenericListener(
        on: publisher,
        handler: { payload in
          self.didReceiveAudioIngress = true
          MetaGlassesBridgeRuntime.publishAudioIngress(
            NSNumber(value: self.resolveNormalizedTimestampMs(from: payload)),
            sampleRate: NSNumber(value: self.resolveSampleRate(from: payload)),
            packetDelta: NSNumber(value: self.resolvePacketDelta(from: payload))
          )
          MetaGlassesBridgeRuntime.publishCallbackSurfaceDiagnostics(
            "audio",
            status: "healthy",
            reasonCode: nil,
            message: nil
          )
        }
      ) {
        return token
      }
    }

    return nil
  }

  private func resolveAudioIngressPublishers(session: StreamSession) -> [Any] {
    let selectorCandidates = [
      "audioPacketPublisher",
      "audioFramePublisher",
      "audioPublisher",
      "audioDataPublisher",
      "audioSamplePublisher",
    ]
    var publishers: [Any] = []

    if let sessionObject = session as? NSObject {
      for selectorName in selectorCandidates {
        let selector = NSSelectorFromString(selectorName)
        guard sessionObject.responds(to: selector),
          let publisher = sessionObject.perform(selector)?.takeUnretainedValue()
        else {
          continue
        }
        publishers.append(publisher)
      }
    }

    let mirror = Mirror(reflecting: session)
    for child in mirror.children {
      guard let label = child.label else {
        continue
      }
      if selectorCandidates.contains(label) {
        publishers.append(child.value)
      }
    }

    return publishers
  }

  private func bindGenericListener(on publisher: Any, handler: @escaping (Any?) -> Void) -> Any? {
    guard let publisherObject = publisher as? NSObject else {
      return nil
    }
    let listenerSelectors = [
      "listen:",
      "listenWithListener:",
      "addListener:",
      "addObserver:",
    ]
    for selectorName in listenerSelectors {
      let selector = NSSelectorFromString(selectorName)
      guard publisherObject.responds(to: selector) else {
        continue
      }
      let block: @convention(block) (Any?) -> Void = { payload in
        handler(payload)
      }
      let blockObject = unsafeBitCast(block, to: AnyObject.self)
      if let token = publisherObject.perform(selector, with: blockObject)?.takeUnretainedValue() {
        return token
      }
      return publisherObject
    }
    return nil
  }

  private func resolveNormalizedTimestampMs(from payload: Any?) -> Double {
    let rawTimestamp = resolveNumericField(
      payload: payload,
      keys: [
        "timestampMs",
        "timestamp",
        "timestampNs",
        "timestampNanos",
        "timestampUs",
        "timestampMicros",
        "captureTimestamp",
      ]
    )
    return normalizeEpochTimestampMs(rawTimestamp)
  }

  private func resolveDroppedFrames(from payload: Any?) -> Int {
    let value = resolveNumericField(
      payload: payload,
      keys: [
        "droppedFrames",
        "droppedFrameCount",
        "dropCount",
      ]
    )
    return max(0, Int(value ?? 0))
  }

  private func resolveSampleRate(from payload: Any?) -> Int {
    let value = resolveNumericField(
      payload: payload,
      keys: [
        "sampleRate",
        "sampleRateHz",
        "audioSampleRate",
      ]
    )
    return max(8_000, Int(value ?? 16_000))
  }

  private func resolvePacketDelta(from payload: Any?) -> Int {
    let value = resolveNumericField(
      payload: payload,
      keys: [
        "packetDelta",
        "packetCount",
        "packets",
        "frameCount",
      ]
    )
    return max(1, Int(value ?? 1))
  }

  private func resolveNumericField(payload: Any?, keys: [String]) -> Double? {
    guard let payload else {
      return nil
    }

    if let dictionary = payload as? [String: Any] {
      for key in keys {
        if let number = resolveDouble(dictionary[key]) {
          return number
        }
      }
    }

    let mirror = Mirror(reflecting: payload)
    for child in mirror.children {
      guard let label = child.label, keys.contains(label) else {
        continue
      }
      if let number = resolveDouble(child.value) {
        return number
      }
    }

    return nil
  }

  private func resolveDouble(_ value: Any?) -> Double? {
    switch value {
    case let number as NSNumber:
      return number.doubleValue
    case let value as Double:
      return value
    case let value as Float:
      return Double(value)
    case let value as Int:
      return Double(value)
    case let value as UInt:
      return Double(value)
    default:
      return nil
    }
  }

  private func normalizeEpochTimestampMs(_ rawTimestamp: Double?) -> Double {
    let now = Date().timeIntervalSince1970 * 1_000
    guard let rawTimestamp, rawTimestamp.isFinite, rawTimestamp > 0 else {
      return now
    }
    if rawTimestamp >= 100_000_000_000_000_000 {
      return rawTimestamp / 1_000_000
    }
    if rawTimestamp >= 100_000_000_000_000 {
      return rawTimestamp / 1_000
    }
    if rawTimestamp < 10_000_000_000 {
      return rawTimestamp * 1_000
    }
    return rawTimestamp
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
  static let callbackSurfaceNotification = Notification.Name("\(notificationPrefix).callbackSurface")

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

  @objc static func publishCallbackSurfaceDiagnostics(
    _ surface: String,
    status: String,
    reasonCode: String?,
    message: String?
  ) {
    NotificationCenter.default.post(
      name: callbackSurfaceNotification,
      object: nil,
      userInfo: [
        "surface": surface,
        "status": status,
        "reasonCode": reasonCode as Any,
        "message": message as Any,
      ]
    )
  }
}

@objc(MetaGlassesBridge)
class MetaGlassesBridge: RCTEventEmitter {
  private static let statusEvent = "metaBridgeStatusDidChange"
  private static let connectTimeoutNs: UInt64 = 20_000_000_000
  private static let maxDebugEvents = 250

  private struct DebugEvent {
    let id: String
    let atMs: Double
    let stage: String
    let severity: String
    let code: String
    let message: String
    let details: [String: Any]?

    func payload() -> [String: Any] {
      var rendered: [String: Any] = [
        "id": id,
        "atMs": atMs,
        "stage": stage,
        "severity": severity,
        "code": code,
        "message": message,
      ]
      if let details {
        rendered["details"] = details
      }
      return rendered
    }
  }

  private var hasListeners = false
  private var connectionState = "disconnected"
  private var fallbackReason: String?
  private var callbackSurfaceFallbackReason: String?
  private var failure: [String: Any]?
  private var connectTimeoutTask: Task<Void, Never>?
  private var debugEventSequence = 0
  private var debugEvents: [DebugEvent] = []
  private var callbackSurfaceDiagnostics: [String: String] = [:]
  private lazy var bluetoothManager: CBCentralManager = {
    CBCentralManager(delegate: nil, queue: nil, options: [CBCentralManagerOptionShowPowerAlertKey: false])
  }()

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
    appendDebugEvent(
      stage: "status",
      code: "bridge_runtime_initialized",
      message: "Meta bridge runtime initialized.",
      details: [
        "datSdkAvailable": isDatSdkAvailable(),
      ]
    )
  }

  deinit {
    connectTimeoutTask?.cancel()
    connectTimeoutTask = nil
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
    appendDebugEvent(
      stage: "initiated",
      code: "connect_requested",
      message: "Connect Meta glasses requested from React Native.",
      details: [
        "currentState": connectionState,
      ]
    )

    if connectionState == "connected" {
      appendDebugEvent(
        stage: "success",
        code: "already_connected",
        message: "Meta bridge is already connected.",
        details: gatherConnectionDetails()
      )
      resolve(buildSnapshot())
      return
    }

    ensureCameraPermissionForConnect { [weak self] granted in
      guard let self else { return }
      guard granted else {
        self.applyFailure(
          reasonCode: "dat_permission_denied",
          message: "Camera permission is required for Meta glasses streaming. Enable Camera access in Settings and reconnect.",
          recoverable: true,
          fallback: "dat_permission_denied"
        )
        resolve(self.buildSnapshot())
        return
      }
      self.performConnect(resolve)
    }
  }

  private func performConnect(_ resolve: @escaping RCTPromiseResolveBlock) {
    datRuntimeConnector.start()
    datRuntimeConnector.refreshStreamSession()

    cancelConnectTimeout()
    connectionState = "connecting"
    failure = nil
    fallbackReason = nil
    callbackSurfaceFallbackReason = nil
    callbackSurfaceDiagnostics.removeAll()
    appendDebugEvent(
      stage: "connecting",
      code: "connect_invoked",
      message: "DAT connector started; waiting for bridge readiness.",
      details: gatherConnectionDetails()
    )
    emitStatus()

    if !isDatSdkAvailable() {
      appendDebugEvent(
        stage: "failure",
        severity: "error",
        code: "dat_sdk_unavailable",
        message: "DAT SDK unavailable in this native build.",
        details: gatherConnectionDetails()
      )
      applyFailure(
        reasonCode: "dat_sdk_unavailable",
        message: "Meta DAT SDK not linked in the native target.",
        recoverable: true,
        fallback: "dat_sdk_missing"
      )
      resolve(buildSnapshot())
      return
    }

    if let datConfigurationIssue = resolveDatConfigurationIssue() {
      appendDebugEvent(
        stage: "failure",
        severity: "error",
        code: "dat_configuration_invalid",
        message: datConfigurationIssue,
        details: gatherConnectionDetails()
      )
      applyFailure(
        reasonCode: "dat_configuration_invalid",
        message: datConfigurationIssue,
        recoverable: true,
        fallback: "dat_configuration_invalid"
      )
      resolve(buildSnapshot())
      return
    }

    if hasActiveDevice() {
      cancelConnectTimeout()
      connectionState = "connected"
      failure = nil
      fallbackReason = resolveCallbackSurfaceFallbackReason()
      appendDebugEvent(
        stage: "success",
        code: "device_ready",
        message: "Active DAT device already available; bridge connected.",
        details: gatherConnectionDetails()
      )
      emitStatus()
      resolve(buildSnapshot())
      return
    }

    maybeStartRegistrationIfNeeded()
    fallbackReason = "awaiting_dat_device_identity"
    appendDebugEvent(
      stage: "discovering",
      code: "awaiting_dat_device_identity",
      message: "Awaiting DAT runtime device identity callback.",
      details: gatherConnectionDetails()
    )
    scheduleConnectTimeout()
    emitStatus()
    resolve(buildSnapshot())
  }

  private func ensureCameraPermissionForConnect(_ completion: @escaping (Bool) -> Void) {
    let status = AVCaptureDevice.authorizationStatus(for: .video)
    switch status {
    case .authorized:
      completion(true)
    case .notDetermined:
      appendDebugEvent(
        stage: "handshake",
        code: "camera_permission_request_started",
        message: "Requesting camera permission for DAT streaming.",
        details: gatherConnectionDetails()
      )
      AVCaptureDevice.requestAccess(for: .video) { [weak self] granted in
        DispatchQueue.main.async {
          guard let self else {
            completion(granted)
            return
          }
          self.appendDebugEvent(
            stage: granted ? "handshake" : "failure",
            severity: granted ? "info" : "warn",
            code: granted ? "camera_permission_request_granted" : "camera_permission_request_denied",
            message: granted
              ? "Camera permission granted for DAT streaming."
              : "Camera permission denied for DAT streaming.",
            details: self.gatherConnectionDetails()
          )
          completion(granted)
        }
      }
    case .denied, .restricted:
      appendDebugEvent(
        stage: "failure",
        severity: "warn",
        code: "camera_permission_denied",
        message: "Camera permission is denied or restricted.",
        details: gatherConnectionDetails()
      )
      completion(false)
    @unknown default:
      appendDebugEvent(
        stage: "failure",
        severity: "warn",
        code: "camera_permission_unknown",
        message: "Camera permission state is unknown.",
        details: gatherConnectionDetails()
      )
      completion(false)
    }
  }

  @objc(disconnect:rejecter:)
  func disconnect(
    _ resolve: RCTPromiseResolveBlock,
    rejecter reject: RCTPromiseRejectBlock
  ) {
    appendDebugEvent(
      stage: "disconnecting",
      code: "disconnect_requested",
      message: "Disconnect Meta glasses requested from React Native.",
      details: gatherConnectionDetails()
    )
    cancelConnectTimeout()
    datRuntimeConnector.stop()
    connectionState = "disconnected"
    sourceId = nil
    deviceId = nil
    deviceLabel = nil
    connectedAtMs = nil
    fallbackReason = nil
    callbackSurfaceFallbackReason = nil
    failure = nil
    callbackSurfaceDiagnostics.removeAll()
    appendDebugEvent(
      stage: "disconnected",
      code: "bridge_disconnected",
      message: "Meta bridge disconnected.",
      details: gatherConnectionDetails()
    )

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
        self.cancelConnectTimeout()
        self.connectionState = "connected"
        self.failure = nil
        self.fallbackReason = self.resolveCallbackSurfaceFallbackReason()
        self.appendDebugEvent(
          stage: "success",
          code: "device_connected",
          message: "DAT runtime reported active Meta glasses device.",
          details: [
            "deviceId": deviceId,
            "deviceLabel": deviceLabel,
            "providerId": providerId,
            "registrationState": self.resolveRegistrationState(),
          ]
        )
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
        self.cancelConnectTimeout()
        self.connectionState = "disconnected"
        self.fallbackReason = notification.userInfo?["reasonCode"] as? String
        self.sourceId = nil
        self.deviceId = nil
        self.deviceLabel = nil
        self.connectedAtMs = nil
        self.callbackSurfaceFallbackReason = nil
        self.callbackSurfaceDiagnostics.removeAll()
        self.appendDebugEvent(
          stage: "disconnected",
          code: "device_disconnected",
          message: "DAT runtime reported device disconnection.",
          details: [
            "reasonCode": self.fallbackReason ?? "unknown",
            "registrationState": self.resolveRegistrationState(),
          ]
        )
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

    runtimeObservers.append(
      center.addObserver(
        forName: MetaGlassesBridgeRuntime.callbackSurfaceNotification,
        object: nil,
        queue: .main
      ) { [weak self] notification in
        guard let self else { return }
        let payload = notification.userInfo ?? [:]
        let status = payload["status"] as? String ?? "unavailable"
        let surface = payload["surface"] as? String ?? "unknown"
        let explicitReason = payload["reasonCode"] as? String
        let surfaceReason = explicitReason ?? "dat_\(surface)_callback_\(status)"
        if status == "healthy" {
          self.callbackSurfaceFallbackReason = nil
          self.callbackSurfaceDiagnostics.removeValue(forKey: surface)
        } else {
          self.callbackSurfaceFallbackReason = surfaceReason
          self.callbackSurfaceDiagnostics[surface] = surfaceReason
        }
        if self.failure == nil {
          self.fallbackReason = self.resolveCallbackSurfaceFallbackReason()
        }
        self.appendDebugEvent(
          stage: status == "healthy" ? "handshake" : "failure",
          severity: status == "healthy" ? "info" : "warn",
          code: surfaceReason,
          message: payload["message"] as? String
            ?? "DAT callback surface \(surface) is \(status).",
          details: [
            "surface": surface,
            "status": status,
          ]
        )
        self.emitStatus()
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
    lastFrameTs = normalizeTimestampMs(timestampMs)
    failure = nil
    fallbackReason = resolveCallbackSurfaceFallbackReason()

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
    lastPacketTs = normalizeTimestampMs(timestampMs)
    failure = nil
    fallbackReason = resolveCallbackSurfaceFallbackReason()

    emitStatus()
  }

  private func applyFailure(reasonCode: String, message: String?, recoverable: Bool, fallback: String) {
    cancelConnectTimeout()
    connectionState = "error"
    failure = [
      "reasonCode": reasonCode,
      "message": message as Any,
      "recoverable": recoverable,
      "atMs": nowMs(),
    ]
    fallbackReason = fallback
    appendDebugEvent(
      stage: "failure",
      severity: "error",
      code: reasonCode,
      message: message ?? "Meta bridge failure.",
      details: [
        "recoverable": recoverable,
        "fallback": fallback,
        "registrationState": resolveRegistrationState(),
      ]
    )
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

  private func resolveCallbackSurfaceFallbackReason() -> String? {
    if callbackSurfaceDiagnostics.isEmpty {
      return callbackSurfaceFallbackReason
    }
    return callbackSurfaceDiagnostics
      .sorted(by: { $0.key < $1.key })
      .first?.value
  }

  private func scheduleConnectTimeout() {
    cancelConnectTimeout()
    connectTimeoutTask = Task { [weak self] in
      try? await Task.sleep(nanoseconds: Self.connectTimeoutNs)
      await MainActor.run {
        guard let self else { return }
        guard self.connectionState == "connecting", !self.hasActiveDevice() else {
          return
        }
        self.applyFailure(
          reasonCode: "dat_device_identity_timeout",
          message: "Timed out waiting for DAT runtime device identity. Ensure Meta glasses are connected in Meta AI and Bluetooth is enabled.",
          recoverable: true,
          fallback: "awaiting_dat_device_identity"
        )
      }
    }
  }

  private func cancelConnectTimeout() {
    connectTimeoutTask?.cancel()
    connectTimeoutTask = nil
  }

  private func maybeStartRegistrationIfNeeded() {
#if canImport(MWDATCore) && canImport(MWDATCamera)
    let registrationState = resolveRegistrationState()
    let normalized = registrationState.lowercased()
    if normalized.contains("registered") {
      appendDebugEvent(
        stage: "handshake",
        code: "registration_already_complete",
        message: "DAT registration already completed.",
        details: [
          "registrationState": registrationState,
        ]
      )
      return
    }
    if normalized.contains("registering") {
      appendDebugEvent(
        stage: "handshake",
        code: "registration_in_progress",
        message: "DAT registration already in progress.",
        details: [
          "registrationState": registrationState,
        ]
      )
      return
    }

    appendDebugEvent(
      stage: "handshake",
      code: "registration_start_requested",
      message: "Starting DAT registration flow.",
      details: [
        "registrationState": registrationState,
      ]
    )

    Task { @MainActor [weak self] in
      guard let self else { return }
      do {
        try await Wearables.shared.startRegistration()
        self.appendDebugEvent(
          stage: "handshake",
          code: "registration_start_succeeded",
          message: "DAT registration flow started.",
          details: [
            "registrationState": self.resolveRegistrationState(),
          ]
        )
        self.emitStatus()
      } catch {
        self.appendDebugEvent(
          stage: "failure",
          severity: "warn",
          code: "registration_start_failed",
          message: "DAT registration start failed: \(error.localizedDescription)",
          details: [
            "registrationState": self.resolveRegistrationState(),
          ]
        )
        if self.failure == nil && self.connectionState == "connecting" {
          self.applyFailure(
            reasonCode: "dat_registration_start_failed",
            message: error.localizedDescription,
            recoverable: true,
            fallback: "dat_registration_start_failed"
          )
        }
      }
    }
#else
    appendDebugEvent(
      stage: "failure",
      severity: "warn",
      code: "registration_unavailable",
      message: "DAT registration unavailable because DAT SDK is not linked."
    )
#endif
  }

  private func appendDebugEvent(
    stage: String,
    severity: String = "info",
    code: String,
    message: String,
    details: [String: Any]? = nil
  ) {
    let now = nowMs()
    debugEventSequence += 1
    let event = DebugEvent(
      id: "ios_meta_bridge_\(debugEventSequence)",
      atMs: now,
      stage: stage,
      severity: severity,
      code: code,
      message: message,
      details: details
    )
    debugEvents.append(event)
    if debugEvents.count > Self.maxDebugEvents {
      debugEvents.removeFirst(debugEvents.count - Self.maxDebugEvents)
    }
  }

  private func gatherConnectionDetails() -> [String: Any] {
    var details: [String: Any] = [
      "connectionState": connectionState,
      "datSdkAvailable": isDatSdkAvailable(),
      "registrationState": resolveRegistrationState(),
      "bluetoothAdapterState": resolveBluetoothAdapterState(),
      "bluetoothAuthorization": resolveBluetoothAuthorizationStatus(),
      "permissions": resolvePermissionSnapshot(),
    ]
    if let activeDevice = activeDevicePayload() {
      details["activeDevice"] = activeDevice
    }
    let discovered = resolveWearablesDeviceList()
    if !discovered.isEmpty {
      details["discoveredDevices"] = discovered
    }
    return details
  }

  private func buildRuntimeDiagnostics() -> [String: Any] {
    let discovered = resolveWearablesDeviceList()
    return [
      "platform": "ios",
      "registrationState": resolveRegistrationState(),
      "bluetoothAdapterState": resolveBluetoothAdapterState(),
      "bluetoothAuthorization": resolveBluetoothAuthorizationStatus(),
      "permissions": resolvePermissionSnapshot(),
      "discoveredDevices": discovered,
      "pairedDevices": discovered,
    ]
  }

  private func resolvePermissionSnapshot() -> [String: Any] {
    [
      "camera": resolveCameraPermissionStatus(),
      "microphone": resolveMicrophonePermissionStatus(),
      "bluetooth": resolveBluetoothAuthorizationStatus(),
    ]
  }

  private func resolveCameraPermissionStatus() -> String {
    switch AVCaptureDevice.authorizationStatus(for: .video) {
    case .authorized:
      return "granted"
    case .denied, .restricted:
      return "denied"
    case .notDetermined:
      return "not_determined"
    @unknown default:
      return "unknown"
    }
  }

  private func resolveMicrophonePermissionStatus() -> String {
    switch AVAudioSession.sharedInstance().recordPermission {
    case .granted:
      return "granted"
    case .denied:
      return "denied"
    case .undetermined:
      return "not_determined"
    @unknown default:
      return "unknown"
    }
  }

  private func resolveBluetoothAuthorizationStatus() -> String {
    if #available(iOS 13.1, *) {
      switch CBManager.authorization {
      case .allowedAlways:
        return "granted"
      case .denied, .restricted:
        return "denied"
      case .notDetermined:
        return "not_determined"
      @unknown default:
        return "unknown"
      }
    }
    return "unknown"
  }

  private func resolveBluetoothAdapterState() -> String {
    switch bluetoothManager.state {
    case .poweredOn:
      return "powered_on"
    case .poweredOff:
      return "powered_off"
    case .resetting:
      return "resetting"
    case .unauthorized:
      return "unauthorized"
    case .unsupported:
      return "unsupported"
    case .unknown:
      return "unknown"
    @unknown default:
      return "unknown"
    }
  }

  private func resolveRegistrationState() -> String {
#if canImport(MWDATCore) && canImport(MWDATCamera)
    return String(describing: Wearables.shared.registrationState)
#else
    return "unavailable"
#endif
  }

  private func resolveWearablesDeviceList() -> [[String: Any]] {
    var entries: [[String: Any]] = []
#if canImport(MWDATCore) && canImport(MWDATCamera)
    let wearables: Any = Wearables.shared
    let holders = [
      resolveSelectorValue(on: wearables, selectorName: "devices"),
      resolveSelectorValue(on: wearables, selectorName: "getDevices"),
      resolveMirrorChildValue("devices", in: wearables),
      resolveMirrorChildValue("connectedDevices", in: wearables),
      resolveMirrorChildValue("activeDevices", in: wearables),
    ].compactMap { $0 }

    for holder in holders {
      let unwrapped = unwrapStateContainerValue(holder)
      let candidates = resolveDeviceCandidates(from: unwrapped)
      for candidate in candidates {
        entries.append(resolveDeviceListEntry(candidate))
      }
      if !entries.isEmpty {
        break
      }
    }
#endif

    if entries.isEmpty, let active = activeDevicePayload() {
      entries.append([
        "deviceId": active["deviceId"] as? String ?? "unknown",
        "deviceLabel": active["deviceLabel"] as? String ?? "Ray-Ban Meta",
        "sourceClass": "meta_glasses",
        "providerId": providerId,
        "connected": true,
      ])
    }

    return entries
  }

  private func resolveDeviceCandidates(from value: Any?) -> [Any] {
    guard let value else {
      return []
    }
    if let array = value as? [Any] {
      return array
    }
    if let array = value as? NSArray {
      return array.compactMap { $0 }
    }
    if let set = value as? Set<AnyHashable> {
      return set.map { $0 as Any }
    }
    if let set = value as? NSSet {
      return set.allObjects
    }

    let mirror = Mirror(reflecting: value)
    if mirror.displayStyle == .optional {
      return resolveDeviceCandidates(from: mirror.children.first?.value)
    }
    if mirror.displayStyle == .collection || mirror.displayStyle == .set {
      return mirror.children.map { $0.value }
    }
    return []
  }

  private func resolveDeviceListEntry(_ device: Any) -> [String: Any] {
    let rawId = resolveDeviceString(
      from: device,
      keys: ["deviceId", "identifier", "id"]
    ) ?? String(describing: device)
    let normalizedId = sanitizeToken(rawId)
    let label = resolveDeviceString(
      from: device,
      keys: ["name", "label", "displayName"]
    ) ?? "Ray-Ban Meta"
    let normalizedLabel = label.trimmingCharacters(in: .whitespacesAndNewlines)
    return [
      "deviceId": normalizedId,
      "deviceLabel": normalizedLabel.isEmpty ? "Ray-Ban Meta" : normalizedLabel,
      "sourceClass": "meta_glasses",
      "providerId": providerId,
      "connected": deviceId == normalizedId,
    ]
  }

  private func resolveDeviceString(from device: Any, keys: [String]) -> String? {
    if let dictionary = device as? [String: Any] {
      for key in keys {
        if let resolved = resolveString(dictionary[key]) {
          return resolved
        }
      }
    }

    for key in keys {
      if let resolved = resolveString(resolveSelectorValue(on: device, selectorName: key)) {
        return resolved
      }
      let getterSelector = "get\(key.prefix(1).uppercased())\(String(key.dropFirst()))"
      if let resolved = resolveString(resolveSelectorValue(on: device, selectorName: getterSelector)) {
        return resolved
      }
      if let resolved = resolveString(resolveMirrorChildValue(key, in: device)) {
        return resolved
      }
    }
    return nil
  }

  private func resolveString(_ value: Any?) -> String? {
    switch value {
    case let string as String:
      let trimmed = string.trimmingCharacters(in: .whitespacesAndNewlines)
      return trimmed.isEmpty ? nil : trimmed
    case let number as NSNumber:
      let rendered = number.stringValue.trimmingCharacters(in: .whitespacesAndNewlines)
      return rendered.isEmpty ? nil : rendered
    default:
      guard let value else {
        return nil
      }
      let rendered = String(describing: value).trimmingCharacters(in: .whitespacesAndNewlines)
      guard !rendered.isEmpty, rendered.lowercased() != "nil" else {
        return nil
      }
      return rendered
    }
  }

  private func resolveSelectorValue(on target: Any, selectorName: String) -> Any? {
    guard let object = target as? NSObject else {
      return nil
    }
    let selector = NSSelectorFromString(selectorName)
    guard object.responds(to: selector) else {
      return nil
    }
    return object.perform(selector)?.takeUnretainedValue()
  }

  private func resolveMirrorChildValue(_ key: String, in value: Any) -> Any? {
    var mirror: Mirror? = Mirror(reflecting: value)
    while let current = mirror {
      if let child = current.children.first(where: { $0.label == key }) {
        return child.value
      }
      mirror = current.superclassMirror
    }
    return nil
  }

  private func unwrapStateContainerValue(_ holder: Any) -> Any {
    let valueCandidates = [
      resolveSelectorValue(on: holder, selectorName: "value"),
      resolveSelectorValue(on: holder, selectorName: "getValue"),
      resolveSelectorValue(on: holder, selectorName: "currentValue"),
      resolveSelectorValue(on: holder, selectorName: "wrappedValue"),
      resolveMirrorChildValue("value", in: holder),
      resolveMirrorChildValue("currentValue", in: holder),
      resolveMirrorChildValue("wrappedValue", in: holder),
      resolveMirrorChildValue("state", in: holder),
    ]
    for candidate in valueCandidates {
      if let candidate {
        return candidate
      }
    }
    return holder
  }

  private func sanitizeToken(_ value: String) -> String {
    let normalized = value
      .trimmingCharacters(in: .whitespacesAndNewlines)
      .lowercased()
      .replacingOccurrences(of: "[^a-z0-9._-]+", with: "_", options: .regularExpression)
      .replacingOccurrences(of: "^_+|_+$", with: "", options: .regularExpression)
    return normalized.isEmpty ? "unknown" : normalized
  }

  private func resolveDatConfigurationIssue() -> String? {
    guard let infoDictionary = Bundle.main.infoDictionary else {
      return "Info.plist is unavailable at runtime."
    }

    guard let datConfig = infoDictionary["MWDAT"] as? [String: Any] else {
      return "Info.plist is missing MWDAT configuration."
    }

    let requiredKeys = ["AppLinkURLScheme", "MetaAppID", "ClientToken", "TeamID"]
    var issues: [String] = []
    for key in requiredKeys {
      guard let rawValue = datConfig[key] as? String else {
        issues.append("MWDAT.\(key) missing")
        continue
      }
      let value = rawValue.trimmingCharacters(in: .whitespacesAndNewlines)
      if value.isEmpty {
        issues.append("MWDAT.\(key) empty")
        continue
      }
      if value.hasPrefix("$(") && value.hasSuffix(")") {
        issues.append("MWDAT.\(key) unresolved")
      }
    }

    if let rawScheme = datConfig["AppLinkURLScheme"] as? String {
      let normalizedScheme = normalizeDatUrlScheme(rawScheme)
      if normalizedScheme.isEmpty {
        issues.append("MWDAT.AppLinkURLScheme invalid")
      } else if !isUrlSchemeDeclared(normalizedScheme, infoDictionary: infoDictionary) {
        issues.append("CFBundleURLTypes missing scheme \(normalizedScheme)")
      }
    }

    let backgroundModes = Set(
      (infoDictionary["UIBackgroundModes"] as? [String] ?? [])
        .map { $0.lowercased() }
    )
    if !backgroundModes.contains("bluetooth-peripheral") {
      issues.append("UIBackgroundModes missing bluetooth-peripheral")
    }
    if !backgroundModes.contains("external-accessory") {
      issues.append("UIBackgroundModes missing external-accessory")
    }

    let accessoryProtocols = Set(
      (infoDictionary["UISupportedExternalAccessoryProtocols"] as? [String] ?? [])
        .map { $0.lowercased() }
    )
    if !accessoryProtocols.contains("com.meta.ar.wearable") {
      issues.append("UISupportedExternalAccessoryProtocols missing com.meta.ar.wearable")
    }

    guard !issues.isEmpty else {
      return nil
    }

    return "DAT configuration invalid: \(issues.joined(separator: "; "))."
  }

  private func normalizeDatUrlScheme(_ value: String) -> String {
    let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !trimmed.isEmpty else {
      return ""
    }
    let withoutSuffix =
      trimmed.hasSuffix("://")
        ? String(trimmed.dropLast(3))
        : trimmed
    return withoutSuffix.lowercased()
  }

  private func isUrlSchemeDeclared(_ scheme: String, infoDictionary: [String: Any]) -> Bool {
    guard let urlTypes = infoDictionary["CFBundleURLTypes"] as? [[String: Any]] else {
      return false
    }

    for entry in urlTypes {
      guard let schemes = entry["CFBundleURLSchemes"] as? [String] else {
        continue
      }
      if schemes.contains(where: { $0.caseInsensitiveCompare(scheme) == .orderedSame }) {
        return true
      }
    }
    return false
  }

  private func isDatSdkAvailable() -> Bool {
#if canImport(MWDATCore) && canImport(MWDATCamera)
    return true
#else
    return NSClassFromString("Wearables") != nil
      || NSClassFromString("MetaWearables.Wearables") != nil
#endif
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
      "datSdkAvailable": isDatSdkAvailable(),
      "frameIngress": frameIngress,
      "audioIngress": audioIngress,
      "diagnostics": buildRuntimeDiagnostics(),
      "debugEvents": debugEvents.map { $0.payload() },
      "updatedAtMs": now,
    ]
    if let activeDevice = activeDevicePayload() {
      snapshot["activeDevice"] = activeDevice
    }
    if let failure {
      snapshot["failure"] = failure
    }
    if let resolvedFallbackReason = resolveCallbackSurfaceFallbackReason() ?? fallbackReason {
      snapshot["fallbackReason"] = resolvedFallbackReason
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

  private func normalizeTimestampMs(_ rawTimestampMs: Double?) -> Double {
    let now = nowMs()
    guard let rawTimestampMs, rawTimestampMs.isFinite, rawTimestampMs > 0 else {
      return now
    }
    if rawTimestampMs >= 100_000_000_000_000_000 {
      return rawTimestampMs / 1_000_000
    }
    if rawTimestampMs >= 100_000_000_000_000 {
      return rawTimestampMs / 1_000
    }
    if rawTimestampMs < 10_000_000_000 {
      return rawTimestampMs * 1_000
    }
    return rawTimestampMs
  }
}
