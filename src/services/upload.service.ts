import { db } from '../db';
import { users, files as filesTable, filesUrl } from '../db/schema';
import { client as s3 } from '../config/s3';
import { v4 as uuid } from 'uuid';
import { eq } from 'drizzle-orm';
import { urlService } from './url.service';

class UploadService {
    async uploadSingle(file: Express.Multer.File, userId: number) {
        const key = `${userId}/${uuid()}-${file.originalname}`;
        await s3.file(key).write(file.buffer);

        const presignedUrl = await s3.presign(key, { expiresIn: 60 * 60 * 24 * 7 });

        const [newFile] = await db.insert(filesTable).values({
            name: file.originalname,
            key,
            size: file.size,
            userId,
        }).returning();

        await db.insert(filesUrl).values({
            fileId: newFile.id,
            url: presignedUrl,
        });

        const user = await db.query.users.findFirst({ where: eq(users.id, userId) });

        if (user) {
            const newStorageUsed = user.storageUsed + file.size;
            const newStorageLeft = user.storageLeft - file.size;

            await db.update(users).set({
                storageUsed: newStorageUsed,
                storageLeft: newStorageLeft,
            }).where(eq(users.id, userId));
        }

        const shortCode = await urlService.shortenUrl(presignedUrl);

        return { 
            fullUrl: presignedUrl,
            shortUrl: `http://localhost:3000/${shortCode}`
        };
    }

    async uploadMultiple(files: Express.Multer.File[], userId: number) {
        const urls = await Promise.all(files.map(file => this.uploadSingle(file, userId)));
        return urls;
    }
}

export const uploadService = new UploadService();