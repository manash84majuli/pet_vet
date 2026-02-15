-- ============================================================================
-- Pet & Vet Portal - Database Schema with Row-Level Security (RLS)
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- ENUMS
-- ============================================================================

CREATE TYPE user_role AS ENUM ('customer', 'vet', 'admin', 'store_manager');
CREATE TYPE appointment_status AS ENUM ('pending', 'confirmed', 'completed', 'cancelled');
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed');
CREATE TYPE order_status AS ENUM ('pending', 'packed', 'shipped', 'delivered', 'cancelled');
CREATE TYPE pos_order_type AS ENUM ('retail', 'clinic');
CREATE TYPE pos_order_status AS ENUM ('completed', 'cancelled');
CREATE TYPE pos_payment_method AS ENUM ('cash', 'card');
CREATE TYPE gender_enum AS ENUM ('male', 'female', 'other');

-- ============================================================================
-- TABLES
-- ============================================================================

-- PROFILES TABLE
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT auth.uid(),
  role user_role NOT NULL DEFAULT 'customer',
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL UNIQUE,
  city VARCHAR(100),
  state VARCHAR(100),
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT phone_format CHECK (phone ~ '^\+?[1-9]\d{1,14}$')
);

-- VETS TABLE (extends profiles)
CREATE TABLE vets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  license_number VARCHAR(100) NOT NULL UNIQUE,
  clinic_name VARCHAR(255) NOT NULL,
  address TEXT NOT NULL,
  consultation_fee_inr INT NOT NULL CHECK (consultation_fee_inr > 0),
  specialization VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- PETS TABLE
CREATE TABLE pets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  species VARCHAR(50) NOT NULL,
  breed VARCHAR(100),
  age_years DECIMAL(3, 1) CHECK (age_years >= 0),
  gender gender_enum,
  weight_kg DECIMAL(5, 2) CHECK (weight_kg > 0),
  photo_url TEXT,
  medical_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- PRODUCTS TABLE
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  price_inr INT NOT NULL CHECK (price_inr > 0),
  stock INT NOT NULL DEFAULT 0 CHECK (stock >= 0),
  requires_prescription BOOLEAN DEFAULT false,
  image_url TEXT,
  category VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- SERVICES TABLE
CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price_inr INT NOT NULL CHECK (price_inr > 0),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- APPOINTMENTS TABLE
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  vet_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  appointment_time TIMESTAMPTZ NOT NULL,
  status appointment_status DEFAULT 'pending',
  razorpay_order_id TEXT,
  payment_status payment_status DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_vet_slot UNIQUE (vet_id, appointment_time),
  CONSTRAINT valid_vet_role CHECK (
    (SELECT role FROM profiles WHERE id = vet_id) = 'vet'
  ),
  CONSTRAINT appointment_in_future CHECK (appointment_time > now())
);

-- ORDERS TABLE
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  total_amount_inr INT NOT NULL CHECK (total_amount_inr > 0),
  razorpay_order_id TEXT UNIQUE,
  order_status order_status DEFAULT 'pending',
  payment_status payment_status DEFAULT 'pending',
  shipping_address_json JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- POS_ORDERS TABLE
CREATE TABLE pos_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_type pos_order_type NOT NULL,
  customer_name VARCHAR(255),
  customer_phone VARCHAR(20),
  total_amount_inr INT NOT NULL,
  payment_method pos_payment_method NOT NULL,
  status pos_order_status DEFAULT 'completed',
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- POS_ORDER_ITEMS TABLE
CREATE TABLE pos_order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pos_order_id UUID NOT NULL REFERENCES pos_orders(id) ON DELETE CASCADE,
  item_type VARCHAR(20) NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE RESTRICT,
  service_id UUID REFERENCES services(id) ON DELETE RESTRICT,
  quantity INT NOT NULL CHECK (quantity > 0),
  unit_price_inr INT NOT NULL CHECK (unit_price_inr > 0),
  line_total_inr INT NOT NULL CHECK (line_total_inr > 0)
);

-- ORDER_ITEMS TABLE (junction)
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity INT NOT NULL CHECK (quantity > 0),
  unit_price_at_purchase INT NOT NULL CHECK (unit_price_at_purchase > 0),
  prescription_file_path TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ORDER STATUS LOGS TABLE
CREATE TABLE order_status_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status order_status NOT NULL,
  note TEXT,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- PRESCRIPTION_UPLOADS TABLE
CREATE TABLE prescription_uploads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  order_item_id UUID REFERENCES order_items(id) ON DELETE SET NULL,
  file_path TEXT NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_size INT,
  uploaded_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_pets_owner_id ON pets(owner_id);
