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
      }
      return done(null, { id: user.id, displayName: user.name, emails: [{ value: user.email }], avatarUrl: updatedAvatarUrl, gender: user.gender, provider: 'google', isAdmin: user.email === process.env.ADMIN_EMAIL });
    } else {
      // User not found, create a new one.
      const avatarUrl = getAvatarUrl(profile);
      const newUserResult = await pool.query(
        "INSERT INTO users (name, email, google_id, avatar_url) VALUES ($1, $2, $3, $4) RETURNING *",
        [displayName, email, googleId, avatarUrl]
      );
      const newUser = newUserResult.rows[0];
      return done(null, {
        id: newUser.id,
        displayName: newUser.name,
        emails: [{ value: newUser.email }],
        gender: newUser.gender, // This will be null for Google sign-ups initially
        isAdmin: newUser.email === process.env.ADMIN_EMAIL,
        avatarUrl: newUser.avatar_url,
        provider: 'google'
      });
    }
  } catch (err) {
    console.error("Error in Google OAuth strategy:", err);
    return done(err, null);
  }
}));
