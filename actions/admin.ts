"use server";

import { db } from "@/lib/drizzle";
import * as schema from "@/lib/schema";
import { ApiResponse, Profile, UserRole, VetWithProfile } from "@/lib/types";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { createServerClient } from "@/lib/supabase";

const mapProfile = (row: typeof schema.profiles.$inferSelect): Profile => ({
  id: row.id,
  role: row.role as UserRole,
  full_name: row.full_name,
  phone: row.phone,
  city: row.city ?? undefined,
  state: row.state ?? undefined,
  avatar_url: row.avatar_url ?? undefined,
  created_at: row.created_at.toISOString(),
  updated_at: row.updated_at.toISOString(),
});

const requireAdmin = async () => {
  const cookieStore = cookies();
  const supabase = createServerClient(cookieStore);
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "Unauthorized" } as const;
  }

  const profile = await db.query.profiles.findFirst({
    where: eq(schema.profiles.id, user.id),
  });

  if (!profile || profile.role !== "admin") {
    return { error: "Forbidden" } as const;
  }

  return { profile } as const;
};

export async function getAllProfiles(): Promise<ApiResponse<Profile[]>> {
  try {
    const access = await requireAdmin();
    if ("error" in access) {
      return { success: false, error: access.error, code: "UNAUTHORIZED" };
    }

    const profiles = await db.query.profiles.findMany({
      orderBy: (profiles, { asc }) => [asc(profiles.full_name)],
    });

    return {
      success: true,
      data: profiles.map(mapProfile),
    };
  } catch (error) {
    console.error("[getAllProfiles]", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load users",
      code: "INTERNAL_ERROR",
    };
  }
}

export async function updateUserRole(
  profileId: string,
  role: UserRole
): Promise<ApiResponse<Profile>> {
  try {
    const access = await requireAdmin();
    if ("error" in access) {
      return { success: false, error: access.error, code: "UNAUTHORIZED" };
    }

    console.info("[admin] updateUserRole", {
      adminId: access.profile.id,
      profileId,
      role,
    });

    const [updated] = await db
      .update(schema.profiles)
      .set({ role })
      .where(eq(schema.profiles.id, profileId))
      .returning();

    if (!updated) {
      return {
        success: false,
        error: "User not found",
        code: "NOT_FOUND",
      };
    }

    return {
      success: true,
      data: mapProfile(updated),
      message: "Role updated",
    };
  } catch (error) {
    console.error("[updateUserRole]", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update role",
      code: "INTERNAL_ERROR",
    };
  }
}

const mapVet = (
  row: typeof schema.vets.$inferSelect,
  profile: typeof schema.profiles.$inferSelect
): VetWithProfile => ({
  id: row.id,
  profile_id: row.profile_id,
  license_number: row.license_number,
  clinic_name: row.clinic_name,
  address: row.address,
  consultation_fee_inr: row.consultation_fee_inr,
  specialization: row.specialization || undefined,
  is_active: row.is_active,
  created_at: row.created_at.toISOString(),
  updated_at: row.updated_at.toISOString(),
  profile: {
    id: profile.id,
    role: UserRole.VET,
    full_name: profile.full_name,
    phone: profile.phone,
    city: profile.city || undefined,
    state: profile.state || undefined,
    avatar_url: profile.avatar_url || undefined,
    created_at: profile.created_at.toISOString(),
    updated_at: profile.updated_at.toISOString(),
  },
});

export async function getVetsWithProfiles(): Promise<ApiResponse<VetWithProfile[]>> {
  try {
    const access = await requireAdmin();
    if ("error" in access) {
      return { success: false, error: access.error, code: "UNAUTHORIZED" };
    }

    const vets = await db.query.vets.findMany({
      with: { profile: true },
      orderBy: (vets, { desc }) => [desc(vets.created_at)],
    });

    return {
      success: true,
      data: vets
        .filter((vet) => vet.profile)
        .map((vet) => mapVet(vet, vet.profile!)),
    };
  } catch (error) {
    console.error("[getVetsWithProfiles]", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load vets",
      code: "INTERNAL_ERROR",
    };
  }
}

export async function updateVetStatus(
  vetId: string,
  isActive: boolean
): Promise<ApiResponse<VetWithProfile>> {
  try {
    const access = await requireAdmin();
    if ("error" in access) {
      return { success: false, error: access.error, code: "UNAUTHORIZED" };
    }

    console.info("[admin] updateVetStatus", {
      adminId: access.profile.id,
      vetId,
      isActive,
    });

    const [updated] = await db
      .update(schema.vets)
      .set({ is_active: isActive })
      .where(eq(schema.vets.id, vetId))
      .returning();

    if (!updated) {
      return { success: false, error: "Vet not found", code: "NOT_FOUND" };
    }

    const profile = await db.query.profiles.findFirst({
      where: eq(schema.profiles.id, updated.profile_id),
    });

    if (!profile) {
      return {
        success: false,
        error: "Vet profile not found",
        code: "NOT_FOUND",
      };
    }

    return {
      success: true,
      data: mapVet(updated, profile),
      message: "Vet status updated",
    };
  } catch (error) {
    console.error("[updateVetStatus]", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update vet",
      code: "INTERNAL_ERROR",
    };
  }
}