CREATE INDEX idx_appointments_pet_id ON appointments(pet_id);
CREATE INDEX idx_appointments_vet_id ON appointments(vet_id);
CREATE INDEX idx_appointments_appointment_time ON appointments(appointment_time);
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);
CREATE INDEX idx_order_status_logs_order_id ON order_status_logs(order_id);
CREATE INDEX idx_pos_orders_created_by ON pos_orders(created_by);
CREATE INDEX idx_pos_order_items_order_id ON pos_order_items(pos_order_id);
CREATE INDEX idx_vets_profile_id ON vets(profile_id);
CREATE INDEX idx_prescription_uploads_user_id ON prescription_uploads(user_id);
CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_profiles_role ON profiles(role);

-- ============================================================================
-- ROW-LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vets ENABLE ROW LEVEL SECURITY;
ALTER TABLE pets ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescription_uploads ENABLE ROW LEVEL SECURITY;

-- PROFILES RLS Policies
CREATE POLICY "profiles_customer_self_read"
  ON profiles FOR SELECT
  USING (auth.uid() = id OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "profiles_customer_self_insert"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_customer_self_update"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id AND role = (SELECT role FROM profiles WHERE id = auth.uid()));

CREATE POLICY "profiles_admin_all_access"
  ON profiles FOR ALL
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "profiles_public_limited_read"
  ON profiles FOR SELECT
  USING (role = 'vet')
  WITH CHECK (false);

-- VETS RLS Policies
CREATE POLICY "vets_public_read"
  ON vets FOR SELECT
  USING (is_active = true);

CREATE POLICY "vets_self_update"
  ON vets FOR UPDATE
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "vets_admin_all_access"
  ON vets FOR ALL
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- PETS RLS Policies
CREATE POLICY "pets_customer_own_read"
  ON pets FOR SELECT
  USING (owner_id = auth.uid());

CREATE POLICY "pets_vet_assigned_read"
  ON pets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM appointments
      WHERE appointments.pet_id = pets.id
        AND appointments.vet_id = auth.uid()
    )
  );

CREATE POLICY "pets_customer_own_write"
  ON pets FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "pets_customer_own_update"
  ON pets FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "pets_customer_own_delete"
  ON pets FOR DELETE
  USING (owner_id = auth.uid());

CREATE POLICY "pets_admin_all_access"
  ON pets FOR ALL
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- PRODUCTS RLS Policies (public read, admin write)
CREATE POLICY "products_public_read_active"
  ON products FOR SELECT
  USING (is_active = true);

CREATE POLICY "products_admin_insert"
  ON products FOR INSERT
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "products_admin_update"
  ON products FOR UPDATE
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "products_admin_delete"
  ON products FOR DELETE
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "products_store_manager_insert"
  ON products FOR INSERT
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'store_manager');

CREATE POLICY "products_store_manager_update"
  ON products FOR UPDATE
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'store_manager')
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'store_manager');

CREATE POLICY "products_store_manager_delete"
  ON products FOR DELETE
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'store_manager');

-- SERVICES RLS Policies (admin/store manager)
CREATE POLICY "services_admin_all_access"
  ON services FOR ALL
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "services_store_manager_read"
  ON services FOR SELECT
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'store_manager');

CREATE POLICY "services_store_manager_write"
  ON services FOR INSERT
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'store_manager');

CREATE POLICY "services_store_manager_update"
  ON services FOR UPDATE
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'store_manager')
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'store_manager');

CREATE POLICY "services_store_manager_delete"
  ON services FOR DELETE
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'store_manager');

-- APPOINTMENTS RLS Policies
CREATE POLICY "appointments_customer_own_read"
  ON appointments FOR SELECT
  USING (
    auth.uid() = (SELECT owner_id FROM pets WHERE id = appointments.pet_id)
    OR auth.uid() = vet_id
  );

CREATE POLICY "appointments_customer_own_write"
  ON appointments FOR INSERT
  WITH CHECK (
    auth.uid() = (SELECT owner_id FROM pets WHERE id = appointments.pet_id)
  );

CREATE POLICY "appointments_customer_own_update"
  ON appointments FOR UPDATE
  USING (
    auth.uid() = (SELECT owner_id FROM pets WHERE id = appointments.pet_id)
    OR auth.uid() = vet_id
  )
  WITH CHECK (
    auth.uid() = (SELECT owner_id FROM pets WHERE id = appointments.pet_id)
    OR auth.uid() = vet_id
  );

CREATE POLICY "appointments_admin_all_access"
  ON appointments FOR ALL
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- ORDERS RLS Policies
CREATE POLICY "orders_customer_own_read"
  ON orders FOR SELECT
  USING (customer_id = auth.uid());

