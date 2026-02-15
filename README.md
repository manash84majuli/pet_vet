# Pet & Vet Portal - Full Stack Setup Guide

A high-performance Progressive Web App (PWA) for pet owners and veterinary clinics in India. Built with Next.js 14, Supabase, Drizzle ORM, and Razorpay.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm/yarn
- Supabase project (free tier available at [supabase.com](https://supabase.com))
- Razorpay Business Account (for payments)

### 1. Environment Setup

Create a `.env.local` file in the project root:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
DATABASE_URL=postgresql://postgres:password@db.xxxxx.supabase.co:5432/postgres

# Razorpay (get from https://dashboard.razorpay.com)
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_live_xxxxxxx
RAZORPAY_KEY_SECRET=your_key_secret_here

# Optional: Analytics, etc.
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 2. Install Dependencies

```bash
npm install
# or
yarn install
```

### 3. Database Setup

#### Option A: Automatic Migration (Recommended)

1. Push the schema to your Supabase database:

```bash
npm run db:push
```

This will apply the SQL schema and all RLS policies from `schema/00-schema.sql`.

#### Option B: Manual Setup

1. Log into your Supabase dashboard
2. Go to **SQL Editor**
3. Click **New Query**
4. Copy the entire contents of `schema/00-schema.sql`
5. Paste and click **Run**

#### Verify RLS is Enabled

In Supabase SQL Editor, run:

```sql
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- For each table, verify RLS:
SELECT relname, relrowsecurity FROM pg_class WHERE relname = 'profiles';
```

All should show `relrowsecurity = t`.

### 4. Supabase Storage Setup

1. Go to **Storage** in Supabase dashboard
2. Create two buckets:
   - `prescriptions` (private) - for prescription uploads
   - `pet-photos` (public) - for pet photos
3. For `prescriptions` bucket, set RLS policy in **Policies**:

```sql
-- Allow users to upload their own prescriptions
CREATE POLICY "Users can upload their own prescriptions"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'prescriptions' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow users to read their own prescriptions
CREATE POLICY "Users can read their own prescriptions"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'prescriptions' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
```

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
pet-vet-portal/
├── schema/
│   ├── 00-schema.sql          # Full database schema + RLS policies
│   └── drizzle.config.ts       # Drizzle ORM config
├── lib/
│   ├── supabase.ts             # Supabase client setup
│   ├── drizzle.ts              # Drizzle ORM instance
│   ├── schema.ts               # Drizzle schema definition
│   ├── types.ts                # Shared TypeScript types
│   ├── utils.ts                # Utility functions
│   └── hooks/
│       └── useCart.tsx         # Zustand cart store
├── actions/
│   ├── appointments.ts         # Appointment booking + cancellation
│   ├── payments.ts             # Razorpay order creation + verification
│   └── cart.ts                 # Cart + order creation + prescription upload
├── app/
│   ├── api/
│   │   └── payment/
│   │       └── verify/
│   │           └── route.ts    # Payment signature verification
│   └── layout.tsx              # Root layout with PWA setup
├── components/
│   ├── BottomNav.tsx           # Mobile bottom navigation
│   ├── ProductCard.tsx         # Product card with prescription upload
│   └── BookingCalendar.tsx     # Booking calendar with slot selection
├── public/
│   └── manifest.json           # PWA manifest
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.mjs             # PWA + Next.js config
└── README.md
```

## 🔐 Security Features

### Row-Level Security (RLS)

Every table has RLS enabled. Users can only:
- Read/update their own data
- Read public data (active products, active vets)
- Vets can see their own appointments and assigned pets

**Never trust client-side filtering** - all data access is validated by Supabase RLS.

### Payment Security

- Razorpay signatures verified on server only
- No payment details stored in database
- Optimistic updates with proper error handling
- Failed payments prevent state updates until verification

### Type Safety

- TypeScript strict mode enforced (`strict: true`)
- No `any` types allowed
- Branded types for compile-time safety
- Drizzle ORM provides type-safe queries

## 🎨 Design System

### Colors

- **Primary**: `#f97316` (orange-500) - CTAs, highlights
- **Accent**: `#10b981` (emerald-500) - Success states
- **Neutral**: Gray palette for text and borders

### Responsive Design

- Mobile-first approach (Tailwind CSS)
- Bottom navigation on mobile (hidden on tablet+)
- Touch-friendly tap targets (min 44x44px)
- Safe areas for notches/dynamic islands

### Icons

All icons from [Lucide React](https://lucide.dev)

## 💳 Payment Integration

### Razorpay Setup

1. Create account at [razorpay.com](https://razorpay.com)
2. Go to **Settings > API Keys**
3. Copy Key ID and Key Secret
4. Add to `.env.local`

### Payment Flow

1. User initiates booking/order
2. Server creates Razorpay order (via Server Action)
3. Client opens Razorpay checkout
4. User completes payment
5. Client sends proof to `/api/payment/verify`
6. Server verifies signature and updates DB
7. UI optimistically updates on success

## 📱 PWA Features

### Offline Support

The app is PWA-enabled with offline capabilities:

- **Homepage**: Available offline (cached)
- **Product list**: Cached with stale-while-revalidate
- **Cart**: Persisted in localStorage
- **Supabase API**: Network-first with timeout fallback

### Installation

- **iOS**: Share > Add to Home Screen
- **Android**: Menu > Install App (auto-prompted)
- **Desktop**: Win/Mac/Linux - browser dependent

### Web App Manifest

Configured in `public/manifest.json`:
- App name, icons, colors
- Splash screens
- Shortcuts
- Share target API (optional)

## 🗄️ Database Schema

### Core Tables

| Table | Purpose | Auth |
|-------|---------|------|
| `profiles` | Users (customer/vet/admin) | Self + admin |
| `vets` | Vet clinic details | Public (limited) |
| `pets` | Pet records | Owner + assigned vet |
| `appointments` | Bookings | Owner + vet |
| `products` | Pharmacy items | Public (active only) |
| `orders` | E-commerce orders | Customer only |
| `order_items` | Order line items | Customer only |
| `prescription_uploads` | Prescription files | User only |

### Constraints & Indexes

- **Unique slot**: `(vet_id, appointment_time, status='pending'|'confirmed')`
- **Stock check**: Never negative
- **Price positive**: All prices > 0
- **Appointment future**: Scheduled >= now
- **Indexes**: On foreign keys, status, timestamps

## 🚢 Deployment to Vercel

### Prerequisites

- Push repo to GitHub
- Configure environment variables in Vercel dashboard

### Steps

1. Go to [vercel.com](https://vercel.com)
2. Import your GitHub repository
3. Add Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `DATABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_RAZORPAY_KEY_ID`
   - `RAZORPAY_KEY_SECRET`
4. Click **Deploy**

### Post-Deploy

- PWA will auto-install when users add to home screen
- Caching strategies activate immediately
- Service worker installs on first visit

## 📊 Monitoring & Debugging

### Logs

- **Client errors**: Browser DevTools Console
- **Server errors**: Vercel Logs or terminal
- **Database errors**: Supabase Logs > SQL Editor

### Drizzle Studio

View live database:

```bash
npm run db:studio
```

Opens http://local.drizzle.studio

### Common Issues

| Issue | Solution |
|-------|----------|
| RLS denies read/write | Check auth user matches RLS policy |
| Payment verification fails | Ensure RAZORPAY_KEY_SECRET is set |
| Offline features not working | Clear cache, re-install PWA |
| Database connection timeout | Check DATABASE_URL and network |

## 🛠️ Development Workflow

### Making Schema Changes

1. Update `lib/schema.ts` (Drizzle)
2. Run `npm run db:generate` to create migration
3. Run `npm run db:migrate` to apply
4. Or use `npm run db:push` for auto-migration

### Server Actions

All mutations use Server Actions:

```typescript
// actions/myaction.ts
"use server";

export async function myAction(input: Input) {
  // Always check auth
  const { user } = await supabase.auth.getUser();
  if (!user) return { success: false };
  
  // DB operations (RLS enforced)
  const result = await db.insert(...);
  
  // Revalidate cache
  revalidatePath("/pathname");
  
  return { success: true, data: result };
}
```

### Client Components

Use `useTransition` for optimistic updates:

```typescript
"use client";

const [isPending, startTransition] = useTransition();

const handleClick = () => {
  startTransition(async () => {
    const result = await myServerAction(input);
    if (result.success) {
      // Update UI optimistically
    }
  });
};
```

## 📦 Dependencies

### Core

- **next@14+** - Framework
- **react@19** - UI library
- **typescript@5** - Type safety

### Database

- **@supabase/supabase-js** - PostgreSQL + Auth
- **drizzle-orm** - Type-safe ORM
- **pg** - PostgreSQL driver

### Styling

- **tailwindcss@3.4** - Utility CSS
- **tailwind-merge** - Class merging
- **lucide-react** - Icons
- **shadcn-ui** - Components

### State & Forms

- **zustand@4** - State management
- **react-day-picker@9** - Calendar

### PWA

- **@ducanh2912/next-pwa** - PWA support

### Payments

- **axios** - HTTP client
- **crypto** (built-in) - Signature verification

## 🤝 Contributing

### Code Style

- ESLint + Prettier (configure as needed)
- TypeScript strict mode always
- Comments for complex logic
- Meaningful variable/function names

### Testing

Create tests in `__tests__/` directories:

```bash
npm install --save-dev jest @testing-library/react
npm test
```

## 📖 API Reference

### Server Actions

#### Appointments

```typescript
bookAppointment(input: BookAppointmentInput) // Creates pending appointment
cancelAppointment(appointmentId: string) // User/vet can cancel
confirmAppointment(appointmentId: string) // Vet confirms after payment
getAvailableSlots(vet_id: string, date: string) // Fetch 30-min slots
```

#### Payments

```typescript
createAppointmentRazorpayOrder(appointmentId: string, vetId: string)
createOrderRazorpayOrder(orderId: string)
verifyRazorpayPayment(input: RazorpayPaymentPayload)
failPayment(entity_id: string, entity_type: 'appointment'|'order')
```

#### Cart & Orders

```typescript
createOrder(input: CreateOrderInput) // Validates items, creates order
uploadPrescription(file: FormData, product_id?: string)
getPrescriptionUrl(filePath: string)
getUserOrders() // Fetch user's order history
```

### API Routes

#### POST `/api/payment/verify`

Verifies Razorpay payment signature. Called after client payment completion.

**Request:**

```json
{
  "razorpay_order_id": "order_xxx",
  "razorpay_payment_id": "pay_xxx",
  "razorpay_signature": "sig_xxx",
  "entity_id": "appointment_id or order_id",
  "entity_type": "appointment" | "order"
}
```

**Response:**

```json
{
  "success": true,
  "data": { "verified": true },
  "message": "Payment verified successfully"
}
```

## 📝 License

MIT License - See LICENSE file

## 💬 Support

For issues or questions:
1. Check the [troubleshooting guide](#-monitoring--debugging)
2. Review [Supabase docs](https://supabase.com/docs)
3. Check [Drizzle docs](https://orm.drizzle.team)
4. Open an issue on GitHub

---

**Built with ❤️ for pet lovers and vets in India**
