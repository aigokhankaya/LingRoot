// Test script for registration functionality
const fetch = require('node-fetch');

// Test registration with valid data
async function testValidRegistration() {
  try {
    const response = await fetch('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test User',
        email: 'test-user-' + Date.now() + '@example.com', // Unique email
        password: 'Password123!',
        phoneNumber: '5551234567'
      })
    });

    const data = await response.json();
    console.log('Valid Registration Test:', {
      status: response.status,
      success: data.success,
      message: data.message,
      user: data.data?.user ? {
        id: data.data.user.id,
        email: data.data.user.email,
      } : null,
      hasToken: !!data.data?.token
    });
    
    return data;
  } catch (error) {
    console.error('Error in valid registration test:', error);
  }
}

// Test registration with existing email
async function testDuplicateEmail(email) {
  try {
    const response = await fetch('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Duplicate User',
        email, // Use the email from successful registration
        password: 'Password123!',
        phoneNumber: '5559876543'
      })
    });

    const data = await response.json();
    console.log('Duplicate Email Test:', {
      status: response.status,
      success: data.success,
      message: data.message
    });
  } catch (error) {
    console.error('Error in duplicate email test:', error);
  }
}

// Test registration with invalid data
async function testInvalidData() {
  try {
    const response = await fetch('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Invalid User',
        email: 'not-an-email',
        password: '123', // Too short
        phoneNumber: ''
      })
    });

    const data = await response.json();
    console.log('Invalid Data Test:', {
      status: response.status,
      success: data.success,
      message: data.message
    });
  } catch (error) {
    console.error('Error in invalid data test:', error);
  }
}

// Run the tests
async function runTests() {
  console.log('Starting registration tests...');
  
  // First test with valid data
  const validResult = await testValidRegistration();
  
  // If successful, test with the same email
  if (validResult?.success && validResult?.data?.user?.email) {
    await testDuplicateEmail(validResult.data.user.email);
  }
  
  // Test with invalid data
  await testInvalidData();
  
  console.log('Registration tests completed');
}

runTests(); 