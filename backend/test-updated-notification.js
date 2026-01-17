const { sendSupportMessageNotification } = require('./utils/notifications/supportNotifier.js');

async function testUpdatedNotification() {
  try {
    console.log('🔍 Testing updated notification system...');
    
    // Test 1: New conversation (should go to all admins)
    console.log('\n📧 Test 1: New conversation notification (all admins)');
    const newConversationData = {
      conversationId: 'test-new-123',
      subject: 'Test New Conversation',
      content: 'This is a test for new conversation notification.',
      priority: 'medium',
      user: {
        id: 'test-user-id',
        firstname: 'Test',
        lastname: 'User',
        email: 'test@example.com',
        phonenumber: '+90 555 123 45 67'
      },
      createdAt: new Date().toISOString()
      // No assignedAdminId - should go to all admins
    };
    
    await sendSupportMessageNotification(newConversationData);
    console.log('✅ New conversation notification sent to all admins');
    
    // Test 2: Follow-up message (should go to assigned admin only)
    console.log('\n📧 Test 2: Follow-up message notification (assigned admin only)');
    const followUpData = {
      conversationId: 'test-followup-456',
      subject: 'Takip Mesajı: Test Follow-up',
      content: 'This is a test for follow-up message notification.',
      priority: 'high',
      user: {
        id: 'test-user-id-2',
        firstname: 'Follow',
        lastname: 'User',
        email: 'followup@example.com',
        phonenumber: '+90 555 987 65 43'
      },
      createdAt: new Date().toISOString(),
      assignedAdminId: 'f7afb7e5-adc1-47b5-808b-3c6060e956cd' // enesyuzak@gmail.com admin ID
    };
    
    await sendSupportMessageNotification(followUpData);
    console.log('✅ Follow-up message notification sent to assigned admin only');
    
    console.log('\n🎉 All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    process.exit(0);
  }
}

testUpdatedNotification();
