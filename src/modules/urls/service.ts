import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '../../db';
import { shortenedUrls } from '../../db/schema';
import { s3, PRESIGN_EXPIRES_IN } from '../../config/s3';

export type UrlVariant = 'view' | 'download';

// Create a short code. For S3-backed objects we store the object key + variant
// so a fresh presigned URL can be minted at redirect time (the bucket is
// private, so we never persist a long-lived public URL). `originalUrl` is kept
// as a fallback for non-S3 links.
export const shortenUrl = async (
  originalUrl: string,
  options?: { keyId?: string; variant?: UrlVariant }
): Promise<string> => {
  const shortCode = nanoid(8);
  await db.insert(shortenedUrls).values({
    originalUrl,
    shortCode,
    keyId: options?.keyId ?? null,
    variant: options?.variant ?? null,
  });
  return shortCode;
};

const contentDispositionFor = (name: string): string => {
  const asciiName = name.replace(/[^\x20-\x7E]/g, '_').replace(/["\\]/g, '_');
  return `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(name)}`;
};

// Generate a presigned URL for an S3 object key.
export const presignForKey = (keyId: string, variant: UrlVariant, fileName?: string): string => {
  return s3.file(keyId).presign({
    method: 'GET',
    expiresIn: PRESIGN_EXPIRES_IN,
    ...(variant === 'download'
      ? { contentDisposition: fileName ? contentDispositionFor(fileName) : 'attachment' }
      : {}),
  });
};

// Resolve a short code to a destination URL. If the record points at an S3
// object, a fresh presigned URL is generated on each request.
export const resolveUrl = async (shortCode: string): Promise<string | null> => {
  const record = await db.query.shortenedUrls.findFirst({
    where: eq(shortenedUrls.shortCode, shortCode),
  });
  if (!record) return null;

  if (record.keyId) {
    const file = await db.query.files.findFirst({
      where: (files, { eq }) => eq(files.keyId, record.keyId!),
    });
    return presignForKey(record.keyId, (record.variant as UrlVariant) ?? 'view', file?.name);
  }
  return record.originalUrl;
};
