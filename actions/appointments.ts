/**
 * Server Actions for Appointment Management
 * Uses optimistic updates + useTransition for smooth UX
 * All mutations protected by RLS + auth check
 */

"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/drizzle";
import { createServerClient } from "@/lib/supabase";
import {cookies} from "next/headers";
import { eq, and, inArray, desc, ne } from "drizzle-orm";
import * as schema from "@/lib/schema";
import {
  Appointment,
  AppointmentStatus,
  BookAppointmentInput,
  ApiResponse,
  PaymentStatus,
  AppointmentWithDetails,
  VetWithProfile,
  Pet,
  Gender,
  UserRole,
} from "@/lib/types";

/**
 * Book a new appointment with optimistic UI update support
 * RLS ensures user can only book for their own pets
 */
export async function bookAppointment(
  input: BookAppointmentInput
): Promise<ApiResponse<Appointment>> {
  try {
    const cookieStore = cookies();
    const supabase = createServerClient(cookieStore);

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: "Unauthorized",
        code: "UNAUTHORIZED",
      };
    }

    // Verify the pet belongs to the user (will be double-checked by RLS)
    const pet = await db.query.pets.findFirst({
      where: and(
        eq(schema.pets.id, input.pet_id),
        eq(schema.pets.owner_id, user.id as any)
      ),
    });

    if (!pet) {
      return {
        success: false,
        error: "Pet not found or you do not own this pet",
        code: "NOT_FOUND",
      };
    }

    // Verify vet exists and is active
    const vet = await db.query.vets.findFirst({
      where: eq(schema.vets.profile_id, input.vet_id),
    });

    if (!vet || !vet.is_active) {
      return {
        success: false,
        error: "Vet not available",
        code: "NOT_FOUND",
      };
    }

    // Check for existing appointment at this time (unique constraint will catch duplicate)
    const existingAppointment = await db.query.appointments.findFirst({
      where: and(
        eq(schema.appointments.vet_id, input.vet_id),
        eq(
          schema.appointments.appointment_time,
          new Date(input.appointment_time)
        )
      ),
    });

    if (existingAppointment) {
      return {
        success: false,
        error: "This time slot is already booked. Please select another time.",
        code: "CONFLICT",
      };
    }

    // Create appointment
    const [appointment] = await db
      .insert(schema.appointments)
      .values({
        pet_id: input.pet_id,
        vet_id: input.vet_id,
        appointment_time: new Date(input.appointment_time),
        status: "pending" as AppointmentStatus,
        payment_status: "pending" as PaymentStatus,
        notes: input.notes,
      })
      .returning();

    // Revalidate cache
    revalidatePath("/appointments");
    revalidatePath("/");

    return {
      success: true,
      data: {
        ...appointment,
        appointment_time: appointment.appointment_time.toISOString(),
        created_at: appointment.created_at.toISOString(),
        updated_at: appointment.updated_at.toISOString(),
      } as Appointment,
      message: "Appointment booked successfully",
    };
  } catch (error) {
    console.error("[bookAppointment]", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to book appointment",
      code: "INTERNAL_ERROR",
    };
  }
}

/**
 * Cancel an appointment
 * User can cancel their own appointments (via RLS)
 * Vets can cancel their scheduled appointments
 */
