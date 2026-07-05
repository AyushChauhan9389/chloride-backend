import { eq } from 'drizzle-orm';
import { db } from '../../db';
import { files } from '../../db/schema';

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
