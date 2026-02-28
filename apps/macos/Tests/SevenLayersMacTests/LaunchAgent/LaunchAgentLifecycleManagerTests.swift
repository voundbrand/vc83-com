import Foundation
import XCTest
@testable import SevenLayersMac

final class LaunchAgentLifecycleManagerTests: XCTestCase {
    func testEnableInstallsManagedPlistAndConfiguresReconnectPolicy() throws {
        let tempDirectory = try makeTemporaryDirectory()
        let configuration = makeConfiguration(tempDirectory: tempDirectory, userID: 501)
        let fakeLaunchCtl = FakeLaunchCtlClient()
        fakeLaunchCtl.setRuntimeState(
            domainTarget: configuration.launchCtlDomainTarget,
            label: configuration.label,
            state: LaunchAgentRuntimeState(isLoaded: false, isDisabled: true)
        )

        let manager = LaunchAgentLifecycleManager(launchCtl: fakeLaunchCtl)

        let report = try manager.enable(configuration: configuration)
        let plistContents = try String(contentsOfFile: configuration.plistPath, encoding: .utf8)

        XCTAssertTrue(report.after.plistExists)
        XCTAssertTrue(report.after.plistManagedBySevenLayers)
        XCTAssertEqual(report.after.runtimeState, LaunchAgentRuntimeState(isLoaded: true, isDisabled: false))
        XCTAssertTrue(plistContents.contains(LaunchAgentPlistRenderer.managedMarker))
        XCTAssertTrue(plistContents.contains("<key>RunAtLoad</key>"))
        XCTAssertTrue(plistContents.contains("<key>KeepAlive</key>"))
        XCTAssertTrue(plistContents.contains("<key>NetworkState</key>"))
        XCTAssertTrue(plistContents.contains("<key>ThrottleInterval</key>"))

        XCTAssertEqual(
            fakeLaunchCtl.invocations,
            [
                .bootstrap(
                    domainTarget: "gui/501",
                    label: configuration.label,
                    plistPath: configuration.plistPath
                ),
                .enable(domainTarget: "gui/501", label: configuration.label),
                .kickstart(domainTarget: "gui/501", label: configuration.label),
            ]
        )
    }

    func testDisableRemovesManagedPlistAndBootsOutServiceDeterministically() throws {
        let tempDirectory = try makeTemporaryDirectory()
        let configuration = makeConfiguration(tempDirectory: tempDirectory, userID: 777)
        let fakeLaunchCtl = FakeLaunchCtlClient()
        let manager = LaunchAgentLifecycleManager(launchCtl: fakeLaunchCtl)

        _ = try manager.install(configuration: configuration)
        fakeLaunchCtl.invocations.removeAll()
        fakeLaunchCtl.setRuntimeState(
            domainTarget: configuration.launchCtlDomainTarget,
            label: configuration.label,
            state: LaunchAgentRuntimeState(isLoaded: true, isDisabled: false)
        )

        let report = try manager.disable(configuration: configuration)

        XCTAssertFalse(FileManager.default.fileExists(atPath: configuration.plistPath))
        XCTAssertEqual(report.after.runtimeState, LaunchAgentRuntimeState(isLoaded: false, isDisabled: true))
        XCTAssertEqual(
            fakeLaunchCtl.invocations,
            [
                .disable(domainTarget: "gui/777", label: configuration.label),
                .bootout(domainTarget: "gui/777", label: configuration.label),
            ]
        )
        XCTAssertEqual(
            report.actions,
            [
                .disable(service: configuration.launchCtlServiceTarget),
                .bootout(service: configuration.launchCtlServiceTarget),
                .removePlist(path: configuration.plistPath),
            ]
        )
    }

    func testDisableFailsClosedWhenPlistIsUnmanaged() throws {
        let tempDirectory = try makeTemporaryDirectory()
        let configuration = makeConfiguration(tempDirectory: tempDirectory)
        let fakeLaunchCtl = FakeLaunchCtlClient()
        let manager = LaunchAgentLifecycleManager(launchCtl: fakeLaunchCtl)

        try FileManager.default.createDirectory(
            atPath: configuration.resolvedLaunchAgentsDirectory,
            withIntermediateDirectories: true
        )
        try "<plist><dict><key>Label</key><string>\(configuration.label)</string></dict></plist>\n"
            .write(toFile: configuration.plistPath, atomically: true, encoding: .utf8)

        XCTAssertThrowsError(try manager.disable(configuration: configuration)) { error in
            XCTAssertEqual(
                error as? LaunchAgentLifecycleError,
                .unmanagedExistingPlist(path: configuration.plistPath)
            )
        }

        XCTAssertTrue(FileManager.default.fileExists(atPath: configuration.plistPath))
        XCTAssertTrue(fakeLaunchCtl.invocations.isEmpty)
    }

