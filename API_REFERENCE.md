# 📚 API & Server Actions Reference

## Overview

This document provides complete reference for all Server Actions and API routes in the Pet & Vet Portal.

### Conventions

- All Server Actions return typed responses: `ApiResponse<T>`
- All errors include `code` field for client-side handling
- All mutations check auth first: `supabase.auth.getUser()`
- All queries are protected by Supabase RLS

---

## 🎯 Server Actions (in `actions/`)

### Appointments

#### `bookAppointment(input: BookAppointmentInput)`

**Purpose**: Book a new appointment for a pet with a vet

**Input**:
```typescript
{
  pet_id: string;           // UUID of pet owned by user
  vet_id: string;           // UUID of vet profile
  appointment_time: string; // ISO 8601 datetime
  notes?: string;           // Optional notes for vet
}
```

**Response**:
```typescript
{
  success: true;
  data: Appointment;
  message: "Appointment booked successfully";
}
```

**Errors**:
- `UNAUTHORIZED` - User not authenticated
- `NOT_FOUND` - Pet doesn't belong to user OR vet not found
- `CONFLICT` - Time slot already booked (unique constraint)
- `INTERNAL_ERROR` - Database error

**RLS Protection**: Vehicle owner can only book for their own pets. RLS enforces this.

**Call from Client**:
```typescript
"use client";
import { bookAppointment } from '@/actions/appointments';
import { useTransition } from 'react';

export function MyComponent() {
  const [isPending, startTransition] = useTransition();

  const handleBook = () => {
    startTransition(async () => {
      const result = await bookAppointment({
        pet_id: petId,
        vet_id: vetId,
        appointment_time: new Date().toISOString(),
        notes: 'optional'
      });

      if (result.success) {
        console.log('Booked:', result.data.id);
      } else {
        console.error(result.error);
      }
    });
  };

  return <button onClick={handleBook}>{isPending ? 'Loading...' : 'Book'}</button>;
}
```

---

#### `cancelAppointment(appointmentId: string)`

**Purpose**: Cancel an existing appointment

**Input**: Appointment UUID

**Response**:
```typescript
{
  success: true;
  data: Appointment; // Updated with status='cancelled'
  message: "Appointment cancelled";
}
```

**Errors**:
- `UNAUTHORIZED` - User is not pet owner or vet
- `NOT_FOUND` - Appointment doesn't exist
- `INVALID_STATE` - Cannot cancel completed/cancelled appointment
- `INTERNAL_ERROR` - Database error

**Authorization**: Pet owner OR assigned vet can cancel

---

#### `confirmAppointment(appointmentId: string)`

**Purpose**: Vet confirms appointment after payment received

**Input**: Appointment UUID

**Response**:
```typescript
{
  success: true;
  data: Appointment; // status='confirmed', payment_status='paid'
  message: "Appointment confirmed";
}
```

**Errors**:
- `UNAUTHORIZED` - Only assigned vet can confirm
- `NOT_FOUND` - Appointment not found
- `INTERNAL_ERROR` - Database error

**Authorization**: Only the assigned vet

---

#### `getAvailableSlots(vet_id: string, date: string)`

**Purpose**: Fetch available 30-minute time slots for a vet on a given date

**Input**:
- `vet_id`: Vet profile UUID
- `date`: String in format "YYYY-MM-DD"

**Response**:
```typescript
{
  success: true;
  data: string[]; // Array of ISO 8601 datetimes
}
```

**Example Response**:
```json
{
  "success": true,
  "data": [
    "2026-02-20T09:00:00Z",
    "2026-02-20T09:30:00Z",
    "2026-02-20T10:00:00Z"
  ]
}
```

**Slot Logic**:
- Created from 9 AM to 6 PM
- 30-minute intervals
- Excludes already booked slots
- Available 1-30 days in future

---

### Payments

#### `createAppointmentRazorpayOrder(appointmentId: string, vetId: string)`

**Purpose**: Create a Razorpay order for appointment payment

**Input**:
- `appointmentId`: UUID of appointment
- `vetId`: UUID of vet profile

**Response**:
```typescript
{
  success: true;
  data: RazorpayOrder; // From Razorpay API
  message: "Razorpay order created successfully";
}
```

