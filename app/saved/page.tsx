"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/product-card";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type SavedProductItem = {
  product: any;
  created_at: string;
};

export default function SavedPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [savedProducts, setSavedProducts] = useState<SavedProductItem[]>([]);

  useEffect(() => {
    const load = async () => {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        router.replace("/login?redirect=/saved");
        setLoading(false);
        return;
      }

      const token = session.access_token;

      const profileResponse = await fetch("/api/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (profileResponse.ok) {
        const { profile } = await profileResponse.json();
        if (profile?.role === "seller" || profile?.role === "admin") {
          router.replace("/dashboard");
          setLoading(false);
          return;
        }
      }

      const savedResponse = await fetch("/api/saved-products", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const savedData = savedResponse.ok ? await savedResponse.json() : { savedProducts: [] };
      setSavedProducts(savedData.savedProducts ?? []);
      setLoading(false);
    };

    load();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black py-24">
        <div className="max-w-6xl mx-auto px-6">
          <p className="text-white/60">Loading saved items…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black py-20 sm:py-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-8 sm:space-y-10">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold">
              <span className="text-gradient-luxury">Saved</span>
            </h1>
            <p className="text-white/60 text-sm sm:text-base mt-2">
              Items you have saved for later. Manage your list here or from your account.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 sm:gap-3">
            <Link href="/account">
              <Button variant="outline" size="sm" className="w-full sm:w-auto">
                Account
              </Button>
            </Link>
            <Link href="/marketplace">
              <Button variant="primary" size="sm" className="w-full sm:w-auto">
                Marketplace
              </Button>
            </Link>
          </div>
        </div>

        {savedProducts.length === 0 ? (
          <div className="text-center py-16 sm:py-20 border border-white/10 bg-white/5 rounded-lg">
            <p className="text-white/50 mb-6">No saved products yet.</p>
            <Link href="/marketplace">
              <Button variant="outline">Browse marketplace</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {savedProducts.map((item) =>
              item.product ? (
                <ProductCard
                  key={item.product.id}
                  product={item.product}
                  isSaved
                  onWishlistChange={(productId, saved) => {
                    if (!saved) {
                      setSavedProducts((prev) => prev.filter((p) => p.product?.id !== productId));
                    }
                  }}
                />
              ) : null
            )}
          </div>
        )}
      </div>
    </div>
  );
}
