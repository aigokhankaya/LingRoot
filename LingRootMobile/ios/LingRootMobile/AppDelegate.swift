import UIKit
import React
import UserNotifications

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate, UNUserNotificationCenterDelegate {
  var window: UIWindow?
  var bridge: RCTBridge?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
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
    // Manual forwarding since RNCPushNotificationIOS methods are not exposed to Swift
    // Extract notification data and post to NotificationCenter for JS to handle
    let userInfo = response.notification.request.content.userInfo
    NotificationCenter.default.post(
      name: NSNotification.Name("RCTLocalNotificationReceived"),
      object: nil,
      userInfo: userInfo
    )
    completionHandler()
  }

  // Linking API
  func application(
    _ app: UIApplication,
    open url: URL,
    options: [UIApplication.OpenURLOptionsKey: Any] = [:]
  ) -> Bool {
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
