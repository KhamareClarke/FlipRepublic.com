"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/utils";
import { getAccessToken } from "@/lib/supabase/session";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  TrendingUp,
  Package,
  DollarSign,
  Star,
  Plus,
  Eye,
  Edit,
  X,
  LogOut,
  MapPin,
} from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [offers, setOffers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [sellerProfile, setSellerProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadDashboard = async () => {
    const token = await getAccessToken();
    if (!token) {
      router.push("/login");
      setLoading(false);
      return;
    }

    // Check if user is a seller
    const profileResponse = await fetch("/api/profile", {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!profileResponse.ok) {
      router.push("/login");
      setLoading(false);
      return;
    }

    const { profile } = await profileResponse.json();
    if (!profile || (profile.role !== "seller" && profile.role !== "admin")) {
      // Not a seller, redirect to account page
      router.push("/account");
      setLoading(false);
      return;
    }
    
    // Store seller profile for display
    setSellerProfile(profile);

    const [statsResponse, payoutsResponse, productsResponse, offersResponse, ordersResponse] =
      await Promise.all([
        fetch("/api/dashboard", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/payouts", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/products?mine=true", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/offers", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/orders?view=seller", { headers: { Authorization: `Bearer ${token}` } }),
      ]);

    const statsData = await statsResponse.json();
    const payoutsData = await payoutsResponse.json();
    const productsData = await productsResponse.json();
    const offersData = await offersResponse.json();
    const ordersData = await ordersResponse.json();

    setStats([
      {
        label: "Total Revenue",
        value: formatPrice(statsData.stats?.totalRevenue ?? 0),
        icon: DollarSign,
        change: "Live",
      },
      {
        label: "Active Listings",
        value: (statsData.stats?.activeListings ?? 0).toString(),
        icon: Package,
        change: "Live",
      },
      {
        label: "Items Sold",
        value: (statsData.stats?.soldItems ?? 0).toString(),
        icon: TrendingUp,
        change: "Live",
      },
      {
        label: "Seller Rating",
        value: "4.9 / 5.0",
        icon: Star,
        change: "Live",
      },
    ]);
    setPayouts(payoutsData.payouts ?? []);
    setProducts(productsData.products ?? []);
    setOffers(offersData.offers ?? []);
    setOrders(ordersData.orders ?? []);
    setLoading(false);
  };

  useEffect(() => {
    loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreateListing = () => {
    window.location.href = "/dashboard/products/new";
  };

  const handleSignOut = async () => {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black py-24">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-white/60">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black py-20 sm:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6 mb-8 sm:mb-12">
          <div>
            <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl lg:text-6xl mb-2 font-bold">
              <span className="text-gradient-luxury">Seller Dashboard</span>
            </h1>
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2 sm:mt-3">
              {sellerProfile && (
                <>
                  <p className="text-white/70 font-light text-sm sm:text-base">
                    {sellerProfile.username || "Seller"}
                  </p>
                  {sellerProfile.email && (
                    <p className="text-white/50 text-xs sm:text-sm">{sellerProfile.email}</p>
                  )}
                  {sellerProfile.is_verified && (
                    <Badge variant="gold" className="flex items-center gap-1 text-xs">
                      <Star className="w-3 h-3" />
                      Verified
                    </Badge>
                  )}
                </>
              )}
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <Button size="lg" variant="primary" className="animate-glow w-full sm:w-auto" onClick={handleCreateListing}>
              <Plus className="w-5 h-5 mr-2" />
              List New Item
            </Button>
            <Button variant="outline" onClick={handleSignOut} className="w-full sm:w-auto">
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
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
                  <span className="text-white/40 text-sm">{stat.change}</span>
                </div>
                <p className="text-white/50 text-sm mb-2">{stat.label}</p>
                <p className="text-white text-3xl font-medium">{stat.value}</p>
              </motion.div>
            );
          })}
        </div>

        <div className="mb-12 sm:mb-16">
          <div className="flex items-center justify-between mb-6 sm:mb-8">
            <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl text-gold">Recent Payouts</h2>
          </div>
          <div className="bg-white/5 border border-white/10 overflow-hidden overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead className="bg-white/5">
                <tr>
                  <th className="text-left px-4 sm:px-6 py-3 sm:py-4 text-white/60 text-xs sm:text-sm font-medium uppercase tracking-wider">
                    Date
                  </th>
                  <th className="text-left px-4 sm:px-6 py-3 sm:py-4 text-white/60 text-xs sm:text-sm font-medium uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="text-left px-4 sm:px-6 py-3 sm:py-4 text-white/60 text-xs sm:text-sm font-medium uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-left px-4 sm:px-6 py-3 sm:py-4 text-white/60 text-xs sm:text-sm font-medium uppercase tracking-wider">
                    Method
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {payouts.length === 0 ? (
                  <tr>
                    <td className="px-4 sm:px-6 py-4 text-white/50 text-sm sm:text-base" colSpan={4}>
                      No payouts yet.
                    </td>
                  </tr>
                ) : (
                  payouts.map((payout) => (
                    <tr key={payout.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-4 sm:px-6 py-3 sm:py-4 text-white text-sm sm:text-base">
                        {new Date(payout.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4 text-gold font-medium text-sm sm:text-base">
                        {formatPrice(Number(payout.amount))}
                      </td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4">
                        <Badge variant="gold" className="text-xs">{payout.status}</Badge>
                      </td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4 text-white/60 text-sm sm:text-base">{payout.method}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mb-12 sm:mb-16">
          <div className="flex items-center justify-between mb-6 sm:mb-8">
            <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl text-gold">Active Listings</h2>
            <Button variant="outline" className="hidden sm:inline-flex">View All</Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {products.map((product, index) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-white/5 border border-white/10 overflow-hidden hover:border-gold/50 transition-colors"
              >
                <div className="relative aspect-square bg-white/5">
                  <img
                    src={
                      product.images?.[0]?.url ??
                      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80"
                    }
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
                    <span>Status: {product.status}</span>
                  </div>
                  <div className="flex space-x-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => router.push(`/dashboard/products/${product.id}/edit`)}
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                    {product.status === "active" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          if (!confirm("Mark this item as sold?")) return;
                          const token = await getAccessToken();
                          if (!token) return;
                          await fetch(`/api/products/${product.id}`, {
                            method: "PATCH",
                            headers: {
                              "Content-Type": "application/json",
                              Authorization: `Bearer ${token}`,
                            },
                            body: JSON.stringify({ status: "sold" }),
                          });
                          loadDashboard();
                        }}
                      >
                        Mark Sold
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        if (!confirm("Delete this listing? This cannot be undone.")) return;
                        const token = await getAccessToken();
                        if (!token) return;
                        await fetch(`/api/products/${product.id}`, {
                          method: "DELETE",
                          headers: {
                            Authorization: `Bearer ${token}`,
                          },
                        });
                        loadDashboard();
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
          <div className="bg-white/5 border border-white/10 p-4 sm:p-6">
            <h2 className="font-serif text-2xl sm:text-3xl text-gold mb-3 sm:mb-4">Offers</h2>
            {offers.length === 0 ? (
              <p className="text-white/50">No offers yet.</p>
            ) : (
              <div className="space-y-4">
                {offers.map((offer) => (
                  <div key={offer.id} className="border border-white/10 bg-white/5 p-3 sm:p-4 rounded">
                    <div className="flex items-start gap-3 sm:gap-4 mb-3">
                      {offer.product?.images?.[0]?.url && (
                        <img
                          src={offer.product.images[0].url}
                          alt={offer.product.name}
                          className="w-12 h-12 sm:w-16 sm:h-16 object-cover border border-white/20 flex-shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium text-sm sm:text-base truncate">{offer.product?.name ?? "Product"}</p>
                        <p className="text-white/50 text-xs mb-1">
                          {offer.product?.brand} • Listed: {formatPrice(Number(offer.product?.price || 0))}
                        </p>
                        {offer.buyer_email && (
                          <p className="text-white/40 text-xs truncate">Buyer: {offer.buyer_email}</p>
                        )}
                        <p className="text-white/40 text-xs mt-1">
                          {new Date(offer.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-3 border-t border-white/10">
                      <div>
                        <p className="text-white/50 text-xs mb-1">Offer Amount</p>
                        <p className="text-gold font-semibold text-base sm:text-lg">
                          {formatPrice(Number(offer.offer_price))}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Badge 
                          variant={
                            offer.status === "accepted" ? "gold" : 
                            offer.status === "rejected" ? "outline" : 
                            "outline"
                          }
                        >
                          {offer.status}
                        </Badge>
                        {offer.status === "pending" && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 sm:flex-none"
                              onClick={async () => {
                                const token = await getAccessToken();
                                if (!token) return;
                                await fetch(`/api/offers/${offer.id}`, {
                                  method: "PATCH",
                                  headers: {
                                    "Content-Type": "application/json",
                                    Authorization: `Bearer ${token}`,
                                  },
                                  body: JSON.stringify({ status: "accepted" }),
                                });
                                loadDashboard();
                              }}
                            >
                              Accept
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 sm:flex-none"
                              onClick={async () => {
                                const token = await getAccessToken();
                                if (!token) return;
                                await fetch(`/api/offers/${offer.id}`, {
                                  method: "PATCH",
                                  headers: {
                                    "Content-Type": "application/json",
                                    Authorization: `Bearer ${token}`,
                                  },
                                  body: JSON.stringify({ status: "rejected" }),
                                });
                                loadDashboard();
                              }}
                            >
                              Reject
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white/5 border border-white/10 p-4 sm:p-6">
            <h2 className="font-serif text-2xl sm:text-3xl text-gold mb-3 sm:mb-4">Orders</h2>
            {orders.length === 0 ? (
              <p className="text-white/50 text-sm sm:text-base">No orders yet.</p>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {orders.map((order) => (
                  <div key={order.id} className="border border-white/10 bg-white/5 rounded-lg p-3 sm:p-4 space-y-2 sm:space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-white font-medium mb-1">{order.product?.name ?? "Order"}</p>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant={order.status === "delivered" ? "gold" : order.status === "out_for_delivery" ? "outline" : "outline"}>
                            {order.status}
                          </Badge>
                          <span className="text-gold font-semibold">
                            {formatPrice(Number(order.amount))}
                          </span>
                        </div>
                        
                        {/* Shipping Address */}
                        {order.shipping_address && (
                          <div className="mt-3 pt-3 border-t border-white/10">
                            <p className="text-white/70 text-xs font-semibold mb-1 flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              Shipping Address:
                            </p>
                            <div className="text-white/60 text-xs space-y-0.5">
                              {order.buyer_name && <p className="font-medium">{order.buyer_name}</p>}
                              <p>{order.shipping_address}</p>
                              <p>
                                {order.shipping_city}
                                {order.shipping_postal_code && ` ${order.shipping_postal_code}`}
                              </p>
                              {order.shipping_country && <p>{order.shipping_country}</p>}
                              {order.shipping_phone && <p className="mt-1">Phone: {order.shipping_phone}</p>}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Order Status Update */}
                    {order.status !== "delivered" && order.status !== "cancelled" && (
                      <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-white/10">
                        <label className="text-white/70 text-xs self-center">Update Status:</label>
                        <select
                          value={order.status}
                          onChange={async (e) => {
                            const newStatus = e.target.value;
                            const token = await getAccessToken();
                            if (!token) return;
                            
                            try {
                              const response = await fetch(`/api/orders/${order.id}`, {
                                method: "PATCH",
                                headers: {
                                  "Content-Type": "application/json",
                                  Authorization: `Bearer ${token}`,
                                },
                                body: JSON.stringify({ status: newStatus }),
                              });
                              
                              if (response.ok) {
                                // Reload orders
                                loadDashboard();
                              }
                            } catch (error) {
                              console.error("Failed to update order status:", error);
                            }
                          }}
                          className="flex-1 bg-black border border-white/20 px-3 py-2 text-white text-sm focus:border-gold focus:outline-none"
                        >
                          <option value="paid">Paid</option>
                          <option value="out_for_delivery">Out for Delivery</option>
                          <option value="delivered">Delivered</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </div>
                    )}
                    
                    <p className="text-white/40 text-xs">
                      Order Date: {new Date(order.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
