import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

// This is the missing piece: 
// It loads your variables into process.env so Drizzle can see them.
dotenv.config({ path: ".env.local" });

export default defineConfig({
  schema: "./lib/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    // Now process.env.DATABASE_URL will actually contain your string
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
});