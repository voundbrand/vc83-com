import XCTest
@testable import SevenLayersMac

final class MenuBarShellStateTests: XCTestCase {
    func testTogglePopoverVisibilityFlipsState() {
        var state = MenuBarShellState()

        XCTAssertFalse(state.isPopoverVisible)
        state.togglePopoverVisibility()
        XCTAssertTrue(state.isPopoverVisible)
        state.togglePopoverVisibility()
        XCTAssertFalse(state.isPopoverVisible)
    }
}
