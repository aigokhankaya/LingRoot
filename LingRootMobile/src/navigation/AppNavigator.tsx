import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

import { useAuth } from '../contexts/AuthContext';
import { RootStackParamList, MainTabParamList } from '../types';

// Screens
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import HomeScreen from '../screens/HomeScreen';
import LibraryScreen from '../screens/LibraryScreen';
import CreateScreen from '../screens/CreateScreen';
import SuggestionsScreen from '../screens/SuggestionsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import VocabularyScreen from '../screens/VocabularyScreen';

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
    </Stack.Navigator>
  );
};

const MainTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string;

          switch (route.name) {
            case 'Home':
              iconName = 'home';
              break;
            case 'Library':
              iconName = 'library-music';
              break;
            case 'Create':
              iconName = 'add-circle';
              break;
            case 'Suggestions':
              iconName = 'lightbulb';
              break;
            case 'Profile':
              iconName = 'person';
              break;
            default:
              iconName = 'help';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{ tabBarLabel: 'Ana Sayfa' }}
      />
      <Tab.Screen 
        name="Library" 
        component={LibraryScreen}
        options={{ tabBarLabel: 'Kütüphane' }}
      />
      <Tab.Screen 
        name="Create" 
        component={CreateScreen}
        options={{ tabBarLabel: 'Oluştur' }}
      />
      <Tab.Screen 
        name="Suggestions" 
        component={SuggestionsScreen}
        options={{ tabBarLabel: 'Öneriler' }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{ tabBarLabel: 'Profil' }}
      />
    </Tab.Navigator>
  );
};

const AppNavigator = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen name="Vocabulary" component={VocabularyScreen} />
          </>
        ) : (
          <Stack.Screen name="Auth" component={AuthStack} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator; 