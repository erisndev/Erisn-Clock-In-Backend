import nodemailer from "nodemailer";
import dotenv from "dotenv";
import ErrorResponse from "./ErrorResponse.js";

dotenv.config(); // Load environment variables

// Create a reusable transporter
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || "gmail", // Default to Gmail
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Optional: verify the connection configuration
transporter.verify((error, success) => {
  if (error) {
    console.error("Email server connection failed:", error);
  } else {
    console.log("Email server is ready to take messages");
  }
});

const sendEmail = async ({ to, subject, html }) => {
  try {
    const info = await transporter.sendMail({
      from: `"${process.env.EMAIL_FROM_NAME || "Support"}" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });

    console.log("Email sent:", info.messageId);
    return info;
  } catch (err) {
    console.error("sendEmail error:", err);
    throw new ErrorResponse("Email could not be sent", 500);
  }
};

export default sendEmail;
