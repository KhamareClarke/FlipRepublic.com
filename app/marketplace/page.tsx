"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ProductCard } from "@/components/product-card";
import { useBuyerWishlist } from "@/hooks/useBuyerWishlist";
import { Filter, Search } from "lucide-react";

type Facets = {
  brands: string[];
  sizes: string[];
  priceRange: { min: number; max: number };
};

function MarketplaceContent() {
  const wl = useBuyerWishlist();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedCondition, setSelectedCondition] = useState<string>("all");
  const [selectedBrand, setSelectedBrand] = useState<string>("all");
  const [selectedSize, setSelectedSize] = useState<string>("all");
  const [sort, setSort] = useState<string>("newest");
  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [facets, setFacets] = useState<Facets>({ brands: [], sizes: [], priceRange: { min: 0, max: 0 } });
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();

  useEffect(() => {
    const loadCategories = async () => {
      const response = await fetch("/api/categories");
      const data = await response.json();
      setCategories(data.categories ?? []);
    };
    loadCategories();
  }, []);

  useEffect(() => {
    const categoryParam = searchParams.get("category");
    if (categoryParam) {
      setSelectedCategory(categoryParam);
    }
  }, [searchParams]);

  useEffect(() => {
    const loadFacets = async () => {
      const params = new URLSearchParams();
      if (selectedCategory !== "all") params.set("category", selectedCategory);
      if (selectedCondition !== "all") params.set("condition", selectedCondition);
      const res = await fetch(`/api/marketplace/facets?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setFacets({
          brands: data.brands ?? [],
          sizes: data.sizes ?? [],
          priceRange: data.priceRange ?? { min: 0, max: 0 },
        });
      }
    };
    loadFacets();
  }, [selectedCategory, selectedCondition]);

  useEffect(() => {
    let cancelled = false;
    const loadProducts = async () => {
      setLoading(true);
      const params = new URLSearchParams();
      params.set("status", "active");
      if (selectedCategory !== "all") params.set("category", selectedCategory);
      if (selectedCondition !== "all") params.set("condition", selectedCondition);
      if (selectedBrand !== "all") params.set("brand", selectedBrand);
      if (selectedSize !== "all") params.set("size", selectedSize);
      if (search.trim()) params.set("search", search.trim());
      if (minPrice && Number(minPrice) > 0) params.set("minPrice", minPrice);
      if (maxPrice && Number(maxPrice) > 0) params.set("maxPrice", maxPrice);
      if (sort && sort !== "newest") params.set("sort", sort);

      const response = await fetch(`/api/products?${params.toString()}`);
      const data = await response.json();
      const list = data.products ?? [];
      if (cancelled) return;
      setProducts(list);
      setLoading(false);
      try {
        await fetch("/api/analytics/search-event", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: search.trim() || null,
            categorySlug: selectedCategory !== "all" ? selectedCategory : null,
            condition: selectedCondition !== "all" ? selectedCondition : null,
            brand: selectedBrand !== "all" ? selectedBrand : null,
            size: selectedSize !== "all" ? selectedSize : null,
            minPrice: minPrice ? Number(minPrice) : null,
            maxPrice: maxPrice ? Number(maxPrice) : null,
            sort,
            resultCount: list.length,
          }),
        });
      } catch {
        /* ignore */
      }
    };

    const t = setTimeout(loadProducts, search ? 350 : 0);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [selectedCategory, selectedCondition, selectedBrand, selectedSize, search, minPrice, maxPrice, sort]);

  const brands = facets.brands.length > 0 ? facets.brands : Array.from(new Set(products.map((p) => p.brand))).sort();

  return (
    <div className="min-h-screen bg-black py-20 sm:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="mb-8 sm:mb-12 md:mb-16">
          <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl lg:text-7xl mb-2 sm:mb-4 font-bold">
            <span className="text-gradient-luxury">Marketplace</span>
          </h1>
          <p className="text-white/70 text-base sm:text-lg font-light">
            {loading ? "Loading…" : `${products.length} active listings`}
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
          <aside className="lg:w-64 flex-shrink-0">
            <div className="lg:sticky lg:top-24 space-y-6 sm:space-y-8">
              <div className="flex items-center space-x-2 text-gold mb-6">
                <Filter className="w-5 h-5" />
                <h2 className="text-lg font-semibold text-gradient-gold">Filters</h2>
              </div>

              <div>
                <h3 className="text-white/90 font-semibold mb-4 text-sm uppercase tracking-wider-luxury">Sort</h3>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  className="w-full bg-black border border-white/20 px-3 py-2 text-sm text-white focus:border-gold focus:outline-none"
                >
                  <option value="newest">Newest</option>
                  <option value="price_asc">Price: low → high</option>
                  <option value="price_desc">Price: high → low</option>
                </select>
              </div>

              <div>
                <h3 className="text-white/90 font-semibold mb-4 text-sm uppercase tracking-wider-luxury">Search</h3>
                <div className="relative">
                  <Search className="w-4 h-4 text-white/40 absolute left-3 top-3" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    className="w-full bg-black border border-white/20 pl-10 pr-3 py-2 text-sm text-white focus:border-gold focus:outline-none transition-colors"
                    placeholder="Search listings (full-text when enabled)"
                  />
                </div>
                <p className="text-white/30 text-[10px] mt-2 leading-snug">
                  Search uses PostgreSQL full-text when the analytics migration is applied (with automatic fallback).
                  Category <span className="text-gold/80">filter_hints</span> in Supabase boosts common sizes/brands in the facet list.
                </p>
              </div>

              <div>
                <h3 className="text-white/90 font-semibold mb-4 text-sm uppercase tracking-wider-luxury">Price</h3>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min={0}
                    placeholder="Min"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    className="w-1/2 bg-black border border-white/20 px-2 py-2 text-xs text-white focus:border-gold focus:outline-none"
                  />
                  <input
                    type="number"
                    min={0}
                    placeholder="Max"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    className="w-1/2 bg-black border border-white/20 px-2 py-2 text-xs text-white focus:border-gold focus:outline-none"
                  />
                </div>
                {facets.priceRange.max > 0 && (
                  <p className="text-white/30 text-[10px] mt-1">
                    Active range ~ {facets.priceRange.min}–{facets.priceRange.max}
                  </p>
                )}
              </div>

              <div>
                <h3 className="text-white/90 font-semibold mb-4 text-sm uppercase tracking-wider-luxury">Category</h3>
                <div className="space-y-2">
                  {["all", ...categories.map((category: any) => category.slug)].map((category) => (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={`block w-full text-left px-4 py-2 text-sm transition-all duration-300 rounded ${
                        selectedCategory === category
                          ? "bg-gradient-gold text-black font-semibold"
                          : "text-white/60 hover:text-gold hover:bg-white/5"
                      }`}
                    >
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-white/90 font-semibold mb-4 text-sm uppercase tracking-wider-luxury">Condition</h3>
                <div className="space-y-2">
                  {["all", "New", "Excellent", "Very Good", "Good"].map((condition) => (
                    <button
                      key={condition}
                      onClick={() => setSelectedCondition(condition)}
                      className={`block w-full text-left px-4 py-2 text-sm transition-all duration-300 rounded ${
                        selectedCondition === condition
                          ? "bg-gradient-gold text-black font-semibold"
                          : "text-white/60 hover:text-gold hover:bg-white/5"
                      }`}
                    >
                      {condition}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-white/90 font-semibold mb-4 text-sm uppercase tracking-wider-luxury">Size</h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  <button
                    onClick={() => setSelectedSize("all")}
                    className={`block w-full text-left px-4 py-2 text-sm transition-all duration-300 rounded ${
                      selectedSize === "all"
                        ? "bg-gradient-gold text-black font-semibold"
                        : "text-white/60 hover:text-gold hover:bg-white/5"
                    }`}
                  >
                    All sizes
                  </button>
                  {facets.sizes.map((sz) => (
                    <button
                      key={sz}
                      onClick={() => setSelectedSize(sz)}
                      className={`block w-full text-left px-4 py-2 text-sm transition-all duration-300 rounded ${
                        selectedSize === sz
                          ? "bg-gradient-gold text-black font-semibold"
                          : "text-white/60 hover:text-gold hover:bg-white/5"
                      }`}
                    >
                      {sz}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-white/90 font-semibold mb-4 text-sm uppercase tracking-wider-luxury">Brand</h3>
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  <button
                    onClick={() => setSelectedBrand("all")}
                    className={`block w-full text-left px-4 py-2 text-sm transition-all duration-300 rounded ${
                      selectedBrand === "all"
                        ? "bg-gradient-gold text-black font-semibold"
                        : "text-white/60 hover:text-gold hover:bg-white/5"
                    }`}
                  >
                    All Brands
                  </button>
                  {brands.map((brand) => (
                    <button
                      key={brand}
                      onClick={() => setSelectedBrand(brand)}
                      className={`block w-full text-left px-4 py-2 text-sm transition-all duration-300 rounded ${
                        selectedBrand === brand
                          ? "bg-gradient-gold text-black font-semibold"
                          : "text-white/60 hover:text-gold hover:bg-white/5"
                      }`}
                    >
                      {brand}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          <div className="flex-1">
            {loading ? (
              <div className="text-center py-20">
                <p className="text-white/40 text-lg">Loading listings...</p>
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-white/40 text-lg">No items match your filters</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {products.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    hideWishlist={wl.variant === "seller"}
                    wishlistLoading={wl.variant === "buyer" && !wl.ready}
                    isSaved={wl.savedIds.has(product.id)}
                    onWishlistChange={wl.updateSaved}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MarketplacePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black py-24">
          <div className="max-w-7xl mx-auto px-6 text-center">
            <p className="text-white/70">Loading...</p>
          </div>
        </div>
      }
    >
      <MarketplaceContent />
    </Suspense>
  );
}
