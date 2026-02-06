import UIKit
import React
import UserNotifications
import FBSDKCoreKit
import FirebaseCore
import GoogleSignIn

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate, UNUserNotificationCenterDelegate {
  var window: UIWindow?
  var bridge: RCTBridge?
  private var sceneObserver: NSObjectProtocol?

  override init() {
    super.init()
    // Observe scene activation to associate window with scene as early as possible.
    // RCTKeyWindow() uses windowScene.keyWindow which requires this association.
    sceneObserver = NotificationCenter.default.addObserver(
      forName: UIScene.didActivateNotification,
      object: nil,
      queue: .main
    ) { [weak self] notification in
      self?.ensureWindowSceneAssociation()
    }
  }

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    // Initialize Facebook SDK
    ApplicationDelegate.shared.application(
      application,
      didFinishLaunchingWithOptions: launchOptions
    )

    // Initialize Firebase for React Native Firebase modules (App, Messaging, etc.)
    FirebaseApp.configure()

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

    // Try immediate association (may not work if scene isn't connected yet)
    ensureWindowSceneAssociation()

    return true
  }

  func applicationDidBecomeActive(_ application: UIApplication) {
    // Final safety net: scene is guaranteed to be active here
    ensureWindowSceneAssociation()
  }

  /// Associates the window with the UIWindowScene and re-establishes it as key window.
  /// Without this, RCTKeyWindow() returns nil on RN 0.79 because windowScene.keyWindow
  /// can't find a window that isn't explicitly associated with the scene.
  private func ensureWindowSceneAssociation() {
    guard let window = window else { return }
    if window.windowScene == nil,
       let windowScene = UIApplication.shared.connectedScenes
        .compactMap({ $0 as? UIWindowScene }).first {
      window.windowScene = windowScene
    }
    // Re-establish as key window for the scene after association
    if window.windowScene != nil && !window.isKeyWindow {
      window.makeKeyAndVisible()
    }
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
    // Handle Google Sign-In URL
    if GIDSignIn.sharedInstance.handle(url) {
      return true
    }

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
