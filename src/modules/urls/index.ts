import { Elysia, t, status, redirect } from 'elysia';
import { resolveUrl } from './service';

// Root-level URL shortener redirects: GET /:shortCode
export const urlsModule = new Elysia({ tags: ['URLs'] }).get(
  '/:shortCode',
  async ({ params }) => {
    const originalUrl = await resolveUrl(params.shortCode);
    if (!originalUrl) return status(404, { message: 'URL not found' });
    return redirect(originalUrl);
  },
  { params: t.Object({ shortCode: t.String() }) }
);
