import AppKit
import SevenLayersMac

let application = NSApplication.shared
let delegate = MenuBarApplicationDelegate()

application.delegate = delegate
application.setActivationPolicy(.accessory)
application.run()
