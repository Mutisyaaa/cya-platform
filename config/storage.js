const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
} = require("@aws-sdk/client-s3");

const MIME_EXTENSION_MAP = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/svg+xml": ".svg",
  "image/x-icon": ".ico",
  "image/vnd.microsoft.icon": ".ico",
  "video/mp4": ".mp4",
  "video/webm": ".webm",
  "video/quicktime": ".mov",
  "video/ogg": ".ogg",
};

function hasUsableEnvValue(value) {
  const normalized = String(value || "").trim();
  if (!normalized) {
    return false;
  }

  return !/^(replace-|your-)/i.test(normalized);
}

function getR2Endpoint() {
  const explicitEndpoint = String(process.env.R2_ENDPOINT || "").trim().replace(/\/+$/, "");
  if (hasUsableEnvValue(explicitEndpoint)) {
    return /^https?:\/\//i.test(explicitEndpoint) ? explicitEndpoint : "";
  }

  const accountId = String(process.env.R2_ACCOUNT_ID || "").trim();
  if (hasUsableEnvValue(accountId)) {
    return `https://${accountId}.r2.cloudflarestorage.com`;
  }

  return "";
}

function getR2PublicUrl() {
  const raw = String(process.env.R2_PUBLIC_URL || "").trim().replace(/\/+$/, "");
  if (!hasUsableEnvValue(raw) || !/^https?:\/\//i.test(raw)) {
    return "";
  }

  return raw;
}

function getR2Prefix() {
  const raw = String(process.env.R2_PREFIX || "").trim().replace(/^\/+|\/+$/g, "");
  if (!hasUsableEnvValue(raw)) {
    return "cya-platform";
  }

  return raw || "cya-platform";
}

function getR2BucketName() {
  const bucket = String(process.env.R2_BUCKET_NAME || "").trim();
  return hasUsableEnvValue(bucket) ? bucket : "";
}

function isR2Configured() {
  return Boolean(
    getR2Endpoint() &&
    hasUsableEnvValue(process.env.R2_ACCESS_KEY_ID) &&
    hasUsableEnvValue(process.env.R2_SECRET_ACCESS_KEY) &&
    getR2BucketName() &&
    getR2PublicUrl()
  );
}

