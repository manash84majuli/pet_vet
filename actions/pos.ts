"use server";

import { db } from "@/lib/drizzle";
import * as schema from "@/lib/schema";
import {
  ApiResponse,
  PosOrder,
  PosOrderItem,
  PosOrderStatus,
  PosOrderType,
  PosPaymentMethod,
  Product,
  Service,
} from "@/lib/types";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { createServerClient } from "@/lib/supabase";
import { revalidatePath } from "next/cache";

const requirePosAccess = async () => {
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

  if (!profile || (profile.role !== "admin" && profile.role !== "store_manager")) {
    return { error: "Forbidden" } as const;
  }

  return { profile } as const;
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

export async function getPosCatalog(): Promise<
  ApiResponse<{ products: Product[]; services: Service[] }>
> {
  try {
    const access = await requirePosAccess();
    if ("error" in access) {
      return { success: false, error: access.error, code: "UNAUTHORIZED" };
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

    return {
      success: true,
      data: {
        products: products.map(mapProduct),
        services: services.map(mapService),
      },
    };
  } catch (error) {
    console.error("[getPosCatalog]", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load POS catalog",
      code: "INTERNAL_ERROR",
    };
  }
}

export interface CreatePosOrderInput {
  order_type: PosOrderType;
  customer_name?: string;
  customer_phone?: string;
  payment_method: PosPaymentMethod;
  items: {
    item_type: "product" | "service";
    product_id?: string;
    service_id?: string;
    quantity: number;
  }[];
}

export async function createPosOrder(
  input: CreatePosOrderInput
): Promise<ApiResponse<{ order: PosOrder; items: PosOrderItem[] }>> {
  try {
    const access = await requirePosAccess();
    if ("error" in access) {
      return { success: false, error: access.error, code: "UNAUTHORIZED" };
    }

    if (!input.items.length) {
      return { success: false, error: "No items provided", code: "INVALID_INPUT" };
    }

    const productIds = input.items
      .filter((item) => item.item_type === "product" && item.product_id)
      .map((item) => item.product_id!)
      .filter((value, index, arr) => arr.indexOf(value) === index);

    const serviceIds = input.items
      .filter((item) => item.item_type === "service" && item.service_id)
      .map((item) => item.service_id!)
      .filter((value, index, arr) => arr.indexOf(value) === index);

    const [products, services] = await Promise.all([
      productIds.length
        ? db.query.products.findMany({
            where: inArray(schema.products.id, productIds),
          })
        : Promise.resolve([]),
      serviceIds.length
        ? db.query.services.findMany({
            where: inArray(schema.services.id, serviceIds),
          })
        : Promise.resolve([]),
    ]);

    const productMap = new Map(products.map((product) => [product.id, product]));
    const serviceMap = new Map(services.map((service) => [service.id, service]));

    let totalAmount = 0;
    const lineItems: {
      item_type: "product" | "service";
      product_id?: string;
      service_id?: string;
      quantity: number;
      unit_price_inr: number;
      line_total_inr: number;
    }[] = [];

    for (const item of input.items) {
      if (item.quantity <= 0) {
        return { success: false, error: "Quantity must be positive", code: "INVALID_INPUT" };
      }

      if (item.item_type === "product") {
        const product = item.product_id ? productMap.get(item.product_id) : null;
        if (!product || !product.is_active) {
          return { success: false, error: "Product unavailable", code: "NOT_FOUND" };
        }

        if (product.stock < item.quantity) {
          return { success: false, error: "Insufficient stock", code: "OUT_OF_STOCK" };
        }

        const lineTotal = product.price_inr * item.quantity;
        totalAmount += lineTotal;

        lineItems.push({
          item_type: "product",
          product_id: product.id,
          quantity: item.quantity,
          unit_price_inr: product.price_inr,
          line_total_inr: lineTotal,
        });
      } else {
        const service = item.service_id ? serviceMap.get(item.service_id) : null;
        if (!service || !service.is_active) {
          return { success: false, error: "Service unavailable", code: "NOT_FOUND" };
        }

        const lineTotal = service.price_inr * item.quantity;
        totalAmount += lineTotal;

        lineItems.push({
          item_type: "service",
          service_id: service.id,
          quantity: item.quantity,
          unit_price_inr: service.price_inr,
          line_total_inr: lineTotal,
        });
      }
    }

    const result = await db.transaction(async (tx) => {
      const [orderRow] = await tx
        .insert(schema.pos_orders)
        .values({
          order_type: input.order_type,
          customer_name: input.customer_name || null,
          customer_phone: input.customer_phone || null,
          total_amount_inr: totalAmount,
          payment_method: input.payment_method,
          status: "completed" as PosOrderStatus,
          created_by: access.profile.id,
        })
        .returning();

      const [orderItems] = await Promise.all([
        tx
          .insert(schema.pos_order_items)
          .values(
            lineItems.map((item) => ({
              pos_order_id: orderRow.id,
              item_type: item.item_type,
              product_id: item.product_id || null,
              service_id: item.service_id || null,
              quantity: item.quantity,
              unit_price_inr: item.unit_price_inr,
              line_total_inr: item.line_total_inr,
            }))
          )
          .returning(),
        Promise.resolve(true),
      ]);

      for (const item of lineItems) {
        if (item.item_type === "product" && item.product_id) {
          await tx
            .update(schema.products)
            .set({ stock: sql`${schema.products.stock} - ${item.quantity}` })
            .where(
              and(
                eq(schema.products.id, item.product_id),
                sql`${schema.products.stock} >= ${item.quantity}`
              )
            )
            .execute();
        }
      }

      return { orderRow, orderItems };
    });

    revalidatePath("/pos");

    const mappedOrder: PosOrder = {
      id: result.orderRow.id,
      order_type: result.orderRow.order_type as PosOrderType,
      customer_name: result.orderRow.customer_name || undefined,
      customer_phone: result.orderRow.customer_phone || undefined,
      total_amount_inr: result.orderRow.total_amount_inr,
      payment_method: result.orderRow.payment_method as PosPaymentMethod,
      status: result.orderRow.status as PosOrderStatus,
      created_by: result.orderRow.created_by,
      created_at: result.orderRow.created_at.toISOString(),
    };

    const mappedItems: PosOrderItem[] = result.orderItems.map((item) => ({
      id: item.id,
      pos_order_id: item.pos_order_id,
      item_type: item.item_type as "product" | "service",
      product_id: item.product_id || undefined,
      service_id: item.service_id || undefined,
      quantity: item.quantity,
      unit_price_inr: item.unit_price_inr,
      line_total_inr: item.line_total_inr,
    }));

    return {
      success: true,
      data: { order: mappedOrder, items: mappedItems },
      message: "POS order created",
    };
  } catch (error) {
    console.error("[createPosOrder]", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create POS order",
      code: "INTERNAL_ERROR",
    };
  }
}

export interface PosHistoryFilters {
  startDate?: string;
  endDate?: string;
  orderType?: PosOrderType;
  paymentMethod?: PosPaymentMethod;
}

export async function getPosOrders(
  filters: PosHistoryFilters = {}
): Promise<ApiResponse<{ orders: PosOrder[]; items: PosOrderItem[] }>> {
  try {
    const access = await requirePosAccess();
    if ("error" in access) {
      return { success: false, error: access.error, code: "UNAUTHORIZED" };
    }

    const where = [] as Array<ReturnType<typeof eq> | ReturnType<typeof sql>>;
    if (filters.orderType) {
      where.push(eq(schema.pos_orders.order_type, filters.orderType));
    }
    if (filters.paymentMethod) {
      where.push(eq(schema.pos_orders.payment_method, filters.paymentMethod));
    }
    if (filters.startDate) {
      const start = new Date(filters.startDate);
      where.push(sql`${schema.pos_orders.created_at} >= ${start}`);
    }
    if (filters.endDate) {
      const endExclusive = new Date(filters.endDate);
      endExclusive.setDate(endExclusive.getDate() + 1);
      where.push(sql`${schema.pos_orders.created_at} < ${endExclusive}`);
    }

    const orders = await db.query.pos_orders.findMany({
      where: where.length ? and(...where) : undefined,
      orderBy: (orders, { desc }) => [desc(orders.created_at)],
    });

    const orderIds = orders.map((order) => order.id);
    const items = orderIds.length
      ? await db.query.pos_order_items.findMany({
          where: inArray(schema.pos_order_items.pos_order_id, orderIds),
        })
      : [];

    const mappedOrders: PosOrder[] = orders.map((order) => ({
      id: order.id,
      order_type: order.order_type as PosOrderType,
      customer_name: order.customer_name || undefined,
      customer_phone: order.customer_phone || undefined,
      total_amount_inr: order.total_amount_inr,
      payment_method: order.payment_method as PosPaymentMethod,
      status: order.status as PosOrderStatus,
      created_by: order.created_by,
      created_at: order.created_at.toISOString(),
    }));

    const mappedItems: PosOrderItem[] = items.map((item) => ({
      id: item.id,
      pos_order_id: item.pos_order_id,
      item_type: item.item_type as "product" | "service",
      product_id: item.product_id || undefined,
      service_id: item.service_id || undefined,
      quantity: item.quantity,
      unit_price_inr: item.unit_price_inr,
      line_total_inr: item.line_total_inr,
    }));

    return { success: true, data: { orders: mappedOrders, items: mappedItems } };
  } catch (error) {
    console.error("[getPosOrders]", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load POS orders",
      code: "INTERNAL_ERROR",
    };
  }
}
