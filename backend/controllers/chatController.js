const db = require('../config/db');
const logger = require('../utils/logger');
const { sendSupportMessageNotification } = require('../utils/supportNotifier');

// Get all conversations for a user
const getUserConversations = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const query = `
      SELECT 
        c.*,
        (COALESCE(u.firstname, '') || ' ' || COALESCE(u.lastname, '')) AS admin_name,
        (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id AND m.sender_type = 'admin' AND m.is_read = false) as unread_count,
        (SELECT content FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) as last_message_content,
        (SELECT sender_type FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) as last_message_sender_type
      FROM conversations c
      LEFT JOIN users u ON c.admin_id = u.id
      WHERE c.user_id = $1
      ORDER BY c.last_message_at DESC
    `;
    
    const result = await db.query(query, [userId]);
    
    res.json({
      success: true,
      conversations: result.rows
    });
  } catch (error) {
    logger.error('Error fetching user conversations:', error);
    res.status(500).json({
      success: false,
      message: 'Konuşmalar getirilemedi'
    });
  }
};

// Get all conversations for admin
const getAdminConversations = async (req, res) => {
  try {
    const { status, priority } = req.query;
    
    let whereClause = '1=1';
    const params = [];
    
    if (status && status !== 'all') {
      whereClause += ` AND c.status = $${params.length + 1}`;
      params.push(status);
    }
    
    if (priority && priority !== 'all') {
      whereClause += ` AND c.priority = $${params.length + 1}`;
      params.push(priority);
    }
    
    const query = `
      SELECT 
        c.*,
        (COALESCE(u.firstname, '') || ' ' || COALESCE(u.lastname, '')) AS user_name,
        u.email as user_email,
        (COALESCE(admin.firstname, '') || ' ' || COALESCE(admin.lastname, '')) AS admin_name,
        (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id AND m.sender_type = 'user' AND m.is_read = false) as unread_count,
        (SELECT content FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) as last_message_content,
        (SELECT sender_type FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) as last_message_sender_type
      FROM conversations c
      JOIN users u ON c.user_id = u.id
      LEFT JOIN users admin ON c.admin_id = admin.id
      WHERE ${whereClause}
      ORDER BY c.priority DESC, c.last_message_at DESC
    `;
    
    const result = await db.query(query, params);
    
    res.json({
      success: true,
      conversations: result.rows
    });
  } catch (error) {
    logger.error('Error fetching admin conversations:', error);
    res.status(500).json({
      success: false,
      message: 'Konuşmalar getirilemedi'
    });
  }
};

