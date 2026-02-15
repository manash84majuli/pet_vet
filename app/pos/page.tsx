/**
 * POS Module (Retail + Clinic)
 */

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/drizzle";
import * as schema from "@/lib/schema";
import { createServerClient } from "@/lib/supabase";
import { Product, Service, UserRole } from "@/lib/types";
import PosClient from "./PosClient";

const mapProduct = (row: typeof schema.products.$inferSelect): Product => ({
  id: row.id,
  name: row.name,
  slug: row.slug,
  description: row.description || undefined,
  price_inr: row.price_inr,
  stock: row.stock,
  requires_prescription: row.requires_prescription,
  image_url: row.image_url || undefined,
  category: row.category || undefined,
  is_active: row.is_active,
  created_at: row.created_at.toISOString(),
  updated_at: row.updated_at.toISOString(),
});

const mapService = (row: typeof schema.services.$inferSelect): Service => ({
  id: row.id,
  name: row.name,
  description: row.description || undefined,
  price_inr: row.price_inr,
  is_active: row.is_active,
  created_at: row.created_at.toISOString(),
  updated_at: row.updated_at.toISOString(),
});

// Vercel: Use Node.js runtime for database queries
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function PosPage() {
  const cookieStore = cookies();
  const supabase = createServerClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?from=/pos");
  }

  const profile = await db.query.profiles.findFirst({
    where: eq(schema.profiles.id, user.id),
  });

  if (!profile || (profile.role !== "admin" && profile.role !== "store_manager")) {
    redirect("/");
  }

  const [products, services] = await Promise.all([
    db.query.products.findMany({
      where: eq(schema.products.is_active, true),
      orderBy: (products, { asc }) => [asc(products.name)],
    }),
    db.query.services.findMany({
      where: eq(schema.services.is_active, true),
      orderBy: (services, { asc }) => [asc(services.name)],
    }),
  ]);

  return (
    <PosClient
      products={products.map(mapProduct)}
      services={services.map(mapService)}
      userRole={profile.role as UserRole}
    />
  );
}