function createStorageManager({ uploadsDir }) {
  let cachedR2Client = null;
  let cachedR2Signature = "";

  function getR2Client() {
    if (!isR2Configured()) {
      throw new Error("Cloudflare R2 storage is not configured.");
    }

    const endpoint = getR2Endpoint();
    const accessKeyId = String(process.env.R2_ACCESS_KEY_ID || "").trim();
    const secretAccessKey = String(process.env.R2_SECRET_ACCESS_KEY || "").trim();
    const signature = `${endpoint}|${accessKeyId}|${secretAccessKey}`;

    if (!cachedR2Client || cachedR2Signature !== signature) {
      // S3 SDK v3.729+ checksum defaults break R2 PutObjectCommand unless constrained to WHEN_REQUIRED.
      cachedR2Client = new S3Client({
        region: "auto",
        endpoint,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
        requestChecksumCalculation: "WHEN_REQUIRED",
        responseChecksumValidation: "WHEN_REQUIRED",
      });
      cachedR2Signature = signature;
    }

    return cachedR2Client;
  }

  function getResourceType(file) {
    if (file?.mimetype?.startsWith("video/")) {
      return "video";
    }

    if (file?.mimetype?.startsWith("image/")) {
      return "image";
    }

    return "raw";
  }

  function inferExtension(file) {
    const rawExt = path.extname(String(file?.originalname || "")).toLowerCase();
    if (/^\.[a-z0-9]{1,10}$/.test(rawExt)) {
      return rawExt;
    }

    const mime = String(file?.mimetype || "").split(";")[0].trim().toLowerCase();
    return MIME_EXTENSION_MAP[mime] || "";
  }

  function buildObjectKey(file, folder = "gallery") {
    const ext = inferExtension(file);
    const originalBase = path.basename(String(file?.originalname || ""), path.extname(String(file?.originalname || "")));
    const safeBase = originalBase
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "asset";

    const safeFolder = String(folder || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9/_-]+/g, "-")
      .replace(/^\/+|\/+$/g, "");

    const uniquePart = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}-${safeBase}${ext}`;
    return [getR2Prefix(), safeFolder, uniquePart].filter(Boolean).join("/");
  }

  function buildR2PublicUrl(key) {
    const base = getR2PublicUrl();
    const encodedKey = String(key || "")
      .split("/")
      .filter(Boolean)
      .map(encodeURIComponent)
      .join("/");
    return `${base}/${encodedKey}`;
  }

  function extractR2KeyFromUrl(url) {
    if (typeof url !== "string") {
      return null;
    }

    const publicUrl = getR2PublicUrl();
    if (!publicUrl) {
      return null;
    }

    const trimmed = url.trim();
    const prefix = `${publicUrl}/`;
    if (!trimmed.startsWith(prefix)) {
      return null;
    }

    const relativePath = trimmed.slice(prefix.length).split(/[?#]/)[0];
    if (!relativePath) {
      return null;
    }

    try {
      const decodedKey = relativePath
        .split("/")
        .filter(Boolean)
        .map(decodeURIComponent)
        .join("/");
      return decodedKey || null;
    } catch {
      return null;
    }
  }

  async function uploadToR2(file, folder = "gallery") {
    if (!file?.buffer) {
      throw new Error("Missing file buffer for Cloudflare R2 upload.");
    }

    const client = getR2Client();
    const bucket = getR2BucketName();
    const key = buildObjectKey(file, folder);
    const resourceType = getResourceType(file);

    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype || "application/octet-stream",
        CacheControl: "public, max-age=31536000, immutable",
      })
    );

    return {
      url: buildR2PublicUrl(key),
      provider: "r2",
      publicId: key,
      resourceType,
    };
  }

  async function deleteFromR2(key) {
    if (!key || !isR2Configured()) {
      return;
    }

    const client = getR2Client();
    await client.send(
      new DeleteObjectCommand({
        Bucket: getR2BucketName(),
        Key: key,
      })
    );
  }

  async function probeR2Connection() {
    if (!isR2Configured()) {
      return { connected: false, error: "Cloudflare R2 is not configured." };
    }

    try {
      const client = getR2Client();
      await client.send(
        new HeadBucketCommand({
          Bucket: getR2BucketName(),
        })
      );
      return { connected: true };
    } catch (error) {
      return { connected: false, error: error.message || "Cloudflare R2 connection failed." };
    }
  }

  function isCloudinaryConfigured() {
    return Boolean(
      hasUsableEnvValue(process.env.CLOUDINARY_CLOUD_NAME) &&
      hasUsableEnvValue(process.env.CLOUDINARY_API_KEY) &&
      hasUsableEnvValue(process.env.CLOUDINARY_API_SECRET)
    );
  }

  function getCloudinaryFolder() {
    const folder = String(process.env.CLOUDINARY_FOLDER || "").trim();
    return hasUsableEnvValue(folder) ? folder : "cya-platform/gallery";
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

  async function uploadToCloudinary(file, folder) {
    const timestamp = Math.floor(Date.now() / 1000);
    const resourceType = getResourceType(file);
    const baseFolder = getCloudinaryFolder();
    const targetFolder = folder && folder !== "gallery"
      ? `${baseFolder.replace(/\/gallery$/i, "").replace(/\/+$/, "")}/${folder}`
      : baseFolder;

    const signature = buildCloudinarySignature(
      { folder: targetFolder, timestamp },
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
    formData.append("folder", targetFolder);
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
      url: data.secure_url,
      provider: "cloudinary",
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

  function deleteLocalUploadIfPresent(imageUrl) {
    if (!imageUrl?.startsWith("/uploads/") || !uploadsDir) {
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

  function isCloudStorageConfigured() {
    return isR2Configured() || isCloudinaryConfigured();
  }

  function getActiveStorageProvider() {
    if (isR2Configured()) {
      return "r2";
    }

    if (isCloudinaryConfigured()) {
      return "cloudinary";
    }

    return "local";
  }

  async function uploadMediaAsset(file, { folder = "gallery" } = {}) {
    if (isR2Configured()) {
      return uploadToR2(file, folder);
    }

    if (isCloudinaryConfigured()) {
      return uploadToCloudinary(file, folder);
    }

    return {
      url: `/uploads/${file.filename}`,
      provider: "local",
      publicId: null,
      resourceType: getResourceType(file),
    };
  }

  async function deleteMediaAsset({ provider, publicId, resourceType, url } = {}) {
    if (provider === "r2" && publicId && isR2Configured()) {
      await deleteFromR2(publicId);
      return;
    }

    if (!provider && url && isR2Configured()) {
      const derivedKey = extractR2KeyFromUrl(url);
      if (derivedKey) {
        await deleteFromR2(derivedKey);
        return;
      }
    }

    if (provider === "cloudinary" && publicId && isCloudinaryConfigured()) {
      await destroyCloudinaryAsset(publicId, resourceType || "image");
      return;
    }

    if (url?.startsWith("/uploads/")) {
      deleteLocalUploadIfPresent(url);
    }
  }

  async function getStorageStatus({ probe = false } = {}) {
    const r2Configured = isR2Configured();
    const cloudinaryConfigured = isCloudinaryConfigured();
    const r2Status = {
      configured: r2Configured,
      bucket: getR2BucketName() || null,
      publicUrl: getR2PublicUrl() || null,
      prefix: getR2Prefix(),
      endpointConfigured: Boolean(getR2Endpoint()),
    };

    if (probe && r2Configured) {
      r2Status.connection = await probeR2Connection();
    }

    return {
      activeProvider: getActiveStorageProvider(),
      cloudStorageConfigured: isCloudStorageConfigured(),
      r2: r2Status,
      cloudinary: {
        configured: cloudinaryConfigured,
        cloudName: hasUsableEnvValue(process.env.CLOUDINARY_CLOUD_NAME)
          ? process.env.CLOUDINARY_CLOUD_NAME.trim()
          : null,
        folder: getCloudinaryFolder(),
      },
      local: {
        enabled: !isCloudStorageConfigured(),
        uploadsPath: "/uploads",
      },
    };
  }

  return {
    hasUsableEnvValue,
    getR2Endpoint,
    getR2PublicUrl,
    getR2Prefix,
    isR2Configured,
    isCloudinaryConfigured,
    isCloudStorageConfigured,
    getActiveStorageProvider,
    extractR2KeyFromUrl,
    deleteLocalUploadIfPresent,
    uploadMediaAsset,
    deleteMediaAsset,
    probeR2Connection,
    getStorageStatus,
  };
}

module.exports = {
  createStorageManager,
};
