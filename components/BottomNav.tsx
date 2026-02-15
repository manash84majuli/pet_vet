/**
 * Mobile Bottom Navigation Component
 * Fixed bottom nav with role-based links
 * Modern pill/bubble style with animated active indicator
 * Visible only on mobile (md breakpoint)
 */

"use client";

import Link from "next/link";
import { useMemo } from "react";
import { usePathname } from "next/navigation";
import {
  Calendar,
  ClipboardList,
  Home,
  LayoutGrid,
  LogIn,
  ScanLine,
  ShieldCheck,
  ShoppingBag,
  User,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { UserRole } from "@/lib/types";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();

  // Normalize role for case-insensitive comparison
  const userRole = user?.role?.toLowerCase();

  const navItems = useMemo(() => {
    // If user data exists (from cache or fresh fetch), always show role-based nav
    // Never fall back to a minimal "loading" nav — use cached profile instead
    if (user) {
      const role = user.role?.toLowerCase();

      // ── Store Manager: Home, Manage, POS, Orders, Profile ──
      if (role === UserRole.STORE_MANAGER) {
        return [
          { label: "Home", href: "/", icon: Home },
          { label: "Manage", href: "/store-manager", icon: LayoutGrid },
          { label: "POS", href: "/pos", icon: ScanLine },
          { label: "Orders", href: "/orders", icon: ClipboardList },
          { label: "Profile", href: "/profile", icon: User },
        ];
      }

      // ── Admin: Home, Admin, Manage, POS, Profile ──
      if (role === UserRole.ADMIN) {
        return [
          { label: "Home", href: "/", icon: Home },
          { label: "Admin", href: "/admin", icon: ShieldCheck },
          { label: "Manage", href: "/store-manager", icon: LayoutGrid },
          { label: "POS", href: "/pos", icon: ScanLine },
          { label: "Profile", href: "/profile", icon: User },
        ];
      }

      // ── Customer / Vet / any other role: Home, Book, Shop, Orders, Profile ──
      return [
        { label: "Home", href: "/", icon: Home },
        { label: "Book", href: "/appointments", icon: Calendar },
        { label: "Shop", href: "/shop", icon: ShoppingBag },
        { label: "Orders", href: "/orders", icon: ClipboardList },
        { label: "Profile", href: "/profile", icon: User },
      ];
    }

    // No user data at all (guest or still loading with no cache)
    // Show guest nav — Login button tells user they need to sign in
    return [
      { label: "Home", href: "/", icon: Home },
      { label: "Book", href: "/appointments", icon: Calendar },
      { label: "Shop", href: "/shop", icon: ShoppingBag },
      { label: "Login", href: "/login", icon: LogIn },
    ];
  }, [user, userRole]);

  // Hide on login/signup pages
  if (pathname === "/login" || pathname === "/signup") {
    return null;
  }

  return (
    <>
      {/* Spacer to prevent content from being hidden under fixed nav */}
      <div className="h-[4.5rem] md:h-0" />

      {/* Fixed bottom nav - mobile only */}
      <nav className="fixed bottom-0 left-0 right-0 md:hidden z-50 safe-area-inset-bottom">
        {/* Frosted glass background */}
        <div className="mx-3 mb-3 px-2 py-2 bg-white/80 backdrop-blur-xl border border-gray-200/60 rounded-2xl shadow-lg shadow-black/5">
          <div className="flex items-center justify-around">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "relative flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all duration-200 min-w-[3.5rem]",
                    isActive
                      ? "text-orange-600"
                      : "text-gray-400 hover:text-gray-600 active:scale-95"
                  )}
                >
                  {/* Active pill background */}
                  {isActive && (
                    <span className="absolute inset-0 bg-orange-50 rounded-xl" />
                  )}

                  {/* Active indicator dot */}
                  {isActive && (
                    <span className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-4 h-1 bg-orange-500 rounded-full" />
                  )}

                  <Icon
                    className={cn(
                      "relative z-10 transition-all duration-200",
                      isActive ? "w-[1.35rem] h-[1.35rem]" : "w-5 h-5"
                    )}
                    strokeWidth={isActive ? 2.5 : 1.8}
                  />
                  <span
                    className={cn(
                      "relative z-10 text-[0.65rem] mt-0.5 transition-all duration-200",
                      isActive ? "font-bold" : "font-medium"
                    )}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </>
  );
}
