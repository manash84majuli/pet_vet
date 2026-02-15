/**
 * Database Connection Test API
 * Use this to verify database connectivity on Vercel
 * Visit: /api/test-db
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/drizzle";
import * as schema from "@/lib/schema";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const startTime = Date.now();
    
    // Test 1: Simple query
    const profiles = await db.select().from(schema.profiles).limit(1);
    const queryTime = Date.now() - startTime;
    
    // Test 2: Check environment variables
    const envVars = {
      DATABASE_URL: process.env.DATABASE_URL ? "✓ Set" : "✗ Missing",
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? "✓ Set" : "✗ Missing",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "✓ Set" : "✗ Missing",
      NODE_ENV: process.env.NODE_ENV,
    };
    
    // Test 3: Check database URL format
    const dbUrl = process.env.DATABASE_URL || "";
    const usesPooler = dbUrl.includes(":6543") || dbUrl.includes("pgbouncer=true");
    
    return NextResponse.json({
      success: true,
      message: "Database connected successfully",
      data: {
        profileCount: profiles.length,
        queryTime: `${queryTime}ms`,
        environment: envVars,
        databaseConfig: {
          usesConnectionPooler: usesPooler,
          recommendation: usesPooler 
            ? "✓ Using connection pooler (good for serverless)" 
            : "⚠️ Not using connection pooler (may cause issues in production)",
        },
      },
    });
  } catch (error: unknown) {
    console.error("Database test failed:", error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        details: {
          name: error instanceof Error ? error.name : 'Unknown',
          code: (error as { code?: string }).code,
          hint: getDatabaseErrorHint(error instanceof Error ? error.message : String(error)),
        },
      },
      { status: 500 }
    );
  }
}

function getDatabaseErrorHint(errorMessage: string): string {
  if (errorMessage.includes("DATABASE_URL")) {
    return "Set DATABASE_URL environment variable in Vercel Dashboard";
  }
  if (errorMessage.includes("connection slots")) {
    return "Use Supabase connection pooler (port 6543) instead of direct connection";
  }
  if (errorMessage.includes("timeout")) {
    return "Database query timeout. Check if database is accessible from Vercel.";
  }
  if (errorMessage.includes("ENOTFOUND") || errorMessage.includes("ECONNREFUSED")) {
    return "Cannot reach database. Check DATABASE_URL hostname and firewall settings.";
  }
  if (errorMessage.includes("password authentication failed")) {
    return "Invalid database credentials. Check DATABASE_URL username/password.";
  }
  return "Check Vercel function logs for more details";
}
