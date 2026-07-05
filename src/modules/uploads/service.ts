import { randomUUID } from 'crypto';
import { eq } from 'drizzle-orm';
import { db } from '../../db';
import { files as filesTable, users } from '../../db/schema';
import { s3, UPLOAD_PRESIGN_EXPIRES_IN } from '../../config/s3';
import { isUnlimited } from '../../lib/storage';
import { checkUserFileLimit, checkUserStorageLimit, updateUserStorage } from '../plans/service';
import { presignForKey, shortenUrl } from '../urls/service';

export interface UploadResult {
  fileId: number;
  shortViewUrl: string;
  shortDownloadUrl: string;
  ViewUrl: string;
  DownloadUrl: string;
}

export interface PresignResult {
  key: string;
  uploadUrl: string;
  expiresIn: number;
}

const domain = () => process.env.DOMAIN ?? 'localhost:8080';

const buildKey = (userId: number, name: string) => `${userId}/${randomUUID()}-${name}`;

// Ensure the user has room for `size` more bytes and one more file.
const assertQuota = async (userId: number, size: number) => {
  const withinStorage = await checkUserStorageLimit(userId, size);
  if (!withinStorage) throw new Error('Storage limit exceeded');

  const currentFileCount = await db.$count(filesTable, eq(filesTable.userId, userId));
  const withinFiles = await checkUserFileLimit(userId, currentFileCount + 1);
  if (!withinFiles) throw new Error('File limit exceeded');
};

// Record a file that already exists in S3: create the row, mint short codes,
// and update the user's storage usage. Shared by the through-API and
// presigned-upload flows.
const finalizeUpload = async (
  userId: number,
  key: string,
  name: string,
  size: number
): Promise<UploadResult> => {
  const viewUrl = presignForKey(key, 'view');
  const downloadUrl = presignForKey(key, 'download');

  const [newFile] = await db
    .insert(filesTable)
    .values({
      name,
      keyId: key,
      OriginalViewUrl: viewUrl,
      OriginalDownloadUrl: downloadUrl,
      size,
      userId,
    })
    .returning();

  const shortViewCode = await shortenUrl(viewUrl, { keyId: key, variant: 'view' });
  const shortDownloadCode = await shortenUrl(downloadUrl, { keyId: key, variant: 'download' });
  const shortViewUrl = `https://${domain()}/${shortViewCode}`;
  const shortDownloadUrl = `https://${domain()}/${shortDownloadCode}`;

  await db
    .update(filesTable)
    .set({ ShortViewUrl: shortViewUrl, ShortDownloadUrl: shortDownloadUrl })
    .where(eq(filesTable.id, newFile.id));

  await updateUserStorage(userId, size);

  return {
    fileId: newFile.id,
    shortViewUrl,
    shortDownloadUrl,
    ViewUrl: viewUrl,
    DownloadUrl: downloadUrl,
  };
};

// --- Flow 1: upload through the API (client -> server -> S3) ---
export const uploadSingle = async (file: File, userId: number): Promise<UploadResult> => {
  await assertQuota(userId, file.size);

  const key = buildKey(userId, file.name);
  const buffer = Buffer.from(await file.arrayBuffer());
  await s3.write(key, buffer, { type: file.type || 'application/octet-stream' });

  return finalizeUpload(userId, key, file.name, file.size);
};

export const uploadMultiple = async (files: File[], userId: number): Promise<UploadResult[]> => {
  const results: UploadResult[] = [];
  for (const file of files) {
    results.push(await uploadSingle(file, userId));
  }
  return results;
};

// --- Flow 2: presigned direct upload (client -> S3) ---

// Step 1: validate quota against the declared size and hand back a presigned
// PUT URL. No DB row is created yet.
export const presignUpload = async (
  userId: number,
  name: string,
  contentType?: string,
  size = 0
): Promise<PresignResult> => {
  await assertQuota(userId, size);

  const key = buildKey(userId, name);
  const uploadUrl = s3.file(key).presign({
    method: 'PUT',
    expiresIn: UPLOAD_PRESIGN_EXPIRES_IN,
    ...(contentType ? { type: contentType } : {}),
  });

  return { key, uploadUrl, expiresIn: UPLOAD_PRESIGN_EXPIRES_IN };
};

// Step 3: confirm the client finished uploading. Verifies ownership +
// existence, reads the real object size from S3, enforces quota, then records
// the file.
export const completeUpload = async (
  userId: number,
  key: string,
  name?: string
): Promise<UploadResult> => {
  // Ownership: the key must live under this user's prefix.
  if (!key.startsWith(`${userId}/`)) {
    throw new Error('Invalid key');
  }

  const object = s3.file(key);
  if (!(await object.exists())) {
    throw new Error('Uploaded object not found');
  }

  const stat = await object.stat();
  const size = stat.size;

  // Re-check storage against the real uploaded size (unlimited plans bypass).
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    with: { plan: true },
  });
  if (!user) throw new Error('User not found');
  const planLimit = user.plan?.storageLimit ?? 0;
  if (!isUnlimited(planLimit) && !(await checkUserStorageLimit(userId, size))) {
    // Clean up the orphaned object so it doesn't count against the bucket.
    await object.delete().catch(() => {});
    throw new Error('Storage limit exceeded');
  }

  // Derive a display name from the key if the client didn't send one.
  const displayName = name ?? key.split('/').pop()?.replace(/^[0-9a-f-]{36}-/, '') ?? key;

  return finalizeUpload(userId, key, displayName, size);
};
