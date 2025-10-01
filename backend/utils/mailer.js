const nodemailer = require('nodemailer');
const logger = require('./logger');
const https = require('https');

let transporter = null;

function buildTransportOptions() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;
  const secure = port === 465; // 465 = SMTPS
  const opts = {
    host,
    port,
    secure,
    auth: { user, pass },
    // Harden timeouts to fail fast instead of hanging
    connectionTimeout: parseInt(process.env.SMTP_CONN_TIMEOUT || '10000', 10), // 10s
    greetingTimeout: parseInt(process.env.SMTP_GREET_TIMEOUT || '10000', 10),   // 10s
    socketTimeout: parseInt(process.env.SMTP_SOCKET_TIMEOUT || '20000', 10),    // 20s
  };
  // Optional TLS relax for certain providers / staging
  if (process.env.SMTP_TLS_REJECT_UNAUTH === 'false') {
    opts.tls = { rejectUnauthorized: false, ciphers: 'TLSv1.2' };
  }
  return opts;
}

async function getTransporter() {
  if (transporter) return transporter;
  const opts = buildTransportOptions();
  if (!opts) {
    logger.warn('[MAILER] SMTP not configured; emails will be logged only');
    return null;
  }
  transporter = nodemailer.createTransport(opts);
  try {
    const ok = await transporter.verify();
    logger.info(`[MAILER] Transport verify: ${ok ? 'OK' : 'FAILED'}`);
  } catch (e) {
    logger.warn(`[MAILER] Transport verify failed: ${e?.message || e}`);
  }
  return transporter;
}

async function sendViaBrevoAPI({ to, subject, text, html }) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    logger.warn('[MAILER] Brevo API key not configured');
    return null;
  }
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@localhost';
  const payload = JSON.stringify({
    sender: { email: from },
    to: [{ email: to }],
    subject,
    textContent: text,
    htmlContent: html || text,
  });
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.brevo.com',
      port: 443,
      path: '/v3/smtp/email',
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          logger.info('[MAILER] Brevo API sent', { to, subject, statusCode: res.statusCode });
          resolve({ messageId: JSON.parse(data || '{}').messageId });
        } else {
          logger.error('[MAILER] Brevo API error', { to, subject, statusCode: res.statusCode, body: data });
          reject(new Error(`Brevo API error: ${res.statusCode}`));
        }
      });
    });
    req.on('error', (e) => {
      logger.error('[MAILER] Brevo API request error', { to, subject, error: e.message });
      reject(e);
    });
    req.write(payload);
    req.end();
  });
}

async function sendMail({ to, subject, text, html }) {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@localhost';
  const tx = await getTransporter();
  if (!tx) {
    logger.info(`[MAILER-LOG] To:${to} | Subject:${subject} | Text:${text}`);
    return { logged: true };
  }
  try {
    const info = await tx.sendMail({ from, to, subject, text, html });
    logger.info('[MAILER] SMTP sent', { messageId: info?.messageId, to, subject, response: info?.response });
    return info;
  } catch (e) {
    logger.warn('[MAILER] SMTP failed, trying Brevo API fallback', { to, subject, error: e?.message || e });
    try {
      const apiResult = await sendViaBrevoAPI({ to, subject, text, html });
      if (apiResult) return apiResult;
    } catch (apiErr) {
      logger.error('[MAILER] Brevo API fallback also failed', { to, subject, error: apiErr?.message || apiErr });
    }
    throw e;
  }
}

module.exports = { sendMail };


