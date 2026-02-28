import XCTest
@testable import SevenLayersMac

final class StatusItemBadgeFormatterTests: XCTestCase {
    func testUsesBaseTitleWhenNoPendingApprovals() {
        let formatter = StatusItemBadgeFormatter(baseTitle: "VC83")

        XCTAssertEqual(formatter.title(pendingApprovals: 0), "VC83")
    }

    func testAppendsPendingApprovalBadgeWhenCountIsPositive() {
        let formatter = StatusItemBadgeFormatter(baseTitle: "VC83")

        XCTAssertEqual(formatter.title(pendingApprovals: 3), "VC83 • 3")
    }

    func testClampsNegativeCountsToZero() {
        let formatter = StatusItemBadgeFormatter(baseTitle: "VC83")

        XCTAssertEqual(formatter.title(pendingApprovals: -5), "VC83")
    }
}
