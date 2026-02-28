import AppKit
import XCTest
@testable import SevenLayersMac

final class GlobalHotkeyMatcherTests: XCTestCase {
    func testMatchesExactKeyAndModifierCombo() {
        let matcher = GlobalHotkeyMatcher(binding: GlobalHotkeyBinding(keyCode: 49, modifiers: [.command, .shift]))

        XCTAssertTrue(matcher.matches(keyCode: 49, modifiers: [.command, .shift]))
    }

    func testIgnoresIrrelevantModifierBits() {
        let matcher = GlobalHotkeyMatcher(binding: GlobalHotkeyBinding(keyCode: 49, modifiers: [.command, .shift]))

        XCTAssertTrue(matcher.matches(keyCode: 49, modifiers: [.command, .shift, .capsLock]))
    }

    func testRejectsDifferentModifierCombo() {
        let matcher = GlobalHotkeyMatcher(binding: GlobalHotkeyBinding(keyCode: 49, modifiers: [.command, .shift]))

        XCTAssertFalse(matcher.matches(keyCode: 49, modifiers: [.command]))
    }

    func testRejectsDifferentKeyCode() {
        let matcher = GlobalHotkeyMatcher(binding: GlobalHotkeyBinding(keyCode: 49, modifiers: [.command, .shift]))

        XCTAssertFalse(matcher.matches(keyCode: 31, modifiers: [.command, .shift]))
    }
}
