const nodemailer = require('nodemailer');
const logger = require('./logger');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) {
    logger.warn('[MAILER] SMTP not configured; emails will be logged only');
    return null;
  }
  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
  return transporter;
}

async function sendMail({ to, subject, text, html }) {
  const tx = getTransporter();
  if (!tx) {
    logger.info(`[MAILER-LOG] To:${to} | Subject:${subject} | Text:${text}`);
    return { logged: true };
  }
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  const info = await tx.sendMail({ from, to, subject, text, html });
  logger.info('[MAILER] Sent:', info.messageId);
  return info;
}

module.exports = { sendMail };


