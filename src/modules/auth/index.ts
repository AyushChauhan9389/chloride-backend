import { Elysia, status } from 'elysia';
import { eq } from 'drizzle-orm';
import { db } from '../../db';
import { users, plans, roles } from '../../db/schema';
import { ROLE_NAMES } from '../../types';
import { authPlugin, jwtPlugin } from '../../plugins/auth';
import { initializeDefaultRoles } from '../roles/service';
import { buildJwtPayload, getUserByEmail, hashPassword, verifyPassword } from './service';
import { credentialsBody } from './model';

export const authModule = new Elysia({ prefix: '/api/auth', tags: ['Auth'] })
  .use(jwtPlugin)
  .use(authPlugin)
  .post(
    '/signup',
    async ({ jwt, body }) => {
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

      return status(201, {
        token,
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
    async ({ jwt, body }) => {
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

      return {
        token,
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
  // Verify a token and return the decoded user (auth macro does the work).
  .get('/verify', ({ user }) => ({ valid: true, user }), { auth: true });
