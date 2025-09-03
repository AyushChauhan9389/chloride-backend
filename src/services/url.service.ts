
import { db } from '../db';
import { shortenedUrls } from '../db/schema';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

class UrlService {
    async shortenUrl(originalUrl: string): Promise<string> {
        const shortCode = nanoid(8);
        await db.insert(shortenedUrls).values({
            originalUrl,
            shortCode,
        });
        return shortCode;
    }

    async getOriginalUrl(shortCode: string): Promise<string | null> {
        const result = await db.query.shortenedUrls.findFirst({
            where: eq(shortenedUrls.shortCode, shortCode),
        });
        return result ? result.originalUrl : null;
    }
}

export const urlService = new UrlService();
