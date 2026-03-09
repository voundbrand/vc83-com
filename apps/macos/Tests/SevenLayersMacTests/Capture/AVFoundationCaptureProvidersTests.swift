import Foundation
import XCTest
@testable import SevenLayersMac

final class AVFoundationCaptureProvidersTests: XCTestCase {
    func testCameraStartCaptureFailsClosedWhenPermissionDenied() {
        let provider = AVFoundationCameraCaptureProvider(
            readAuthorizationStatus: { .denied },
            requestPermission: { true }
        )

        XCTAssertThrowsError(try provider.startCapture(sourceId: "webcam:primary")) { error in
            XCTAssertEqual(
                error as? AVFoundationCameraCaptureProviderError,
                .permissionDenied
            )
        }
    }

    func testCameraStartCaptureRequestsPermissionWhenStatusNotDetermined() throws {
        var permissionRequested = false
        let now = Date(timeIntervalSince1970: 1_700_700_000)
        let provider = AVFoundationCameraCaptureProvider(
            readAuthorizationStatus: { .notDetermined },
            requestPermission: {
                permissionRequested = true
                return true
            },
            makeSessionID: { "camera_session_1" },
            now: { now }
        )

        let session = try provider.startCapture(sourceId: " webcam:primary ")
        XCTAssertTrue(permissionRequested)
        XCTAssertEqual(session.sessionId, "camera_session_1")
        XCTAssertEqual(session.sourceId, "webcam:primary")
        XCTAssertEqual(session.provider, "avfoundation")
        XCTAssertEqual(session.startedAt, now)
    }

    func testCameraProviderRejectsSecondActiveSessionUntilStopped() throws {
        let provider = AVFoundationCameraCaptureProvider(
            readAuthorizationStatus: { .authorized },
            requestPermission: { true },
            makeSessionID: { "camera_session_active" },
            now: { Date(timeIntervalSince1970: 1_700_710_000) }
        )

        _ = try provider.startCapture(sourceId: "webcam:primary")

        XCTAssertThrowsError(try provider.startCapture(sourceId: "webcam:primary")) { error in
            XCTAssertEqual(
                error as? AVFoundationCameraCaptureProviderError,
                .sessionAlreadyActive(sessionId: "camera_session_active")
            )
        }
    }

    func testCameraProviderFailsClosedWhenStopIsPastBoundedDuration() throws {
        var currentTime = Date(timeIntervalSince1970: 1_700_720_000)
        let provider = AVFoundationCameraCaptureProvider(
            maxSessionDuration: 10,
            readAuthorizationStatus: { .authorized },
            requestPermission: { true },
            makeSessionID: { "camera_session_expiring" },
            now: { currentTime }
        )

        _ = try provider.startCapture(sourceId: "webcam:primary")
        currentTime = Date(timeIntervalSince1970: 1_700_720_020)

        XCTAssertThrowsError(try provider.stopCapture(sessionId: "camera_session_expiring")) { error in
            XCTAssertEqual(
                error as? AVFoundationCameraCaptureProviderError,
                .sessionExpired(sessionId: "camera_session_expiring")
            )
        }
    }

    func testMicrophoneStartCaptureFailsClosedWhenPermissionDenied() {
        let provider = AVFoundationMicrophoneCaptureProvider(
            readAuthorizationStatus: { .restricted },
            requestPermission: { true }
        )

        XCTAssertThrowsError(try provider.startCapture()) { error in
            XCTAssertEqual(
                error as? AVFoundationMicrophoneCaptureProviderError,
                .permissionDenied
            )
        }
    }

    func testMicrophoneProviderRejectsSecondActiveSessionUntilStopped() throws {
        let provider = AVFoundationMicrophoneCaptureProvider(
            readAuthorizationStatus: { .authorized },
            requestPermission: { true },
            makeVoiceSessionID: { "voice_session_active" },
            now: { Date(timeIntervalSince1970: 1_700_730_000) }
        )

        _ = try provider.startCapture()

        XCTAssertThrowsError(try provider.startCapture()) { error in
            XCTAssertEqual(
                error as? AVFoundationMicrophoneCaptureProviderError,
                .sessionAlreadyActive(voiceSessionId: "voice_session_active")
            )
        }
    }

    func testMicrophoneProviderFailsClosedWhenStopIsPastBoundedDuration() throws {
        var currentTime = Date(timeIntervalSince1970: 1_700_740_000)
        let provider = AVFoundationMicrophoneCaptureProvider(
            maxSessionDuration: 5,
            readAuthorizationStatus: { .authorized },
            requestPermission: { true },
            makeVoiceSessionID: { "voice_session_expiring" },
            now: { currentTime }
        )

        _ = try provider.startCapture()
        currentTime = Date(timeIntervalSince1970: 1_700_740_008)

        XCTAssertThrowsError(try provider.stopCapture(voiceSessionId: "voice_session_expiring")) { error in
            XCTAssertEqual(
                error as? AVFoundationMicrophoneCaptureProviderError,
                .sessionExpired(voiceSessionId: "voice_session_expiring")
            )
        }
    }
}
