/**
 * Admin Module - User Role Management
 */

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/drizzle";
import * as schema from "@/lib/schema";
import { createServerClient } from "@/lib/supabase";
import { Profile, UserRole, VetWithProfile } from "@/lib/types";
import AdminClient from "./AdminClient";

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

export default async function AdminPage() {
  const cookieStore = cookies();
  const supabase = createServerClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?from=/admin");
  }

  const profile = await db.query.profiles.findFirst({
    where: eq(schema.profiles.id, user.id),
  });

  if (!profile || profile.role !== "admin") {
    redirect("/");
  }

  const profiles = await db.query.profiles.findMany({
    orderBy: (profiles, { asc }) => [asc(profiles.full_name)],
  });

  const vets = await db.query.vets.findMany({
    with: { profile: true },
    orderBy: (vets, { desc }) => [desc(vets.created_at)],
  });

  return (
    <AdminClient
      profiles={profiles.map(mapProfile)}
      vets={vets.filter((vet) => vet.profile).map((vet) => mapVet(vet, vet.profile!))}
    />
  );
}
