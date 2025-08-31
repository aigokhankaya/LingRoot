const { sendMail } = require('./mailer');
const logger = require('./logger');
const db = require('../config/db');

/**
 * Gets all admin users' email addresses from the database
 * @returns {Array} Array of admin email addresses
 */
async function getAdminEmails() {
  try {
    const query = `
      SELECT email, firstname, lastname 
      FROM users 
      WHERE role = 'admin' AND email IS NOT NULL
    `;
    const result = await db.query(query);
    return result.rows;
  } catch (error) {
    logger.error('[SUPPORT_NOTIFICATION] Error fetching admin emails:', error);
    return [];
  }
}

/**
 * Sends notification emails to admin users when a support message is created
 * @param {Object} messageData - The support message data
 * @param {string} messageData.conversationId - Conversation ID
 * @param {string} messageData.subject - Message subject
 * @param {string} messageData.content - Message content
 * @param {string} messageData.priority - Message priority
 * @param {Object} messageData.user - User who sent the message
 * @param {string} messageData.user.id - User ID
 * @param {string} messageData.user.firstname - User's first name
 * @param {string} messageData.user.lastname - User's last name
 * @param {string} messageData.user.email - User's email
 * @param {string} messageData.user.phonenumber - User's phone number
 * @param {string} messageData.createdAt - Message creation timestamp
 * @param {string} [messageData.assignedAdminId] - If provided, send only to this admin
 */
async function sendSupportMessageNotification(messageData) {
  try {
    let adminUsers;
    
    if (messageData.assignedAdminId) {
      // Send only to assigned admin
      const query = `
        SELECT email, firstname, lastname 
        FROM users 
        WHERE id = $1 AND role = 'admin' AND email IS NOT NULL
      `;
      const result = await db.query(query, [messageData.assignedAdminId]);
      adminUsers = result.rows;
      
      // If assigned admin not found or no email, fall back to all admins
      if (adminUsers.length === 0) {
        logger.warn(`[SUPPORT_NOTIFICATION] Assigned admin ${messageData.assignedAdminId} not found, sending to all admins`);
        adminUsers = await getAdminEmails();
      }
    } else {
      // Send to all admins (new conversations or unassigned follow-ups)
      adminUsers = await getAdminEmails();
    }
    
    if (adminUsers.length === 0) {
      logger.warn('[SUPPORT_NOTIFICATION] No admin users found to notify');
      return;
    }

    const userFullName = `${messageData.user.firstname} ${messageData.user.lastname}`.trim();
    const priorityText = messageData.priority === 'urgent' ? '🔴 ACİL' : 
                        messageData.priority === 'high' ? '🟡 YÜKSEK' : 
                        messageData.priority === 'medium' ? '🟢 ORTA' : '⚪ DÜŞÜK';
    
    // Determine if this is a follow-up message (has assigned admin) or a new conversation
    const isFollowUp = !!messageData.assignedAdminId;
    const subject = isFollowUp 
      ? `Takip Mesajı: ${messageData.subject}` 
      : `Yeni Destek Talebi - ${userFullName} (${priorityText})`;
    
    const textContent = `
Yeni bir destek mesajı alındı:

Kullanıcı Bilgileri:
- Ad Soyad: ${userFullName}
- E-posta: ${messageData.user.email}
- Telefon: ${messageData.user.phonenumber || 'Belirtilmemiş'}
- Kullanıcı ID: ${messageData.user.id}

Mesaj Bilgileri:
- Konu: ${messageData.subject}
- Öncelik: ${priorityText}
- Tarih: ${new Date(messageData.createdAt).toLocaleString('tr-TR')}
- Konuşma ID: ${messageData.conversationId}

Mesaj İçeriği:
${messageData.content}

Bu bildirim otomatik olarak gönderilmiştir.
    `.trim();

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333; border-bottom: 2px solid #dc3545; padding-bottom: 10px;">
          🆘 ${isFollowUp ? 'Takip Mesajı' : 'Yeni Destek Talebi'}
        </h2>
        
        <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ffc107;">
          <h3 style="color: #856404; margin-top: 0;">Öncelik: ${priorityText}</h3>
          <p style="margin: 0; color: #856404;"><strong>Konu:</strong> ${messageData.subject}</p>
        </div>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h3 style="color: #007bff; margin-top: 0;">Kullanıcı Bilgileri</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; font-weight: bold; width: 120px;">Ad Soyad:</td>
              <td style="padding: 8px 0;">${userFullName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">E-posta:</td>
              <td style="padding: 8px 0;"><a href="mailto:${messageData.user.email}">${messageData.user.email}</a></td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Telefon:</td>
              <td style="padding: 8px 0;">${messageData.user.phonenumber || 'Belirtilmemiş'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Kullanıcı ID:</td>
              <td style="padding: 8px 0;">${messageData.user.id}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Tarih:</td>
              <td style="padding: 8px 0;">${new Date(messageData.createdAt).toLocaleString('tr-TR')}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Konuşma ID:</td>
              <td style="padding: 8px 0;">${messageData.conversationId}</td>
            </tr>
          </table>
        </div>
        
        <div style="background-color: #e9ecef; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h3 style="color: #495057; margin-top: 0;">Mesaj İçeriği</h3>
          <p style="white-space: pre-wrap; line-height: 1.5; margin: 0;">${messageData.content}</p>
        </div>
        
        <p style="color: #666; font-size: 12px; margin-top: 30px;">
          Bu bildirim otomatik olarak gönderilmiştir.
        </p>
      </div>
    `;

    // Send email to all admin users
    const emailPromises = adminUsers.map(admin => 
      sendMail({
        to: admin.email,
        subject: subject,
        text: textContent,
        html: htmlContent
      }).catch(error => {
        logger.error(`[SUPPORT_NOTIFICATION] Failed to send to ${admin.email}:`, error);
      })
    );

    await Promise.allSettled(emailPromises);

    const adminEmails = adminUsers.map(admin => admin.email).join(', ');
    logger.info(`[SUPPORT_NOTIFICATION] Sent notifications to admins: ${adminEmails} for conversation ${messageData.conversationId}`);
    
  } catch (error) {
    // Don't fail message creation if notification fails
    logger.error('[SUPPORT_NOTIFICATION] Failed to send notification:', error);
  }
}

module.exports = { sendSupportMessageNotification };