CREATE POLICY "orders_customer_own_write"
  ON orders FOR INSERT
  WITH CHECK (customer_id = auth.uid());

CREATE POLICY "orders_customer_own_update"
  ON orders FOR UPDATE
  USING (customer_id = auth.uid())
  WITH CHECK (customer_id = auth.uid());

CREATE POLICY "orders_admin_all_access"
  ON orders FOR ALL
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "orders_store_manager_read"
  ON orders FOR SELECT
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'store_manager');

-- ORDER_ITEMS RLS Policies
CREATE POLICY "order_items_customer_own_read"
  ON order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.customer_id = auth.uid()
    )
  );

CREATE POLICY "order_items_admin_all_access"
  ON order_items FOR ALL
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "order_items_store_manager_read"
  ON order_items FOR SELECT
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'store_manager');

-- ORDER_STATUS_LOGS RLS Policies
CREATE POLICY "order_status_logs_admin_all_access"
  ON order_status_logs FOR ALL
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "order_status_logs_store_manager_read"
  ON order_status_logs FOR SELECT
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'store_manager');

CREATE POLICY "order_status_logs_store_manager_insert"
  ON order_status_logs FOR INSERT
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'store_manager');

-- POS_ORDERS RLS Policies
CREATE POLICY "pos_orders_admin_all_access"
  ON pos_orders FOR ALL
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "pos_orders_store_manager_all_access"
  ON pos_orders FOR ALL
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'store_manager');

-- POS_ORDER_ITEMS RLS Policies
CREATE POLICY "pos_order_items_admin_all_access"
  ON pos_order_items FOR ALL
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "pos_order_items_store_manager_all_access"
  ON pos_order_items FOR ALL
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'store_manager');

-- PRESCRIPTION_UPLOADS RLS Policies
CREATE POLICY "prescription_uploads_customer_own_read"
  ON prescription_uploads FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "prescription_uploads_customer_own_write"
  ON prescription_uploads FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "prescription_uploads_admin_all_access"
  ON prescription_uploads FOR ALL
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Create profile row on auth.users insert
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.raw_user_meta_data->>'full_name' IS NULL THEN
    RAISE EXCEPTION 'Full name is required';
  END IF;

  IF NEW.raw_user_meta_data->>'phone' IS NULL THEN
    RAISE EXCEPTION 'Phone is required';
  END IF;

  PERFORM set_config('request.jwt.claim.sub', NEW.id::text, true);

  INSERT INTO public.profiles (id, full_name, phone, role)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'phone',
    'customer'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update profiles.updated_at
CREATE OR REPLACE FUNCTION update_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at_trigger
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_profiles_updated_at();

-- Update vets.updated_at
CREATE OR REPLACE FUNCTION update_vets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER vets_updated_at_trigger
  BEFORE UPDATE ON vets
  FOR EACH ROW
  EXECUTE FUNCTION update_vets_updated_at();

-- Update pets.updated_at
CREATE OR REPLACE FUNCTION update_pets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER pets_updated_at_trigger
  BEFORE UPDATE ON pets
  FOR EACH ROW
  EXECUTE FUNCTION update_pets_updated_at();

-- Update products.updated_at
CREATE OR REPLACE FUNCTION update_products_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER products_updated_at_trigger
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_products_updated_at();

-- Update appointments.updated_at
CREATE OR REPLACE FUNCTION update_appointments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER appointments_updated_at_trigger
  BEFORE UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION update_appointments_updated_at();

-- Update orders.updated_at
CREATE OR REPLACE FUNCTION update_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER orders_updated_at_trigger
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_orders_updated_at();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE profiles IS 'Core user profiles - authenticated via Supabase Auth';
COMMENT ON TABLE vets IS 'Veterinarian clinic information, extends profiles with role=vet';
COMMENT ON TABLE pets IS 'Pet records owned by customers';
COMMENT ON TABLE products IS 'Pharmacy products in shop, may require prescription';
COMMENT ON TABLE appointments IS 'Vet appointment bookings, RLS ensures pet owner & vet can see';
COMMENT ON TABLE orders IS 'E-commerce orders placed through shop';
COMMENT ON TABLE order_items IS 'Individual product line items in orders';
COMMENT ON TABLE prescription_uploads IS 'Prescription file uploads for prescription-required products';

COMMENT ON CONSTRAINT unique_vet_slot ON appointments IS 'Prevent double-booking: each vet can only have one appointment per specific time';
COMMENT ON CONSTRAINT appointment_in_future ON appointments IS 'Ensure appointments are scheduled for future dates only';
