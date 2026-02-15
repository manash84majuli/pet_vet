/**
 * Server Actions for Orders
 */

"use server";

import { db } from "@/lib/drizzle";
import * as schema from "@/lib/schema";
import {
  OrderStatus,
  OrderWithItems,
  ApiResponse,
  PaymentStatus,
  ShippingAddress,
} from "@/lib/types";
import { eq, desc } from "drizzle-orm";
import { cookies } from "next/headers";
import { createServerClient } from "@/lib/supabase";

export async function getUserOrders(): Promise<ApiResponse<OrderWithItems[]>> {
  try {
    const cookieStore = cookies();
    const supabase = createServerClient(cookieStore);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: true, data: [] };
    }

    const orders = await db.query.orders.findMany({
      where: eq(schema.orders.customer_id, user.id),
      with: {
        items: {
          with: {
            product: true
          }
        }
      },
      orderBy: [desc(schema.orders.created_at)],
    });

    const formatted: OrderWithItems[] = orders.map(order => ({
      id: order.id,
      customer_id: order.customer_id,
      total_amount_inr: order.total_amount_inr,
      razorpay_order_id: order.razorpay_order_id || undefined,
      order_status: order.order_status as OrderStatus,
      payment_status: order.payment_status as PaymentStatus,
      shipping_address_json: order.shipping_address_json as ShippingAddress,
      created_at: order.created_at.toISOString(),
      updated_at: order.updated_at.toISOString(),
      items: order.items.map(item => ({
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
          updated_at: item.product.updated_at.toISOString()
        }
      }))
    }));

    return { success: true, data: formatted };
  } catch (error) {
    console.error("Error fetching user orders:", error);
    return { success: false, error: "Failed to load orders" };
  }
}
