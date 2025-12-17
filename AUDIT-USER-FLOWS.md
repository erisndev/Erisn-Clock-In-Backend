# Erisn Clock‑In Backend — Functional & User Flow Audit

Date: 2025‑12‑17

Legend: ✅ Solid  |  🟡 Needs Attention  |  ❌ Missing/Problem  |  🚀 Recommendation

## 1) Product Overview
- API: Express 5 (ESM)
- DB: MongoDB via Mongoose 8
- Auth: JWT + Email OTP verification
- Features: Attendance, Weekly Reports, Admin Exports (CSV/PDF), Notifications (Email + Web Push), Cron jobs

---

## 2) Core User Flows

### A) Registration + Email Verification
- Steps
  1. POST /api/auth/register → creates user with hashed OTP (10 min expiry)
  2. Email sent with OTP
  3. POST /api/auth/verify-email-otp → verifies OTP and activates account
- Status: ✅ OTP generation + hashing | ✅ Expiry | ✅ Domain restriction (erisn.*.com)
- Gaps: 🟡 Rate limiting not bound per route/IP/email | 🟡 No CAPTCHA option
- 🚀 Additions
  - Per-route limiters (register/verify/resend) with IP + email keys
  - Optional CAPTCHA in production for register/resend
  - Structured audit log on register/verify with correlationId

### B) Login
- Steps: POST /api/auth/login → password verify → returns JWT
- Status: ✅ Rejects unverified | ✅ Token issued
- Gaps: 🟡 No progressive lockout on repeated failures | 🟡 No refresh token rotation
- 🚀 Additions
  - Rate limit + exponential backoff/temporary lockout
  - Optional refresh tokens with rotation + revocation list

### C) Forgot/Reset Password
- Steps: POST /forgot → email with reset link → POST /reset/:token
- Status: ✅ Token + expiry | ✅ Branded email with CTA
- Gaps: 🟡 No per-email/IP limit | 🟡 No global session invalidation
- 🚀 Additions
  - Per-email/IP limit on forgot password
  - Invalidate existing sessions/tokens after reset (if applicable)
  - Password complexity validation policy

### D) Attendance
- Steps: User clocks in/out daily; admin queries
- Status: ✅ Unique index (userId+date) prevents duplicates
- Gaps: 🟡 Overlap prevention/business rules | 🟡 Timezone boundaries for day logic
- 🚀 Additions
  - Server validation for overlapping sessions
  - Timezone-aware day boundaries (user preference TZ)
  - Manual correction requests + admin review flow

### E) Weekly Reports
- Steps: User submits one per week range; admin exports
- Status: ✅ Unique index on (userId, weekStart, weekEnd)
- Gaps: 🟡 Limited workflow states | 🟡 No draft/edit pre-submit | 🟡 Review comments missing
- 🚀 Additions
  - Draft → Submitted → Reviewed/Approved/Rejected + reviewer/comment + timestamps
  - Edit allowed while Draft; lock after Submitted unless Rejected
  - Versioning for audit trail

### F) Notifications (Email + Web Push)
- Steps: Cron jobs send reminders; records saved
- Status: ✅ Unified email service + templates | ✅ VAPID configured | ✅ ENABLE_JOBS flag
- Gaps: 🟡 TZ not explicit in cron | 🟡 No retry/backoff | 🟡 Per-run summary not reported
- 🚀 Additions
  - Cron timezone via env (TZ) and pass to scheduler
  - Retry/backoff for transient SMTP/webpush errors; dead-letter policy
  - Per-run summary: totals, failures, sample errors (logged + optional webhook)

---

## 3) Security Review
- Middlewares: ✅ helmet | ✅ compression | ✅ express-mongo-sanitize
- CORS: ✅ Restricted to FRONTEND_URL/FRONTEND_URL_DEV
- Rate limiting: 🟡 Present but not per-sensitive route
- XSS: 🟡 No server-side HTML sanitizer for user-rendered content
- JWT: ✅ Issue tokens; 🟡 Consider short-lived access + optional refresh
- Email: ✅ Centralized, uses env; 🟡 Ensure secrets not logged
- Exports: 🟡 PII included; ensure admin-only and access logged
- 🚀 Actions
  - Apply specific rate limiters to: register, login, resend-otp, forgot-password
  - Add sanitize-html for content rendered in emails/PDFs
  - Use structured logger; disable verbose errors in production
  - Add access logs for exports and admin list endpoints

