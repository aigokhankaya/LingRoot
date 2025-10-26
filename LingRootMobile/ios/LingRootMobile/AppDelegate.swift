import UIKit
import React
import UserNotifications
import FBSDKCoreKit

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate, UNUserNotificationCenterDelegate {
  var window: UIWindow?
  var bridge: RCTBridge?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    // Initialize Facebook SDK
    ApplicationDelegate.shared.application(
      application,
      didFinishLaunchingWithOptions: launchOptions
    )
    
    // Set notification center delegate to receive notifications in foreground and tap responses
    UNUserNotificationCenter.current().delegate = self
    #if DEBUG
      let jsBundleURL = RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
    #else
      let jsBundleURL = Bundle.main.url(forResource: "main", withExtension: "jsbundle")
    #endif

    bridge = RCTBridge(bundleURL: jsBundleURL, moduleProvider: nil, launchOptions: launchOptions)
    let rootView = RCTRootView(bridge: bridge!, moduleName: "LingRootMobile", initialProperties: nil)
    rootView.backgroundColor = UIColor.white

    window = UIWindow(frame: UIScreen.main.bounds)
    let rootViewController = UIViewController()
    rootViewController.view = rootView
    window?.rootViewController = rootViewController
    window?.makeKeyAndVisible()

    return true
  }

  // MARK: - UNUserNotificationCenterDelegate

  // Show notifications while app is in foreground
  func userNotificationCenter(_ center: UNUserNotificationCenter,
                              willPresent notification: UNNotification,
                              withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
    // Show alert, play sound, update badge
    completionHandler([.alert, .sound, .badge])
  }

  // Handle notification tap responses (background/cold start)
  func userNotificationCenter(_ center: UNUserNotificationCenter,
                              didReceive response: UNNotificationResponse,
                              withCompletionHandler completionHandler: @escaping () -> Void) {
    // Extract wordId and post custom notification for immediate JS handling
    let userInfo = response.notification.request.content.userInfo
    let wordId = userInfo["wordId"] as? String ?? ""
    
    // Send event to React Native via RCTDeviceEventEmitter
    if let bridge = self.bridge {
      bridge.eventDispatcher().sendDeviceEvent(withName: "LingRootNotificationTapped", body: [
        "wordId": wordId,
        "timestamp": Date().timeIntervalSince1970
      ])
    }
    
    print("📱 Native: Posted LingRootNotificationTapped with wordId: \(wordId)")
    completionHandler()
  }

  // Linking API
  func application(
    _ app: UIApplication,
    open url: URL,
    options: [UIApplication.OpenURLOptionsKey: Any] = [:]
  ) -> Bool {
    // Handle Facebook URL
    if ApplicationDelegate.shared.application(app, open: url, options: options) {
      return true
    }
    
    return RCTLinkingManager.application(app, open: url, options: options)
  }

  // Universal Links
  func application(
    _ application: UIApplication,
    continue userActivity: NSUserActivity,
    restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void
  ) -> Bool {
    let result = RCTLinkingManager.application(application, continue: userActivity, restorationHandler: restorationHandler)
    return result
  }
}
