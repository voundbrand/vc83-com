// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "SevenLayersMac",
    platforms: [
        .macOS(.v14),
    ],
    products: [
        .executable(name: "sevenlayers-mac", targets: ["SevenLayersMacApp"]),
        .library(name: "SevenLayersProtocol", targets: ["SevenLayersProtocol"]),
        .library(name: "SevenLayersMac", targets: ["SevenLayersMac"]),
    ],
    targets: [
        .target(name: "SevenLayersProtocol"),
        .target(
            name: "SevenLayersMac",
            dependencies: ["SevenLayersProtocol"],
            resources: [
                .process("Resources"),
            ]
        ),
        .executableTarget(
            name: "SevenLayersMacApp",
            dependencies: ["SevenLayersMac"]
        ),
        .testTarget(
            name: "SevenLayersProtocolTests",
            dependencies: ["SevenLayersProtocol"]
        ),
        .testTarget(
            name: "SevenLayersMacTests",
            dependencies: ["SevenLayersMac", "SevenLayersProtocol"]
        ),
    ]
)
