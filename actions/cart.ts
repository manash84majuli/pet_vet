/**
 * Server Actions for Cart & Order Management
 * Handles prescription uploads, order creation, and checkout flow
 */

"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/drizzle";
import { createServerClient } from "@/lib/supabase";
import { cookies } from "next/headers";
import { eq, inArray } from "drizzle-orm";
import * as schema from "@/lib/schema";
import {
  ApiResponse,
  Order,
  CreateOrderInput,
  ShippingAddress,
} from "@/lib/types";

/**
 * Create an order from cart items
 * Validates all items, checks stock, enforces prescription requirements
 */
export async function createOrder(
  input: CreateOrderInput
): Promise<ApiResponse<Order>> {
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

    // Validate shipping address
    if (!validateShippingAddress(input.shipping_address)) {
      return {
        success: false,
        error: "Invalid shipping address",
        code: "INVALID_INPUT",
      };
    }

    // Fetch all products in cart
    const productIds = input.items.map((item) => item.product_id);
    const products = await db.query.products.findMany({
      where: inArray(schema.products.id, productIds),
    });

    const productMap = new Map(products.map((p) => [p.id, p]));

    let totalAmount = 0;
    const validatedItems = [];

    // Validate each item
    for (const item of input.items) {
      const product = productMap.get(item.product_id);

      if (!product) {
        return {
          success: false,
          error: `Product ${item.product_id} not found`,
          code: "NOT_FOUND",
        };
      }

      if (!product.is_active) {
        return {
          success: false,
          error: `Product "${product.name}" is no longer available`,
          code: "PRODUCT_UNAVAILABLE",
        };
      }

      if (product.stock < item.quantity) {
        return {
          success: false,
          error: `Insufficient stock for "${product.name}". Available: ${product.stock}`,
          code: "OUT_OF_STOCK",
        };
      }

      // Check prescription requirement
      if (product.requires_prescription && !item.prescription_file_path) {
        return {
          success: false,
          error: `"${product.name}" requires a valid prescription. Please upload one.`,
          code: "PRESCRIPTION_REQUIRED",
        };
      }

      totalAmount += product.price_inr * item.quantity;

      validatedItems.push({
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price_at_purchase: product.price_inr,
        prescription_file_path: item.prescription_file_path,
      });
    }

    // Create order
    const [order] = await db
      .insert(schema.orders)
      .values({
        customer_id: user.id as any,
        total_amount_inr: totalAmount,
        order_status: "pending" as any,
        payment_status: "pending" as any,
        shipping_address_json: input.shipping_address as any,
      })
      .returning();

    // Insert order items
    await db
      .insert(schema.order_items)
      .values(
        validatedItems.map((item) => ({
          order_id: order.id,
          ...item,
        }))
      )
      .execute();

    // Reduce product stock (should ideally be in a transaction)
    for (const item of validatedItems) {
      const product = productMap.get(item.product_id)!;
      await db
        .update(schema.products)
        .set({ stock: product.stock - item.quantity })
        .where(eq(schema.products.id, item.product_id))
        .execute();
    }

    revalidatePath("/shop");
    revalidatePath("/orders");

    return {
      success: true,
      data: {
        ...order,
        created_at: order.created_at.toISOString(),
        updated_at: order.updated_at.toISOString(),
      } as Order,
      message: "Order created successfully",
    };
  } catch (error) {
    console.error("[createOrder]", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create order",
      code: "INTERNAL_ERROR",
    };
  }
}

/**
 * Upload prescription for a product
 * Validates file, uploads to Supabase Storage, returns file path
 */
export async function uploadPrescription(
  file: FormData
): Promise<ApiResponse<{ file_path: string; file_name: string }>> {
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

    // Get file from FormData
    const uploadedFile = file.get("file") as File | null;

    if (!uploadedFile) {
      return {
        success: false,
        error: "No file provided",
        code: "INVALID_INPUT",
      };
    }

    // Validate file (PDF/image only, max 5MB)
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
    const ALLOWED_TYPES = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (uploadedFile.size > MAX_FILE_SIZE) {
      return {
        success: false,
        error: "File size exceeds 5 MB limit",
        code: "FILE_TOO_LARGE",
      };
    }

    if (!ALLOWED_TYPES.includes(uploadedFile.type)) {
      return {
        success: false,
        error: "Invalid file type. Only PDF and images are allowed.",
        code: "INVALID_FILE_TYPE",
      };
    }

    // Upload to Supabase Storage
    const fileName = `${user.id}/${Date.now()}-${uploadedFile.name}`;

    try {
      const { data, error: uploadError } = await supabase.storage
        .from("prescriptions")
        .upload(fileName, uploadedFile, {
          cacheControl: "3600",
          upsert: false,
          contentType: uploadedFile.type,
        });

      if (uploadError) {
        console.error("[Supabase Upload Error]", uploadError);
        return {
          success: false,
          error: "Failed to upload file to storage",
          code: "STORAGE_ERROR",
        };
      }

      // Record prescription in database
      await db
        .insert(schema.prescription_uploads)
        .values({
          user_id: user.id as any,
          file_path: data.path,
          file_name: uploadedFile.name,
          file_size: uploadedFile.size,
        })
        .execute();

      return {
        success: true,
        data: {
          file_path: data.path,
          file_name: uploadedFile.name,
        },
        message: "Prescription uploaded successfully",
      };
    } catch (storageError) {
      console.error("[uploadPrescription]", storageError);
      return {
        success: false,
        error: "Failed to upload prescription",
        code: "STORAGE_ERROR",
      };
    }
  } catch (error) {
    console.error("[uploadPrescription]", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to upload prescription",
      code: "INTERNAL_ERROR",
    };
  }
}

/**
 * Get signed public URL for prescription file
 * Used to display prescription before confirming order
 */
export async function getPrescriptionUrl(
  filePath: string
): Promise<ApiResponse<string>> {
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

    // Generate signed URL (valid for 1 hour)
    const { data, error } = await supabase.storage
      .from("prescriptions")
      .createSignedUrl(filePath, 3600);

    if (error) {
      return {
        success: false,
        error: "Failed to generate signed URL",
        code: "STORAGE_ERROR",
      };
    }

    return {
      success: true,
      data: data.signedUrl,
    };
  } catch (error) {
    console.error("[getPrescriptionUrl]", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to get prescription URL",
      code: "INTERNAL_ERROR",
    };
  }
}

/**
 * Utility: Validate shipping address structure
 */
function validateShippingAddress(address: ShippingAddress): boolean {
  if (
    !address.street ||
    !address.city ||
    !address.state ||
    !address.postal_code ||
    !address.country
  ) {
    return false;
  }

  return (
    typeof address.street === "string" &&
    typeof address.city === "string" &&
    typeof address.state === "string" &&
    typeof address.postal_code === "string" &&
    typeof address.country === "string"
  );
}

/**
 * Fetch user's orders with items
 */
export async function getUserOrders(): Promise<ApiResponse<Order[]>> {
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

    const orders = await db.query.orders.findMany({
      where: eq(schema.orders.customer_id, user.id as any),
      orderBy: (orders, { desc }) => [desc(orders.created_at)],
    });

    return {
      success: true,
      data: orders.map(
        (order) =>
        ({
          ...order,
          created_at: order.created_at.toISOString(),
          updated_at: order.updated_at.toISOString(),
        }) as Order
      ),
    };
  } catch (error) {
    console.error("[getUserOrders]", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to fetch orders",
      code: "INTERNAL_ERROR",
    };
  }
}
