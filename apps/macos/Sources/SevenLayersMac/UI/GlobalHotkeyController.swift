import AppKit
import Foundation

public struct GlobalHotkeyBinding: Equatable {
    public let keyCode: UInt16
    public let modifiers: NSEvent.ModifierFlags

    public init(keyCode: UInt16, modifiers: NSEvent.ModifierFlags) {
        self.keyCode = keyCode
        self.modifiers = modifiers
    }
}

public struct GlobalHotkeyMatcher {
    public let binding: GlobalHotkeyBinding

    private static let relevantModifierMask: NSEvent.ModifierFlags = [.command, .shift, .control, .option]

    public init(binding: GlobalHotkeyBinding) {
        self.binding = binding
    }

    public func matches(event: NSEvent) -> Bool {
        matches(keyCode: event.keyCode, modifiers: event.modifierFlags)
    }

    public func matches(keyCode: UInt16, modifiers: NSEvent.ModifierFlags) -> Bool {
        guard keyCode == binding.keyCode else {
            return false
        }

        let normalizedEventModifiers = modifiers.intersection(Self.relevantModifierMask)
        let normalizedBindingModifiers = binding.modifiers.intersection(Self.relevantModifierMask)

        return normalizedEventModifiers == normalizedBindingModifiers
    }
}

public protocol EventMonitorManaging {
    func addGlobalMonitor(matching mask: NSEvent.EventTypeMask, handler: @escaping (NSEvent) -> Void) -> Any?
    func addLocalMonitor(matching mask: NSEvent.EventTypeMask, handler: @escaping (NSEvent) -> Void) -> Any?
    func removeMonitor(_ monitor: Any)
}

public struct NSEventMonitorManager: EventMonitorManaging {
    public init() {}

    public func addGlobalMonitor(matching mask: NSEvent.EventTypeMask, handler: @escaping (NSEvent) -> Void) -> Any? {
        NSEvent.addGlobalMonitorForEvents(matching: mask, handler: handler)
    }

    public func addLocalMonitor(matching mask: NSEvent.EventTypeMask, handler: @escaping (NSEvent) -> Void) -> Any? {
        NSEvent.addLocalMonitorForEvents(matching: mask) { event in
            handler(event)
            return event
        }
    }

    public func removeMonitor(_ monitor: Any) {
        NSEvent.removeMonitor(monitor)
    }
}

public final class GlobalHotkeyController {
    private let matcher: GlobalHotkeyMatcher
    private let eventMonitorManager: EventMonitorManaging
    private let onTrigger: @Sendable () -> Void

    private var globalMonitor: Any?
    private var localMonitor: Any?

    public init(
        binding: GlobalHotkeyBinding = GlobalHotkeyBinding(keyCode: 49, modifiers: [.command, .shift]),
        eventMonitorManager: EventMonitorManaging = NSEventMonitorManager(),
        onTrigger: @escaping @Sendable () -> Void
    ) {
        self.matcher = GlobalHotkeyMatcher(binding: binding)
        self.eventMonitorManager = eventMonitorManager
        self.onTrigger = onTrigger
    }

    public func start() {
        guard globalMonitor == nil, localMonitor == nil else {
            return
        }

        globalMonitor = eventMonitorManager.addGlobalMonitor(matching: .keyDown) { [weak self] event in
            self?.handleEvent(event)
        }

        localMonitor = eventMonitorManager.addLocalMonitor(matching: .keyDown) { [weak self] event in
            self?.handleEvent(event)
        }
    }

    public func stop() {
        if let globalMonitor {
            eventMonitorManager.removeMonitor(globalMonitor)
            self.globalMonitor = nil
        }

        if let localMonitor {
            eventMonitorManager.removeMonitor(localMonitor)
            self.localMonitor = nil
        }
    }

    private func handleEvent(_ event: NSEvent) {
        guard matcher.matches(event: event) else {
            return
        }

        DispatchQueue.main.async { [onTrigger] in
            onTrigger()
        }
    }
}