---

## 4) Reliability & Performance
- Indexing: ✅ Attendance + WeeklyReport
- Exports: 🟡 In-process CSV/PDF could block on large data
- Cron: 🟡 TZ not explicit
- Email: 🟡 No queue/retry; immediate send
- 🚀 Actions
  - Stream CSV and paginate queries for large ranges
  - Configure TZ (env) and use in node-cron schedules
  - Consider a lightweight queue (e.g., BullMQ) for email/webpush at scale

---

## 5) Developer Experience & Consistency
- Email: ✅ Unified transporter + templates
- Logging: 🟡 Mixed console and logger usage
- Validation: 🟡 express-validator partly used; Joi unused
- Naming: 🟡 userRoute.js inconsistent with pluralization
- Docs: 🟡 Env/email setup guidance can be expanded
- 🚀 Actions
  - Replace console.* with logger throughout; add requestId middleware
  - Standardize on express-validator; remove Joi dependency
  - Rename userRoute.js → usersRoutes.js (or usersRoute.js consistently)
  - Expand README on SMTP/env configuration and common errors

---

## 6) Missing UX & Admin Features
- User preferences: 🟡 Timezone, notification channels, email frequency
- Notifications center: 🟡 List with read/unread state
- Report review: 🟡 Approve/Reject with comments and audit trail
- Attendance correction: 🟡 Request/approval workflow
- 🚀 Actions
  - Add /api/users/preferences endpoints (GET/PUT): timezone, channels
  - Add /api/notifications (list, mark-as-read)
  - Extend WeeklyReport schema: reviewerId, reviewedAt, reviewComment, status transitions
  - Add AttendanceCorrection model + admin endpoints

---

## 7) Quick Wins (High Impact, Low Effort)
- Apply per-route rate limiters (register/login/resend/forgot)
- Enforce validation with express-validator on attendance/reports
- Add sanitize-html for any user-rendered HTML
- Replace console.log in app.js with logger
- Set TZ for cron (e.g., Africa/Lagos) and surface in logs

---

## 8) Suggested .env Keys
```
# CORS & App
FRONTEND_URL=https://your-frontend.example
FRONTEND_URL_DEV=http://localhost:5173
APP_URL=https://your-frontend.example

# Email / Branding
EMAIL_SERVICE=gmail            # or leave blank if using SMTP_HOST/PORT
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
EMAIL_USER=no-reply@example.com
EMAIL_PASS=***
EMAIL_FROM_NAME=Erisn Clock-In
SUPPORT_EMAIL=support@example.com
BRAND_PRIMARY_COLOR=#0E7AFE
# BRAND_LOGO_URL intentionally unused in layout (logo removed)

# Jobs / Time
ENABLE_JOBS=true
TZ=Africa/Lagos
```

---

## 9) Roadmap (3 Weeks)
- Week 1: Security hardening (rate limits, validation, sanitize-html, cron TZ)
- Week 2: UX flows (report review workflow, notifications list, user preferences)
- Week 3: Observability + performance (logger unification, CSV streaming, remove Joi, rename route, docs)

---

## 10) Status Snapshot
- Registration/OTP: ✅
- Login: ✅
- Forgot/Reset: ✅
- Attendance core: ✅
- Weekly reports core: ✅
- Notifications: ✅
- Email branding: ✅ (logo removed, themed layout)
- CORS/helmet/sanitize: ✅
- Rate limits: 🟡
- Validation coverage: 🟡
- XSS handling (rendered content): 🟡
- Logging consistency: 🟡
- Cron timezone: 🟡
- Exports scalability: 🟡
- Admin review workflow: ❌
- In-app notification center: ❌
- User preferences: ❌

---

## 11) Final Notes
This audit prioritizes end-to-end user flows, security, and maintainability. The recommended changes are incremental and low risk, with clear sequencing to minimize downtime while improving UX and reliability.
