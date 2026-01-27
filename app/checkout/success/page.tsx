"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CheckCircle, Package, ArrowRight } from "lucide-react";

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadOrder = async () => {
      if (!sessionId) {
        setLoading(false);
        return;
      }

      try {
        // Get access token from session
        const { createSupabaseBrowserClient } = await import("@/lib/supabase/browser");
        const supabase = createSupabaseBrowserClient();
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.access_token) {
          setLoading(false);
          return;
        }

        // Fetch order details
        const response = await fetch(`/api/orders?session_id=${sessionId}`, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.orders && data.orders.length > 0) {
            setOrder(data.orders[0]);
          }
        }
      } catch (error) {
        console.error("Failed to load order:", error);
      } finally {
        setLoading(false);
      }
    };

    loadOrder();
  }, [sessionId]);

  return (
    <div className="min-h-screen bg-black py-24">
      <div className="max-w-3xl mx-auto px-6 space-y-8">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full bg-gold/20 flex items-center justify-center">
              <CheckCircle className="w-12 h-12 text-gold" />
            </div>
          </div>
          <h1 className="font-serif text-5xl font-bold">
            <span className="text-gradient-luxury">Payment Confirmed</span>
          </h1>
          <p className="text-white/70 text-lg">
            Thank you for your purchase! Your order is now being processed.
          </p>
        </div>

        {order && (
          <div className="border border-white/10 bg-white/5 rounded-lg p-6 space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <Package className="w-5 h-5 text-gold" />
              <h2 className="font-serif text-2xl text-gold">Order Details</h2>
            </div>
            {order.product && (
              <div className="space-y-2">
                <p className="text-white font-medium">{order.product.name}</p>
                <p className="text-white/70 text-sm">
                  {order.product.brand} • {order.product.condition} • Size {order.product.size}
                </p>
                <p className="text-gold font-semibold text-lg mt-3">
                  £{Number(order.amount).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-white/50 text-xs mt-2">
                  Order ID: {order.id}
                </p>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/account">
            <Button variant="primary" size="lg" className="w-full sm:w-auto">
              View Order History
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
          <Link href="/marketplace">
            <Button variant="outline" size="lg" className="w-full sm:w-auto">
              Continue Shopping
            </Button>
          </Link>
        </div>

        {sessionId && (
          <p className="text-center text-white/30 text-xs">
            Payment Session: {sessionId.substring(0, 20)}...
          </p>
        )}
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black py-24">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <p className="text-white/70">Loading...</p>
        </div>
      </div>
    }>
      <CheckoutSuccessContent />
    </Suspense>
  );
}
