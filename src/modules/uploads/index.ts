import { Elysia, t, status } from 'elysia';
import { authPlugin } from '../../plugins/auth';
import { completeUpload, presignUpload, uploadMultiple, uploadSingle } from './service';
import { completeBody, presignBody, singleUploadBody, multiUploadBody } from './model';

const fail = (error: unknown) =>
  status(500, { message: error instanceof Error ? error.message : 'Upload failed' });

const parseExpiresIn = (value: string | number | undefined): number | undefined => {
  if (value === undefined) return undefined;
  return typeof value === 'string' ? parseInt(value, 10) : value;
};

export const uploadsModule = new Elysia({ prefix: '/api/upload', tags: ['Uploads'] })
  .use(authPlugin)
  // --- Flow 1: upload through the API ---
  .post(
    '/single',
    async ({ user, body }) => {
      try {
        return await uploadSingle(body.file, user.id, parseExpiresIn(body.expiresIn));
      } catch (error) {
        return fail(error);
      }
    },
    { auth: { permission: 'canUploadFiles' }, body: singleUploadBody }
  )
  .post(
    '/multiple',
    async ({ user, body }) => {
      const files = Array.isArray(body.files) ? body.files : [body.files];
      try {
        return await uploadMultiple(files, user.id, parseExpiresIn(body.expiresIn));
      } catch (error) {
        return fail(error);
      }
    },
    { auth: { permission: 'canUploadFiles' }, body: multiUploadBody }
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
  // `expiresIn` controls how long the presigned view/download URLs stay valid.
  .post(
    '/complete',
    async ({ user, body }) => {
      try {
        return await completeUpload(user.id, body.key, body.name, parseExpiresIn(body.expiresIn));
      } catch (error) {
        return fail(error);
      }
    },
    { auth: { permission: 'canUploadFiles' }, body: completeBody }
  );
