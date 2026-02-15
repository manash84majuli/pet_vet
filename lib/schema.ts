/**
 * Drizzle ORM Schema Definition
 * Mirrors the PostgreSQL schema in TypeScript for type-safe queries
 */

import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  pgEnum,
  unique,
  index,
  jsonb,
  decimal,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ============================================================================
// ENUMS
// ============================================================================

export const userRoleEnum = pgEnum("user_role", [
  "customer",
  "vet",
  "admin",
  "store_manager",
]);
export const appointmentStatusEnum = pgEnum("appointment_status", [
  "pending",
  "confirmed",
  "completed",
  "cancelled",
]);
export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "paid",
  "failed",
]);
export const posOrderTypeEnum = pgEnum("pos_order_type", [
  "retail",
  "clinic",
]);
export const posOrderStatusEnum = pgEnum("pos_order_status", [
  "completed",
  "cancelled",
]);
export const posPaymentMethodEnum = pgEnum("pos_payment_method", [
  "cash",
  "card",
]);
export const orderStatusEnum = pgEnum("order_status", [
  "pending",
  "packed",
  "shipped",
  "delivered",
  "cancelled",
]);
export const genderEnum = pgEnum("gender_enum", ["male", "female", "other"]);

// ============================================================================
// TABLES
// ============================================================================

export const profiles = pgTable(
  "profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    role: userRoleEnum("role").notNull().default("customer"),
    full_name: varchar("full_name", { length: 255 }).notNull(),
    phone: varchar("phone", { length: 20 }).notNull().unique(),
    city: varchar("city", { length: 100 }),
    state: varchar("state", { length: 100 }),
    avatar_url: text("avatar_url"),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    roleIdx: index("idx_profiles_role").on(table.role),
    phoneCheck: check("phone_format", sql`phone ~ '^\+?[1-9]\d{1,14}$'`),
  })
);

export const vets = pgTable(
  "vets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    profile_id: uuid("profile_id")
      .notNull()
      .unique()
      .references(() => profiles.id, { onDelete: "cascade" }),
    license_number: varchar("license_number", { length: 100 })
      .notNull()
      .unique(),
    clinic_name: varchar("clinic_name", { length: 255 }).notNull(),
    address: text("address").notNull(),
    consultation_fee_inr: integer("consultation_fee_inr").notNull(),
    specialization: varchar("specialization", { length: 255 }),
    is_active: boolean("is_active").notNull().default(true),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    profileIdx: index("idx_vets_profile_id").on(table.profile_id),
    consultationFeeCheck: check(
      "consultation_fee_check",
      sql`consultation_fee_inr > 0`
    ),
  })
);

export const pets = pgTable(
  "pets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    owner_id: uuid("owner_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 100 }).notNull(),
    species: varchar("species", { length: 50 }).notNull(),
    breed: varchar("breed", { length: 100 }),
    age_years: decimal("age_years", { precision: 3, scale: 1 }),
    gender: genderEnum("gender"),
    weight_kg: decimal("weight_kg", { precision: 5, scale: 2 }),
    photo_url: text("photo_url"),
    medical_notes: text("medical_notes"),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    ownerIdx: index("idx_pets_owner_id").on(table.owner_id),
    ageCheck: check("age_check", sql`age_years >= 0`),
    weightCheck: check("weight_check", sql`weight_kg > 0`),
  })
);

export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }).notNull().unique(),
    description: text("description"),
    price_inr: integer("price_inr").notNull(),
    stock: integer("stock").notNull().default(0),
    requires_prescription: boolean("requires_prescription").notNull().default(false),
    image_url: text("image_url"),
    category: varchar("category", { length: 100 }),
    is_active: boolean("is_active").notNull().default(true),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    slugIdx: index("idx_products_slug").on(table.slug),
    priceCheck: check("price_check", sql`price_inr > 0`),
    stockCheck: check("stock_check", sql`stock >= 0`),
  })
);

export const services = pgTable(
  "services",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    price_inr: integer("price_inr").notNull(),
    is_active: boolean("is_active").notNull().default(true),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  () => ({
    priceCheck: check("services_price_check", sql`price_inr > 0`),
  })
);

export const appointments = pgTable(
  "appointments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    pet_id: uuid("pet_id")
      .notNull()
      .references(() => pets.id, { onDelete: "cascade" }),
    vet_id: uuid("vet_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "restrict" }),
    appointment_time: timestamp("appointment_time", {
      withTimezone: true,
    }).notNull(),
    status: appointmentStatusEnum("status").notNull().default("pending"),
    razorpay_order_id: text("razorpay_order_id"),
    payment_status: paymentStatusEnum("payment_status").notNull().default("pending"),
    notes: text("notes"),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    petIdx: index("idx_appointments_pet_id").on(table.pet_id),
    vetIdx: index("idx_appointments_vet_id").on(table.vet_id),
    timeIdx: index("idx_appointments_appointment_time").on(
      table.appointment_time
    ),
    uniqueVetSlot: unique("unique_vet_slot").on(table.vet_id, table.appointment_time),
  })
);

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    customer_id: uuid("customer_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    total_amount_inr: integer("total_amount_inr").notNull(),
    razorpay_order_id: varchar("razorpay_order_id", { length: 100 }).unique(),
    order_status: orderStatusEnum("order_status").notNull().default("pending"),
    payment_status: paymentStatusEnum("payment_status").notNull().default("pending"),
    shipping_address_json: jsonb("shipping_address_json").notNull(),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    customerIdx: index("idx_orders_customer_id").on(table.customer_id),
    amountCheck: check("amount_check", sql`total_amount_inr > 0`),
  })
);

