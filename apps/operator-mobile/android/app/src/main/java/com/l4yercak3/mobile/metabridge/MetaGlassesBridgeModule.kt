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
import java.lang.reflect.Proxy
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
    fun onCallbackSurfaceDiagnostics(
      surface: String,
      status: String,
      reasonCode: String?,
      message: String?,
    )
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
  fun publishCallbackSurfaceDiagnostics(
    surface: String,
    status: String,
    reasonCode: String? = null,
    message: String? = null,
  ) {
    listenersSnapshot().forEach {
      it.onCallbackSurfaceDiagnostics(
        surface = surface,
        status = status,
        reasonCode = reasonCode,
        message = message,
      )
    }
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
  private var boundSessionIdentity: String? = null
  private var frameListenerHandle: Any? = null
  private var audioListenerHandle: Any? = null
  private var stateListenerHandle: Any? = null
  private var errorListenerHandle: Any? = null
  private var didReceiveVideoIngress = false
  private var didReceiveAudioIngress = false
  private var publishedVideoStalled = false
  private var publishedAudioStalled = false
  private var bindingStartedAtMs: Double? = null
  private val callbackSurfaceStatus = mutableMapOf<String, String>()

  private val devicePollRunnable = object : Runnable {
    override fun run() {
      if (!started) {
        return
      }
      pollDeviceState()
      evaluateIngressHealth()
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
    clearIngressBindings()
  }

  private fun pollDeviceState() {
    val device = resolveActiveDevice()
    if (device == null) {
      clearIngressBindings()
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

    bindIngressEventSourcesIfAvailable(device)
  }

  private fun bindIngressEventSourcesIfAvailable(device: ResolvedDatDevice) {
    val streamSession = resolveStreamSession()
    if (streamSession == null) {
      clearIngressBindings()
      publishCallbackSurfaceDiagnostics(
        surface = "video",
        status = "unavailable",
        reasonCode = "dat_video_callback_surface_unavailable",
        message = "DAT StreamSession callback surface unavailable for active device ${device.deviceId}.",
      )
      publishCallbackSurfaceDiagnostics(
        surface = "audio",
        status = "unavailable",
        reasonCode = "dat_audio_callback_surface_unavailable",
        message = "DAT StreamSession callback surface unavailable for active device ${device.deviceId}.",
      )
      return
    }

    val sessionIdentity = streamSessionIdentity(streamSession)
    if (ingressBound && boundSessionIdentity == sessionIdentity) {
      return
    }

    clearIngressBindings()

    val framePublisher = resolvePublisher(
      streamSession,
      listOf(
        "videoFramePublisher",
        "getVideoFramePublisher",
        "framePublisher",
        "getFramePublisher",
        "videoPublisher",
        "getVideoPublisher",
      ),
    )
    frameListenerHandle = framePublisher?.let { publisher ->
      bindGenericListener(publisher) { payload ->
        didReceiveVideoIngress = true
        MetaGlassesBridgeRuntimeHooks.publishFrameIngress(
          timestampMs = normalizeEpochTimestampMs(
            resolveNumericField(
              payload = payload,
              keys = listOf(
                "timestampMs",
                "timestamp",
                "timestampNs",
                "timestampNanos",
                "timestampUs",
                "timestampMicros",
                "captureTimestamp",
              ),
            ),
          ),
          droppedFrames = max(
            0,
            (resolveNumericField(
              payload = payload,
              keys = listOf("droppedFrames", "droppedFrameCount", "dropCount"),
            ) ?: 0.0).toInt(),
          ),
        )
        publishCallbackSurfaceDiagnostics(surface = "video", status = "healthy")
      }
    }
    if (frameListenerHandle == null) {
      publishCallbackSurfaceDiagnostics(
        surface = "video",
        status = "unavailable",
        reasonCode = "dat_video_callback_surface_unavailable",
        message = "DAT video callback listener surface unavailable in StreamSession.",
      )
    }

    val audioPublisher = resolvePublisher(
      streamSession,
      listOf(
        "audioPacketPublisher",
        "getAudioPacketPublisher",
        "audioFramePublisher",
        "getAudioFramePublisher",
        "audioPublisher",
        "getAudioPublisher",
        "audioDataPublisher",
        "getAudioDataPublisher",
        "audioSamplePublisher",
        "getAudioSamplePublisher",
      ),
    )
    audioListenerHandle = audioPublisher?.let { publisher ->
      bindGenericListener(publisher) { payload ->
        didReceiveAudioIngress = true
        MetaGlassesBridgeRuntimeHooks.publishAudioIngress(
          timestampMs = normalizeEpochTimestampMs(
            resolveNumericField(
              payload = payload,
              keys = listOf(
                "timestampMs",
                "timestamp",
                "timestampNs",
                "timestampNanos",
                "timestampUs",
                "timestampMicros",
                "captureTimestamp",
              ),
            ),
          ),
          sampleRate = max(
            8_000,
            (resolveNumericField(
              payload = payload,
              keys = listOf("sampleRate", "sampleRateHz", "audioSampleRate"),
            ) ?: 16_000.0).toInt(),
          ),
          packetDelta = max(
            1,
            (resolveNumericField(
              payload = payload,
              keys = listOf("packetDelta", "packetCount", "packets", "frameCount"),
            ) ?: 1.0).toInt(),
          ),
        )
        publishCallbackSurfaceDiagnostics(surface = "audio", status = "healthy")
      }
    }
    if (audioListenerHandle == null) {
      publishCallbackSurfaceDiagnostics(
        surface = "audio",
        status = "unavailable",
        reasonCode = "dat_audio_callback_surface_unavailable",
        message = "DAT audio callback listener surface unavailable in StreamSession.",
      )
    }

    stateListenerHandle = resolvePublisher(
      streamSession,
      listOf("statePublisher", "getStatePublisher"),
    )?.let { publisher ->
      bindGenericListener(publisher) { payload ->
        val stateName = resolveStateName(payload)
        if (stateName == "stopped") {
          MetaGlassesBridgeRuntimeHooks.publishDeviceDisconnected("dat_stream_stopped")
        }
      }
    }

    errorListenerHandle = resolvePublisher(
      streamSession,
      listOf("errorPublisher", "getErrorPublisher"),
    )?.let { publisher ->
      bindGenericListener(publisher) { payload ->
        MetaGlassesBridgeRuntimeHooks.publishFailure(
          reasonCode = "dat_stream_error",
          message = payload?.toString(),
          recoverable = true,
        )
      }
    }

    val hasAnyIngress = frameListenerHandle != null || audioListenerHandle != null
    if (!hasAnyIngress) {
      ingressBound = false
      boundSessionIdentity = null
      return
    }

    ingressBound = true
    boundSessionIdentity = sessionIdentity
    didReceiveVideoIngress = false
    didReceiveAudioIngress = false
    publishedVideoStalled = false
    publishedAudioStalled = false
    bindingStartedAtMs = nowMs()
  }

  private fun clearIngressBindings() {
    ingressBound = false
    boundSessionIdentity = null
    detachListener(frameListenerHandle)
    detachListener(audioListenerHandle)
    detachListener(stateListenerHandle)
    detachListener(errorListenerHandle)
    frameListenerHandle = null
    audioListenerHandle = null
    stateListenerHandle = null
    errorListenerHandle = null
    didReceiveVideoIngress = false
    didReceiveAudioIngress = false
    publishedVideoStalled = false
    publishedAudioStalled = false
    bindingStartedAtMs = null
  }

  private fun evaluateIngressHealth() {
    if (!ingressBound) {
      return
    }
    val startedAt = bindingStartedAtMs ?: return
    if (nowMs() - startedAt < 5_000) {
      return
    }

    if (frameListenerHandle != null && !didReceiveVideoIngress && !publishedVideoStalled) {
      publishedVideoStalled = true
      publishCallbackSurfaceDiagnostics(
        surface = "video",
        status = "degraded",
        reasonCode = "dat_video_callback_stalled",
        message = "No DAT video ingress callbacks observed after listener binding.",
      )
    }
    if (audioListenerHandle != null && !didReceiveAudioIngress && !publishedAudioStalled) {
      publishedAudioStalled = true
      publishCallbackSurfaceDiagnostics(
        surface = "audio",
        status = "degraded",
        reasonCode = "dat_audio_callback_stalled",
        message = "No DAT audio ingress callbacks observed after listener binding.",
      )
    }
  }

  private fun streamSessionIdentity(streamSession: Any): String {
    return "${streamSession.javaClass.name}@${System.identityHashCode(streamSession)}"
  }

  private fun resolveStreamSession(): Any? {
    val wearablesClass = runCatching {
      Class.forName("com.meta.wearable.dat.core.Wearables")
    }.getOrNull() ?: return null

    val candidates = mutableListOf<Any>()
    findValueByNoArgMethod(wearablesClass, null, "getStreamSession")?.let { candidates.add(it) }
    findValueByField(wearablesClass, null, "streamSession")?.let { candidates.add(it) }

    val shared = findValueByNoArgMethod(wearablesClass, null, "getShared")
      ?: findValueByNoArgMethod(wearablesClass, null, "getInstance")
      ?: findValueByField(wearablesClass, null, "shared")
    if (shared != null) {
      findValueByNoArgMethod(shared.javaClass, shared, "getStreamSession")?.let { candidates.add(it) }
      findValueByNoArgMethod(shared.javaClass, shared, "streamSession")?.let { candidates.add(it) }
      findValueByField(shared.javaClass, shared, "streamSession")?.let { candidates.add(it) }
      findValueByField(shared.javaClass, shared, "cameraStreamSession")?.let { candidates.add(it) }
    }

    return candidates.firstOrNull { candidate ->
      candidate.javaClass.name.contains("StreamSession")
        || candidate.javaClass.methods.any {
          it.parameterCount == 0 && it.name.contains("FramePublisher")
        }
    }
  }

  private fun resolvePublisher(streamSession: Any, memberNames: List<String>): Any? {
    for (memberName in memberNames) {
      findValueByNoArgMethod(streamSession.javaClass, streamSession, memberName)?.let { return it }
      findValueByField(streamSession.javaClass, streamSession, memberName)?.let { return it }
    }
    return null
  }

  private fun bindGenericListener(
    publisher: Any,
    onEvent: (Any?) -> Unit,
  ): Any? {
    val methods = publisher.javaClass.methods.filter {
      it.parameterCount == 1 && listOf("listen", "addListener", "addObserver", "subscribe").contains(it.name)
    }
    for (method in methods) {
      val callback = createListenerCallback(method.parameterTypes.firstOrNull(), onEvent) ?: continue
      val invocation = runCatching {
        method.isAccessible = true
        method.invoke(publisher, callback)
      }.getOrNull()
      return invocation ?: ListenerHandle(publisher = publisher, callback = callback)
    }
    return null
  }

  private fun createListenerCallback(
    callbackType: Class<*>?,
    onEvent: (Any?) -> Unit,
  ): Any? {
    val type = callbackType ?: return null
    if (type.name == "kotlin.jvm.functions.Function1"
      || kotlin.jvm.functions.Function1::class.java.isAssignableFrom(type)
    ) {
      return object : kotlin.jvm.functions.Function1<Any?, Unit> {
        override fun invoke(p1: Any?) {
          onEvent(p1)
        }
      }
    }
    if (type.name == "java.util.function.Consumer") {
      return Proxy.newProxyInstance(type.classLoader, arrayOf(type)) { _, method, args ->
        if (method.name == "accept") {
          onEvent(args?.firstOrNull())
        }
        null
      }
    }
    if (type.isInterface) {
      return Proxy.newProxyInstance(type.classLoader, arrayOf(type)) { _, method, args ->
        if (method.parameterTypes.size == 1) {
          onEvent(args?.firstOrNull())
        }
        null
      }
    }
    return null
  }

  private fun detachListener(handle: Any?) {
    when (handle) {
      null -> Unit
      is ListenerHandle -> {
        invokeOneArgMethod(
          receiver = handle.publisher,
          methodNames = listOf("removeListener", "removeObserver", "unsubscribe", "unlisten"),
          argument = handle.callback,
        )
        invokeNoArgMethod(
          receiver = handle.publisher,
          methodNames = listOf("removeAllListeners", "clearListeners"),
        )
      }
      else -> {
        invokeNoArgMethod(
          receiver = handle,
          methodNames = listOf("cancel", "close", "dispose", "remove", "invalidate", "stop", "unsubscribe"),
        )
      }
    }
  }

  private fun invokeNoArgMethod(receiver: Any, methodNames: List<String>): Boolean {
    for (methodName in methodNames) {
      val method = receiver.javaClass.methods.firstOrNull {
        it.name == methodName && it.parameterCount == 0
      } ?: continue
      val invoked = runCatching {
        method.isAccessible = true
        method.invoke(receiver)
      }.isSuccess
      if (invoked) {
        return true
      }
    }
    return false
  }

  private fun invokeOneArgMethod(receiver: Any, methodNames: List<String>, argument: Any): Boolean {
    for (methodName in methodNames) {
      val method = receiver.javaClass.methods.firstOrNull {
        it.name == methodName && it.parameterCount == 1
      } ?: continue
      val invoked = runCatching {
        method.isAccessible = true
        method.invoke(receiver, argument)
      }.isSuccess
      if (invoked) {
        return true
      }
    }
    return false
  }

  private fun resolveStateName(payload: Any?): String? {
    if (payload == null) {
      return null
    }
    val direct = payload.toString().trim()
    if (direct.isNotEmpty()) {
      return direct.substringAfterLast(".").lowercase()
    }
    return null
  }

  private fun resolveNumericField(payload: Any?, keys: List<String>): Double? {
    if (payload == null) {
      return null
    }
    if (payload is Number) {
      return payload.toDouble()
    }
    if (payload is Map<*, *>) {
      for (key in keys) {
        val value = payload[key]
        if (value is Number) {
          return value.toDouble()
        }
      }
    }

    for (key in keys) {
      val getter = "get" + key.replaceFirstChar { it.uppercaseChar() }
      val getterMethod = payload.javaClass.methods.firstOrNull {
        it.name == getter && it.parameterCount == 0
      }
      if (getterMethod != null) {
        val value = runCatching {
          getterMethod.isAccessible = true
          getterMethod.invoke(payload)
        }.getOrNull()
        if (value is Number) {
          return value.toDouble()
        }
      }

      val field = payload.javaClass.declaredFields.firstOrNull { it.name == key }
      if (field != null) {
        val value = runCatching {
          field.isAccessible = true
          field.get(payload)
        }.getOrNull()
        if (value is Number) {
          return value.toDouble()
        }
      }
    }
    return null
  }

  private fun normalizeEpochTimestampMs(rawTimestamp: Double?): Double {
    val now = nowMs()
    if (rawTimestamp == null || !rawTimestamp.isFinite() || rawTimestamp <= 0) {
      return now
    }
    if (rawTimestamp >= 100_000_000_000_000_000) {
      return rawTimestamp / 1_000_000
    }
    if (rawTimestamp >= 100_000_000_000_000) {
      return rawTimestamp / 1_000
    }
    if (rawTimestamp < 10_000_000_000) {
      return rawTimestamp * 1_000
    }
    return rawTimestamp
  }

  private fun publishCallbackSurfaceDiagnostics(
    surface: String,
    status: String,
    reasonCode: String? = null,
    message: String? = null,
  ) {
    val statusKey = "$status|${reasonCode ?: "none"}|${message ?: "none"}"
    if (callbackSurfaceStatus[surface] == statusKey) {
      return
    }
    callbackSurfaceStatus[surface] = statusKey
    MetaGlassesBridgeRuntimeHooks.publishCallbackSurfaceDiagnostics(
      surface = surface,
      status = status,
      reasonCode = reasonCode,
      message = message,
    )
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

  private fun findValueByNoArgMethod(type: Class<*>, receiver: Any?, methodName: String): Any? {
    val method = type.methods.firstOrNull {
      it.name == methodName && it.parameterCount == 0
    } ?: return null
    return runCatching {
      method.isAccessible = true
      method.invoke(receiver)
    }.getOrNull()
  }

  private fun findValueByField(type: Class<*>, receiver: Any?, fieldName: String): Any? {
    val field = type.declaredFields.firstOrNull { it.name == fieldName } ?: return null
    return runCatching {
      field.isAccessible = true
      field.get(receiver)
    }.getOrNull()
  }

  private data class ListenerHandle(
    val publisher: Any,
    val callback: Any,
  )
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
  private val callbackSurfaceReasons = mutableMapOf<String, String>()
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

      datRuntimeConnector.start()
      connectionState = "connecting"
      failure = null
      fallbackReason = null
      callbackSurfaceReasons.clear()
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
        fallbackReason = resolveCallbackSurfaceFallbackReason()
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
      datRuntimeConnector.stop()
      connectionState = "disconnected"
      fallbackReason = null
      callbackSurfaceReasons.clear()
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
      fallbackReason = resolveCallbackSurfaceFallbackReason()
      emitStatus()
    }
  }

  override fun onDeviceDisconnected(reasonCode: String?) {
    postOnMain {
      connectionState = "disconnected"
      fallbackReason = reasonCode
      callbackSurfaceReasons.clear()
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

  override fun onCallbackSurfaceDiagnostics(
    surface: String,
    status: String,
    reasonCode: String?,
    message: String?,
  ) {
    postOnMain {
      if (status == "healthy") {
        callbackSurfaceReasons.remove(surface)
      } else {
        callbackSurfaceReasons[surface] = reasonCode ?: "dat_${surface}_callback_$status"
      }

      if (failure == null) {
        fallbackReason = resolveCallbackSurfaceFallbackReason()
      }
      emitStatus()
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
    lastFrameTs = normalizeTimestampMs(timestampMs)
    failure = null
    fallbackReason = resolveCallbackSurfaceFallbackReason()
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
    lastPacketTs = normalizeTimestampMs(timestampMs)
    failure = null
    fallbackReason = resolveCallbackSurfaceFallbackReason()
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

  private fun resolveCallbackSurfaceFallbackReason(): String? {
    return callbackSurfaceReasons.toSortedMap().values.firstOrNull()
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
    snapshot.putBoolean("datSdkAvailable", isDatSdkAvailable())

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

  private fun normalizeTimestampMs(rawTimestampMs: Double?): Double {
    val now = nowMs()
    if (rawTimestampMs == null || !rawTimestampMs.isFinite() || rawTimestampMs <= 0) {
      return now
    }
    if (rawTimestampMs >= 100_000_000_000_000_000) {
      return rawTimestampMs / 1_000_000
    }
    if (rawTimestampMs >= 100_000_000_000_000) {
      return rawTimestampMs / 1_000
    }
    if (rawTimestampMs < 10_000_000_000) {
      return rawTimestampMs * 1_000
    }
    return rawTimestampMs
  }

  private data class FailureState(
    val reasonCode: String,
    val message: String?,
    val recoverable: Boolean,
    val atMs: Double,
  )
}
