public struct MenuBarShellState: Equatable {
    public private(set) var isPopoverVisible: Bool

    public init(isPopoverVisible: Bool = false) {
        self.isPopoverVisible = isPopoverVisible
    }

    public mutating func togglePopoverVisibility() {
        isPopoverVisible.toggle()
    }
}
