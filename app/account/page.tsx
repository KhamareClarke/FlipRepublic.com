"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/product-card";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { getAccessToken } from "@/lib/supabase/session";
import { formatPrice } from "@/lib/utils";

type SavedProductItem = {
  product: any;
  created_at: string;
};

type OrderItem = {
  id: string;
  product_id: string;
  amount: number;
  status: string;
  created_at: string;
  product: any;
  seller: { username: string | null } | null;
};

type OfferItem = {
  id: string;
  product_id: string;
  offer_price: number;
  status: string;
  created_at: string;
  product: any;
  seller: { username: string | null } | null;
};

export default function AccountPage() {
  const router = useRouter();
  const [savedProducts, setSavedProducts] = useState<SavedProductItem[]>([]);
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [approvedOffers, setApprovedOffers] = useState<OfferItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<OfferItem | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [addressData, setAddressData] = useState({
    name: "",
    address: "",
    city: "",
    postalCode: "",
    country: "United Kingdom",
    phone: "",
  });

  useEffect(() => {
    const loadAccount = async () => {
      const supabase = createSupabaseBrowserClient();
      
      // Check if user is authenticated
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        // Not logged in - redirect to login with return URL
        router.push("/login?redirect=/account");
        setLoading(false);
        return;
      }
      
      setIsAuthenticated(true);
      const token = session.access_token;
      
      if (!token) {
        router.push("/login?redirect=/account");
        setLoading(false);
        return;
      }

      // Check if user is a seller - redirect to dashboard
      try {
        const profileResponse = await fetch("/api/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        if (profileResponse.ok) {
          const { profile } = await profileResponse.json();
          if (profile?.role === "seller" || profile?.role === "admin") {
            // Seller or admin - redirect to dashboard
            router.push("/dashboard");
            setLoading(false);
            return;
          }
        }
      } catch (error) {
        console.error("Error checking user role:", error);
        // Continue loading account page if check fails
      }

      const [savedResponse, ordersResponse, offersResponse] = await Promise.all([
        fetch("/api/saved-products", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/orders", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/offers", { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      const savedData = await savedResponse.json();
      const ordersData = await ordersResponse.json();
      const offersData = await offersResponse.json();
      
      setSavedProducts(savedData.savedProducts ?? []);
      setOrders(ordersData.orders ?? []);
      
      // Filter only accepted offers for the buyer (offers API returns offers where user is buyer or seller)
      // We only want offers where the user is the buyer and status is accepted
      const acceptedOffers = (offersData.offers ?? []).filter(
        (offer: any) => offer.status === "accepted" && offer.buyer_id
      );
      setApprovedOffers(acceptedOffers);
      setLoading(false);
    };

    loadAccount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSignOut = async () => {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black py-24">
        <div className="max-w-6xl mx-auto px-6">
          <p className="text-white/60">Loading account...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-black py-20 sm:py-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-12 sm:space-y-16">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 sm:gap-6">
          <div>
            <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold">
              <span className="text-gradient-luxury">Your Account</span>
            </h1>
            <p className="text-white/70 text-sm sm:text-base mt-1">Saved items, purchases, and account controls.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <Link href="/marketplace" className="w-full sm:w-auto">
              <Button variant="outline" className="w-full sm:w-auto">Browse Marketplace</Button>
            </Link>
            <Button variant="primary" onClick={handleSignOut} className="w-full sm:w-auto">
              Sign Out
            </Button>
          </div>
        </div>

        <section className="space-y-4 sm:space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-2xl sm:text-3xl text-gold">Saved Products</h2>
            {savedProducts.length > 0 && (
              <p className="text-white/50 text-xs sm:text-sm">{savedProducts.length} saved</p>
            )}
          </div>
          {savedProducts.length === 0 ? (
            <div className="text-center py-12 border border-white/10 bg-white/5 rounded">
              <p className="text-white/50 mb-4">No saved products yet.</p>
              <Link href="/marketplace">
                <Button variant="outline">Browse Marketplace</Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {savedProducts.map((item) =>
                item.product ? (
                  <div key={item.product.id} className="relative group">
                    <ProductCard product={item.product} />
                    <Button
                      variant="outline"
                      size="sm"
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={async () => {
                        const token = await getAccessToken();
                        if (!token) return;
                        await fetch(`/api/saved-products?productId=${item.product.id}`, {
                          method: "DELETE",
                          headers: { Authorization: `Bearer ${token}` },
                        });
                        setSavedProducts(savedProducts.filter((p) => p.product?.id !== item.product.id));
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                ) : null
              )}
            </div>
          )}
        </section>

        {approvedOffers.length > 0 && (
          <section className="space-y-4 sm:space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-2xl sm:text-3xl text-gold">Approved Offers</h2>
              <p className="text-white/50 text-xs sm:text-sm">{approvedOffers.length} pending payment</p>
            </div>
            <div className="space-y-3 sm:space-y-4">
              {approvedOffers.map((offer) => {
                const productData = offer.product?.product || offer.product;
                const productId = offer.product_id || productData?.id;
                return (
                  <div
                    key={offer.id}
                    className="p-4 sm:p-6 border-2 border-gold/50 bg-gold/10 rounded-lg space-y-3 sm:space-y-4"
                  >
                    <div className="flex flex-col md:flex-row gap-3 sm:gap-4">
                      <div className="flex-shrink-0">
                        <img
                          src={
                            productData?.images?.[0]?.url ||
                            "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200&q=80"
                          }
                          alt={productData?.name || "Product"}
                          className="w-24 h-24 object-cover border border-gold/30"
                        />
                      </div>
                      <div className="flex-1 space-y-2">
                        <p className="text-gold font-semibold text-lg">
                          🎉 Your offer amount is accepted!
                        </p>
                        <p className="text-white font-medium">
                          {productData?.name || "Product"}
                        </p>
                        <p className="text-white/70 text-sm">
                          {productData?.brand} • {productData?.condition} • Size {productData?.size}
                        </p>
                        <p className="text-white/50 text-sm">
                          Agreed Price: <span className="text-gold font-semibold">{formatPrice(Number(offer.offer_price))}</span>
                        </p>
                        <p className="text-white/60 text-xs">
                          Offer accepted on {new Date(offer.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center">
                        <Button
                          variant="primary"
                          size="lg"
                          onClick={() => {
                            setSelectedOffer(offer);
                            setShowAddressForm(true);
                            setPurchaseError(null);
                          }}
                          className="w-full sm:w-auto"
                        >
                          Proceed to Payment
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <section className="space-y-4 sm:space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-2xl sm:text-3xl text-gold">Order History</h2>
            {orders.length > 0 && (
              <p className="text-white/50 text-xs sm:text-sm">{orders.length} orders</p>
            )}
          </div>
          {orders.length === 0 ? (
            <div className="text-center py-8 sm:py-12 border border-white/10 bg-white/5 rounded">
              <p className="text-white/50 mb-4 text-sm sm:text-base">No orders yet.</p>
              <Link href="/marketplace">
                <Button variant="outline" className="w-full sm:w-auto">Browse Marketplace</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {orders.map((order) => (
                <Link
                  key={order.id}
                  href={`/product/${order.product_id}`}
                  className="flex flex-col md:flex-row gap-3 sm:gap-4 p-4 sm:p-6 border border-white/10 bg-white/5 hover:border-gold/50 transition-colors"
                >
                  <div className="flex-shrink-0">
                    <img
                      src={
                        order.product?.images?.[0]?.url ||
                        "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200&q=80"
                      }
                      alt={order.product?.name}
                      className="w-20 h-20 sm:w-24 sm:h-24 object-cover border border-white/20"
                    />
                  </div>
                  <div className="flex-1 flex flex-col md:flex-row md:items-center md:justify-between gap-3 sm:gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium mb-1 text-sm sm:text-base truncate">
                        {order.product?.name ?? "Order"}
                      </p>
                      <p className="text-white/50 text-xs sm:text-sm mb-2">
                        {order.product?.brand} • {order.product?.condition} • Size {order.product?.size}
                      </p>
                      <p className="text-white/40 text-xs">
                        Seller: {order.seller?.username ?? "Verified Seller"} •{" "}
                        {new Date(order.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 sm:gap-6">
                      <div className="text-right">
                        <p className="text-gold font-semibold text-base sm:text-lg">
                          {formatPrice(Number(order.amount))}
                        </p>
                        <p className="text-white/60 text-xs uppercase tracking-wider mt-1">
                          {order.status}
                        </p>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Address Collection Modal */}
        {showAddressForm && selectedOffer && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 sm:p-6">
            <div className="bg-black border-2 border-gold rounded-lg p-4 sm:p-6 max-w-md w-full space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-serif text-2xl text-gold">Shipping Address</h2>
                <button
                  onClick={() => {
                    setShowAddressForm(false);
                    setPurchaseError(null);
                    setSelectedOffer(null);
                  }}
                  className="text-white/60 hover:text-white text-xl"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-white/70 text-sm mb-2">Full Name *</label>
                  <input
                    type="text"
                    value={addressData.name}
                    onChange={(e) => setAddressData({ ...addressData, name: e.target.value })}
                    className="w-full bg-black border border-white/20 px-4 py-2 text-white focus:border-gold focus:outline-none"
                    placeholder="John Doe"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-white/70 text-sm mb-2">Street Address *</label>
                  <input
                    type="text"
                    value={addressData.address}
                    onChange={(e) => setAddressData({ ...addressData, address: e.target.value })}
                    className="w-full bg-black border border-white/20 px-4 py-2 text-white focus:border-gold focus:outline-none"
                    placeholder="123 Main Street"
                    required
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-white/70 text-sm mb-2">City *</label>
                    <input
                      type="text"
                      value={addressData.city}
                      onChange={(e) => setAddressData({ ...addressData, city: e.target.value })}
                      className="w-full bg-black border border-white/20 px-4 py-2 text-white focus:border-gold focus:outline-none"
                      placeholder="London"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-white/70 text-sm mb-2">Postal Code *</label>
                    <input
                      type="text"
                      value={addressData.postalCode}
                      onChange={(e) => setAddressData({ ...addressData, postalCode: e.target.value })}
                      className="w-full bg-black border border-white/20 px-4 py-2 text-white focus:border-gold focus:outline-none"
                      placeholder="SW1A 1AA"
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-white/70 text-sm mb-2">Country</label>
                  <input
                    type="text"
                    value={addressData.country}
                    onChange={(e) => setAddressData({ ...addressData, country: e.target.value })}
                    className="w-full bg-black border border-white/20 px-4 py-2 text-white focus:border-gold focus:outline-none"
                    placeholder="United Kingdom"
                  />
                </div>
                
                <div>
                  <label className="block text-white/70 text-sm mb-2">Phone Number</label>
                  <input
                    type="tel"
                    value={addressData.phone}
                    onChange={(e) => setAddressData({ ...addressData, phone: e.target.value })}
                    className="w-full bg-black border border-white/20 px-4 py-2 text-white focus:border-gold focus:outline-none"
                    placeholder="+44 20 1234 5678"
                  />
                </div>
              </div>
              
              {purchaseError && (
                <div className="p-3 rounded text-sm bg-red-900/20 border border-red-500/50 text-red-400">
                  ❌ {purchaseError}
                </div>
              )}
              
              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowAddressForm(false);
                    setPurchaseError(null);
                    setSelectedOffer(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  className="flex-1"
                  onClick={async () => {
                    if (!addressData.name || !addressData.address || !addressData.city || !addressData.postalCode) {
                      setPurchaseError("Please fill in all required address fields.");
                      return;
                    }

                    setPurchasing(true);
                    setPurchaseError(null);

                    try {
                      const token = await getAccessToken();
                      if (!token) {
                        window.location.href = "/login?redirect=/account";
                        return;
                      }

                      const productId = selectedOffer.product_id || selectedOffer.product?.id;
                      if (!productId) {
                        setPurchaseError("Product ID not found.");
                        setPurchasing(false);
                        return;
                      }

                      const response = await fetch("/api/checkout", {
                        method: "POST",
                        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                        body: JSON.stringify({ 
                          productId,
                          amount: selectedOffer.offer_price,
                          shippingAddress: addressData.address,
                          shippingCity: addressData.city,
                          shippingPostalCode: addressData.postalCode,
                          shippingCountry: addressData.country,
                          shippingPhone: addressData.phone,
                          buyerName: addressData.name,
                        }),
                      });
                      
                      const data = await response.json();

                      if (!response.ok) {
                        throw new Error(data.error || "Failed to create order");
                      }

                      if (data.url) {
                        window.location.href = data.url;
                      } else if (data.success) {
                        // Free payment - redirect to success page
                        window.location.href = data.url || `/checkout/success?order_id=${data.order?.id}`;
                      } else {
                        throw new Error("No redirect URL received");
                      }
                    } catch (error: any) {
                      console.error("Purchase error:", error);
                      setPurchaseError(error.message || "Failed to complete purchase. Please try again.");
                      setPurchasing(false);
                    }
                  }}
                  disabled={purchasing}
                >
                  {purchasing ? "Processing..." : "Complete Purchase"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
