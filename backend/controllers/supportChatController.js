const db = require('../config/db');
const logger = require('../utils/logger');
const { sendSupportMessageNotification } = require('../utils/supportNotifier');
const { uploadChatAttachment } = require('../utils/chatStorageUploader');
const { sendPushNotification } = require('../utils/pushNotification');
const { getIO } = require('../utils/socketManager');

// Completely separate support chat controller
// Uses support_conversations / support_messages / support_message_attachments tables

// Get all support conversations for a user
const getUserSupportConversations = async (req, res) => {
  try {
    const userId = req.user.id;

    const query = `
      SELECT 
        c.*,
        (COALESCE(u.firstname, '') || ' ' || COALESCE(u.lastname, '')) AS admin_name,
        (SELECT COUNT(*) FROM support_messages m WHERE m.conversation_id = c.id AND m.sender_type = 'admin' AND m.is_read = false) as unread_count,
        lm.content as last_message_content,
        lm.sender_type as last_message_sender_type
      FROM support_conversations c
      LEFT JOIN users u ON c.admin_id = u.id
      LEFT JOIN LATERAL (
        SELECT m.content, m.sender_type, m.created_at, m.id
        FROM support_messages m
        WHERE m.conversation_id = c.id
        ORDER BY m.created_at DESC, m.id DESC
        LIMIT 1
      ) lm ON true
      WHERE c.user_id = $1
      ORDER BY c.last_message_at DESC
    `;

    const result = await db.query(query, [userId]);

    res.json({
      success: true,
      conversations: result.rows,
    });
  } catch (error) {
    logger.error('Error fetching user support conversations:', error);
    res.status(500).json({
      success: false,
      message: 'Destek konuşmaları getirilemedi',
    });
  }
};