export async function cancelAppointment(
  appointmentId: string
): Promise<ApiResponse<Appointment>> {
  try {
    const cookieStore = cookies();
    const supabase = createServerClient(cookieStore);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: "Unauthorized",
        code: "UNAUTHORIZED",
      };
    }

    // Fetch appointment to verify ownership
    const appointment = await db.query.appointments.findFirst({
      where: eq(schema.appointments.id, appointmentId),
      with: {
        pet: true,
      },
    });

    if (!appointment) {
      return {
        success: false,
        error: "Appointment not found",
        code: "NOT_FOUND",
      };
    }

    // Check authorization: user must be pet owner or vet
    const isOwner = appointment.pet.owner_id === user.id;
    const isVet = appointment.vet_id === user.id;

    if (!isOwner && !isVet) {
      return {
        success: false,
        error: "Unauthorized to cancel this appointment",
        code: "UNAUTHORIZED",
      };
    }

    // Can't cancel completed or already cancelled appointments
    if (
      appointment.status === "completed" ||
      appointment.status === "cancelled"
    ) {
      return {
        success: false,
        error: `Cannot cancel a ${appointment.status} appointment`,
        code: "INVALID_STATE",
      };
    }

    // Update appointment status
    const [updated] = await db
      .update(schema.appointments)
      .set({ status: "cancelled" as AppointmentStatus })
      .where(eq(schema.appointments.id, appointmentId))
      .returning();

    revalidatePath("/appointments");
    revalidatePath("/");

    return {
      success: true,
      data: {
        ...updated,
        appointment_time: updated.appointment_time.toISOString(),
        created_at: updated.created_at.toISOString(),
        updated_at: updated.updated_at.toISOString(),
      } as Appointment,
      message: "Appointment cancelled",
    };
  } catch (error) {
    console.error("[cancelAppointment]", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to cancel appointment",
      code: "INTERNAL_ERROR",
    };
  }
}

/**
 * Confirm appointment (vets only)
 * After payment, vet confirms the appointment
 */
export async function confirmAppointment(
  appointmentId: string
): Promise<ApiResponse<Appointment>> {
  try {
    const cookieStore = cookies();
    const supabase = createServerClient(cookieStore);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: "Unauthorized",
        code: "UNAUTHORIZED",
      };
    }

    const appointment = await db.query.appointments.findFirst({
      where: eq(schema.appointments.id, appointmentId),
    });

    if (!appointment) {
      return {
        success: false,
        error: "Appointment not found",
        code: "NOT_FOUND",
      };
    }

    // Only vet can confirm
    if (appointment.vet_id !== user.id) {
      return {
        success: false,
        error: "Only the assigned vet can confirm this appointment",
        code: "UNAUTHORIZED",
      };
    }

    const [updated] = await db
      .update(schema.appointments)
      .set({
        status: "confirmed" as AppointmentStatus,
        payment_status: "paid" as PaymentStatus,
      })
      .where(eq(schema.appointments.id, appointmentId))
      .returning();

    revalidatePath("/appointments");

    return {
      success: true,
      data: {
        ...updated,
        appointment_time: updated.appointment_time.toISOString(),
        created_at: updated.created_at.toISOString(),
        updated_at: updated.updated_at.toISOString(),
      } as Appointment,
      message: "Appointment confirmed",
    };
  } catch (error) {
    console.error("[confirmAppointment]", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to confirm appointment",
      code: "INTERNAL_ERROR",
    };
  }
}

export interface RescheduleAppointmentInput {
  appointment_id: string;
  appointment_time: string;
  notes?: string;
}

