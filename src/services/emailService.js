// Unified Email Service
import nodemailer from "nodemailer";
import logger from "../utils/logger.js";

function buildTransportConfig() {
  const {
    EMAIL_SERVICE,
    SMTP_HOST,
    SMTP_PORT,
    SMTP_SECURE,
    EMAIL_USER,
    EMAIL_PASS,
  } = process.env;

  // Prefer host/port if provided; else fallback to service
  if (SMTP_HOST) {
    return {
      host: SMTP_HOST,
      port: Number(SMTP_PORT) || 587,
      secure: (SMTP_SECURE || "false").toLowerCase() === "true",
      auth: EMAIL_USER && EMAIL_PASS ? { user: EMAIL_USER, pass: EMAIL_PASS } : undefined,
    };
  }

  return {
    service: EMAIL_SERVICE || "gmail",
    auth: EMAIL_USER && EMAIL_PASS ? { user: EMAIL_USER, pass: EMAIL_PASS } : undefined,
  };
}

const transporter = nodemailer.createTransport({
  ...buildTransportConfig(),
  // Performance & reliability tuning:
  // - pool: reuse SMTP connection (less latency per email)
  // - timeouts: fail fast instead of hanging for a long time
  // - greetingTimeout: avoid long waits during initial handshake
  pool: (process.env.SMTP_POOL || "true").toLowerCase() === "true",
  maxConnections: Number(process.env.SMTP_MAX_CONNECTIONS) || 2,
  maxMessages: Number(process.env.SMTP_MAX_MESSAGES) || 50,
  connectionTimeout: Number(process.env.SMTP_CONNECTION_TIMEOUT_MS) || 10_000,
  greetingTimeout: Number(process.env.SMTP_GREETING_TIMEOUT_MS) || 10_000,
  socketTimeout: Number(process.env.SMTP_SOCKET_TIMEOUT_MS) || 20_000,
});

export async function sendEmail({ to, subject, html, text, attachments } = {}) {
  try {
    const from = `${process.env.EMAIL_FROM_NAME || "Erisn Clock-In"} <${process.env.EMAIL_USER}>`;

    const info = await transporter.sendMail({ from, to, subject, html, text, attachments });
    logger.info("Email sent", { to, subject, messageId: info.messageId });
    return info;
  } catch (err) {
    logger.error("Email send failed", err);
    throw err;
  }
}

export default sendEmail;