// Create a new conversation
const createConversation = async (req, res) => {
  const userId = req.user.id;
  const { subject, content, priority = 'medium' } = req.body;
  if (!subject || !content) {
    return res.status(400).json({ success: false, message: 'Konu ve mesaj içeriği gereklidir' });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const conversationQuery = `
      INSERT INTO conversations (user_id, subject, priority)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    const conversationResult = await client.query(conversationQuery, [userId, subject, priority]);
    const conversation = conversationResult.rows[0];

    const messageQuery = `
      INSERT INTO messages (conversation_id, sender_id, sender_type, content)
      VALUES ($1, $2, 'user', $3)
      RETURNING *
    `;
    const messageResult = await client.query(messageQuery, [conversation.id, userId, content]);

    await client.query('COMMIT');

    // Send notification to admin users about the new support message
    try {
      // Get user details for notification
      const userQuery = `
        SELECT id, firstname, lastname, email, phonenumber 
        FROM users 
        WHERE id = $1
      `;
      const userResult = await db.query(userQuery, [userId]);
      const user = userResult.rows[0];

      if (user) {
        await sendSupportMessageNotification({
          conversationId: conversation.id,
          subject: subject,
          content: content,
          priority: priority,
          user: user,
          createdAt: conversation.created_at
        });
      }
    } catch (notificationError) {
      // Don't fail the conversation creation if notification fails
      logger.error('Failed to send support message notification:', notificationError);
    }

    return res.json({ success: true, conversation, message: messageResult.rows[0] });
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch (rbErr) {
      logger.error('Transaction rollback failed in createConversation:', rbErr);
    }
    logger.error('Error creating conversation:', error?.stack || error);
    return res.status(500).json({ success: false, message: 'Konuşma oluşturulamadı' });
  } finally {
    client.release();
  }
};

// Get messages for a conversation
const getConversationMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';
    
    // Check if user has access to this conversation
    const accessQuery = `
      SELECT id FROM conversations 
      WHERE id = $1 AND (user_id = $2 OR $3 = true)
    `;
    
    const accessResult = await db.query(accessQuery, [conversationId, userId, isAdmin]);
    
    if (accessResult.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Bu konuşmaya erişim yetkiniz yok'
      });
    }
    
    // Get messages
    const messagesQuery = `
      SELECT 
        m.*,
        (COALESCE(u.firstname, '') || ' ' || COALESCE(u.lastname, '')) AS sender_name,
        u.email as sender_email
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.conversation_id = $1
      ORDER BY m.created_at ASC
    `;
    
    const messagesResult = await db.query(messagesQuery, [conversationId]);
    
    // Mark messages as read for the current user
    const markReadQuery = `
      UPDATE messages 
      SET is_read = true 
      WHERE conversation_id = $1 
        AND sender_type = $2 
        AND is_read = false
    `;
    
    const senderTypeToMarkRead = isAdmin ? 'user' : 'admin';
    await db.query(markReadQuery, [conversationId, senderTypeToMarkRead]);
    
    res.json({
      success: true,
      messages: messagesResult.rows
    });
  } catch (error) {
    logger.error('Error fetching conversation messages:', error);
    res.status(500).json({
      success: false,
      message: 'Mesajlar getirilemedi'
    });
  }
};

// Send a message
const sendMessage = async (req, res) => {
  const { conversationId } = req.params;
  const { content } = req.body;
  const userId = req.user.id;
  const isAdmin = req.user.role === 'admin';

  if (!content) {
    return res.status(400).json({ success: false, message: 'Mesaj içeriği gereklidir' });
  }

  // Check access outside transaction
  const accessQuery = `
    SELECT id, status FROM conversations 
    WHERE id = $1 AND (user_id = $2 OR $3 = true)
  `;
  const accessResult = await db.query(accessQuery, [conversationId, userId, isAdmin]);
  if (accessResult.rows.length === 0) {
    return res.status(403).json({ success: false, message: 'Bu konuşmaya erişim yetkiniz yok' });
  }
  const conversation = accessResult.rows[0];
  if (conversation.status === 'closed' && !isAdmin) {
    return res.status(400).json({ success: false, message: 'Kapatılmış konuşmalara mesaj gönderemezsiniz' });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const messageQuery = `
      INSERT INTO messages (conversation_id, sender_id, sender_type, content)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const senderType = isAdmin ? 'admin' : 'user';
    const messageResult = await client.query(messageQuery, [conversationId, userId, senderType, content]);

    if (isAdmin) {
      await client.query('UPDATE conversations SET admin_id = $1, status = $2 WHERE id = $3', [userId, 'in_progress', conversationId]);
    }
    if (!isAdmin && conversation.status === 'resolved') {
      await client.query('UPDATE conversations SET status = $1 WHERE id = $2', ['open', conversationId]);
    }

    await client.query('COMMIT');

    // Send notification to assigned admin for follow-up messages from users
    if (!isAdmin) {
      try {
        // Get conversation and user details for notification
        const conversationQuery = `
          SELECT c.subject, c.priority, c.admin_id, u.id, u.firstname, u.lastname, u.email, u.phonenumber
          FROM conversations c
          JOIN users u ON c.user_id = u.id
          WHERE c.id = $1
        `;
        const conversationResult = await db.query(conversationQuery, [conversationId]);
        
        if (conversationResult.rows.length > 0) {
          const data = conversationResult.rows[0];
          
          // Only send notification if there's an assigned admin
          if (data.admin_id) {
            await sendSupportMessageNotification({
              conversationId: conversationId,
              subject: `Takip Mesajı: ${data.subject}`,
              content: content,
              priority: data.priority,
              user: {
                id: data.id,
                firstname: data.firstname,
                lastname: data.lastname,
                email: data.email,
                phonenumber: data.phonenumber
              },
              createdAt: new Date().toISOString(),
              assignedAdminId: data.admin_id
            });
          }
        }
      } catch (notificationError) {
        // Don't fail the message creation if notification fails
        logger.error('Failed to send follow-up message notification:', notificationError);
      }
    }

    const messageWithSenderQuery = `
      SELECT 
        m.*,
        (COALESCE(u.firstname, '') || ' ' || COALESCE(u.lastname, '')) AS sender_name,
        u.email as sender_email
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.id = $1
    `;
    const messageWithSenderResult = await db.query(messageWithSenderQuery, [messageResult.rows[0].id]);
    return res.json({ success: true, message: messageWithSenderResult.rows[0] });
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch (rbErr) {
      logger.error('Transaction rollback failed in sendMessage:', rbErr);
    }
    logger.error('Error sending message:', error?.stack || error);
    return res.status(500).json({ success: false, message: 'Mesaj gönderilemedi' });
  } finally {
    client.release();
  }
};

// Update conversation status (admin only)
const updateConversationStatus = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { status, priority } = req.body;
    
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Bu işlem için yetkiniz yok'
      });
    }
    
    const updateQuery = `
      UPDATE conversations 
      SET status = COALESCE($1, status), 
          priority = COALESCE($2, priority),
          admin_id = $3,
          updated_at = NOW()
      WHERE id = $4
      RETURNING *
    `;
    
    const result = await db.query(updateQuery, [status, priority, req.user.id, conversationId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Konuşma bulunamadı'
      });
    }
    
    res.json({
      success: true,
      conversation: result.rows[0]
    });
  } catch (error) {
    logger.error('Error updating conversation status:', error);
    res.status(500).json({
      success: false,
      message: 'Konuşma durumu güncellenemedi'
    });
  }
};

// Get conversation statistics (admin only)
const getConversationStats = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Bu işlem için yetkiniz yok'
      });
    }
    
    const statsQuery = `
      SELECT 
        COUNT(*) as total_conversations,
        COUNT(CASE WHEN status = 'open' THEN 1 END) as open_conversations,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_conversations,
        COUNT(CASE WHEN status = 'waiting' THEN 1 END) as waiting_conversations,
        COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved_conversations,
        COUNT(CASE WHEN status = 'closed' THEN 1 END) as closed_conversations,
        COUNT(CASE WHEN priority = 'urgent' THEN 1 END) as urgent_conversations,
        COUNT(CASE WHEN priority = 'high' THEN 1 END) as high_priority_conversations
      FROM conversations
      WHERE created_at >= NOW() - INTERVAL '30 days'
    `;
    
    const result = await db.query(statsQuery);
    
    res.json({
      success: true,
      stats: result.rows[0]
    });
  } catch (error) {
    logger.error('Error fetching conversation stats:', error);
    res.status(500).json({
      success: false,
      message: 'İstatistikler getirilemedi'
    });
  }
};

module.exports = {
  getUserConversations,
  getAdminConversations,
  createConversation,
  getConversationMessages,
  sendMessage,
  updateConversationStatus,
  getConversationStats
};
