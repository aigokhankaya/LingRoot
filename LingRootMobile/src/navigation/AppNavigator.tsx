import React, { useRef, useEffect, useState, Suspense } from 'react';
import { NavigationContainer, NavigationContainerRef, CommonActions } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
// import { Ionicons } from '@expo/vector-icons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import { View, TouchableOpacity, Text, StyleSheet, Animated, ActivityIndicator } from 'react-native';
import { Platform } from 'react-native';
import { getEnvironmentConfig } from '../services/environmentConfig';
import { COLORS } from '../theme/colors';
import BlurHeader from '../components/BlurHeader';
import KeyboardToggleOverlay from '../components/KeyboardToggleOverlay';
import perfLog from '../utils/performanceLogger';

import { useAuth } from '../contexts/AuthContext';
import NotificationService from '../services/notificationService';
import { getUnreadNotifications, markNotificationAsRead } from '../services/userService';
import { setupFirebaseMessagingListeners, checkInitialNotification } from '../services/pushTokenService';

import { useLanguage } from '../contexts/LanguageContext';
import { RootStackParamList, MainTabParamList } from '../types';
import { logScreenView } from '../services/analytics';

// Critical screens (eager loading)
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import ResetPasswordScreen from '../screens/ResetPasswordScreen';
import HomeGateScreen from '../screens/HomeGateScreen';
import LibraryScreen from '../screens/LibraryScreen';
import CreateScreen from '../screens/CreateScreen';
import ProfileScreen from '../screens/ProfileScreen';

// Lazy-loaded screens (non-critical)
const VocabularyScreenLazy = React.lazy(() => import('../screens/VocabularyScreen'));
const TopicTreeScreenLazy = React.lazy(() => import('../screens/TopicTreeScreen'));
const PatternListScreenLazy = React.lazy(() => import('../screens/PatternListScreen'));
const MembershipScreenLazy = React.lazy(() => import('../screens/MembershipScreen'));
const ChatScreenLazy = React.lazy(() => import('../screens/ChatScreen'));
const AccountSettingsScreenLazy = React.lazy(() => import('../screens/AccountSettingsScreen'));
const PackagesScreenLazy = React.lazy(() => import('../screens/PackagesScreen'));
const PrivacyPolicyScreenLazy = React.lazy(() => import('../screens/PrivacyPolicyScreen'));
const TermsOfServiceScreenLazy = React.lazy(() => import('../screens/TermsOfServiceScreen'));
const ReminderSettingsScreenLazy = React.lazy(() => import('../screens/ReminderSettingsScreen'));
const ReminderTestScreenLazy = React.lazy(() => import('../screens/ReminderTestScreen'));
const TtsProviderSettingsScreenLazy = React.lazy(() => import('../screens/TtsProviderSettingsScreen'));
const LiroScreenLazy = React.lazy(() => import('../screens/LiroScreen'));
const AudioPlayerScreenLazy = React.lazy(() => import('../screens/AudioPlayerScreen'));
const NotificationsScreenLazy = React.lazy(() => import('../screens/NotificationsScreen'));

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

// Track last time we navigated due to an audio_created notification
// so that polling + notification taps do not trigger multiple navigations
let lastAudioNotificationHandledAt: number | null = null;

// Lazy screen loading wrapper with Suspense
const LazyScreenFallback = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F1F5F9' }}>
    <ActivityIndicator size="large" color={COLORS.brandTeal} />
  </View>
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const withLazy = (LazyComponent: React.LazyExoticComponent<React.ComponentType<any>>) => {
  const Wrapped = (props: Record<string, unknown>) => (
    <Suspense fallback={<LazyScreenFallback />}>
      <LazyComponent {...props} />
    </Suspense>
  );
  return Wrapped;
};

