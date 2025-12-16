"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { products } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/utils";
import { ShieldCheck, Award, Package, ArrowLeft } from "lucide-react";

export default function ProductPage({ params }: { params: { id: string } }) {
  const [selectedImage, setSelectedImage] = useState(0);
  const product = products.find((p) => p.id === params.id);

  if (!product) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-serif text-4xl mb-4 font-bold">
            <span className="text-gradient-luxury">Product Not Found</span>
          </h1>
          <Link href="/marketplace">
            <Button variant="outline">Return to Marketplace</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black py-24">
      <div className="max-w-7xl mx-auto px-6">
        <Link
          href="/marketplace"
          className="inline-flex items-center space-x-2 text-white/60 hover:text-gold transition-colors mb-12"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Marketplace</span>
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          <div className="space-y-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="relative aspect-square bg-white/5 overflow-hidden"
            >
              <Image
                src={product.images[selectedImage]}
                alt={product.name}
                fill
                className="object-cover"
                priority
              />
              {product.authenticated && (
                <div className="absolute top-6 right-6 glass-gold px-4 py-2 rounded-full flex items-center space-x-2 animate-glow">
                  <ShieldCheck className="w-5 h-5 text-gold" />
                  <span className="text-sm font-semibold text-gold">✨ Authenticated</span>
                </div>
              )}
            </motion.div>

            {product.images.length > 1 && (
              <div className="grid grid-cols-4 gap-4">
                {product.images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`relative aspect-square overflow-hidden transition-all ${
                      selectedImage === index
                        ? "ring-2 ring-gold"
                        : "opacity-50 hover:opacity-100"
                    }`}
                  >
                    <Image
                      src={image}
                      alt={`${product.name} ${index + 1}`}
                      fill
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-8">
            <div>
              <p className="text-white/50 text-xs uppercase tracking-wider-luxury mb-2 font-medium">
                {product.brand}
              </p>
              <h1 className="font-serif text-4xl md:text-5xl mb-4 font-bold">
                <span className="text-gradient-luxury">{product.name}</span>
              </h1>
              <div className="flex items-center space-x-3">
                <Badge variant="gold">{product.condition}</Badge>
                <Badge variant="outline">{product.size}</Badge>
                <Badge variant="outline">{product.category}</Badge>
              </div>
            </div>

            <div className="border-t border-b border-white/10 py-6">
              <div className="flex items-baseline space-x-4 mb-8">
                <span className="text-5xl font-bold text-gradient-gold">
                  {formatPrice(product.price)}
                </span>
                {product.originalPrice && (
                  <span className="text-2xl text-white/30 line-through font-light">
                    {formatPrice(product.originalPrice)}
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <Button size="lg" variant="primary" className="w-full">
                Purchase Now
              </Button>
              <Button size="lg" variant="outline" className="w-full">
                Submit Offer
              </Button>
            </div>

            <div className="glass-effect p-6 space-y-4 rounded-lg">
              <h3 className="text-white font-semibold text-lg">Description 📝</h3>
              <p className="text-white/70 leading-relaxed">
                {product.description}
              </p>
              {product.colorway && (
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">Colorway</span>
                  <span className="text-white">{product.colorway}</span>
                </div>
              )}
              {product.releaseYear && (
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">Release Year</span>
                  <span className="text-white">{product.releaseYear}</span>
                </div>
              )}
            </div>

            <div className="glass-effect p-6 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold text-lg">Seller 👤</h3>
                {product.seller.verified && (
                  <ShieldCheck className="w-5 h-5 text-gold" />
                )}
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-white/50">Name</span>
                  <span className="text-white">{product.seller.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">Rating</span>
                  <span className="text-gold">{product.seller.rating} / 5.0</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">Total Sales</span>
                  <span className="text-white">{product.seller.totalSales}</span>
                </div>
              </div>
            </div>

            <div className="glass-gold p-6 space-y-4 rounded-lg animate-glow">
              <div className="flex items-center space-x-3">
                <ShieldCheck className="w-6 h-6 text-gold" />
                <h3 className="text-gradient-gold font-bold text-lg">✨ Authentication Guarantee</h3>
              </div>
              <p className="text-white/70 text-sm leading-relaxed">
                Every item is verified by our expert authentication team before listing.
                Your purchase is protected by our comprehensive buyer guarantee.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4 pt-4">
              <div className="text-center">
                <Award className="w-8 h-8 text-gold mx-auto mb-2" />
                <p className="text-xs text-white/60">Verified Authentic</p>
              </div>
              <div className="text-center">
                <Package className="w-8 h-8 text-gold mx-auto mb-2" />
                <p className="text-xs text-white/60">Insured Shipping</p>
              </div>
              <div className="text-center">
                <ShieldCheck className="w-8 h-8 text-gold mx-auto mb-2" />
                <p className="text-xs text-white/60">Buyer Protection</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
