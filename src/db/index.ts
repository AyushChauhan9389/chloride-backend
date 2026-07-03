import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq } from 'drizzle-orm';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const client = postgres(connectionString);

export const db = drizzle(client, { schema });

// Helper: fetch a user with their role and plan joined
export const getUserWithRoleAndPlan = async (userId: number) => {
  return db.query.users.findFirst({
    where: eq(schema.users.id, userId),
    with: {
      role: true,
      plan: true,
    },
  });
};

// Helper: fetch a user with their plan joined
export const getUserWithPlan = async (userId: number) => {
  return db.query.users.findFirst({
    where: eq(schema.users.id, userId),
    with: {
      plan: true,
    },
  });
};

export { schema };
