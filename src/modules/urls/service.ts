import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '../../db';
import { shortenedUrls } from '../../db/schema';
import { s3, PRESIGN_EXPIRES_IN, clampPresignExpiry } from '../../config/s3';

export type UrlVariant = 'view' | 'download';

interface ShortenOptions {
  keyId?: string;
  variant?: UrlVariant;
  expiresIn?: number;
}

// Create a short code. For S3-backed objects we store the object key, variant,
// and presign expiry so the presigned URL can be lazily regenerated when it
// expires (the bucket is private, so we never persist a long-lived public URL).
// `originalUrl` holds the currently-cached presigned URL.
export const shortenUrl = async (
  originalUrl: string,
  options?: ShortenOptions
): Promise<string> => {
  const shortCode = nanoid(8);
  const expiresIn = options?.keyId
    ? clampPresignExpiry(options?.expiresIn)
    : null;

  await db.insert(shortenedUrls).values({
    originalUrl,
    shortCode,
    keyId: options?.keyId ?? null,
    variant: options?.variant ?? null,
    expiresIn,
    presignedAt: options?.keyId ? new Date() : null,
  });
  return shortCode;
};

// Generate a presigned URL for an S3 object key.
export const presignForKey = (
  keyId: string,
  variant: UrlVariant,
  expiresIn?: number
): string => {
  return s3.file(keyId).presign({
    method: 'GET',
    expiresIn: clampPresignExpiry(expiresIn),
    ...(variant === 'download' ? { contentDisposition: 'attachment' } : {}),
  });
};

// Check whether a cached presigned URL is still valid.
const isPresignedUrlFresh = (record: typeof shortenedUrls.$inferSelect): boolean => {
  if (!record.expiresIn || !record.presignedAt) return false;
  const expiresAt = new Date(record.presignedAt).getTime() + record.expiresIn * 1000;
  return Date.now() < expiresAt;
};

// Resolve a short code to a destination URL. For S3-backed records we reuse the
// cached presigned URL while it's still valid; once it expires we regenerate a
// fresh one (with the same expiresIn), update the row, and return it. This
// avoids hitting S3 on every redirect while keeping links permanent.
export const resolveUrl = async (shortCode: string): Promise<string | null> => {
  const record = await db.query.shortenedUrls.findFirst({
    where: eq(shortenedUrls.shortCode, shortCode),
  });
  if (!record) return null;

  // Non-S3 links: return the stored URL as-is.
  if (!record.keyId) {
    return record.originalUrl;
  }

  // S3-backed: reuse the cached presigned URL if it hasn't expired yet.
  if (isPresignedUrlFresh(record)) {
    return record.originalUrl;
  }

  // Expired (or never presigned): regenerate lazily.
  const variant = (record.variant as UrlVariant) ?? 'view';
  const freshUrl = presignForKey(record.keyId, variant, record.expiresIn ?? undefined);

  await db
    .update(shortenedUrls)
    .set({ originalUrl: freshUrl, presignedAt: new Date() })
    .where(eq(shortenedUrls.id, record.id));

  return freshUrl;
};
