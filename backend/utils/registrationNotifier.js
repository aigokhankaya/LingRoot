const { sendMail } = require('./mailer');
const logger = require('./logger');

/**
 * Sends a notification email to support@lingroot.com when a new user registers
 * @param {Object} userData - The user data from registration
 * @param {string} userData.id - User ID
 * @param {string} userData.firstname - User's first name
 * @param {string} userData.lastname - User's last name
 * @param {string} userData.email - User's email
 * @param {string} userData.phonenumber - User's phone number
 * @param {string} userData.created_at - Registration timestamp
 */
async function sendRegistrationNotification(userData) {
  try {
    const supportEmail = process.env.SUPPORT_EMAIL || 'support@lingroot.com';
    const fullName = `${userData.firstname} ${userData.lastname}`.trim();
    
    const subject = `Yeni Kullanıcı Kaydı - ${fullName}`;
    
    const textContent = `
Yeni bir kullanıcı LingRoot'a kayıt oldu:

Kullanıcı Bilgileri:
- ID: ${userData.id}
- Ad Soyad: ${fullName}
- E-posta: ${userData.email}
- Telefon: ${userData.phonenumber || 'Belirtilmemiş'}
- Kayıt Tarihi: ${new Date(userData.created_at).toLocaleString('tr-TR')}

Bu bildirim otomatik olarak gönderilmiştir.
    `.trim();

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px;">
          Yeni Kullanıcı Kaydı
        </h2>
        
        <p>Yeni bir kullanıcı LingRoot'a kayıt oldu:</p>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h3 style="color: #007bff; margin-top: 0;">Kullanıcı Bilgileri</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; font-weight: bold; width: 120px;">ID:</td>
              <td style="padding: 8px 0;">${userData.id}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Ad Soyad:</td>
              <td style="padding: 8px 0;">${fullName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">E-posta:</td>
              <td style="padding: 8px 0;"><a href="mailto:${userData.email}">${userData.email}</a></td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Telefon:</td>
              <td style="padding: 8px 0;">${userData.phonenumber || 'Belirtilmemiş'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Kayıt Tarihi:</td>
              <td style="padding: 8px 0;">${new Date(userData.created_at).toLocaleString('tr-TR')}</td>
            </tr>
          </table>
        </div>
        
        <p style="color: #666; font-size: 12px; margin-top: 30px;">
          Bu bildirim otomatik olarak gönderilmiştir.
        </p>
      </div>
    `;

    await sendMail({
      to: supportEmail,
      subject: subject,
      text: textContent,
      html: htmlContent
    });

    logger.info(`[REGISTRATION_NOTIFICATION] Sent notification to ${supportEmail} for user ${userData.email}`);
    
  } catch (error) {
    // Don't fail registration if notification fails
    logger.error('[REGISTRATION_NOTIFICATION] Failed to send notification:', error);
  }
}

module.exports = { sendRegistrationNotification };