**RazorpayOrder Structure**:
```typescript
{
  id: string;              // order_xxx
  entity: "order";
  amount: number;          // In paise (₹10 = 1000 paise)
  amount_paid: number;
  amount_due: number;
  currency: "INR";
  receipt: string;
  status: "created"|"issued"|"attempted"|"paid"|"cancelled"|"expired";
  attempts: number;
  notes: {
    appointment_id: string;
    pet_id: string;
    vet_id: string;
    customer_id: string;
  };
  created_at: number; // Unix timestamp
}
```

**Errors**:
- `UNAUTHORIZED` - User not authenticated
- `NOT_FOUND` - Appointment or vet not found
- `UNAUTHORIZED` - User is not pet owner
- `PAYMENT_PROVIDER_ERROR` - Razorpay API error
- `INTERNAL_ERROR` - Database error

**Server-Side Security**:
- Validates user owns the pet
- Validates vet exists
- Fetches consultation fee from database
- Never exposes private key to client

**Client Usage**:
```typescript
const result = await createAppointmentRazorpayOrder(appointmentId, vetId);

if (result.success) {
  const razorpayOptions = {
    key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    order_id: result.data.id,
    amount: result.data.amount, // in paise
    name: "Pet & Vet Portal",
    description: "Appointment Booking",
    handler: async (response) => {
      // Verify payment on server
      await verifyPayment(response);
    }
  };

  const razorpay = new Razorpay(razorpayOptions);
  razorpay.open();
}
```

---

#### `createOrderRazorpayOrder(orderId: string)`

**Purpose**: Create a Razorpay order for product purchase

**Input**: Order UUID

**Response**: Same as appointment version (RazorpayOrder)

**Errors**: Same error codes

---

#### `verifyRazorpayPayment(input: RazorpayPaymentPayload)`

**Purpose**: Verify Razorpay signature and update appointment/order payment status

**Input**:
```typescript
{
  razorpay_order_id: string;    // order_xxx from Razorpay
  razorpay_payment_id: string;  // pay_xxx from Razorpay
  razorpay_signature: string;   // Signature from Razorpay
  entity_id: string;            // appointment_id or order_id
  entity_type: "appointment"|"order"; // Which entity to update
}
```

**Response**:
```typescript
{
  success: true;
  data: { verified: true };
  message: "Payment verified successfully";
}
```

**Errors**:
- `INVALID_SIGNATURE` - Signature verification failed (FRAUD ALERT)
- `INTERNAL_ERROR` - Database error

**Security**:
- ✅ Signature verified using RAZORPAY_KEY_SECRET
- ✅ HMAC-SHA256 algorithm
- ✅ Private key never exposed to client
- ✅ Server always verifies before updating DB

**Client-Side Call** (from Razorpay callback):
```typescript
const response = {
  razorpay_order_id: "order_7eDmmW9hbqnqvj",
  razorpay_payment_id: "pay_7eEaFutzFYvU1z",
  razorpay_signature: "9ef4dffbfd84f1318f6..."
};

const result = await fetch('/api/payment/verify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    ...response,
    entity_id: appointmentId,
    entity_type: 'appointment'
  })
});
```

---

#### `failPayment(entity_id: string, entity_type: 'appointment'|'order')`

**Purpose**: Mark payment as failed for retry

**Input**:
- `entity_id`: appointment_id or order_id
- `entity_type`: Which table to update

**Response**:
```typescript
{
  success: true;
  data: null;
  message: "Payment marked as failed";
}
```

**Use Case**: User closes payment modal or payment times out

---

### Cart & Orders

#### `createOrder(input: CreateOrderInput)`

**Purpose**: Create an order from cart items

**Input**:
```typescript
{
  items: [
    {
      product_id: string;
      quantity: number;
      prescription_file_path?: string; // Only if product requires prescription
    }
  ];
  shipping_address: {
    street: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
}
```

**Response**:
```typescript
{
  success: true;
  data: Order; // Created order
  message: "Order created successfully";
}
```

**Order Object**:
```typescript
{
  id: string;
  customer_id: string;
  total_amount_inr: number;
  razorpay_order_id: null; // Filled after payment
  payment_status: "pending"; // Until payment verified
  shipping_address_json: ShippingAddress;
  created_at: string; // ISO 8601
  updated_at: string;
}
```

**Validation**:
- ✅ All products exist and are active
- ✅ Stock available for all items
- ✅ Prescription required items have file_path
- ✅ Shipping address complete
- ✅ Calculates total from product prices + quantity

