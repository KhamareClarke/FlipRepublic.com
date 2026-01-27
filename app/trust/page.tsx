"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  ShieldCheck,
  Eye,
  Microscope,
  FileCheck,
  Lock,
  Award,
} from "lucide-react";

export default function TrustPage() {
  const [trustPillars, setTrustPillars] = useState<
    { id: string; title: string; description: string }[]
  >([]);

  useEffect(() => {
    const loadTrustPillars = async () => {
      const response = await fetch("/api/trust-pillars");
      const data = await response.json();
      setTrustPillars(data.trustPillars ?? []);
    };
    loadTrustPillars();
  }, []);

  const process = [
    {
      step: "01",
      title: "Initial Inspection",
      description:
        "Every item undergoes a comprehensive visual inspection by our trained specialists.",
      icon: Eye,
    },
    {
      step: "02",
      title: "Material Analysis",
      description:
        "We examine materials, stitching, hardware, and construction against verified authentic samples.",
      icon: Microscope,
    },
    {
      step: "03",
      title: "Documentation Review",
      description:
        "Original receipts, certificates, and provenance are verified when available.",
      icon: FileCheck,
    },
    {
      step: "04",
      title: "Authentication Seal",
      description:
        "Approved items receive our authentication certificate and are listed with full buyer protection.",
      icon: ShieldCheck,
    },
  ];

  const guarantees = trustPillars.length
    ? trustPillars.map((pillar, index) => ({
        icon: [ShieldCheck, Lock, Award][index % 3],
        title: pillar.title,
        description: pillar.description,
      }))
    : [
        {
          icon: ShieldCheck,
          title: "100% Authenticity Guarantee",
          description:
            "Every item is verified by expert authenticators. If any item is found to be inauthentic, you receive a full refund plus compensation.",
        },
        {
          icon: Lock,
          title: "Secure Transactions",
          description:
            "All payments are processed through encrypted channels. Your financial information is never stored or shared.",
        },
        {
          icon: Award,
          title: "Curated Sellers Only",
          description:
            "We maintain an invitation-only seller network. Every vendor is vetted, verified, and monitored for quality.",
        },
      ];

  return (
    <div className="min-h-screen bg-black py-24">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <h1 className="font-serif text-6xl md:text-7xl mb-6 font-bold">
            <span className="text-gradient-luxury">Authentication & Trust 🛡️</span>
          </h1>
          <p className="text-white/80 text-lg max-w-3xl mx-auto leading-relaxed font-light">
            ✨ Our authentication process is the foundation of FlipRepublic. Every item
            is rigorously verified by industry experts before it reaches our marketplace.
          </p>
        </motion.div>

        <div className="relative mb-32">
          <div className="absolute inset-0 bg-gradient-to-b from-black via-transparent to-black z-10" />
          <div className="relative aspect-[21/9] overflow-hidden">
            <Image
              src="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1920&q=80"
              alt="Authentication Process"
              fill
              className="object-cover opacity-40"
            />
          </div>
        </div>

        <div className="mb-32">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="font-serif text-5xl text-gold mb-6">
              Our Authentication Process
            </h2>
            <p className="text-white/60 text-lg max-w-2xl mx-auto">
              A multi-stage verification system designed to eliminate counterfeits
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {process.map((item, index) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.step}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="bg-white/5 border border-white/10 p-8 hover:border-gold/50 transition-colors"
                >
                  <div className="flex items-start space-x-6">
                    <div className="flex-shrink-0">
                      <div className="w-16 h-16 border-2 border-gold flex items-center justify-center">
                        <span className="font-serif text-2xl text-gold">
                          {item.step}
                        </span>
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        <Icon className="w-6 h-6 text-gold" />
                        <h3 className="text-white text-xl font-medium">
                          {item.title}
                        </h3>
                      </div>
                      <p className="text-white/60 leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        <div className="mb-32">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="font-serif text-5xl text-gold mb-6">
              Your Protection
            </h2>
            <p className="text-white/60 text-lg max-w-2xl mx-auto">
              We stand behind every item with comprehensive guarantees
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {guarantees.map((guarantee, index) => {
              const Icon = guarantee.icon;
              return (
                <motion.div
                  key={guarantee.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="text-center"
                >
                  <div className="inline-flex items-center justify-center w-20 h-20 border-2 border-gold rounded-full mb-6">
                    <Icon className="w-10 h-10 text-gold" />
                  </div>
                  <h3 className="text-white text-xl font-medium mb-4">
                    {guarantee.title}
                  </h3>
                  <p className="text-white/60 leading-relaxed">
                    {guarantee.description}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="bg-gold/10 border border-gold/30 p-12 text-center"
        >
          <ShieldCheck className="w-16 h-16 text-gold mx-auto mb-6" />
          <h2 className="font-serif text-4xl mb-4 font-bold">
            <span className="shimmer-text">Zero Tolerance for Counterfeits 🚫</span>
          </h2>
          <p className="text-white/70 text-lg mb-8 max-w-2xl mx-auto leading-relaxed">
            We maintain the highest standards in the industry. Any seller found
            listing counterfeit items is permanently banned, and all affected buyers
            are fully compensated.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/marketplace">
              <Button variant="primary" size="lg">
                Access Marketplace
              </Button>
            </Link>
            <Link href="/apply">
              <Button variant="outline" size="lg">
                Apply to Sell
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
