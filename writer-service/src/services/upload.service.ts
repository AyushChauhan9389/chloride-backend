import { db } from '../db';
import { users, files as filesTable } from '../db/schema';
import { drive } from '../config/googleOauth';
import { eq } from 'drizzle-orm';
import { shortenUrl } from './url.service';
import { Readable } from 'stream';
import { KafkaClient, KafkaTopics, FileUploadedEvent, StorageUpdatedEvent } from '@chloride/shared';

const kafkaClient = new KafkaClient('writer-service-upload');

interface DriveUploadResponse {
  kind: string;
  id: string;
  name: string;
  mimeType: string;
}

interface DriveUrlResponse {
  webViewLink: string;
  webContentLink: string;
}

export const uploadSingle = async (file: Express.Multer.File, userId: number) => {
  // Get user with plan info
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    with: {
      plan: true
    }
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Check storage limits
  const fileSizeBytes = file.size;
  const fileSizeMB = fileSizeBytes / (1024 * 1024);

  // storageLeft is stored in MB, so convert for comparison
  if (user.storageLeft < fileSizeMB) {
    throw new Error('Storage limit exceeded');
  }

  // Upload to Google Drive
  const response = await drive.files.create({
    requestBody: {
      name: file.originalname,
      mimeType: file.mimetype,
    },
    media: {
      body: Readable.from(file.buffer),
      mimeType: file.mimetype,
    },
  });

  const driveData = response.data as DriveUploadResponse;

  // Set public permissions
  await drive.permissions.create({
    fileId: driveData.id,
    requestBody: {
      role: 'reader',
      type: 'anyone',
    }
  });

  // Get URLs
  const urlResponse = await drive.files.get({
    fileId: driveData.id,
    fields: 'webViewLink, webContentLink',
  });

  const urlData = urlResponse.data as DriveUrlResponse;

  let shortViewUrl = '';
  let shortDownloadUrl = '';
  let fileId: number;

  // Database transaction for file creation and URL shortening
  await db.transaction(async (tx) => {
    // Insert file record
    const [newFile] = await tx.insert(filesTable).values({
      name: file.originalname,
      keyId: driveData.id,
      OriginalViewUrl: urlData.webViewLink,
      OriginalDownloadUrl: urlData.webContentLink,
      size: fileSizeBytes,
      userId,
    }).returning();

    fileId = newFile.id;

    // Shorten URLs
    const shortViewCode = await shortenUrl(urlData.webViewLink);
    const shortDownloadCode = await shortenUrl(urlData.webContentLink);
    
    shortViewUrl = `https://${process.env.DOMAIN}/${shortViewCode}`;
    shortDownloadUrl = `https://${process.env.DOMAIN}/${shortDownloadCode}`;

    // Update file with short URLs
    await tx.update(filesTable)
      .set({
        ShortViewUrl: shortViewUrl,
        ShortDownloadUrl: shortDownloadUrl
      })
      .where(eq(filesTable.id, fileId));

    // Update user storage (stored in MB as integers)
    const fileSizeMBRounded = Math.ceil(fileSizeMB);
    const newStorageUsed = user.storageUsed + fileSizeMBRounded;
    const newStorageLeft = user.storageLeft - fileSizeMBRounded;

    await tx.update(users)
      .set({
        storageUsed: newStorageUsed,
        storageLeft: newStorageLeft
      })
      .where(eq(users.id, userId));

    // Publish storage updated event
    try {
      await kafkaClient.connectProducer();
      const storageEvent: StorageUpdatedEvent = {
        userId,
        storageUsed: newStorageUsed,
        storageLeft: newStorageLeft,
        bytesAdded: fileSizeBytes,
        timestamp: new Date().toISOString(),
      };
      await kafkaClient.sendMessage(KafkaTopics.STORAGE_UPDATED, `user-${userId}`, storageEvent);
    } catch (error) {
      console.error('Failed to publish storage updated event:', error);
    }
  });

  // Publish file uploaded event
  try {
    await kafkaClient.connectProducer();
    const fileEvent: FileUploadedEvent = {
      fileId: fileId!,
      userId,
      fileName: file.originalname,
      fileSize: fileSizeBytes,
      keyId: driveData.id,
      originalViewUrl: urlData.webViewLink,
      originalDownloadUrl: urlData.webContentLink,
      shortViewUrl,
      shortDownloadUrl,
      timestamp: new Date().toISOString(),
    };
    await kafkaClient.sendMessage(KafkaTopics.FILE_UPLOADED, `file-${fileId!}`, fileEvent);
  } catch (error) {
    console.error('Failed to publish file uploaded event:', error);
  }

  return {
    shortViewUrl,
    shortDownloadUrl,
    ViewUrl: urlData.webViewLink,
    DownloadUrl: urlData.webContentLink
  };
};

export const uploadMultiple = async (files: Express.Multer.File[], userId: number) => {
  const results = await Promise.all(files.map(file => uploadSingle(file, userId)));
  return results;
};

