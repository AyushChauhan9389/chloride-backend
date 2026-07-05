import { Elysia, t, status } from 'elysia';
import { authPlugin } from '../../plugins/auth';
import { ROLE_NAMES } from '../../types';
import { getAllFiles, getFileById, getFilesByUserId } from './service';
import { regenerateShortUrl } from '../urls/service';

export const filesModule = new Elysia({ prefix: '/api/files', tags: ['Files'] })
  .use(authPlugin)
  .get('/my-files', async ({ user }) => getFilesByUserId(user.id), { auth: true })
  .get('/all', async () => getAllFiles(), { auth: { roles: [ROLE_NAMES.ADMIN] } })
  .post(
    '/:fileId/regenerate-urls',
    async ({ user, params }) => {
      const file = await getFileById(params.fileId);
      if (!file) return status(404, { message: 'File not found' });
      if (file.userId !== user.id && user.role !== ROLE_NAMES.ADMIN) {
        return status(403, { message: 'Access denied' });
      }

      const viewCode = file.ShortViewUrl?.split('/').pop();
      const downloadCode = file.ShortDownloadUrl?.split('/').pop();

      const viewUrl = viewCode ? await regenerateShortUrl(viewCode) : null;
      const downloadUrl = downloadCode ? await regenerateShortUrl(downloadCode) : null;

      return {
        message: 'URLs regenerated successfully',
        fileId: file.id,
        ViewUrl: viewUrl,
        DownloadUrl: downloadUrl,
        shortViewUrl: file.ShortViewUrl,
        shortDownloadUrl: file.ShortDownloadUrl,
      };
    },
    { auth: true, params: t.Object({ fileId: t.Number() }) }
  )
  .get(
    '/:fileId',
    async ({ user, params }) => {
      const file = await getFileById(params.fileId);
      if (!file) return status(404, { message: 'File not found' });
      if (file.userId !== user.id && user.role !== ROLE_NAMES.ADMIN) {
        return status(403, { message: 'Access denied' });
      }
      return file;
    },
    { auth: true, params: t.Object({ fileId: t.Number() }) }
  );