export const pos_orders = pgTable(
  "pos_orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    order_type: posOrderTypeEnum("order_type").notNull(),
    customer_name: varchar("customer_name", { length: 255 }),
    customer_phone: varchar("customer_phone", { length: 20 }),
    total_amount_inr: integer("total_amount_inr").notNull(),
    payment_method: posPaymentMethodEnum("payment_method").notNull(),
    status: posOrderStatusEnum("status").notNull().default("completed"),
    created_by: uuid("created_by")
      .notNull()
      .references(() => profiles.id, { onDelete: "restrict" }),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    createdByIdx: index("idx_pos_orders_created_by").on(table.created_by),
  })
);

export const pos_order_items = pgTable(
  "pos_order_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    pos_order_id: uuid("pos_order_id")
      .notNull()
      .references(() => pos_orders.id, { onDelete: "cascade" }),
    item_type: varchar("item_type", { length: 20 }).notNull(),
    product_id: uuid("product_id").references(() => products.id, {
      onDelete: "restrict",
    }),
    service_id: uuid("service_id").references(() => services.id, {
      onDelete: "restrict",
    }),
    quantity: integer("quantity").notNull(),
    unit_price_inr: integer("unit_price_inr").notNull(),
    line_total_inr: integer("line_total_inr").notNull(),
  },
  (table) => ({
    orderIdx: index("idx_pos_order_items_order_id").on(table.pos_order_id),
  })
);

export const order_items = pgTable(
  "order_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    order_id: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    product_id: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "restrict" }),
    quantity: integer("quantity").notNull(),
    unit_price_at_purchase: integer("unit_price_at_purchase").notNull(),
    prescription_file_path: text("prescription_file_path"),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    orderIdx: index("idx_order_items_order_id").on(table.order_id),
    productIdx: index("idx_order_items_product_id").on(table.product_id),
    quantityCheck: check("quantity_check", sql`quantity > 0`),
    priceCheck: check("unit_price_check", sql`unit_price_at_purchase > 0`),
  })
);

export const order_status_logs = pgTable(
  "order_status_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    order_id: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    status: orderStatusEnum("status").notNull(),
    note: text("note"),
    created_by: uuid("created_by")
      .notNull()
      .references(() => profiles.id, { onDelete: "restrict" }),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    orderIdx: index("idx_order_status_logs_order_id").on(table.order_id),
  })
);

export const prescription_uploads = pgTable(
  "prescription_uploads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    user_id: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    order_item_id: uuid("order_item_id").references(() => order_items.id, {
      onDelete: "set null",
    }),
    file_path: text("file_path").notNull(),
    file_name: varchar("file_name", { length: 255 }).notNull(),
    file_size: integer("file_size"),
    uploaded_at: timestamp("uploaded_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    userIdx: index("idx_prescription_uploads_user_id").on(table.user_id),
  })
);

// ============================================================================
// RELATIONS (for Drizzle relations API - optional but useful)
// ============================================================================

import { relations } from "drizzle-orm";

export const profilesRelations = relations(profiles, ({ many, one }) => ({
  pets: many(pets),
  appointments_as_vet: many(appointments),
  orders: many(orders),
  vet_profile: one(vets, {
    fields: [profiles.id],
    references: [vets.profile_id],
  }),
}));

export const vetsRelations = relations(vets, ({ one }) => ({
  profile: one(profiles, {
    fields: [vets.profile_id],
    references: [profiles.id],
  }),
}));

export const petsRelations = relations(pets, ({ one, many }) => ({
  owner: one(profiles, {
    fields: [pets.owner_id],
    references: [profiles.id],
  }),
  appointments: many(appointments),
}));

export const appointmentsRelations = relations(appointments, ({ one }) => ({
  pet: one(pets, {
    fields: [appointments.pet_id],
    references: [pets.id],
  }),
  vet: one(profiles, {
    fields: [appointments.vet_id],
    references: [profiles.id],
  }),
}));

export const productsRelations = relations(products, ({ many }) => ({
  order_items: many(order_items),
  pos_order_items: many(pos_order_items),
}));

export const servicesRelations = relations(services, ({ many }) => ({
  pos_order_items: many(pos_order_items),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  customer: one(profiles, {
    fields: [orders.customer_id],
    references: [profiles.id],
  }),
  items: many(order_items),
  status_logs: many(order_status_logs),
}));

export const pos_ordersRelations = relations(pos_orders, ({ one, many }) => ({
  created_by: one(profiles, {
    fields: [pos_orders.created_by],
    references: [profiles.id],
  }),
  items: many(pos_order_items),
}));

export const pos_order_itemsRelations = relations(pos_order_items, ({ one }) => ({
  order: one(pos_orders, {
    fields: [pos_order_items.pos_order_id],
    references: [pos_orders.id],
  }),
  product: one(products, {
    fields: [pos_order_items.product_id],
    references: [products.id],
  }),
  service: one(services, {
    fields: [pos_order_items.service_id],
    references: [services.id],
  }),
}));

export const order_itemsRelations = relations(order_items, ({ one }) => ({
  order: one(orders, {
    fields: [order_items.order_id],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [order_items.product_id],
    references: [products.id],
  }),
}));

export const order_status_logsRelations = relations(order_status_logs, ({ one }) => ({
  order: one(orders, {
    fields: [order_status_logs.order_id],
    references: [orders.id],
  }),
  author: one(profiles, {
    fields: [order_status_logs.created_by],
    references: [profiles.id],
  }),
}));

export const prescription_uploadsRelations = relations(
  prescription_uploads,
  ({ one }) => ({
    user: one(profiles, {
      fields: [prescription_uploads.user_id],
      references: [profiles.id],
    }),
    order_item: one(order_items, {
      fields: [prescription_uploads.order_item_id],
      references: [order_items.id],
    }),
  })
);
