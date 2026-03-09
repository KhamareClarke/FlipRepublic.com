"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Container } from "@/components/ui/container";
import { ShoppingBag, User, Menu, X } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function Navigation() {
  const pathname = usePathname();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const checkUserRole = async () => {
      const supabase = createSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setLoading(false);
        return;
      }

      try {
        const profileResponse = await fetch("/api/profile", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        
        if (profileResponse.ok) {
          const { profile } = await profileResponse.json();
          setUserRole(profile?.role || null);
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setLoading(false);
      }
    };

    checkUserRole();
  }, []);

  // Base links that are always shown
  const baseLinks = [
    { href: "/", label: "Home" },
    { href: "/marketplace", label: "Marketplace" },
    { href: "/trust", label: "Authentication" },
    { href: "/apply", label: "Become a Seller" },
  ];

  // Conditionally add Account or Seller Dashboard based on role
  // Sellers see only "Seller Dashboard", Buyers see only "Account"
  const accountLink = 
    userRole === "seller" || userRole === "admin"
      ? { href: "/dashboard", label: "Seller Dashboard" }
      : { href: "/account", label: "Account" };

  const links = [...baseLinks, accountLink];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 premium-card border-b-0">
      <Container size="wide" className="py-3 sm:py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2 sm:space-x-3 group">
            <div className="w-8 h-8 sm:w-10 sm:h-10 luxury-border rounded-full flex items-center justify-center group-hover:gold-glow transition-all duration-300">
              <span className="text-gold font-black text-sm sm:text-lg">FR</span>
            </div>
            <div className="flex flex-col">
              <span className="text-gradient-luxury font-black text-base sm:text-xl tracking-tighter leading-none">FLIPREPUBLIC</span>
              <span className="text-gold/60 text-[7px] sm:text-[8px] uppercase tracking-widest font-semibold">Private Market</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
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

          {/* Desktop Icons */}
          <div className="hidden md:flex items-center space-x-4">
            <Link
              href={userRole === "seller" || userRole === "admin" ? "/dashboard" : "/account"}
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

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden luxury-border p-2 rounded-full hover:gold-glow transition-all duration-300"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <X className="w-5 h-5 text-gold" />
            ) : (
              <Menu className="w-5 h-5 text-gold" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-4 pt-4 border-t border-white/10 space-y-4">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "block text-sm font-bold uppercase tracking-wider transition-all duration-300 py-2",
                  pathname === link.href
                    ? "text-gold"
                    : "text-white/70 hover:text-gold"
                )}
              >
                {link.label}
              </Link>
            ))}
            <div className="flex items-center space-x-4 pt-4 border-t border-white/10">
              <Link
                href={userRole === "seller" || userRole === "admin" ? "/dashboard" : "/account"}
                onClick={() => setMobileMenuOpen(false)}
                className="luxury-border p-2 rounded-full hover:gold-glow transition-all duration-300"
              >
                <User className="w-4 h-4 text-gold" />
              </Link>
              <Link
                href="/marketplace"
                onClick={() => setMobileMenuOpen(false)}
                className="luxury-border p-2 rounded-full hover:gold-glow transition-all duration-300"
              >
                <ShoppingBag className="w-4 h-4 text-gold" />
              </Link>
            </div>
          </div>
        )}
      </Container>
    </nav>
  );
}
