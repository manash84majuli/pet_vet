/**
 * Drizzle ORM Database Configuration
 * Type-safe database queries using Drizzle ORM with PostgreSQL
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable not set");
}

/**
 * Connection pool - reuse across hot reloads to avoid exhausting slots
 */
type GlobalPostgres = typeof globalThis & {
  queryClient?: ReturnType<typeof postgres>;
};

const globalForPostgres = globalThis as GlobalPostgres;

const queryClient =
  globalForPostgres.queryClient ??
  postgres(process.env.DATABASE_URL, {
    prepare: true,
    max: process.env.NODE_ENV === "production" ? 1 : 5, // Single connection for serverless
    idle_timeout: 20,
    connect_timeout: 10,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPostgres.queryClient = queryClient;
}

/**
 * Drizzle ORM instance with schema
 * Provides type-safe query builder
 */
export const db = drizzle(queryClient, { schema });

// Export for advanced operations if needed
export { queryClient };

// Type export for use across the app
export type Database = typeof db;
