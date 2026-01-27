"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ProductCard } from "@/components/product-card";
import { Filter, Search } from "lucide-react";

function MarketplaceContent() {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedCondition, setSelectedCondition] = useState<string>("all");
  const [selectedBrand, setSelectedBrand] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
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
    const loadProducts = async () => {
      setLoading(true);
      const params = new URLSearchParams();
      // Remove status filter to show all products including sold items
      if (selectedCategory !== "all") params.set("category", selectedCategory);
      if (selectedCondition !== "all") params.set("condition", selectedCondition);
      if (selectedBrand !== "all") params.set("brand", selectedBrand);
      if (search) params.set("search", search);

      const response = await fetch(`/api/products?${params.toString()}`);
      const data = await response.json();
      setProducts(data.products ?? []);
      setLoading(false);
    };

    loadProducts();
  }, [selectedCategory, selectedCondition, selectedBrand, search]);

  const brands = useMemo(
    () => Array.from(new Set(products.map((p) => p.brand))).sort(),
    [products]
  );

  return (
    <div className="min-h-screen bg-black py-20 sm:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="mb-8 sm:mb-12 md:mb-16">
          <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl lg:text-7xl mb-2 sm:mb-4 font-bold">
            <span className="text-gradient-luxury">Marketplace</span>
          </h1>
          <p className="text-white/70 text-base sm:text-lg font-light">
            {products.length} authenticated items
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
                <h3 className="text-white/90 font-semibold mb-4 text-sm uppercase tracking-wider-luxury">
                  Search
                </h3>
                <div className="relative">
                  <Search className="w-4 h-4 text-white/40 absolute left-3 top-3" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    className="w-full bg-black border border-white/20 pl-10 pr-3 py-2 text-sm text-white focus:border-gold focus:outline-none transition-colors"
                    placeholder="Search brand or item"
                  />
                </div>
              </div>

              <div>
                <h3 className="text-white/90 font-semibold mb-4 text-sm uppercase tracking-wider-luxury">
                  Category
                </h3>
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
                <h3 className="text-white/90 font-semibold mb-4 text-sm uppercase tracking-wider-luxury">
                  Condition
                </h3>
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
                <h3 className="text-white/90 font-semibold mb-4 text-sm uppercase tracking-wider-luxury">
                  Brand
                </h3>
                <div className="space-y-2">
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
                <p className="text-white/40 text-lg">
                  No items match your filters
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
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
    <Suspense fallback={
      <div className="min-h-screen bg-black py-24">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-white/70">Loading...</p>
        </div>
      </div>
    }>
      <MarketplaceContent />
    </Suspense>
  );
}
