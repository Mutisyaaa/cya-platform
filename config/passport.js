const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const pool = require("../db");

function getAvatarUrl(profile) {
  return (
    profile?.photos?.[0]?.value ||
    profile?._json?.picture ||
    ""
  );
}

function buildSessionUser(user) {
  return {
    id: user.id,
    displayName: user.name,
    emails: [{ value: user.email }],
    avatarUrl: user.avatar_url,
    gender: user.gender,
    provider: user.google_id ? "google" : "local",
    isAdmin: Boolean(user.is_admin),
  };
}

function isBootstrapAdminEmail(email) {
  const configuredAdminEmail = String(process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  return Boolean(configuredAdminEmail) && String(email || "").trim().toLowerCase() === configuredAdminEmail;
}

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: "/auth/google/callback"
},
async (accessToken, refreshToken, profile, done) => {
  try {
    const { id: googleId, displayName, emails, photos } = profile;
    const email = emails?.[0]?.value;

    if (!email) {
      return done(new Error("Google profile is missing an email address."), null);
    }

    const existingUser = await pool.query("SELECT * FROM users WHERE email = $1", [email]);

    if (existingUser.rows.length > 0) {
      const user = existingUser.rows[0];
      let updatedAvatarUrl = user.avatar_url;
      // If user exists but google_id is not set, update it.
      if (!user.google_id) {
        updatedAvatarUrl = user.avatar_url || getAvatarUrl(profile);
        await pool.query("UPDATE users SET google_id = $1, avatar_url = $2 WHERE id = $3", [googleId, updatedAvatarUrl, user.id]);
        user.google_id = googleId;
        user.avatar_url = updatedAvatarUrl;
      }

      if (!user.is_admin && isBootstrapAdminEmail(user.email)) {
        await pool.query("UPDATE users SET is_admin = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = $1", [user.id]);
        user.is_admin = true;
      }

      return done(null, buildSessionUser(user));
    } else {
      // User not found, create a new one.
      const avatarUrl = getAvatarUrl(profile);
      const newUserResult = await pool.query(
        "INSERT INTO users (name, email, google_id, avatar_url, is_admin) VALUES ($1, $2, $3, $4, $5) RETURNING *",
        [displayName, email, googleId, avatarUrl, isBootstrapAdminEmail(email)]
      );
      return done(null, buildSessionUser(newUserResult.rows[0]));
    }
  } catch (err) {
    console.error("Error in Google OAuth strategy:", err);
    return done(err, null);
  }
}));
