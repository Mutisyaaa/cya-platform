const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

require("./config/loadEnv");

const express = require("express");
const cors = require("cors");
const multer = require("multer");
const pool = require("./db");
const bcrypt = require("bcryptjs");
const session = require("express-session");
const passport = require("passport");

let nodemailer = null;
try {
  nodemailer = require("nodemailer");
} catch (error) {
  console.warn("Nodemailer not installed. Password reset emails will fall back to preview mode outside production.");
}

const schemaBootstrapQuery = `
  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255), 
    google_id VARCHAR(255) UNIQUE, 
    gender VARCHAR(50),
    is_admin BOOLEAN NOT NULL DEFAULT FALSE,
    avatar_url TEXT, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS gallery (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    image_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS blogs (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS blog_comments (
    id SERIAL PRIMARY KEY,
    blog_id INTEGER NOT NULL REFERENCES blogs(id) ON DELETE CASCADE,
    parent_comment_id INTEGER REFERENCES blog_comments(id) ON DELETE CASCADE,
    author_name VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS blog_likes (
    blog_id INTEGER NOT NULL REFERENCES blogs(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (blog_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS blog_saves (
    blog_id INTEGER NOT NULL REFERENCES blogs(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (blog_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS blog_comment_likes (
    comment_id INTEGER NOT NULL REFERENCES blog_comments(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (comment_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS gallery_comments (
    id SERIAL PRIMARY KEY,
    gallery_id INTEGER NOT NULL REFERENCES gallery(id) ON DELETE CASCADE,
    parent_comment_id INTEGER REFERENCES gallery_comments(id) ON DELETE CASCADE,
    author_name VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS gallery_likes (
    gallery_id INTEGER NOT NULL REFERENCES gallery(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (gallery_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS gallery_saves (
    gallery_id INTEGER NOT NULL REFERENCES gallery(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (gallery_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS gallery_comment_likes (
    comment_id INTEGER NOT NULL REFERENCES gallery_comments(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (comment_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS services (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    service_day VARCHAR(50),
    service_time TIME,
    target_gender VARCHAR(10) DEFAULT 'all'
  );

  CREATE TABLE IF NOT EXISTS events (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_date DATE NOT NULL,
    event_time TIME, 
    fellowship_id INTEGER REFERENCES services(id) ON DELETE SET NULL,
    target_gender VARCHAR(10) DEFAULT 'all',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS event_rsvps (
    event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (event_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS fellowship_posts (
    id SERIAL PRIMARY KEY,
    author_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    author_name VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(20) NOT NULL DEFAULT 'discussion',
    target_gender VARCHAR(10) NOT NULL DEFAULT 'all',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS fellowship_comments (
    id SERIAL PRIMARY KEY,
    post_id INTEGER NOT NULL REFERENCES fellowship_posts(id) ON DELETE CASCADE,
    author_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    author_name VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );

  ALTER TABLE users
    ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;

  ALTER TABLE gallery
    ADD COLUMN IF NOT EXISTS storage_provider VARCHAR(50),
    ADD COLUMN IF NOT EXISTS storage_public_id TEXT,
    ADD COLUMN IF NOT EXISTS storage_resource_type VARCHAR(50);

  ALTER TABLE blog_saves
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

  ALTER TABLE gallery_saves
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

  ALTER TABLE blog_comments
    ADD COLUMN IF NOT EXISTS parent_comment_id INTEGER REFERENCES blog_comments(id) ON DELETE CASCADE;

  ALTER TABLE gallery_comments
    ADD COLUMN IF NOT EXISTS parent_comment_id INTEGER REFERENCES gallery_comments(id) ON DELETE CASCADE;
`;

const legacyLikesSchemaRepairQuery = `
  ALTER TABLE blog_likes
    ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;

  ALTER TABLE gallery_likes
    ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;

  DELETE FROM blog_likes
  WHERE user_id IS NULL;

  DELETE FROM gallery_likes
  WHERE user_id IS NULL;

  DELETE FROM blog_likes older
  USING blog_likes newer
  WHERE older.ctid < newer.ctid
    AND older.blog_id = newer.blog_id
    AND older.user_id = newer.user_id
    AND older.user_id IS NOT NULL;

  DELETE FROM gallery_likes older
  USING gallery_likes newer
  WHERE older.ctid < newer.ctid
    AND older.gallery_id = newer.gallery_id
    AND older.user_id = newer.user_id
    AND older.user_id IS NOT NULL;

  DO $$
  DECLARE
    pk_name TEXT;
    pk_columns TEXT[];
  BEGIN
    SELECT c.conname, array_agg(a.attname ORDER BY u.ordinality)
    INTO pk_name, pk_columns
    FROM pg_constraint c
    JOIN unnest(c.conkey) WITH ORDINALITY AS u(attnum, ordinality) ON TRUE
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = u.attnum
    WHERE c.conrelid = 'blog_likes'::regclass AND c.contype = 'p'
    GROUP BY c.conname;

    IF pk_name IS NOT NULL AND pk_columns <> ARRAY['blog_id', 'user_id'] THEN
      EXECUTE format('ALTER TABLE blog_likes DROP CONSTRAINT %I', pk_name);
    END IF;
  END $$;

  DO $$
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM blog_likes WHERE user_id IS NULL) THEN
      ALTER TABLE blog_likes
        ALTER COLUMN user_id SET NOT NULL;
    END IF;
  END $$;

  DO $$
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM blog_likes WHERE user_id IS NULL)
      AND NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'blog_likes'::regclass
          AND contype = 'p'
      ) THEN
      ALTER TABLE blog_likes ADD PRIMARY KEY (blog_id, user_id);
    END IF;
  END $$;

  ALTER TABLE blog_likes
    DROP COLUMN IF EXISTS user_ip;

  DROP INDEX IF EXISTS blog_likes_blog_id_user_id_idx;

  DO $$
  DECLARE
    pk_name TEXT;
    pk_columns TEXT[];
  BEGIN
    SELECT c.conname, array_agg(a.attname ORDER BY u.ordinality)
    INTO pk_name, pk_columns
    FROM pg_constraint c
    JOIN unnest(c.conkey) WITH ORDINALITY AS u(attnum, ordinality) ON TRUE
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = u.attnum
    WHERE c.conrelid = 'gallery_likes'::regclass AND c.contype = 'p'
    GROUP BY c.conname;

    IF pk_name IS NOT NULL AND pk_columns <> ARRAY['gallery_id', 'user_id'] THEN
      EXECUTE format('ALTER TABLE gallery_likes DROP CONSTRAINT %I', pk_name);
    END IF;
  END $$;

  DO $$
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM gallery_likes WHERE user_id IS NULL) THEN
      ALTER TABLE gallery_likes
        ALTER COLUMN user_id SET NOT NULL;
    END IF;
  END $$;

  DO $$
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM gallery_likes WHERE user_id IS NULL)
      AND NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'gallery_likes'::regclass
          AND contype = 'p'
      ) THEN
      ALTER TABLE gallery_likes ADD PRIMARY KEY (gallery_id, user_id);
    END IF;
  END $$;

  ALTER TABLE gallery_likes
    DROP COLUMN IF EXISTS user_ip;

  DROP INDEX IF EXISTS gallery_likes_gallery_id_user_id_idx;
`;

async function initializeDatabase() {
  try {
    await pool.query(schemaBootstrapQuery);
    await pool.query(legacyLikesSchemaRepairQuery);
    await syncConfiguredAdminAccess();
  } catch (err) {
    console.error("Could not initialize database schema:", err);
    throw err;
  }
}

const app = express();
app.set('trust proxy', true); // To ensure req.ip is reliable behind a proxy
const PORT = process.env.PORT || 3000;
const clientDir = path.join(__dirname, "client");
const uploadsDir = path.join(__dirname, "server", "uploads");
const allowLocalOrigin = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i;
const isProduction = process.env.NODE_ENV === "production";

fs.mkdirSync(uploadsDir, { recursive: true });

function parseCsvEnv(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

const allowedOrigins = new Set(parseCsvEnv(process.env.CORS_ALLOWED_ORIGINS));

if (process.env.APP_ORIGIN) {
  allowedOrigins.add(process.env.APP_ORIGIN.trim());
}

if (process.env.RENDER_EXTERNAL_HOSTNAME) {
  allowedOrigins.add(`https://${process.env.RENDER_EXTERNAL_HOSTNAME}`);
}

app.use(session({
  secret: process.env.SESSION_SECRET || "keyboardcat",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction,
    maxAge: 1000 * 60 * 60 * 24 * 7,
  },
}));

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const result = await pool.query("SELECT * FROM users WHERE id = $1", [id]);
    if (result.rows.length === 0) {
      return done(null, false, { message: 'User not found.' });
    }
    return done(null, buildSessionUser(result.rows[0]));
  } catch (err) {
    return done(err);
  }
});

let authInitError = null;

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  try {
    require("./config/passport");
  } catch (err) {
    authInitError = err;
    console.warn(`Google Auth disabled: ${err.message}`);
  }
} else {
  authInitError = new Error("Google OAuth environment variables are missing.");
  console.warn("Google Auth disabled: Google OAuth environment variables are missing.");
}

// Ensure authenticated for admin routes
function ensureUserAuthenticated(req, res, next) {
  if (req.isAuthenticated() && req.user) {
    return next();
  }
  // Using a different error message for user-facing actions
  res.status(401).json({ error: "You must be logged in to perform this action." });
}

