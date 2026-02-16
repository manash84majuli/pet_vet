/**
 * Shared TypeScript types for Pet & Vet Portal
 * Strict mode enforced - no `any` types
 */

export enum UserRole {
  CUSTOMER = "customer",
  VET = "vet",
  ADMIN = "admin",
  STORE_MANAGER = "store_manager",
}

export enum AppointmentStatus {
  PENDING = "pending",
  CONFIRMED = "confirmed",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
}

export enum PaymentStatus {
  PENDING = "pending",
  PAID = "paid",
  FAILED = "failed",
}

export enum OrderStatus {
  PENDING = "pending",
  PACKED = "packed",
  SHIPPED = "shipped",
  DELIVERED = "delivered",
  CANCELLED = "cancelled",
}

export enum PosOrderType {
  RETAIL = "retail",
  CLINIC = "clinic",
}

export enum PosOrderStatus {
  COMPLETED = "completed",
  CANCELLED = "cancelled",
}

export enum PosPaymentMethod {
  CASH = "cash",
  CARD = "card",
}

export enum Gender {
  MALE = "male",
  FEMALE = "female",
  OTHER = "other",
}

// ============================================================================
// USER / PROFILE TYPES
// ============================================================================

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string;
  phone: string;
  city?: string;
  state?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface VetProfile extends Profile {
  role: UserRole.VET;
}

export interface Vet {
  id: string;
  profile_id: string;
  license_number: string;
  clinic_name: string;
  address: string;
  consultation_fee_inr: number;
  specialization?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Combined vet data - useful for display
export interface VetWithProfile extends Vet {
  profile: VetProfile;
}

// ============================================================================
// PET TYPES
// ============================================================================

export interface Pet {
  id: string;
  owner_id: string;
  name: string;
  species: string;
  breed?: string;
  age_years?: number;
  gender?: Gender;
  weight_kg?: number;
  photo_url?: string;
  medical_notes?: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// APPOINTMENT TYPES
// ============================================================================

export interface Appointment {
  id: string;
  pet_id: string;
  vet_id: string;
  appointment_time: string; // ISO 8601
  status: AppointmentStatus;
  razorpay_order_id?: string;
  payment_status: PaymentStatus;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// For display purposes
export interface AppointmentWithDetails extends Appointment {
  pet: Pet;
  vet: VetWithProfile;
}

// Booking request
export interface BookAppointmentInput {
  pet_id: string;
  vet_id: string;
  appointment_time: string; // ISO 8601
  notes?: string;
}

// ============================================================================
// PRODUCT & SHOP TYPES
// ============================================================================

export interface Product {
  id: string;
  name: string;
  slug: string;
  description?: string;
  price_inr: number;
  stock: number;
  requires_prescription: boolean;
  image_url?: string;
  category?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Service {
  id: string;
  name: string;
  description?: string;
  price_inr: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// ORDER TYPES
// ============================================================================

export interface ShippingAddress {
  name: string;
  street: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}

export interface Order {
  id: string;
  customer_id: string;
  total_amount_inr: number;
  razorpay_order_id?: string;
  order_status: OrderStatus;
  payment_status: PaymentStatus;
  shipping_address_json: ShippingAddress;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price_at_purchase: number;
  prescription_file_path?: string;
  created_at: string;
}

// For display purposes
export interface OrderWithItems extends Order {
  items: OrderItemWithProduct[];
  status_logs?: OrderStatusLog[];
}

export interface OrderItemWithProduct extends OrderItem {
  product: Product;
}

export interface OrderStatusLog {
  id: string;
  order_id: string;
  status: OrderStatus;
  note?: string;
  created_by: string;
  created_at: string;
}

export interface PosOrder {
  id: string;
  order_type: PosOrderType;
  customer_name?: string;
  customer_phone?: string;
  total_amount_inr: number;
  payment_method: PosPaymentMethod;
  status: PosOrderStatus;
  created_by: string;
  created_at: string;
}

export interface PosOrderItem {
  id: string;
  pos_order_id: string;
  item_type: "product" | "service";
  product_id?: string;
  service_id?: string;
  quantity: number;
  unit_price_inr: number;
  line_total_inr: number;
}

// ============================================================================
// CART TYPES (Client-side state)
// ============================================================================

export interface CartItem {
  product: Product;
  quantity: number;
  prescription_file_path?: string; // Set if product requires prescription
}

export interface Cart {
  items: CartItem[];
  total_amount_inr: number;
}

// ============================================================================
// PRESCRIPTION TYPES
// ============================================================================

export interface PrescriptionUpload {
  id: string;
  user_id: string;
  order_item_id?: string;
  file_path: string;
  file_name: string;
  file_size?: number;
  uploaded_at: string;
}

// ============================================================================
// PAYMENT TYPES
// ============================================================================

export interface RazorpayOrder {
  id: string;
  entity: string;
  amount: number; // in lowest currency unit (paise for INR)
  amount_paid: number;
  amount_due: number;
  currency: string;
  receipt: string;
  offer_id?: string;
  status: "created" | "issued" | "attempted" | "paid" | "cancelled" | "expired";
  attempts: number;
  notes?: Record<string, string>;
  created_at: number; // Unix timestamp
}

export interface RazorpayPaymentPayload {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  code?: string;
  details?: Record<string, unknown>;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

// ============================================================================
// FORM DTOs
// ============================================================================

export interface CreateOrderInput {
  items: {
    product_id: string;
    quantity: number;
    prescription_file_path?: string;
  }[];
  shipping_address: ShippingAddress;
}

export interface CreateRazorpayOrderInput {
  order_id: string;
  customer_id: string;
  amount_inr: number;
  receipt: string;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

// Branded types for compile-time safety
export type UserId = string & { readonly __brand: "UserId" };
export type PetId = string & { readonly __brand: "PetId" };
export type AppointmentId = string & { readonly __brand: "AppointmentId" };

export const brandUserId = (id: string): UserId => id as UserId;
export const brandPetId = (id: string): PetId => id as PetId;
export const brandAppointmentId = (id: string): AppointmentId =>
  id as AppointmentId;
