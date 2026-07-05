import { eq } from 'drizzle-orm';
import { db, getUserWithRoleAndPlan } from '../../db';
import { users } from '../../db/schema';
import type { AuthUser } from '../../types';

export const hashPassword = (password: string): Promise<string> => {
  return Bun.password.hash(password, { algorithm: 'bcrypt', cost: 10 });
};

export const verifyPassword = (password: string, hash: string): Promise<boolean> => {
  return Bun.password.verify(password, hash);
};

export const getUserByEmail = async (email: string) => {
  return db.query.users.findFirst({
    where: eq(users.email, email),
    with: { role: true, plan: true },
  });
};

// Build the JWT payload for a user, including flattened permission list.
// The actual signing happens in the route handler which has access to the
// `jwt` decorator from the auth plugin.
export const buildJwtPayload = async (userId: number): Promise<AuthUser> => {
  const user = await getUserWithRoleAndPlan(userId);
  if (!user) throw new Error('User not found');

  let permissions: string[] = [];
  if (user.role?.permissions) {
    try {
      const parsed = JSON.parse(user.role.permissions) as Record<string, boolean>;
      permissions = Object.keys(parsed).filter((key) => parsed[key]);
    } catch (error) {
      console.error('Error parsing role permissions:', error);
    }
  }

  return {
    id: user.id,
    email: user.email,
    role: user.role?.name,
    plan: user.plan?.name,
    permissions,
  };
};
