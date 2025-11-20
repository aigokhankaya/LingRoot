import React, { useRef, useEffect, useState } from 'react';
import { NavigationContainer, NavigationContainerRef, CommonActions } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
// import { Ionicons } from '@expo/vector-icons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Alert, View, ActivityIndicator, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Platform } from 'react-native';
import { getEnvironmentConfig } from '../services/environmentConfig';

import { useAuth } from '../contexts/AuthContext';
import NotificationService from '../services/notificationService';
import { apiService } from '../services/api';

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
import PatternListScreen from '../screens/PatternListScreen';
import MembershipScreen from '../screens/MembershipScreen';
import ChatScreen from '../screens/ChatScreen';
import AccountSettingsScreen from '../screens/AccountSettingsScreen';
import PackagesScreen from '../screens/PackagesScreen';
import PrivacyPolicyScreen from '../screens/PrivacyPolicyScreen';
import TermsOfServiceScreen from '../screens/TermsOfServiceScreen';
import ReminderSettingsScreen from '../screens/ReminderSettingsScreen';
import TtsProviderSettingsScreen from '../screens/TtsProviderSettingsScreen';

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const LoadingScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <ActivityIndicator size="large" color="#007AFF" />
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
        const notifications = await apiService.getUnreadNotifications();

        // Show local notifications for each unread notification
        for (const notification of notifications) {
          if (notification.type === 'audio_created') {
            await NotificationService.showAudioCreatedNotification(notification.data);
            // Mark as read
            await apiService.markNotificationAsRead(notification.id);
          }
        }
      } catch (error) {
        // Silent error
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
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: 'gray',
        headerShown: true,
        headerStyle: {
          backgroundColor: '#007AFF',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
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

  // Store navigation ref globally for direct access from notification service
  useEffect(() => {
    (global as any).__NAVIGATION_REF__ = navigationRef;
  }, []);

  useEffect(() => {
    if (user && navigationRef.current) {
      // Setup notification response handler
      const subscription = NotificationService.setupNotificationResponseHandler((data: string) => {
        let parsed: any = null;
        try {
          parsed = JSON.parse(data);
        } catch {
          // Non-JSON payloads are treated as vocabulary wordId
        }

        const isAudioNotification = parsed && parsed.type === 'audio_created' && parsed.data;

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

        if (navReady) {
          if (isAudioNotification) {
            navigateToAudioFromNotification(parsed.data);
          } else {
            const wordId = parsed ? (parsed.wordId || data) : data;
            navigateToVocabularyFromNotification(String(wordId));
          }
        } else {
          if (isAudioNotification) {
            setInitialAudioNotification(parsed.data);
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

    // 1) Audio notification pending while nav was not ready
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
      } catch (e) {
        console.error('Navigation error (initial audio notification):', e);
      } finally {
        setInitialAudioNotification(null);
      }
      return;
    }

    // 2) Vocabulary notification pending while nav was not ready
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
              name="Settings"
              component={AccountSettingsScreen}
              options={({ navigation }) => ({
                headerShown: true,
                headerStyle: { backgroundColor: '#007AFF' },
                headerTintColor: '#fff',
                headerTitleStyle: { fontWeight: 'bold' },
                headerTitle: t('profile.accountSettings'),
              })}
            />
            <Stack.Screen
              name="Membership"
              component={MembershipScreen}
              options={{
                headerShown: true,
                headerStyle: { backgroundColor: '#007AFF' },
                headerTintColor: '#fff',
                headerTitleStyle: { fontWeight: 'bold' },
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
              options={({ navigation }) => ({
                headerShown: true,
                headerStyle: { backgroundColor: '#007AFF' },
                headerTintColor: '#fff',
                headerTitleStyle: { fontWeight: 'bold' },
                headerTitle: language === 'tr' ? 'Mesaj Gönder' : 'Send Message',
              })}
            />
            <Stack.Screen
              name="Vocabulary"
              component={VocabularyScreen}
              options={{
                headerShown: true,
                headerStyle: {
                  backgroundColor: '#007AFF',
                },
                headerTintColor: '#fff',
                headerTitleStyle: {
                  fontWeight: 'bold',
                },
                headerTitle: 'Vocabulary', // This will be updated by the component
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
                headerStyle: { backgroundColor: '#007AFF' },
                headerTintColor: '#fff',
                headerTitleStyle: { fontWeight: 'bold' },
                headerTitle: language === 'tr' ? 'Gizlilik Politikası' : 'Privacy Policy',
              }}
            />
            <Stack.Screen
              name="TermsOfService"
              component={TermsOfServiceScreen}
              options={{
                headerShown: true,
                headerStyle: { backgroundColor: '#007AFF' },
                headerTintColor: '#fff',
                headerTitleStyle: { fontWeight: 'bold' },
                headerTitle: language === 'tr' ? 'Kullanım Koşulları' : 'Terms of Service',
              }}
            />
            <Stack.Screen
              name="ReminderSettings"
              component={ReminderSettingsScreen}
              options={{
                headerShown: true,
                headerStyle: { backgroundColor: '#007AFF' },
                headerTintColor: '#fff',
                headerTitleStyle: { fontWeight: 'bold' },
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