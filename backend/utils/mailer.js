const nodemailer = require('nodemailer');
const logger = require('./logger');

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

async function sendMail({ to, subject, text, html }) {
  const tx = await getTransporter();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@localhost';
  if (!tx) {
    logger.info(`[MAILER-LOG] To:${to} | Subject:${subject} | Text:${text}`);
    return { logged: true };
  }
  try {
    const info = await tx.sendMail({ from, to, subject, text, html });
    logger.info('[MAILER] Sent', { messageId: info?.messageId, to, subject, response: info?.response });
    return info;
  } catch (e) {
    logger.error('[MAILER] sendMail error', { to, subject, error: e?.message || e });
    throw e;
  }
}

module.exports = { sendMail };


