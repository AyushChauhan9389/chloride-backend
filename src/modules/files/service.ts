import { eq } from 'drizzle-orm';
import { db } from '../../db';
import { files } from '../../db/schema';
import { presignForKey, shortenUrl } from '../urls/service';

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

  const viewUrl = presignForKey(file.keyId, 'view');
  const downloadUrl = presignForKey(file.keyId, 'download', file.name);
  let shortViewUrl = file.ShortViewUrl;
  let shortDownloadUrl = file.ShortDownloadUrl;

  if (!shortViewUrl) {
    const code = await shortenUrl(viewUrl, { keyId: file.keyId, variant: 'view' });
    shortViewUrl = `https://${domain()}/${code}`;
  }

  if (!shortDownloadUrl) {
    const code = await shortenUrl(downloadUrl, { keyId: file.keyId, variant: 'download' });
    shortDownloadUrl = `https://${domain()}/${code}`;
  }

  await db
    .update(files)
    .set({
      OriginalViewUrl: viewUrl,
      OriginalDownloadUrl: downloadUrl,
      ShortViewUrl: shortViewUrl,
      ShortDownloadUrl: shortDownloadUrl,
    })
    .where(eq(files.id, fileId));

  return {
    fileId: file.id,
    ViewUrl: viewUrl,
    DownloadUrl: downloadUrl,
    shortViewUrl,
    shortDownloadUrl,
  };
};
