const { sendSupportMessageNotification } = require('./utils/supportNotifier');
const db = require('./config/db');

async function testSupportNotification() {
  try {
    console.log('🔍 Testing support notification system...');
    
    // Test admin user query
    console.log('📧 Checking admin users...');
    const adminQuery = `
      SELECT email, firstname, lastname, role 
      FROM users 
      WHERE role = 'admin' AND email IS NOT NULL
    `;
    const adminResult = await db.query(adminQuery);
    console.log('Admin users found:', adminResult.rows);
    
    if (adminResult.rows.length === 0) {
      console.log('❌ No admin users found!');
      return;
    }
    
    // Test notification with sample data
    console.log('📨 Sending test notification...');
    const testMessageData = {
      conversationId: 'test-123',
      subject: 'Test Support Message',
      content: 'This is a test message to verify email notifications work.',
      priority: 'medium',
      user: {
        id: 'test-user-id',
        firstname: 'Test',
        lastname: 'User',
        email: 'test@example.com',
        phonenumber: '+90 555 123 45 67'
      },
      createdAt: new Date().toISOString()
    };
    
    await sendSupportMessageNotification(testMessageData);
    console.log('✅ Test notification sent successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    process.exit(0);
  }
}

testSupportNotification();
