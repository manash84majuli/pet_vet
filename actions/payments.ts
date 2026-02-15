/**
 * Server Actions for Payment Processing
 * Handles Razorpay order creation and payment flow
 * All operations are server-side for security
 */

"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/drizzle";
import { createServerClient } from "@/lib/supabase";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import * as schema from "@/lib/schema";
import {
  ApiResponse,
  RazorpayOrder,
} from "@/lib/types";
import axios from "axios";

const RAZORPAY_KEY_ID = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
  console.warn(
    "Razorpay credentials not configured. Payments will not work."
  );
}

/**
 * Create a Razorpay order for appointment payment
 * Server-side only - private key never exposed to client
 */
export async function createAppointmentRazorpayOrder(
  appointmentId: string,
  vetId: string
): Promise<ApiResponse<RazorpayOrder>> {
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

    // Fetch appointment and vet details
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

    const vet = await db.query.vets.findFirst({
      where: eq(schema.vets.profile_id, vetId),
    });

    if (!vet) {
      return {
        success: false,
        error: "Vet not found",
        code: "NOT_FOUND",
      };
    }

    // Only pet owner can pay
    if (appointment.pet.owner_id !== user.id) {
      return {
        success: false,
        error: "Unauthorized to pay for this appointment",
        code: "UNAUTHORIZED",
      };
    }

    // Amount in paise (Razorpay uses lowest currency unit)
    const amountInPaise = vet.consultation_fee_inr * 100;

    try {
      const response = await axios.post<RazorpayOrder>(
        "https://api.razorpay.com/v1/orders",
        {
          amount: amountInPaise,
          currency: "INR",
          receipt: `apt_${appointmentId.slice(0, 8)}`,
          payment_capture: 1, // Auto-capture after successful payment
          notes: {
            appointment_id: appointmentId,
            pet_id: appointment.pet_id,
            vet_id: vetId,
            customer_id: user.id,
          },
        },
        {
          auth: {
            username: RAZORPAY_KEY_ID!,
            password: RAZORPAY_KEY_SECRET!,
          },
        }
      );

      // Update appointment with razorpay_order_id
      await db
        .update(schema.appointments)
        .set({ razorpay_order_id: response.data.id })
        .where(eq(schema.appointments.id, appointmentId))
        .execute();

      revalidatePath("/appointments");

      return {
        success: true,
        data: response.data,
        message: "Razorpay order created successfully",
      };
    } catch (razorpayError) {
      console.error("[Razorpay API Error]", razorpayError);
      return {
        success: false,
        error: "Failed to create payment order with Razorpay",
        code: "PAYMENT_PROVIDER_ERROR",
        details:
          razorpayError instanceof Error
            ? { message: razorpayError.message }
            : {},
      };
    }
  } catch (error) {
    console.error("[createAppointmentRazorpayOrder]", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create order",
      code: "INTERNAL_ERROR",
    };
  }
}

/**
 * Create a Razorpay order for product purchase
 * Server-side only
 */
export async function createOrderRazorpayOrder(
  orderId: string
): Promise<ApiResponse<RazorpayOrder>> {
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

    // Fetch order
    const order = await db.query.orders.findFirst({
      where: eq(schema.orders.id, orderId),
    });

    if (!order) {
      return {
        success: false,
        error: "Order not found",
        code: "NOT_FOUND",
      };
    }

    // Only order customer can pay
    if (order.customer_id !== user.id) {
      return {
        success: false,
        error: "Unauthorized to pay for this order",
        code: "UNAUTHORIZED",
      };
    }

    // Amount in paise
    const amountInPaise = order.total_amount_inr * 100;

    try {
      const response = await axios.post<RazorpayOrder>(
        "https://api.razorpay.com/v1/orders",
        {
          amount: amountInPaise,
          currency: "INR",
          receipt: `order_${orderId.slice(0, 8)}`,
          payment_capture: 1,
          notes: {
            order_id: orderId,
            customer_id: user.id,
          },
        },
        {
          auth: {
            username: RAZORPAY_KEY_ID!,
            password: RAZORPAY_KEY_SECRET!,
          },
        }
      );

      // Update order with razorpay_order_id
      await db
        .update(schema.orders)
        .set({ razorpay_order_id: response.data.id })
        .where(eq(schema.orders.id, orderId))
        .execute();

      revalidatePath("/shop");
      revalidatePath("/orders");

      return {
        success: true,
        data: response.data,
        message: "Razorpay order created successfully",
      };
    } catch (razorpayError) {
      console.error("[Razorpay API Error]", razorpayError);
      return {
        success: false,
        error: "Failed to create payment order with Razorpay",
        code: "PAYMENT_PROVIDER_ERROR",
      };
    }
  } catch (error) {
    console.error("[createOrderRazorpayOrder]", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create order",
      code: "INTERNAL_ERROR",
    };
  }
}

/**
 * Verify Razorpay payment signature
 * Called from webhook or after client-side payment completion
 */
export async function verifyRazorpayPayment(input: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  entity_id: string; // appointment_id or order_id
  entity_type: "appointment" | "order";
}): Promise<ApiResponse<{ verified: boolean }>> {
  try {
    // Verify signature using crypto
    const crypto = require("crypto");

    const message = `${input.razorpay_order_id}|${input.razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac("sha256", RAZORPAY_KEY_SECRET!)
      .update(message)
      .digest("hex");

    const isSignatureValid = expectedSignature === input.razorpay_signature;

    if (!isSignatureValid) {
      console.warn("[Payment Verification Failed] Invalid signature");
      return {
        success: false,
        error: "Payment signature verification failed",
        code: "INVALID_SIGNATURE",
      };
    }

    // Update the appropriate entity
    if (input.entity_type === "appointment") {
      await db
        .update(schema.appointments)
        .set({
          razorpay_order_id: input.razorpay_order_id,
          payment_status: "paid" as any,
        })
        .where(eq(schema.appointments.id, input.entity_id))
        .execute();

      revalidatePath("/appointments");
    } else if (input.entity_type === "order") {
      await db
        .update(schema.orders)
        .set({
          razorpay_order_id: input.razorpay_order_id,
          payment_status: "paid" as any,
        })
        .where(eq(schema.orders.id, input.entity_id))
        .execute();

      revalidatePath("/orders");
    }

    return {
      success: true,
      data: { verified: true },
      message: "Payment verified successfully",
    };
  } catch (error) {
    console.error("[verifyRazorpayPayment]", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Verification failed",
      code: "INTERNAL_ERROR",
    };
  }
}

/**
 * Cancel failed payment - resets payment status for retry
 */
export async function failPayment(
  entity_id: string,
  entity_type: "appointment" | "order"
): Promise<ApiResponse<null>> {
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

    if (entity_type === "appointment") {
      await db
        .update(schema.appointments)
        .set({ payment_status: "failed" as any })
        .where(eq(schema.appointments.id, entity_id))
        .execute();

      revalidatePath("/appointments");
    } else if (entity_type === "order") {
      await db
        .update(schema.orders)
        .set({ payment_status: "failed" as any })
        .where(eq(schema.orders.id, entity_id))
        .execute();

      revalidatePath("/orders");
    }

    return {
      success: true,
      data: null,
      message: "Payment marked as failed",
    };
  } catch (error) {
    console.error("[failPayment]", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update payment status",
      code: "INTERNAL_ERROR",
    };
  }
}
