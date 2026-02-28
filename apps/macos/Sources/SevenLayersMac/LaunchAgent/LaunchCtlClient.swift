import Foundation

public enum LaunchCtlClientError: Error, Equatable {
    case commandFailed(command: String, code: Int32, stdErr: String)
}

public protocol LaunchCtlCommandRunning {
    func run(arguments: [String]) throws -> LaunchCtlCommandResult
}

public struct LaunchCtlCommandResult: Equatable {
    public let exitCode: Int32
    public let stdOut: String
    public let stdErr: String

    public init(exitCode: Int32, stdOut: String, stdErr: String) {
        self.exitCode = exitCode
        self.stdOut = stdOut
        self.stdErr = stdErr
    }
}

public protocol LaunchCtlControlling {
    func runtimeState(domainTarget: String, label: String) throws -> LaunchAgentRuntimeState
    func bootstrap(domainTarget: String, label: String, plistPath: String) throws
    func bootout(domainTarget: String, label: String) throws
    func enable(domainTarget: String, label: String) throws
    func disable(domainTarget: String, label: String) throws
    func kickstart(domainTarget: String, label: String) throws
}

public struct ProcessLaunchCtlCommandRunner: LaunchCtlCommandRunning {
    private let launchCtlPath: String

    public init(launchCtlPath: String = "/bin/launchctl") {
        self.launchCtlPath = launchCtlPath
    }

    public func run(arguments: [String]) throws -> LaunchCtlCommandResult {
        let process = Process()
        process.executableURL = URL(fileURLWithPath: launchCtlPath)
        process.arguments = arguments

        let stdOutPipe = Pipe()
        let stdErrPipe = Pipe()
        process.standardOutput = stdOutPipe
        process.standardError = stdErrPipe

        try process.run()
        process.waitUntilExit()

        let stdOutData = stdOutPipe.fileHandleForReading.readDataToEndOfFile()
        let stdErrData = stdErrPipe.fileHandleForReading.readDataToEndOfFile()

        return LaunchCtlCommandResult(
            exitCode: process.terminationStatus,
            stdOut: String(decoding: stdOutData, as: UTF8.self),
            stdErr: String(decoding: stdErrData, as: UTF8.self)
        )
    }
}

public struct SystemLaunchCtlClient: LaunchCtlControlling {
    private let commandRunner: any LaunchCtlCommandRunning

    public init(commandRunner: any LaunchCtlCommandRunning = ProcessLaunchCtlCommandRunner()) {
        self.commandRunner = commandRunner
    }

    public func runtimeState(domainTarget: String, label: String) throws -> LaunchAgentRuntimeState {
        let serviceTarget = "\(domainTarget)/\(label)"
        let printResult = try commandRunner.run(arguments: ["print", serviceTarget])

        let isLoaded: Bool
        if printResult.exitCode == 0 {
            isLoaded = true
        } else if isLaunchCtlServiceMissing(output: printResult.stdOut + "\n" + printResult.stdErr) {
            isLoaded = false
        } else {
            throw LaunchCtlClientError.commandFailed(
                command: "launchctl print \(serviceTarget)",
                code: printResult.exitCode,
                stdErr: printResult.stdErr
            )
        }

        let printDisabledResult = try commandRunner.run(arguments: ["print-disabled", domainTarget])
        guard printDisabledResult.exitCode == 0 else {
            throw LaunchCtlClientError.commandFailed(
                command: "launchctl print-disabled \(domainTarget)",
                code: printDisabledResult.exitCode,
                stdErr: printDisabledResult.stdErr
            )
        }

        let isDisabled = parseDisabledState(
            label: label,
            output: printDisabledResult.stdOut
        )

        return LaunchAgentRuntimeState(isLoaded: isLoaded, isDisabled: isDisabled)
    }

    public func bootstrap(domainTarget: String, label: String, plistPath: String) throws {
        let result = try commandRunner.run(arguments: ["bootstrap", domainTarget, plistPath])
        guard result.exitCode == 0 else {
            throw LaunchCtlClientError.commandFailed(
                command: "launchctl bootstrap \(domainTarget) \(plistPath)",
                code: result.exitCode,
                stdErr: result.stdErr
            )
        }
    }

    public func bootout(domainTarget: String, label: String) throws {
        let serviceTarget = "\(domainTarget)/\(label)"
        let result = try commandRunner.run(arguments: ["bootout", serviceTarget])
        guard result.exitCode == 0 else {
            throw LaunchCtlClientError.commandFailed(
                command: "launchctl bootout \(serviceTarget)",
                code: result.exitCode,
                stdErr: result.stdErr
            )
        }
    }

    public func enable(domainTarget: String, label: String) throws {
        let serviceTarget = "\(domainTarget)/\(label)"
        let result = try commandRunner.run(arguments: ["enable", serviceTarget])
        guard result.exitCode == 0 else {
            throw LaunchCtlClientError.commandFailed(
                command: "launchctl enable \(serviceTarget)",
                code: result.exitCode,
                stdErr: result.stdErr
            )
        }
    }

    public func disable(domainTarget: String, label: String) throws {
        let serviceTarget = "\(domainTarget)/\(label)"
        let result = try commandRunner.run(arguments: ["disable", serviceTarget])
        guard result.exitCode == 0 else {
            throw LaunchCtlClientError.commandFailed(
                command: "launchctl disable \(serviceTarget)",
                code: result.exitCode,
                stdErr: result.stdErr
            )
        }
    }

    public func kickstart(domainTarget: String, label: String) throws {
        let serviceTarget = "\(domainTarget)/\(label)"
        let result = try commandRunner.run(arguments: ["kickstart", "-k", serviceTarget])
        guard result.exitCode == 0 else {
            throw LaunchCtlClientError.commandFailed(
                command: "launchctl kickstart -k \(serviceTarget)",
                code: result.exitCode,
                stdErr: result.stdErr
            )
        }
    }

    private func isLaunchCtlServiceMissing(output: String) -> Bool {
        let normalized = output.lowercased()
        return normalized.contains("could not find service")
            || normalized.contains("service not found")
    }

    private func parseDisabledState(label: String, output: String) -> Bool {
        let escapedLabel = NSRegularExpression.escapedPattern(for: label)
        let patterns = [
            "\"\(escapedLabel)\"\\s*=>\\s*(true|false)",
            "\(escapedLabel)\\s*=>\\s*(true|false)",
        ]

        for pattern in patterns {
            guard let regex = try? NSRegularExpression(pattern: pattern) else {
                continue
            }

            let range = NSRange(output.startIndex..<output.endIndex, in: output)
            guard let match = regex.firstMatch(in: output, options: [], range: range) else {
                continue
            }

            guard let captureRange = Range(match.range(at: 1), in: output) else {
                continue
            }

            let value = output[captureRange].lowercased()
            if value == "true" {
                return true
            }
            if value == "false" {
                return false
            }
        }

        return false
    }
}
