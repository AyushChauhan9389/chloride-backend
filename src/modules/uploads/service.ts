import { randomUUID } from 'crypto';
import { eq } from 'drizzle-orm';
import { db } from '../../db';
import { files as filesTable, users } from '../../db/schema';
import { s3 } from '../../config/s3';
import { updateUserStorage } from '../plans/service';
import { presignForKey, shortenUrl } from '../urls/service';

export interface UploadResult {
  shortViewUrl: string;
  shortDownloadUrl: string;
  ViewUrl: string;
  DownloadUrl: string;
}

const domain = () => process.env.DOMAIN ?? 'localhost:8080';

export const uploadSingle = async (file: File, userId: number): Promise<UploadResult> => {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    with: { plan: true },
  });
  if (!user) throw new Error('User not found');

  // Storage check: compare bytes to bytes (the original compared bytes to MB).
  if (user.storageLeft < file.size) {
    throw new Error('Storage limit exceeded');
  }

  const key = `${userId}/${randomUUID()}-${file.name}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  await s3.write(key, buffer, { type: file.type || 'application/octet-stream' });

  // Presigned URLs (expire); durable access is via the short codes below,
  // which regenerate a fresh presigned URL on each redirect.
  const viewUrl = presignForKey(key, 'view');
  const downloadUrl = presignForKey(key, 'download');

  const [newFile] = await db
    .insert(filesTable)
    .values({
      name: file.name,
      keyId: key,
      OriginalViewUrl: viewUrl,
      OriginalDownloadUrl: downloadUrl,
      size: file.size,
      userId,
    })
    .returning();

  const shortViewCode = await shortenUrl(viewUrl, { keyId: key, variant: 'view' });
  const shortDownloadCode = await shortenUrl(downloadUrl, { keyId: key, variant: 'download' });
  const shortViewUrl = `https://${domain()}/${shortViewCode}`;
  const shortDownloadUrl = `https://${domain()}/${shortDownloadCode}`;

  // Fixed: original update lacked a WHERE clause and overwrote every row.
  await db
    .update(filesTable)
    .set({ ShortViewUrl: shortViewUrl, ShortDownloadUrl: shortDownloadUrl })
    .where(eq(filesTable.id, newFile.id));

  // Fixed: original never incremented storage usage after a successful upload.
  await updateUserStorage(userId, file.size);

  return {
    shortViewUrl,
    shortDownloadUrl,
    ViewUrl: viewUrl,
    DownloadUrl: downloadUrl,
  };
};

export const uploadMultiple = async (files: File[], userId: number): Promise<UploadResult[]> => {
  const results: UploadResult[] = [];
  // Sequential so storage checks/updates stay consistent per file.
  for (const file of files) {
    results.push(await uploadSingle(file, userId));
  }
  return results;
};
