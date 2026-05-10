require("dotenv").config({ path: __dirname + "/.env" });

const express = require("express");
const path = require("path");
const pool = require("../db");
const multer = require("multer");
const cors = require("cors");

const app = express();

// ✅ Enable CORS (VERY IMPORTANT)
app.use(cors());

// Middleware
app.use(express.json());

// Serve frontend
app.use(express.static(path.join(__dirname, "../client")));

// Serve uploads
app.use("/uploads", express.static(path.join(__dirname, "uploads")));


// 🔵 TEST ROUTE
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


// BLOGS
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

app.get("/api/blogs/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query("SELECT * FROM blogs WHERE id = $1", [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Blog post not found." });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/blogs/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const blogResult = await pool.query("SELECT * FROM blogs WHERE id = $1", [id]);

    if (blogResult.rows.length === 0) {
      return res.status(404).json({ error: "Blog post not found." });
    }

    const blog = blogResult.rows[0];

    const [commentsResult, likesResult] = await Promise.all([
      pool.query("SELECT * FROM blog_comments WHERE blog_id = $1 ORDER BY created_at DESC", [id]),
      pool.query("SELECT COUNT(*) FROM blog_likes WHERE blog_id = $1", [id])
    ]);

    blog.comments = commentsResult.rows;
    blog.likes = parseInt(likesResult.rows[0].count, 10);

    res.json(blog);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// SERVICES
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


// EVENTS
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


// GALLERY GET
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


// MULTER CONFIG
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "uploads"));
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  }
});

const upload = multer({ storage });


// GALLERY UPLOAD
app.post("/api/gallery", upload.single("image"), async (req, res) => {
  console.log("UPLOAD ROUTE HIT"); 
  try {
    console.log("BODY:", req.body);
    console.log("FILE:", req.file);

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