import { Elysia, t, status } from 'elysia';
import { authPlugin } from '../../plugins/auth';
import { completeUpload, presignUpload, uploadMultiple, uploadSingle } from './service';
import { completeBody, presignBody } from './model';

const fail = (error: unknown) =>
  status(500, { message: error instanceof Error ? error.message : 'Upload failed' });

export const uploadsModule = new Elysia({ prefix: '/api/upload', tags: ['Uploads'] })
  .use(authPlugin)
  // --- Flow 1: upload through the API ---
  .post(
    '/single',
    async ({ user, body }) => {
      try {
        return await uploadSingle(body.file, user.id);
      } catch (error) {
        return fail(error);
      }
    },
    { auth: { permission: 'canUploadFiles' }, body: t.Object({ file: t.File() }) }
  )
  .post(
    '/multiple',
    async ({ user, body }) => {
      const files = Array.isArray(body.files) ? body.files : [body.files];
      try {
        return await uploadMultiple(files, user.id);
      } catch (error) {
        return fail(error);
      }
    },
    { auth: { permission: 'canUploadFiles' }, body: t.Object({ files: t.Files() }) }
  )
  // --- Flow 2: presigned direct-to-S3 upload ---
  // Step 1: get a presigned PUT URL (client uploads the bytes directly to S3).
  .post(
    '/presign',
    async ({ user, body }) => {
      try {
        return await presignUpload(user.id, body.name, body.contentType, body.size);
      } catch (error) {
        return fail(error);
      }
    },
    { auth: { permission: 'canUploadFiles' }, body: presignBody }
  )
  // Step 3: confirm the upload finished; records the file and mints short URLs.
  .post(
    '/complete',
    async ({ user, body }) => {
      try {
        return await completeUpload(user.id, body.key, body.name);
      } catch (error) {
        return fail(error);
      }
    },
    { auth: { permission: 'canUploadFiles' }, body: completeBody }
  );
