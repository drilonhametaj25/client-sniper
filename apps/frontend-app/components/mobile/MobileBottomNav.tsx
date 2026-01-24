"use client";

import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
  Home,
  Search,
  FolderOpen,
  User,
  BarChart,
  Target,
  Shield,
} from "lucide-react";

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

export default function MobileBottomNav() {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  if (!user) return null;

  const isAdmin = user.role === "admin";
  const isAdminRoute = pathname.startsWith("/admin");
  const isPro = user.plan === "pro" || user.plan === "agency";

  // Navigation items based on role and plan
  const navItems: NavItem[] = isAdmin && isAdminRoute
    ? [
        { name: "Dashboard", href: "/admin/dashboard", icon: Home },
        { name: "Utenti", href: "/admin/users", icon: User },
        { name: "Feedback", href: "/admin/feedback", icon: Search },
        { name: "Settings", href: "/admin/settings", icon: BarChart },
        { name: "Client", href: "/dashboard", icon: Shield },
      ]
    : [
        { name: "Dashboard", href: "/dashboard", icon: Home },
        { name: "Analisi", href: "/tools/manual-scan", icon: Target },
        ...(isPro
          ? [
              { name: "CRM", href: "/crm", icon: FolderOpen },
              { name: "Analytics", href: "/analytics", icon: BarChart },
            ]
          : []),
        { name: "Account", href: "/settings", icon: User },
      ];

  const handleNavigation = (href: string) => {
    router.push(href);
  };

  return (
    <>
      {/* Spacer to prevent content from being hidden behind fixed nav */}
      <div className="h-16 md:hidden" />

      {/* Fixed bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-t border-gray-200 dark:border-gray-700 md:hidden safe-area-bottom">
        <div className="flex items-center justify-around h-16 px-2">
          {navItems.slice(0, 5).map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;

            return (
              <button
                key={item.name}
                onClick={() => handleNavigation(item.href)}
                className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                  isActive
                    ? "text-blue-600 dark:text-blue-400"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                }`}
              >
                <div className="relative">
                  <Icon className={`w-5 h-5 ${isActive ? "scale-110" : ""} transition-transform`} />
                  {item.badge && item.badge > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 flex items-center justify-center text-[10px] font-bold text-white bg-red-500 rounded-full">
                      {item.badge > 99 ? "99+" : item.badge}
                    </span>
                  )}
                </div>
                <span className={`text-[10px] mt-1 ${isActive ? "font-semibold" : "font-medium"}`}>
                  {item.name}
                </span>
                {isActive && (
                  <div className="absolute bottom-1 w-1 h-1 bg-blue-600 dark:bg-blue-400 rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
