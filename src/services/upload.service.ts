import { db } from '../db';
import { users, files as filesTable } from '../db/schema';
import { client as s3 } from '../config/s3';
import { v4 as uuid } from 'uuid';
import { eq } from 'drizzle-orm';
import { urlService } from './url.service';
import { drive } from '../config/googleOauth';
import { DriveUploadResponse, DriveUrlResponse } from '../types/Response.types';

class UploadService {
    async uploadSingle(file: Express.Multer.File, userId: number) {
        const user = await db.query.users.findFirst({ 
            where: eq(users.id, userId),
            with: {
                plan: true
            }
        });
        if (!user) {
            throw new Error('User not found');
        }

        if(user.storageLeft < file.size) {
            throw new Error('Storage limit exceeded');
        }
        

        const key = `${userId}/${uuid()}-${file.originalname}`;
        
        const response = await drive.files.create({
            requestBody: {
                name: file.originalname,
                mimeType: file.mimetype,
            },
            media: {
                body: file.buffer,
                mimeType: file.mimetype,
            },
        })
        const Data = response.data as DriveUploadResponse;
        await drive.permissions.create({
            fileId: Data.id,
            requestBody: {
                role: 'reader',
                type: 'anyone',
            }
        })
        const url = await drive.files.get({
            fileId: Data.id,
            fields: 'webViewLink, webContentLink',
        })
        const DataUrl = url.data as DriveUrlResponse;

        let ShortViewUrl = '';
        let ShortDownloadUrl = '';
        await db.transaction(async (tx) => {
            const [newFile] = await tx.insert(filesTable).values({
                name: file.originalname,
                keyId: Data.id,
                OriginalViewUrl: DataUrl.webViewLink,
                OriginalDownloadUrl: DataUrl.webContentLink,
                size: file.size,
                userId,
            })
            const ShortViewCode = await urlService.shortenUrl(DataUrl.webViewLink)
            const ShortContentCode = await urlService.shortenUrl(DataUrl.webContentLink)
            ShortViewUrl = `https://${process.env.DOMAIN}/${ShortViewCode}`
            ShortDownloadUrl = `https://${process.env.DOMAIN}/${ShortContentCode}`
            await tx.update(filesTable).set({
                ShortViewUrl,
                ShortDownloadUrl
            })
            
        })

        return { 
            shortViewUrl: ShortViewUrl,
            shortDownloadUrl: ShortDownloadUrl,
            ViewUrl: DataUrl.webViewLink,
            DownloadUrl: DataUrl.webContentLink
        };
    }

    async uploadMultiple(files: Express.Multer.File[], userId: number) {
        const urls = await Promise.all(files.map(file => this.uploadSingle(file, userId)));
        return urls;
    }
}

export const uploadService = new UploadService();