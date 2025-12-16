"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ShoppingBag, User } from "lucide-react";

export function Navigation() {
  const pathname = usePathname();

  const links = [
    { href: "/", label: "Home" },
    { href: "/marketplace", label: "Marketplace" },
    { href: "/trust", label: "Authentication" },
    { href: "/apply", label: "Become a Seller" },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 premium-card border-b-0">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 luxury-border rounded-full flex items-center justify-center group-hover:gold-glow transition-all duration-300">
              <span className="text-gold font-black text-lg">FR</span>
            </div>
            <div className="flex flex-col">
              <span className="text-gradient-luxury font-black text-xl tracking-tighter leading-none">FLIPREPUBLIC</span>
              <span className="text-gold/60 text-[8px] uppercase tracking-widest font-semibold">Private Market</span>
            </div>
          </Link>

          <div className="hidden md:flex items-center space-x-8">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "text-xs font-bold uppercase tracking-wider transition-all duration-300 relative",
                  pathname === link.href
                    ? "text-gold"
                    : "text-white/70 hover:text-gold"
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center space-x-4">
            <Link
              href="/dashboard"
              className="luxury-border p-2 rounded-full hover:gold-glow transition-all duration-300"
            >
              <User className="w-4 h-4 text-gold" />
            </Link>
            <Link
              href="/marketplace"
              className="luxury-border p-2 rounded-full hover:gold-glow transition-all duration-300"
            >
              <ShoppingBag className="w-4 h-4 text-gold" />
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
