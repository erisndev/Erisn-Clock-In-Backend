// src/services/emailService.js
import nodemailer from "nodemailer";
import logger from "../utils/logger.js";

// Create transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER, // your Gmail
    pass: process.env.EMAIL_PASS, // app password
  },
});

/**
 * Send an email
 * @param {String} to
 * @param {String} subject
 * @param {String} message
 */
export default async function sendEmail(to, subject, message) {
  try {
    await transporter.sendMail({
      from: `"Erisn Clock-In" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text: message,
    });

    logger.info("Email sent successfully", { to, subject });
    return true;
  } catch (err) {
    logger.error("Email sending failed", err);
    return false;
  }
}
