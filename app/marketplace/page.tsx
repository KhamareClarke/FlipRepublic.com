"use client";

import { useState } from "react";
import { ProductCard } from "@/components/product-card";
import { products } from "@/lib/data";
import { Filter } from "lucide-react";

export default function MarketplacePage() {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedCondition, setSelectedCondition] = useState<string>("all");
  const [selectedBrand, setSelectedBrand] = useState<string>("all");

  const brands = Array.from(new Set(products.map((p) => p.brand))).sort();

  const filteredProducts = products.filter((product) => {
    if (selectedCategory !== "all" && product.category.toLowerCase() !== selectedCategory) {
      return false;
    }
    if (selectedCondition !== "all" && product.condition !== selectedCondition) {
      return false;
    }
    if (selectedBrand !== "all" && product.brand !== selectedBrand) {
      return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-black py-24">
      <div className="max-w-7xl mx-auto px-6">
        <div className="mb-16">
          <h1 className="font-serif text-6xl md:text-7xl mb-4 font-bold">
            <span className="text-gradient-luxury">Marketplace</span>
          </h1>
          <p className="text-white/70 text-lg font-light">
            {filteredProducts.length} authenticated items available
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-12">
          <aside className="lg:w-64 flex-shrink-0">
            <div className="sticky top-24 space-y-8">
              <div className="flex items-center space-x-2 text-gold mb-6">
                <Filter className="w-5 h-5" />
                <h2 className="text-lg font-semibold text-gradient-gold">Filters</h2>
              </div>

              <div>
                <h3 className="text-white/90 font-semibold mb-4 text-sm uppercase tracking-wider-luxury">
                  Category
                </h3>
                <div className="space-y-2">
                  {["all", "trainers", "streetwear", "luxury"].map((category) => (
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
            {filteredProducts.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-white/40 text-lg">
                  No items match your filters
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredProducts.map((product) => (
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
