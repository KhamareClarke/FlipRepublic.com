"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { usePathname } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { cn, formatPrice } from "@/lib/utils";
import { ProductWithImages } from "@/lib/supabase/types";
import { Heart, ShieldCheck, Star } from "lucide-react";
import { getAccessToken } from "@/lib/supabase/session";

export interface ProductCardProps {
  product: ProductWithImages | any;
  /** Filled heart when true */
  isSaved?: boolean;
  /** Hide heart (e.g. seller browsing marketplace) */
  hideWishlist?: boolean;
  /** Disable heart while wishlist ids are loading */
  wishlistLoading?: boolean;
  /** Called after a successful save or unsave */
  onWishlistChange?: (productId: string, saved: boolean) => void;
}

export function ProductCard({
  product,
  isSaved = false,
  hideWishlist = false,
  wishlistLoading = false,
  onWishlistChange,
}: ProductCardProps) {
  const pathname = usePathname();

  const reviewAvg =
    product.review_avg != null && product.review_avg !== ""
      ? Number(product.review_avg)
      : null;
  const reviewCount = Number(product.review_count ?? 0) || 0;
  const showReviews = reviewAvg != null && !Number.isNaN(reviewAvg) && reviewCount > 0;

  const imageUrl =
    Array.isArray(product.images) && product.images.length > 0
      ? typeof product.images[0] === "string"
        ? product.images[0]
        : product.images[0]?.url
      : "";

  const handleWishlistClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (hideWishlist || wishlistLoading) return;

    const token = await getAccessToken();
    if (!token) {
      const redirect = pathname || "/marketplace";
      window.location.href = `/login?redirect=${encodeURIComponent(redirect)}`;
      return;
    }

    const profileResponse = await fetch("/api/profile", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (profileResponse.ok) {
      const { profile } = await profileResponse.json();
      if (profile?.role === "seller" || profile?.role === "admin") {
        return;
      }
    }

    try {
      if (isSaved) {
        const response = await fetch(`/api/saved-products?productId=${product.id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) onWishlistChange?.(product.id, false);
      } else {
        const response = await fetch("/api/saved-products", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ productId: product.id }),
        });
        if (response.ok) onWishlistChange?.(product.id, true);
      }
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="relative group">
      {!hideWishlist && (
        <button
          type="button"
          onClick={handleWishlistClick}
          disabled={wishlistLoading}
          aria-label={isSaved ? "Remove from saved" : "Save for later"}
          className={cn(
            "absolute top-3 right-3 z-30 rounded-full p-2.5 luxury-border bg-black/70 backdrop-blur-md",
            "hover:gold-glow transition-all duration-300",
            wishlistLoading && "opacity-40 pointer-events-none"
          )}
        >
          <Heart
            className={cn(
              "w-4 h-4 text-gold",
              isSaved && "fill-gold text-gold"
            )}
          />
        </button>
      )}
      <Link href={`/product/${product.id}`} className="block">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          whileHover={{ y: -12, scale: 1.03 }}
          className="cursor-pointer"
        >
          <div className="relative aspect-square mb-4 overflow-hidden premium-card">
            <Image
              src={
                imageUrl ||
                "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80"
              }
              alt={product.name}
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/80 to-transparent z-10 pr-14">
              <div className="flex items-center justify-between">
                {product.authenticated && (
                  <div className="luxury-border px-3 py-1 rounded-full">
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck className="w-3 h-3 text-gold" />
                      <span className="text-gold text-[10px] font-semibold uppercase tracking-wider">
                        Auth
                      </span>
                    </div>
                  </div>
                )}
                {product.condition === "New" && (
                  <Badge variant="gold" className="text-[10px] px-2 py-0.5 ml-auto">
                    NEW
                  </Badge>
                )}
              </div>
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-10">
              <div className="absolute bottom-4 left-4 right-4">
                <div className="luxury-border px-4 py-2 rounded-full backdrop-blur-xl">
                  <span className="text-gold text-xs font-semibold uppercase tracking-wider">
                    View Details →
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-1 h-1 bg-gold rounded-full" />
                  <p className="text-gold/80 text-[10px] uppercase tracking-widest font-bold">
                    {product.brand}
                  </p>
                </div>
                <h3 className="text-white font-bold text-base leading-tight group-hover:text-gradient-gold transition-all duration-300 line-clamp-2">
                  {product.name}
                </h3>
                {showReviews && (
                  <div className="flex items-center gap-1.5 mt-2 text-gold/90">
                    <Star className="w-3.5 h-3.5 fill-gold text-gold shrink-0" aria-hidden />
                    <span className="text-xs font-semibold tabular-nums">
                      {reviewAvg!.toFixed(1)}
                    </span>
                    <span className="text-white/40 text-[10px] font-medium">
                      ({reviewCount} {reviewCount === 1 ? "review" : "reviews"})
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-white/5">
              <div className="flex flex-col">
                <span className="text-gradient-gold font-black text-xl tracking-tight">
                  {formatPrice(product.price)}
                </span>
                {product.originalPrice && (
                  <span className="text-white/30 text-xs line-through font-light">
                    {formatPrice(product.originalPrice)}
                  </span>
                )}
              </div>
              <div className="luxury-border px-3 py-1 rounded-full">
                <span className="text-gold text-xs font-semibold">{product.size}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-[10px]">
              <span className="text-white/50 uppercase tracking-wider">{product.condition}</span>
              {(product.seller?.is_verified || product.seller?.is_admin_approved) && (
                <>
                  <span className="text-white/20">•</span>
                  <div className="flex items-center gap-1">
                    <div className="w-1 h-1 bg-gold rounded-full" />
                    <span className="text-gold/80 font-semibold uppercase tracking-wider">
                      Verified Seller
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </motion.div>
      </Link>
    </div>
  );
}
