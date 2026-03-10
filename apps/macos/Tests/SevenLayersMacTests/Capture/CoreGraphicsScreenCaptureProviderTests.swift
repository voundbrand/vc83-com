import XCTest
@testable import SevenLayersMac

final class CoreGraphicsScreenCaptureProviderTests: XCTestCase {
    func testCaptureSnapshotRejectsUnsupportedDisplaySourceBeforePermissionCheck() {
        let provider = CoreGraphicsScreenCaptureProvider()

        XCTAssertThrowsError(
            try provider.captureSnapshot(sourceId: "screen://unsupported")
        ) { error in
            XCTAssertEqual(
                error as? CoreGraphicsScreenCaptureProviderError,
                .unsupportedDisplaySource("screen://unsupported")
            )
        }
    }

    func testStartRecordingFailsClosedUntilImplemented() {
        let provider = CoreGraphicsScreenCaptureProvider()

        XCTAssertThrowsError(
            try provider.startRecording(
                sourceId: "desktop:primary",
                boundedDurationMs: 1_000,
                withMicAudio: false,
                withSystemAudio: false
            )
        ) { error in
            XCTAssertEqual(
                error as? CoreGraphicsScreenCaptureProviderError,
                .recordingNotImplemented
            )
        }
    }

    func testCaptureSnapshotRejectsMalformedWindowSourceBeforePermissionCheck() {
        let provider = CoreGraphicsScreenCaptureProvider()

        XCTAssertThrowsError(
            try provider.captureSnapshot(sourceId: "window:not-a-number")
        ) { error in
            XCTAssertEqual(
                error as? CoreGraphicsScreenCaptureProviderError,
                .unsupportedWindowSource("window:not-a-number")
            )
        }
    }
}
