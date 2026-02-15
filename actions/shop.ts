/**
 * Server Actions for Shop & Products
 */

"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@/lib/supabase";
import { Product, ApiResponse } from "@/lib/types";

export async function getProducts(): Promise<ApiResponse<Product[]>> {
  try {
    const cookieStore = cookies();
    const supabase = createServerClient(cookieStore);

    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    const formatted: Product[] = (data || []).map((p: any) => ({
      ...p,
      created_at:
        typeof p.created_at === "string"
          ? p.created_at
          : new Date(p.created_at).toISOString(),
      updated_at:
        typeof p.updated_at === "string"
          ? p.updated_at
          : new Date(p.updated_at).toISOString(),
      stock: p.stock ?? 0,
      description: p.description ?? "",
      category: p.category ?? undefined,
      image_url: p.image_url ?? undefined,
    }));

    return { success: true, data: formatted };
  } catch (error) {
    console.error("Error fetching products:", error);
    return { success: false, error: "Failed to load products" };
  }
}
