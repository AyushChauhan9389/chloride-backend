
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { eq } from 'drizzle-orm';
import dotenv from 'dotenv';

dotenv.config();

type Database = typeof schema;
const client = postgres(process.env.DATABASE_URL!);
export const db = drizzle<Database>(client, { schema });

// Helper function to get user with role and plan information
export const getUserWithRoleAndPlan = async (userId: number) => {
  return await db.query.users.findFirst({
    where: eq(schema.users.id, userId),
    with: {
      role: true,
      plan: true,
    },
  });
};

// Helper function to get user with plan information (backward compatibility)
export const getUserWithPlan = async (userId: number) => {
  return await db.query.users.findFirst({
    where: eq(schema.users.id, userId),
    with: {
      plan: true,
    },
  });
};

// Helper function to get all plans
export const getAllPlans = async () => {
  return await db.query.plans.findMany();
};

// Helper function to get all roles
export const getAllRoles = async () => {
  return await db.query.roles.findMany();
};
