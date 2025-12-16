"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/utils";
import { products } from "@/lib/data";
import {
  TrendingUp,
  Package,
  DollarSign,
  Star,
  Plus,
  Eye,
  Edit,
} from "lucide-react";

export default function DashboardPage() {
  const sellerProducts = products.slice(0, 4);
  const totalRevenue = 45680;
  const activeListings = 12;
  const soldItems = 34;
  const rating = 4.9;

  const stats = [
    {
      label: "Total Revenue",
      value: formatPrice(totalRevenue),
      icon: DollarSign,
      change: "+12.5%",
    },
    {
      label: "Active Listings",
      value: activeListings.toString(),
      icon: Package,
      change: "+3",
    },
    {
      label: "Items Sold",
      value: soldItems.toString(),
      icon: TrendingUp,
      change: "+8",
    },
    {
      label: "Seller Rating",
      value: `${rating} / 5.0`,
      icon: Star,
      change: "+0.2",
    },
  ];

  return (
    <div className="min-h-screen bg-black py-24">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between mb-12">
          <div>
            <h1 className="font-serif text-6xl mb-2 font-bold">
              <span className="text-gradient-luxury">Seller Dashboard 📊</span>
            </h1>
            <p className="text-white/70 font-light">✨ Manage your listings and track performance</p>
          </div>
          <Button size="lg" variant="primary" className="animate-glow">
            <Plus className="w-5 h-5 mr-2" />
            ✨ List New Item
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-white/5 border border-white/10 p-6 hover:border-gold/50 transition-colors"
              >
                <div className="flex items-center justify-between mb-4">
                  <Icon className="w-8 h-8 text-gold" />
                  <span className="text-green-400 text-sm">{stat.change}</span>
                </div>
                <p className="text-white/50 text-sm mb-2">{stat.label}</p>
                <p className="text-white text-3xl font-medium">{stat.value}</p>
              </motion.div>
            );
          })}
        </div>

        <div className="mb-16">
          <div className="flex items-center justify-between mb-8">
            <h2 className="font-serif text-4xl text-gold">Recent Payouts</h2>
          </div>
          <div className="bg-white/5 border border-white/10 overflow-hidden">
            <table className="w-full">
              <thead className="bg-white/5">
                <tr>
                  <th className="text-left px-6 py-4 text-white/60 text-sm font-medium uppercase tracking-wider">
                    Date
                  </th>
                  <th className="text-left px-6 py-4 text-white/60 text-sm font-medium uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="text-left px-6 py-4 text-white/60 text-sm font-medium uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-left px-6 py-4 text-white/60 text-sm font-medium uppercase tracking-wider">
                    Method
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {[
                  { date: "Dec 15, 2024", amount: 2450, status: "Completed", method: "Bank Transfer" },
                  { date: "Dec 8, 2024", amount: 1890, status: "Completed", method: "Bank Transfer" },
                  { date: "Dec 1, 2024", amount: 3200, status: "Completed", method: "Bank Transfer" },
                ].map((payout, index) => (
                  <tr key={index} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 text-white">{payout.date}</td>
                    <td className="px-6 py-4 text-gold font-medium">
                      {formatPrice(payout.amount)}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="gold">{payout.status}</Badge>
                    </td>
                    <td className="px-6 py-4 text-white/60">{payout.method}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-8">
            <h2 className="font-serif text-4xl text-gold">Active Listings</h2>
            <Button variant="outline">View All</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {sellerProducts.map((product, index) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-white/5 border border-white/10 overflow-hidden hover:border-gold/50 transition-colors"
              >
                <div className="relative aspect-square bg-white/5">
                  <img
                    src={product.images[0]}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-4 space-y-3">
                  <div>
                    <p className="text-white/50 text-xs uppercase mb-1">
                      {product.brand}
                    </p>
                    <h3 className="text-white font-medium text-sm line-clamp-2">
                      {product.name}
                    </h3>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gold font-medium">
                      {formatPrice(product.price)}
                    </span>
                    <Badge variant="outline">{product.condition}</Badge>
                  </div>
                  <div className="flex items-center space-x-2 text-xs text-white/40">
                    <Eye className="w-4 h-4" />
                    <span>124 views</span>
                  </div>
                  <div className="flex space-x-2 pt-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
