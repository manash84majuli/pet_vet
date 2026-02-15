# 🚀 QUICK START CHECKLIST

## Pre-Development Setup (30 mins)

- [ ] Clone repository
- [ ] Copy `.env.example` to `.env.local`
- [ ] Get Supabase URL & keys from https://supabase.com
- [ ] Get Razorpay API keys from https://dashboard.razorpay.com
- [ ] Add all keys to `.env.local`
- [ ] Run `npm install`
- [ ] Run `npm run db:push` to deploy schema

## First Run (5 mins)

```bash
npm run dev
# Open http://localhost:3000
```

## Verify Setup

- [ ] Homepage loads without errors
- [ ] Browser console has no errors
- [ ] All icons render (Lucide React)
- [ ] Bottom navigation visible on mobile (DevTools)
- [ ] Tailwind CSS colors working (orange primary, emerald accent)

## Database Verification (5 mins)

```bash
# Open Drizzle Studio
npm run db:studio
# Verify all 8 tables exist:
# - profiles
# - vets
# - pets
# - products
# - appointments
# - orders
# - order_items
# - prescription_uploads
```

## Supabase Configuration (10 mins)

1. **Storage Buckets**
   - [ ] Create `prescriptions` bucket (private)
   - [ ] Create `pet-photos` bucket (public)

2. **RLS Policies for prescriptions**
   - [ ] Set upload policy for users
   - [ ] Set read policy for users

3. **Auth Setup**
   - [ ] Enable Email auth (or your preferred method)
   - [ ] Copy Auth URL to `.env.local`

## Core Features to Test

### Authentication
- [ ] Signup creates user in `profiles` table
- [ ] Login works
- [ ] Logout clears session

### Appointments
- [ ] Can fetch available vets
- [ ] Can book appointment (server action)
- [ ] Can fetch available slots
- [ ] Cannot double-book same vet-time combo
- [ ] RLS prevents seeing others' appointments

### Products & Cart
- [ ] Products load from database
- [ ] Can add to cart (localStorage persists)
- [ ] Cart updates total price
- [ ] Cannot add out-of-stock products
- [ ] Prescription-required products enforce upload

### Payments
- [ ] Can create Razorpay order
- [ ] Payment signature verification works
- [ ] Order status updates after payment
- [ ] Failed payment is marked correctly

## Environment Variables Checklist

```env
# MUST HAVE
✓ NEXT_PUBLIC_SUPABASE_URL
✓ NEXT_PUBLIC_SUPABASE_ANON_KEY
✓ SUPABASE_SERVICE_ROLE_KEY
✓ DATABASE_URL
✓ NEXT_PUBLIC_RAZORPAY_KEY_ID
✓ RAZORPAY_KEY_SECRET

# OPTIONAL
- NEXT_PUBLIC_APP_URL (for SSR)
- NEXT_PUBLIC_GA_ID (analytics)
```

## PWA Testing

- [ ] Manifest.json loads (Chrome DevTools → Applications)
- [ ] Service Worker installs (DevTools → Application)
- [ ] App can be installed (Android auto-prompt)
- [ ] Homepage works offline
- [ ] Product list cached
- [ ] Cart persists offline

## Frontend Component Usage

### BottomNav
```tsx
import { BottomNav } from '@/components/BottomNav';

// Auto-added in root layout
// No props needed - uses usePathname() internally
<BottomNav />
```

### ProductCard
```tsx
import { ProductCard } from '@/components/ProductCard';

<ProductCard product={product} />
// Handles:
// - Stock display
// - Prescription upload
// - Add to cart
// - All with error handling
```

### BookingCalendar
```tsx
import { BookingCalendar } from '@/components/BookingCalendar';

<BookingCalendar
  pet={pet}
  vet={vet}
  onSuccess={(appointmentId) => {
    // Navigate to payment
  }}
/>
```

## Server Actions Usage

### Appointments
```typescript
import { bookAppointment, cancelAppointment } from '@/actions/appointments';

const result = await bookAppointment({
  pet_id: 'xxx',
  vet_id: 'yyy',
  appointment_time: '2026-02-20T14:30:00Z',
  notes: 'optional'
});

if (result.success) {
  // result.data is Appointment
}
```

### Payments
```typescript
import { createAppointmentRazorpayOrder } from '@/actions/payments';

const result = await createAppointmentRazorpayOrder(appointmentId, vetId);

if (result.success) {
  // result.data is RazorpayOrder
  // Use this ID with Razorpay checkout
}
```

### Cart & Orders
```typescript
import { createOrder, uploadPrescription } from '@/actions/cart';

const formData = new FormData();
formData.append('file', prescriptionFile);

const uploadResult = await uploadPrescription(formData);
// Returns: { file_path: 'string' }

const orderResult = await createOrder({
  items: [
    {
      product_id: 'xxx',
      quantity: 2,
      prescription_file_path: uploadResult.file_path
    }
  ],
  shipping_address: { ... }
});
```

## Zustand Cart Store

```typescript
import { useCartStore } from '@/lib/hooks/useCart';

const { items, total_amount_inr, addToCart, removeFromCart } = useCartStore();

// Add item
addToCart(product, quantity, prescriptionPath);

// Remove item
removeFromCart(productId);

// Get total
const total = useCartStore((state) => state.total_amount_inr);
```

## Type Safety Checklist

- [ ] No `any` types in codebase
- [ ] All API responses typed with `ApiResponse<T>`
- [ ] Server Actions return `{ success, data, error, code }`
- [ ] Components accept typed props
- [ ] Database queries return typed results
- [ ] env vars validated at runtime

## Performance Optimizations

- [ ] Images use Next.js Image component
- [ ] Dynamic imports for large components
- [ ] Supabase responses cached with SWR/React Query (future)
- [ ] Bottom nav memoized (no re-renders on nav change)
- [ ] Products paginated (50 per page recommended)

## Security Checklist

- [ ] No credentials in .env.local (add to .gitignore)
- [ ] Razorpay signature verified server-side
- [ ] RLS policies enabled on all tables
- [ ] Service role key never used in client code
- [ ] Prescription URLs use signed links (1 hour expiry)
- [ ] XSS prevention via React dangerouslySetInnerHTML
- [ ] CSRF protection via SameSite cookies (built-in)

## Deployment Preparation

- [ ] Remove `console.log` debugging statements
- [ ] Set production environment variables in Vercel
- [ ] Run `npm run build` locally (verify no errors)
- [ ] Test payment with Razorpay sandbox mode
- [ ] Verify RLS policies work in production
- [ ] Test PWA manifest in production
- [ ] Add production domain to Supabase CORS
- [ ] Monitor errors via Vercel Logs

## Useful Commands

```bash
# Development
npm run dev              # Start dev server
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Run ESLint

# Database
npm run db:generate     # Generate migration
npm run db:migrate      # Apply migration
npm run db:push         # Auto-migration (dev only)
npm run db:studio       # Open Drizzle Studio

# Cleanup
npm run clean           # Remove .next, dist, etc
```

## IDE Extensions Recommended

- [Tailwind CSS IntelliSense](https://marketplace.visualstudio.com/items?itemName=bradlc.vscode-tailwindcss)
- [Drizzle ORM](https://marketplace.visualstudio.com/items?itemName=Drizzle.drizzle-orm)
- [TypeScript Vue Plugin](https://marketplace.visualstudio.com/items?itemName=Vue.vscode-typescript-vue-plugin)
- [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)
- [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)

---

**Time to completion: ~1 hour from zero to production-ready app**

After setup, read `README.md` for detailed documentation.
