import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '../../db';
import { shortenedUrls } from '../../db/schema';
import { s3, clampPresignExpiry, clampS3PresignExpiry } from '../../config/s3';

export type UrlVariant = 'view' | 'download';

interface ShortenOptions {
  keyId?: string;
  variant?: UrlVariant;
  expiresIn?: number;
}

// For S3-backed links, originalUrl stores the cached raw presigned URL.
export const shortenUrl = async (originalUrl: string, options?: ShortenOptions): Promise<string> => {
  const shortCode = nanoid(8);
  const expiresIn = options?.keyId ? clampPresignExpiry(options.expiresIn) : null;

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

const contentDispositionFor = (name: string): string => {
  const asciiName = name.replace(/[^\x20-\x7E]/g, '_').replace(/["\\]/g, '_');
  return `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(name)}`;
};

export const presignForKey = (
  keyId: string,
  variant: UrlVariant,
  expiresIn?: number,
  fileName?: string
): string => {
  return s3.file(keyId).presign({
    method: 'GET',
    expiresIn: clampS3PresignExpiry(expiresIn),
    ...(variant === 'download'
      ? { contentDisposition: fileName ? contentDispositionFor(fileName) : 'attachment' }
      : {}),
  });
};

const fileNameForKey = async (keyId: string): Promise<string | undefined> => {
  const file = await db.query.files.findFirst({
    where: (files, { eq }) => eq(files.keyId, keyId),
  });
  return file?.name;
};

const isPresignedUrlFresh = (record: typeof shortenedUrls.$inferSelect): boolean => {
  if (!record.expiresIn || !record.presignedAt) return false;
  const expiresAt =
    new Date(record.presignedAt).getTime() + clampS3PresignExpiry(record.expiresIn) * 1000;
  return Date.now() < expiresAt;
};

export const regenerateShortUrl = async (shortCode: string): Promise<string | null> => {
  const record = await db.query.shortenedUrls.findFirst({
    where: eq(shortenedUrls.shortCode, shortCode),
  });
  if (!record?.keyId) return null;

  const variant = (record.variant as UrlVariant) ?? 'view';
  const fileName = variant === 'download' ? await fileNameForKey(record.keyId) : undefined;
  const freshUrl = presignForKey(record.keyId, variant, record.expiresIn ?? undefined, fileName);

  await db
    .update(shortenedUrls)
    .set({ originalUrl: freshUrl, presignedAt: new Date() })
    .where(eq(shortenedUrls.id, record.id));

  return freshUrl;
};

export const resolveUrl = async (shortCode: string): Promise<string | null> => {
  const record = await db.query.shortenedUrls.findFirst({
    where: eq(shortenedUrls.shortCode, shortCode),
  });
  if (!record) return null;

  if (!record.keyId) return record.originalUrl;
  if (isPresignedUrlFresh(record)) return record.originalUrl;

  return regenerateShortUrl(shortCode);
};
