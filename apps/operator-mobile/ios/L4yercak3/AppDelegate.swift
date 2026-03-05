import Foundation
import Expo
import React
import ReactAppDependencyProvider
#if canImport(MWDATCore)
import MWDATCore
#endif

@UIApplicationMain
public class AppDelegate: ExpoAppDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ExpoReactNativeFactoryDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  public override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    let delegate = ReactNativeDelegate()
    let factory = ExpoReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory
    bindReactNativeFactory(factory)

#if os(iOS) || os(tvOS)
    window = UIWindow(frame: UIScreen.main.bounds)
    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: launchOptions)
#endif

    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }

  // Linking API
  public override func application(
    _ app: UIApplication,
    open url: URL,
    options: [UIApplication.OpenURLOptionsKey: Any] = [:]
  ) -> Bool {
    let datHandled = handleDatCallback(url: url)
    return datHandled
      || super.application(app, open: url, options: options)
      || RCTLinkingManager.application(app, open: url, options: options)
  }

  // Universal Links
  public override func application(
    _ application: UIApplication,
    continue userActivity: NSUserActivity,
    restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void
  ) -> Bool {
    let datHandled = handleDatCallback(url: userActivity.webpageURL)
    let result = RCTLinkingManager.application(application, continue: userActivity, restorationHandler: restorationHandler)
    return datHandled || super.application(application, continue: userActivity, restorationHandler: restorationHandler) || result
  }

  private func handleDatCallback(url: URL?) -> Bool {
#if canImport(MWDATCore)
    guard let url else {
      return false
    }
    guard
      isDatCallbackURL(url)
    else {
      return false
    }

    Task {
      do {
        _ = try await Wearables.shared.handleUrl(url)
      } catch {
        NSLog("[MetaGlassesBridge] DAT callback handling failed: %@", error.localizedDescription)
      }
    }
    return true
#else
    return false
#endif
  }

  private func isDatCallbackURL(_ url: URL) -> Bool {
    if let components = URLComponents(url: url, resolvingAgainstBaseURL: false),
      components.queryItems?.contains(where: { $0.name == "metaWearablesAction" }) == true
    {
      return true
    }

    let normalizedHost = url.host?.lowercased() ?? ""
    let normalizedPath = url.path.lowercased()
    if normalizedHost == "links.sevenlayers.io",
      normalizedPath.contains("dat-callback")
    {
      return true
    }

    return false
  }
}

class ReactNativeDelegate: ExpoReactNativeFactoryDelegate {
  // Extension point for config-plugins

  override func sourceURL(for bridge: RCTBridge) -> URL? {
    // needed to return the correct URL for expo-dev-client.
    bridge.bundleURL ?? bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    return RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: ".expo/.virtual-metro-entry")
#else
    return Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
