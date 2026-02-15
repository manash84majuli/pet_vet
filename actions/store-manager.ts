"use server";

import { db } from "@/lib/drizzle";
import * as schema from "@/lib/schema";
import {
  ApiResponse,
  OrderStatusLog,
  OrderStatus,
  OrderWithItems,
  PaymentStatus,
  Product,
  Service,
  ShippingAddress,
} from "@/lib/types";
import { desc, eq, inArray, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { createServerClient } from "@/lib/supabase";
import { revalidatePath } from "next/cache";

type StoreAccess =
  | { profile: typeof schema.profiles.$inferSelect }
  | { error: string };

const requireStoreAccess = async (): Promise<StoreAccess> => {
  const cookieStore = cookies();
  const supabase = createServerClient(cookieStore);
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "Unauthorized" };
  }

  const profile = await db.query.profiles.findFirst({
    where: eq(schema.profiles.id, user.id),
  });

  if (!profile || (profile.role !== "admin" && profile.role !== "store_manager")) {
    return { error: "Forbidden" };
  }

  return { profile };
};

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

const mapOrderStatusLog = (
  row: typeof schema.order_status_logs.$inferSelect
): OrderStatusLog => ({
  id: row.id,
  order_id: row.order_id,
  status: row.status as OrderStatus,
  note: row.note || undefined,
  created_by: row.created_by,
  created_at: row.created_at.toISOString(),
});

export async function getStoreProducts(): Promise<ApiResponse<Product[]>> {
  try {
    const access = await requireStoreAccess();
    if ("error" in access) {
      return { success: false, error: access.error, code: "UNAUTHORIZED" };
    }

    const products = await db.query.products.findMany({
      orderBy: (products, { asc }) => [asc(products.name)],
    });

    return { success: true, data: products.map(mapProduct) };
  } catch (error) {
    console.error("[getStoreProducts]", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load products",
      code: "INTERNAL_ERROR",
    };
  }
}

export async function getStoreServices(): Promise<ApiResponse<Service[]>> {
  try {
    const access = await requireStoreAccess();
    if ("error" in access) {
      return { success: false, error: access.error, code: "UNAUTHORIZED" };
    }

    const services = await db.query.services.findMany({
      orderBy: (services, { asc }) => [asc(services.name)],
    });

    return { success: true, data: services.map(mapService) };
  } catch (error) {
    console.error("[getStoreServices]", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load services",
      code: "INTERNAL_ERROR",
    };
  }
}

export interface ServiceInput {
  id?: string;
  name: string;
  description?: string;
  price_inr: number;
  is_active: boolean;
}

const validateService = (input: ServiceInput) => {
  if (!input.name.trim()) return "Service name is required";
  if (input.price_inr <= 0) return "Price must be greater than zero";
  return null;
};

export async function createService(input: ServiceInput): Promise<ApiResponse<Service>> {
  try {
    const access = await requireStoreAccess();
    if ("error" in access) {
      return { success: false, error: access.error, code: "UNAUTHORIZED" };
    }

    const validationError = validateService(input);
    if (validationError) {
      return { success: false, error: validationError, code: "INVALID_INPUT" };
    }

    const [created] = await db
      .insert(schema.services)
      .values({
        name: input.name,
        description: input.description || null,
        price_inr: input.price_inr,
        is_active: input.is_active,
      })
      .returning();

    revalidatePath("/store-manager");

    console.info("[store-manager] createService", {
      userId: access.profile.id,
      serviceId: created.id,
      price: created.price_inr,
    });

    return { success: true, data: mapService(created) };
  } catch (error) {
    console.error("[createService]", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create service",
      code: "INTERNAL_ERROR",
    };
  }
}

export async function updateService(input: ServiceInput): Promise<ApiResponse<Service>> {
  try {
    const access = await requireStoreAccess();
    if ("error" in access) {
      return { success: false, error: access.error, code: "UNAUTHORIZED" };
    }

    if (!input.id) {
      return { success: false, error: "Missing service id", code: "INVALID_INPUT" };
    }

    const validationError = validateService(input);
    if (validationError) {
      return { success: false, error: validationError, code: "INVALID_INPUT" };
    }

    const [updated] = await db
      .update(schema.services)
      .set({
        name: input.name,
        description: input.description || null,
        price_inr: input.price_inr,
        is_active: input.is_active,
      })
      .where(eq(schema.services.id, input.id))
      .returning();

    if (!updated) {
      return { success: false, error: "Service not found", code: "NOT_FOUND" };
    }

    revalidatePath("/store-manager");

    return { success: true, data: mapService(updated) };
  } catch (error) {
    console.error("[updateService]", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update service",
      code: "INTERNAL_ERROR",
    };
  }
}

