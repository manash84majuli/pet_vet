/**
 * Mobile Bottom Navigation Component
 * Fixed bottom nav with: Home, Shop, Appointments, Profile
 * Lucide React icons + Tailwind styling
 * Visible only on mobile (md breakpoint)
 */

"use client";

import Link from "next/link";
import { useMemo } from "react";
import { usePathname } from "next/navigation";
import {
  Calendar,
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
  const { user, isAuthenticated } = useAuth();

  const navItems = useMemo(() => {
    const items = [
      {
        label: "Home",
        href: "/",
        icon: Home,
      },
      {
        label: "Appointments",
        href: "/appointments",
        icon: Calendar,
      },
    ];

    if (!isAuthenticated) {
      items.push({
        label: "Shop",
        href: "/shop",
        icon: ShoppingBag,
      });
      items.push({
        label: "Login",
        href: "/login",
        icon: LogIn,
      });
      return items;
    }

    if (user?.role === UserRole.STORE_MANAGER) {
      items.push({
        label: "Manage",
        href: "/store-manager",
        icon: LayoutGrid,
      });
      items.push({
        label: "POS",
        href: "/pos",
        icon: ScanLine,
      });
      items.push({
        label: "Profile",
        href: "/profile",
        icon: User,
      });
      return items;
    }

    if (user?.role === UserRole.ADMIN) {
      items.push({
        label: "Admin",
        href: "/admin",
        icon: ShieldCheck,
      });
      items.push({
        label: "Profile",
        href: "/profile",
        icon: User,
      });
      return items;
    }

    items.push({
      label: "Shop",
      href: "/shop",
      icon: ShoppingBag,
    });
    items.push({
      label: "Profile",
      href: "/profile",
      icon: User,
    });

    return items;
  }, [isAuthenticated, user?.role]);

  return (
    <>
      {/* Spacer to prevent content from being hidden under fixed nav */}
      <div className="h-20 md:h-0" />

      {/* Fixed bottom nav - mobile only */}
      <nav className="fixed bottom-0 left-0 right-0 md:hidden bg-white border-t border-gray-200 safe-area-inset-bottom z-50">
        <div className="flex items-center justify-around h-20">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center w-full h-full gap-1 transition-colors",
                  isActive
                    ? "text-primary"
                    : "text-gray-600 hover:text-gray-900"
                )}
              >
                <Icon className="w-6 h-6" />
                <span className="text-xs font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
