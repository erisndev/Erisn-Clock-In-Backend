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

const transporter = nodemailer.createTransport(buildTransportConfig());

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
