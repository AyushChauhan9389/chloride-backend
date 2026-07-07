import { eq } from 'drizzle-orm';
import { db } from '../../db';
import { files, shortenedUrls } from '../../db/schema';
import { s3 } from '../../config/s3';
import { updateUserStorage } from '../plans/service';
import { presignForKey, regenerateShortUrl, shortenUrl } from '../urls/service';

const domain = () => process.env.DOMAIN ?? 'localhost:8080';

export const getFileById = async (fileId: number) => {
  return db.query.files.findFirst({
    where: eq(files.id, fileId),
    with: { user: true },
  });
};

export const getFilesByUserId = async (userId: number) => {
  return db.query.files.findMany({ where: eq(files.userId, userId) });
};

export const getAllFiles = async () => {
  return db.query.files.findMany();
};

export const regenerateFileUrls = async (fileId: number) => {
  const file = await getFileById(fileId);
  if (!file) return null;

  const viewCode = file.ShortViewUrl?.split('/').pop();
  const downloadCode = file.ShortDownloadUrl?.split('/').pop();
  const viewUrl = viewCode ? await regenerateShortUrl(viewCode) : presignForKey(file.keyId, 'view');
  const downloadUrl = downloadCode
    ? await regenerateShortUrl(downloadCode)
    : presignForKey(file.keyId, 'download', undefined, file.name);
  let shortViewUrl = file.ShortViewUrl;
  let shortDownloadUrl = file.ShortDownloadUrl;

  if (!shortViewUrl) {
    const code = await shortenUrl(viewUrl ?? presignForKey(file.keyId, 'view'), {
      keyId: file.keyId,
      variant: 'view',
    });
    shortViewUrl = `https://${domain()}/${code}`;
  }

  if (!shortDownloadUrl) {
    const code = await shortenUrl(
      downloadUrl ?? presignForKey(file.keyId, 'download', undefined, file.name),
      { keyId: file.keyId, variant: 'download' }
    );
    shortDownloadUrl = `https://${domain()}/${code}`;
  }

  await db
    .update(files)
    .set({
      OriginalViewUrl: viewUrl ?? file.OriginalViewUrl,
      OriginalDownloadUrl: downloadUrl ?? file.OriginalDownloadUrl,
      ShortViewUrl: shortViewUrl,
      ShortDownloadUrl: shortDownloadUrl,
    })
    .where(eq(files.id, fileId));

  return {
    message: 'URLs regenerated successfully',
    fileId: file.id,
    ViewUrl: viewUrl,
    DownloadUrl: downloadUrl,
    shortViewUrl,
    shortDownloadUrl,
  };
};

export const deleteFileById = async (fileId: number) => {
  const file = await getFileById(fileId);
  if (!file) return null;

  await s3.file(file.keyId).delete().catch(() => {});
  await db.delete(shortenedUrls).where(eq(shortenedUrls.keyId, file.keyId));
  await db.delete(files).where(eq(files.id, fileId));
  await updateUserStorage(file.userId, -file.size);

  return { message: 'File deleted successfully', fileId: file.id };
};
