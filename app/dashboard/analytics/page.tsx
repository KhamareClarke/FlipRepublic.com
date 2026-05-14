"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getAccessToken } from "@/lib/supabase/session";
import { formatPrice } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";

type Analytics = {
  viewsLast30Days: number;
  viewsLast7Days: number;
  revenueLast30Days: number;
  revenueByDay14: { day: string; revenue: number }[];
  ordersLast90: number;
  topProductsByViews: { id: string; name: string; views: number }[];
  topCategories: { name: string; revenue: number }[];
  buyerCountries: { country: string; orders: number }[];
  trafficSources: { source: string; views: number }[];
  conversionApprox30d: number;
  topSearchQueries: { query: string; count: number }[];
};

export default function SellerAnalyticsPage() {
  const router = useRouter();
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      const token = await getAccessToken();
      if (!token) {
        router.push("/login");
        return;
      }
      const res = await fetch("/api/analytics/seller", { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Failed to load analytics.");
        setLoading(false);
        return;
      }
      setData(json);
      setLoading(false);
    };
    run();
  }, [router]);

  const maxBar = Math.max(1, ...(data?.revenueByDay14.map((d) => d.revenue) ?? [1]));

  if (loading) {
    return (
      <div className="min-h-screen bg-black py-24 px-6">
        <p className="text-white/60">Loading analytics…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-black py-24 px-6 max-w-3xl mx-auto space-y-4">
        <p className="text-red-400">{error ?? "No data."}</p>
        <Link href="/dashboard">
          <Button variant="outline">Back to dashboard</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black py-20 sm:py-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <Link href="/dashboard" className="inline-flex items-center text-gold/80 hover:text-gold text-sm mb-3">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Dashboard
            </Link>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-gradient-luxury">Sales & traffic</h1>
            <p className="text-white/60 text-sm mt-2">
              Views, revenue trend, top listings, buyer regions, and search demand (last 30 days where noted).
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Listing views (30d)", value: data.viewsLast30Days.toLocaleString() },
            { label: "Views (7d)", value: data.viewsLast7Days.toLocaleString() },
            { label: "Revenue (30d)", value: formatPrice(data.revenueLast30Days) },
            { label: "Conv. approx. (30d)", value: `${(data.conversionApprox30d * 100).toFixed(1)}%` },
          ].map((c) => (
            <div key={c.label} className="border border-white/10 bg-white/5 p-4 rounded">
              <p className="text-white/50 text-xs uppercase tracking-wider mb-1">{c.label}</p>
              <p className="text-gold font-bold text-xl">{c.value}</p>
            </div>
          ))}
        </div>

        <section className="border border-white/10 bg-white/5 p-6 rounded space-y-4">
          <h2 className="font-serif text-xl text-gold">Revenue (14 days)</h2>
          <div className="flex items-end gap-1 h-44">
            {data.revenueByDay14.map((d) => {
              const hPx = Math.max(6, Math.round((d.revenue / maxBar) * 140));
              return (
              <div key={d.day} className="flex-1 flex flex-col items-center gap-1 min-w-0 h-full justify-end">
                <div
                  className="w-full bg-gold/80 rounded-t min-h-[6px] transition-all"
                  style={{ height: `${hPx}px` }}
                  title={`${d.day}: ${formatPrice(d.revenue)}`}
                />
                <span className="text-[9px] text-white/40 truncate w-full text-center">{d.day.slice(5)}</span>
              </div>
            );})}
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <section className="border border-white/10 bg-white/5 p-6 rounded space-y-3">
            <h2 className="font-serif text-xl text-gold">Top listings by views</h2>
            <ul className="space-y-2 text-sm">
              {data.topProductsByViews.length === 0 && <li className="text-white/40">No view data yet.</li>}
              {data.topProductsByViews.map((p) => (
                <li key={p.id} className="flex justify-between gap-2 border-b border-white/5 pb-2">
                  <span className="text-white/90 truncate">{p.name}</span>
                  <span className="text-gold shrink-0">{p.views}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="border border-white/10 bg-white/5 p-6 rounded space-y-3">
            <h2 className="font-serif text-xl text-gold">Revenue by category</h2>
            <ul className="space-y-2 text-sm">
              {data.topCategories.length === 0 && <li className="text-white/40">No category sales yet.</li>}
              {data.topCategories.map((c) => (
                <li key={c.name} className="flex justify-between gap-2 border-b border-white/5 pb-2">
                  <span className="text-white/90">{c.name}</span>
                  <span className="text-gold">{formatPrice(c.revenue)}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="border border-white/10 bg-white/5 p-6 rounded space-y-3">
            <h2 className="font-serif text-xl text-gold">Buyer regions (orders)</h2>
            <ul className="space-y-2 text-sm">
              {data.buyerCountries.length === 0 && <li className="text-white/40">No shipping country data.</li>}
              {data.buyerCountries.map((c) => (
                <li key={c.country} className="flex justify-between gap-2 border-b border-white/5 pb-2">
                  <span className="text-white/90">{c.country}</span>
                  <span className="text-white/60">{c.orders} orders</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="border border-white/10 bg-white/5 p-6 rounded space-y-3">
            <h2 className="font-serif text-xl text-gold">Traffic referrers (views)</h2>
            <ul className="space-y-2 text-sm">
              {data.trafficSources.length === 0 && <li className="text-white/40">No referrer captured yet.</li>}
              {data.trafficSources.map((t) => (
                <li key={t.source} className="flex justify-between gap-2 border-b border-white/5 pb-2">
                  <span className="text-white/90 truncate max-w-[70%]" title={t.source}>
                    {t.source}
                  </span>
                  <span className="text-gold shrink-0">{t.views}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <section className="border border-white/10 bg-white/5 p-6 rounded space-y-3">
          <h2 className="font-serif text-xl text-gold">Marketplace search terms (global)</h2>
          <p className="text-white/40 text-xs">Aggregated from all searches in the last 30 days — not only your shop.</p>
          <ul className="flex flex-wrap gap-2">
            {data.topSearchQueries.length === 0 && <li className="text-white/40">No search analytics yet.</li>}
            {data.topSearchQueries.map((q) => (
              <li key={q.query} className="luxury-border px-3 py-1 rounded-full text-xs text-white/80">
                {q.query} <span className="text-gold">×{q.count}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
