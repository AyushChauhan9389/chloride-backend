import { Elysia, status, t } from 'elysia';
import { eq } from 'drizzle-orm';
import { db } from '../../db';
import { users, plans, roles } from '../../db/schema';
import { ROLE_NAMES } from '../../types';
import { authPlugin, jwtPlugin, refreshJwtPlugin } from '../../plugins/auth';
import { initializeDefaultRoles } from '../roles/service';
import { buildJwtPayload, getUserByEmail, hashPassword, verifyPassword } from './service';
import { credentialsBody } from './model';

export const authModule = new Elysia({ prefix: '/api/auth', tags: ['Auth'] })
  .use(jwtPlugin)
  .use(refreshJwtPlugin)
  .use(authPlugin)
  .post(
    '/signup',
    async ({ jwt, refreshJwt, body }) => {
      const { email, password } = body;

      const existingUser = await getUserByEmail(email);
      if (existingUser) {
        return status(409, { message: 'User already exists' });
      }

      const hashedPassword = await hashPassword(password);

      // Ensure default roles exist before assigning one
      await initializeDefaultRoles();

      const defaultPlan = await db.query.plans.findFirst({
        where: eq(plans.name, 'Free'),
      });
      if (!defaultPlan) {
        return status(500, { message: 'Default plan not found. Please contact administrator.' });
      }

      const defaultRole = await db.query.roles.findFirst({
        where: eq(roles.name, ROLE_NAMES.USER),
      });
      if (!defaultRole) {
        return status(500, { message: 'Default user role not found' });
      }

      const [savedUser] = await db
        .insert(users)
        .values({
          email,
          password: hashedPassword,
          roleId: defaultRole.id,
          planId: defaultPlan.id,
          storageUsed: 0,
          storageLeft: defaultPlan.storageLimit,
        })
        .returning();

      const payload = await buildJwtPayload(savedUser.id);
      const token = await jwt.sign(payload as unknown as Parameters<typeof jwt.sign>[0]);
      const refreshToken = await refreshJwt.sign(
        payload as unknown as Parameters<typeof refreshJwt.sign>[0]
      );

      return status(201, {
        token,
        refreshToken,
        user: {
          id: savedUser.id,
          email: savedUser.email,
          role: defaultRole.name,
          plan: defaultPlan.name,
          storageLimit: defaultPlan.storageLimit,
        },
      });
    },
    { body: credentialsBody }
  )
  .post(
    '/login',
    async ({ jwt, refreshJwt, body }) => {
      const { email, password } = body;

      const user = await getUserByEmail(email);
      if (!user) {
        return status(401, { message: 'Invalid credentials' });
      }

      const isPasswordValid = await verifyPassword(password, user.password);
      if (!isPasswordValid) {
        return status(401, { message: 'Invalid credentials' });
      }

      const payload = await buildJwtPayload(user.id);
      const token = await jwt.sign(payload as unknown as Parameters<typeof jwt.sign>[0]);
      const refreshToken = await refreshJwt.sign(
        payload as unknown as Parameters<typeof refreshJwt.sign>[0]
      );

      return {
        token,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          role: user.role?.name,
          plan: user.plan?.name,
        },
      };
    },
    { body: credentialsBody }
  )
  // Exchange a valid refresh token for a fresh access token. The refresh
  // token is long-lived (30d); the access token is short-lived (1h).
  .post(
    '/refresh',
    async ({ refreshJwt, jwt, bearer, status }) => {
      if (!bearer) {
        return status(401, { message: 'Refresh token required' });
      }

      const payload = (await refreshJwt.verify(bearer)) as unknown as Awaited<
        ReturnType<typeof buildJwtPayload>
      > | false;
      if (!payload) {
        return status(401, { message: 'Invalid or expired refresh token' });
      }

      // Re-fetch the user so role/plan/permissions are current.
      const fresh = await buildJwtPayload(payload.id);
      const token = await jwt.sign(fresh as unknown as Parameters<typeof jwt.sign>[0]);

      return { token, user: { id: fresh.id, email: fresh.email, role: fresh.role, plan: fresh.plan } };
    },
    { body: t.Object({}) }
  )
  // Verify a token and return the decoded user (auth macro does the work).
  .get('/verify', ({ user }) => ({ valid: true, user }), { auth: true });
