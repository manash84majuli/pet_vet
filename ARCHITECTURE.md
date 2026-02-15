# 🏗️ Architecture & Design Decisions

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT (Browser/Mobile)                   │
│  ┌────────────────────────────────────────────────────────┐ │
│  │          React Components (App Router)                  │ │
│  │  ┌──────────────────────────────────────────────────┐  │ │
│  │  │ BottomNav, ProductCard, BookingCalendar         │  │ │
│  │  │ useTransition for optimistic updates            │  │ │
│  │  └──────────────────────────────────────────────────┘  │ │
│  │                                                         │ │
│  │  ┌──────────────────────────────────────────────────┐  │ │
│  │  │ Zustand Cart Store (localStorage persistance)   │  │ │
│  │  └──────────────────────────────────────────────────┘  │ │
│  │                                                         │ │
│  │  ┌──────────────────────────────────────────────────┐  │ │
│  │  │ PWA (Service Worker, Offline Caching)           │  │ │
│  │  └──────────────────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────────┘ │
│                           ↕                                  │
│          Network (HTTPS) / Service Worker Cache             │
└─────────────────────────────────────────────────────────────┘
                              ↓
         ┌────────────────────────────────────────────┐
         │        NEXT.JS SERVER (Vercel)              │
         │  App Router with Server Actions             │
         │  ┌──────────────────────────────────────┐  │
         │  │ /actions                              │  │
         │  │ - appointments.ts                     │  │
         │  │ - payments.ts                         │  │
         │  │ - cart.ts                             │  │
         │  └──────────────────────────────────────┘  │
         │  ┌──────────────────────────────────────┐  │
         │  │ /app/api/payment/verify               │  │
         │  │ - Signature verification              │  │
         │  └──────────────────────────────────────┘  │
         └────────────────────────────────────────────┘
                  ↓              ↓              ↓
         ┌────────────┐  ┌──────────────┐  ┌───────────┐
         │ Supabase   │  │ Razorpay     │  │ Storage   │
         │ PostgreSQL │  │ Payments API │  │ (S3-like) │
         │ + Auth     │  │              │  │           │
         │ + RLS      │  │              │  │ Bucket:   │
         └────────────┘  │              │  │ - rxs     │
                         │              │  │ - photos  │
              ↓          │              │  └───────────┘
         ┌─────────────┐ │              │
         │ Drizzle ORM │ │              │
         │ (type-safe) │ │              │
         └─────────────┘ └──────────────┘
```

---

## Data Flow Diagrams

### 1. Appointment Booking Flow

```
User selects pet & vet
         ↓
Form validation (client)
         ↓
bookAppointment() Server Action
         ↓
Check auth user
         ↓
Verify pet ownership (RLS will enforce too)
         ↓
Check vet exists
         ↓
Check time slot not booked
         ↓
INSERT into appointments table
    (RLS enforces pet visibility)
         ↓
revalidatePath() clears cache
         ↓
Success response + optimistic UI update
         ↓
User proceeds to payment
```

### 2. Payment Verification Flow

```
User completes Razorpay checkout
         ↓
Client receives payment response:
  - razorpay_order_id
  - razorpay_payment_id
  - razorpay_signature
         ↓
Client calls POST /api/payment/verify
         ↓
Server validates signature with HMAC-SHA256
    Using RAZORPAY_KEY_SECRET from env
         ↓
Signature valid?
  NO  → Return 401 error (FRAUD ALERT)
  YES → Continue
         ↓
UPDATE appointment/order with:
  - payment_status = 'paid'
  - razorpay_order_id = order_id
         ↓
Return success to client
         ↓
Client shows confirmation
         ↓
Vet can confirm appointment
```

### 3. Prescription Upload + Order Flow

```
User selects prescription-required product
         ↓
Show upload form
         ↓
User selects PDF/image (<5MB)
         ↓
Client validates file
         ↓
uploadPrescription() Server Action
         ↓
Validate auth
         ↓
Validate file (type, size)
         ↓
Upload to Supabase Storage at:
  /prescriptions/{user_id}/{timestamp}-{filename}
         ↓
INSERT into prescription_uploads table
         ↓
Return signed file_path
         ↓
User adds product to cart with file_path
         ↓
User proceeds to checkout
         ↓
createOrder() with items + file paths
         ↓
Validate all items (stock, prescriptions)
         ↓
Calculate total
         ↓
INSERT order + order_items
         ↓
Decrement product stock (atomic)
         ↓
