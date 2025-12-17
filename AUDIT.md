# Erisn Clock-In Backend Audit

Date: 2025-12-17

This document audits the current backend implementation with a focus on security, reliability, maintainability, performance, and operational concerns. It also includes prioritized recommendations.

Project overview
- Stack: Node.js (ESM), Express 5, Mongoose 8, MongoDB, Nodemailer, node-cron, web-push
- Entry: src/server.js -> src/app.js
- Features: Authentication with OTP email verification, attendance tracking, weekly reports, admin exports (CSV/PDF), notifications via email and web push, scheduled cron jobs.

Key findings

1) Security
- Env handling: dotenv is loaded at process start via import "dotenv/config.js" in src/server.js. Good. However, mail transporter(s) are created at module import and depend on EMAIL_USER/EMAIL_PASS. If server.js is not the first import or tests import senders directly, missing vars can occur. Risk: EAUTH (observed) and potential crash.
- Duplicate email sender implementations: src/services/emailService.js and src/utils/sendEmail.js both initialize nodemailer differently and rely on envs EMAIL_* leading to drift and inconsistencies.
- CORS: app.js uses cors with origin: process.env.FRONTEND_URL and credentials: true. If FRONTEND_URL is not set, origin becomes undefined which allows all origins by default in cors v2? In cors, origin undefined defaults to reflect request origin if not set explicitly during preflight off. Safer to explicitly handle allowed origins fallback.
- Helmet: present. Consider stricter policies: contentSecurityPolicy, crossOriginResourcePolicy, and frameguard if applicable to APIs; for API-only, allow defaults.
- Rate limiting and sanitization: express-rate-limit and express-mongo-sanitize are dependencies but not wired in app.js. xss-clean also present but not used. Missing implementation reduces protection against brute force and query/operator injection.
- Validation: express-validator used in routes but some controllers directly use req.body without central schema validation. Joi is a dependency but not used; stick to one validation approach.
- JWT handling: utils/generateToken.js exists; not inspected for rotation/expiry; ensure httpOnly, secure cookies if used, or short-lived tokens.
- Password storage: bcryptjs dependency present. Ensure strong salt rounds and never log passwords. Bcryptjs v3 is fine.
- Web Push VAPID email uses process.env.EMAIL_USER which may leak real address; should use a no-reply or contact address.
- Exports include user PII (name, email). Ensure admin-only routes protected (they are gated via protect + authorize("admin") on example route; verify on routes).

2) Reliability and correctness
- Mongoose duplicate index: WeeklyReport had duplicate compound index + field-level index. Fixed by removing duplicates. Ensure MongoDB index state matches desired uniqueness.
- Cron jobs: Controlled via ENABLE_JOBS env. Good. However, job scheduling logs rely on cron expressions; ensure timezone handling is clear. node-cron uses system TZ unless specified. No retry/backoff on email/web push failures.
- Email service: transporter.verify runs on import in utils/sendEmail.js, logging connection errors at startup which can be noisy in dev and break tests. Prefer lazy verification and better error surfaces.
- Error handling: errorHandler middleware present. Ensure it does not leak stack traces in production; not reviewed here as file is not opened. NotFound middleware added.

3) Maintainability and consistency
- Two separate email modules (src/services/emailService.js and src/utils/sendEmail.js) cause duplication. Controllers import utils/sendEmail.js while notificationService imports services/emailService.js. This divergence complicates configuration and troubleshooting.
- Logging: utils/logger.js exists; some files use console.log while notificationService uses logger. Inconsistent logging strategy. Prefer centralized logger everywhere.
- Validation libraries duplication: express-validator and Joi both included; only express-validator appears used. Remove unused dependency or standardize.
- Directory naming: routes include userRoute.js (singular) while others are pluralized; minor consistency issue.

4) Performance
- Compression enabled. Good.
- Helmet default may add overhead but acceptable.
- MongoDB: Ensure proper indexes exist for high-traffic queries (Attendance has unique index on userId+date; WeeklyReport has compound index; users likely indexed by email). Review query patterns for admin filters (date ranges) and add supporting indexes if needed.
- PDF/CSV generation runs in-process. Large exports could block event loop. Consider streaming or job queue if datasets grow.

5) Observability
- No request ID correlation or structured JSON logging. Hard to trace across services and jobs. Consider pino/winston with request-scoped IDs.
- No healthcheck endpoint or readiness/liveness probes.

6) Configuration and ops
- .env in repo root loaded. Ensure .env is not committed (gitignored). Present .gitignore likely covers it.
- PORT default 5000. CORS FRONTEND_URL required for strict origin.
- ENABLE_JOBS flag controls jobs. Good.
- Email envs: EMAIL_SERVICE, EMAIL_USER, EMAIL_PASS, EMAIL_FROM_NAME referenced. Ensure they are set in all environments.
- VAPID keys for web-push are expected by services/webPushService.js.

