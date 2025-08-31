const db = require('../config/db');
const logger = require('../utils/logger');
const path = require('path');
const fs = require('fs');
const { sendSupportMessageNotification } = require('../utils/supportNotifier');
const { uploadChatAttachment } = require('../utils/chatStorageUploader');

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

// Reopen a closed conversation (user can do this)
const reopenConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    // Only the conversation owner (user) or admin can access; requirement: user triggers reopen via UI
    const accessQuery = `
      SELECT c.id, c.status, c.subject, c.priority, c.admin_id, u.id as uid, u.firstname, u.lastname, u.email, u.phonenumber
      FROM conversations c
      JOIN users u ON c.user_id = u.id
      WHERE c.id = $1 AND (c.user_id = $2 OR $3 = true)
    `;
    const accessResult = await db.query(accessQuery, [conversationId, userId, isAdmin]);
    if (accessResult.rows.length === 0) {
      return res.status(403).json({ success: false, message: 'Bu konuşmaya erişim yetkiniz yok' });
    }

    const conv = accessResult.rows[0];
    if (conv.status !== 'closed') {
      return res.status(400).json({ success: false, message: 'Sadece kapatılmış konuşmalar yeniden açılabilir' });
    }

    // Update status to open; do not change priority; keep admin assignment
    const updateQuery = `
      UPDATE conversations
      SET status = 'open', updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;
    const updateResult = await db.query(updateQuery, [conversationId]);

    // Notify assigned admin (or all admins if none) that the ticket was reopened
    try {
      await sendSupportMessageNotification({
        conversationId,
        subject: conv.subject,
        content: 'Kullanıcı talebi yeniden açtı.',
        priority: conv.priority,
        user: {
          id: conv.uid,
          firstname: conv.firstname,
          lastname: conv.lastname,
          email: conv.email,
          phonenumber: conv.phonenumber
        },
        createdAt: new Date().toISOString(),
        assignedAdminId: conv.admin_id || null,
        overrideSubject: 'Yeniden açılan talep',
        overrideHeaderTitle: 'Yeniden Açılan Talep'
      });
    } catch (notifyErr) {
      logger.error('Failed to send reopen notification:', notifyErr);
    }

    return res.json({ success: true, conversation: updateResult.rows[0] });
  } catch (error) {
    logger.error('Error reopening conversation:', error);
    return res.status(500).json({ success: false, message: 'Konuşma yeniden açılamadı' });
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

    const messages = messagesResult.rows;

    // Fetch attachments for these messages
    if (messages.length > 0) {
      const messageIds = messages.map(m => m.id);
      const paramsPlaceholders = messageIds.map((_, idx) => `$${idx + 1}`).join(',');
      const attachmentsQuery = `
        SELECT id, message_id, filename, file_path, file_size, mime_type, created_at
        FROM message_attachments
        WHERE message_id IN (${paramsPlaceholders})
      `;
      const attachmentsResult = await db.query(attachmentsQuery, messageIds);
      const byMessage = attachmentsResult.rows.reduce((acc, att) => {
        if (!acc[att.message_id]) acc[att.message_id] = [];
        acc[att.message_id].push(att);
        return acc;
      }, {});
      messages.forEach(m => {
        m.attachments = byMessage[m.id] || [];
      });
    }
    
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
      messages
    });
  } catch (error) {
    logger.error('Error fetching conversation messages:', error);
    res.status(500).json({
      success: false,
      message: 'Mesajlar getirilemedi'
    });
  }
};

// Send a message (supports optional file attachments via multer on route)
const sendMessage = async (req, res) => {
  const { conversationId } = req.params;
  const { content } = req.body;
  const userId = req.user.id;
  const isAdmin = req.user.role === 'admin';

  const uploadedFiles = Array.isArray(req.files) ? req.files : [];
  if (!content && uploadedFiles.length === 0) {
    return res.status(400).json({ success: false, message: 'Mesaj içeriği veya dosya ekleri gereklidir' });
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
    const messageResult = await client.query(messageQuery, [conversationId, userId, senderType, content || '']);

    // Save attachments to Supabase Storage and metadata to DB
    if (uploadedFiles.length > 0) {
      const insertValues = [];
      const placeholders = [];
      
      for (let idx = 0; idx < uploadedFiles.length; idx++) {
        const file = uploadedFiles[idx];
        
        // Upload to Supabase Storage
        const uploadResult = await uploadChatAttachment(
          file.buffer,
          conversationId,
          file.originalname,
          file.mimetype
        );
        
        if (!uploadResult.success) {
          throw new Error(`File upload failed: ${uploadResult.error}`);
        }
        
        // Store metadata with Supabase public URL
        insertValues.push(
          messageResult.rows[0].id,
          file.originalname,
          uploadResult.publicUrl, // Store public URL instead of local path
          file.size,
          file.mimetype
        );
        const base = idx * 5;
        placeholders.push(`($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5})`);
      }
      
      const attachInsertQuery = `
        INSERT INTO message_attachments (message_id, filename, file_path, file_size, mime_type)
        VALUES ${placeholders.join(', ')}
        RETURNING *
      `;
      await client.query(attachInsertQuery, insertValues);
    }

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
            assignedAdminId: data.admin_id // Will be null if no admin assigned
          });
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

    // Attach attachments to the response
    const attachmentsForMessage = await db.query(
      'SELECT id, filename, file_path, file_size, mime_type, created_at FROM message_attachments WHERE message_id = $1',
      [messageResult.rows[0].id]
    );
    const message = messageWithSenderResult.rows[0];
    message.attachments = attachmentsForMessage.rows || [];
    return res.json({ success: true, message });
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

// Secure attachment access - redirect to Supabase public URL after auth check
const getAttachment = async (req, res) => {
  try {
    const { attachmentId } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    const query = `
      SELECT a.id, a.file_path, a.filename, a.mime_type, a.file_size,
             m.conversation_id, c.user_id
      FROM message_attachments a
      JOIN messages m ON a.message_id = m.id
      JOIN conversations c ON m.conversation_id = c.id
      WHERE a.id = $1
    `;
    const result = await db.query(query, [attachmentId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Dosya bulunamadı' });
    }
    const att = result.rows[0];
    if (!(isAdmin || att.user_id === userId)) {
      return res.status(403).json({ success: false, message: 'Bu dosyaya erişim yetkiniz yok' });
    }

    // Redirect to Supabase public URL (file_path now contains the public URL)
    return res.redirect(att.file_path);
  } catch (error) {
    logger.error('Error serving attachment:', error);
    return res.status(500).json({ success: false, message: 'Dosya getirilemedi' });
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
    // Only allow specific statuses for admin updates
    const allowedStatuses = ['open', 'in_progress', 'closed'];
    if (status && !allowedStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Geçersiz durum' });
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
  reopenConversation,
  getConversationStats,
  getAttachment
};
