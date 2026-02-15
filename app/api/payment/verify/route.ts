/**
 * Payment Verification Endpoint
 * POST /api/payment/verify
 * Handles client payment verification and webhook validation
 * Critical security: Always verify Razorpay signature before updating DB
 */

import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import * as schema from "@/lib/schema";
import crypto from "crypto";

const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

if (!RAZORPAY_KEY_SECRET) {
  console.error("RAZORPAY_KEY_SECRET is not configured");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      entity_id,
      entity_type,
    } = body;

    // Validate required fields
    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature ||
      !entity_id ||
      !entity_type
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields",
        },
        { status: 400 }
      );
    }

    // Verify Razorpay signature
    // This is critical - never trust client-side data
    const message = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac("sha256", RAZORPAY_KEY_SECRET!)
      .update(message)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      console.warn(
        `[Payment Verification Failed] Invalid signature for order ${razorpay_order_id}`
      );
      return NextResponse.json(
        {
          success: false,
          error: "Payment signature verification failed - possible fraud attempt",
          code: "INVALID_SIGNATURE",
        },
        { status: 401 }
      );
    }

    // Signature is valid - update the database
    if (entity_type === "appointment") {
      if (!process.env.DATABASE_URL) {
        return NextResponse.json(
          { success: false, error: "Database not configured on server" },
          { status: 500 }
        );
      }
      const { db } = await import("@/lib/drizzle");
      const result = await db
        .update(schema.appointments)
        .set({
          razorpay_order_id,
          payment_status: "paid" as const,
        })
        .where(
          and(
            eq(schema.appointments.id, entity_id),
            eq(schema.appointments.payment_status, "pending")
          )
        )
        .returning();

      if (result.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: "Appointment not found or already paid",
          },
          { status: 409 }
        );
      }

      return NextResponse.json({
        success: true,
        data: { verified: true, entity_type: "appointment" },
        message: "Appointment payment verified successfully",
      });
    } else if (entity_type === "order") {
      if (!process.env.DATABASE_URL) {
        return NextResponse.json(
          { success: false, error: "Database not configured on server" },
          { status: 500 }
        );
      }
      const { db } = await import("@/lib/drizzle");
      const result = await db
        .update(schema.orders)
        .set({
          razorpay_order_id,
          payment_status: "paid" as const,
        })
        .where(
          and(
            eq(schema.orders.id, entity_id),
            eq(schema.orders.payment_status, "pending")
          )
        )
        .returning();

      if (result.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: "Order not found or already paid",
          },
          { status: 409 }
        );
      }

      return NextResponse.json({
        success: true,
        data: { verified: true, entity_type: "order" },
        message: "Order payment verified successfully",
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: `Unknown entity type: ${entity_type}`,
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("[Payment Verification Error]", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}
