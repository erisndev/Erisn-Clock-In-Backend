// Centralized, branded email templates
// Brand colors: Red, Black, White, Gray

const brand = {
  name: process.env.EMAIL_FROM_NAME || "Erisn Clock-In",
  from: `${process.env.EMAIL_FROM_NAME || "Erisn Clock-In"} <${process.env.EMAIL_USER}>`,
  // Brand colors
  primary: "#DC2626",      // Red
  primaryDark: "#B91C1C",  // Darker red for hover/accents
  text: "#111827",         // Near black
  textLight: "#374151",    // Dark gray for secondary text
  muted: "#6B7280",        // Gray
  bg: "#F3F4F6",           // Light gray background
  cardBg: "#FFFFFF",       // White
  border: "#E5E7EB",       // Light gray border
  supportEmail: process.env.SUPPORT_EMAIL || process.env.EMAIL_USER || "support@example.com",
  appUrl: process.env.APP_URL || process.env.FRONTEND_URL || "#",
};

function layout({ title, bodyHtml }) {
  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
  </head>
  <body style="margin:0; padding:0; background:${brand.bg}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Helvetica Neue', Arial, sans-serif;">
    <div style="background:${brand.bg}; padding:32px 16px;">
      <div style="max-width:600px; margin:0 auto;">
        <!-- Header -->
        <div style="background:${brand.text}; padding:24px 24px; border-radius:12px 12px 0 0; text-align:center;">
          <h1 style="margin:0; font-size:24px; font-weight:700; color:#FFFFFF; letter-spacing:0.5px;">${brand.name}</h1>
        </div>
        
        <!-- Red accent bar -->
        <div style="background:${brand.primary}; height:4px;"></div>
        
        <!-- Content Card -->
        <div style="background:${brand.cardBg}; padding:32px 24px; border-left:1px solid ${brand.border}; border-right:1px solid ${brand.border};">
          <h2 style="margin:0 0 16px; font-size:20px; font-weight:600; color:${brand.text};">${title}</h2>
          <div style="font-size:15px; line-height:1.7; color:${brand.textLight};">
            ${bodyHtml}
          </div>
        </div>
        
        <!-- Footer -->
        <div style="background:${brand.cardBg}; padding:20px 24px; border-radius:0 0 12px 12px; border:1px solid ${brand.border}; border-top:none;">
          <p style="margin:0 0 8px; font-size:13px; color:${brand.muted};">
            Need help? Contact us at <a href="mailto:${brand.supportEmail}" style="color:${brand.primary}; text-decoration:none;">${brand.supportEmail}</a>
          </p>
          <p style="margin:0; font-size:12px; color:${brand.muted};">
            © ${new Date().getFullYear()} ${brand.name}. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  </body>
  </html>`;
}

function ctaButton({ href, label }) {
  return `
    <a href="${href}" style="display:inline-block; background:${brand.primary}; color:#FFFFFF; text-decoration:none; padding:14px 28px; border-radius:8px; font-weight:600; font-size:15px; margin:8px 0;">
      ${label}
    </a>`;
}

function otpBox(otp) {
  return `
    <div style="background:${brand.bg}; border:2px solid ${brand.border}; border-radius:8px; padding:20px; text-align:center; margin:20px 0;">
      <span style="font-size:32px; font-weight:700; letter-spacing:8px; color:${brand.text};">${otp}</span>
    </div>`;
}

function divider() {
  return `<hr style="border:none; border-top:1px solid ${brand.border}; margin:24px 0;">`;
}

export const emailTemplates = {
  verifyEmailOtp: ({ name, otp }) => ({
    subject: "Verify Your Email - OTP Code",
    html: layout({
      title: "Verify Your Email",
      bodyHtml: `
        <p style="margin:0 0 16px;">Hi <strong style="color:${brand.text};">${name || "there"}</strong>,</p>
        <p style="margin:0 0 16px;">Welcome to ${brand.name}! Please use the following one-time password (OTP) to verify your email address:</p>
        ${otpBox(otp)}
        <p style="margin:0 0 8px; color:${brand.muted}; font-size:14px;">
          <strong>⏱ This code expires in 10 minutes.</strong>
        </p>
        <p style="margin:16px 0 0; color:${brand.muted}; font-size:13px;">
          If you didn't request this, please ignore this email.
        </p>
      `,
    }),
  }),

  resendEmailOtp: ({ name, otp }) => ({
    subject: "Your New Verification Code",
    html: layout({
      title: "New OTP Code",
      bodyHtml: `
        <p style="margin:0 0 16px;">Hi <strong style="color:${brand.text};">${name || "there"}</strong>,</p>
        <p style="margin:0 0 16px;">Here's your new verification code:</p>
        ${otpBox(otp)}
        <p style="margin:0 0 8px; color:${brand.muted}; font-size:14px;">
          <strong>⏱ This code expires in 10 minutes.</strong>
        </p>
        <p style="margin:16px 0 0; color:${brand.muted}; font-size:13px;">
          If you didn't request this, please ignore this email.
        </p>
      `,
    }),
  }),

  passwordReset: ({ name, link }) => ({
    subject: "Reset Your Password",
    html: layout({
      title: "Password Reset Request",
      bodyHtml: `
        <p style="margin:0 0 16px;">Hi <strong style="color:${brand.text};">${name || "there"}</strong>,</p>
        <p style="margin:0 0 20px;">We received a request to reset your password. Click the button below to create a new password:</p>
        <div style="text-align:center; margin:24px 0;">
          ${ctaButton({ href: link, label: "Reset Password" })}
        </div>
        ${divider()}
        <p style="margin:0 0 8px; font-size:13px; color:${brand.muted};">
          Or copy and paste this link into your browser:
        </p>
        <p style="margin:0; font-size:12px; word-break:break-all;">
          <a href="${link}" style="color:${brand.primary};">${link}</a>
        </p>
        ${divider()}
        <p style="margin:0; color:${brand.muted}; font-size:13px;">
          <strong>⏱ This link expires in 15 minutes.</strong><br>
          If you didn't request this, you can safely ignore this email.
        </p>
      `,
    }),
  }),

  weeklyReportReminder: ({ name, weekRange }) => ({
    subject: "📋 Weekly Report Reminder",
    html: layout({
      title: "Time to Submit Your Report",
      bodyHtml: `
        <p style="margin:0 0 16px;">Hi <strong style="color:${brand.text};">${name || "there"}</strong>,</p>
        <p style="margin:0 0 20px;">This is a friendly reminder to submit your weekly report${weekRange ? ` for <strong>${weekRange}</strong>` : ""}.</p>
        <div style="text-align:center; margin:24px 0;">
          ${ctaButton({ href: brand.appUrl, label: "Submit Report" })}
        </div>
        <p style="margin:16px 0 0; color:${brand.muted}; font-size:13px;">
          Regular reporting helps track your progress and achievements.
        </p>
      `,
    }),
  }),

  clockOutReminder: ({ name }) => ({
    subject: "⏰ Don't Forget to Clock Out",
    html: layout({
      title: "Clock-Out Reminder",
      bodyHtml: `
        <p style="margin:0 0 16px;">Hi <strong style="color:${brand.text};">${name || "there"}</strong>,</p>
        <p style="margin:0 0 20px;">It looks like you forgot to clock out today. Please clock out to ensure your hours are recorded accurately.</p>
        <div style="text-align:center; margin:24px 0;">
          ${ctaButton({ href: brand.appUrl, label: "Clock Out Now" })}
        </div>
        <p style="margin:16px 0 0; color:${brand.muted}; font-size:13px;">
          Accurate time tracking helps with payroll and project management.
        </p>
      `,
    }),
  }),

  reportApproved: ({ name, weekRange, comment }) => ({
    subject: "✅ Your Report Has Been Approved",
    html: layout({
      title: "Report Approved",
      bodyHtml: `
        <p style="margin:0 0 16px;">Hi <strong style="color:${brand.text};">${name || "there"}</strong>,</p>
        <p style="margin:0 0 16px;">Great news! Your weekly report${weekRange ? ` for <strong>${weekRange}</strong>` : ""} has been approved.</p>
        ${comment ? `
          <div style="background:${brand.bg}; border-left:4px solid ${brand.primary}; padding:12px 16px; margin:16px 0; border-radius:0 8px 8px 0;">
            <p style="margin:0 0 4px; font-size:12px; color:${brand.muted}; text-transform:uppercase;">Reviewer Comment</p>
            <p style="margin:0; color:${brand.textLight};">${comment}</p>
          </div>
        ` : ""}
        <div style="text-align:center; margin:24px 0;">
          ${ctaButton({ href: brand.appUrl, label: "View Report" })}
        </div>
      `,
    }),
  }),

  reportRejected: ({ name, weekRange, comment }) => ({
    subject: "📝 Your Report Needs Revision",
    html: layout({
      title: "Report Needs Revision",
      bodyHtml: `
        <p style="margin:0 0 16px;">Hi <strong style="color:${brand.text};">${name || "there"}</strong>,</p>
        <p style="margin:0 0 16px;">Your weekly report${weekRange ? ` for <strong>${weekRange}</strong>` : ""} requires some changes before it can be approved.</p>
        ${comment ? `
          <div style="background:#FEF2F2; border-left:4px solid ${brand.primary}; padding:12px 16px; margin:16px 0; border-radius:0 8px 8px 0;">
            <p style="margin:0 0 4px; font-size:12px; color:${brand.muted}; text-transform:uppercase;">Feedback</p>
            <p style="margin:0; color:${brand.textLight};">${comment}</p>
          </div>
        ` : ""}
        <div style="text-align:center; margin:24px 0;">
          ${ctaButton({ href: brand.appUrl, label: "Edit Report" })}
        </div>
        <p style="margin:16px 0 0; color:${brand.muted}; font-size:13px;">
          Please review the feedback and resubmit your report.
        </p>
      `,
    }),
  }),
};

export default emailTemplates;
