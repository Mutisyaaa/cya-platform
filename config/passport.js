const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;

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
    console.log("Google Profile:", profile); // 👈 for testing
    return done(null, {
      id: profile.id,
      displayName: profile.displayName,
      emails: profile.emails || [],
      photos: profile.photos || [],
      avatarUrl: getAvatarUrl(profile),
    });
  } catch (err) {
    return done(err, null);
  }
}));

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});