export async function rescheduleAppointment(
  input: RescheduleAppointmentInput
): Promise<ApiResponse<Appointment>> {
  try {
    const cookieStore = cookies();
    const supabase = createServerClient(cookieStore);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: "Unauthorized",
        code: "UNAUTHORIZED",
      };
    }

    const appointment = await db.query.appointments.findFirst({
      where: eq(schema.appointments.id, input.appointment_id),
      with: {
        pet: true,
      },
    });

    if (!appointment) {
      return {
        success: false,
        error: "Appointment not found",
        code: "NOT_FOUND",
      };
    }

    const isOwner = appointment.pet.owner_id === user.id;
    const isVet = appointment.vet_id === user.id;

    if (!isOwner && !isVet) {
      return {
        success: false,
        error: "Unauthorized to reschedule this appointment",
        code: "UNAUTHORIZED",
      };
    }

    if (
      appointment.status === "completed" ||
      appointment.status === "cancelled"
    ) {
      return {
        success: false,
        error: `Cannot reschedule a ${appointment.status} appointment`,
        code: "INVALID_STATE",
      };
    }

    const requestedTime = new Date(input.appointment_time);
    const clash = await db.query.appointments.findFirst({
      where: and(
        eq(schema.appointments.vet_id, appointment.vet_id),
        eq(schema.appointments.appointment_time, requestedTime),
        ne(schema.appointments.id, appointment.id)
      ),
    });

    if (clash) {
      return {
        success: false,
        error: "This time slot is already booked. Please select another time.",
        code: "CONFLICT",
      };
    }

    const [updated] = await db
      .update(schema.appointments)
      .set({
        appointment_time: requestedTime,
        notes: input.notes ?? appointment.notes,
        status: "pending" as AppointmentStatus,
        updated_at: new Date(),
      })
      .where(eq(schema.appointments.id, appointment.id))
      .returning();

    revalidatePath("/appointments");
    revalidatePath("/");

    return {
      success: true,
      data: {
        ...updated,
        appointment_time: updated.appointment_time.toISOString(),
        created_at: updated.created_at.toISOString(),
        updated_at: updated.updated_at.toISOString(),
      } as Appointment,
    };
  } catch (error) {
    console.error("[rescheduleAppointment]", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to reschedule appointment",
      code: "INTERNAL_ERROR",
    };
  }
}

/**
 * Fetch available time slots for a vet on a given date
 * Returns 30-minute slots between 9 AM - 6 PM
 */
export async function getAvailableSlots(
  vet_id: string,
  date: string // YYYY-MM-DD format
): Promise<ApiResponse<string[]>> {
  try {
    const dayStart = new Date(`${date}T00:00:00Z`);
    const dayEnd = new Date(`${date}T23:59:59Z`);

    // Fetch booked appointments for this vet on this day
    const bookedAppointments = await db.query.appointments.findMany({
      where: and(
        eq(schema.appointments.vet_id, vet_id),
        eq(schema.appointments.status, "pending" as any),
        eq(schema.appointments.status, "confirmed" as any)
      ),
    });

    // Generate available time slots (9 AM - 6 PM, 30-minute intervals)
    const slots: string[] = [];
    const dayStartHours = new Date(dayStart);
    dayStartHours.setUTCHours(9, 0, 0, 0); // 9 AM

    const dayEndHours = new Date(dayEnd);
    dayEndHours.setUTCHours(18, 0, 0, 0); // 6 PM

    // Create 30-minute slots
    for (
      let time = new Date(dayStartHours);
      time < dayEndHours;
      time.setMinutes(time.getMinutes() + 30)
    ) {
      const slotTime = new Date(time);

      // Check if this slot is already booked
      const isBooked = bookedAppointments.some(
        (apt) =>
          apt.appointment_time.getTime() === slotTime.getTime() &&
          (apt.status === "pending" || apt.status === "confirmed")
      );

      if (!isBooked) {
        slots.push(slotTime.toISOString());
      }
    }

    return {
      success: true,
      data: slots,
    };
  } catch (error) {
    console.error("[getAvailableSlots]", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to fetch available slots",
      code: "INTERNAL_ERROR",
    };
  }
}

