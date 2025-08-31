const db = require('./config/db');

async function debugConversation() {
  try {
    console.log('🔍 Debugging conversation details...');
    
    const conversationId = 'f7db9dd5-f665-477f-b9fc-9789a1705d2f';
    
    // Get all messages in this conversation
    const messagesQuery = `
      SELECT m.id, m.content, m.sender_type, m.created_at, m.conversation_id,
             u.firstname, u.lastname, u.email
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.conversation_id = $1
      ORDER BY m.created_at ASC
    `;
    
    const messagesResult = await db.query(messagesQuery, [conversationId]);
    
    console.log('📧 All messages in conversation:');
    messagesResult.rows.forEach((msg, index) => {
      console.log(`${index + 1}. ${msg.id} - ${msg.sender_type} - ${msg.created_at}`);
      console.log(`   From: ${msg.firstname} ${msg.lastname} (${msg.email})`);
      console.log(`   Content: ${msg.content}`);
      console.log('');
    });
    
    // Get conversation details
    const conversationQuery = `
      SELECT c.*, u.firstname, u.lastname, u.email
      FROM conversations c
      JOIN users u ON c.user_id = u.id
      WHERE c.id = $1
    `;
    
    const conversationResult = await db.query(conversationQuery, [conversationId]);
    
    if (conversationResult.rows.length > 0) {
      const conv = conversationResult.rows[0];
      console.log('📋 Conversation details:');
      console.log('- ID:', conv.id);
      console.log('- Subject:', conv.subject);
      console.log('- Priority:', conv.priority);
      console.log('- Status:', conv.status);
      console.log('- Admin ID:', conv.admin_id);
      console.log('- Created At:', conv.created_at);
      console.log('- User:', conv.firstname, conv.lastname, '(' + conv.email + ')');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

debugConversation();
