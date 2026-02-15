🚀 The "Pet & Vet Portal" – Ultimate Architect & Codegen Prompt (v2 – 10/10 edition)
You are a Principal Full-Stack Engineer & Software Architect with 12+ years of experience building production SaaS products. You write clean, type-safe, maintainable code following modern best practices.
Project: Build the core foundation of a high-performance Pet & Vet Shop + Clinic Portal
Deployment target: Vercel
Must be a installable Progressive Web App (PWA)
Primary audience: Pet owners and veterinary clinics in India
Fixed Tech Stack (do not deviate unless explicitly asked):

Framework: Next.js 14+ (App Router, Server Actions, React Server Components)
Styling: Tailwind CSS 3.4+ + shadcn/ui (latest) + Lucide React icons
Database & Auth: Supabase (PostgreSQL + Auth + Storage + Edge Functions)
ORM: Drizzle ORM (with postgres driver)
Payments: Razorpay (India) – server-side order creation + webhook + signature verification
State management (client): Zustand (minimal & lightweight)
Calendar: react-day-picker v9+
PWA: @ducanh2912/next-pwa (or next-pwa if still maintained – prefer the maintained fork)
TypeScript: strict mode, no any, strong interfaces / types

Must-have architectural decisions (enforce these):

Use Server Actions for all mutations and most queries (RSC-friendly)
Use Route Handlers only when webhooks or public APIs are needed (e.g. Razorpay webhook)
Implement optimistic updates + useTransition for booking & cart actions
Use Drizzle prepared statements + type-safe queries
Enable Supabase RLS on every table – never trust client-side filtering
Follow mobile-first responsive design (Tailwind)

Core Domain Entities & Required Fields

profiles
id (uuid, auth.uid())
role (enum: 'customer', 'vet', 'admin')
full_name, phone, city, state
created_at

pets
id (uuid)
owner_id (→ profiles)
name, species, breed, age_years, gender, weight_kg
photo_url (Supabase Storage)
created_at

vets (optional extension of profiles – or separate if preferred)
profile_id
license_number, clinic_name, address, consultation_fee

appointments
id (uuid)
pet_id
vet_id (→ profiles where role='vet')
appointment_time (timestamptz)
status (enum: pending, confirmed, completed, cancelled)
razorpay_order_id (text, nullable)
payment_status (enum: pending, paid, failed)
notes (text)

products
id (uuid)
name, slug, description, price_inr, stock
requires_prescription (boolean)
image_url

orders
id (uuid)
customer_id (→ profiles)
total_amount_inr
razorpay_order_id
payment_status (enum: pending, paid, failed)
shipping_address_json (jsonb)
created_at

order_items
order_id
product_id
quantity
unit_price_at_purchase


Critical Security Requirements (must include in response)
Write complete SQL for:

All table creation (with proper constraints, indexes, unique(vet_id, appointment_time))
All RLS policies with clear names, e.g.:
Customers can only read/update their own profile, pets, orders, appointments
Vets can read pets & appointments where they are the assigned vet
Vets cannot see other vets' schedules or unrelated customers
No one can read payment-sensitive fields except through controlled flows


Non-functional Requirements to enforce

PWA: offline-capable homepage + product list + cart (stale-while-revalidate strategy)
Colors: primary #f97316 (orange-500), accent #10b981 (emerald)
Bottom nav on mobile: Home / Shop / Appointments / Profile (Lucide icons)
Cart: Zustand store + persist middleware (localStorage)
Prescription flow: if product.requires_prescription → force upload → store in Supabase Storage → link file path before allowing add-to-cart

Requested Deliverables – structured folder layout
Please output only the following files/folders with complete, ready-to-copy code:
text/schema/
  00-schema.sql               ← full Drizzle-compatible SQL + RLS
  drizzle.config.ts

/lib/
  supabase.ts                 ← typed createClient
  drizzle.ts                  ← db instance
  types.ts                    ← shared types (Profile, Pet, Appointment, etc.)

/actions/
  appointments.ts             ← bookAppointment (optimistic), cancelAppointment
  payments.ts                 ← createRazorpayOrder (Server Action)
  cart.ts                     ← addToCart, removeFromCart (Server Actions)

/app/api/payment/
  verify/route.ts             ← POST – verify razorpay_signature → update status
  webhook/route.ts            ← (optional bonus – if time allows)

/components/
  BottomNav.tsx               ← mobile bottom navigation
  ProductCard.tsx             ← with prescription upload logic
  BookingCalendar.tsx         ← react-day-picker + available slots fetch + conflict prevention

/public/
  manifest.json

/next.config.mjs              ← PWA config

/components/ui/calendar.tsx   ← (if customizing shadcn calendar)

/README.md                    ← quick setup instructions (env vars, supabase setup, razorpay keys)
Response Style & Constraints

Use modern TypeScript (satisfies, branded types if helpful)
Prefer composition over inheritance
Comment tricky parts (RLS, payment verification, optimistic logic)
Keep files reasonably sized (< 250–300 lines when possible)
Do not implement full pages — focus on foundation + key logic
If something is complex (e.g. webhook), provide skeleton + critical security part

Now, acting as the architect described above, please generate the complete codebase following exactly this structure and these requirements.