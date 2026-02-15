/**
 * Server Actions for Profile & Pets
 */

"use server";

import { db } from "@/lib/drizzle";
import * as schema from "@/lib/schema";
import { Profile, Pet, ApiResponse, UserRole, Gender } from "@/lib/types";
import { and, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { createServerClient } from "@/lib/supabase";
import { revalidatePath } from "next/cache";

export async function getUserProfile(): Promise<ApiResponse<Profile | null>> {
  try {
    const cookieStore = cookies();
    const supabase = createServerClient(cookieStore);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: true, data: null };
    }

    const profile = await db.query.profiles.findFirst({
      where: eq(schema.profiles.id, user.id),
    });

    if (!profile) return { success: true, data: null };

    return {
      success: true,
      data: {
        id: profile.id,
        role: profile.role as UserRole,
        full_name: profile.full_name,
        phone: profile.phone,
        city: profile.city || undefined,
        state: profile.state || undefined,
        avatar_url: profile.avatar_url || undefined,
        created_at: profile.created_at.toISOString(),
        updated_at: profile.updated_at.toISOString(),
      },
    };
  } catch (error) {
    console.error("Error fetching profile:", error);
    return { success: false, error: "Failed to load profile" };
  }
}

export async function getUserPets(): Promise<ApiResponse<Pet[]>> {
  try {
    const cookieStore = cookies();
    const supabase = createServerClient(cookieStore);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: true, data: [] };
    }

    const pets = await db.query.pets.findMany({
      where: eq(schema.pets.owner_id, user.id),
    });

    const formatted: Pet[] = pets.map((p) => ({
      id: p.id,
      owner_id: p.owner_id,
      name: p.name,
      species: p.species,
      breed: p.breed || undefined,
      age_years: p.age_years ? Number(p.age_years) : undefined,
      weight_kg: p.weight_kg ? Number(p.weight_kg) : undefined,
      photo_url: p.photo_url || undefined,
      medical_notes: p.medical_notes || undefined,
      gender: (p.gender as Gender) || undefined,
      created_at: p.created_at.toISOString(),
      updated_at: p.updated_at.toISOString(),
    }));

    return { success: true, data: formatted };
  } catch (error) {
    console.error("Error fetching pets:", error);
    return { success: false, error: "Failed to load pets" };
  }
}

export async function updateProfile(data: Partial<Profile>): Promise<ApiResponse<Profile>> {
    try {
        const cookieStore = cookies();
        const supabase = createServerClient(cookieStore);
        const { data: { user } } = await supabase.auth.getUser();
    
        if (!user) {
          return { success: false, error: "Unauthorized" };
        }

        const [updated] = await db.update(schema.profiles)
            .set({
                full_name: data.full_name,
                phone: data.phone,
                city: data.city,
                state: data.state,
                avatar_url: data.avatar_url,
                updated_at: new Date()
            })
            .where(eq(schema.profiles.id, user.id))
            .returning();
        
        revalidatePath('/profile');
        
        return {
            success: true,
            data: {
                id: updated.id,
                full_name: updated.full_name,
                phone: updated.phone,
                city: updated.city || undefined,
                state: updated.state || undefined,
                avatar_url: updated.avatar_url || undefined,
                role: updated.role as UserRole,
                created_at: updated.created_at.toISOString(),
                updated_at: updated.updated_at.toISOString(),
            }
        };

    } catch (error) {
        console.error("Error updating profile:", error);
        return { success: false, error: "Failed to update profile" };
    }
}

export async function addPet(data: Omit<Pet, "id" | "owner_id" | "created_at" | "updated_at">): Promise<ApiResponse<Pet>> {
    try {
        const cookieStore = cookies();
        const supabase = createServerClient(cookieStore);
        const { data: { user } } = await supabase.auth.getUser();
    
        if (!user) {
          return { success: false, error: "Unauthorized" };
        }

        const [newPet] = await db.insert(schema.pets)
            .values({
                owner_id: user.id,
                name: data.name,
                species: data.species,
                breed: data.breed,
                age_years: data.age_years?.toString(),
                gender: data.gender as any,
                weight_kg: data.weight_kg?.toString(),
                photo_url: data.photo_url,
                medical_notes: data.medical_notes,
            })
            .returning();

        revalidatePath('/profile');
        revalidatePath('/appointments');

        return {
            success: true,
            data: {
                id: newPet.id,
                owner_id: newPet.owner_id,
                name: newPet.name,
                species: newPet.species,
                breed: newPet.breed || undefined,
                age_years: newPet.age_years ? Number(newPet.age_years) : undefined,
                weight_kg: newPet.weight_kg ? Number(newPet.weight_kg) : undefined,
                photo_url: newPet.photo_url || undefined,
                medical_notes: newPet.medical_notes || undefined,
                gender: (newPet.gender as Gender) || undefined,
                created_at: newPet.created_at.toISOString(),
                updated_at: newPet.updated_at.toISOString(),
            }
        };

    } catch (error) {
        console.error("Error adding pet:", error);
        return { success: false, error: "Failed to add pet" };
    }
}

export async function updatePet(
  petId: string,
  data: Omit<Pet, "id" | "owner_id" | "created_at" | "updated_at">
): Promise<ApiResponse<Pet>> {
  try {
    const cookieStore = cookies();
    const supabase = createServerClient(cookieStore);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const [updated] = await db
      .update(schema.pets)
      .set({
        name: data.name,
        species: data.species,
        breed: data.breed || null,
        age_years: data.age_years !== undefined ? data.age_years.toString() : null,
        gender: data.gender ? (data.gender as any) : null,
        weight_kg: data.weight_kg !== undefined ? data.weight_kg.toString() : null,
        photo_url: data.photo_url || null,
        medical_notes: data.medical_notes || null,
        updated_at: new Date(),
      })
      .where(and(eq(schema.pets.id, petId), eq(schema.pets.owner_id, user.id)))
      .returning();

    if (!updated) {
      return { success: false, error: "Pet not found" };
    }

    revalidatePath("/profile");
    revalidatePath("/appointments");

    return {
      success: true,
      data: {
        id: updated.id,
        owner_id: updated.owner_id,
        name: updated.name,
        species: updated.species,
        breed: updated.breed || undefined,
        age_years: updated.age_years ? Number(updated.age_years) : undefined,
        weight_kg: updated.weight_kg ? Number(updated.weight_kg) : undefined,
        photo_url: updated.photo_url || undefined,
        medical_notes: updated.medical_notes || undefined,
        gender: (updated.gender as Gender) || undefined,
        created_at: updated.created_at.toISOString(),
        updated_at: updated.updated_at.toISOString(),
      },
    };
  } catch (error) {
    console.error("Error updating pet:", error);
    return { success: false, error: "Failed to update pet" };
  }
}

export async function deletePet(petId: string): Promise<ApiResponse<null>> {
  try {
    const cookieStore = cookies();
    const supabase = createServerClient(cookieStore);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    await db
      .delete(schema.pets)
      .where(and(eq(schema.pets.id, petId), eq(schema.pets.owner_id, user.id)));

    revalidatePath("/profile");
    revalidatePath("/appointments");

    return { success: true, data: null };
  } catch (error) {
    console.error("Error deleting pet:", error);
    return { success: false, error: "Failed to delete pet" };
  }
}
