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
      <section className="relative h-screen flex items-center justify-center overflow-hidden diagonal-lines">
        <div className="absolute inset-0 bg-gradient-to-b from-black via-black/30 to-black z-10" />
        <div className="absolute inset-0 bg-gradient-radial from-gold/5 via-transparent to-transparent z-10" />
        <Image
          src="https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=1920&q=80"
          alt="Hero"
          fill
          className="object-cover opacity-30"
          priority
        />
        <div className="relative z-20 max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 1, ease: "easeOut" }}
          >
            <div className="mb-6 sm:mb-8">
              <div className="inline-block px-4 sm:px-6 py-1.5 sm:py-2 luxury-border rounded-full mb-4 sm:mb-6">
                <span className="text-gold text-[10px] sm:text-xs uppercase tracking-wider-luxury font-semibold">Est. 2024 • Invitation Only</span>
              </div>
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl mb-6 sm:mb-8 leading-[0.95] font-black tracking-tight">
              <span className="text-gradient-luxury text-luxury-shadow block">THE PRIVATE</span>
              <span className="text-gradient-luxury text-luxury-shadow block">MARKET</span>
              <span className="text-gradient-luxury text-luxury-shadow block mt-2 sm:mt-3">FOR ELITE RESALE</span>
            </h1>
            <div className="max-w-3xl mx-auto mb-8 sm:mb-12">
              <p className="text-white/90 text-base sm:text-lg md:text-xl lg:text-2xl mb-4 sm:mb-6 leading-relaxed font-light tracking-wide px-2">
                Where institutional-grade authentication meets
                <span className="text-gradient-gold font-semibold"> private luxury commerce</span>
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 md:gap-12 text-xs text-white/50 mt-6 sm:mt-8">
                <div className="flex items-center gap-2.5">
                  <div className="w-1 h-1 bg-gold/60 rounded-full"></div>
                  <span className="uppercase tracking-widest">Zero Counterfeits</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-1 h-1 bg-gold/60 rounded-full"></div>
                  <span className="uppercase tracking-widest">Vetted Sellers</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-1 h-1 bg-gold/60 rounded-full"></div>
                  <span className="uppercase tracking-widest">Buyer Protection</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center items-center">
              <Link href="/marketplace" className="w-full sm:w-auto">
                <Button size="lg" variant="primary" className="w-full sm:min-w-[240px]">
                  Enter Marketplace
                </Button>
              </Link>
              <Link href="/apply" className="w-full sm:w-auto">
                <Button size="lg" variant="outline" className="w-full sm:min-w-[240px]">
                  Apply for Access
                </Button>
              </Link>
            </div>
            <p className="text-white/40 text-[10px] sm:text-xs mt-6 sm:mt-8 uppercase tracking-widest">Trusted by collectors worldwide</p>
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
