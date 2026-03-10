public struct StatusItemBadgeFormatter {
    public let baseTitle: String

    public init(baseTitle: String = "SevenLayers") {
        self.baseTitle = baseTitle
    }

    public func title(pendingApprovals: Int) -> String {
        let clampedCount = max(0, pendingApprovals)
        guard clampedCount > 0 else {
            return baseTitle
        }

        return "\(baseTitle) • \(clampedCount)"
    }
}
