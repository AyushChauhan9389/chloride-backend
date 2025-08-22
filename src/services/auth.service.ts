
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { db } from '../db';
import { getUserWithRoleAndPlan } from '../db';
import { ROLE_NAMES } from '../types/user.types';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET!;

export interface JWTUserPayload {
  id: number;
  email: string;
  role?: string;
  plan?: string;
  permissions?: string[];
}

export const generateToken = (payload: object) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
};

export const generateUserToken = async (userId: number): Promise<string> => {
  try {
    const userWithRole = await getUserWithRoleAndPlan(userId);

    if (!userWithRole) {
      throw new Error('User not found');
    }

    const payload: JWTUserPayload = {
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

export const verifyToken = (token: string) => {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTUserPayload;
  } catch (error) {
    return null;
  }
};

export const extractUserFromToken = (token: string) => {
  const decoded = verifyToken(token);
  if (!decoded) return null;

  return {
    id: decoded.id,
    email: decoded.email,
    role: decoded.role,
    plan: decoded.plan,
    permissions: decoded.permissions || [],
  };
};
