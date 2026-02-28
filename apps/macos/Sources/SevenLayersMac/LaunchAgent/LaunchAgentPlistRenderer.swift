import Foundation

public struct LaunchAgentPlistRenderer {
    public static let managedMarker = "sevenlayers.launchagent.managed.v1"

    public init() {}

    public func render(configuration: LaunchAgentConfiguration) throws -> String {
        guard !configuration.label.isEmpty else {
            throw LaunchAgentLifecycleError.missingLabel
        }

        guard !configuration.executablePath.isEmpty else {
            throw LaunchAgentLifecycleError.missingExecutablePath
        }

        var lines: [String] = []
        lines.append("<?xml version=\"1.0\" encoding=\"UTF-8\"?>")
        lines.append("<!-- \(Self.managedMarker) -->")
        lines.append("<!DOCTYPE plist PUBLIC \"-//Apple//DTD PLIST 1.0//EN\" \"http://www.apple.com/DTDs/PropertyList-1.0.dtd\">")
        lines.append("<plist version=\"1.0\">")
        lines.append("<dict>")
        lines.append("  <key>Label</key>")
        lines.append("  <string>\(escape(configuration.label))</string>")

        lines.append("  <key>ProgramArguments</key>")
        lines.append("  <array>")
        for argument in configuration.programArguments {
            lines.append("    <string>\(escape(argument))</string>")
        }
        lines.append("  </array>")

        lines.append("  <key>RunAtLoad</key>")
        lines.append(configuration.runAtLoad ? "  <true/>" : "  <false/>")
        lines.append("  <key>KeepAlive</key>")
        lines.append("  <dict>")
        lines.append("    <key>SuccessfulExit</key>")
        lines.append(configuration.restartOnUncleanExit ? "    <false/>" : "    <true/>")
        lines.append("    <key>NetworkState</key>")
        lines.append(configuration.keepAliveOnNetworkState ? "    <true/>" : "    <false/>")
        lines.append("  </dict>")
        lines.append("  <key>ThrottleInterval</key>")
        lines.append("  <integer>\(configuration.reconnectThrottleIntervalSeconds)</integer>")
        lines.append("  <key>ProcessType</key>")
        lines.append("  <string>Background</string>")
        lines.append("  <key>LimitLoadToSessionType</key>")
        lines.append("  <array>")
        lines.append("    <string>Aqua</string>")
        lines.append("  </array>")
        lines.append("  <key>StandardOutPath</key>")
        lines.append("  <string>\(escape(configuration.resolvedStandardOutLogPath))</string>")
        lines.append("  <key>StandardErrorPath</key>")
        lines.append("  <string>\(escape(configuration.resolvedStandardErrorLogPath))</string>")

        let environmentEntries = configuration.environment
            .map { key, value in
                (
                    key.trimmingCharacters(in: .whitespacesAndNewlines),
                    value.trimmingCharacters(in: .whitespacesAndNewlines)
                )
            }
            .filter { !$0.0.isEmpty }
            .sorted { $0.0 < $1.0 }

        if !environmentEntries.isEmpty {
            lines.append("  <key>EnvironmentVariables</key>")
            lines.append("  <dict>")
            for (key, value) in environmentEntries {
                lines.append("    <key>\(escape(key))</key>")
                lines.append("    <string>\(escape(value))</string>")
            }
            lines.append("  </dict>")
        }

        lines.append("</dict>")
        lines.append("</plist>")

        return lines.joined(separator: "\n") + "\n"
    }

    public func isManagedPlist(contents: String) -> Bool {
        contents.contains(Self.managedMarker)
    }

    private func escape(_ rawValue: String) -> String {
        rawValue
            .replacingOccurrences(of: "&", with: "&amp;")
            .replacingOccurrences(of: "<", with: "&lt;")
            .replacingOccurrences(of: ">", with: "&gt;")
            .replacingOccurrences(of: "\"", with: "&quot;")
            .replacingOccurrences(of: "'", with: "&apos;")
    }
}
