import Link from "next/link";
import {
  Calendar,
  Heart,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Truck,
} from "lucide-react";

export default function Home() {
  return (
    <main className="page-wrapper bg-[#f8f4ef] text-slate-900">
      <section className="relative overflow-hidden hero-surface">
        <div className="absolute -top-24 right-8 w-64 h-64 rounded-full bg-[#ffd6a3] blur-3xl opacity-70" />
        <div className="absolute -bottom-20 left-8 w-72 h-72 rounded-full bg-[#9ee7d2] blur-3xl opacity-60" />

        <div className="container relative py-16 md:py-24">
          <div className="grid gap-12 lg:grid-cols-[1.15fr_0.85fr] items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-700 shadow-sm">
                <Sparkles className="h-4 w-4 text-primary" />
                Trusted by 500+ clinics
              </div>
              <h1 className="font-display text-4xl md:text-6xl leading-tight text-slate-900">
                Modern pet care, from quick booking to doorstep delivery.
              </h1>
              <p className="text-lg text-slate-600 max-w-xl">
                Book appointments, manage prescriptions, and shop trusted products in
                one place. Built for pet owners, clinics, and staff who need clarity
                fast.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/appointments"
                  className="btn-primary px-6 py-3 text-base rounded-full"
                >
                  Book a visit
                </Link>
                <Link
                  href="/shop"
                  className="btn-secondary px-6 py-3 text-base rounded-full"
                >
                  Shop essentials
                </Link>
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  Same-day slots
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-2">
                  <Truck className="h-4 w-4 text-emerald-600" />
                  2-hour delivery
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-2">
                  <ShieldCheck className="h-4 w-4 text-slate-700" />
                  Verified vets
                </span>
              </div>
            </div>

            <div className="space-y-6">
              <div className="glass-card p-6 reveal">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                      Next available
                    </p>
                    <h2 className="font-display text-2xl text-slate-900">
                      3:15 PM · Today
                    </h2>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100">
                    <Stethoscope className="h-6 w-6 text-emerald-600" />
                  </div>
                </div>
                <div className="space-y-4 text-sm text-slate-600">
                  <div className="flex items-center justify-between rounded-xl bg-white px-4 py-3">
                    <span>Consultation + vaccine plan</span>
                    <span className="font-semibold text-slate-800">₹899</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-white px-4 py-3">
                    <span>Nutrition & weight check</span>
                    <span className="font-semibold text-slate-800">₹499</span>
                  </div>
                </div>
                <Link
                  href="/appointments"
                  className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 transition-colors"
                >
                  Reserve this slot
                </Link>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="glass-card p-4 reveal delay-1">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                    Active care plans
                  </p>
                  <p className="font-display text-3xl text-slate-900">1,240</p>
                  <p className="text-sm text-slate-600">Renewed monthly</p>
                </div>
                <div className="glass-card p-4 reveal delay-2">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                    Response time
                  </p>
                  <p className="font-display text-3xl text-slate-900">4 min</p>
                  <p className="text-sm text-slate-600">Avg support reply</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-20">
        <div className="container">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-10">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                Built for every visit
              </p>
              <h2 className="font-display text-3xl md:text-4xl text-slate-900">
                Everything your clinic needs in one hub.
              </h2>
            </div>
            <Link
              href="/shop"
              className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800 hover:text-primary"
            >
              Explore products
              <span aria-hidden>→</span>
            </Link>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                title: "Smart appointments",
                description: "Live schedules, auto reminders, and no-show reduction.",
                icon: <Calendar className="h-5 w-5 text-primary" />,
              },
              {
                title: "Care team chat",
                description: "Secure messaging between clinics, staff, and owners.",
                icon: <MessageCircle className="h-5 w-5 text-emerald-600" />,
              },
              {
                title: "Prescription ready",
                description: "Track refill dates and keep stock verified.",
                icon: <Heart className="h-5 w-5 text-rose-500" />,
              },
              {
                title: "Trusted delivery",
                description: "Same-day products with batch-level traceability.",
                icon: <Truck className="h-5 w-5 text-slate-700" />,
              },
            ].map((item) => (
              <div key={item.title} className="card p-6 bg-white/90">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 mb-4">
                  {item.icon}
                </div>
                <h3 className="font-display text-xl text-slate-900 mb-2">
                  {item.title}
                </h3>
                <p className="text-sm text-slate-600">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-20 bg-white">
        <div className="container">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] items-center">
            <div className="space-y-6">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                How it flows
              </p>
              <h2 className="font-display text-3xl md:text-4xl text-slate-900">
                From first visit to lifetime care in three steps.
              </h2>
              <p className="text-slate-600">
                Keep everything connected: patient history, billing, and retail
                inventory stay synced so your team spends less time juggling tools.
              </p>
            </div>
            <div className="grid gap-6">
              {[
                {
                  step: "01",
                  title: "Create a pet profile",
                  description: "Upload medical history, allergies, and vaccination timeline.",
                },
                {
                  step: "02",
                  title: "Book and prepare",
                  description: "Send prep checklists and payment links automatically.",
                },
                {
                  step: "03",
                  title: "Follow-up care",
                  description: "Share reports, refill reminders, and care plans instantly.",
                },
              ].map((item) => (
                <div key={item.step} className="glass-card p-5">
                  <div className="flex items-center gap-4">
                    <span className="font-display text-2xl text-primary">
                      {item.step}
                    </span>
                    <div>
                      <h3 className="font-display text-lg text-slate-900">
                        {item.title}
                      </h3>
                      <p className="text-sm text-slate-600">{item.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-20">
        <div className="container">
          <div className="grid gap-6 md:grid-cols-3">
            {[
              { label: "Happy pets", value: "10K+" },
              { label: "Vets & clinics", value: "500+" },
              { label: "Orders shipped", value: "50K+" },
            ].map((stat) => (
              <div key={stat.label} className="glass-card p-6 text-center">
                <p className="font-display text-4xl text-slate-900">{stat.value}</p>
                <p className="text-sm text-slate-600">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-20">
        <div className="container">
          <div className="rounded-[32px] bg-slate-900 text-white px-8 py-12 md:px-16 md:py-16 relative overflow-hidden">
            <div className="absolute -top-24 right-12 w-56 h-56 rounded-full bg-white/10 blur-2xl" />
            <div className="relative grid gap-10 lg:grid-cols-[1.2fr_0.8fr] items-center">
              <div className="space-y-4">
                <p className="text-xs uppercase tracking-[0.2em] text-white/70">
                  Launch your care hub
                </p>
                <h2 className="font-display text-3xl md:text-4xl">
                  Ready to streamline every visit?
                </h2>
                <p className="text-white/80">
                  Set up your clinic profile, assign staff roles, and start
                  accepting bookings in minutes.
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <Link
                  href="/signup"
                  className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-900 hover:bg-white/90 transition-colors"
                >
                  Create account
                </Link>
                <Link
                  href="/appointments"
                  className="inline-flex items-center justify-center rounded-full border border-white/40 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
                >
                  See available slots
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-slate-950 text-slate-300 py-12">
        <div className="container">
          <div className="grid gap-8 md:grid-cols-4 mb-8">
            <div>
              <h3 className="font-display text-white text-lg mb-3">Pet & Vet</h3>
              <p className="text-sm text-slate-400">
                Modern care workflows for clinics, store teams, and pet parents.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-3">Quick Links</h4>
              <ul className="text-sm space-y-2">
                <li>
                  <Link href="/appointments" className="hover:text-white">
                    Appointments
                  </Link>
                </li>
                <li>
                  <Link href="/shop" className="hover:text-white">
                    Shop
                  </Link>
                </li>
                <li>
                  <Link href="/profile" className="hover:text-white">
                    Profile
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-3">Support</h4>
              <ul className="text-sm space-y-2">
                <li>
                  <a href="mailto:support@petvet.com" className="hover:text-white">
                    Help Center
                  </a>
                </li>
                <li>
                  <a href="mailto:care@petvet.com" className="hover:text-white">
                    Contact Us
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    Privacy Policy
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-3">Social</h4>
              <ul className="text-sm space-y-2">
                <li>
                  <a href="#" className="hover:text-white">
                    Instagram
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    Facebook
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    Twitter
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/10 pt-6 text-sm text-slate-400">
            © {new Date().getFullYear()} Pet & Vet Portal. All rights reserved.
          </div>
        </div>
      </footer>
    </main>
  );
}