// Create a new support conversation (user side)
const createSupportConversation = async (req, res) => {
  const userId = req.user.id;
  const { subject, content, priority = 'medium' } = req.body;

  if (!subject || !content) {
    return res.status(400).json({ success: false, message: 'Konu ve mesaj içeriği gereklidir' });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const conversationQuery = `
      INSERT INTO support_conversations (user_id, subject, priority)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    const conversationResult = await client.query(conversationQuery, [userId, subject, priority]);
    const conversation = conversationResult.rows[0];

    const messageQuery = `
      INSERT INTO support_messages (conversation_id, sender_id, sender_type, content)
      VALUES ($1, $2, 'user', $3)
      RETURNING *
    `;
    const messageResult = await client.query(messageQuery, [conversation.id, userId, content]);

    await client.query('COMMIT');

    // Send notification to admin users about the new support message
    try {
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
          createdAt: conversation.created_at,
        });
      }
    } catch (notificationError) {
      logger.error('Failed to send support (new) notification:', notificationError);
    }

    // Real-time update for admin panel via Socket.IO
    try {
      const io = getIO();
      logger.info('Emitting Socket.IO event: support:new_conversation', {
        conversationId: conversation.id,
      });
      io.to('admin_support').emit('support:new_conversation', {
        conversationId: conversation.id,
      });
    } catch (socketError) {
      logger.error('Error emitting support:new_conversation event:', socketError);
    }

    return res.json({ success: true, conversation, message: messageResult.rows[0] });
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch (rbErr) {
      logger.error('Transaction rollback failed in createSupportConversation:', rbErr);
    }
    logger.error('Error creating support conversation:', error?.stack || error);
    return res.status(500).json({ success: false, message: 'Destek konuşması oluşturulamadı' });
  } finally {
    client.release();
  }
};

// Get messages for a support conversation
const getSupportConversationMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    const accessQuery = `
      SELECT id FROM support_conversations 
      WHERE id = $1 AND (user_id = $2 OR $3 = true)
    `;
    const accessResult = await db.query(accessQuery, [conversationId, userId, isAdmin]);

    if (accessResult.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Bu destek konuşmasına erişim yetkiniz yok',
      });
    }

    const messagesQuery = `
      SELECT 
        m.*,
        (COALESCE(u.firstname, '') || ' ' || COALESCE(u.lastname, '')) AS sender_name,
        u.email as sender_email
      FROM support_messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.conversation_id = $1
      ORDER BY m.created_at ASC
    `;

    const messagesResult = await db.query(messagesQuery, [conversationId]);
    const messages = messagesResult.rows;

    // Fetch attachments for these messages
    if (messages.length > 0) {
      const messageIds = messages.map((m) => m.id);
      const paramsPlaceholders = messageIds.map((_, idx) => `$${idx + 1}`).join(',');
      const attachmentsQuery = `
        SELECT id, message_id, filename, file_path, file_size, mime_type, created_at
        FROM support_message_attachments
        WHERE message_id IN (${paramsPlaceholders})
      `;
      const attachmentsResult = await db.query(attachmentsQuery, messageIds);
      const byMessage = attachmentsResult.rows.reduce((acc, att) => {
        if (!acc[att.message_id]) acc[att.message_id] = [];
        acc[att.message_id].push(att);
        return acc;
      }, {});
      messages.forEach((m) => {
        m.attachments = byMessage[m.id] || [];
      });
    }

    // Mark messages as read for the current user
    const markReadQuery = `
      UPDATE support_messages 
      SET is_read = true 
      WHERE conversation_id = $1 
        AND sender_type = $2 
        AND is_read = false
    `;

    const senderTypeToMarkRead = isAdmin ? 'user' : 'admin';
    await db.query(markReadQuery, [conversationId, senderTypeToMarkRead]);

    res.json({
      success: true,
      messages,
    });
  } catch (error) {
    logger.error('Error fetching support conversation messages:', error);
    res.status(500).json({
      success: false,
      message: 'Destek mesajları getirilemedi',
    });
  }
};

// Send a support message (with optional attachments)
const sendSupportMessage = async (req, res) => {
  const { conversationId } = req.params;
  const { content } = req.body;
  const userId = req.user.id;
  const isAdminRole = req.user.role === 'admin';
  // Admin panelinden gelen istekleri ayırt etmek için özel bir header kullanıyoruz.
  // Böylece admin rolüne sahip bir kullanıcı mobil uygulamadan yazsa bile sender_type 'user' olarak kaydolur.
  const isAdminSender = isAdminRole &&
    (req.headers['x-admin-support-sender'] === 'admin' || req.headers['X-Admin-Support-Sender'] === 'admin');

  const uploadedFiles = Array.isArray(req.files) ? req.files : [];
  if (!content && uploadedFiles.length === 0) {
    return res.status(400).json({ success: false, message: 'Mesaj içeriği veya dosya ekleri gereklidir' });
  }

  const accessQuery = `
    SELECT id, status FROM support_conversations 
    WHERE id = $1 AND (user_id = $2 OR $3 = true)
  `;
  const accessResult = await db.query(accessQuery, [conversationId, userId, isAdminRole]);
  if (accessResult.rows.length === 0) {
    return res.status(403).json({ success: false, message: 'Bu destek konuşmasına erişim yetkiniz yok' });
  }
  const conversation = accessResult.rows[0];
  // Sadece admin rolüne sahip kullanıcılar kapatılmış konuşmaya yazabilsin
  if (conversation.status === 'closed' && !isAdminRole) {
    return res.status(400).json({ success: false, message: 'Kapatılmış destek konuşmalarına mesaj gönderemezsiniz' });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const messageQuery = `
      INSERT INTO support_messages (conversation_id, sender_id, sender_type, content)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const senderType = isAdminSender ? 'admin' : 'user';
    const messageResult = await client.query(messageQuery, [conversationId, userId, senderType, content || '']);

    // Save attachments to Supabase Storage and metadata to DB
    if (uploadedFiles.length > 0) {
      const insertValues = [];
      const placeholders = [];

      for (let idx = 0; idx < uploadedFiles.length; idx++) {
        const file = uploadedFiles[idx];

        const uploadResult = await uploadChatAttachment(
          file.buffer,
          conversationId,
          file.originalname,
          file.mimetype
        );

        if (!uploadResult.success) {
          throw new Error(`File upload failed: ${uploadResult.error}`);
        }

        insertValues.push(
          messageResult.rows[0].id,
          file.originalname,
          uploadResult.publicUrl,
          file.size,
          file.mimetype
        );
        const base = idx * 5;
        placeholders.push(`($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5})`);
      }

      const attachInsertQuery = `
        INSERT INTO support_message_attachments (message_id, filename, file_path, file_size, mime_type)
        VALUES ${placeholders.join(', ')}
        RETURNING *
      `;
      await client.query(attachInsertQuery, insertValues);
    }

    if (isAdminSender) {
      await client.query(
        'UPDATE support_conversations SET admin_id = $1, status = $2 WHERE id = $3',
        [userId, 'in_progress', conversationId]
      );
    }
    if (!isAdminSender && conversation.status === 'resolved') {
      await client.query('UPDATE support_conversations SET status = $1 WHERE id = $2', ['open', conversationId]);
    }

    await client.query('COMMIT');

    // Real-time update for admin panel via Socket.IO
    try {
      const io = getIO();
      logger.info('Emitting Socket.IO event: support:new_message', {
        conversationId,
        isAdmin: isAdminSender,
      });
      io.to('admin_support').emit('support:new_message', {
        conversationId,
        isAdmin: isAdminSender,
      });
    } catch (socketError) {
      logger.error('Error emitting support:new_message event:', socketError);
    }

    // Send notification to assigned admin for follow-up messages from users
    if (!isAdminSender) {
      try {
        const conversationQuery = `
          SELECT c.subject, c.priority, c.admin_id, u.id, u.firstname, u.lastname, u.email, u.phonenumber
          FROM support_conversations c
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
              phonenumber: data.phonenumber,
            },
            createdAt: new Date().toISOString(),
            assignedAdminId: data.admin_id,
          });
        }
      } catch (notificationError) {
        logger.error('Failed to send support follow-up notification:', notificationError);
      }
    } else {
      // Admin panelinden gönderilen bir mesaj: push bildirimi kullanıcıya
      try {
        const convoUserQuery = `
          SELECT c.subject, c.user_id, u.firstname, u.lastname
          FROM support_conversations c
          JOIN users u ON c.user_id = u.id
          WHERE c.id = $1
        `;
        const convoUserResult = await db.query(convoUserQuery, [conversationId]);

        if (convoUserResult.rows.length > 0) {
          const convoUser = convoUserResult.rows[0];
          const fullName = `${convoUser.firstname || ''} ${convoUser.lastname || ''}`.trim();

          await sendPushNotification(convoUser.user_id, {
            title: 'Yeni destek yanıtı',
            body: content || 'Destek talebinize yeni bir yanıt var.',
            type: 'support_message',
            data: {
              conversationId,
              subject: convoUser.subject,
              messageId: messageResult.rows[0].id,
              fromAdminId: userId,
              fromAdminName: fullName,
            },
          });
        }
      } catch (pushError) {
        logger.error('Failed to send support push notification to user:', pushError);
      }
    }

    const messageWithSenderQuery = `
      SELECT 
        m.*,
        (COALESCE(u.firstname, '') || ' ' || COALESCE(u.lastname, '')) AS sender_name,
        u.email as sender_email
      FROM support_messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.id = $1
    `;
    const messageWithSenderResult = await db.query(messageWithSenderQuery, [messageResult.rows[0].id]);

    const attachmentsForMessage = await db.query(
      'SELECT id, filename, file_path, file_size, mime_type, created_at FROM support_message_attachments WHERE message_id = $1',
      [messageResult.rows[0].id]
    );
    const message = messageWithSenderResult.rows[0];
    message.attachments = attachmentsForMessage.rows || [];

    return res.json({ success: true, message });
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch (rbErr) {
      logger.error('Transaction rollback failed in sendSupportMessage:', rbErr);
    }
    logger.error('Error sending support message:', error?.stack || error);
    return res.status(500).json({ success: false, message: 'Destek mesajı gönderilemedi' });
  } finally {
    client.release();
  }
};

// Admin: list support conversations with optional filters
const getAdminSupportConversations = async (req, res) => {
  try {
    const { status: rawStatus, priority } = req.query;

    let whereClause = '1=1';
    const params = [];

    // Durum filtresi: virgülle ayrılmış çoklu değer desteklenir (open,in_progress,...)
    if (rawStatus && rawStatus !== 'all') {
      const statusList = String(rawStatus)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      if (statusList.length === 1) {
        whereClause += ` AND c.status = $${params.length + 1}`;
        params.push(statusList[0]);
      } else if (statusList.length > 1) {
        const placeholders = statusList
          .map((_, idx) => `$${params.length + idx + 1}`)
          .join(', ');
        whereClause += ` AND c.status IN (${placeholders})`;
        statusList.forEach((s) => params.push(s));
      }
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
        (SELECT COUNT(*) FROM support_messages m WHERE m.conversation_id = c.id AND m.sender_type = 'user' AND m.is_read = false) as unread_count,
        lm.content as last_message_content,
        lm.sender_type as last_message_sender_type
      FROM support_conversations c
      JOIN users u ON c.user_id = u.id
      LEFT JOIN users admin ON c.admin_id = admin.id
      LEFT JOIN LATERAL (
        SELECT m.content, m.sender_type, m.created_at, m.id
        FROM support_messages m
        WHERE m.conversation_id = c.id
        ORDER BY m.created_at DESC, m.id DESC
        LIMIT 1
      ) lm ON true
      WHERE ${whereClause}
      ORDER BY c.priority DESC, c.last_message_at DESC
    `;

    const result = await db.query(query, params);

    res.json({
      success: true,
      conversations: result.rows,
    });
  } catch (error) {
    logger.error('Error fetching admin support conversations:', error);
    res.status(500).json({
      success: false,
      message: 'Destek konuşmaları getirilemedi',
    });
  }
};

// Admin: update support conversation status/priority
const updateSupportConversationStatus = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { status, priority } = req.body;

    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Bu işlem için yetkiniz yok',
      });
    }

    const allowedStatuses = ['open', 'in_progress', 'closed'];
    if (status && !allowedStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Geçersiz durum' });
    }

    const updateQuery = `
      UPDATE support_conversations 
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
        message: 'Destek konuşması bulunamadı',
      });
    }

    res.json({
      success: true,
      conversation: result.rows[0],
    });
  } catch (error) {
    logger.error('Error updating support conversation status:', error);
    res.status(500).json({
      success: false,
      message: 'Destek konuşma durumu güncellenemedi',
    });
  }
};

// Admin: basic support conversation stats
const getSupportConversationStats = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Bu işlem için yetkiniz yok',
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
      FROM support_conversations
      WHERE created_at >= NOW() - INTERVAL '30 days'
    `;

    const result = await db.query(statsQuery);

    res.json({
      success: true,
      stats: result.rows[0],
    });
  } catch (error) {
    logger.error('Error fetching support conversation stats:', error);
    res.status(500).json({
      success: false,
      message: 'Destek istatistikleri getirilemedi',
    });
  }
};

