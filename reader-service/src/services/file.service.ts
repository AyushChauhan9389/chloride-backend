import { db } from '../db';
import { files } from '../db/schema';
import { eq } from 'drizzle-orm';

export const getFileById = async (fileId: number) => {
  return await db.query.files.findFirst({
    where: eq(files.id, fileId),
    with: {
      user: true,
    },
  });
};

export const getFilesByUserId = async (userId: number) => {
  return await db.query.files.findMany({
    where: eq(files.userId, userId),
  });
};

export const getAllFiles = async () => {
  return await db.query.files.findMany();
};

