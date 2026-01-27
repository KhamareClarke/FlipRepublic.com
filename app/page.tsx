"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/product-card";
import { ShieldCheck, Award, Lock, Package } from "lucide-react";

export default function HomePage() {
  const [featuredProducts, setFeaturedProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [trustPillars, setTrustPillars] = useState<any[]>([]);
  const [sellers, setSellers] = useState<any[]>([]);

  useEffect(() => {
    const loadHome = async () => {
      const [productsResponse, categoriesResponse, trustResponse, sellersResponse] =
        await Promise.all([
          fetch("/api/products"), // Show all products including sold items
          fetch("/api/categories"),
          fetch("/api/trust-pillars"),
          fetch("/api/sellers"),
        ]);

      const productsData = await productsResponse.json();
      const categoriesData = await categoriesResponse.json();
      const trustData = await trustResponse.json();
      const sellersData = await sellersResponse.json();

      setFeaturedProducts((productsData.products ?? []).slice(0, 4));
      setCategories(categoriesData.categories ?? []);
      setTrustPillars(trustData.trustPillars ?? []);
      setSellers(sellersData.sellers ?? []);
    };

    loadHome();
  }, []);

  return (
    <div className="bg-black">
      <section className="relative h-screen flex items-start sm:items-center justify-center overflow-hidden diagonal-lines">
        {/* Enhanced background layers for depth */}
        <div className="absolute inset-0 bg-gradient-to-b from-black via-black/40 to-black z-10" />
        <div className="absolute inset-0 bg-gradient-radial from-gold/10 via-gold/5 to-transparent z-10" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gold/5 via-transparent to-transparent z-10" />
        <Image
          src="https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=1920&q=80"
          alt="Hero"
          fill
          className="object-cover opacity-25 sm:opacity-30"
          priority
        />
        
        {/* Premium content container */}
        <div className="relative z-20 max-w-5xl mx-auto px-4 sm:px-6 text-center pt-[56px] sm:pt-0 w-full">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col items-center justify-start sm:justify-center h-full"
          >
            {/* Est. 2024 Badge - Eye-catching with glow */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="mb-1.5 sm:mb-6 md:mb-8"
            >
              <div className="inline-block px-4 sm:px-6 py-1.5 sm:py-2 luxury-border rounded-full backdrop-blur-md bg-black/30 border-gold/60 shadow-[0_0_20px_rgba(212,175,55,0.3)]">
                <span className="text-gold text-[10px] sm:text-xs uppercase tracking-[0.2em] font-bold">Est. 2024 • Invitation Only</span>
              </div>
            </motion.div>
            
            {/* Main Title - Bold, striking, perfect hierarchy */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="font-serif text-[32px] leading-[0.88] sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl sm:leading-[0.95] font-black tracking-[-0.03em] sm:tracking-tight mb-0.5 sm:mb-2 md:mb-4"
            >
              <motion.span
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="text-gradient-luxury text-luxury-shadow block drop-shadow-[0_2px_8px_rgba(212,175,55,0.4)]"
              >
                THE PRIVATE
              </motion.span>
              <motion.span
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="text-gradient-luxury text-luxury-shadow block drop-shadow-[0_2px_8px_rgba(212,175,55,0.4)]"
              >
                MARKET
              </motion.span>
              <motion.span
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.5 }}
                className="text-gradient-luxury text-luxury-shadow block drop-shadow-[0_2px_8px_rgba(212,175,55,0.4)]"
              >
                FOR ELITE RESALE
              </motion.span>
            </motion.h1>
            
            {/* Tagline - Refined and elegant */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="max-w-3xl mx-auto pt-0.5 sm:pt-2"
            >
              <p className="text-white/95 text-[14px] leading-[1.6] sm:text-lg md:text-xl lg:text-2xl sm:leading-relaxed font-light tracking-wide px-1 sm:px-2">
                Where institutional-grade authentication meets
                <span className="text-gradient-gold font-semibold"> private luxury commerce</span>
              </p>
              
              {/* Bullet Points - Premium styling */}
              <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 sm:gap-8 md:gap-12 text-[10px] sm:text-xs text-white/60 sm:text-white/50 mt-2.5 sm:mt-6 md:mt-8">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.4, delay: 0.75 }}
                  className="flex items-center gap-2 sm:gap-2.5"
                >
                  <div className="w-1.5 h-1.5 sm:w-1 sm:h-1 bg-gold rounded-full shadow-[0_0_8px_rgba(212,175,55,0.6)]"></div>
                  <span className="uppercase tracking-[0.12em] font-medium">Zero Counterfeits</span>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.4, delay: 0.8 }}
                  className="flex items-center gap-2 sm:gap-2.5"
                >
                  <div className="w-1.5 h-1.5 sm:w-1 sm:h-1 bg-gold rounded-full shadow-[0_0_8px_rgba(212,175,55,0.6)]"></div>
                  <span className="uppercase tracking-[0.12em] font-medium">Vetted Sellers</span>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.4, delay: 0.85 }}
                  className="flex items-center gap-2 sm:gap-2.5"
                >
                  <div className="w-1.5 h-1.5 sm:w-1 sm:h-1 bg-gold rounded-full shadow-[0_0_8px_rgba(212,175,55,0.6)]"></div>
                  <span className="uppercase tracking-[0.12em] font-medium">Buyer Protection</span>
                </motion.div>
              </div>
            </motion.div>
            
            {/* CTA Buttons - Premium, eye-catching */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.9 }}
              className="flex flex-col sm:flex-row gap-3 sm:gap-6 justify-center items-stretch sm:items-center w-full sm:w-auto mt-3 sm:mt-6 md:mt-8"
            >
              <Link href="/marketplace" className="w-full sm:w-auto">
                <Button size="lg" variant="primary" className="w-full sm:min-w-[240px] text-sm sm:text-base font-bold tracking-wide shadow-[0_4px_20px_rgba(212,175,55,0.4)] hover:shadow-[0_6px_30px_rgba(212,175,55,0.6)] transition-all duration-300">
                  Enter Marketplace
                </Button>
              </Link>
              <Link href="/apply" className="w-full sm:w-auto">
                <Button size="lg" variant="outline" className="w-full sm:min-w-[240px] text-sm sm:text-base font-bold tracking-wide border-2 hover:border-gold/80 transition-all duration-300">
                  Apply for Access
                </Button>
              </Link>
            </motion.div>
            
            {/* Footer Text - Subtle elegance */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 1.0 }}
              className="text-white/25 sm:text-white/40 text-[8px] sm:text-xs mt-2.5 sm:mt-6 md:mt-8 uppercase tracking-[0.25em] font-medium"
            >
              Trusted by collectors worldwide
            </motion.p>
          </motion.div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24 md:py-32">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12 sm:mb-16 md:mb-20"
        >
          <div className="inline-block luxury-border rounded-full px-6 sm:px-8 py-2 sm:py-3 mb-4 sm:mb-6">
            <span className="text-gold text-xs sm:text-sm uppercase tracking-wider-luxury font-semibold">Latest Arrivals</span>
          </div>
          <h2 className="font-serif text-4xl sm:text-5xl md:text-6xl lg:text-7xl mb-4 sm:mb-6 font-black tracking-tight">
            <span className="shimmer-text">Curated Drops</span>
          </h2>
          <p className="text-white/80 text-base sm:text-lg max-w-2xl mx-auto font-light leading-relaxed px-4">
            Museum-grade authentication. Institutional standards.
            <span className="text-gradient-gold font-semibold"> Zero compromise.</span>
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          {featuredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        <div className="text-center mt-12 sm:mt-16">
          <Link href="/marketplace">
            <Button variant="outline" size="lg" className="w-full sm:w-auto">
              View All Items
            </Button>
          </Link>
        </div>
      </section>

      <section className="bg-black-soft py-16 sm:py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12 sm:mb-16 md:mb-20"
          >
            <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl lg:text-6xl mb-4 sm:mb-6 font-bold">
              <span className="shimmer-text">Shop by Category</span>
            </h2>
            <p className="text-white/70 text-base sm:text-lg font-light px-4">
              Discover authenticated luxury across our curated collections
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8">
            {categories.map((category, index) => (
              <Link key={category.id} href={`/marketplace?category=${category.slug}`}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  whileHover={{ y: -8 }}
                  className="group relative aspect-[4/5] overflow-hidden cursor-pointer"
                >
                  <Image
                    src={category.image}
                    alt={category.name}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-8">
                    <h3 className="font-serif text-4xl text-gold mb-2">
                      {category.name}
                    </h3>
                    <p className="text-white/60 text-sm tracking-wide mb-3">
                      {category.tagline}
                    </p>
                    <div className="w-16 h-0.5 bg-gold transform origin-left transition-transform duration-300 group-hover:scale-x-150" />
                  </div>
                </motion.div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24 md:py-32">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12 sm:mb-16 md:mb-20"
        >
          <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl lg:text-6xl mb-4 sm:mb-6 font-bold">
            <span className="shimmer-text">Why FlipRepublic</span>
          </h2>
          <p className="text-white/70 text-base sm:text-lg max-w-2xl mx-auto font-light px-4">
            Built on trust, curated for excellence, designed for collectors
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-10 md:gap-12">
          {trustPillars.map((pillar: any, index: number) => {
            const icons = [ShieldCheck, Award, Lock, Package];
            const Icon = icons[index];

            return (
              <motion.div
                key={pillar.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="text-center"
              >
                <div className="inline-flex items-center justify-center w-16 h-16 mb-6 glass-gold rounded-full">
                  <Icon className="w-8 h-8 text-gradient-gold" />
                </div>
                <h3 className="text-xl font-medium text-white mb-3">
                  {pillar.title}
                </h3>
                <p className="text-white/50 leading-relaxed">
                  {pillar.description}
                </p>
              </motion.div>
            );
          })}
        </div>
      </section>

      <section className="bg-black-soft py-16 sm:py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-20"
          >
            <h2 className="font-serif text-5xl md:text-6xl mb-6 font-bold">
              <span className="shimmer-text">Featured Sellers</span>
            </h2>
            <p className="text-white/70 text-lg font-light">
              Invitation-only marketplace for trusted vendors
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {sellers.map((seller: any, index: number) => (
              <motion.div
                key={seller.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="premium-card p-8 hover:gold-glow transition-all duration-500 hover:scale-105 rounded-lg"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-2xl font-medium text-white">
                    {seller.name}
                  </h3>
                  {seller.verified && (
                    <ShieldCheck className="w-6 h-6 text-gold" />
                  )}
                </div>
                <p className="text-white/60 text-sm mb-6 italic">
                  {seller.specialization}
                </p>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between text-white/60">
                    <span>Total Value Sold</span>
                    <span className="text-gold">£{(seller.totalValue / 1000).toFixed(0)}k</span>
                  </div>
                  <div className="flex justify-between text-white/60">
                    <span>Verified Transactions</span>
                    <span className="text-white">{seller.totalSales}</span>
                  </div>
                  <div className="flex justify-between text-white/60">
                    <span>Member Since</span>
                    <span className="text-white">
                      {new Date(seller.joinedDate).getFullYear()}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="text-center mt-16">
            <Link href="/apply">
              <Button variant="outline" size="lg">
                Become a Seller
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="relative py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-black via-black/50 to-black z-10" />
        <Image
          src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1920&q=80"
          alt="CTA Background"
          fill
          className="object-cover opacity-20"
        />
        <div className="relative z-20 max-w-4xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="font-serif text-5xl md:text-6xl mb-6 font-bold">
              <span className="text-gradient-luxury">Enter FlipRepublic</span>
            </h2>
            <p className="text-white/80 text-lg mb-12 max-w-2xl mx-auto font-light leading-relaxed">
              Access the private market for authenticated luxury resale.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/marketplace">
                <Button size="lg" variant="primary">
                  Access Marketplace
                </Button>
              </Link>
              <Link href="/trust">
                <Button size="lg" variant="outline">
                  View Authentication Process
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
