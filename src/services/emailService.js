// src/services/emailService.js
const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function sendMail({ to, subject, html, text }) {
  const mailOptions = {
    from: process.env.FROM_EMAIL || 'no-reply@example.com',
    to,
    subject,
    text,
    html,
  };
  try {
    const info = await transporter.sendMail(mailOptions);
    logger.info('Email sent', { to, messageId: info.messageId });
    return { ok: true, info };
  } catch (err) {
    logger.error('Email send error', { to, err: err.message });
    return { ok: false, error: err.message };
  }
}

module.exports = { sendMail };
