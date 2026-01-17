import React, { useRef, useEffect, useState } from 'react';
import { NavigationContainer, NavigationContainerRef, CommonActions } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
// import { Ionicons } from '@expo/vector-icons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Alert, View, ActivityIndicator, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Platform } from 'react-native';
import { getEnvironmentConfig } from '../services/environmentConfig';
import { COLORS } from '../theme/colors';
import BlurHeader from '../components/BlurHeader';

import { useAuth } from '../contexts/AuthContext';
import NotificationService from '../services/notificationService';
import { getUnreadNotifications, markNotificationAsRead } from '../services/userService';

import { useLanguage } from '../contexts/LanguageContext';
import { RootStackParamList, MainTabParamList } from '../types';

// Screens
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import ResetPasswordScreen from '../screens/ResetPasswordScreen';
import HomeScreen from '../screens/HomeScreen';
import LibraryScreen from '../screens/LibraryScreen';
import CreateScreen from '../screens/CreateScreen';
import ProfileScreen from '../screens/ProfileScreen';
import VocabularyScreen from '../screens/VocabularyScreen';
import TopicTreeScreen from '../screens/TopicTreeScreen';
import PatternListScreen from '../screens/PatternListScreen';
import MembershipScreen from '../screens/MembershipScreen';
import ChatScreen from '../screens/ChatScreen';
import AccountSettingsScreen from '../screens/AccountSettingsScreen';
import PackagesScreen from '../screens/PackagesScreen';
import PrivacyPolicyScreen from '../screens/PrivacyPolicyScreen';
import TermsOfServiceScreen from '../screens/TermsOfServiceScreen';
import ReminderSettingsScreen from '../screens/ReminderSettingsScreen';
import TtsProviderSettingsScreen from '../screens/TtsProviderSettingsScreen';
import LiroScreen from '../screens/LiroScreen';

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

// Track last time we navigated due to an audio_created notification
// so that polling + notification taps do not trigger multiple navigations
let lastAudioNotificationHandledAt: number | null = null;

const LoadingScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <ActivityIndicator size="large" color={COLORS.primary} />
  </View>
);

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

const MainTabs = () => {
  const { t } = useLanguage();
  const [isTestEnv, setIsTestEnv] = useState(false);

  useEffect(() => {
    getEnvironmentConfig().then(config => {
      setIsTestEnv(config.environment === 'test');
    });

    // Poll for notifications every 30 seconds
    const pollNotifications = async () => {
      try {
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
      }
    };

    // Poll immediately and then every 5 seconds (more responsive for async TTS)
    pollNotifications();
    const pollInterval = setInterval(pollNotifications, 5000);

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
        headerTitleStyle: {
          fontWeight: '700',
          color: COLORS.slate900,
        },
        headerRight: () => <TestBadge />,
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
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
          headerTitle: t('library.title')
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
    <NavigationContainer ref={navigationRef} onReady={() => setNavReady(true)}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen
              name="TopicTree"
              component={TopicTreeScreen}
              options={{
                headerShown: true,
                headerTransparent: true,
                headerBackground: () => <BlurHeader />,
                headerTintColor: COLORS.slate900,
                headerTitleStyle: { fontWeight: 'bold', color: COLORS.slate900 },
                headerTitle: language === 'tr' ? 'Konu Ağacım' : 'My Topic Tree',
              }}
            />
            <Stack.Screen
              name="Vocabulary"
              component={VocabularyScreen}
              options={{
                headerShown: true,
                headerTransparent: true,
                headerBackground: () => <BlurHeader />,
                headerTintColor: COLORS.slate900,
                headerTitleStyle: { fontWeight: 'bold', color: COLORS.slate900 },
                headerTitle: language === 'tr' ? 'Kelimelerim' : 'My Vocabulary',
              }}
            />
            <Stack.Screen
              name="Liro"
              component={LiroScreen}
              options={{
                headerShown: true,
                headerTransparent: true,
                headerBackground: () => <BlurHeader />,
                headerTintColor: COLORS.slate900,
                headerTitleStyle: { fontWeight: 'bold', color: COLORS.slate900 },
                headerTitle: 'LIRO',
              }}
            />
            <Stack.Screen
              name="Settings"
              component={AccountSettingsScreen}
              options={({ navigation }) => ({
                headerShown: true,
                headerTransparent: true,
                headerBackground: () => <BlurHeader />,
                headerTintColor: COLORS.slate900,
                headerTitleStyle: { fontWeight: 'bold', color: COLORS.slate900 },
                headerTitle: t('profile.accountSettings'),
              })}
            />
            <Stack.Screen
              name="Membership"
              component={MembershipScreen}
              options={{
                headerShown: true,
                headerTransparent: true,
                headerBackground: () => <BlurHeader />,
                headerTintColor: COLORS.slate900,
                headerTitleStyle: { fontWeight: 'bold', color: COLORS.slate900 },
              }}
            />
            <Stack.Screen
              name="Packages"
              component={PackagesScreen}
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="Chat"
              component={ChatScreen}
              options={{
                headerShown: true,
                headerTransparent: true,
                headerBackground: () => <BlurHeader />,
                headerTintColor: COLORS.slate900,
                headerTitleStyle: { fontWeight: 'bold', color: COLORS.slate900 },
                headerTitle: language === 'tr' ? 'Destek' : 'Support',
              }}
            />
            <Stack.Screen
              name="PatternList"
              component={PatternListScreen}
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="PrivacyPolicy"
              component={PrivacyPolicyScreen}
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
              component={TermsOfServiceScreen}
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
              component={ReminderSettingsScreen}
              options={{
                headerShown: true,
                headerTransparent: true,
                headerBackground: () => <BlurHeader />,
                headerTintColor: COLORS.slate900,
                headerTitleStyle: { fontWeight: 'bold', color: COLORS.slate900 },
                headerTitle: language === 'tr' ? 'Hatırlatıcı Ayarları' : 'Reminder Settings',
              }}
            />
            <Stack.Screen
              name="TtsProviderSettings"
              component={TtsProviderSettingsScreen}
              options={{
                headerShown: false,
              }}
            />
          </>
        ) : (
          <Stack.Screen name="Auth" component={AuthStack} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator; 