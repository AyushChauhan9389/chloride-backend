import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { openapi } from '@elysiajs/openapi';
import { eq } from 'drizzle-orm';
import { db } from './db';
import { plans } from './db/schema';
import { authPlugin } from './plugins/auth';
import { initializeDefaultRoles } from './modules/roles/service';
import { authModule } from './modules/auth';
import { rolesModule } from './modules/roles';
import { plansModule } from './modules/plans';
import { uploadsModule } from './modules/uploads';
import { filesModule } from './modules/files';
import { urlsModule } from './modules/urls';

const PORT = Number(process.env.PORT ?? 8080);

// Seed default roles and the Free plan so signup works out of the box.
const bootstrap = async () => {
  try {
    await initializeDefaultRoles();
    const freePlan = await db.query.plans.findFirst({ where: eq(plans.name, 'Free') });
    if (!freePlan) {
      await db.insert(plans).values({
        name: 'Free',
        fileLimit: 10,
        storageLimit: 100 * 1024 * 1024, // 100MB
      });
      console.log('Created default plan: Free');
    }
  } catch (error) {
    console.error('Bootstrap failed:', error);
  }
};

export const app = new Elysia()
  .use(
    cors({
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true,
    })
  )
  .use(
    openapi({
      documentation: {
        info: { title: 'Chloride API', version: '1.0.0' },
      },
    })
  )
  .get('/api/health', () => ({ status: 'OK', timestamp: new Date().toISOString() }))
  .use(authPlugin)
  .get('/api/protected', ({ user }) => ({ message: 'This is a protected route', user }), {
    auth: true,
  })
  // Feature modules
  .use(authModule)
  .use(rolesModule)
  .use(plansModule)
  .use(uploadsModule)
  .use(filesModule)
  // URL shortener catch-all (root-level /:shortCode) — registered last.
  .use(urlsModule);

await bootstrap();

app.listen(PORT, () => {
  console.log(`🦊 Chloride API running at http://localhost:${PORT}`);
});

export type App = typeof app;
