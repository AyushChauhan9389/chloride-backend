import { db } from '../db';
import { shortenedUrls } from '../db/schema';
import { eq } from 'drizzle-orm';

export const getOriginalUrl = async (shortCode: string): Promise<string | null> => {
  const result = await db.query.shortenedUrls.findFirst({
    where: eq(shortenedUrls.shortCode, shortCode),
  });
  return result ? result.originalUrl : null;
};

