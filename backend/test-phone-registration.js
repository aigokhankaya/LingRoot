const axios = require('axios');

const BASE_URL = 'http://localhost:5001';

async function testPhoneRegistration() {
  console.log('🧪 Testing phone registration functionality...\n');
  
  try {
    // Test telefon numarası ile kayıt
    console.log('1️⃣ Testing phone registration...');
    const registerResponse = await axios.post(`${BASE_URL}/auth/register`, {
      firstName: 'Test',
      lastName: 'Phone User',
      email: 'testphone@lingroot.com',
      phoneNumber: '+905559876543',
      password: 'test123456'
    });
    
    if (registerResponse.data.success) {
      console.log('✅ Phone registration successful!');
      console.log('User:', registerResponse.data.data?.user?.firstname || 'N/A', registerResponse.data.data?.user?.lastname || 'N/A');
      console.log('Email:', registerResponse.data.data?.user?.email || 'N/A');
      console.log('Phone:', registerResponse.data.data?.user?.phonenumber || 'N/A');
      
      // Test telefon numarası ile giriş
      console.log('\n2️⃣ Testing login with registered phone...');
      const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
        phoneNumber: '+905559876543',
        password: 'test123456'
      });
      
      if (loginResponse.data.success) {
        console.log('✅ Phone login after registration successful!');
        console.log('User:', loginResponse.data.data?.user?.firstname || 'N/A', loginResponse.data.data?.user?.lastname || 'N/A');
      } else {
        console.log('❌ Phone login after registration failed:', loginResponse.data.message);
      }
      
    } else {
      console.log('❌ Phone registration failed:', registerResponse.data.message);
    }
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // Test duplicate phone registration
    console.log('3️⃣ Testing duplicate phone registration...');
    try {
      const duplicateResponse = await axios.post(`${BASE_URL}/auth/register`, {
        firstName: 'Another',
        lastName: 'User',
        email: 'another@lingroot.com',
        phoneNumber: '+905559876543', // Same phone number
        password: 'test123456'
      });
      
      if (!duplicateResponse.data.success) {
        console.log('✅ Duplicate phone registration properly blocked:', duplicateResponse.data.message);
      } else {
        console.log('❌ Duplicate phone registration should be blocked but was allowed');
      }
    } catch (duplicateError) {
      if (duplicateError.response?.data?.message) {
        console.log('✅ Duplicate phone registration properly blocked:', duplicateError.response.data.message);
      } else {
        console.log('❌ Unexpected error during duplicate test:', duplicateError.message);
      }
    }
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // Test duplicate email registration
    console.log('4️⃣ Testing duplicate email registration...');
    try {
      const duplicateEmailResponse = await axios.post(`${BASE_URL}/auth/register`, {
        firstName: 'Another',
        lastName: 'User',
        email: 'testphone@lingroot.com', // Same email
        phoneNumber: '+905551112233',
        password: 'test123456'
      });
      
      if (!duplicateEmailResponse.data.success) {
        console.log('✅ Duplicate email registration properly blocked:', duplicateEmailResponse.data.message);
      } else {
        console.log('❌ Duplicate email registration should be blocked but was allowed');
      }
    } catch (duplicateEmailError) {
      if (duplicateEmailError.response?.data?.message) {
        console.log('✅ Duplicate email registration properly blocked:', duplicateEmailError.response.data.message);
      } else {
        console.log('❌ Unexpected error during email duplicate test:', duplicateEmailError.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 Make sure the backend server is running on port 5001');
    }
    if (error.response?.data) {
      console.log('Error details:', error.response.data);
    }
  }
  
  console.log('\n🏁 Phone registration tests completed!');
}

testPhoneRegistration(); 