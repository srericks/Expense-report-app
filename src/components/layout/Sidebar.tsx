"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import {
  Receipt,
  FileText,
  Settings,
  CreditCard,
  LogOut,
} from "lucide-react";
import { signOut } from "@/lib/firebase/auth";
import { useAuth } from "@/contexts/AuthContext";
import { useBranding } from "@/contexts/BrandingContext";

const navItems = [
  { href: "/expenses", label: "Expenses", icon: Receipt },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/billing", label: "Billing", icon: CreditCard },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { logoUrl } = useBranding();

  async function handleSignOut() {
    await signOut();
    window.location.href = "/login";
  }

  return (
    <aside className="w-64 fixed top-0 bottom-0 left-0 bg-white border-r border-gray-200 flex flex-col z-40">
      {/* Company logo area (top-left) */}
      <div className="px-4 py-4 border-b border-gray-100 flex items-center justify-center min-h-[72px]">
        {logoUrl ? (
          <Image
            src={logoUrl}
            alt="Company logo"
            width={220}
            height={60}
            className="max-h-[52px] max-w-[220px] w-auto object-contain"
            unoptimized
          />
        ) : (
          <p className="text-xs text-gray-300 italic">Your company logo</p>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-brand-primary/10 text-brand-primary"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="p-4 border-t border-gray-100">
        {/* ExpenseFlow branding — always above user info */}
        <div className="flex items-center gap-2 mb-3 pb-3 border-b border-gray-100">
          <div className="w-6 h-6 rounded bg-brand-primary flex items-center justify-center">
            <Receipt className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <p className="font-bold text-gray-900 text-xs leading-tight">ExpenseFlow</p>
            <p className="text-[10px] text-gray-400 leading-tight">Expense Reports</p>
          </div>
        </div>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary font-semibold text-xs">
            {user?.displayName?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || "?"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {user?.displayName || "User"}
            </p>
            <p className="text-xs text-gray-400 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
