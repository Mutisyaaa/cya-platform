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
    author_name VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS blog_likes (
    blog_id INTEGER NOT NULL REFERENCES blogs(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (blog_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS gallery_comments (
    id SERIAL PRIMARY KEY,
    gallery_id INTEGER NOT NULL REFERENCES gallery(id) ON DELETE CASCADE,
    author_name VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS gallery_likes (
    gallery_id INTEGER NOT NULL REFERENCES gallery(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (gallery_id, user_id)
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

  ALTER TABLE gallery
    ADD COLUMN IF NOT EXISTS storage_provider VARCHAR(50),
    ADD COLUMN IF NOT EXISTS storage_public_id TEXT,
    ADD COLUMN IF NOT EXISTS storage_resource_type VARCHAR(50);
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
    const dbUser = result.rows[0];
    const user = {
      id: dbUser.id,
      displayName: dbUser.name,
      emails: [{ value: dbUser.email }],
      avatarUrl: dbUser.avatar_url,
      gender: dbUser.gender,
      provider: dbUser.google_id ? 'google' : 'local',
      isAdmin: dbUser.email === process.env.ADMIN_EMAIL // Ensure isAdmin is set consistently
    };
    return done(null, user);
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
  if (!process.env.ADMIN_EMAIL) {
    console.error("ADMIN_EMAIL environment variable is not set. Admin access is disabled.");
    return res.status(500).json({ error: "Server configuration error: Admin email not set." });
  }

  if (req.isAuthenticated() && req.user) {
    const userEmail = req.user.emails?.[0]?.value;
    if (userEmail === process.env.ADMIN_EMAIL) {
      return next(); // User is admin, proceed
    }
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

function isGoogleAuthReady() {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET
  );
}

function getAuthUnavailableMessage() {
  return authInitError?.message || "Google auth is not available on this server.";
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

function buildPasswordResetUrl(req, token) {
  const resetUrl = new URL("/reset-password.html", getAppBaseUrl(req));
  resetUrl.searchParams.set("token", token);
  return resetUrl.toString();
}

function isAdminEmail(email) {
  return normalizeEmail(email) === normalizeEmail(process.env.ADMIN_EMAIL);
}

function getPostLoginRedirect(user, fallback = "/") {
  if (isAdminEmail(user?.emails?.[0]?.value)) {
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
      needsGender: !req.user.gender,
    });
  }

  return res.status(401).json({ error: "Not logged in" });
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
      "SELECT id, name, email, google_id, created_at FROM users ORDER BY created_at DESC"
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
    if (!name || !email || !password || !gender) {
      return res.status(400).json({ error: "Name, email, password, and gender are required." });
    }

    const userCheck = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
    if (userCheck.rows.length > 0) {
      return res.status(409).json({ error: "An account with that email already exists." });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      "INSERT INTO users (name, email, password_hash, gender) VALUES ($1, $2, $3, $4) RETURNING id, name, email, gender",
      [name, email, passwordHash, gender]
    );

    const row = result.rows[0];
    const newUser = {
      id: row.id,
      displayName: row.name,
      emails: [{ value: row.email }],
      gender: row.gender,
      provider: "local",
      isAdmin: row.email === process.env.ADMIN_EMAIL // Ensure isAdmin is set on registration
    };

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

    const user = {
      id: row.id,
      displayName: row.name,
      emails: [{ value: row.email }],
      gender: row.gender,
      provider: "local",
      isAdmin: row.email === process.env.ADMIN_EMAIL // Ensure isAdmin is set on local login
    };
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
    const normalizedGender = typeof req.body?.gender === "string"
      ? req.body.gender.trim().toLowerCase()
      : "";

    if (!isValidUserGender(normalizedGender)) {
      return res.status(400).json({ error: "Please choose a valid gender." });
    }

    const userResult = await pool.query(
      "SELECT id, name, email, gender, google_id, avatar_url FROM users WHERE id = $1",
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
          id: userRow.id,
          displayName: userRow.name,
          emails: [{ value: userRow.email }],
          avatarUrl: userRow.avatar_url,
          gender: userRow.gender,
          provider: userRow.google_id ? "google" : "local",
          isAdmin: isAdminEmail(userRow.email),
          needsGender: false,
        },
      });
    }

    const updatedResult = await pool.query(
      `UPDATE users
       SET gender = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING id, name, email, gender, google_id, avatar_url`,
      [normalizedGender, req.user.id]
    );

    const updatedUser = updatedResult.rows[0];
    req.user.gender = updatedUser.gender;

    return res.status(200).json({
      message: "Profile updated successfully.",
      user: {
        id: updatedUser.id,
        displayName: updatedUser.name,
        emails: [{ value: updatedUser.email }],
        avatarUrl: updatedUser.avatar_url,
        gender: updatedUser.gender,
        provider: updatedUser.google_id ? "google" : "local",
        isAdmin: isAdminEmail(updatedUser.email),
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

    const [commentsResult, likesResult, likedResult] = await Promise.all([
      pool.query("SELECT * FROM blog_comments WHERE blog_id = $1 ORDER BY created_at DESC", [id]),
      pool.query("SELECT COUNT(*) FROM blog_likes WHERE blog_id = $1", [id]),
      userId
        ? pool.query(
            "SELECT EXISTS(SELECT 1 FROM blog_likes WHERE blog_id = $1 AND user_id = $2) AS liked",
            [id, userId]
          )
        : Promise.resolve({ rows: [{ liked: false }] })
    ]);

    blog.comments = commentsResult.rows;
    blog.likes = parseInt(likesResult.rows[0].count, 10);
    blog.userHasLiked = Boolean(likedResult.rows[0].liked);

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
    const authorName = req.user?.displayName || req.user?.emails?.[0]?.value || "Community Member";

    if (!content || !content.trim()) {
      return res.status(400).json({ error: "Comment content is required." });
    }

    const result = await pool.query(
      "INSERT INTO blog_comments (blog_id, author_name, content) VALUES ($1, $2, $3) RETURNING *",
      [id, authorName, content.trim()]
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

    await pool.query(
      "INSERT INTO blog_likes (blog_id, user_id) VALUES ($1, $2)",
      [id, userId]
    );
    
    const likesResult = await pool.query("SELECT COUNT(*) FROM blog_likes WHERE blog_id = $1", [id]);
    const likeCount = parseInt(likesResult.rows[0].count, 10);

    res.status(201).json({ likes: likeCount });
  } catch (err) {
    if (err.code === '23505') { // unique_violation
      const likesResult = await pool.query("SELECT COUNT(*) FROM blog_likes WHERE blog_id = $1", [req.params.id]);
      const likeCount = parseInt(likesResult.rows[0].count, 10);
      return res.status(409).json({ error: "You have already liked this post.", likes: likeCount });
    }
    res.status(500).json({ error: err.message });
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
      WHERE e.event_date >= CURRENT_DATE
    `;
    const queryParams = [];
    let paramIndex = 1;

    // Filter by user gender for events not specifically tied to a fellowship
    if (isAdminRequest) {
      // Admin can review all upcoming events regardless of target gender.
    } else if (userGender && (userGender === 'male' || userGender === 'female')) {
      baseQuery += ` AND (e.target_gender = 'all' OR e.target_gender = $${paramIndex++})`;
      queryParams.push(userGender);
    } else {
      // For guests or users without gender set, only show 'all' gender events
      baseQuery += ` AND e.target_gender = 'all'`;
    }

    baseQuery += ` ORDER BY e.event_date ASC, e.event_time ASC`;

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
    
    const events = result.rows.map(event => ({
      ...event,
      rsvp_count: parseInt(event.rsvp_count, 10)
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

    const [commentsResult, likesResult, likedResult] = await Promise.all([
      pool.query("SELECT * FROM gallery_comments WHERE gallery_id = $1 ORDER BY created_at DESC", [id]),
      pool.query("SELECT COUNT(*) FROM gallery_likes WHERE gallery_id = $1", [id]),
      userId
        ? pool.query(
            "SELECT EXISTS(SELECT 1 FROM gallery_likes WHERE gallery_id = $1 AND user_id = $2) AS liked",
            [id, userId]
          )
        : Promise.resolve({ rows: [{ liked: false }] })
    ]);

    item.comments = commentsResult.rows;
    item.likes = parseInt(likesResult.rows[0].count, 10);
    item.userHasLiked = Boolean(likedResult.rows[0].liked);

    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/gallery/:id/like", ensureUserAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    await pool.query(
      "INSERT INTO gallery_likes (gallery_id, user_id) VALUES ($1, $2)",
      [id, userId]
    );
    
    const likesResult = await pool.query("SELECT COUNT(*) FROM gallery_likes WHERE gallery_id = $1", [id]);
    const likeCount = parseInt(likesResult.rows[0].count, 10);

    res.status(201).json({ likes: likeCount });
  } catch (err) {
    if (err.code === '23505') { // unique_violation
      const likesResult = await pool.query("SELECT COUNT(*) FROM gallery_likes WHERE gallery_id = $1", [req.params.id]);
      const likeCount = parseInt(likesResult.rows[0].count, 10);
      return res.status(409).json({ error: "You have already liked this item.", likes: likeCount });
    }
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/gallery/:id/comments", ensureUserAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const authorName = req.user?.displayName || req.user?.emails?.[0]?.value || "Community Member";

    if (!content || !content.trim()) {
      return res.status(400).json({ error: "Comment content is required." });
    }

    const result = await pool.query(
      "INSERT INTO gallery_comments (gallery_id, author_name, content) VALUES ($1, $2, $3) RETURNING *",
      [id, authorName, content.trim()]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
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
