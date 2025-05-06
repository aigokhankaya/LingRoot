// Test script to verify API connections
import { API_BASE_URL } from './lib/api';
import { useAuth } from './lib/auth';
import * as userAPI from './lib/user';
import * as contentAPI from './lib/content';
import * as planAPI from './lib/plan';
import { getCurrentLanguage } from './lib/i18n';

// This is a test file to verify that all API connections are properly set up
// It's not meant to be run directly, but to check imports and type definitions

console.log('API Base URL:', API_BASE_URL);
console.log('Current Language:', getCurrentLanguage());
// console.log('Translation example:', getCurrentLanguage());

// Example usage of auth functions
const authExample = () => {
  const { user, login, register, logout } = useAuth();
  
  // Login example
  const loginUser = async () => {
    const result = await login('test@example.com', 'password123');
    console.log('Login result:', result);
  };
  
  // Register example
  const registerUser = async () => {
    const result = await register(
      'Test', // firstName
      'User',  // lastName
      'test@example.com', // email
      '+905551234567', // phoneNumber
      'password123' // password
    );
    console.log('Register result:', result);
  };
};

// Example usage of user API functions
const userAPIExample = async () => {
  try {
    // Get current user profile
    const profileResult = await userAPI.getCurrentUserProfile();
    console.log('User profile:', profileResult);
    
    // Update user profile
    const updateResult = await userAPI.updateUserProfile({
      firstName: 'Updated',
      lastName: 'Name',
      phoneNumber: '+905551234567'
    });
    console.log('Profile update result:', updateResult);
    
    // Admin functions
    const allUsersResult = await userAPI.getAllUsers();
    console.log('All users:', allUsersResult);
  } catch (error) {
    console.error('User API error:', error);
  }
};

// Example usage of content API functions
const contentAPIExample = async () => {
  try {
    // Get all content
    const allContentResult = await contentAPI.getAllContent();
    console.log('All content:', allContentResult);
    
    // Create content
    const createResult = await contentAPI.createContent({
      title: 'Test Content',
      content: 'This is test content',
      type: 'text',
      level: 'beginner'
    });
    console.log('Content creation result:', createResult);
    
    // Process text
    const processResult = await contentAPI.processTextContent(
      'This is a test text to process',
      'intermediate'
    );
    console.log('Text processing result:', processResult);
  } catch (error) {
    console.error('Content API error:', error);
  }
};

// Example usage of plan API functions
const planAPIExample = async () => {
  try {
    // Get all plans
    const allPlansResult = await planAPI.getAllPlans();
    console.log('All plans:', allPlansResult);
    
    // Get current subscription
    const subscriptionResult = await planAPI.getCurrentSubscription();
    console.log('Current subscription:', subscriptionResult);
    
    // Admin functions
    const createPlanResult = await planAPI.createPlan({
      name: 'Test Plan',
      description: 'This is a test plan',
      price: 9.99,
      currency: 'USD',
      interval: 'monthly',
      features: ['Feature 1', 'Feature 2']
    });
    console.log('Plan creation result:', createPlanResult);
  } catch (error) {
    console.error('Plan API error:', error);
  }
};

// This function would run all tests if this were an actual test file
const runAllTests = () => {
  console.log('Running API connection tests...');
  authExample();
  userAPIExample();
  contentAPIExample();
  planAPIExample();
  console.log('All API connection tests completed');
};

// Export test functions
export {
  authExample,
  userAPIExample,
  contentAPIExample,
  planAPIExample,
  runAllTests
};
