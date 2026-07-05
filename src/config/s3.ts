import { S3Client } from 'bun';

// Single shared S3 client. Uses a private bucket; objects are never made
// public. Access is granted through short-lived presigned URLs generated at
// request time (see modules/uploads/service.ts and modules/urls/service.ts).
const bucket = process.env.S3_BUCKET;
const region = process.env.S3_REGION;
const accessKeyId = process.env.S3_ACCESS_KEY_ID;
const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;

if (!bucket || !accessKeyId || !secretAccessKey) {
  throw new Error(
    'Missing S3 configuration. Set S3_BUCKET, S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY.'
  );
}

export const s3 = new S3Client({
  bucket,
  region,
  accessKeyId,
  secretAccessKey,
  // Optional: set for S3-compatible providers (Cloudflare R2, MinIO, Spaces).
  endpoint: process.env.S3_ENDPOINT,
});

// How long presigned download/view URLs stay valid, in seconds (default 7 days).
export const PRESIGN_EXPIRES_IN = Number(process.env.S3_PRESIGN_EXPIRES_IN ?? 60 * 60 * 24 * 7);

// Maximum allowed presign duration a client can request, in seconds
// (default 365 days). Prevents abuse via excessively long-lived URLs.
export const MAX_PRESIGN_EXPIRES_IN = Number(
  process.env.S3_MAX_PRESIGN_EXPIRES_IN ?? 60 * 60 * 24 * 365
);

// How long presigned upload (PUT) URLs stay valid, in seconds (default 15 min).
export const UPLOAD_PRESIGN_EXPIRES_IN = Number(
  process.env.S3_UPLOAD_PRESIGN_EXPIRES_IN ?? 60 * 15
);

// Clamp a client-requested expiry to the allowed [1, MAX] range. Falls back
// to the server default when the caller doesn't specify one.
export const clampPresignExpiry = (expiresIn?: number): number => {
  if (expiresIn === undefined || expiresIn <= 0) return PRESIGN_EXPIRES_IN;
  return Math.min(expiresIn, MAX_PRESIGN_EXPIRES_IN);
};