Detailed observations by file
- src/server.js: Loads env first, connects DB, starts cron by flag. Good separation.
- src/app.js: Uses cors, helmet, compression, custom request logger, mounts routes, error middlewares. Missing express-rate-limit, express-mongo-sanitize, xss-clean, and body size limit configuration.
- src/models/WeeklyReport.js: Duplicate index issue resolved. Ensure index build on deploy.
- src/services/emailService.js: Gmail service hardcoded. Utils/sendEmail.js allows service override via EMAIL_SERVICE. Unify approach and allow host/port/secure configuration for non-Gmail SMTP.
- src/utils/sendEmail.js: Calls transporter.verify on module load; logs noisy errors. Use quiet option or move to startup check.
- src/services/notificationService.js: Imports sendEmail from services/emailService.js, while authController imports from utils/sendEmail.js. Unify imports.

Recommendations (prioritized)

High priority
1) Unify email sending into a single module
- Delete one of src/services/emailService.js or src/utils/sendEmail.js. Prefer a single robust service file (e.g., src/services/emailService.js) that supports both service-based and host/port configuration:
  - service: process.env.EMAIL_SERVICE (optional)
  - host: process.env.SMTP_HOST
  - port: process.env.SMTP_PORT
  - secure: process.env.SMTP_SECURE === "true"
  - auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
- Export a single sendEmail({ to, subject, html, text, attachments }) function.
- Replace all imports to use this one module. Remove transporter.verify at import; instead verify once at startup or when sending.

2) Add security middlewares in app.js
- express-rate-limit for login and OTP endpoints (e.g., max 5/min per IP or per email).
- express-mongo-sanitize at global level to strip $ and . from query/body.
- xss-clean or a modern alternative (xss-clean is unmaintained; consider DOMPurify server-side via isomorphic-dompurify or sanitize-html) on fields that get rendered in emails or PDFs.
- Set body size limits: app.use(express.json({ limit: "200kb" }));
- Harden CORS: explicitly set allowed origins list and fallback to 403 when not matched.

3) Fix SMTP credentials and startup behavior
- Ensure EMAIL_USER and EMAIL_PASS (or SMTP host/port) are present in .env for all environments.
- Avoid creating the transporter before dotenv is loaded. You already load env in server.js; ensure no module creates transporter before server.js executes in other entry points.

4) Index management
- Confirm MongoDB indexes match Mongoose definitions. Drop duplicates if necessary. For WeeklyReport ensure the compound unique index exists once.

Medium priority
5) Logging consistency
- Replace console.log with a centralized logger (utils/logger.js) everywhere, including request logging middleware. Include timestamp, level, requestId, and userId when available.
- Consider pino for performance and structured logs.

6) Validation consistency
- Choose express-validator or Joi. If sticking with express-validator, remove Joi from dependencies. Ensure validation present for attendance/report submission payloads.

7) Observability and ops
- Add /health (liveness) and /ready (readiness) endpoints that check DB connectivity.
- Add basic metrics (process memory, event loop lag) via prom-client or opentelemetry later.

8) Job robustness
- Add try/catch and per-user failure isolation inside jobs. Collect and log summary results. Consider retry/backoff on transient errors, and a feature flag per job schedule.
- Consider timezone handling explicitly (e.g., cron.schedule(expr, tz: process.env.TZ || 'UTC')).

9) Performance for exports
- For large datasets, implement pagination and streaming CSV generation. For PDF, consider server-side worker or queue for large batches.

Low priority
10) Codebase consistency
- Rename routes/userRoute.js to usersRoutes.js or usersRoute.js to match pattern.
- Remove unused dependencies (Joi) and ensure package-lock is updated.
- Add ESLint/Prettier scripts and CI checks. Enforce import order and no-console rules.

Suggested .env keys
- FRONTEND_URL=https://your-frontend.example
- ENABLE_JOBS=true
- PORT=5000
- MONGO_URI=...
- EMAIL_SERVICE=gmail (or empty when using host/port)
- SMTP_HOST=smtp.example.com
- SMTP_PORT=587
- SMTP_SECURE=false
- EMAIL_USER=no-reply@example.com
- EMAIL_PASS=your-app-password
- EMAIL_FROM_NAME=Erisn Clock-In
- VAPID_PUBLIC_KEY=...
- VAPID_PRIVATE_KEY=...

Action plan
- Week 1: Unify email module, wire security middlewares, fix CORS, confirm indexes. Test flows for register/verify/login and notifications.
- Week 2: Logging standardization, health endpoints, rate limiting, validation coverage. Add job resilience and TZ config.
- Week 3: Performance improvements for exports, remove unused deps, naming cleanup, CI linting.

Known open issues
- Startup EAUTH due to missing SMTP credentials (observed). Provide .env credentials and/or replace transporter creation to support unauthenticated dev transports (e.g., ethereal.email during dev).
- Duplicate Mongoose index warning (fixed in WeeklyReport.js). Ensure DB index state aligns.