Proceed to payment
```

---

## Design Decisions & Rationale

### 1. Server Actions for All Mutations ✅

**Decision**: Use "use server" functions instead of API routes for mutations

**Why**:
- RSC-friendly (can access DB directly)
- Type-safe (share types with client)
- Automatic CSRF protection
- Easier auth handling (middleware)
- Optimistic updates with useTransition

**Trade-off**: Cannot cache (always POST). Not ideal for pure read APIs with caching.

**Alternative Rejected**: Full REST API - more boilerplate, less type safety

---

### 2. Supabase RLS Over Application Logic ✅

**Decision**: Enforce security at database level, not application

**Why**:
- **Never trust client filtering**
- RLS works at row level (even if someone hacks JWT)
- Policies automatically applied to all queries
- Easier to review security (SQL in one file)
- Prevents data leaks from app bugs

**Example**:
```sql
-- Customers can only read their own pets
CREATE POLICY "customers_read_own_pets" ON pets
  FOR SELECT USING (owner_id = auth.uid());
```

Same effect anywhere (API, Server Action, Edge Function).

---

### 3. TypeScript Strict Mode + Branded Types ✅

**Decision**: No `any` types, use branded types for IDs

**Why**:
```typescript
// Without branding - easy to mix up IDs
function bookAppointment(petId: string, vetId: string) {
  // Did we pass them in the right order?
  await db.insert(...);
}

// With branding - compiler catches errors
function bookAppointment(petId: PetId, vetId: VetId) {
  // Cannot accidentally pass wrong ID type
}
```

**Benefit**: Catch bugs at compile time instead of runtime

---

### 4. Drizzle ORM for Type Safety ✅

**Decision**: Use Drizzle instead of raw SQL or Prisma

**Why**:
- Generated from TypeScript (single source of truth)
- Prepared statements (SQL injection prevention)
- Type-safe queries (no runtime surprises)
- Relations defined for eager loading
- Lightweight (~10KB vs Prisma ~100KB)

**Queries are like**:
```typescript
// Type-safe, injection-safe
const user = await db
  .select()
  .from(users)
  .where(eq(users.id, userId))
  .limit(1);
// user: User | undefined (no manual casting)
```

---

### 5. Zustand for Client State ✅

**Decision**: Zustand over Redux/Context API

**Why**:
- Minimal boilerplate (3x less code vs Redux)
- Built-in middleware (persist to localStorage)
- Works without Provider wrapping
- Type-safe (TypeScript native)
- Small bundle size (~2KB)

**Cart store examples**:
```typescript
// Add item (auto-calculates total)
cart.addToCart(product, quantity, prescriptionPath);

// Get total (computed property)
const total = cart.getTotal();

// Persisted to localStorage automatically
```

---

### 6. PWA with Service Worker ✅

**Decision**: Use @ducanh2912/next-pwa (maintained fork)

**Why**:
- Users can install on home screen
- Works offline (cached assets)
- Reduces data usage for repeat visits
- Better perceived performance
- No backend required for PWA features

**Caching Strategy**:
```
Homepage          → Offline-first (always cached)
API calls         → Network-first + 24h timeout
External resources → Stale-while-revalidate
```

---

### 7. Razorpay over Stripe ✅

**Decision**: Razorpay for India-centric payment

**Why**:
- ✅ Native UPI support (most Indian users)
- ✅ Lower fees (1% vs Stripe 3.5%)
- ✅ No foreign exchange (INR native)
- ✅ Wallets: PayTM, PhonePe, Google Pay, Amazon Pay
- ✅ Bank transfers via NETBANKING
- ✅ EMI options (0% interest)

**Stripe is better for**: Global products, multiple currencies

---

### 8. Tailwind CSS over styled-components ✅

**Decision**: Utility-first CSS with Tailwind

**Why**:
- No runtime overhead (CSS-in-JS slower)
- Smaller bundle (generated CSS only needed classes)
- Easier responsive (breakpoint prefixes: md:, lg:)
- Team consistency (shared token file)
- Good dark mode support

**Alternative**: Styled-components - runtime cost, larger bundle

---

### 9. Supabase RLS Policies Pattern ✅

**Decision**: Explicit named policies per table × operation

**Why**:
```sql
-- Clear what each policy does
CREATE POLICY "customers_read_own_orders" ON orders
  FOR SELECT USING (customer_id = auth.uid());

-- vs confusing:
CREATE POLICY "orders_policy_1" ON orders ...
```

**Policy Naming**:
- `{role}_{operation}_{resource}`
- Examples: `customers_read_own_pets`, `vets_read_appointments_assigned`

---

### 10. Server-Side Payment Verification ✅

**Decision**: Verify Razorpay signature on server always, never client

**Why**:
```typescript
// Client sends proof
const response = {
  razorpay_order_id: "order_xxx",
  razorpay_payment_id: "pay_xxx",
  razorpay_signature: "sig_xxx"
};

// Server verifies signature using private key (never on client)
const expectedSignature = crypto
  .createHmac('sha256', RAZORPAY_KEY_SECRET) // ← Private key!
  .update(`${orderId}|${paymentId}`)
  .digest('hex');

