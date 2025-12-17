// utils/sendEmail.js
import nodemailer from "nodemailer";
import ErrorResponse from "./ErrorResponse.js";

const sendEmail = async ({ to, subject, html }) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"Support" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });
  } catch (err) {
    throw new ErrorResponse("Email could not be sent", 500);
  }
};

export default sendEmail;
