const fs = require("fs");
const path = require("path");

const rootEnvPath = path.join(__dirname, ".env");
const fallbackEnvPath = path.join(__dirname, "server", ".env");

require("dotenv").config({
  path: fs.existsSync(rootEnvPath) ? rootEnvPath : fallbackEnvPath,
});

const express = require("express");
const cors = require("cors");
const multer = require("multer");
const pool = require("./db");
const bcrypt = require("bcryptjs");
const session = require("express-session");
const passport = require("passport");

// Automatically create the users table if it doesn't exist
pool.query(`
  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255), 
    google_id VARCHAR(255) UNIQUE, 
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

  CREATE TABLE IF NOT EXISTS events (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_date DATE NOT NULL,
    event_time TIME,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS services (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    service_day VARCHAR(50),
    service_time TIME
  );
`).catch(err => console.error("Could not create tables:", err));

const app = express();
const PORT = process.env.PORT || 3000;
const clientDir = path.join(__dirname, "client");
const uploadsDir = path.join(__dirname, "server", "uploads");
const allowLocalOrigin = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i;

fs.mkdirSync(uploadsDir, { recursive: true });

app.use(session({
  secret: process.env.SESSION_SECRET || "keyboardcat",
  resave: false,
  saveUninitialized: false,
}));

app.use(passport.initialize());
app.use(passport.session());

// Unconditionally ensure Passport can serialize users for local sessions
passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
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

function isGoogleAuthReady() {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET
  );
}

function getAuthUnavailableMessage() {
  return authInitError?.message || "Google auth is not available on this server.";
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
    if (!origin || origin === "null" || allowLocalOrigin.test(origin)) {
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
  const returnTo = getSafeReturnTo(req.session?.returnTo);

  if (req.session) {
    delete req.session.returnTo;
  }

  res.redirect(returnTo);
});

app.get("/api/auth/user", (req, res) => {
  if (req.isAuthenticated()) {
    return res.json(req.user);
  }

  return res.status(401).json({ error: "Not logged in" });
});

app.get("/api/auth/logout", (req, res) => {
  req.logout(() => {
    res.json({ message: "Logged out" });
  });
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
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email, and password are required." });
    }

    const userCheck = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
    if (userCheck.rows.length > 0) {
      return res.status(409).json({ error: "An account with that email already exists." });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      "INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email",
      [name, email, passwordHash]
    );

    const row = result.rows[0];
    const newUser = {
      id: row.id,
      displayName: row.name,
      emails: [{ value: row.email }],
      provider: "local"
    };

    req.login(newUser, (err) => {
      if (err) return res.status(500).json({ error: "Login failed after registration." });
      res.status(201).json({ message: "Account created successfully!", user: newUser });
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

    const user = { id: row.id, displayName: row.name, emails: [{ value: row.email }], provider: "local" };
    req.login(user, (err) => {
      if (err) return res.status(500).json({ error: "Internal server error during login." });
      res.status(200).json({ message: "Login successful", user });
    });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ error: "Internal server error during login." });
  }
});

app.get("/api/users", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name, email, google_id, created_at FROM users ORDER BY created_at DESC"
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
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

app.post("/api/blogs", async (req, res) => {
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

app.delete("/api/blogs/:id", async (req, res) => {
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

app.get("/api/services", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM services");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/events", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM events ORDER BY event_date ASC"
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/events", async (req, res) => {
  try {
    const { title, date, time, description } = req.body;

    const result = await pool.query(
      "INSERT INTO events (title, event_date, event_time, description) VALUES ($1, $2, $3, $4) RETURNING *",
      [title, date, time || null, description]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/events/:id", async (req, res) => {
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

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });

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
      const media_url = `/uploads/${req.file.filename}`;

      const result = await pool.query(
        "INSERT INTO gallery (title, image_url) VALUES ($1, $2) RETURNING *",
        [title, media_url]
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

app.delete("/api/gallery/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const fileResult = await pool.query("SELECT image_url FROM gallery WHERE id = $1", [id]);

    if (fileResult.rows.length === 0) {
      return res.status(404).json({ error: "Gallery item not found." });
    }

    const imageUrl = fileResult.rows[0].image_url;
    const filename = path.basename(imageUrl);
    const filePath = path.join(uploadsDir, filename);

    await pool.query("DELETE FROM gallery WHERE id = $1", [id]);

    fs.unlink(filePath, (err) => {
      if (err) console.error(`Failed to delete file: ${filePath}`, err);
    });

    res.status(200).json({ message: "Gallery item deleted successfully." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