    func testReconcileTransitionsEnabledThenDisabled() throws {
        let tempDirectory = try makeTemporaryDirectory()
        let configuration = makeConfiguration(tempDirectory: tempDirectory, userID: 99)
        let fakeLaunchCtl = FakeLaunchCtlClient()
        fakeLaunchCtl.setRuntimeState(
            domainTarget: configuration.launchCtlDomainTarget,
            label: configuration.label,
            state: LaunchAgentRuntimeState(isLoaded: false, isDisabled: true)
        )

        let manager = LaunchAgentLifecycleManager(launchCtl: fakeLaunchCtl)
        let enableReport = try manager.reconcile(
            configuration: configuration,
            desiredState: .enabled
        )
        let disableReport = try manager.reconcile(
            configuration: configuration,
            desiredState: .disabled
        )

        XCTAssertEqual(enableReport.desiredState, .enabled)
        XCTAssertEqual(enableReport.after.runtimeState, LaunchAgentRuntimeState(isLoaded: true, isDisabled: false))
        XCTAssertEqual(disableReport.desiredState, .disabled)
        XCTAssertEqual(disableReport.after.runtimeState, LaunchAgentRuntimeState(isLoaded: false, isDisabled: true))
        XCTAssertFalse(FileManager.default.fileExists(atPath: configuration.plistPath))
    }

    private func makeTemporaryDirectory() throws -> URL {
        let directory = FileManager.default.temporaryDirectory
            .appendingPathComponent("sevenlayers-launchagent-tests-\(UUID().uuidString)", isDirectory: true)
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        addTeardownBlock {
            try? FileManager.default.removeItem(at: directory)
        }
        return directory
    }

    private func makeConfiguration(
        tempDirectory: URL,
        userID: uid_t = 501
    ) -> LaunchAgentConfiguration {
        LaunchAgentConfiguration(
            label: "com.vc83.sevenlayers.macos.companion",
            executablePath: "/Applications/SevenLayers.app/Contents/MacOS/SevenLayers",
            additionalArguments: ["--background-reconnect", "--headless"],
            environment: [
                "SEVENLAYERS_BACKGROUND_RECONNECT": "1",
                "SEVENLAYERS_INGRESS_MODE": "launchd",
            ],
            launchAgentsDirectory: tempDirectory
                .appendingPathComponent("LaunchAgents", isDirectory: true)
                .path,
            standardOutLogPath: tempDirectory.appendingPathComponent("companion.stdout.log").path,
            standardErrorLogPath: tempDirectory.appendingPathComponent("companion.stderr.log").path,
            reconnectThrottleIntervalSeconds: 9,
            userID: userID
        )
    }
}

private final class FakeLaunchCtlClient: LaunchCtlControlling {
    enum Invocation: Equatable {
        case bootstrap(domainTarget: String, label: String, plistPath: String)
        case bootout(domainTarget: String, label: String)
        case enable(domainTarget: String, label: String)
        case disable(domainTarget: String, label: String)
        case kickstart(domainTarget: String, label: String)
    }

    private var runtimeByService: [String: LaunchAgentRuntimeState] = [:]
    var invocations: [Invocation] = []

    func setRuntimeState(domainTarget: String, label: String, state: LaunchAgentRuntimeState) {
        runtimeByService[serviceKey(domainTarget: domainTarget, label: label)] = state
    }

    func runtimeState(domainTarget: String, label: String) -> LaunchAgentRuntimeState {
        runtimeByService[serviceKey(domainTarget: domainTarget, label: label)]
            ?? LaunchAgentRuntimeState(isLoaded: false, isDisabled: false)
    }

    func bootstrap(domainTarget: String, label: String, plistPath: String) {
        invocations.append(.bootstrap(domainTarget: domainTarget, label: label, plistPath: plistPath))
        let key = serviceKey(domainTarget: domainTarget, label: label)
        let current = runtimeByService[key] ?? LaunchAgentRuntimeState(isLoaded: false, isDisabled: false)
        runtimeByService[key] = LaunchAgentRuntimeState(isLoaded: true, isDisabled: current.isDisabled)
    }

    func bootout(domainTarget: String, label: String) {
        invocations.append(.bootout(domainTarget: domainTarget, label: label))
        let key = serviceKey(domainTarget: domainTarget, label: label)
        let current = runtimeByService[key] ?? LaunchAgentRuntimeState(isLoaded: false, isDisabled: false)
        runtimeByService[key] = LaunchAgentRuntimeState(isLoaded: false, isDisabled: current.isDisabled)
    }

    func enable(domainTarget: String, label: String) {
        invocations.append(.enable(domainTarget: domainTarget, label: label))
        let key = serviceKey(domainTarget: domainTarget, label: label)
        let current = runtimeByService[key] ?? LaunchAgentRuntimeState(isLoaded: false, isDisabled: false)
        runtimeByService[key] = LaunchAgentRuntimeState(isLoaded: current.isLoaded, isDisabled: false)
    }

    func disable(domainTarget: String, label: String) {
        invocations.append(.disable(domainTarget: domainTarget, label: label))
        let key = serviceKey(domainTarget: domainTarget, label: label)
        let current = runtimeByService[key] ?? LaunchAgentRuntimeState(isLoaded: false, isDisabled: false)
        runtimeByService[key] = LaunchAgentRuntimeState(isLoaded: current.isLoaded, isDisabled: true)
    }

    func kickstart(domainTarget: String, label: String) {
        invocations.append(.kickstart(domainTarget: domainTarget, label: label))
        let key = serviceKey(domainTarget: domainTarget, label: label)
        let current = runtimeByService[key] ?? LaunchAgentRuntimeState(isLoaded: false, isDisabled: false)
        runtimeByService[key] = LaunchAgentRuntimeState(isLoaded: true, isDisabled: current.isDisabled)
    }

    private func serviceKey(domainTarget: String, label: String) -> String {
        "\(domainTarget)/\(label)"
    }
}
