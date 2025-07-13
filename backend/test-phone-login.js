const axios = require('axios');

const BASE_URL = 'http://localhost:5001';

async function testPhoneLogin() {
  console.log('🧪 Testing phone login functionality...\n');
  
  try {
    // Test 1: Phone + Password Login
    console.log('1️⃣ Testing phone + password login...');
    const phoneLoginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      phoneNumber: '+905551234567',
      password: 'test123'
    });
    
    if (phoneLoginResponse.data.success) {
      console.log('✅ Phone + password login successful!');
      console.log('User:', phoneLoginResponse.data.data.user.firstname, phoneLoginResponse.data.data.user.lastname);
    } else {
      console.log('❌ Phone + password login failed:', phoneLoginResponse.data.message);
    }
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // Test 2: SMS Login (Request SMS)
    console.log('2️⃣ Testing SMS login (request SMS)...');
    const smsLoginResponse = await axios.post(`${BASE_URL}/auth/sms-login`, {
      phoneNumber: '+905551234567'
    });
    
    if (smsLoginResponse.data.success) {
      console.log('✅ SMS request successful!');
      console.log('Message:', smsLoginResponse.data.message);
      console.log('User ID:', smsLoginResponse.data.data.userId);
      
      // Test 3: SMS Verification (Mock)
      console.log('\n3️⃣ Testing SMS verification with mock code...');
      
      // Since this is development, we can get the verification code from logs
      // For testing, let's try a mock verification
      const mockCode = '123456'; // This would be read from SMS in real scenario
      
      try {
        const verifyResponse = await axios.post(`${BASE_URL}/auth/verify-sms`, {
          userId: smsLoginResponse.data.data.userId,
          verificationCode: mockCode,
          rememberMe: true
        });
        
        if (verifyResponse.data.success) {
          console.log('✅ SMS verification successful!');
          console.log('User:', verifyResponse.data.data.user.firstname, verifyResponse.data.data.user.lastname);
        } else {
          console.log('❌ SMS verification failed:', verifyResponse.data.message);
          console.log('ℹ️ In real implementation, check the SMS for the actual code');
        }
      } catch (verifyError) {
        console.log('❌ SMS verification failed:', verifyError.response?.data?.message || verifyError.message);
        console.log('ℹ️ In real implementation, check the SMS for the actual code');
      }
      
    } else {
      console.log('❌ SMS request failed:', smsLoginResponse.data.message);
    }
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // Test 4: Email Login (for comparison)
    console.log('4️⃣ Testing email login (for comparison)...');
    const emailLoginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'test@lingroot.com',
      password: 'test123'
    });
    
    if (emailLoginResponse.data.success) {
      console.log('✅ Email login successful!');
      console.log('User:', emailLoginResponse.data.data.user.firstname, emailLoginResponse.data.data.user.lastname);
    } else {
      console.log('❌ Email login failed:', emailLoginResponse.data.message);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 Make sure the backend server is running on port 5001');
    }
  }
  
  console.log('\n🏁 Phone login tests completed!');
}

testPhoneLogin(); 