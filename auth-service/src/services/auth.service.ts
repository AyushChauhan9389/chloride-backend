import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { db, getUserWithRoleAndPlan } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import { JWTPayload } from '@chloride/shared';

const JWT_SECRET = process.env.JWT_SECRET!;

export const generateToken = (payload: object) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
};

export const generateUserToken = async (userId: number): Promise<string> => {
  try {
    const userWithRole = await getUserWithRoleAndPlan(userId);

    if (!userWithRole) {
      throw new Error('User not found');
    }

    const payload: JWTPayload = {
      id: userWithRole.id,
      email: userWithRole.email,
      role: userWithRole.role?.name,
      plan: userWithRole.plan?.name,
    };

    // Add permissions if role exists
    if (userWithRole.role?.permissions) {
      try {
        const permissions = JSON.parse(userWithRole.role.permissions);
        payload.permissions = Object.keys(permissions).filter(key => permissions[key]);
      } catch (error) {
        console.error('Error parsing role permissions:', error);
      }
    }

    return generateToken(payload);
  } catch (error) {
    console.error('Error generating user token:', error);
    throw error;
  }
};

export const verifyToken = (token: string): JWTPayload | null => {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    return null;
  }
};

export const hashPassword = async (password: string): Promise<string> => {
  return await bcrypt.hash(password, 10);
};

export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return await bcrypt.compare(password, hash);
};

export const getUserByEmail = async (email: string) => {
  return await db.query.users.findFirst({
    where: eq(users.email, email),
    with: {
      role: true,
      plan: true,
    },
  });
};

export const getUserById = async (userId: number) => {
  return await getUserWithRoleAndPlan(userId);
};