const LoadingScreen = () => {
  const waveAnim = useRef(new Animated.Value(0)).current;
  const dotAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fade in
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();

    // Wave ring expand
    const wave = Animated.loop(
      Animated.sequence([
        Animated.timing(waveAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
        Animated.timing(waveAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    wave.start();

    // Dot pulse
    const dot = Animated.loop(
      Animated.sequence([
        Animated.timing(dotAnim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
        Animated.timing(dotAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    dot.start();

    return () => { wave.stop(); dot.stop(); };
  }, []);

  return (
    <View style={splashStyles.container}>
      <LinearGradient colors={['#E0F7FA', '#F1F5F9']} style={StyleSheet.absoluteFillObject} />
      <Animated.View style={[splashStyles.content, { opacity: fadeAnim }]}>
        {/* Wave rings */}
        <View style={splashStyles.iconArea}>
          <Animated.View style={[splashStyles.waveRing, {
            opacity: waveAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.6, 0.3, 0] }),
            transform: [{ scale: waveAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 2] }) }],
          }]} />
          <Animated.View style={[splashStyles.waveRing, splashStyles.waveRing2, {
            opacity: waveAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.4, 0.2, 0] }),
            transform: [{ scale: waveAnim.interpolate({ inputRange: [0, 1], outputRange: [1.2, 2.4] }) }],
          }]} />

          {/* Robot icon with headphones */}
          <View style={splashStyles.robotCircle}>
            <View style={splashStyles.headphoneBand} />
            <Icon name="smart-toy" size={32} color="#FFFFFF" />
            <View style={splashStyles.cupLeft} />
            <View style={splashStyles.cupRight} />
          </View>
          <Animated.View style={[splashStyles.statusDot, { opacity: dotAnim }]} />
        </View>

        {/* Brand text */}
        <Text style={splashStyles.brandText}>LingRoot</Text>
      </Animated.View>
    </View>
  );
};

const AuthStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
    </Stack.Navigator>
  );
};

const MainTabsContent = () => {
  const { t } = useLanguage();
  const [isTestEnv, setIsTestEnv] = useState(false);
  const isPollingRef = useRef(false);

  useEffect(() => {
    getEnvironmentConfig().then(config => {
      setIsTestEnv(config.environment === 'test');
    });

    // Flush any accumulated perf logs from previous sessions
    perfLog.flush();

    // Poll for notifications every 30 seconds
    const pollNotifications = async () => {
      if (isPollingRef.current) return;
      isPollingRef.current = true;
      try {
        perfLog.start('pollNotifications', 'MainTabs');
        const notifications = await getUnreadNotifications();

        if (!Array.isArray(notifications) || notifications.length === 0) {
          return;
        }

        const audioNotifications = notifications.filter(
          (notification: any) => notification.type === 'audio_created' && notification.data
        );

        if (!audioNotifications.length) {
          return;
        }

        const now = Date.now();
        const recentlyHandled =
          typeof lastAudioNotificationHandledAt === 'number' &&
          now - lastAudioNotificationHandledAt < 15000;

        const latestNotification = audioNotifications[0];

        // Only navigate once per batch of unread audio notifications,
        // and skip navigation if we have very recently navigated due to
        // a notification tap.
        if (!recentlyHandled) {
          try {
            const navRef = (global as any).__NAVIGATION_REF__;
            if (navRef?.current) {
              const { CommonActions } = require('@react-navigation/native');
              navRef.current.dispatch(
                CommonActions.reset({
                  index: 0,
                  routes: [
                    {
                      name: 'Main',
                      state: {
                        routes: [
                          {
                            name: 'Library',
                            params: { notificationAudio: latestNotification.data },
                          },
                        ],
                      },
                    },
                  ],
                })
              );
              lastAudioNotificationHandledAt = now;
            }
          } catch (navError) {
            // Ignore navigation errors in production
          }
        }

        // Mark all audio_created notifications as read so they don't
        // trigger navigation again on the next poll.
        try {
          await Promise.all(
            audioNotifications.map((notification: any) =>
              markNotificationAsRead(notification.id).catch(() => { })
            )
          );
        } catch {
          // Ignore marking errors
        }
      } catch {
        // Silent error for polling failures
      } finally {
        isPollingRef.current = false;
        perfLog.end('pollNotifications');
      }
    };

    // Poll immediately and then every 30 seconds
    pollNotifications();
    const pollInterval = setInterval(pollNotifications, 30000);

    return () => {
      clearInterval(pollInterval);
    };
  }, []);

  const TestBadge = () => (
    isTestEnv ? (
      <View style={styles.testBadge}>
        <Text style={styles.testBadgeText}>TEST</Text>
      </View>
    ) : null
  );

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string;

          switch (route.name) {
            case 'Home':
              iconName = 'home' as any;
              break;
            case 'Library':
              iconName = 'library' as any;
              break;
            case 'Create':
              iconName = 'add-circle' as any;
              break;
            case 'Profile':
              iconName = 'person' as any;
              break;
            default:
              iconName = 'help' as any;
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: COLORS.brandOrange,
        tabBarInactiveTintColor: COLORS.slate400,
        tabBarShowLabel: false,
        tabBarStyle: {
          position: 'absolute',
          bottom: 24,
          left: 24,
          right: 24,
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          borderRadius: 32,
          height: 64,
          borderWidth: 2,
          borderTopWidth: 2,
          borderColor: COLORS.brandTeal,
          shadowColor: COLORS.brandIndigo,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.15,
          shadowRadius: 24,
          elevation: 8,
          paddingHorizontal: 8,
        },
        tabBarItemStyle: {
          borderRadius: 24,
          marginHorizontal: 4,
          marginVertical: 8,
        },
        headerShown: true,
        headerTransparent: true,
        headerBackground: () => <BlurHeader />,
        headerTintColor: COLORS.slate900,
        headerTitleAlign: 'center',
        headerTitleStyle: {
          fontWeight: '700',
          color: COLORS.slate900,
        },
        headerRight: () => <TestBadge />,
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeGateScreen}
        options={{
          tabBarLabel: t('home.title'),
          headerTitle: t('home.title')
        }}
      />
      <Tab.Screen
        name="Library"
        component={LibraryScreen}
        options={{
          tabBarLabel: t('library.title'),
          headerShown: false,
        }}
      />
      <Tab.Screen
        name="Create"
        component={CreateScreen}
        options={({ route, navigation }) => {
          // Check if this tab is currently focused
          const state = navigation.getState();
          const currentRoute = state.routes[state.index];
          const isFocused = currentRoute.name === 'Create';

          return {
            tabBarLabel: t('create.title'),
            headerTitle: t('create.title'),
            headerLeft: () => (
              <TouchableOpacity
                onPress={() => navigation.navigate('Home')}
                style={{ flexDirection: 'row', alignItems: 'center', marginLeft: Platform.OS === 'ios' ? 8 : 4 }}
              >
                <Ionicons name="chevron-back" size={28} color={COLORS.slate900} />
                <Text style={{ color: COLORS.slate900, fontSize: 17 }}>
                  {t('common.back')}
                </Text>
              </TouchableOpacity>
            ),
            // Only apply custom button when NOT focused (to make it dim)
            ...(isFocused ? {} : {
              tabBarButton: ({ style, children, accessibilityState, testID, accessibilityLabel, accessibilityRole }) => (
                <TouchableOpacity
                  style={[style, { opacity: 0.3 }]}
                  disabled={true}
                  activeOpacity={1}
                  accessibilityState={accessibilityState}
                  accessibilityLabel={accessibilityLabel}
                  accessibilityRole={accessibilityRole}
                  testID={testID}
                >
                  {children}
                </TouchableOpacity>
              )
            })
          };
        }}
        initialParams={{ mode: 'text' }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            // Prevent direct navigation to Create tab (no alert)
            e.preventDefault();
          },
        })}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: t('profile.title'),
          headerTitle: t('profile.title')
        }}
      />
    </Tab.Navigator>
  );
};