// New middleware for admin access
function ensureAdmin(req, res, next) {
  if (req.isAuthenticated() && req.user?.isAdmin) {
    return next();
  }

  return res.status(403).json({ error: "Forbidden: You do not have administrative privileges." });
}

function isValidTargetGender(targetGender) {
  return ["all", "male", "female"].includes(targetGender);
}

function isValidUserGender(gender) {
  return ["male", "female"].includes(gender);
}

function isValidFellowshipCategory(category) {
  return ["discussion", "planning"].includes(category);
}

function canContributeToFellowshipTarget(user, targetGender) {
  if (!user) {
    return false;
  }

  if (user.isAdmin) {
    return true;
  }

  if (targetGender === "all") {
    return true;
  }

  return user.gender === targetGender;
}

async function getDashboardOverview(req, res) {
  try {
    const [usersResult, eventsResult, galleryResult, blogsResult, servicesResult] = await Promise.all([
      pool.query("SELECT COUNT(*) FROM users"),
      pool.query("SELECT COUNT(*) FROM events"),
      pool.query("SELECT COUNT(*) FROM gallery"),
      pool.query("SELECT COUNT(*) FROM blogs"),
      pool.query("SELECT COUNT(*) FROM services"),
    ]);

    res.json({
      users: parseInt(usersResult.rows[0].count, 10),
      events: parseInt(eventsResult.rows[0].count, 10),
      gallery: parseInt(galleryResult.rows[0].count, 10),
      blogs: parseInt(blogsResult.rows[0].count, 10),
      ministries: parseInt(servicesResult.rows[0].count, 10),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function getAdminCommentsFeed() {
  const result = await pool.query(`
    SELECT *
    FROM (
      SELECT
        'blog'::text AS content_type,
        bc.id,
        bc.blog_id AS source_id,
        b.title AS source_title,
        bc.parent_comment_id,
        bc.author_name,
        bc.content,
        bc.created_at,
        (SELECT COUNT(*) FROM blog_comment_likes bcl WHERE bcl.comment_id = bc.id) AS likes,
        (SELECT COUNT(*) FROM blog_comments child WHERE child.parent_comment_id = bc.id) AS reply_count
      FROM blog_comments bc
      JOIN blogs b ON b.id = bc.blog_id

      UNION ALL

      SELECT
        'gallery'::text AS content_type,
        gc.id,
        gc.gallery_id AS source_id,
        g.title AS source_title,
        gc.parent_comment_id,
        gc.author_name,
        gc.content,
        gc.created_at,
        (SELECT COUNT(*) FROM gallery_comment_likes gcl WHERE gcl.comment_id = gc.id) AS likes,
        (SELECT COUNT(*) FROM gallery_comments child WHERE child.parent_comment_id = gc.id) AS reply_count
      FROM gallery_comments gc
      JOIN gallery g ON g.id = gc.gallery_id
    ) admin_comments
    ORDER BY created_at DESC
  `);

  return result.rows.map((comment) => ({
    ...comment,
    likes: parseInt(comment.likes, 10) || 0,
    reply_count: parseInt(comment.reply_count, 10) || 0,
  }));
}

function isGoogleAuthReady() {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET
  );
}

function getAuthUnavailableMessage() {
  return authInitError?.message || "Google auth is not available on this server.";
}

function buildSessionUser(dbUser) {
  return {
    id: dbUser.id,
    displayName: dbUser.name,
    emails: [{ value: dbUser.email }],
    avatarUrl: dbUser.avatar_url,
    gender: dbUser.gender,
    provider: dbUser.google_id ? "google" : "local",
    isAdmin: Boolean(dbUser.is_admin),
  };
}

function isBootstrapAdminEmail(email) {
  const configuredAdminEmail = normalizeEmail(process.env.ADMIN_EMAIL);
  return Boolean(configuredAdminEmail) && normalizeEmail(email) === configuredAdminEmail;
}

async function syncConfiguredAdminAccess() {
  const adminEmail = normalizeEmail(process.env.ADMIN_EMAIL);

  if (!adminEmail) {
    return;
  }

  await pool.query(
    `UPDATE users
     SET is_admin = TRUE,
         updated_at = CURRENT_TIMESTAMP
     WHERE LOWER(email) = $1
       AND is_admin = FALSE`,
    [adminEmail]
  );
}

function hasUsableEnvValue(value) {
  const normalized = String(value || "").trim();

  if (!normalized) {
    return false;
  }

  return !/^(replace-|your-)/i.test(normalized);
}

function shouldRejectSmtpTlsUnauthorized() {
  return String(process.env.SMTP_TLS_REJECT_UNAUTHORIZED || "").trim().toLowerCase() !== "false";
}

function isPasswordResetEmailConfigured() {
  if (!nodemailer) {
    return false;
  }

  const from = process.env.SMTP_FROM?.trim();
  if (!hasUsableEnvValue(from)) {
    return false;
  }

  const smtpUrl = process.env.SMTP_URL?.trim();
  if (hasUsableEnvValue(smtpUrl)) {
    return true;
  }

  const host = process.env.SMTP_HOST?.trim();
  const port = process.env.SMTP_PORT?.trim();
  if (!hasUsableEnvValue(host) || !hasUsableEnvValue(port)) {
    return false;
  }

  // Gmail requires authenticated SMTP with an app password.
  if (/smtp\.gmail\.com/i.test(host)) {
    return hasUsableEnvValue(process.env.SMTP_USER) && hasUsableEnvValue(process.env.SMTP_PASS);
  }

  return true;
}

function createPasswordResetTransport() {
  if (!nodemailer) {
    return null;
  }

  const smtpUrl = process.env.SMTP_URL?.trim();
  if (hasUsableEnvValue(smtpUrl)) {
    return nodemailer.createTransport(smtpUrl);
  }

  const host = process.env.SMTP_HOST?.trim();
  const port = Number.parseInt(process.env.SMTP_PORT || "", 10);
  const from = process.env.SMTP_FROM?.trim();

  if (!hasUsableEnvValue(host) || !Number.isInteger(port) || !hasUsableEnvValue(from)) {
    return null;
  }

  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS ?? "";
  if (/smtp\.gmail\.com/i.test(host) && (!hasUsableEnvValue(user) || !hasUsableEnvValue(pass))) {
    return null;
  }

  const secure = String(process.env.SMTP_SECURE || "").trim().toLowerCase() === "true" || port === 465;

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: user ? { user, pass } : undefined,
    tls: {
      rejectUnauthorized: shouldRejectSmtpTlsUnauthorized(),
    },
  });
}

async function sendPasswordResetEmail({ req, email, name, token }) {
  const resetUrl = buildPasswordResetUrl(req, token);
  const previewOnly = !isProduction && !isPasswordResetEmailConfigured();

  if (previewOnly) {
    console.info(`Password reset preview for ${email}: ${resetUrl}`);
    return { delivered: false, previewUrl: resetUrl };
  }

  const transport = createPasswordResetTransport();
  if (!transport) {
    throw new Error("Password reset email is not configured.");
  }

  const from = process.env.SMTP_FROM?.trim();
  const appName = process.env.APP_NAME?.trim() || "AIC Ziwani";
  const safeName = name?.trim() || "there";

  await transport.sendMail({
    from,
    to: email,
    subject: `${appName} password reset`,
    text: [
      `Hi ${safeName},`,
      "",
      "We received a request to reset your password.",
      `Use this link to set a new password: ${resetUrl}`,
      "",
      "This link expires in 1 hour.",
      "If you did not request this, you can safely ignore this email.",
    ].join("\n"),
    html: `
      <p>Hi ${safeName},</p>
      <p>We received a request to reset your password.</p>
      <p><a href="${resetUrl}">Set a new password</a></p>
      <p>This link expires in 1 hour.</p>
      <p>If you did not request this, you can safely ignore this email.</p>
    `,
  });

  return { delivered: true, previewUrl: null };
}

function normalizeEmail(email) {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

function hashResetToken(token) {
  return crypto
    .createHash("sha256")
    .update(String(token || ""))
    .digest("hex");
}

function generatePasswordResetToken() {
  return crypto.randomBytes(32).toString("hex");
}

function isStrongPassword(password) {
  return typeof password === "string" && password.length >= 8;
}

function getAppBaseUrl(req) {
  const configuredOrigin = process.env.APP_ORIGIN?.trim();
  if (configuredOrigin) {
    return configuredOrigin.replace(/\/+$/, "");
  }

  return `${req.protocol}://${req.get("host")}`;
}

function getApiBaseUrl(req) {
  return `${req.protocol}://${req.get("host")}`;
}

function buildPasswordResetUrl(req, token) {
  const resetUrl = new URL("/reset-password.html", getAppBaseUrl(req));
  resetUrl.searchParams.set("token", token);
  resetUrl.searchParams.set("apiOrigin", getApiBaseUrl(req));
  return resetUrl.toString();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildSafeSpreadsheetFileName(title) {
  const slug = String(title || "event-rsvps")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

  return `${slug || "event-rsvps"}-rsvps.xls`;
}

function isAllowedAvatarUrl(value) {
  if (typeof value !== "string") {
    return false;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return false;
  }

  if (trimmed.startsWith("/uploads/")) {
    return true;
  }

  if (trimmed.startsWith("data:image/")) {
    return true;
  }

  try {
    const url = new URL(trimmed);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch (error) {
    return false;
  }
}

function deleteLocalUploadIfPresent(imageUrl) {
  if (!imageUrl?.startsWith("/uploads/")) {
    return;
  }

  const filename = path.basename(imageUrl);
  const filePath = path.join(uploadsDir, filename);

  fs.unlink(filePath, (err) => {
    if (err && err.code !== "ENOENT") {
      console.error(`Failed to delete file: ${filePath}`, err);
    }
  });
}

function isValidDisplayName(value) {
  return typeof value === "string" && value.trim().length >= 2 && value.trim().length <= 60;
}

function getAvatarUploadStorage() {
  return isCloudinaryConfigured() ? multer.memoryStorage() : storage;
}

function avatarFileFilter(req, file, cb) {
  if (!file?.mimetype?.startsWith("image/")) {
    cb(new Error("Please upload an image file."));
    return;
  }

  cb(null, true);
}

function loginUpdatedUser(req, user) {
  return new Promise((resolve, reject) => {
    req.login(user, (error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

async function getAdminEventRsvpDetails(eventId) {
  const eventResult = await pool.query(
    `SELECT
       e.id,
       e.title,
       e.description,
       e.event_date,
       e.event_time,
       e.target_gender,
       s.name AS fellowship_name,
       COUNT(er.user_id)::int AS rsvp_count
     FROM events e
     LEFT JOIN services s ON s.id = e.fellowship_id
     LEFT JOIN event_rsvps er ON er.event_id = e.id
     WHERE e.id = $1
     GROUP BY e.id, s.name
     LIMIT 1`,
    [eventId]
  );

  if (eventResult.rows.length === 0) {
    return null;
  }

  const attendeeResult = await pool.query(
    `SELECT
       u.id AS user_id,
       COALESCE(NULLIF(TRIM(u.name), ''), SPLIT_PART(u.email, '@', 1)) AS display_name,
       u.email,
       er.created_at AS responded_at
     FROM event_rsvps er
     JOIN users u ON u.id = er.user_id
     WHERE er.event_id = $1
     ORDER BY er.created_at ASC`,
    [eventId]
  );

  return {
    ...eventResult.rows[0],
    attendees: attendeeResult.rows,
  };
}

function getPostLoginRedirect(user, fallback = "/") {
  if (user?.isAdmin) {
    return "/admin.html";
  }

  const safeFallback = getSafeReturnTo(fallback);

  if (!user?.gender) {
    const profilePromptTarget = new URL("/index.html", "http://127.0.0.1");
    profilePromptTarget.searchParams.set("completeProfile", "1");

    if (safeFallback && safeFallback !== "/" && safeFallback !== "/index.html") {
      profilePromptTarget.searchParams.set("returnTo", safeFallback);
    }

    return `${profilePromptTarget.pathname}${profilePromptTarget.search}`;
  }

  return safeFallback;
}

function getSafeReturnTo(value) {
  if (typeof value !== "string") {
    return "/";
  }

  if (value.startsWith("/")) {
    if (value.startsWith("//")) {
      return "/";
    }

    return value;
  }

  try {
    const target = new URL(value);
    const isLocalTarget = ["localhost", "127.0.0.1"].includes(target.hostname);
    const isHttp = target.protocol === "http:" || target.protocol === "https:";

    if (isLocalTarget && isHttp) {
      return target.toString();
    }
  } catch (error) {
    return "/";
  }

  return "/";
}

app.use(cors({
  origin(origin, callback) {
    if (
      !origin ||
      origin === "null" ||
      allowLocalOrigin.test(origin) ||
      allowedOrigins.has(origin)
    ) {
      return callback(null, true);
    }

    return callback(new Error("Origin not allowed by CORS"));
  },
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.get("/runtime-config.js", (req, res) => {
  const apiOrigin = (process.env.API_ORIGIN || "").trim().replace(/\/+$/, "");
  const runtimeConfig = `window.__CYA_RUNTIME_CONFIG__ = ${JSON.stringify({ apiOrigin })};\n`;

  res.type("application/javascript");
  res.set("Cache-Control", "no-store");
  res.send(runtimeConfig);
});
app.use(express.static(clientDir));
app.use("/uploads", express.static(uploadsDir));

function isCloudinaryConfigured() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
}

function getCloudinaryFolder() {
  return process.env.CLOUDINARY_FOLDER?.trim() || "cya-platform/gallery";
}

function buildCloudinarySignature(params, apiSecret) {
  const stringToSign = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  return crypto
    .createHash("sha1")
    .update(`${stringToSign}${apiSecret}`)
    .digest("hex");
}

function getCloudinaryResourceType(file) {
  if (file?.mimetype?.startsWith("video/")) {
    return "video";
  }

  if (file?.mimetype?.startsWith("image/")) {
    return "image";
  }

  return "raw";
}

async function uploadToCloudinary(file) {
  const timestamp = Math.floor(Date.now() / 1000);
  const resourceType = getCloudinaryResourceType(file);
  const folder = getCloudinaryFolder();
  const signature = buildCloudinarySignature(
    { folder, timestamp },
    process.env.CLOUDINARY_API_SECRET
  );
  const formData = new FormData();

  formData.append(
    "file",
    new Blob([file.buffer], { type: file.mimetype || "application/octet-stream" }),
    file.originalname || `upload-${Date.now()}`
  );
  formData.append("api_key", process.env.CLOUDINARY_API_KEY);
  formData.append("timestamp", String(timestamp));
  formData.append("folder", folder);
  formData.append("signature", signature);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`,
    {
      method: "POST",
      body: formData,
    }
  );
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error?.message || "Cloudinary upload failed.");
  }

  return {
    imageUrl: data.secure_url,
    publicId: data.public_id,
    resourceType: data.resource_type || resourceType,
  };
}

async function destroyCloudinaryAsset(publicId, resourceType = "image") {
  const timestamp = Math.floor(Date.now() / 1000);
  const invalidate = "true";
  const signature = buildCloudinarySignature(
    { invalidate, public_id: publicId, timestamp },
    process.env.CLOUDINARY_API_SECRET
  );
  const body = new URLSearchParams({
    public_id: publicId,
    api_key: process.env.CLOUDINARY_API_KEY,
    timestamp: String(timestamp),
    invalidate,
    signature,
  });

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/${resourceType}/destroy`,
    {
      method: "POST",
      body,
    }
  );
  const data = await response.json();

  if (!response.ok || data.result === "not found") {
    throw new Error(data?.error?.message || `Cloudinary destroy failed for ${publicId}.`);
  }
}

app.get("/auth/google", (req, res, next) => {
  if (!isGoogleAuthReady()) {
    return res.status(503).json({ error: getAuthUnavailableMessage() });
  }

  if (req.session) {
    req.session.returnTo = getSafeReturnTo(req.query.returnTo);
  }

  return passport.authenticate("google", {
    scope: ["profile", "email"],
  })(req, res, next);
});

app.get("/auth/google/callback", (req, res, next) => {
  if (!isGoogleAuthReady()) {
    return res.status(503).json({ error: getAuthUnavailableMessage() });
  }

  return passport.authenticate("google", {
    failureRedirect: "/",
  })(req, res, next);
}, (req, res) => {
  const returnTo = getPostLoginRedirect(req.user, req.session?.returnTo);

  if (req.session) {
    delete req.session.returnTo;
  }

  res.redirect(returnTo);
});

app.get("/api/auth/user", (req, res) => {
  if (req.isAuthenticated()) {
    return res.json({
      ...req.user,
      needsGender: !req.user.isAdmin && !req.user.gender,
    });
  }

  return res.status(401).json({ error: "Not logged in" });
});

app.patch("/api/profile", ensureUserAuthenticated, async (req, res) => {
  try {
    const providedName = typeof req.body?.displayName === "string" ? req.body.displayName.trim() : "";
    const providedAvatarUrl = typeof req.body?.avatarUrl === "string" ? req.body.avatarUrl.trim() : "";

    if (!isValidDisplayName(providedName)) {
      return res.status(400).json({ error: "Display name must be between 2 and 60 characters." });
    }

    if (providedAvatarUrl && !isAllowedAvatarUrl(providedAvatarUrl)) {
      return res.status(400).json({ error: "Please choose a valid avatar." });
    }

    const currentUserResult = await pool.query(
      "SELECT id, name, email, gender, google_id, avatar_url, is_admin FROM users WHERE id = $1",
      [req.user.id]
    );

    if (currentUserResult.rows.length === 0) {
      return res.status(404).json({ error: "User account not found." });
    }

    const currentUser = currentUserResult.rows[0];
    const nextAvatarUrl = providedAvatarUrl || currentUser.avatar_url || null;

    const updateResult = await pool.query(
      `UPDATE users
       SET name = $1,
           avatar_url = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING id, name, email, gender, google_id, avatar_url, is_admin`,
      [providedName, nextAvatarUrl, req.user.id]
    );

    const updatedUser = updateResult.rows[0];
    const sessionUser = buildSessionUser(updatedUser);
    await loginUpdatedUser(req, sessionUser);

    if (currentUser.avatar_url && currentUser.avatar_url !== updatedUser.avatar_url) {
      deleteLocalUploadIfPresent(currentUser.avatar_url);
    }

    return res.json({
      message: "Profile updated successfully.",
      user: {
        ...sessionUser,
        needsGender: !sessionUser.isAdmin && !sessionUser.gender,
      },
    });
  } catch (error) {
    console.error("Profile update error:", error);
    return res.status(500).json({ error: "Could not update your profile right now." });
  }
});

app.get("/api/profile/saved-content", ensureUserAuthenticated, async (req, res) => {
  try {
    const userId = req.user.id;

    const [savedBlogsResult, savedGalleryResult] = await Promise.all([
      pool.query(
        `SELECT
           b.id,
           b.title,
           b.content,
           b.created_at,
           bs.created_at AS saved_at
         FROM blog_saves bs
         JOIN blogs b ON b.id = bs.blog_id
         WHERE bs.user_id = $1
         ORDER BY bs.created_at DESC`,
        [userId]
      ),
      pool.query(
        `SELECT
           g.id,
           g.title,
           g.image_url,
           g.created_at,
           gs.created_at AS saved_at
         FROM gallery_saves gs
         JOIN gallery g ON g.id = gs.gallery_id
         WHERE gs.user_id = $1
         ORDER BY gs.created_at DESC`,
        [userId]
      ),
    ]);

    return res.json({
      blogs: savedBlogsResult.rows,
      gallery: savedGalleryResult.rows,
    });
  } catch (error) {
    console.error("Saved content load error:", error);
    return res.status(500).json({ error: "Could not load saved content right now." });
  }
});

app.get("/api/auth/logout", (req, res) => {
  req.logout(() => {
    res.json({ message: "Logged out" });
  });
});

app.get("/api/fellowship/posts", async (req, res) => {
  try {
    const postsResult = await pool.query(
      `SELECT
         fp.*,
         COALESCE(u.name, fp.author_name) AS author_display_name
       FROM fellowship_posts fp
       LEFT JOIN users u ON fp.author_id = u.id
       ORDER BY fp.created_at DESC`
    );

    const commentsResult = await pool.query(
      `SELECT
         fc.*,
         COALESCE(u.name, fc.author_name) AS author_display_name
       FROM fellowship_comments fc
       LEFT JOIN users u ON fc.author_id = u.id
       ORDER BY fc.created_at ASC`
    );

    const commentsByPostId = commentsResult.rows.reduce((map, comment) => {
      if (!map.has(comment.post_id)) {
        map.set(comment.post_id, []);
      }
      map.get(comment.post_id).push(comment);
      return map;
    }, new Map());

    const posts = postsResult.rows.map((post) => ({
      ...post,
      comments: commentsByPostId.get(post.id) || []
    }));

    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/fellowship/posts", ensureUserAuthenticated, async (req, res) => {
  try {
    const { title, content, category, target_gender } = req.body;
    const normalizedCategory = typeof category === "string" ? category.trim().toLowerCase() : "discussion";
    const normalizedTargetGender = typeof target_gender === "string" ? target_gender.trim().toLowerCase() : "all";

    if (!title || !content) {
      return res.status(400).json({ error: "Title and content are required." });
    }

    if (!isValidFellowshipCategory(normalizedCategory)) {
      return res.status(400).json({ error: "Invalid fellowship category." });
    }

    if (!isValidTargetGender(normalizedTargetGender)) {
      return res.status(400).json({ error: "Invalid target group." });
    }

    if (!canContributeToFellowshipTarget(req.user, normalizedTargetGender)) {
      return res.status(403).json({ error: "You can only post to your own fellowship space or the shared board." });
    }

    const result = await pool.query(
      `INSERT INTO fellowship_posts (author_id, author_name, title, content, category, target_gender)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        req.user.id,
        req.user.displayName || "Community Member",
        title.trim(),
        content.trim(),
        normalizedCategory,
        normalizedTargetGender
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/fellowship/posts/:id/comments", ensureUserAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: "Comment content is required." });
    }

    const postResult = await pool.query(
      "SELECT id, target_gender FROM fellowship_posts WHERE id = $1",
      [id]
    );

    if (postResult.rows.length === 0) {
      return res.status(404).json({ error: "Fellowship post not found." });
    }

    const post = postResult.rows[0];

    if (!canContributeToFellowshipTarget(req.user, post.target_gender)) {
      return res.status(403).json({ error: "You can only comment in your own fellowship space or the shared board." });
    }

    const result = await pool.query(
      `INSERT INTO fellowship_comments (post_id, author_id, author_name, content)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [id, req.user.id, req.user.displayName || "Community Member", content.trim()]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/users", ensureAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name, email, google_id, is_admin, created_at FROM users ORDER BY created_at DESC"
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function wantsJson(req) {
  const acceptHeader = req.get("accept") || "";
  const requestedWith = req.get("x-requested-with") || "";

  return acceptHeader.includes("application/json") || requestedWith === "fetch";
}

function sendGalleryUploadResponse(req, res, statusCode, payload) {
  if (wantsJson(req)) {
    return res.status(statusCode).json(payload);
  }

  const target = new URL("/admin-gallery.html", `http://127.0.0.1:${PORT}`);

  if (statusCode >= 400) {
    target.searchParams.set("error", payload.error || "Upload failed");
  } else {
    target.searchParams.set("message", payload.message || "Upload successful");
  }

  return res.redirect(statusCode >= 400 ? 303 : 302, `${target.pathname}${target.search}`);
}

app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password, gender } = req.body;
    const isBootstrapAdmin = isBootstrapAdminEmail(email);
    const normalizedGender = typeof gender === "string" ? gender.trim().toLowerCase() : "";

    if (!name || !email || !password || (!isBootstrapAdmin && !normalizedGender)) {
      return res.status(400).json({ error: isBootstrapAdmin ? "Name, email, and password are required." : "Name, email, password, and gender are required." });
    }

    if (normalizedGender && !isValidUserGender(normalizedGender)) {
      return res.status(400).json({ error: "Please choose a valid gender." });
    }

    const userCheck = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
    if (userCheck.rows.length > 0) {
      return res.status(409).json({ error: "An account with that email already exists." });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      "INSERT INTO users (name, email, password_hash, gender, is_admin) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [name, email, passwordHash, isBootstrapAdmin ? null : normalizedGender, isBootstrapAdmin]
    );

    const newUser = buildSessionUser(result.rows[0]);

    req.login(newUser, (err) => {
      if (err) return res.status(500).json({ error: "Login failed after registration." });
      res.status(201).json({
        message: "Account created successfully!",
        user: newUser,
        redirectTo: getPostLoginRedirect(newUser),
      });
    });
  } catch (error) {
    console.error("Registration Error:", error);
    res.status(500).json({ error: "Internal server error during registration." });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    const row = result.rows[0];

    if (!row || !row.password_hash || !(await bcrypt.compare(password, row.password_hash))) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    if (!row.is_admin && isBootstrapAdminEmail(row.email)) {
      const adminBootstrapResult = await pool.query(
        `UPDATE users
         SET is_admin = TRUE,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1
         RETURNING *`,
        [row.id]
      );
      if (adminBootstrapResult.rows[0]) {
        row.is_admin = adminBootstrapResult.rows[0].is_admin;
      }
    }

    const user = buildSessionUser(row);
    req.login(user, (err) => {
      if (err) return res.status(500).json({ error: "Internal server error during login." });
      res.status(200).json({
        message: "Login successful",
        user,
        redirectTo: getPostLoginRedirect(user),
      });
    });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ error: "Internal server error during login." });
  }
});

app.post("/api/auth/forgot-password", async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    if (!email) {
      return res.status(400).json({ error: "Email is required." });
    }

    if (isProduction && !isPasswordResetEmailConfigured()) {
      return res.status(503).json({ error: "Password reset is not configured right now." });
    }

    const userResult = await pool.query(
      "SELECT id, name, email FROM users WHERE email = $1",
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(200).json({
        message: "If an account with that email exists, a password reset link has been sent.",
      });
    }

    const user = userResult.rows[0];
    const token = generatePasswordResetToken();
    const tokenHash = hashResetToken(token);

    await pool.query(
      `DELETE FROM password_reset_tokens
       WHERE user_id = $1
          OR expires_at < CURRENT_TIMESTAMP
          OR used_at IS NOT NULL`,
      [user.id]
    );

    await pool.query(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, CURRENT_TIMESTAMP + INTERVAL '1 hour')`,
      [user.id, tokenHash]
    );

    const mailResult = await sendPasswordResetEmail({
      req,
      email: user.email,
      name: user.name,
      token,
    });

    return res.status(200).json({
      message: "If an account with that email exists, a password reset link has been sent.",
      previewUrl: mailResult.previewUrl,
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return res.status(500).json({ error: "Could not start password reset right now." });
  }
});

app.get("/api/auth/reset-password/validate", async (req, res) => {
  try {
    const token = typeof req.query?.token === "string" ? req.query.token.trim() : "";
    if (!token) {
      return res.status(400).json({ error: "Reset token is required." });
    }

    const tokenHash = hashResetToken(token);
    const result = await pool.query(
      `SELECT id
       FROM password_reset_tokens
       WHERE token_hash = $1
         AND used_at IS NULL
         AND expires_at > CURRENT_TIMESTAMP
       LIMIT 1`,
      [tokenHash]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: "This password reset link is invalid or has expired." });
    }

    return res.json({ valid: true });
  } catch (error) {
    console.error("Reset password validation error:", error);
    return res.status(500).json({ error: "Could not validate reset link right now." });
  }
});

app.post("/api/auth/reset-password", async (req, res) => {
  let client;

  try {
    client = await pool.connect();
    const token = typeof req.body?.token === "string" ? req.body.token.trim() : "";
    const password = typeof req.body?.password === "string" ? req.body.password : "";

    if (!token || !password) {
      return res.status(400).json({ error: "Reset token and new password are required." });
    }

    if (!isStrongPassword(password)) {
      return res.status(400).json({ error: "Password must be at least 8 characters long." });
    }

    const tokenHash = hashResetToken(token);
    const tokenResult = await pool.query(
      `SELECT id, user_id
       FROM password_reset_tokens
       WHERE token_hash = $1
         AND used_at IS NULL
         AND expires_at > CURRENT_TIMESTAMP
       LIMIT 1`,
      [tokenHash]
    );

    if (tokenResult.rows.length === 0) {
      return res.status(400).json({ error: "This password reset link is invalid or has expired." });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const resetToken = tokenResult.rows[0];

    await client.query("BEGIN");
    await client.query(
      "UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
      [passwordHash, resetToken.user_id]
    );
    await client.query(
      "UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP WHERE id = $1",
      [resetToken.id]
    );
    await client.query(
      "DELETE FROM password_reset_tokens WHERE user_id = $1 AND id <> $2",
      [resetToken.user_id, resetToken.id]
    );
    await client.query("COMMIT");

    return res.json({ message: "Your password has been reset successfully. You can now log in." });
  } catch (error) {
    if (client) {
      await client.query("ROLLBACK").catch(() => {});
    }
    console.error("Reset password error:", error);
    return res.status(500).json({ error: "Could not reset password right now." });
  } finally {
    client?.release();
  }
});

app.post("/api/auth/complete-profile", ensureUserAuthenticated, async (req, res) => {
  try {
    if (req.user?.isAdmin) {
      return res.status(200).json({
        message: "Admin accounts can stay neutral.",
        user: {
          ...req.user,
          needsGender: false,
        },
      });
    }

    const normalizedGender = typeof req.body?.gender === "string"
      ? req.body.gender.trim().toLowerCase()
      : "";

    if (!isValidUserGender(normalizedGender)) {
      return res.status(400).json({ error: "Please choose a valid gender." });
    }

    const userResult = await pool.query(
      "SELECT id, name, email, gender, google_id, avatar_url, is_admin FROM users WHERE id = $1",
      [req.user.id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "User account not found." });
    }

    const userRow = userResult.rows[0];

    if (userRow.gender) {
      return res.status(409).json({
        error: "Gender has already been set for this account.",
        user: {
          ...buildSessionUser(userRow),
          needsGender: false,
        },
      });
    }

    const updatedResult = await pool.query(
      `UPDATE users
       SET gender = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING id, name, email, gender, google_id, avatar_url, is_admin`,
      [normalizedGender, req.user.id]
    );

    const updatedUser = updatedResult.rows[0];
    req.user.gender = updatedUser.gender;

    return res.status(200).json({
      message: "Profile updated successfully.",
      user: {
        ...buildSessionUser(updatedUser),
        needsGender: false,
      },
    });
  } catch (error) {
    console.error("Complete profile error:", error);
    return res.status(500).json({ error: "Internal server error while updating your profile." });
  }
});

app.get("/api", (req, res) => {
  res.json({ message: "API running clean" });
});

app.get("/api/blogs", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM blogs ORDER BY created_at DESC"
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/blogs/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || null;

    const blogResult = await pool.query("SELECT * FROM blogs WHERE id = $1", [id]);

    if (blogResult.rows.length === 0) {
      return res.status(404).json({ error: "Blog post not found." });
    }

    const blog = blogResult.rows[0];

    const commentsQuery = userId
      ? `SELECT
           bc.*,
           (SELECT COUNT(*) FROM blog_comment_likes bcl WHERE bcl.comment_id = bc.id) AS likes,
           EXISTS(SELECT 1 FROM blog_comment_likes bcl WHERE bcl.comment_id = bc.id AND bcl.user_id = $2) AS user_has_liked
         FROM blog_comments bc
         WHERE bc.blog_id = $1
         ORDER BY bc.created_at ASC`
      : `SELECT
           bc.*,
           (SELECT COUNT(*) FROM blog_comment_likes bcl WHERE bcl.comment_id = bc.id) AS likes,
           false AS user_has_liked
         FROM blog_comments bc
         WHERE bc.blog_id = $1
         ORDER BY bc.created_at ASC`;

    const [commentsResult, likesResult, likedResult, savedResult] = await Promise.all([
      pool.query(commentsQuery, userId ? [id, userId] : [id]),
      pool.query("SELECT COUNT(*) FROM blog_likes WHERE blog_id = $1", [id]),
      userId
        ? pool.query(
            "SELECT EXISTS(SELECT 1 FROM blog_likes WHERE blog_id = $1 AND user_id = $2) AS liked",
            [id, userId]
          )
        : Promise.resolve({ rows: [{ liked: false }] }),
      userId
        ? pool.query(
            "SELECT EXISTS(SELECT 1 FROM blog_saves WHERE blog_id = $1 AND user_id = $2) AS saved",
            [id, userId]
          )
        : Promise.resolve({ rows: [{ saved: false }] })
    ]);

    blog.comments = commentsResult.rows.map((comment) => ({
      ...comment,
      likes: parseInt(comment.likes, 10) || 0,
      userHasLiked: Boolean(comment.user_has_liked),
    }));
    blog.likes = parseInt(likesResult.rows[0].count, 10);
    blog.userHasLiked = Boolean(likedResult.rows[0].liked);
    blog.userHasSaved = Boolean(savedResult.rows[0].saved);

    res.json(blog);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/blogs", ensureAdmin, async (req, res) => {
  try {
    const { title, content } = req.body;

    const result = await pool.query(
      "INSERT INTO blogs (title, content) VALUES ($1, $2) RETURNING *",
      [title, content]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/blogs/:id", ensureAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query("DELETE FROM blogs WHERE id = $1", [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Blog post not found." });
    }

    res.status(200).json({ message: "Blog post deleted successfully." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/blogs/:id/comments", ensureUserAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const parentCommentId = req.body?.parentCommentId == null || req.body.parentCommentId === ""
      ? null
      : Number.parseInt(req.body.parentCommentId, 10);
    const authorName = req.user?.displayName || req.user?.emails?.[0]?.value || "Community Member";

    if (!content || !content.trim()) {
      return res.status(400).json({ error: "Comment content is required." });
    }

    if (parentCommentId !== null && (!Number.isInteger(parentCommentId) || parentCommentId <= 0)) {
      return res.status(400).json({ error: "A valid parent comment is required for replies." });
    }

    if (parentCommentId !== null) {
      const parentResult = await pool.query(
        "SELECT id FROM blog_comments WHERE id = $1 AND blog_id = $2",
        [parentCommentId, id]
      );

      if (parentResult.rows.length === 0) {
        return res.status(404).json({ error: "The comment you are replying to could not be found." });
      }
    }

    const result = await pool.query(
      `INSERT INTO blog_comments (blog_id, parent_comment_id, author_name, content)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [id, parentCommentId, authorName, content.trim()]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/blogs/:id/like", ensureUserAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const blogResult = await pool.query("SELECT 1 FROM blogs WHERE id = $1", [id]);
    if (blogResult.rows.length === 0) {
      return res.status(404).json({ error: "Blog post not found." });
    }

    await pool.query(
      `INSERT INTO blog_likes (blog_id, user_id)
       VALUES ($1, $2)
       ON CONFLICT (blog_id, user_id) DO NOTHING`,
      [id, userId]
    );

    const likesResult = await pool.query("SELECT COUNT(*) FROM blog_likes WHERE blog_id = $1", [id]);
    const likeCount = parseInt(likesResult.rows[0].count, 10);

    res.status(200).json({ likes: likeCount, liked: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/blogs/:id/like", ensureUserAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const blogResult = await pool.query("SELECT 1 FROM blogs WHERE id = $1", [id]);
    if (blogResult.rows.length === 0) {
      return res.status(404).json({ error: "Blog post not found." });
    }

    await pool.query("DELETE FROM blog_likes WHERE blog_id = $1 AND user_id = $2", [id, userId]);

    const likesResult = await pool.query("SELECT COUNT(*) FROM blog_likes WHERE blog_id = $1", [id]);
    const likeCount = parseInt(likesResult.rows[0].count, 10);

    res.status(200).json({ likes: likeCount, liked: false });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/blog-comments/:id/like", ensureUserAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const commentResult = await pool.query("SELECT 1 FROM blog_comments WHERE id = $1", [id]);
    if (commentResult.rows.length === 0) {
      return res.status(404).json({ error: "Comment not found." });
    }

    await pool.query(
      `INSERT INTO blog_comment_likes (comment_id, user_id)
       VALUES ($1, $2)
       ON CONFLICT (comment_id, user_id) DO NOTHING`,
      [id, userId]
    );

    const likesResult = await pool.query("SELECT COUNT(*) FROM blog_comment_likes WHERE comment_id = $1", [id]);
    return res.status(200).json({
      likes: parseInt(likesResult.rows[0].count, 10),
      liked: true,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.delete("/api/blog-comments/:id/like", ensureUserAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const commentResult = await pool.query("SELECT 1 FROM blog_comments WHERE id = $1", [id]);
    if (commentResult.rows.length === 0) {
      return res.status(404).json({ error: "Comment not found." });
    }

    await pool.query("DELETE FROM blog_comment_likes WHERE comment_id = $1 AND user_id = $2", [id, userId]);

    const likesResult = await pool.query("SELECT COUNT(*) FROM blog_comment_likes WHERE comment_id = $1", [id]);
    return res.status(200).json({
      likes: parseInt(likesResult.rows[0].count, 10),
      liked: false,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.post("/api/blogs/:id/save", ensureUserAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const blogResult = await pool.query("SELECT 1 FROM blogs WHERE id = $1", [id]);
    if (blogResult.rows.length === 0) {
      return res.status(404).json({ error: "Blog post not found." });
    }

    await pool.query(
      `INSERT INTO blog_saves (blog_id, user_id)
       VALUES ($1, $2)
       ON CONFLICT (blog_id, user_id) DO NOTHING`,
      [id, userId]
    );

    return res.status(200).json({ saved: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.delete("/api/blogs/:id/save", ensureUserAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const blogResult = await pool.query("SELECT 1 FROM blogs WHERE id = $1", [id]);
    if (blogResult.rows.length === 0) {
      return res.status(404).json({ error: "Blog post not found." });
    }

    await pool.query("DELETE FROM blog_saves WHERE blog_id = $1 AND user_id = $2", [id, userId]);

    return res.status(200).json({ saved: false });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.get("/api/services", async (req, res) => {
  try {
    const userGender = req.user?.gender;
    const isAdminRequest = Boolean(req.user?.isAdmin);

    let query;
    let params = [];

    if (isAdminRequest) {
      query = "SELECT * FROM services ORDER BY name ASC";
    } else if (userGender && (userGender === 'male' || userGender === 'female')) {
      query = "SELECT * FROM services WHERE target_gender = 'all' OR target_gender = $1 ORDER BY name ASC";
      params = [userGender];
    } else {
      // For guests or users without gender set
      query = "SELECT * FROM services WHERE target_gender = 'all' ORDER BY name ASC";
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/services", ensureAdmin, async (req, res) => {
  try {
    const { name, description, service_day, service_time, target_gender } = req.body;
    const result = await pool.query(
      "INSERT INTO services (name, description, service_day, service_time, target_gender) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [name, description || null, service_day || null, service_time || null, target_gender || 'all']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/services/:id", ensureAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query("DELETE FROM services WHERE id = $1", [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Ministry/Service not found." });
    }
    res.status(200).json({ message: "Ministry/Service deleted successfully." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/events", async (req, res) => {
  try {
    const userId = req.user?.id;
    const userGender = req.user?.gender;
    const isAdminRequest = Boolean(req.user?.isAdmin);
    let result;

    let baseQuery = `
      SELECT 
        e.*, 
        s.name AS fellowship_name,
        (SELECT COUNT(*) FROM event_rsvps er WHERE er.event_id = e.id) as rsvp_count
      FROM events e
      LEFT JOIN services s ON e.fellowship_id = s.id
      WHERE 1 = 1
    `;
    const queryParams = [];
    let paramIndex = 1;

    // Filter by user gender for events not specifically tied to a fellowship
    if (isAdminRequest) {
      // Admin can review every event regardless of target gender.
    } else if (userGender && (userGender === 'male' || userGender === 'female')) {
      baseQuery += ` AND (e.target_gender = 'all' OR e.target_gender = $${paramIndex++})`;
      queryParams.push(userGender);
    } else {
      // For guests or users without gender set, only show 'all' gender events
      baseQuery += ` AND e.target_gender = 'all'`;
    }

    baseQuery += `
      ORDER BY
        CASE WHEN e.event_date >= CURRENT_DATE THEN 0 ELSE 1 END ASC,
        CASE WHEN e.event_date >= CURRENT_DATE THEN e.event_date END ASC,
        CASE WHEN e.event_date >= CURRENT_DATE THEN e.event_time END ASC,
        CASE WHEN e.event_date < CURRENT_DATE THEN e.event_date END DESC,
        CASE WHEN e.event_date < CURRENT_DATE THEN e.event_time END DESC
    `;

    if (userId) {
      result = await pool.query(
        `SELECT *, EXISTS(SELECT 1 FROM event_rsvps er WHERE er.event_id = e.id AND er.user_id = $${paramIndex++}) as user_rsvpd FROM (${baseQuery}) AS e`,
        [...queryParams, userId]
      );
    } else {
      result = await pool.query(
        `SELECT *, false as user_rsvpd FROM (${baseQuery}) AS e`,
        queryParams
      );
    }
    
    const events = await Promise.all(result.rows.map(async (event) => {
      let rsvpUserNames = [];

      if (isAdminRequest) {
        const rsvpUsersResult = await pool.query(
          `SELECT COALESCE(NULLIF(TRIM(name), ''), SPLIT_PART(email, '@', 1)) AS display_name
           FROM event_rsvps er
           JOIN users u ON u.id = er.user_id
           WHERE er.event_id = $1
           ORDER BY er.created_at ASC`,
          [event.id]
        );

        rsvpUserNames = rsvpUsersResult.rows
          .map((row) => row.display_name)
          .filter(Boolean);
      }

      return {
        ...event,
        rsvp_count: parseInt(event.rsvp_count, 10),
        rsvp_user_names: rsvpUserNames,
      };
    }));
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/events", ensureAdmin, async (req, res) => {
  try {
    const { title, date, time, description, fellowship_id, target_gender } = req.body;

    const result = await pool.query(
      "INSERT INTO events (title, event_date, event_time, description, fellowship_id, target_gender) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
      [title, date, time || null, description, fellowship_id || null, target_gender || 'all']
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/events/:id", ensureAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query("DELETE FROM events WHERE id = $1", [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Event not found." });
    }

    res.status(200).json({ message: "Event deleted successfully." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/events/:id/rsvps", ensureAdmin, async (req, res) => {
  try {
    const eventId = Number.parseInt(req.params.id, 10);

    if (!Number.isInteger(eventId)) {
      return res.status(400).json({ error: "A valid event id is required." });
    }

    const details = await getAdminEventRsvpDetails(eventId);

    if (!details) {
      return res.status(404).json({ error: "Event not found." });
    }

    return res.json(details);
  } catch (error) {
    console.error("Event RSVP detail error:", error);
    return res.status(500).json({ error: "Could not load RSVP details right now." });
  }
});

app.get("/api/events/:id/rsvps/export", ensureAdmin, async (req, res) => {
  try {
    const eventId = Number.parseInt(req.params.id, 10);

    if (!Number.isInteger(eventId)) {
      return res.status(400).json({ error: "A valid event id is required." });
    }

    const details = await getAdminEventRsvpDetails(eventId);

    if (!details) {
      return res.status(404).json({ error: "Event not found." });
    }

    const appName = process.env.APP_NAME?.trim() || "AIC Ziwani";
    const eventDateLabel = new Date(details.event_date).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const generatedAtLabel = new Date().toLocaleString();
    const audienceLabel = details.target_gender === "male"
      ? "Men Only"
      : details.target_gender === "female"
        ? "Women Only"
        : "Everyone";
    const descriptionLabel = details.description?.trim() || "No event description was added for this event.";

    const attendeeRows = details.attendees.length
      ? details.attendees.map((attendee, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${escapeHtml(attendee.display_name)}</td>
            <td>${escapeHtml(attendee.email)}</td>
            <td>${escapeHtml(new Date(attendee.responded_at).toLocaleString())}</td>
          </tr>
        `).join("")
      : `
          <tr>
            <td>1</td>
            <td colspan="3">No RSVPs yet</td>
          </tr>
        `;

    const worksheetHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office"
            xmlns:x="urn:schemas-microsoft-com:office:excel"
            xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8" />
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>RSVP Report</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayGridlines/>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <style>
          body {
            font-family: Arial, sans-serif;
            color: #111827;
            margin: 24px;
          }
          table {
            border-collapse: collapse;
            width: 100%;
          }
          .report-shell {
            width: 100%;
          }
          .hero {
            background: linear-gradient(135deg, #4d0f16 0%, #8c112b 52%, #c8102e 100%);
            color: #ffffff;
            padding: 24px 28px;
            border-radius: 18px;
          }
          .eyebrow {
            font-size: 11px;
            letter-spacing: 1.4px;
            text-transform: uppercase;
            opacity: 0.82;
            margin-bottom: 8px;
          }
          .hero-title {
            font-size: 28px;
            font-weight: bold;
            margin: 0 0 8px 0;
          }
          .hero-copy {
            font-size: 13px;
            line-height: 1.55;
            max-width: 720px;
          }
          .spacer {
            height: 18px;
          }
          .meta-grid {
            width: 100%;
            border-spacing: 0;
          }
          .meta-card {
            width: 25%;
            padding: 0 8px 0 0;
            vertical-align: top;
          }
          .meta-card-inner {
            background: #f8fafc;
            border: 1px solid #dbe3ee;
            border-radius: 14px;
            padding: 14px 16px;
          }
          .meta-label {
            display: block;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.9px;
            color: #6b7280;
            margin-bottom: 8px;
          }
          .meta-value {
            font-size: 15px;
            font-weight: bold;
            color: #111827;
          }
          .section-title {
            font-size: 18px;
            font-weight: bold;
            color: #111827;
            margin: 0 0 8px 0;
          }
          .section-copy {
            font-size: 13px;
            line-height: 1.6;
            color: #4b5563;
            margin: 0;
          }
          .attendee-table th,
          .attendee-table td {
            border: 1px solid #dbe3ee;
            padding: 10px 12px;
            text-align: left;
          }
          .attendee-table thead th {
            background: #eef2f7;
            color: #374151;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.8px;
          }
          .attendee-table tbody tr:nth-child(even) td {
            background: #fafbfc;
          }
          .attendee-table tbody td:first-child {
            width: 48px;
            text-align: center;
            font-weight: bold;
          }
          .footer-note {
            font-size: 11px;
            color: #6b7280;
            margin-top: 18px;
          }
        </style>
      </head>
      <body>
        <table class="report-shell">
          <tr>
            <td>
              <div class="hero">
                <div class="eyebrow">${escapeHtml(appName)} Reporting Export</div>
                <div class="hero-title">Event RSVP Report</div>
                <div class="hero-copy">
                  This worksheet captures the attendee list for <strong>${escapeHtml(details.title)}</strong>,
                  including contact details and RSVP timestamps for admin follow-up.
                </div>
              </div>
            </td>
          </tr>
        </table>

        <div class="spacer"></div>

        <table class="meta-grid">
          <tr>
            <td class="meta-card">
              <div class="meta-card-inner">
                <span class="meta-label">Event</span>
                <div class="meta-value">${escapeHtml(details.title)}</div>
              </div>
            </td>
            <td class="meta-card">
              <div class="meta-card-inner">
                <span class="meta-label">Date</span>
                <div class="meta-value">${escapeHtml(eventDateLabel)}</div>
              </div>
            </td>
            <td class="meta-card">
              <div class="meta-card-inner">
                <span class="meta-label">Audience</span>
                <div class="meta-value">${escapeHtml(audienceLabel)}</div>
              </div>
            </td>
            <td class="meta-card">
              <div class="meta-card-inner">
                <span class="meta-label">Total RSVPs</span>
                <div class="meta-value">${escapeHtml(details.rsvp_count)}</div>
              </div>
            </td>
          </tr>
        </table>

        <div class="spacer"></div>

        <table class="report-shell">
          <tr>
            <td>
              <div class="section-title">Event Summary</div>
              <p class="section-copy">
                <strong>Fellowship:</strong> ${escapeHtml(details.fellowship_name || "General event")}<br />
                <strong>Time:</strong> ${escapeHtml(details.event_time || "All Day")}<br />
                <strong>Generated:</strong> ${escapeHtml(generatedAtLabel)}<br />
                <strong>Description:</strong> ${escapeHtml(descriptionLabel)}
              </p>
            </td>
          </tr>
        </table>

        <div class="spacer"></div>

        <table class="attendee-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Name</th>
              <th>Email</th>
              <th>RSVP Time</th>
            </tr>
          </thead>
          <tbody>
            ${attendeeRows}
          </tbody>
        </table>

        <div class="footer-note">
          Generated from the ${escapeHtml(appName)} admin dashboard. This worksheet is intended for attendance follow-up and reporting.
        </div>
      </body>
      </html>
    `;

    res.setHeader("Content-Type", "application/vnd.ms-excel; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${buildSafeSpreadsheetFileName(details.title)}"`);
    return res.send(worksheetHtml);
  } catch (error) {
    console.error("Event RSVP export error:", error);
    return res.status(500).json({ error: "Could not export RSVP worksheet right now." });
  }
});

app.post("/api/events/:id/rsvp", ensureUserAuthenticated, async (req, res) => {
  try {
    const { id: eventId } = req.params;
    const userId = req.user.id;

    await pool.query(
      "INSERT INTO event_rsvps (event_id, user_id) VALUES ($1, $2)",
      [eventId, userId]
    );
    
    res.status(201).json({ message: "RSVP successful." });
  } catch (err) {
    if (err.code === '23505') { // unique_violation
      return res.status(409).json({ error: "You have already RSVP'd to this event." });
    }
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/events/:id/rsvp", ensureUserAuthenticated, async (req, res) => {
  try {
    const { id: eventId } = req.params;
    const userId = req.user.id;

    const result = await pool.query(
      "DELETE FROM event_rsvps WHERE event_id = $1 AND user_id = $2",
      [eventId, userId]
    );

    res.status(200).json({ message: "RSVP canceled successfully." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({
  storage: isCloudinaryConfigured() ? multer.memoryStorage() : storage,
});

const avatarUpload = multer({
  storage: getAvatarUploadStorage(),
  fileFilter: avatarFileFilter,
  limits: {
    fileSize: 4 * 1024 * 1024,
  },
});

app.post(
  "/api/profile/avatar",
  ensureUserAuthenticated,
  (req, res, next) => {
    avatarUpload.single("avatar")(req, res, (err) => {
      if (err) {
        console.error("AVATAR UPLOAD ERROR:", err);
        return res.status(400).json({ error: err.message || "Could not upload that image." });
      }

      next();
    });
  },
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Please choose an image to upload." });
      }

      const currentUserResult = await pool.query(
        "SELECT id, name, email, gender, google_id, avatar_url, is_admin FROM users WHERE id = $1",
        [req.user.id]
      );

      if (currentUserResult.rows.length === 0) {
        return res.status(404).json({ error: "User account not found." });
      }

      const currentUser = currentUserResult.rows[0];
      let avatarUrl;

      if (isCloudinaryConfigured()) {
        const uploadedAsset = await uploadToCloudinary(req.file);
        avatarUrl = uploadedAsset.imageUrl;
      } else {
        avatarUrl = `/uploads/${req.file.filename}`;
      }

      const updateResult = await pool.query(
        `UPDATE users
         SET avatar_url = $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2
         RETURNING id, name, email, gender, google_id, avatar_url, is_admin`,
        [avatarUrl, req.user.id]
      );

      const updatedUser = updateResult.rows[0];
      const sessionUser = buildSessionUser(updatedUser);
      await loginUpdatedUser(req, sessionUser);

      if (currentUser.avatar_url && currentUser.avatar_url !== updatedUser.avatar_url) {
        deleteLocalUploadIfPresent(currentUser.avatar_url);
      }

      return res.status(201).json({
        message: "Profile photo updated successfully.",
        user: {
          ...sessionUser,
          needsGender: !sessionUser.isAdmin && !sessionUser.gender,
        },
      });
    } catch (error) {
      console.error("Profile avatar upload error:", error);
      return res.status(500).json({ error: "Could not update your profile photo right now." });
    }
  }
);

app.get("/api/gallery", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM gallery ORDER BY created_at DESC"
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post(
  "/api/gallery",
  ensureAdmin,
  (req, res, next) => {
    upload.single("media")(req, res, (err) => {
      if (err) {
        console.error("MULTER ERROR:", err);
        return sendGalleryUploadResponse(req, res, 400, { error: `File upload error: ${err.message}` });
      }
      next();
    });
  },
  async (req, res) => {
    try {
      if (!req.file) {
        return sendGalleryUploadResponse(req, res, 400, { error: "No file uploaded" });
      }

      const { title } = req.body;
      let mediaUrl;
      let storageProvider = "local";
      let storagePublicId = null;
      let storageResourceType = null;

      if (isCloudinaryConfigured()) {
        const uploadedAsset = await uploadToCloudinary(req.file);
        mediaUrl = uploadedAsset.imageUrl;
        storageProvider = "cloudinary";
        storagePublicId = uploadedAsset.publicId;
        storageResourceType = uploadedAsset.resourceType;
      } else {
        mediaUrl = `/uploads/${req.file.filename}`;
      }

      const result = await pool.query(
        `INSERT INTO gallery (
          title,
          image_url,
          storage_provider,
          storage_public_id,
          storage_resource_type
        ) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [title, mediaUrl, storageProvider, storagePublicId, storageResourceType]
      );

      return sendGalleryUploadResponse(req, res, 201, {
        message: "Upload successful",
        data: result.rows[0],
      });
    } catch (err) {
      console.error("UPLOAD ERROR:", err);
      return sendGalleryUploadResponse(req, res, 500, { error: err.message });
    }
  }
);

app.delete("/api/gallery/:id", ensureAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const fileResult = await pool.query(
      `SELECT image_url, storage_provider, storage_public_id, storage_resource_type
       FROM gallery
       WHERE id = $1`,
      [id]
    );

    if (fileResult.rows.length === 0) {
      return res.status(404).json({ error: "Gallery item not found." });
    }

    const {
      image_url: imageUrl,
      storage_provider: storageProvider,
      storage_public_id: storagePublicId,
      storage_resource_type: storageResourceType,
    } = fileResult.rows[0];

    await pool.query("DELETE FROM gallery WHERE id = $1", [id]);

    if (storageProvider === "cloudinary" && storagePublicId && isCloudinaryConfigured()) {
      try {
        await destroyCloudinaryAsset(storagePublicId, storageResourceType || "image");
      } catch (err) {
        console.error(`Failed to delete Cloudinary asset: ${storagePublicId}`, err);
      }
    } else if (imageUrl?.startsWith("/uploads/")) {
      const filename = path.basename(imageUrl);
      const filePath = path.join(uploadsDir, filename);

      fs.unlink(filePath, (err) => {
        if (err) console.error(`Failed to delete file: ${filePath}`, err);
      });
    }

    res.status(200).json({ message: "Gallery item deleted successfully." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/gallery/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || null;

    const itemResult = await pool.query("SELECT * FROM gallery WHERE id = $1", [id]);

    if (itemResult.rows.length === 0) {
      return res.status(404).json({ error: "Gallery item not found." });
    }

    const item = itemResult.rows[0];

    const commentsQuery = userId
      ? `SELECT
           gc.*,
           (SELECT COUNT(*) FROM gallery_comment_likes gcl WHERE gcl.comment_id = gc.id) AS likes,
           EXISTS(SELECT 1 FROM gallery_comment_likes gcl WHERE gcl.comment_id = gc.id AND gcl.user_id = $2) AS user_has_liked
         FROM gallery_comments gc
         WHERE gc.gallery_id = $1
         ORDER BY gc.created_at ASC`
      : `SELECT
           gc.*,
           (SELECT COUNT(*) FROM gallery_comment_likes gcl WHERE gcl.comment_id = gc.id) AS likes,
           false AS user_has_liked
         FROM gallery_comments gc
         WHERE gc.gallery_id = $1
         ORDER BY gc.created_at ASC`;

    const [commentsResult, likesResult, likedResult, savedResult] = await Promise.all([
      pool.query(commentsQuery, userId ? [id, userId] : [id]),
      pool.query("SELECT COUNT(*) FROM gallery_likes WHERE gallery_id = $1", [id]),
      userId
        ? pool.query(
            "SELECT EXISTS(SELECT 1 FROM gallery_likes WHERE gallery_id = $1 AND user_id = $2) AS liked",
            [id, userId]
          )
        : Promise.resolve({ rows: [{ liked: false }] }),
      userId
        ? pool.query(
            "SELECT EXISTS(SELECT 1 FROM gallery_saves WHERE gallery_id = $1 AND user_id = $2) AS saved",
            [id, userId]
          )
        : Promise.resolve({ rows: [{ saved: false }] })
    ]);

    item.comments = commentsResult.rows.map((comment) => ({
      ...comment,
      likes: parseInt(comment.likes, 10) || 0,
      userHasLiked: Boolean(comment.user_has_liked),
    }));
    item.likes = parseInt(likesResult.rows[0].count, 10);
    item.userHasLiked = Boolean(likedResult.rows[0].liked);
    item.userHasSaved = Boolean(savedResult.rows[0].saved);

    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/gallery/:id/like", ensureUserAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const galleryResult = await pool.query("SELECT 1 FROM gallery WHERE id = $1", [id]);
    if (galleryResult.rows.length === 0) {
      return res.status(404).json({ error: "Gallery item not found." });
    }

    await pool.query(
      `INSERT INTO gallery_likes (gallery_id, user_id)
       VALUES ($1, $2)
       ON CONFLICT (gallery_id, user_id) DO NOTHING`,
      [id, userId]
    );

    const likesResult = await pool.query("SELECT COUNT(*) FROM gallery_likes WHERE gallery_id = $1", [id]);
    const likeCount = parseInt(likesResult.rows[0].count, 10);

    res.status(200).json({ likes: likeCount, liked: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/gallery/:id/like", ensureUserAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const galleryResult = await pool.query("SELECT 1 FROM gallery WHERE id = $1", [id]);
    if (galleryResult.rows.length === 0) {
      return res.status(404).json({ error: "Gallery item not found." });
    }

    await pool.query("DELETE FROM gallery_likes WHERE gallery_id = $1 AND user_id = $2", [id, userId]);

    const likesResult = await pool.query("SELECT COUNT(*) FROM gallery_likes WHERE gallery_id = $1", [id]);
    const likeCount = parseInt(likesResult.rows[0].count, 10);

    res.status(200).json({ likes: likeCount, liked: false });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/gallery-comments/:id/like", ensureUserAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const commentResult = await pool.query("SELECT 1 FROM gallery_comments WHERE id = $1", [id]);
    if (commentResult.rows.length === 0) {
      return res.status(404).json({ error: "Comment not found." });
    }

    await pool.query(
      `INSERT INTO gallery_comment_likes (comment_id, user_id)
       VALUES ($1, $2)
       ON CONFLICT (comment_id, user_id) DO NOTHING`,
      [id, userId]
    );

    const likesResult = await pool.query("SELECT COUNT(*) FROM gallery_comment_likes WHERE comment_id = $1", [id]);
    return res.status(200).json({
      likes: parseInt(likesResult.rows[0].count, 10),
      liked: true,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.delete("/api/gallery-comments/:id/like", ensureUserAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const commentResult = await pool.query("SELECT 1 FROM gallery_comments WHERE id = $1", [id]);
    if (commentResult.rows.length === 0) {
      return res.status(404).json({ error: "Comment not found." });
    }

    await pool.query("DELETE FROM gallery_comment_likes WHERE comment_id = $1 AND user_id = $2", [id, userId]);

    const likesResult = await pool.query("SELECT COUNT(*) FROM gallery_comment_likes WHERE comment_id = $1", [id]);
    return res.status(200).json({
      likes: parseInt(likesResult.rows[0].count, 10),
      liked: false,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.post("/api/gallery/:id/save", ensureUserAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const galleryResult = await pool.query("SELECT 1 FROM gallery WHERE id = $1", [id]);
    if (galleryResult.rows.length === 0) {
      return res.status(404).json({ error: "Gallery item not found." });
    }

    await pool.query(
      `INSERT INTO gallery_saves (gallery_id, user_id)
       VALUES ($1, $2)
       ON CONFLICT (gallery_id, user_id) DO NOTHING`,
      [id, userId]
    );

    return res.status(200).json({ saved: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.delete("/api/gallery/:id/save", ensureUserAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const galleryResult = await pool.query("SELECT 1 FROM gallery WHERE id = $1", [id]);
    if (galleryResult.rows.length === 0) {
      return res.status(404).json({ error: "Gallery item not found." });
    }

    await pool.query("DELETE FROM gallery_saves WHERE gallery_id = $1 AND user_id = $2", [id, userId]);

    return res.status(200).json({ saved: false });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.post("/api/gallery/:id/comments", ensureUserAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const parentCommentId = req.body?.parentCommentId == null || req.body.parentCommentId === ""
      ? null
      : Number.parseInt(req.body.parentCommentId, 10);
    const authorName = req.user?.displayName || req.user?.emails?.[0]?.value || "Community Member";

    if (!content || !content.trim()) {
      return res.status(400).json({ error: "Comment content is required." });
    }

    if (parentCommentId !== null && (!Number.isInteger(parentCommentId) || parentCommentId <= 0)) {
      return res.status(400).json({ error: "A valid parent comment is required for replies." });
    }

    if (parentCommentId !== null) {
      const parentResult = await pool.query(
        "SELECT id FROM gallery_comments WHERE id = $1 AND gallery_id = $2",
        [parentCommentId, id]
      );

      if (parentResult.rows.length === 0) {
        return res.status(404).json({ error: "The comment you are replying to could not be found." });
      }
    }

    const result = await pool.query(
      `INSERT INTO gallery_comments (gallery_id, parent_comment_id, author_name, content)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [id, parentCommentId, authorName, content.trim()]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/admin/comments", ensureAdmin, async (req, res) => {
  try {
    const comments = await getAdminCommentsFeed();
    return res.json(comments);
  } catch (error) {
    console.error("Admin comments feed error:", error);
    return res.status(500).json({ error: "Could not load comments right now." });
  }
});

app.delete("/api/admin/comments/:contentType/:id", ensureAdmin, async (req, res) => {
  const commentId = Number.parseInt(req.params.id, 10);
  const { contentType } = req.params;

  const commentTargetMap = {
    blog: {
      tableName: "blog_comments",
      sourceTable: "blogs",
      sourceColumn: "blog_id",
    },
    gallery: {
      tableName: "gallery_comments",
      sourceTable: "gallery",
      sourceColumn: "gallery_id",
    },
  };

  if (!Number.isInteger(commentId) || commentId <= 0) {
    return res.status(400).json({ error: "A valid comment id is required." });
  }

  const target = commentTargetMap[contentType];
  if (!target) {
    return res.status(400).json({ error: "Unsupported comment type." });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const commentResult = await client.query(
      `
        SELECT c.id, c.author_name, c.parent_comment_id, c.content, s.title AS source_title
        FROM ${target.tableName} c
        JOIN ${target.sourceTable} s ON s.id = c.${target.sourceColumn}
        WHERE c.id = $1
      `,
      [commentId]
    );

    if (commentResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Comment not found." });
    }

    const subtreeResult = await client.query(
      `
        WITH RECURSIVE comment_tree AS (
          SELECT id
          FROM ${target.tableName}
          WHERE id = $1

          UNION ALL

          SELECT child.id
          FROM ${target.tableName} child
          JOIN comment_tree tree ON child.parent_comment_id = tree.id
        )
        SELECT COUNT(*) AS total
        FROM comment_tree
      `,
      [commentId]
    );

    await client.query(`DELETE FROM ${target.tableName} WHERE id = $1`, [commentId]);
    await client.query("COMMIT");

    return res.status(200).json({
      message: "Comment deleted successfully.",
      contentType,
      deletedComments: parseInt(subtreeResult.rows[0].total, 10) || 1,
      sourceTitle: commentResult.rows[0].source_title,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Admin comment delete error:", error);
    return res.status(500).json({ error: "Could not delete that comment right now." });
  } finally {
    client.release();
  }
});

app.get("/api/admin/overview", ensureAdmin, getDashboardOverview);

app.get("/api/stats/users", ensureAdmin, async (req, res) => {
  try {
    const result = await pool.query("SELECT COUNT(*) FROM users");
    res.json({ total: parseInt(result.rows[0].count) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/stats/events", ensureAdmin, async (req, res) => {
  try {
    const result = await pool.query("SELECT COUNT(*) FROM events");
    res.json({ total: parseInt(result.rows[0].count) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/stats/gallery", ensureAdmin, async (req, res) => {
  try {
    const result = await pool.query("SELECT COUNT(*) FROM gallery");
    res.json({ total: parseInt(result.rows[0].count) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Catch-all for 404 Not Found for API routes
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: `API endpoint not found: ${req.path}` });
  }
  next(); // Let other middleware handle non-API 404s (e.g., static files)
});


initializeDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch(() => {
    process.exit(1);
  });
