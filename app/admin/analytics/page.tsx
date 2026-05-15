"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getAccessToken } from "@/lib/supabase/session";
import { formatPrice } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";

type AdminAnalytics = {
  revenue30: number;
  orders7: number;
  views7: number;
  openDisputes: number;
  empireEvents7: number;
  openEmpireSuggestions: number;
  activeListings: number;
  escrowHolding: number;
  revenueByDay: { day: string; revenue: number; orders: number }[];
  topSearchQueries: { query: string; count: number }[];
  topSkills: { skill_id: string; hits: number }[];
  empireSkillTotal: number;
};

export default function AdminAnalyticsPage() {
  const router = useRouter();
  const [data, setData] = useState<AdminAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      const token = await getAccessToken();
      if (!token) {
        router.push("/admin/login");
        return;
      }
      const res = await fetch("/api/admin/analytics", { headers: { Authorization: `Bearer ${token}` } });
      if (res.status === 403) {
        router.push("/admin/login");
        return;
      }
      const json = await res.json();
      if (!res.ok) {
        setLoading(false);
        return;
      }
      setData(json);
      setLoading(false);
    };
    run();
  }, [router]);

  const maxBar = Math.max(1, ...(data?.revenueByDay.map((d) => d.revenue) ?? [1]));

  if (loading) {
    return (
      <div className="min-h-screen bg-black py-24 px-6">
        <p className="text-white/60">Loading platform analytics…</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-black py-24 px-6 max-w-3xl mx-auto">
        <p className="text-red-400">Could not load analytics.</p>
        <Link href="/admin">
          <Button variant="outline" className="mt-4">
            Back to admin
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black py-20 sm:py-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-10">
        <div>
          <Link href="/admin" className="inline-flex items-center text-gold/80 hover:text-gold text-sm mb-3">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Admin console
          </Link>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold">
            <span className="text-gradient-luxury">Platform analytics</span>
          </h1>
          <p className="text-white/60 text-sm mt-2">Revenue, traffic, escrow, and Empire OS skill activity.</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Revenue (30d)", value: formatPrice(data.revenue30) },
            { label: "Orders (7d)", value: String(data.orders7) },
            { label: "Views (7d)", value: String(data.views7) },
            { label: "Escrow holding", value: String(data.escrowHolding) },
            { label: "Active listings", value: String(data.activeListings) },
            { label: "Open disputes", value: String(data.openDisputes) },
            { label: "Empire events (7d)", value: String(data.empireEvents7) },
            { label: "Open Empire tips", value: String(data.openEmpireSuggestions) },
          ].map((s) => (
            <div key={s.label} className="bg-white/5 border border-white/10 p-4">
              <p className="text-white/50 text-xs mb-1">{s.label}</p>
              <p className="text-white text-xl font-medium">{s.value}</p>
            </div>
          ))}
        </div>

        <section className="border border-white/10 bg-white/5 p-6">
          <h2 className="font-serif text-xl text-gold mb-4">Revenue (14 days)</h2>
          <div className="flex items-end gap-1 h-32">
            {data.revenueByDay.map((d) => (
              <div
                key={d.day}
                className="flex-1 bg-gold/80 min-w-[4px] rounded-t-sm"
                style={{ height: `${Math.max(4, (d.revenue / maxBar) * 100)}%` }}
                title={`${d.day}: ${formatPrice(d.revenue)} (${d.orders} orders)`}
              />
            ))}
          </div>
        </section>

        <div className="grid md:grid-cols-2 gap-8">
          <section className="border border-white/10 bg-white/5 p-6">
            <h2 className="font-serif text-xl text-gold mb-4">Top searches (30d)</h2>
            <ul className="space-y-2 text-sm text-white/70">
              {data.topSearchQueries.length === 0 && <li>No search data yet.</li>}
              {data.topSearchQueries.map((q) => (
                <li key={q.query} className="flex justify-between gap-2">
                  <span className="truncate">{q.query}</span>
                  <span className="text-gold shrink-0">{q.count}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="border border-white/10 bg-white/5 p-6">
            <h2 className="font-serif text-xl text-gold mb-4">
              Empire OS skills (7d) — {data.empireSkillTotal} registered
            </h2>
            <ul className="space-y-2 text-sm text-white/70">
              {data.topSkills.length === 0 && <li>No skill hits yet — trigger events or run cron.</li>}
              {data.topSkills.map((s) => (
                <li key={s.skill_id} className="flex justify-between gap-2 font-mono text-xs">
                  <span className="truncate">{s.skill_id}</span>
                  <span className="text-gold shrink-0">{s.hits}×</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