export interface ProductInput {
  id?: string;
  name: string;
  slug: string;
  price_inr: number;
  stock: number;
  requires_prescription: boolean;
  is_active: boolean;
  description?: string;
  image_url?: string;
  category?: string;
}

const validateProduct = (input: ProductInput) => {
  if (!input.name.trim()) return "Product name is required";
  if (!input.slug.trim()) return "Slug is required";
  if (input.price_inr <= 0) return "Price must be greater than zero";
  if (input.stock < 0) return "Stock cannot be negative";
  return null;
};

export async function createProduct(input: ProductInput): Promise<ApiResponse<Product>> {
  try {
    const access = await requireStoreAccess();
    if ("error" in access) {
      return { success: false, error: access.error, code: "UNAUTHORIZED" };
    }

    const validationError = validateProduct(input);
    if (validationError) {
      return { success: false, error: validationError, code: "INVALID_INPUT" };
    }

    const [created] = await db
      .insert(schema.products)
      .values({
        name: input.name,
        slug: input.slug,
        description: input.description || null,
        price_inr: input.price_inr,
        stock: input.stock,
        requires_prescription: input.requires_prescription,
        image_url: input.image_url || null,
        category: input.category || null,
        is_active: input.is_active,
      })
      .returning();

    revalidatePath("/store-manager");

    console.info("[store-manager] createProduct", {
      userId: access.profile.id,
      productId: created.id,
      price: created.price_inr,
      stock: created.stock,
    });

    return { success: true, data: mapProduct(created) };
  } catch (error) {
    console.error("[createProduct]", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create product",
      code: "INTERNAL_ERROR",
    };
  }
}

export async function updateProduct(input: ProductInput): Promise<ApiResponse<Product>> {
  try {
    const access = await requireStoreAccess();
    if ("error" in access) {
      return { success: false, error: access.error, code: "UNAUTHORIZED" };
    }

    if (!input.id) {
      return { success: false, error: "Missing product id", code: "INVALID_INPUT" };
    }

    const validationError = validateProduct(input);
    if (validationError) {
      return { success: false, error: validationError, code: "INVALID_INPUT" };
    }

    const current = await db.query.products.findFirst({
      where: eq(schema.products.id, input.id),
    });

    const [updated] = await db
      .update(schema.products)
      .set({
        name: input.name,
        slug: input.slug,
        description: input.description || null,
        price_inr: input.price_inr,
        stock: input.stock,
        requires_prescription: input.requires_prescription,
        image_url: input.image_url || null,
        category: input.category || null,
        is_active: input.is_active,
      })
      .where(eq(schema.products.id, input.id))
      .returning();

    if (!updated) {
      return { success: false, error: "Product not found", code: "NOT_FOUND" };
    }

    revalidatePath("/store-manager");

    if (current && current.price_inr !== updated.price_inr) {
      console.info("[store-manager] priceChange", {
        userId: access.profile.id,
        productId: updated.id,
        from: current.price_inr,
        to: updated.price_inr,
      });
    }

    return { success: true, data: mapProduct(updated) };
  } catch (error) {
    console.error("[updateProduct]", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update product",
      code: "INTERNAL_ERROR",
    };
  }
}

