import { Elysia, t, status } from 'elysia';
import { authPlugin } from '../../plugins/auth';
import { uploadMultiple, uploadSingle } from './service';

export const uploadsModule = new Elysia({ prefix: '/api/upload', tags: ['Uploads'] })
  .use(authPlugin)
  .post(
    '/single',
    async ({ user, body }) => {
      try {
        return await uploadSingle(body.file, user.id);
      } catch (error) {
        return status(500, { message: error instanceof Error ? error.message : 'Upload failed' });
      }
    },
    {
      auth: { permission: 'canUploadFiles' },
      body: t.Object({ file: t.File() }),
    }
  )
  .post(
    '/multiple',
    async ({ user, body }) => {
      const files = Array.isArray(body.files) ? body.files : [body.files];
      try {
        return await uploadMultiple(files, user.id);
      } catch (error) {
        return status(500, { message: error instanceof Error ? error.message : 'Upload failed' });
      }
    },
    {
      auth: { permission: 'canUploadFiles' },
      body: t.Object({ files: t.Files() }),
    }
  );