export async function getUserAppointments(): Promise<ApiResponse<AppointmentWithDetails[]>> {
  try {
    const cookieStore = cookies();
    const supabase = createServerClient(cookieStore);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: true, data: [] };
    }

    const userPets = await db.query.pets.findMany({
      where: eq(schema.pets.owner_id, user.id),
    });

    if (userPets.length === 0) {
      return { success: true, data: [] };
    }

    const petIds = userPets.map((p) => p.id);

    const appointments = await db.query.appointments.findMany({
      where: inArray(schema.appointments.pet_id, petIds),
      with: {
        pet: true,
        vet: true, 
      },
      orderBy: [desc(schema.appointments.appointment_time)],
    });

    const formatted: AppointmentWithDetails[] = [];

    for (const apt of appointments) {
      const vetProfile = apt.vet;
      
      const vetDetails = await db.query.vets.findFirst({
        where: eq(schema.vets.profile_id, vetProfile.id),
      });

      if (!vetDetails) continue;

      formatted.push({
        id: apt.id,
        pet_id: apt.pet_id,
        vet_id: apt.vet_id,
        appointment_time: apt.appointment_time.toISOString(),
        status: apt.status as AppointmentStatus,
        razorpay_order_id: apt.razorpay_order_id || undefined,
        payment_status: apt.payment_status as PaymentStatus,
        notes: apt.notes || undefined,
        created_at: apt.created_at.toISOString(),
        updated_at: apt.updated_at.toISOString(),
        pet: {
          id: apt.pet.id,
          owner_id: apt.pet.owner_id,
          name: apt.pet.name,
          species: apt.pet.species,
          breed: apt.pet.breed || undefined,
          age_years: apt.pet.age_years ? Number(apt.pet.age_years) : undefined,
          weight_kg: apt.pet.weight_kg ? Number(apt.pet.weight_kg) : undefined,
          photo_url: apt.pet.photo_url || undefined,
          medical_notes: apt.pet.medical_notes || undefined,
          gender: (apt.pet.gender as Gender) || undefined,
          created_at: apt.pet.created_at.toISOString(),
          updated_at: apt.pet.updated_at.toISOString(),
        },
        vet: {
          id: vetDetails.id,
          profile_id: vetDetails.profile_id,
          license_number: vetDetails.license_number,
          clinic_name: vetDetails.clinic_name,
          address: vetDetails.address,
          consultation_fee_inr: vetDetails.consultation_fee_inr,
          specialization: vetDetails.specialization || undefined,
          is_active: vetDetails.is_active,
          created_at: vetDetails.created_at.toISOString(),
          updated_at: vetDetails.updated_at.toISOString(),
          profile: {
             id: vetProfile.id,
             full_name: vetProfile.full_name,
             phone: vetProfile.phone,
             city: vetProfile.city || undefined,
             state: vetProfile.state || undefined,
             avatar_url: vetProfile.avatar_url || undefined,
             role: UserRole.VET,
             created_at: vetProfile.created_at.toISOString(),
             updated_at: vetProfile.updated_at.toISOString(),
          },
        },
      });
    }

    return { success: true, data: formatted };
  } catch (error) {
    console.error("Error fetching user appointments", error);
    return { success: false, error: "Failed to load appointments" };
  }
}

export async function getVets(): Promise<ApiResponse<VetWithProfile[]>> {
  try {
    const vetsList = await db.query.vets.findMany({
      with: {
        profile: true,
      },
      where: eq(schema.vets.is_active, true),
    });

    const formatted: VetWithProfile[] = vetsList.map((v) => ({
      id: v.id,
      profile_id: v.profile_id,
      license_number: v.license_number,
      clinic_name: v.clinic_name,
      address: v.address,
      consultation_fee_inr: v.consultation_fee_inr,
      specialization: v.specialization || undefined,
      is_active: v.is_active,
      created_at: v.created_at.toISOString(),
      updated_at: v.updated_at.toISOString(),
      profile: {
        id: v.profile.id,
        role: UserRole.VET,
        full_name: v.profile.full_name,
        phone: v.profile.phone,
        city: v.profile.city || undefined,
        state: v.profile.state || undefined,
        avatar_url: v.profile.avatar_url || undefined,
        created_at: v.profile.created_at.toISOString(),
        updated_at: v.profile.updated_at.toISOString(),
      },
    }));

    return { success: true, data: formatted };
  } catch (error) {
    console.error("Error fetching vets", error);
    return { success: false, error: "Failed to load vets" };
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

    const petsList = await db.query.pets.findMany({
      where: eq(schema.pets.owner_id, user.id),
    });

    const formatted: Pet[] = petsList.map((p) => ({
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
    console.error("Error fetching user pets", error);
    return { success: false, error: "Failed to load pets" };
  }
}