export async function getStoreOrders(): Promise<ApiResponse<OrderWithItems[]>> {
  try {
    const access = await requireStoreAccess();
    if ("error" in access) {
      return { success: false, error: access.error, code: "UNAUTHORIZED" };
    }

    const orders = await db.query.orders.findMany({
      with: {
        items: {
          with: {
            product: true,
          },
        },
      },
      orderBy: [desc(schema.orders.created_at)],
    });

    const orderIds = orders.map((order) => order.id);
    const statusLogs = orderIds.length
      ? await db.query.order_status_logs.findMany({
          where: inArray(schema.order_status_logs.order_id, orderIds),
          orderBy: (logs, { desc }) => [desc(logs.created_at)],
        })
      : [];

    const logsByOrder = statusLogs.reduce<Record<string, OrderStatusLog[]>>(
      (acc, log) => {
        acc[log.order_id] = acc[log.order_id] || [];
        acc[log.order_id].push(mapOrderStatusLog(log));
        return acc;
      },
      {}
    );

    const formatted: OrderWithItems[] = orders.map((order) => ({
      id: order.id,
      customer_id: order.customer_id,
      total_amount_inr: order.total_amount_inr,
      razorpay_order_id: order.razorpay_order_id || undefined,
      order_status: order.order_status as OrderStatus,
      payment_status: order.payment_status as PaymentStatus,
      shipping_address_json: order.shipping_address_json as ShippingAddress,
      created_at: order.created_at.toISOString(),
      updated_at: order.updated_at.toISOString(),
      status_logs: logsByOrder[order.id] || [],
      items: order.items.map((item) => ({
        id: item.id,
        order_id: item.order_id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price_at_purchase: item.unit_price_at_purchase,
        prescription_file_path: item.prescription_file_path || undefined,
        created_at: item.created_at.toISOString(),
        product: {
          id: item.product.id,
          name: item.product.name,
          slug: item.product.slug,
          description: item.product.description || undefined,
          price_inr: item.product.price_inr,
          stock: item.product.stock,
          requires_prescription: item.product.requires_prescription,
          image_url: item.product.image_url || undefined,
          category: item.product.category || undefined,
          is_active: item.product.is_active,
          created_at: item.product.created_at.toISOString(),
          updated_at: item.product.updated_at.toISOString(),
        },
      })),
    }));

    return { success: true, data: formatted };
  } catch (error) {
    console.error("[getStoreOrders]", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load orders",
      code: "INTERNAL_ERROR",
    };
  }
}

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
  note?: string
): Promise<ApiResponse<OrderWithItems>> {
  try {
    const access = await requireStoreAccess();
    if ("error" in access) {
      return { success: false, error: access.error, code: "UNAUTHORIZED" };
    }

    if (note && note.length > 500) {
      return { success: false, error: "Note is too long", code: "INVALID_INPUT" };
    }

    const [updated] = await db
      .update(schema.orders)
      .set({ order_status: status })
      .where(eq(schema.orders.id, orderId))
      .returning();

    if (!updated) {
      return { success: false, error: "Order not found", code: "NOT_FOUND" };
    }

    console.info("[store-manager] updateOrderStatus", {
      userId: access.profile.id,
      orderId,
      status,
    });

    await db
      .insert(schema.order_status_logs)
      .values({
        order_id: updated.id,
        status,
        note: note || null,
        created_by: access.profile.id,
      })
      .execute();

    const items = await db.query.order_items.findMany({
      where: eq(schema.order_items.order_id, updated.id),
      with: { product: true },
    });

    const logs = await db.query.order_status_logs.findMany({
      where: eq(schema.order_status_logs.order_id, updated.id),
      orderBy: (logs, { desc }) => [desc(logs.created_at)],
    });

    revalidatePath("/store-manager");

    return {
      success: true,
      data: {
        id: updated.id,
        customer_id: updated.customer_id,
        total_amount_inr: updated.total_amount_inr,
        razorpay_order_id: updated.razorpay_order_id || undefined,
        order_status: updated.order_status as OrderStatus,
        payment_status: updated.payment_status as PaymentStatus,
        shipping_address_json: updated.shipping_address_json as ShippingAddress,
        created_at: updated.created_at.toISOString(),
        updated_at: updated.updated_at.toISOString(),
        status_logs: logs.map(mapOrderStatusLog),
        items: items.map((item) => ({
          id: item.id,
          order_id: item.order_id,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price_at_purchase: item.unit_price_at_purchase,
          prescription_file_path: item.prescription_file_path || undefined,
          created_at: item.created_at.toISOString(),
          product: {
            id: item.product.id,
            name: item.product.name,
            slug: item.product.slug,
            description: item.product.description || undefined,
            price_inr: item.product.price_inr,
            stock: item.product.stock,
            requires_prescription: item.product.requires_prescription,
            image_url: item.product.image_url || undefined,
            category: item.product.category || undefined,
            is_active: item.product.is_active,
            created_at: item.product.created_at.toISOString(),
            updated_at: item.product.updated_at.toISOString(),
          },
        })),
      },
      message: "Order status updated",
    };
  } catch (error) {
    console.error("[updateOrderStatus]", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update order",
      code: "INTERNAL_ERROR",
    };
  }
}