// If signatures match, payment is authentic
if (expectedSignature === receivedSignature) {
  // Safe to update DB
  await db.update(orders).set({ payment_status: 'paid' });
}
```

**Why Not Client**:
- Client cannot access RAZORPAY_KEY_SECRET (❌ exposed in JS)
- Attacker could forge signature
- Server-side is only secure option

---

## Technology Choice Matrix

| Feature | Technology | Why | Alternative |
|---------|-----------|-----|-------------|
| Framework | Next.js 14 | SSR + SSG + API routes | Remix (heavier) |
| Language | TypeScript | Type safety | JavaScript (fewer bugs) |
| Database | Supabase | Hosted PostgreSQL + Auth | Firebase (less control) |
| ORM | Drizzle | Type-safe, lightweight | Prisma (slower, heavier) |
| Auth | Supabase Auth | PostgreSQL native | Auth0 (more expensive) |
| Storage | Supabase Storage | Integrated, S3-compatible | AWS S3 (more setup) |
| Payments | Razorpay | India-first, UPI | Stripe (global) |
| State | Zustand | Minimal, lightweight | Redux (boilerplate) |
| UI | shadcn/ui + Tailwind | Customizable, consistent | Material-UI (heavy) |
| Icons | Lucide React | Modern, lightweight | Font-Awesome (larger) |
| PWA | next-pwa | Works with App Router | next-offline (unmaintained) |
| Hosting | Vercel | Optimized for Next.js | Railway, Render |

---

## Security Architecture

### Authentication Layer
```
Browser                Server               Supabase
   ↓                      ↓                     ↓
User logs in
   ↓
Supabase Auth UI
   ↓
JWT token received
   ↓
Stored in httpOnly cookie (no JS access)
   ↓
Sent with every request
   ↓
Server verifies with Supabase
   ↓
auth.uid() extracted from JWT
   ↓
Used in RLS policies
```

### Database Security
```
Client Query
   ↓
Server receives with JWT
   ↓
RLS policy checks:
  - Is user authenticated?
  - Which rows can they see?
  - Which operations allowed?
   ↓
If policy fails: 0 rows returned (not error)
   ↓
If policy passes: Only allowed rows returned
   ↓
Response to client
```

### Payment Verification
```
Client sends Razorpay response
   ↓
Server receives (public_key visible, OK)
   ↓
Server uses private_key to verify signature
   ↓
Signature matches?
  NO → Reject (fraud)
  YES → Update DB (safe)
```

---

## Performance Optimizations

### Caching Strategy
```
Homepage
├── HTML (cached via service worker)
├── CSS (bundled, cached forever via hash)
└── JS (chunked, cached forever via hash)

API Calls (Supabase)
├── First request → Network (slow)
├── Cached for 24 hours
└── Stale-while-revalidate (serve cached, update in bg)

Product Images
├── Optimized via Next.js Image
├── WebP with fallback
└── Responsive srcset
```

### Database Performance
```
Indices on:
├── Foreign keys (faster joins)
├── Status fields (WHERE appointment.status = 'pending')
├── Timestamps (sort by created_at)
└── Slugs (unique lookups)

Unique constraints:
├── (vet_id, appointment_time) → prevents double-book
└── (customer_id, order.id) → prevents duplicate orders
```

### JavaScript Bundle
```
Analyzed:
├── Next.js runtime (~100KB)
├── React (~50KB)
├── Zustand (~2KB)
├── Lucide icons (tree-shaken, only used icons)
└── Tailwind CSS (only used styles)

Total: ~150-200KB gzipped
```

---

## Scalability Considerations

### Current (MVP)
- Single Supabase project
- 1 Next.js deployment (Vercel auto-scales)
- 1 PostgreSQL instance (handles ~10K users)
- Razorpay webhook (async processing)

### When scaling to 100K users
- [ ] Add database read replicas
- [ ] Cache frequent queries (Redis)
- [ ] Implement API rate limiting
- [ ] Use CDN for images
- [ ] Queue async jobs (appointments notifications)
- [ ] Separate customer/vet search (dedicated indexes)

### When scaling to 1M users
- [ ] Multi-region deployment
- [ ] Database sharding by region
- [ ] Kafka for event streaming
- [ ] Elasticsearch for appointments search
- [ ] GraphQL with DataLoader (batch queries)

---

## Conclusion

This architecture prioritizes:

1. **Security** - RLS at database layer, signature verification
2. **Type Safety** - TypeScript strict mode, Drizzle ORM  
3. **Developer Experience** - Server Actions, minimal boilerplate
4. **Performance** - PWA caching, optimized bundles
5. **Maintainability** - Clear separation of concerns

The tech stack is proven, battle-tested, and suitable for scaling from MVP to millions of users.
