"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/utils";
import { ShieldCheck, Award, Package, ArrowLeft, Heart, Handshake, MessageCircle } from "lucide-react";
import { getAccessToken } from "@/lib/supabase/session";
import { ProductReviewsSection } from "@/components/product-reviews";
import { SellerVerificationCallout } from "@/components/seller-verification-callout";

function pickLatestOfferForProduct(offers: any[] | undefined, productId: string) {
  const forProduct = (offers ?? []).filter(
    (offer: any) =>
      offer.product_id === productId ||
      offer.product?.id === productId ||
      (typeof offer.product === "object" && offer.product?.id === productId)
  );
  if (forProduct.length === 0) return null;
  return forProduct.reduce((latest: any, o: any) => {
    const t = new Date(o.created_at).getTime();
    const lt = new Date(latest.created_at).getTime();
    return t > lt ? o : latest;
  });
}

export default function ProductPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [selectedImage, setSelectedImage] = useState(0);
  const [product, setProduct] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [offerPrice, setOfferPrice] = useState("");
  const [offerSubmitting, setOfferSubmitting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [userOffer, setUserOffer] = useState<any | null>(null);
  const [offerMessage, setOfferMessage] = useState<string | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [isSeller, setIsSeller] = useState(false);
  const [msgThreadLoading, setMsgThreadLoading] = useState(false);
  const [addressData, setAddressData] = useState({
    name: "",
    address: "",
    city: "",
    postalCode: "",
    country: "United Kingdom",
    phone: "",
  });
  const [checkoutCoupon, setCheckoutCoupon] = useState("");
  const [couponPreview, setCouponPreview] = useState<{ discount: number; final: number } | null>(null);
  const [couponApplyLoading, setCouponApplyLoading] = useState(false);
  const images = product?.images ?? [];

  const inStock =
    product &&
    product.status === "active" &&
    (product.track_inventory === false || Number(product.stock_quantity ?? 0) > 0);

  const subtotalForCheckout =
    userOffer && userOffer.status === "accepted"
      ? Number(userOffer.offer_price)
      : product
        ? Number(product.price)
        : 0;

  useEffect(() => {
    const loadProduct = async () => {
      const response = await fetch(`/api/products/${params.id}`);
      const data = await response.json();
      setProduct(data.product ?? null);
      setLoading(false);
    };

    loadProduct();
  }, [params.id]);

  useEffect(() => {
    if (!params.id) return;
    fetch("/api/analytics/product-view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: params.id }),
    }).catch(() => {});
  }, [params.id]);

  useEffect(() => {
    const loadSaved = async () => {
      const token = await getAccessToken();
      if (!token) {
        return;
      }

      // Check if user is a seller
      const profileResponse = await fetch("/api/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (profileResponse.ok) {
        const { profile } = await profileResponse.json();
        if (profile?.role === "seller" || profile?.role === "admin") {
          setIsSeller(true);
          // Sellers can't make offers or purchases, so don't load offers
          return;
        }
      }

      const [savedResponse, offersResponse] = await Promise.all([
        fetch("/api/saved-products", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/offers", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const savedData = await savedResponse.json();
      const offersData = await offersResponse.json();
      
      const savedItems = savedData.savedProducts ?? [];
      setSaved(savedItems.some((item: any) => item.product?.id === params.id));
      
      const myOffer = pickLatestOfferForProduct(offersData.offers, params.id);
      setUserOffer(myOffer);
    };

    loadSaved();
  }, [params.id]);

  const handlePurchase = async (useOfferPrice?: number) => {
    if (isSeller) {
      setPurchaseError("Sellers cannot purchase items. This is preview mode only.");
      return;
    }
    
    setPurchasing(true);
    setPurchaseError(null);
    
    try {
      const token = await getAccessToken();
      if (!token) {
        window.location.href = "/login?redirect=/product/" + params.id;
        return;
      }

      // Validate address
      if (!addressData.name || !addressData.address || !addressData.city || !addressData.postalCode) {
        setPurchaseError("Please fill in all required address fields.");
        setPurchasing(false);
        return;
      }

      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          productId: product.id,
          amount: useOfferPrice,
          shippingAddress: addressData.address,
          shippingCity: addressData.city,
          shippingPostalCode: addressData.postalCode,
          shippingCountry: addressData.country,
          shippingPhone: addressData.phone,
          buyerName: addressData.name,
          couponCode: checkoutCoupon.trim() || undefined,
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
  };

  const handleOffer = async () => {
    if (isSeller) {
      setOfferMessage("⚠️ Sellers cannot make offers. This is preview mode only.");
      setTimeout(() => setOfferMessage(null), 3000);
      return;
    }

    const token = await getAccessToken();
    if (!token) {
      window.location.href = "/login?redirect=/product/" + params.id;
      return;
    }

    const amount = Number(offerPrice);
    if (!offerPrice || Number.isNaN(amount) || amount < 1) {
      setOfferMessage("❌ Enter a valid offer of at least £1.");
      setTimeout(() => setOfferMessage(null), 4000);
      return;
    }

    const listPrice = Number(product.price);
    if (!Number.isNaN(listPrice) && amount >= listPrice) {
      setOfferMessage("❌ Your offer must be below the list price. Use Purchase Now to pay the listed amount.");
      setTimeout(() => setOfferMessage(null), 5000);
      return;
    }

    setOfferSubmitting(true);
    setOfferMessage("Submitting offer…");

    try {
      const response = await fetch("/api/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          productId: product.id,
          offerPrice: amount,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setOfferMessage("✅ Offer submitted. The seller will be notified—you will get an email when they respond.");
        setOfferPrice("");
        const offersResponse = await fetch("/api/offers", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const offersData = await offersResponse.json();
        setUserOffer(pickLatestOfferForProduct(offersData.offers, product.id));
        setTimeout(() => setOfferMessage(null), 6000);
      } else if (data.code === "DUPLICATE_OFFER") {
        setOfferMessage("⚠️ You already have a pending offer on this product. Wait for the seller to respond.");
        setTimeout(() => setOfferMessage(null), 6000);
      } else if (data.code === "OFFER_ALREADY_ACCEPTED") {
        setOfferMessage("⚠️ You already have an accepted offer. Complete checkout from this page.");
        setTimeout(() => setOfferMessage(null), 6000);
      } else {
        setOfferMessage(`❌ ${data.error || "Failed to submit offer"}`);
        setTimeout(() => setOfferMessage(null), 6000);
      }
    } finally {
      setOfferSubmitting(false);
    }
  };

  const applyOfferPercent = (pct: number) => {
    const list = Number(product?.price);
    if (Number.isNaN(list) || list <= 0) return;
    const raw = Math.floor(list * pct * 100) / 100;
    const capped = Math.max(1, Math.min(raw, list - 0.01));
    setOfferPrice(capped.toFixed(2));
  };

  const handleMessageSeller = async () => {
    if (isSeller || !product?.seller?.user_id) return;
    const token = await getAccessToken();
    if (!token) {
      window.location.href = "/login?redirect=/product/" + params.id;
      return;
    }
    setMsgThreadLoading(true);
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          otherUserId: product.seller.user_id,
          productId: product.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        console.error(data.error || "conversation failed");
        return;
      }
      router.push(`/messages?c=${data.conversationId}`);
    } finally {
      setMsgThreadLoading(false);
    }
  };

  const toggleSaved = async () => {
    const token = await getAccessToken();
    if (!token) {
      window.location.href = "/login?redirect=/product/" + params.id;
      return;
    }

    // If already saved, show message
    if (saved) {
      setSaveMessage("⚠️ This product is already saved!");
      setTimeout(() => setSaveMessage(null), 3000);
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/saved-products", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ productId: product.id }),
      });

      if (response.ok) {
        setSaved(true);
        setSaveMessage("✅ Product saved!");
        setTimeout(() => setSaveMessage(null), 3000);
      } else {
        const data = await response.json();
        setSaveMessage(`❌ ${data.error || "Failed to save product"}`);
        setTimeout(() => setSaveMessage(null), 3000);
      }
    } catch (error) {
      setSaveMessage("❌ Failed to save product");
      setTimeout(() => setSaveMessage(null), 3000);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-white/60">Loading product...</p>
        </div>
      </div>
    );
  }

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
    <div className="min-h-screen bg-black py-20 sm:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <Link
          href="/marketplace"
          className="inline-flex items-center space-x-2 text-white/60 hover:text-gold transition-colors mb-6 sm:mb-8 md:mb-12 text-sm sm:text-base"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Marketplace</span>
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 lg:gap-16">
          <div className="space-y-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="relative aspect-square bg-white/5 overflow-hidden"
            >
              <Image
                src={
                  images[selectedImage]?.url ??
                  product.images?.[selectedImage] ??
                  "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80"
                }
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

            {images.length > 1 && (
              <div className="grid grid-cols-4 sm:grid-cols-4 gap-2 sm:gap-4">
                {images.map((image: any, index: number) => (
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
                      src={image.url ?? image}
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
              <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl lg:text-5xl mb-3 sm:mb-4 font-bold">
                <span className="text-gradient-luxury">{product.name}</span>
              </h1>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <Badge variant="gold" className="text-xs sm:text-sm">{product.condition}</Badge>
                <Badge variant="outline" className="text-xs sm:text-sm">{product.size}</Badge>
                {product.category?.name && <Badge variant="outline" className="text-xs sm:text-sm">{product.category.name}</Badge>}
              </div>
            </div>

            <div className="border-t border-b border-white/10 py-4 sm:py-6">
              <div className="flex items-baseline space-x-3 sm:space-x-4 mb-6 sm:mb-8">
                <span className="text-3xl sm:text-4xl md:text-5xl font-bold text-gradient-gold">
                  {formatPrice(product.price)}
                </span>
                {product.originalPrice && (
                  <span className="text-xl sm:text-2xl text-white/30 line-through font-light">
                    {formatPrice(product.originalPrice)}
                  </span>
                )}
              </div>
              {product.status === "active" && !inStock && (
                <p className="text-sm text-red-400/90 mb-2">Currently out of stock.</p>
              )}
              {(product.sku || product.track_inventory !== false) && (
                <p className="text-xs text-white/50">
                  {product.sku ? <>SKU: {product.sku}</> : null}
                  {product.sku && product.track_inventory !== false ? " · " : null}
                  {product.track_inventory !== false ? (
                    <span className={Number(product.stock_quantity) <= 3 ? "text-gold" : ""}>
                      Stock: {product.stock_quantity ?? 1}
                    </span>
                  ) : null}
                </p>
              )}
            </div>

            <div className="space-y-4">
              {/* Show message for sellers - preview only */}
              {isSeller ? (
                <div className="bg-white/5 border border-white/10 rounded-lg p-6 text-center">
                  <p className="text-white/70 text-sm mb-2">👀 Preview Mode</p>
                  <p className="text-white/50 text-xs">
                    As a seller, you can view listings for reference but cannot make offers or purchases.
                  </p>
                </div>
              ) : (
                <>
              {/* Show approved offer with purchase option */}
              {userOffer && userOffer.status === "accepted" ? (
                <div className="bg-gold/10 border-2 border-gold rounded-lg p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gold font-semibold mb-1">Your Offer Was Accepted! 🎉</p>
                      <p className="text-white/70 text-sm">Agreed Price: {formatPrice(Number(userOffer.offer_price))}</p>
                    </div>
                    <Badge variant="gold">Accepted</Badge>
                  </div>
                  <Button
                    size="lg"
                    variant="primary"
                    className="w-full"
                    onClick={() => setShowAddressForm(true)}
                    disabled={purchasing || !inStock}
                  >
                    Purchase Now at {formatPrice(Number(userOffer.offer_price))}
                  </Button>
                  {purchaseError && (
                    <div className="p-3 rounded text-sm bg-red-900/20 border border-red-500/50 text-red-400">
                      ❌ {purchaseError}
                    </div>
                  )}
                </div>
              ) : userOffer && userOffer.status === "pending" ? (
                <div className="bg-white/5 border border-white/10 rounded-lg p-5 space-y-2">
                  <p className="text-white/70 text-sm">Your offer is with the seller</p>
                  <p className="text-gold font-semibold text-lg">{formatPrice(Number(userOffer.offer_price))}</p>
                  <p className="text-white/50 text-xs leading-relaxed">
                    You will receive an email when they accept or decline. List price remains{" "}
                    {formatPrice(Number(product.price))}.
                  </p>
                </div>
              ) : (
                <>
                  <Button
                    size="lg"
                    variant="primary"
                    className="w-full"
                    onClick={() => setShowAddressForm(true)}
                    disabled={!inStock || purchasing}
                  >
                    {inStock ? "Purchase Now" : "Out of stock"}
                  </Button>

                  {userOffer?.status === "rejected" && (
                    <div className="rounded-lg border border-white/15 bg-white/[0.04] p-4 text-sm text-white/70">
                      <p className="font-medium text-white mb-1">Previous offer declined</p>
                      <p>
                        Your offer of {formatPrice(Number(userOffer.offer_price))} was not accepted. You can
                        place a new offer below or buy at the list price.
                      </p>
                    </div>
                  )}

                  {(userOffer?.status === "countered" || userOffer?.status === "withdrawn") && (
                    <div className="rounded-lg border border-gold/30 bg-gold/5 p-4 text-xs text-white/70">
                      {userOffer.status === "withdrawn"
                        ? "This offer was withdrawn. You can submit a new offer if the listing is still active."
                        : "This offer was updated or countered. Check your email or account for the latest status before sending another offer."}
                    </div>
                  )}

                  <div className="glass-effect rounded-lg p-5 sm:p-6 space-y-4 border border-gold/20">
                    <div className="flex items-start gap-3">
                      <div className="rounded-full bg-gold/10 p-2.5 shrink-0">
                        <Handshake className="w-5 h-5 text-gold" />
                      </div>
                      <div>
                        <h3 className="font-serif text-lg text-gradient-gold font-semibold tracking-tight">
                          Make an offer
                        </h3>
                        <p className="text-white/55 text-xs sm:text-sm mt-1 leading-relaxed">
                          Negotiate privately with the seller. Offers must be below the list price. Sign in to
                          submit—sellers respond from their dashboard.
                        </p>
                      </div>
                    </div>

                    {product.status === "active" && Number(product.price) > 1 && (
                      <div className="flex flex-wrap gap-2">
                        <span className="text-[10px] uppercase tracking-wider text-white/40 w-full sm:w-auto sm:mr-2">
                          Quick offer
                        </span>
                        {[
                          { label: "85%", pct: 0.85 },
                          { label: "90%", pct: 0.9 },
                          { label: "95%", pct: 0.95 },
                        ].map(({ label, pct }) => (
                          <button
                            key={label}
                            type="button"
                            onClick={() => applyOfferPercent(pct)}
                            disabled={offerSubmitting}
                            className="rounded-md border border-white/15 bg-black/40 px-3 py-1.5 text-xs text-white/80 hover:border-gold/50 hover:text-gold transition-colors disabled:opacity-40"
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="flex-1 space-y-1.5">
                        <label htmlFor="offer-amount" className="sr-only">
                          Offer amount in GBP
                        </label>
                        <input
                          id="offer-amount"
                          type="number"
                          inputMode="decimal"
                          min={1}
                          step="0.01"
                          value={offerPrice}
                          onChange={(event) => setOfferPrice(event.target.value)}
                          className="w-full bg-black border border-white/20 px-4 py-3 text-white text-sm sm:text-base focus:border-gold focus:outline-none transition-colors rounded-md"
                          placeholder="Your offer (£)"
                        />
                      </div>
                      <Button
                        size="lg"
                        variant="outline"
                        onClick={handleOffer}
                        disabled={!offerPrice || !inStock || product.status !== "active" || offerSubmitting}
                        className="w-full sm:w-auto shrink-0 border-gold/40"
                      >
                        {offerSubmitting ? "Sending…" : "Submit offer"}
                      </Button>
                    </div>
                  </div>

                  {offerMessage && (
                    <div
                      className={`p-3 rounded-md text-sm border ${
                        offerMessage.includes("✅")
                          ? "bg-green-900/20 border-green-500/50 text-green-400"
                          : offerMessage.includes("⚠️")
                            ? "bg-yellow-900/20 border-yellow-500/50 text-yellow-400"
                            : offerMessage.startsWith("Submitting")
                              ? "bg-white/5 border-white/20 text-white/70"
                              : "bg-red-900/20 border-red-500/50 text-red-400"
                      }`}
                    >
                      {offerMessage}
                    </div>
                  )}
                </>
              )}
              {!isSeller && (
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full"
                  onClick={toggleSaved}
                  disabled={saving}
                >
                  <Heart className={`w-4 h-4 mr-2 ${saved ? "fill-current" : ""}`} />
                  {saved ? "Saved" : "Save Product"}
                </Button>
              )}
                </>
              )}
            </div>

            <div className="glass-effect p-4 sm:p-6 space-y-3 sm:space-y-4 rounded-lg">
              <h3 className="text-white font-semibold text-base sm:text-lg">Description 📝</h3>
              <p className="text-white/70 text-sm sm:text-base leading-relaxed">
                {product.description}
              </p>
              {product.colorway && (
                <div className="flex justify-between text-xs sm:text-sm">
                  <span className="text-white/50">Colorway</span>
                  <span className="text-white">{product.colorway}</span>
                </div>
              )}
              {product.releaseYear && (
                <div className="flex justify-between text-xs sm:text-sm">
                  <span className="text-white/50">Release Year</span>
                  <span className="text-white">{product.releaseYear}</span>
                </div>
              )}
            </div>

            <div className="glass-effect p-4 sm:p-6 rounded-lg">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h3 className="text-white font-semibold text-base sm:text-lg">Seller</h3>
                {(product.seller?.is_verified ?? product.seller?.is_admin_approved) && (
                  <Badge variant="gold" className="flex items-center gap-1 text-[10px] uppercase tracking-wider">
                    <ShieldCheck className="w-3 h-3" />
                    Verified
                  </Badge>
                )}
              </div>
              <div className="space-y-2 sm:space-y-3">
                <div className="flex justify-between text-xs sm:text-sm">
                  <span className="text-white/50">Name</span>
                  <span className="text-white">{product.seller?.username ?? "Verified Seller"}</span>
                </div>
                <div className="flex justify-between text-xs sm:text-sm">
                  <span className="text-white/50">Rating</span>
                  <span className="text-gold">4.9 / 5.0</span>
                </div>
                <div className="flex justify-between text-xs sm:text-sm">
                  <span className="text-white/50">Total Sales</span>
                  <span className="text-white">Trusted Seller</span>
                </div>
              </div>
              {(product.seller?.is_verified ?? product.seller?.is_admin_approved) ? (
                <p className="text-white/55 text-xs leading-relaxed mt-4 pt-4 border-t border-white/10">
                  This seller completed FlipRepublic identity and operations review. Listings still pass
                  item-level authentication before they appear on the marketplace.
                </p>
              ) : (
                <p className="text-white/45 text-xs leading-relaxed mt-4 pt-4 border-t border-white/10">
                  Seller verification is in progress or not displayed for this account. The item listing
                  itself may still carry an authentication badge where shown.
                </p>
              )}
              {!isSeller && product.seller?.user_id && product.status === "active" && (
                <div className="mt-4 pt-4 border-t border-white/10">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full border-gold/40"
                    onClick={handleMessageSeller}
                    disabled={msgThreadLoading}
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    {msgThreadLoading ? "Opening…" : "Message seller"}
                  </Button>
                </div>
              )}
            </div>

            <SellerVerificationCallout
              sellerUsername={product.seller?.username}
              isSellerVerified={Boolean(product.seller?.is_verified ?? product.seller?.is_admin_approved)}
              imagesVerifiedAt={product.images_verified_at}
            />

            <div id="reviews" className="scroll-mt-24">
              <ProductReviewsSection productId={params.id} />
            </div>

            <div className="glass-gold p-4 sm:p-6 space-y-3 sm:space-y-4 rounded-lg animate-glow">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 text-gold" />
                <h3 className="text-gradient-gold font-bold text-base sm:text-lg">✨ Authentication Guarantee</h3>
              </div>
              <p className="text-white/70 text-xs sm:text-sm leading-relaxed">
                Every item is verified by our expert authentication team before listing.
                Your purchase is protected by our comprehensive buyer guarantee.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:gap-4 pt-3 sm:pt-4">
              <div className="text-center">
                <Award className="w-6 h-6 sm:w-8 sm:h-8 text-gold mx-auto mb-1 sm:mb-2" />
                <p className="text-xs text-white/60">Verified Authentic</p>
              </div>
              <div className="text-center">
                <Package className="w-6 h-6 sm:w-8 sm:h-8 text-gold mx-auto mb-1 sm:mb-2" />
                <p className="text-xs text-white/60">Insured Shipping</p>
              </div>
              <div className="text-center">
                <ShieldCheck className="w-6 h-6 sm:w-8 sm:h-8 text-gold mx-auto mb-1 sm:mb-2" />
                <p className="text-xs text-white/60">Buyer Protection</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Address Collection Modal */}
      {showAddressForm && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 sm:p-6">
          <div className="bg-black border-2 border-gold rounded-lg p-4 sm:p-6 max-w-md w-full space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-serif text-2xl text-gold">Shipping Address</h2>
              <button
                onClick={() => {
                  setShowAddressForm(false);
                  setPurchaseError(null);
                  setCouponPreview(null);
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

              <div>
                <label className="block text-white/70 text-sm mb-2">Coupon code (optional)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={checkoutCoupon}
                    onChange={(e) => {
                      setCheckoutCoupon(e.target.value);
                      setCouponPreview(null);
                    }}
                    className="flex-1 bg-black border border-white/20 px-4 py-2 text-white focus:border-gold focus:outline-none"
                    placeholder="e.g. WELCOME10"
                    autoComplete="off"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={couponApplyLoading || !checkoutCoupon.trim() || !product}
                    onClick={async () => {
                      if (!product) return;
                      setCouponApplyLoading(true);
                      setPurchaseError(null);
                      try {
                        const res = await fetch("/api/coupons/validate", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            code: checkoutCoupon.trim(),
                            productId: product.id,
                            subtotal: subtotalForCheckout,
                          }),
                        });
                        const data = await res.json();
                        if (!res.ok) {
                          setCouponPreview(null);
                          setPurchaseError(data.error || "Invalid coupon");
                        } else {
                          setCouponPreview({ discount: data.discountAmount, final: data.finalAmount });
                          setPurchaseError(null);
                        }
                      } finally {
                        setCouponApplyLoading(false);
                      }
                    }}
                  >
                    {couponApplyLoading ? "…" : "Apply"}
                  </Button>
                </div>
                {couponPreview && (
                  <p className="text-xs text-gold mt-2">
                    −{formatPrice(couponPreview.discount)} · You pay {formatPrice(couponPreview.final)}
                  </p>
                )}
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
                  setCouponPreview(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                className="flex-1"
                onClick={() => {
                  if (userOffer && userOffer.status === "accepted") {
                    handlePurchase(Number(userOffer.offer_price));
                  } else {
                    handlePurchase();
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
  );
}
