/**
 * Store Manager Module - Products and Orders
 */

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/drizzle";
import * as schema from "@/lib/schema";
import { createServerClient } from "@/lib/supabase";
import {
  OrderStatus,
  OrderStatusLog,
  OrderWithItems,
  PaymentStatus,
  Product,
  Service,
  ShippingAddress,
  UserRole,
} from "@/lib/types";
import StoreManagerClient from "./StoreManagerClient";

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

const mapStatusLog = (
  row: typeof schema.order_status_logs.$inferSelect
): OrderStatusLog => ({
  id: row.id,
  order_id: row.order_id,
  status: row.status as OrderStatus,
  note: row.note || undefined,
  created_by: row.created_by,
  created_at: row.created_at.toISOString(),
});

// Vercel: Use Node.js runtime for database queries
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function StoreManagerPage() {
  const cookieStore = cookies();
  const supabase = createServerClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?from=/store-manager");
  }

  const profile = await db.query.profiles.findFirst({
    where: eq(schema.profiles.id, user.id),
  });

  if (!profile || (profile.role !== "admin" && profile.role !== "store_manager")) {
    redirect("/");
  }

  const [products, services, orders] = await Promise.all([
    db.query.products.findMany({
      orderBy: (products, { asc }) => [asc(products.name)],
    }),
    db.query.services.findMany({
      orderBy: (services, { asc }) => [asc(services.name)],
    }),
    db.query.orders.findMany({
    with: {
      items: {
        with: {
          product: true,
        },
      },
    },
    orderBy: [desc(schema.orders.created_at)],
    }),
  ]);

  const orderIds = orders.map((order) => order.id);
  const logs = orderIds.length
    ? await db.query.order_status_logs.findMany({
        where: inArray(schema.order_status_logs.order_id, orderIds),
        orderBy: (logs, { desc }) => [desc(logs.created_at)],
      })
    : [];

  const logsByOrder = logs.reduce<Record<string, OrderStatusLog[]>>(
    (acc, log) => {
      acc[log.order_id] = acc[log.order_id] || [];
      acc[log.order_id].push(mapStatusLog(log));
      return acc;
    },
    {}
  );

  const formattedOrders: OrderWithItems[] = orders.map((order) => ({
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

  return (
    <StoreManagerClient
      products={products.map(mapProduct)}
      services={services.map(mapService)}
      orders={formattedOrders}
      userRole={profile.role as UserRole}
    />
  );
}