const MainTabs = MainTabsContent;

const styles = StyleSheet.create({
  testBadge: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 12,
  },
  testBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

const splashStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconArea: {
    width: 88,
    height: 88,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  waveRing: {
    position: 'absolute',
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    borderColor: COLORS.brandTeal,
  },
  waveRing2: {
    // second wave — animation values differ via inline styles
  },
  robotCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.brandTeal,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.brandTeal,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
    overflow: 'hidden',
  },
  headphoneBand: {
    position: 'absolute',
    top: 7,
    width: 28,
    height: 16,
    borderTopWidth: 2.5,
    borderLeftWidth: 2.5,
    borderRightWidth: 2.5,
    borderColor: 'rgba(255,255,255,0.8)',
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
  },
  cupLeft: {
    position: 'absolute',
    left: 9,
    top: 23,
    width: 6,
    height: 16,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 3,
  },
  cupRight: {
    position: 'absolute',
    right: 9,
    top: 23,
    width: 6,
    height: 16,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 3,
  },
  statusDot: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#4ade80',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  brandText: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.brandTeal,
    letterSpacing: -0.5,
  },
});

const AppNavigator = () => {
  const { user, isLoading } = useAuth();
  const { t, language } = useLanguage();
  const navigationRef = useRef<NavigationContainerRef<RootStackParamList>>(null);
  const [navReady, setNavReady] = useState(false);
  const [initialWordId, setInitialWordId] = useState<string | null>(null);
  const [initialAudioNotification, setInitialAudioNotification] = useState<any | null>(null);
  const [initialSupportNotification, setInitialSupportNotification] = useState<any | null>(null);

  // Store navigation ref globally for direct access from notification service
  useEffect(() => {
    (global as any).__NAVIGATION_REF__ = navigationRef;
  }, []);

  // Setup Firebase messaging listeners for remote push notifications (FCM)
  // This ensures badge updates when remote notifications arrive
  useEffect(() => {
    if (!user) return;

    // Setup listeners for foreground and background->foreground transitions
    const unsubscribeMessaging = setupFirebaseMessagingListeners();

    // Check if app was opened from a notification (cold start)
    checkInitialNotification();

    return () => {
      unsubscribeMessaging();
    };
  }, [user]);

  useEffect(() => {
    if (user && navigationRef.current) {
      try {
        (NotificationService as any).initialize?.();
      } catch {
      }

      // Setup notification response handler
      const subscription = NotificationService.setupNotificationResponseHandler((data: string) => {
        let parsed: any = null;
        try {
          parsed = JSON.parse(data);
        } catch {
          // Non-JSON payloads are treated as vocabulary wordId
        }

        console.log('[AppNav][Notification] Raw payload:', data);
        console.log('[AppNav][Notification] Parsed payload:', parsed);

        const isAudioNotification = parsed && parsed.type === 'audio_created' && parsed.data;
        const isSupportNotification = parsed && parsed.type === 'support_message' && parsed.data;

        const navigateToAudioFromNotification = (audioData: any) => {
          try {
            navigationRef.current?.dispatch(
              CommonActions.reset({
                index: 0,
                routes: [
                  {
                    name: 'Main',
                    state: {
                      routes: [
                        {
                          name: 'Library',
                          params: { notificationAudio: audioData },
                        },
                      ],
                    },
                  },
                ],
              })
            );
            lastAudioNotificationHandledAt = Date.now();
          } catch (e) {
            console.error('Navigation error (audio notification):', e);
          }
        };

        const navigateToVocabularyFromNotification = (wordId: string) => {
          try {
            navigationRef.current?.dispatch(
              CommonActions.reset({
                index: 1,
                routes: [
                  { name: 'Main' },
                  { name: 'Vocabulary', params: { wordId } },
                ],
              })
            );
          } catch (e) {
            console.error('Navigation error (vocabulary notification):', e);
          }
        };

        const navigateToSupportFromNotification = (supportData: any) => {
          try {
            navigationRef.current?.navigate('Chat', {
              conversationId: supportData.conversationId,
            } as any);
          } catch (e) {
            console.error('Navigation error (support notification):', e);
          }
        };

        if (navReady) {
          if (isAudioNotification) {
            console.log('[AppNav][Notification] Navigating to Library with audio data:', {
              keys: parsed && parsed.data ? Object.keys(parsed.data) : [],
              audioId: parsed?.data?.audioId,
              jobId: parsed?.data?.jobId,
            });
            navigateToAudioFromNotification(parsed.data);
          } else if (isSupportNotification) {
            console.log('[AppNav][Notification] Navigating to Support Chat with data:', parsed.data);
            navigateToSupportFromNotification(parsed.data);
          } else {
            const wordId = parsed ? (parsed.wordId || data) : data;
            navigateToVocabularyFromNotification(String(wordId));
          }
        } else {
          if (isAudioNotification) {
            console.log('[AppNav][Notification] Nav not ready, caching initial audio notification');
            setInitialAudioNotification(parsed.data);
          } else if (isSupportNotification) {
            console.log('[AppNav][Notification] Nav not ready, caching initial support notification');
            setInitialSupportNotification(parsed.data);
          } else {
            const wordId = parsed ? (parsed.wordId || data) : data;
            setInitialWordId(String(wordId));
          }
        }
      });

      // Handle cold start: app launched by tapping a notification (iOS only)
      if (Platform.OS === 'ios') {
        (async () => {
          try {
            const PushNotificationIOS = require('@react-native-community/push-notification-ios').default;
            const initial = await PushNotificationIOS.getInitialNotification();
            const data: any = initial?.getData ? initial.getData() : null;
            const initialWordId = data?.wordId ?? data?.userInfo?.wordId;
            if (initialWordId) {
              const wordId = String(initialWordId);
              setInitialWordId(wordId);
            }
          } catch (e) {
            // Silent error handling
          }
        })();
      }

      // Return cleanup function
      return () => {
        if (subscription) {
          subscription.remove();
        }
      };
    }
  }, [user, navReady]);

  // When navigation becomes ready or user logs in, consume any pending notification and navigate
  useEffect(() => {
    if (!user || !navReady || !navigationRef.current) return;

    // 1) Support notification pending while nav was not ready
    if (initialSupportNotification) {
      try {
        navigationRef.current.navigate('Chat', {
          conversationId: initialSupportNotification.conversationId,
        });
      } catch (e) {
        console.error('Navigation error (initial support notification):', e);
      } finally {
        setInitialSupportNotification(null);
      }
      return;
    }

    // 2) Audio notification pending while nav was not ready
    if (initialAudioNotification) {
      try {
        navigationRef.current.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [
              {
                name: 'Main',
                state: {
                  routes: [
                    {
                      name: 'Library',
                      params: { notificationAudio: initialAudioNotification },
                    },
                  ],
                },
              },
            ],
          })
        );
        lastAudioNotificationHandledAt = Date.now();
      } catch (e) {
        console.error('Navigation error (initial audio notification):', e);
      } finally {
        setInitialAudioNotification(null);
      }
      return;
    }

    // 3) Vocabulary notification pending while nav was not ready
    const pending = NotificationService.consumePendingWordId
      ? NotificationService.consumePendingWordId()
      : null;
    const target = pending || initialWordId;
    if (target) {
      navigationRef.current.dispatch(
        CommonActions.reset({
          index: 1,
          routes: [
            { name: 'Main' },
            { name: 'Vocabulary', params: { wordId: target } },
          ],
        })
      );
      setInitialWordId(null);
    }
  }, [user, navReady, initialWordId, initialAudioNotification]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <View style={{ flex: 1 }}>
      <NavigationContainer
        ref={navigationRef}
        onReady={() => {
          setNavReady(true);
          const currentRouteName = navigationRef.current?.getCurrentRoute()?.name;
          if (currentRouteName) {
            logScreenView(currentRouteName, currentRouteName);
          }
        }}
        onStateChange={async () => {
          const previousRouteName = (global as any).__currentRouteName;
          const currentRouteName = navigationRef.current?.getCurrentRoute()?.name;

          if (previousRouteName !== currentRouteName && currentRouteName) {
            await logScreenView(currentRouteName, currentRouteName);
            perfLog.setScreen(currentRouteName);
          }
          (global as any).__currentRouteName = currentRouteName;
        }}
      >
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {user ? (
            <>
              <Stack.Screen
                name="Main"
                component={MainTabs}
                options={{ headerBackTitle: t('common.back') }}
              />
              <Stack.Screen
                name="TopicTree"
                component={withLazy(TopicTreeScreenLazy)}
                options={{
                  headerShown: true,
                  headerTransparent: true,
                  headerBackground: () => <BlurHeader />,
                  headerTintColor: COLORS.slate900,
                  headerTitleStyle: { fontWeight: 'bold', color: COLORS.slate900 },
                  headerTitle: language === 'tr' ? 'Konu Ağacım' : 'My Topic Tree',
                  headerBackTitle: t('common.back'),
                }}
              />
              <Stack.Screen
                name="Vocabulary"
                component={withLazy(VocabularyScreenLazy)}
                options={{
                  headerShown: true,
                  headerTransparent: true,
                  headerBackground: () => <BlurHeader />,
                  headerTintColor: COLORS.slate900,
                  headerTitleStyle: { fontWeight: 'bold', color: COLORS.slate900 },
                  headerTitle: language === 'tr' ? 'Kelimelerim' : 'My Vocabulary',
                  headerBackTitle: t('common.back'),
                }}
              />
              <Stack.Screen
                name="Liro"
                component={withLazy(LiroScreenLazy)}
                options={{
                  headerShown: true,
                  headerTransparent: true,
                  headerBackground: () => <BlurHeader />,
                  headerTintColor: COLORS.slate900,
                  headerTitleStyle: { fontWeight: 'bold', color: COLORS.slate900 },
                  headerTitle: 'LIRO',
                  headerBackTitle: t('common.back'),
                }}
              />
              <Stack.Screen
                name="Settings"
                component={withLazy(AccountSettingsScreenLazy)}
                options={({ navigation }) => ({
                  headerShown: true,
                  headerTransparent: true,
                  headerBackground: () => <BlurHeader />,
                  headerTintColor: COLORS.slate900,
                  headerTitleStyle: { fontWeight: 'bold', color: COLORS.slate900 },
                  headerTitle: t('profile.accountSettings'),
                  headerBackTitle: t('common.back'),
                })}
              />
              <Stack.Screen
                name="Membership"
                component={withLazy(MembershipScreenLazy)}
                options={{
                  headerShown: true,
                  headerTransparent: true,
                  headerBackground: () => <BlurHeader />,
                  headerTintColor: COLORS.slate900,
                  headerTitleStyle: { fontWeight: 'bold', color: COLORS.slate900 },
                  headerBackTitle: t('common.back'),
                }}
              />
              <Stack.Screen
                name="Packages"
                component={withLazy(PackagesScreenLazy)}
                options={{
                  headerShown: false,
                }}
              />
              <Stack.Screen
                name="Chat"
                component={withLazy(ChatScreenLazy)}
                options={{
                  headerShown: false,
                }}
              />
              <Stack.Screen
                name="PatternList"
                component={withLazy(PatternListScreenLazy)}
                options={{
                  headerShown: false,
                }}
              />
              <Stack.Screen
                name="PrivacyPolicy"
                component={withLazy(PrivacyPolicyScreenLazy)}
                options={{
                  headerShown: true,
                  headerTransparent: true,
                  headerBackground: () => <BlurHeader />,
                  headerTintColor: COLORS.slate900,
                  headerTitleStyle: { fontWeight: 'bold', color: COLORS.slate900 },
                  headerTitle: language === 'tr' ? 'Gizlilik Politikası' : 'Privacy Policy',
                }}
              />
              <Stack.Screen
                name="TermsOfService"
                component={withLazy(TermsOfServiceScreenLazy)}
                options={{
                  headerShown: true,
                  headerTransparent: true,
                  headerBackground: () => <BlurHeader />,
                  headerTintColor: COLORS.slate900,
                  headerTitleStyle: { fontWeight: 'bold', color: COLORS.slate900 },
                  headerTitle: language === 'tr' ? 'Kullanım Koşulları' : 'Terms of Service',
                }}
              />
              <Stack.Screen
                name="ReminderSettings"
                component={withLazy(ReminderSettingsScreenLazy)}
                options={{
                  headerShown: true,
                  headerTransparent: true,
                  headerBackground: () => <BlurHeader />,
                  headerTintColor: COLORS.slate900,
                  headerTitleStyle: { fontWeight: 'bold', color: COLORS.slate900 },
                  headerTitle: language === 'tr' ? 'Hatırlatıcı Ayarları' : 'Reminder Settings',
                  headerBackTitle: t('common.back'),
                }}
              />
              <Stack.Screen
                name="ReminderTest"
                component={withLazy(ReminderTestScreenLazy)}
                options={{
                  headerShown: true,
                  headerTransparent: true,
                  headerBackground: () => <BlurHeader />,
                  headerTintColor: COLORS.slate900,
                  headerTitleStyle: { fontWeight: 'bold', color: COLORS.slate900 },
                  headerTitle: language === 'tr' ? 'Test Ekranı' : 'Test Screen',
                  headerBackTitle: t('common.back'),
                }}
              />
              <Stack.Screen
                name="Notifications"
                component={withLazy(NotificationsScreenLazy)}
                options={{
                  headerShown: true,
                  headerTransparent: true,
                  headerBackground: () => <BlurHeader />,
                  headerTintColor: COLORS.slate900,
                  headerTitleStyle: { fontWeight: 'bold', color: COLORS.slate900 },
                  headerTitle: language === 'tr' ? 'Bildirimler' : 'Notifications',
                  headerBackTitle: t('common.back'),
                }}
              />
              <Stack.Screen
                name="TtsProviderSettings"
                component={withLazy(TtsProviderSettingsScreenLazy)}
                options={{
                  headerShown: false,
                }}
              />
              <Stack.Screen
                name="AudioPlayer"
                component={withLazy(AudioPlayerScreenLazy)}
                options={{
                  headerShown: false,
                  presentation: 'modal',
                  gestureEnabled: true,
                }}
              />
            </>
          ) : (
            <Stack.Screen name="Auth" component={AuthStack} />
          )}
        </Stack.Navigator>
      </NavigationContainer>
      <KeyboardToggleOverlay />
    </View>
  );
};

export default AppNavigator; 
