# Hosting This App for Free

This app can be hosted for free, including the server and database, with a few tradeoffs:

- The web service may sleep when idle.
- Free databases often have limits or inactivity rules.
- Local file uploads are not safe on free app hosts, so this project supports Cloudflare R2 (recommended) or Cloudinary for media uploads.

## Recommended stack

- App host: Render free web service
- Database: Neon free Postgres
- Media uploads: Cloudflare R2 free tier (10 GB storage + zero egress fees)

This combination is the most sustainable free setup for the current codebase because:

- Render can run the whole Node app and serve the HTML files directly.
- Neon gives you a real hosted Postgres database without the 30-day expiration Render places on its free Postgres tier.
- Cloudflare R2 keeps gallery media, event photos and profile avatars alive even when the app host redeploys or sleeps.

## Before you deploy

1. Push this repo to GitHub.
2. Copy `.env.example` to a local `.env` only for your own machine.
3. Rotate any secrets that were previously stored in `server/.env`, especially OAuth secrets.

## Create the free services

### 1. Neon

1. Create a free Postgres project in Neon.
2. Copy the connection string.
3. Use it as `DATABASE_URL`.
4. Set `DB_SSL=true`.

### 2. Cloudflare R2

1. In your Cloudflare dashboard, open **R2 Object Storage** and create a bucket (for example `cya-platform-media`).
2. Open the bucket's **Settings** tab and enable public access using either the `pub-...r2.dev` public development URL or your own custom domain — copy that base URL (`https://...`).
3. Open **R2 Object Storage** -> **Manage R2 API Tokens** and create an API Token with **Object Read & Write** permission scoped to that bucket.
4. Copy your **Account ID**, **Access Key ID**, **Secret Access Key**, **Bucket Name** and **Public URL**, then add them to your `.env` (local) or Render Environment tab:
   - `R2_ACCOUNT_ID`
   - `R2_ACCESS_KEY_ID`
   - `R2_SECRET_ACCESS_KEY`
   - `R2_BUCKET_NAME`
   - `R2_PUBLIC_URL`
   - `R2_PREFIX=cya-platform` (optional folder prefix inside the bucket)

*(Cloudinary remains supported as a legacy fallback if all `R2_*` variables are left unset.)*

### 3. Render

1. In Render, create a new Blueprint or Web Service from this repo.
2. Use the root of the repo.
3. Render should pick up `render.yaml`.
4. Fill in these environment variables:
   - `APP_ORIGIN`
   - `CORS_ALLOWED_ORIGINS` (if your frontend is on a different origin)
   - `API_ORIGIN` (if your frontend is on a different origin)
   - `DATABASE_URL`
   - `ADMIN_EMAIL` (optional bootstrap admin email)
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `APP_NAME`
   - `SMTP_FROM`
   - `R2_ACCOUNT_ID`
   - `R2_ACCESS_KEY_ID`
   - `R2_SECRET_ACCESS_KEY`
   - `R2_BUCKET_NAME`
   - `R2_PUBLIC_URL`
5. Deploy.

## Password reset email setup

To enable "Forgot password", configure either:

- `SMTP_URL`

or:

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`

For local development, if SMTP is not configured, the server logs a preview reset link instead of sending an email.

In non-production, Forgot password opens the reset page in a new tab by default. Set `PASSWORD_RESET_DIRECT_LINK=false` to force email delivery, or set it to `true` only when you intentionally want direct-link resets. Direct-link mode exposes the one-time reset URL to the browser and should generally be limited to local development.

For Gmail SMTP, use:

- `SMTP_HOST=smtp.gmail.com`
- `SMTP_PORT=465`
- `SMTP_SECURE=true`
- `SMTP_USER=your-gmail-address`
- `SMTP_PASS=your 16-character Gmail app password`
- `SMTP_FROM=AIC Ziwani <your-gmail-address>`

Gmail requires 2-Step Verification plus an App Password for SMTP. A normal Gmail account password will not work.

If local SMTP fails with a certificate-chain error caused by antivirus, a corporate proxy, or local TLS inspection, you can temporarily set:

- `SMTP_TLS_REJECT_UNAUTHORIZED=false`

Use that only as a local workaround. Keep normal TLS verification enabled in production.

## Separate frontend/backend hosting

If your website pages are served from a different domain than the API, set:

- `APP_ORIGIN` to your frontend URL
- `API_ORIGIN` to your backend URL
- `CORS_ALLOWED_ORIGINS` to your frontend URL

Example:

- `APP_ORIGIN=https://cya-frontend.onrender.com`
- `API_ORIGIN=https://cya-platform-api.onrender.com`
- `CORS_ALLOWED_ORIGINS=https://cya-frontend.onrender.com`

The frontend loads `runtime-config.js` to discover `API_ORIGIN` and reset links also include the backend origin automatically.

## Google login callback

After Render gives you a public URL, add this callback in your Google OAuth app:

`https://your-app.onrender.com/auth/google/callback`

Also add the site origin:

`https://your-app.onrender.com`

## Notes about this codebase

- The frontend and backend are served by the same Node app, so you only need one app service.
- The database tables are created automatically on server start.
- When `R2_*` variables are set, Cloudflare R2 is used automatically (Cloudinary stays as fallback if `R2_*` is unset and `CLOUDINARY_*` is set).
- If neither Cloudflare R2 nor Cloudinary env vars are set, uploads fall back to local disk storage for local development.
- Existing local uploads inside `server/uploads` will not automatically move to R2. New uploads will go straight to Cloudflare R2.

## Cheapest path with the fewest surprises

Use Render + Neon + Cloudflare R2.

If you try to keep uploads on the app server itself, your media will disappear after redeploys or idle spin-downs on most free hosts.
