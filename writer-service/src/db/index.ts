import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import dotenv from 'dotenv';

dotenv.config();

type Database = typeof schema;
const client = postgres(process.env.DATABASE_URL!);
export const db = drizzle<Database>(client, { schema });

