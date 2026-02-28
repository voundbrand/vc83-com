package com.l4yercak3.mobile.metabridge

import android.content.Context
import android.os.Handler
import android.os.Looper
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import kotlin.math.max

object MetaGlassesBridgeRuntimeHooks {
  data class DeviceIdentity(
    val sourceId: String,
    val providerId: String,
    val deviceId: String,
    val deviceLabel: String,
    val connectedAtMs: Double = System.currentTimeMillis().toDouble(),
  )

  interface Listener {
    fun onDeviceConnected(device: DeviceIdentity)
    fun onDeviceDisconnected(reasonCode: String?)
    fun onFrameIngress(timestampMs: Double, droppedFrames: Int)
    fun onAudioIngress(timestampMs: Double, sampleRate: Int, packetDelta: Int)
    fun onFailure(reasonCode: String, message: String?, recoverable: Boolean)
  }

  private val listeners = mutableSetOf<Listener>()

  @Synchronized
  fun register(listener: Listener) {
    listeners.add(listener)
  }

  @Synchronized
  fun unregister(listener: Listener) {
    listeners.remove(listener)
  }

  @JvmStatic
  fun publishDeviceConnected(device: DeviceIdentity) {
    listenersSnapshot().forEach { it.onDeviceConnected(device) }
  }

  @JvmStatic
  fun publishDeviceDisconnected(reasonCode: String? = null) {
    listenersSnapshot().forEach { it.onDeviceDisconnected(reasonCode) }
  }

  @JvmStatic
  fun publishFrameIngress(timestampMs: Double, droppedFrames: Int = 0) {
    listenersSnapshot().forEach { it.onFrameIngress(timestampMs, droppedFrames) }
  }

  @JvmStatic
  fun publishAudioIngress(timestampMs: Double, sampleRate: Int, packetDelta: Int = 1) {
    listenersSnapshot().forEach { it.onAudioIngress(timestampMs, sampleRate, packetDelta) }
  }

  @JvmStatic
  fun publishFailure(reasonCode: String, message: String?, recoverable: Boolean = true) {
    listenersSnapshot().forEach { it.onFailure(reasonCode, message, recoverable) }
  }

  @Synchronized
  private fun listenersSnapshot(): List<Listener> = listeners.toList()
}