// Reopen a closed support conversation
const reopenSupportConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    const accessQuery = `
      SELECT c.id, c.status, c.subject, c.priority, c.admin_id, u.id as uid, u.firstname, u.lastname, u.email, u.phonenumber
      FROM support_conversations c
      JOIN users u ON c.user_id = u.id
      WHERE c.id = $1 AND (c.user_id = $2 OR $3 = true)
    `;
    const accessResult = await db.query(accessQuery, [conversationId, userId, isAdmin]);
    if (accessResult.rows.length === 0) {
      return res.status(403).json({ success: false, message: 'Bu destek konuşmasına erişim yetkiniz yok' });
    }

    const conv = accessResult.rows[0];
    if (conv.status !== 'closed') {
      return res.status(400).json({ success: false, message: 'Sadece kapatılmış destek konuşmaları yeniden açılabilir' });
    }

    const updateQuery = `
      UPDATE support_conversations
      SET status = 'open', updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;
    const updateResult = await db.query(updateQuery, [conversationId]);

    try {
      await sendSupportMessageNotification({
        conversationId,
        subject: conv.subject,
        content: 'Kullanıcı desteği yeniden açtı.',
        priority: conv.priority,
        user: {
          id: conv.uid,
          firstname: conv.firstname,
          lastname: conv.lastname,
          email: conv.email,
          phonenumber: conv.phonenumber,
        },
        createdAt: new Date().toISOString(),
        assignedAdminId: conv.admin_id || null,
        overrideSubject: 'Yeniden açılan destek talebi',
        overrideHeaderTitle: 'Yeniden Açılan Destek Talebi',
      });
    } catch (notifyErr) {
      logger.error('Failed to send support reopen notification:', notifyErr);
    }

    return res.json({ success: true, conversation: updateResult.rows[0] });
  } catch (error) {
    logger.error('Error reopening support conversation:', error);
    return res.status(500).json({ success: false, message: 'Destek konuşması yeniden açılamadı' });
  }
};

// Secure attachment access for support - redirects to Supabase public URL after auth check
const getSupportAttachment = async (req, res) => {
  try {
    const { attachmentId } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    const query = `
      SELECT a.id, a.file_path, a.filename, a.mime_type, a.file_size,
             m.conversation_id, c.user_id
      FROM support_message_attachments a
      JOIN support_messages m ON a.message_id = m.id
      JOIN support_conversations c ON m.conversation_id = c.id
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

    return res.redirect(att.file_path);
  } catch (error) {
    logger.error('Error serving support attachment:', error);
    return res.status(500).json({ success: false, message: 'Dosya getirilemedi' });
  }
};

module.exports = {
  getUserSupportConversations,
  createSupportConversation,
  getSupportConversationMessages,
  sendSupportMessage,
  getAdminSupportConversations,
  updateSupportConversationStatus,
  getSupportConversationStats,
  reopenSupportConversation,
  getSupportAttachment,
};
