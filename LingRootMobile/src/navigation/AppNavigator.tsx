import React, { useRef, useEffect, useState } from 'react';
import { NavigationContainer, NavigationContainerRef, CommonActions } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
// import { Ionicons } from '@expo/vector-icons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Alert, View, ActivityIndicator } from 'react-native';
import { Platform } from 'react-native';

import { useAuth } from '../contexts/AuthContext';
import NotificationService from '../services/notificationService';

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
import MembershipScreen from '../screens/MembershipScreen';
import ChatScreen from '../screens/ChatScreen';
import AccountSettingsScreen from '../screens/AccountSettingsScreen';
import PackagesScreen from '../screens/PackagesScreen';

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
        options={{ 
          tabBarLabel: t('create.title'),
          headerTitle: t('create.title')
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

const AppNavigator = () => {
  const { user, isLoading } = useAuth();
  const navigationRef = useRef<NavigationContainerRef<RootStackParamList>>(null);
  const [navReady, setNavReady] = useState(false);
  const [initialWordId, setInitialWordId] = useState<string | null>(null);

  // Store navigation ref globally for direct access from notification service
  useEffect(() => {
    (global as any).__NAVIGATION_REF__ = navigationRef;
  }, []);

  useEffect(() => {
    if (user && navigationRef.current) {
      console.log('📱 Setting up notification handler in AppNavigator...');
      
      // Setup notification response handler
      const subscription = NotificationService.setupNotificationResponseHandler((wordId: string) => {
        console.log('📱 AppNavigator received wordId:', wordId);
        console.log('📱 Current navigation state:', navigationRef.current?.getCurrentRoute());
        
        
        // Navigate only when nav is ready; if not, store for later
        const doNavigate = () => {
          console.log('📱 Navigating to Vocabulary with wordId:', wordId);
          navigationRef.current?.dispatch(
            CommonActions.reset({
              index: 1,
              routes: [
                { name: 'Main' },
                { name: 'Vocabulary', params: { wordId } },
              ],
            })
          );
        };
        if (navReady) doNavigate();
        else setInitialWordId(String(wordId));
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
              console.log('❄️ Cold start captured wordId (waiting for nav ready):', wordId);
              setInitialWordId(wordId);
            }
          } catch (e) {
            console.log('getInitialNotification error', e);
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

  // When navigation becomes ready or user logs in, consume any pending wordId and navigate
  useEffect(() => {
    if (!user || !navReady || !navigationRef.current) return;

    // 1) From service-queued taps
    const pending = NotificationService.consumePendingWordId
      ? NotificationService.consumePendingWordId()
      : null;
    const target = pending || initialWordId;
    if (target) {
      console.log('🚀 Consuming pending/initial wordId:', target);
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
  }, [user, navReady, initialWordId]);

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
              options={{
                headerShown: true,
                headerStyle: { backgroundColor: '#007AFF' },
                headerTintColor: '#fff',
                headerTitleStyle: { fontWeight: 'bold' },
                headerTitle: 'Hesap Ayarları',
              }}
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
              options={{
                headerShown: true,
                headerStyle: { backgroundColor: '#007AFF' },
                headerTintColor: '#fff',
                headerTitleStyle: { fontWeight: 'bold' },
                headerTitle: 'Mesaj Gönder',
              }}
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
          </>
        ) : (
          <Stack.Screen name="Auth" component={AuthStack} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator; 