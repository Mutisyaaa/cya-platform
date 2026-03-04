require("dotenv").config({ path: __dirname + "/.env" });
const express = require("express");
const path = require("path");
const pool = require("./db");
const multer = require("multer");

const app = express();
app.use(express.json());

// 🔴 Serve frontend files
app.use(express.static(path.join(__dirname, "../client")));

// ✅Serve upload images
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// 🔵 Test API route
app.get("/api", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json({
      message: "CYA API is alive 🔥",
      time: result.rows[0]
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🟢 GET ALL BLOGS
app.get("/api/blogs", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, title, content, created_at FROM blogs ORDER BY created_at DESC"
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🟡 CREATE BLOG (for later admin use)
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

app.listen(3000, () => {
  console.log("Server running on port 3000");
});

// 🟣 GET ALL SERVICES
app.get("/api/services", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM services ORDER BY created_at DESC"
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🟠 GET ALL EVENTS
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

// 🔵 GET ALL GALLERY IMAGES
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

// 🔵 Multer Storage Config
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, "uploads"));
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage });


// 🟣 UPLOAD IMAGE TO GALLERY
app.post("/api/gallery", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const { title } = req.body;
    const image_url = `/uploads/${req.file.filename}`;

    const result = await pool.query(
      "INSERT INTO gallery (title, image_url) VALUES ($1, $2) RETURNING *",
      [title, image_url]
    );

    res.status(201).json({
      message: "Upload successful",
      data: result.rows[0]
    });

  } catch (err) {
    console.error("UPLOAD ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ ALWAYS LAST
app.listen(3000, () => {
  console.log("Server running on port 3000");
});