**Stock Update**:
Automatically decrements product stock after order creation

**Errors**:
- `INVALID_INPUT` - Invalid shipping address
- `NOT_FOUND` - Product doesn't exist
- `PRODUCT_UNAVAILABLE` - Product inactive
- `OUT_OF_STOCK` - Insufficient quantity
- `PRESCRIPTION_REQUIRED` - Missing prescription file
- `UNAUTHORIZED` - User not authenticated
- `INTERNAL_ERROR` - Database error

---

#### `uploadPrescription(file: FormData, product_id?: string)`

**Purpose**: Upload prescription document to Supabase Storage

**Input**:
- FormData with key "file"
- Types: PDF, JPEG, PNG, WebP
- Max size: 5 MB

**Response**:
```typescript
{
  success: true;
  data: {
    file_path: "user_uuid/12345-filename.pdf",
    file_name: "filename.pdf"
  };
  message: "Prescription uploaded successfully";
}
```

**Errors**:
- `INVALID_INPUT` - File missing
- `FILE_TOO_LARGE` - Exceeds 5 MB
- `INVALID_FILE_TYPE` - Not PDF or image
- `STORAGE_ERROR` - Supabase upload failed
- `UNAUTHORIZED` - User not authenticated
- `INTERNAL_ERROR` - Database error

**Storage Structure**:
```
prescriptions/
└── {user_uuid}/
    └── {timestamp}-{filename}
```

**RLS Protection**: Users can only upload to their own folder

**Call Pattern**:
```typescript
const formData = new FormData();
formData.append('file', prescriptionFile);

const result = await uploadPrescription(formData);

if (result.success) {
  // Use result.data.file_path in cart item
  addToCart(product, quantity, result.data.file_path);
}
```

---

#### `getPrescriptionUrl(filePath: string)`

**Purpose**: Get signed public URL for prescription file

**Input**: File path from uploadPrescription response

**Response**:
```typescript
{
  success: true;
  data: "https://...supabase.co/storage/.../..."
}
```

**URL Valid For**: 1 hour

**Use Case**: Display prescription preview before checkout

---

#### `getUserOrders()`

**Purpose**: Fetch all orders for authenticated user

**Input**: None (uses auth.uid())

**Response**:
```typescript
{
  success: true;
  data: Order[]; // Sorted by created_at DESC
}
```

**RLS Protection**: Users can only see their own orders

---

## 🌐 API Routes

### POST `/api/payment/verify`

**Purpose**: Verify Razorpay payment signature (called from client)

**Request Body**:
```typescript
{
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  entity_id: string;
  entity_type: "appointment" | "order";
}
```

**Response**:
```typescript
{
  success: true;
  data: { verified: true, entity_type: "appointment" };
  message: "Appointment payment verified successfully";
}
```

**Errors**:
```typescript
{
  success: false;
  error: "Payment signature verification failed - possible fraud attempt";
  code: "INVALID_SIGNATURE";
}
```

**HTTP Status Codes**:
- `200` - Signature valid, payment updated
- `400` - Missing fields
- `401` - Signature invalid
- `404` - Entity not found
- `500` - Internal error

**Security**:
- ✅ HMAC-SHA256 verification
- ✅ Uses RAZORPAY_KEY_SECRET from environment
- ✅ Never trusts client-provided amount
- ✅ Logs failed signatures for monitoring

---

## 💾 Type Definitions

### ApiResponse<T>

All responses follow this structure:

```typescript
type ApiResponse<T> =
  | {
      success: true;
      data: T;
      message?: string;
    }
  | {
      success: false;
      error: string;
      code?: string;
      details?: Record<string, unknown>;
    };
```

### Error Codes

| Code | Meaning | Retry? |
|------|---------|--------|
| UNAUTHORIZED | Auth failed | No |
| NOT_FOUND | Resource missing | No |
| CONFLICT | Unique constraint | No |
| INVALID_INPUT | Bad data | No |
| INVALID_STATE | Cannot perform action | No |
| INVALID_SIGNATURE | Payment fraud | No |
| OUT_OF_STOCK | Insufficient stock | Wait & retry |
| PRODUCT_UNAVAILABLE | Product offline | No |
| PRESCRIPTION_REQUIRED | Missing document | No |
| PAYMENT_PROVIDER_ERROR | Razorpay issue | Yes (with backoff) |
| STORAGE_ERROR | Supabase issue | Yes (with backoff) |
| INTERNAL_ERROR | Server error | Yes (with backoff) |

