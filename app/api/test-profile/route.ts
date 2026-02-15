/**
 * User Profile Check API
 * Use this to verify user profile and role on Vercel
 * Visit: /api/test-profile (must be logged in)
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@/lib/supabase";
import { db } from "@/lib/drizzle";
import * as schema from "@/lib/schema";
import { eq } from "drizzle-orm";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const cookieStore = cookies();
    const supabase = createServerClient(cookieStore);
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({
        success: false,
        message: "Not authenticated",
        hint: "Log in first, then try this endpoint",
      }, { status: 401 });
    }
    
    // Get user profile from database
    const profile = await db.query.profiles.findFirst({
      where: eq(schema.profiles.id, user.id),
    });
    
    if (!profile) {
      return NextResponse.json({
        success: false,
        message: "Profile not found in database",
        hint: "Profile should be created automatically on signup. Check database triggers.",
        user: {
          id: user.id,
          email: user.email,
        },
      }, { status: 404 });
    }
    
    // Check access permissions
    const access = {
      profile: true, // Everyone can access /profile
      pos: profile.role === "admin" || profile.role === "store_manager",
      storeManager: profile.role === "admin" || profile.role === "store_manager",
      admin: profile.role === "admin",
    };
    
    return NextResponse.json({
      success: true,
      message: "Profile found",
      data: {
        user: {
          id: user.id,
          email: user.email,
        },
        profile: {
          id: profile.id,
          name: profile.full_name,
          role: profile.role,
        },
        access: access,
        recommendations: getAccessRecommendations(profile.role),
      },
    });
  } catch (error: unknown) {
    console.error("Profile check failed:", error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        hint: "Check Vercel function logs for details",
      },
      { status: 500 }
    );
  }
}

function getAccessRecommendations(role: string): string[] {
  const recommendations: string[] = [];
  
  if (role === "customer") {
    recommendations.push("✓ You can access /profile");
    recommendations.push("✗ You cannot access /pos (need admin or store_manager role)");
    recommendations.push("✗ You cannot access /store-manager (need admin or store_manager role)");
    recommendations.push("To get access, update your role in the database:");
    recommendations.push("UPDATE profiles SET role = 'store_manager' WHERE email = 'your-email';");
  } else if (role === "store_manager") {
    recommendations.push("✓ You can access /profile");
    recommendations.push("✓ You can access /pos");
    recommendations.push("✓ You can access /store-manager");
    recommendations.push("✗ You cannot access /admin (need admin role)");
  } else if (role === "admin") {
    recommendations.push("✓ You have full access to all pages");
  }
  
  return recommendations;
}