export async function adjustInventory(
  productId: string,
  delta: number,
  reason: string
): Promise<ApiResponse<Product>> {
  try {
    const access = await requireStoreAccess();
    if ("error" in access) {
      return { success: false, error: access.error, code: "UNAUTHORIZED" };
    }

    if (!Number.isFinite(delta) || delta === 0) {
      return { success: false, error: "Adjustment must be non-zero", code: "INVALID_INPUT" };
    }

    if (reason.trim().length < 3) {
      return { success: false, error: "Reason is required", code: "INVALID_INPUT" };
    }

    const current = await db.query.products.findFirst({
      where: eq(schema.products.id, productId),
    });

    if (!current) {
      return { success: false, error: "Product not found", code: "NOT_FOUND" };
    }

    const newStock = current.stock + delta;
    if (newStock < 0) {
      return { success: false, error: "Stock cannot go below zero", code: "INVALID_INPUT" };
    }

    const [updated] = await db
      .update(schema.products)
      .set({ stock: sql`${schema.products.stock} + ${delta}` })
      .where(eq(schema.products.id, productId))
      .returning();

    revalidatePath("/store-manager");

    console.info("[store-manager] adjustInventory", {
      userId: access.profile.id,
      productId,
      delta,
      reason,
      from: current.stock,
      to: updated.stock,
    });

    return { success: true, data: mapProduct(updated), message: "Inventory adjusted" };
  } catch (error) {
    console.error("[adjustInventory]", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to adjust inventory",
      code: "INTERNAL_ERROR",
    };
  }
}

export interface InventoryAdjustmentInput {
  product_id: string;
  delta: number;
  reason: string;
}

export async function adjustInventoryBulk(
  adjustments: InventoryAdjustmentInput[]
): Promise<ApiResponse<Product[]>> {
  try {
    const access = await requireStoreAccess();
    if ("error" in access) {
      return { success: false, error: access.error, code: "UNAUTHORIZED" };
    }

    if (!adjustments.length) {
      return { success: false, error: "No adjustments provided", code: "INVALID_INPUT" };
    }

    const updatedProducts: Product[] = [];

    await db.transaction(async (tx) => {
      for (const item of adjustments) {
        if (!Number.isFinite(item.delta) || item.delta === 0) {
          throw new Error("Invalid adjustment delta");
        }

        if (item.reason.trim().length < 3) {
          throw new Error("Reason is required");
        }

        const current = await tx.query.products.findFirst({
          where: eq(schema.products.id, item.product_id),
        });

        if (!current) {
          throw new Error("Product not found");
        }

        const newStock = current.stock + item.delta;
        if (newStock < 0) {
          throw new Error("Stock cannot go below zero");
        }

        const [updated] = await tx
          .update(schema.products)
          .set({ stock: sql`${schema.products.stock} + ${item.delta}` })
          .where(eq(schema.products.id, item.product_id))
          .returning();

        updatedProducts.push(mapProduct(updated));

        console.info("[store-manager] adjustInventoryBulk", {
          userId: access.profile.id,
          productId: item.product_id,
          delta: item.delta,
          reason: item.reason,
          from: current.stock,
          to: updated.stock,
        });
      }
    });

    revalidatePath("/store-manager");

    return { success: true, data: updatedProducts, message: "Inventory adjusted" };
  } catch (error) {
    console.error("[adjustInventoryBulk]", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to adjust inventory",
      code: "INTERNAL_ERROR",
    };
  }
}

export async function getProductsCsv(): Promise<ApiResponse<string>> {
  try {
    const access = await requireStoreAccess();
    if ("error" in access) {
      return { success: false, error: access.error, code: "UNAUTHORIZED" };
    }

    const products = await db.query.products.findMany({
      orderBy: (products, { asc }) => [asc(products.name)],
    });

    const header = [
      "name",
      "slug",
      "price_inr",
      "stock",
      "requires_prescription",
      "is_active",
      "category",
      "description",
      "image_url",
    ].join(",");

    const rows = products.map((product) =>
      [
        product.name,
        product.slug,
        product.price_inr,
        product.stock,
        product.requires_prescription,
        product.is_active,
        product.category ?? "",
        product.description ?? "",
        product.image_url ?? "",
      ]
        .map((value) => `"${String(value).replace(/"/g, '""')}"`)
        .join(",")
    );

    return { success: true, data: [header, ...rows].join("\n") };
  } catch (error) {
    console.error("[getProductsCsv]", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to export CSV",
      code: "INTERNAL_ERROR",
    };
  }
}