---

## 🔄 Common Workflows

### Book Appointment + Payment

```typescript
// 1. Book appointment
const bookResult = await bookAppointment({
  pet_id: petId,
  vet_id: vetId,
  appointment_time: dateTime,
  notes: 'optional'
});

if (!bookResult.success) {
  showError(bookResult.error);
  return;
}

const appointmentId = bookResult.data.id;

// 2. Create Razorpay order
const paymentResult = await createAppointmentRazorpayOrder(
  appointmentId,
  vetId
);

if (!paymentResult.success) {
  showError(paymentResult.error);
  // Consider cancelling appointment
  await cancelAppointment(appointmentId);
  return;
}

// 3. Open Razorpay checkout
const razorpay = new Razorpay({
  key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
  order_id: paymentResult.data.id,
  handler: async (response) => {
    // 4. Verify signature
    const verifyResult = await fetch('/api/payment/verify', {
      method: 'POST',
      body: JSON.stringify({
        ...response,
        entity_id: appointmentId,
        entity_type: 'appointment'
      })
    });

    if (verifyResult.ok) {
      // 5. Success!
      showSuccess('Appointment booked and paid');
      navigateTo(`/appointments/${appointmentId}`);
    } else {
      showError('Payment verification failed');
    }
  }
});

razorpay.open();
```

### Buy Products with Prescription

```typescript
// 1. Upload prescription
const uploadResult = await uploadPrescription(formData);
if (!uploadResult.success) return;

const prescriptionPath = uploadResult.data.file_path;

// 2. Add to cart
useCartStore.getState().addToCart(product, 2, prescriptionPath);

// 3. Checkout
const orderResult = await createOrder({
  items: cart.items.map(item => ({
    product_id: item.product.id,
    quantity: item.quantity,
    prescription_file_path: item.prescription_file_path
  })),
  shipping_address: {
    street: '123 Main St',
    city: 'Delhi',
    state: 'Delhi',
    postal_code: '110001',
    country: 'India'
  }
});

if (!orderResult.success) return;

// 4. Create payment order
const paymentResult = await createOrderRazorpayOrder(orderResult.data.id);

// 5. Continue with Razorpay checkout...
```

---

## 📱 Client-Side Patterns

### useTransition for Optimistic Updates

```typescript
"use client";

import { useTransition } from "react";
import { bookAppointment } from "@/actions/appointments";

export function BookButton({ appointmentData }) {
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    startTransition(async () => {
      const result = await bookAppointment(appointmentData);
      if (!result.success) {
        // Show error
        console.error(result.error);
      }
      // UI auto-revalidates via revalidatePath
    });
  };

  return (
    <button disabled={isPending}>
      {isPending ? "Booking..." : "Book Appointment"}
    </button>
  );
}
```

### Error Handling Pattern

```typescript
if (!result.success) {
  // Handle specific errors
  switch (result.code) {
    case "UNAUTHORIZED":
      navigateToLogin();
      break;
    case "CONFLICT":
      showMessage("Time slot already booked");
      break;
    case "OUT_OF_STOCK":
      showMessage(result.error);
      break;
    default:
      showGenericError("Something went wrong");
  }
}
```

---

## 🔍 Debugging

### Verify Server Action Executed

```typescript
// In server action
console.info("[ACTION_NAME] Input:", input);
console.info("[ACTION_NAME] User:", user.id);
console.info("[ACTION_NAME] Result:", result);
```

### Check RLS Policy

```sql
-- In Supabase SQL Editor
SELECT
  schemaname,
  tablename,
  relrowsecurity
FROM pg_class pc
JOIN pg_tables pt ON pc.relname = pt.tablename
WHERE pt.schemaname = 'public'
ORDER BY tablename;
```

### Test Razorpay Signature

```bash
# In Node.js REPL or script
const crypto = require('crypto');
const secret = 'your_secret_key';
const message = 'order_xxx|pay_xxx';
const expectedSignature = crypto
  .createHmac('sha256', secret)
  .update(message)
  .digest('hex');

console.log(expectedSignature === receivedSignature);
```

---

**Reference complete! For implementation examples, check component files and app/ directory.**
