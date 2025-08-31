const db = require('./config/db');

async function checkSpecificMessage() {
  try {
    console.log('🔍 Checking specific message and conversation...');
    
    const messageId = '8d612a7b-79cb-40c7-994e-24d6d962cd70';
    
    // Get message details
    const messageQuery = `
      SELECT m.*, c.*, u.firstname, u.lastname, u.email, u.phonenumber, u.role
      FROM messages m
      JOIN conversations c ON m.conversation_id = c.id
      JOIN users u ON c.user_id = u.id
      WHERE m.id = $1
    `;
    
    const result = await db.query(messageQuery, [messageId]);
    
    if (result.rows.length === 0) {
      console.log('❌ Message not found with ID:', messageId);
      return;
    }
    
    const data = result.rows[0];
    console.log('📧 Message details:');
    console.log('- Message ID:', data.id);
    console.log('- Conversation ID:', data.conversation_id);
    console.log('- Sender Type:', data.sender_type);
    console.log('- Content:', data.content);
    console.log('- Created At:', data.created_at);
    console.log('- User:', data.firstname, data.lastname, '(' + data.email + ')');
    console.log('- User Role:', data.role);
    console.log('- Subject:', data.subject);
    console.log('- Priority:', data.priority);
    
    // Check if this was the first message in conversation (should trigger notification)
    const firstMessageQuery = `
      SELECT id, created_at 
      FROM messages 
      WHERE conversation_id = $1 
      ORDER BY created_at ASC 
      LIMIT 1
    `;
    
    const firstMessageResult = await db.query(firstMessageQuery, [data.conversation_id]);
    const isFirstMessage = firstMessageResult.rows[0]?.id === messageId;
    
    console.log('🔔 Is first message in conversation:', isFirstMessage);
    
    if (!isFirstMessage) {
      console.log('ℹ️  This was not the first message, so no notification should be sent.');
      console.log('   Notifications are only sent when creating new conversations.');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

checkSpecificMessage();