private class MetaDatSdkRuntimeConnector(
  private val context: Context,
) {
  private val handler = Handler(Looper.getMainLooper())
  private var started = false
  private var lastDeviceFingerprint: String? = null
  private var ingressBound = false
  private var ingressFailurePublished = false

  private val devicePollRunnable = object : Runnable {
    override fun run() {
      if (!started) {
        return
      }
      pollDeviceState()
      handler.postDelayed(this, 1_500L)
    }
  }

  fun start() {
    if (started) {
      return
    }
    started = true
    handler.post(devicePollRunnable)
  }

  fun stop() {
    if (!started) {
      return
    }
    started = false
    handler.removeCallbacks(devicePollRunnable)
    lastDeviceFingerprint = null
    ingressBound = false
  }

  private fun pollDeviceState() {
    val device = resolveActiveDevice()
    if (device == null) {
      if (lastDeviceFingerprint != null) {
        lastDeviceFingerprint = null
        MetaGlassesBridgeRuntimeHooks.publishDeviceDisconnected("dat_device_disconnected")
      }
      return
    }

    val fingerprint = "${device.deviceId}:${device.deviceLabel}"
    if (fingerprint != lastDeviceFingerprint) {
      lastDeviceFingerprint = fingerprint
      MetaGlassesBridgeRuntimeHooks.publishDeviceConnected(
        MetaGlassesBridgeRuntimeHooks.DeviceIdentity(
          sourceId = device.sourceId,
          providerId = device.providerId,
          deviceId = device.deviceId,
          deviceLabel = device.deviceLabel,
          connectedAtMs = nowMs(),
        )
      )
    }

    bindIngressEventSourcesIfAvailable()
  }

  private fun bindIngressEventSourcesIfAvailable() {
    if (ingressBound) {
      return
    }

    val hasDatCameraApis = classExists("com.meta.wearable.dat.camera.StreamSession")
      || classExists("com.meta.wearable.dat.camera.types.VideoFrame")

    if (hasDatCameraApis) {
      ingressBound = true
      return
    }

    if (!ingressFailurePublished) {
      ingressFailurePublished = true
      // TODO(meta-dat-sdk): Bind DAT StreamSession video/audio callbacks and publish
      // MetaGlassesBridgeRuntimeHooks.publishFrameIngress/publishAudioIngress directly from DAT.
      MetaGlassesBridgeRuntimeHooks.publishFailure(
        reasonCode = "dat_ingress_listener_unavailable",
        message = "DAT core is present but camera/audio ingress listeners are not bound in this build.",
        recoverable = true,
      )
    }
  }

  private data class ResolvedDatDevice(
    val sourceId: String,
    val providerId: String,
    val deviceId: String,
    val deviceLabel: String,
  )

  private fun resolveActiveDevice(): ResolvedDatDevice? {
    val wearablesClass = runCatching {
      Class.forName("com.meta.wearable.dat.core.Wearables")
    }.getOrNull() ?: return null

    val devicesHolder = resolveDevicesHolder(wearablesClass) ?: return null
    val devicesValue = unwrapStateContainerValue(devicesHolder)

    val device = when (devicesValue) {
      is Set<*> -> devicesValue.firstOrNull()
      is Iterable<*> -> devicesValue.firstOrNull()
      is Array<*> -> devicesValue.firstOrNull()
      else -> null
    } ?: return null

    val providerId = "meta_dat_bridge"
    val deviceId = resolveDeviceString(device, listOf("deviceId", "identifier", "id"))
      ?: sanitizeToken(device.toString())
    val deviceLabel = resolveDeviceString(device, listOf("name", "label", "displayName"))
      ?: "rayban_meta"

    return ResolvedDatDevice(
      sourceId = "meta_glasses:$providerId:${sanitizeToken(deviceLabel)}",
      providerId = providerId,
      deviceId = sanitizeToken(deviceId),
      deviceLabel = deviceLabel,
    )
  }

  private fun resolveDevicesHolder(wearablesClass: Class<*>): Any? {
    val getDevices = wearablesClass.methods.firstOrNull {
      it.name == "getDevices" && it.parameterCount == 0
    }
    if (getDevices != null) {
      return runCatching {
        getDevices.invoke(null)
      }.getOrNull()
    }

    val devicesField = wearablesClass.declaredFields.firstOrNull { it.name == "devices" }
    if (devicesField != null) {
      return runCatching {
        devicesField.isAccessible = true
        devicesField.get(null)
      }.getOrNull()
    }

    return null
  }

  private fun unwrapStateContainerValue(holder: Any): Any? {
    val getValueMethod = holder.javaClass.methods.firstOrNull {
      it.name == "getValue" && it.parameterCount == 0
    }
    if (getValueMethod != null) {
      return runCatching {
        getValueMethod.invoke(holder)
      }.getOrNull()
    }
    return holder
  }

  private fun resolveDeviceString(device: Any, keys: List<String>): String? {
    for (key in keys) {
      val methodName = "get" + key.replaceFirstChar { it.uppercaseChar() }
      val method = device.javaClass.methods.firstOrNull {
        it.name == methodName && it.parameterCount == 0
      }
      if (method != null) {
        val value = runCatching {
          method.invoke(device)
        }.getOrNull()?.toString()?.trim()
        if (!value.isNullOrEmpty()) {
          return value
        }
      }
    }
    return null
  }

  private fun sanitizeToken(value: String): String {
    val normalized = value
      .trim()
      .lowercase()
      .replace(Regex("[^a-z0-9._-]+"), "_")
      .replace(Regex("^_+|_+$"), "")
    return if (normalized.isNotEmpty()) normalized else "unknown"
  }

  private fun classExists(name: String): Boolean {
    return try {
      Class.forName(name)
      true
    } catch (_: Throwable) {
      false
    }
  }

  private fun nowMs(): Double = System.currentTimeMillis().toDouble()
}

class MetaGlassesBridgeModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext),
  MetaGlassesBridgeRuntimeHooks.Listener {

  companion object {
    private const val MODULE_NAME = "MetaGlassesBridge"
    private const val STATUS_EVENT = "metaBridgeStatusDidChange"
  }

  private val mainHandler = Handler(Looper.getMainLooper())
  private val datRuntimeConnector = MetaDatSdkRuntimeConnector(reactContext.applicationContext)

  private var listeners = 0
  private var connectionState = "disconnected"
  private var fallbackReason: String? = null
  private var failure: FailureState? = null

  private var sourceId: String? = null
  private var providerId = "meta_dat_bridge"
  private var deviceId: String? = null
  private var deviceLabel: String? = null
  private var connectedAtMs: Double? = null

  private var totalFrames = 0
  private var droppedFrames = 0
  private var lastFrameTs: Double? = null

  private var sampleRate = 16_000
  private var packetCount = 0
  private var lastPacketTs: Double? = null

  init {
    MetaGlassesBridgeRuntimeHooks.register(this)
    datRuntimeConnector.start()
  }

  override fun getName(): String = MODULE_NAME

  @ReactMethod
  fun addListener(eventName: String) {
    listeners += 1
  }

  @ReactMethod
  fun removeListeners(count: Double) {
    listeners = max(0, listeners - count.toInt())
  }

  @ReactMethod
  fun connect(promise: Promise) {
    postOnMain {
      if (connectionState == "connected") {
        promise.resolve(buildSnapshot())
        return@postOnMain
      }

      connectionState = "connecting"
      failure = null
      fallbackReason = null
      emitStatus()

      if (!isDatSdkAvailable()) {
        applyFailure(
          reasonCode = "dat_sdk_unavailable",
          message = "Meta DAT SDK not linked in the native target.",
          recoverable = true,
          fallback = "dat_sdk_missing",
        )
        promise.resolve(buildSnapshot())
        return@postOnMain
      }

      if (hasActiveDevice()) {
        connectionState = "connected"
        failure = null
        fallbackReason = null
        emitStatus()
        promise.resolve(buildSnapshot())
        return@postOnMain
      }

      applyFailure(
        reasonCode = "dat_device_identity_unavailable",
        message = "Awaiting DAT runtime device identity callback.",
        recoverable = true,
        fallback = "awaiting_dat_device_identity",
      )
      promise.resolve(buildSnapshot())
    }
  }

  @ReactMethod
  fun disconnect(promise: Promise) {
    postOnMain {
      connectionState = "disconnected"
      fallbackReason = null
      failure = null
      sourceId = null
      deviceId = null
      deviceLabel = null
      connectedAtMs = null
      emitStatus()
      promise.resolve(buildSnapshot())
    }
  }

  @ReactMethod
  fun getStatus(promise: Promise) {
    promise.resolve(buildSnapshot())
  }

  @ReactMethod
  fun recordFrameIngress(payload: ReadableMap?, promise: Promise) {
    postOnMain {
      val timestampMs = payload?.let { readable ->
        if (readable.hasKey("timestampMs")) readable.getDouble("timestampMs") else null
      } ?: nowMs()
      val dropped = payload?.let { readable ->
        if (readable.hasKey("droppedFrames")) readable.getInt("droppedFrames") else 0
      } ?: 0

      ingestFrame(timestampMs = timestampMs, dropped = dropped)
      promise.resolve(buildSnapshot())
    }
  }

  @ReactMethod
  fun recordAudioIngress(payload: ReadableMap?, promise: Promise) {
    postOnMain {
      val timestampMs = payload?.let { readable ->
        if (readable.hasKey("timestampMs")) readable.getDouble("timestampMs") else null
      } ?: nowMs()
      val packetDelta = payload?.let { readable ->
        if (readable.hasKey("packets")) readable.getInt("packets") else 1
      } ?: 1
      val inboundSampleRate = payload?.let { readable ->
        if (readable.hasKey("sampleRate")) readable.getInt("sampleRate") else sampleRate
      } ?: sampleRate

      ingestAudio(
        timestampMs = timestampMs,
        sampleRateValue = inboundSampleRate,
        packetDelta = packetDelta,
      )
      promise.resolve(buildSnapshot())
    }
  }

  override fun onDeviceConnected(device: MetaGlassesBridgeRuntimeHooks.DeviceIdentity) {
    postOnMain {
      sourceId = device.sourceId
      providerId = device.providerId
      deviceId = device.deviceId
      deviceLabel = device.deviceLabel
      connectedAtMs = device.connectedAtMs
      connectionState = "connected"
      failure = null
      fallbackReason = null
      emitStatus()
    }
  }

  override fun onDeviceDisconnected(reasonCode: String?) {
    postOnMain {
      connectionState = "disconnected"
      fallbackReason = reasonCode
      sourceId = null
      deviceId = null
      deviceLabel = null
      connectedAtMs = null
      emitStatus()
    }
  }

  override fun onFrameIngress(timestampMs: Double, droppedFrames: Int) {
    postOnMain {
      ingestFrame(timestampMs = timestampMs, dropped = droppedFrames)
    }
  }

  override fun onAudioIngress(timestampMs: Double, sampleRate: Int, packetDelta: Int) {
    postOnMain {
      ingestAudio(
        timestampMs = timestampMs,
        sampleRateValue = sampleRate,
        packetDelta = packetDelta,
      )
    }
  }

  override fun onFailure(reasonCode: String, message: String?, recoverable: Boolean) {
    postOnMain {
      applyFailure(
        reasonCode = reasonCode,
        message = message,
        recoverable = recoverable,
        fallback = reasonCode,
      )
    }
  }

  override fun invalidate() {
    super.invalidate()
    MetaGlassesBridgeRuntimeHooks.unregister(this)
    datRuntimeConnector.stop()
    mainHandler.removeCallbacksAndMessages(null)
  }

  private fun ingestFrame(timestampMs: Double, dropped: Int) {
    if (connectionState != "connected") {
      applyFailure(
        reasonCode = "bridge_unavailable",
        message = "Frame ingress rejected while bridge is disconnected.",
        recoverable = true,
        fallback = "bridge_unavailable",
      )
      return
    }

    totalFrames += 1
    droppedFrames += max(0, dropped)
    lastFrameTs = timestampMs
    failure = null
    fallbackReason = null
    emitStatus()
  }

  private fun ingestAudio(timestampMs: Double, sampleRateValue: Int, packetDelta: Int) {
    if (connectionState != "connected") {
      applyFailure(
        reasonCode = "bridge_unavailable",
        message = "Audio ingress rejected while bridge is disconnected.",
        recoverable = true,
        fallback = "bridge_unavailable",
      )
      return
    }

    packetCount += max(1, packetDelta)
    sampleRate = max(8_000, sampleRateValue)
    lastPacketTs = timestampMs
    failure = null
    fallbackReason = null
    emitStatus()
  }

  private fun applyFailure(
    reasonCode: String,
    message: String?,
    recoverable: Boolean,
    fallback: String,
  ) {
    connectionState = "error"
    failure = FailureState(
      reasonCode = reasonCode,
      message = message,
      recoverable = recoverable,
      atMs = nowMs(),
    )
    fallbackReason = fallback
    emitStatus()
  }

  private fun hasActiveDevice(): Boolean {
    return !sourceId.isNullOrBlank() && !deviceId.isNullOrBlank() && !deviceLabel.isNullOrBlank()
  }

  private fun isDatSdkAvailable(): Boolean {
    return classExists("com.meta.wearable.dat.core.Wearables")
      || classExists("com.meta.wearable.dat.core.WearablesKt")
  }

  private fun classExists(name: String): Boolean {
    return try {
      Class.forName(name)
      true
    } catch (_: Throwable) {
      false
    }
  }

  private fun postOnMain(action: () -> Unit) {
    if (Looper.myLooper() == Looper.getMainLooper()) {
      action()
      return
    }
    mainHandler.post(action)
  }

  private fun emitStatus() {
    if (listeners <= 0) {
      return
    }
    reactContext
      .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      .emit(STATUS_EVENT, buildSnapshot())
  }

  private fun buildSnapshot(): WritableMap {
    val snapshot = Arguments.createMap()
    val now = nowMs()
    snapshot.putString("connectionState", connectionState)

    if (sourceId != null && deviceId != null && deviceLabel != null) {
      val activeDevice = Arguments.createMap()
      activeDevice.putString("sourceId", sourceId)
      activeDevice.putString("sourceClass", "meta_glasses")
      activeDevice.putString("providerId", providerId)
      activeDevice.putString("deviceId", deviceId)
      activeDevice.putString("deviceLabel", deviceLabel)
      connectedAtMs?.let { activeDevice.putDouble("connectedAtMs", it) }
      snapshot.putMap("activeDevice", activeDevice)
    } else {
      snapshot.putNull("activeDevice")
    }

    val frameIngress = Arguments.createMap()
    frameIngress.putInt("totalFrames", totalFrames)
    frameIngress.putInt("droppedFrames", droppedFrames)
    frameIngress.putDouble("fps", resolveFps(now))
    if (lastFrameTs != null) {
      frameIngress.putDouble("lastFrameTs", lastFrameTs!!)
    } else {
      frameIngress.putNull("lastFrameTs")
    }
    snapshot.putMap("frameIngress", frameIngress)

    val audioIngress = Arguments.createMap()
    audioIngress.putInt("sampleRate", sampleRate)
    audioIngress.putInt("packetCount", packetCount)
    if (lastPacketTs != null) {
      audioIngress.putDouble("lastPacketTs", lastPacketTs!!)
    } else {
      audioIngress.putNull("lastPacketTs")
    }
    snapshot.putMap("audioIngress", audioIngress)

    if (failure != null) {
      val failureMap = Arguments.createMap()
      failureMap.putString("reasonCode", failure!!.reasonCode)
      if (failure!!.message != null) {
        failureMap.putString("message", failure!!.message)
      } else {
        failureMap.putNull("message")
      }
      failureMap.putBoolean("recoverable", failure!!.recoverable)
      failureMap.putDouble("atMs", failure!!.atMs)
      snapshot.putMap("failure", failureMap)
    } else {
      snapshot.putNull("failure")
    }

    if (fallbackReason != null) {
      snapshot.putString("fallbackReason", fallbackReason)
    } else {
      snapshot.putNull("fallbackReason")
    }

    snapshot.putDouble("updatedAtMs", now)
    return snapshot
  }

  private fun resolveFps(now: Double): Double {
    val startedAt = connectedAtMs ?: return 0.0
    val seconds = max(0.001, (now - startedAt) / 1_000.0)
    return totalFrames / seconds
  }

  private fun nowMs(): Double = System.currentTimeMillis().toDouble()

  private data class FailureState(
    val reasonCode: String,
    val message: String?,
    val recoverable: Boolean,
    val atMs: Double,
  )
}
