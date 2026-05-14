"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getAccessToken, getUser } from "@/lib/supabase/session";
import { formatPrice } from "@/lib/utils";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Metrics = {
  totalUsers: number;
  totalRevenue: number;
  pendingApplications: number;
  underReviewListings: number;
};

export default function AdminPage() {
  const router = useRouter();
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [listingStatusFilter, setListingStatusFilter] = useState<string>("all");
  const [applicationStatusFilter, setApplicationStatusFilter] = useState<string>("all");
  const [userFilter, setUserFilter] = useState<string>("all");
  const [disputes, setDisputes] = useState<any[]>([]);
  const [fraudSignals, setFraudSignals] = useState<any>(null);
  const [adminActivity, setAdminActivity] = useState<any[]>([]);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [pfCouponCode, setPfCouponCode] = useState("");
  const [pfDiscountType, setPfDiscountType] = useState<"percent" | "fixed">("percent");
  const [pfDiscountVal, setPfDiscountVal] = useState("");
  const [pfMax, setPfMax] = useState("");
  const [pfSaving, setPfSaving] = useState(false);
  const [empireEvents, setEmpireEvents] = useState<any[]>([]);
  const [empireSuggestions, setEmpireSuggestions] = useState<any[]>([]);

  const loadData = async () => {
    const token = await getAccessToken();
    if (!token) {
      router.push("/admin/login");
      setLoading(false);
      return;
    }

    const profileResponse = await fetch("/api/profile", {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!profileResponse.ok) {
      router.push("/admin/login");
      setLoading(false);
      return;
    }

    const { profile } = await profileResponse.json();

    if (!profile || profile.role !== "admin") {
      router.push("/admin/login");
      setLoading(false);
      return;
    }

    setIsAdmin(true);

    const [metricsResponse, appsResponse, productsResponse, usersResponse, disputesRes, fraudRes, activityRes, couponsRes, empireEvRes, empireSgRes] =
      await Promise.all([
      fetch("/api/admin/overview", { headers: { Authorization: `Bearer ${token}` } }),
      fetch("/api/admin/seller-applications", { headers: { Authorization: `Bearer ${token}` } }),
      fetch("/api/admin/products", { headers: { Authorization: `Bearer ${token}` } }),
      fetch("/api/admin/users", { headers: { Authorization: `Bearer ${token}` } }),
      fetch("/api/disputes", { headers: { Authorization: `Bearer ${token}` } }),
      fetch("/api/admin/fraud-signals", { headers: { Authorization: `Bearer ${token}` } }),
      fetch("/api/admin/activity?limit=40", { headers: { Authorization: `Bearer ${token}` } }),
      fetch("/api/coupons", { headers: { Authorization: `Bearer ${token}` } }),
      fetch("/api/admin/empire-os/events?limit=30", { headers: { Authorization: `Bearer ${token}` } }),
      fetch("/api/admin/empire-os/suggestions", { headers: { Authorization: `Bearer ${token}` } }),
    ]);

    const metricsData = await metricsResponse.json();
    const appsData = await appsResponse.json();
    const productsData = await productsResponse.json();
    const usersData = await usersResponse.json();
    const disputesData = disputesRes.ok ? await disputesRes.json() : { disputes: [] };
    const fraudData = fraudRes.ok ? await fraudRes.json() : null;
    const activityData = activityRes.ok ? await activityRes.json() : { actions: [] };
    const couponsData = couponsRes.ok ? await couponsRes.json() : { coupons: [] };
    const empireEvData = empireEvRes.ok ? await empireEvRes.json() : { events: [] };
    const empireSgData = empireSgRes.ok ? await empireSgRes.json() : { suggestions: [] };

    setMetrics(metricsData.metrics ?? null);
    setApplications(appsData.applications ?? []);
    setProducts(productsData.products ?? []);
    setUsers(usersData.users ?? []);
    setDisputes(disputesData.disputes ?? []);
    setFraudSignals(fraudData);
    setAdminActivity(activityData.actions ?? []);
    setCoupons(couponsData.coupons ?? []);
    setEmpireEvents(empireEvData.events ?? []);
    setEmpireSuggestions(empireSgData.suggestions ?? []);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const handleSignOut = async () => {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/admin/login");
  };

  const updateApplication = async (id: string, status: "approved" | "rejected") => {
    const token = await getAccessToken();
    if (!token) {
      return;
    }

    await fetch(`/api/admin/seller-applications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status }),
    });
    loadData();
  };

  const updateProductStatus = async (id: string, status: string) => {
    const token = await getAccessToken();
    if (!token) {
      return;
    }

    await fetch(`/api/admin/products/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status }),
    });
    loadData();
  };

  const updateProductRecord = async (id: string, fields: Record<string, unknown>) => {
    const token = await getAccessToken();
    if (!token) return;
    await fetch(`/api/admin/products/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(fields),
    });
    loadData();
  };

  const banUser = async (userId: string, isBanned: boolean) => {
    const token = await getAccessToken();
    if (!token) {
      return;
    }

    await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ is_banned: isBanned }),
    });
    loadData();
  };

  const approveUser = async (userId: string, approved: boolean) => {
    const token = await getAccessToken();
    if (!token) {
      return;
    }

    await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ is_admin_approved: approved }),
    });
    loadData();
  };

  const resolveDispute = async (disputeId: string, status: string, relistProduct = false) => {
    const token = await getAccessToken();
    if (!token) return;
    await fetch(`/api/disputes/${disputeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        status,
        admin_notes: "Resolved via admin console",
        admin_resolution: status,
        relistProduct: status === "resolved_refund" ? relistProduct : false,
      }),
    });
    loadData();
  };

  const createPlatformCoupon = async () => {
    const token = await getAccessToken();
    if (!token) return;
    setPfSaving(true);
    const res = await fetch("/api/coupons", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        code: pfCouponCode,
        discount_type: pfDiscountType,
        discount_value: parseFloat(pfDiscountVal),
        seller_id: null,
        max_redemptions: pfMax ? parseInt(pfMax, 10) : null,
      }),
    });
    setPfSaving(false);
    if (res.ok) {
      setPfCouponCode("");
      setPfDiscountVal("");
      setPfMax("");
      loadData();
    } else {
      const d = await res.json();
      alert(d.error || "Failed to create coupon");
    }
  };

  const dismissEmpireSuggestion = async (id: string) => {
    const token = await getAccessToken();
    if (!token) return;
    await fetch(`/api/admin/empire-os/suggestions/${id}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
    });
    loadData();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black py-20 sm:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <p className="text-white/60 text-sm sm:text-base">Loading admin console...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-black py-20 sm:py-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-12 sm:space-y-16">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold">
              <span className="text-gradient-luxury">Admin Console</span>
            </h1>
            <p className="text-white/70 text-sm sm:text-base mt-1">Platform governance, approvals, and moderation.</p>
          </div>
          <Button variant="outline" onClick={handleSignOut} className="w-full sm:w-auto">
            Sign Out
          </Button>
        </div>

        {metrics && (
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {[
              { label: "Total Users", value: metrics.totalUsers },
              { label: "Total Revenue", value: formatPrice(metrics.totalRevenue) },
              { label: "Pending Applications", value: metrics.pendingApplications },
              { label: "Listings Under Review", value: metrics.underReviewListings },
            ].map((stat) => (
              <div key={stat.label} className="bg-white/5 border border-white/10 p-6">
                <p className="text-white/50 text-sm mb-2">{stat.label}</p>
                <p className="text-white text-3xl font-medium">{stat.value}</p>
              </div>
            ))}
          </section>
        )}

        <section className="space-y-4 border border-white/10 bg-white/5 p-6">
          <h2 className="font-serif text-2xl text-gold">Empire OS</h2>
          <p className="text-white/50 text-sm">
            Rule-based event stream and suggestions (skills). Set <span className="font-mono text-white/70">EMPIRE_OS_ENABLED=false</span> to
            disable dispatch.
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <p className="text-gold/80 text-xs uppercase mb-2">Recent events</p>
              {empireEvents.length === 0 ? (
                <p className="text-white/50 text-xs">No events yet.</p>
              ) : (
                <ul className="space-y-2 text-xs text-white/70 max-h-56 overflow-y-auto">
                  {empireEvents.map((e: any) => (
                    <li key={e.id} className="border-b border-white/5 pb-2">
                      <span className="text-gold/90">{e.event_type}</span>
                      {e.skills_applied?.length ? (
                        <span className="text-white/40 ml-2">skills: {e.skills_applied.join(", ")}</span>
                      ) : null}
                      <span className="text-white/40 block">{new Date(e.created_at).toLocaleString()}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <p className="text-gold/80 text-xs uppercase mb-2">Open suggestions</p>
              {empireSuggestions.length === 0 ? (
                <p className="text-white/50 text-xs">No open suggestions.</p>
              ) : (
                <ul className="space-y-3 text-xs text-white/80 max-h-56 overflow-y-auto">
                  {empireSuggestions.map((s: any) => (
                    <li key={s.id} className="border border-white/10 p-3 space-y-2">
                      <div className="flex flex-wrap justify-between gap-2">
                        <span className="text-gold/90">{s.suggestion_type}</span>
                        <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => void dismissEmpireSuggestion(s.id)}>
                          Dismiss
                        </Button>
                      </div>
                      <p className="text-white/60">{s.message}</p>
                      {s.seller_id ? (
                        <p className="text-white/40 font-mono text-[10px]">seller {s.seller_id.slice(0, 8)}…</p>
                      ) : (
                        <p className="text-white/40 text-[10px]">Platform queue</p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>

        <section className="space-y-4 border border-white/10 bg-white/5 p-6">
          <h2 className="font-serif text-2xl text-gold">Platform coupons</h2>
          <p className="text-white/50 text-sm">
            Codes with no seller restriction apply to any active listing at checkout (subject to min order and dates).
          </p>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <input
              className="bg-black border border-white/20 px-3 py-2 text-white"
              placeholder="Code"
              value={pfCouponCode}
              onChange={(e) => setPfCouponCode(e.target.value)}
            />
            <select
              className="bg-black border border-white/20 px-3 py-2 text-white"
              value={pfDiscountType}
              onChange={(e) => setPfDiscountType(e.target.value as "percent" | "fixed")}
            >
              <option value="percent">Percent</option>
              <option value="fixed">Fixed £</option>
            </select>
            <input
              className="bg-black border border-white/20 px-3 py-2 text-white"
              placeholder="Value"
              value={pfDiscountVal}
              onChange={(e) => setPfDiscountVal(e.target.value)}
            />
            <input
              className="bg-black border border-white/20 px-3 py-2 text-white"
              placeholder="Max uses (optional)"
              value={pfMax}
              onChange={(e) => setPfMax(e.target.value)}
            />
          </div>
          <Button size="sm" variant="primary" disabled={pfSaving || !pfCouponCode.trim() || !pfDiscountVal} onClick={() => void createPlatformCoupon()}>
            {pfSaving ? "Saving…" : "Create platform coupon"}
          </Button>
          <div className="pt-4 border-t border-white/10">
            <p className="text-white/60 text-xs mb-2">Recent (all scopes)</p>
            <ul className="space-y-1 text-xs text-white/70 max-h-40 overflow-y-auto">
              {coupons.slice(0, 25).map((c: any) => (
                <li key={c.id}>
                  <span className="text-gold font-mono">{c.code}</span> ·{" "}
                  {c.seller_id ? `seller ${c.seller_id.slice(0, 8)}…` : "platform"} ·{" "}
                  {c.discount_type === "percent" ? `${c.discount_value}%` : formatPrice(Number(c.discount_value))} · uses{" "}
                  {c.redemption_count}
                  {c.max_redemptions != null ? `/${c.max_redemptions}` : ""}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="space-y-4 border border-white/10 bg-white/5 p-6">
          <h2 className="font-serif text-2xl text-gold">Order disputes</h2>
          {disputes.length === 0 ? (
            <p className="text-white/50 text-sm">No disputes.</p>
          ) : (
            <div className="space-y-4">
              {disputes.map((d: any) => (
                <div key={d.id} className="border border-white/10 p-4 space-y-2 text-sm">
                  <div className="flex flex-wrap justify-between gap-2">
                    <span className="text-white/80">
                      Order {(d.order as any)?.id?.slice(0, 8)} · {(d.order as any)?.product?.name ?? "Product"}
                    </span>
                    <Badge variant="outline">{d.status}</Badge>
                  </div>
                  <p className="text-white/50 text-xs">{d.buyer_statement?.slice(0, 200)}</p>
                  {["under_review", "resolved_refund", "resolved_release", "dismissed"].includes(d.status) ? null : (
                    <div className="flex flex-wrap gap-2 pt-2">
                      <Button size="sm" variant="outline" onClick={() => resolveDispute(d.id, "under_review")}>
                        Mark review
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => resolveDispute(d.id, "resolved_release")}>
                        Release seller
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => resolveDispute(d.id, "resolved_refund", false)}>
                        Refund buyer
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => resolveDispute(d.id, "resolved_refund", true)}>
                        Refund + relist
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => resolveDispute(d.id, "dismissed")}>
                        Dismiss
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-4 border border-white/10 bg-white/5 p-6">
          <h2 className="font-serif text-2xl text-gold">Fraud signals (heuristic)</h2>
          {!fraudSignals ? (
            <p className="text-white/50 text-sm">Could not load signals.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <div>
                <p className="text-gold/80 text-xs uppercase mb-2">Sellers with multiple refunds (60d)</p>
                <ul className="space-y-1 text-white/70">
                  {(fraudSignals.highRefundSellers ?? []).length === 0 && <li>None flagged.</li>}
                  {(fraudSignals.highRefundSellers ?? []).map((x: any) => (
                    <li key={x.seller_id}>
                      {x.seller_id.slice(0, 8)}… · {x.refunds} refunds · £{Number(x.amount).toFixed(0)}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-gold/80 text-xs uppercase mb-2">Price vs category median (&gt;4×)</p>
                <ul className="space-y-1 text-white/70">
                  {(fraudSignals.priceOutlierListings ?? []).length === 0 && <li>None flagged.</li>}
                  {(fraudSignals.priceOutlierListings ?? []).map((x: any) => (
                    <li key={x.id} className="truncate" title={x.name}>
                      {x.name} · {formatPrice(x.price)} (median {formatPrice(x.categoryMedian)})
                    </li>
                  ))}
                </ul>
              </div>
              <p className="text-white/40 text-xs md:col-span-2">{fraudSignals.note}</p>
            </div>
          )}
        </section>

        <section className="space-y-4 border border-white/10 bg-white/5 p-6">
          <h2 className="font-serif text-2xl text-gold">Admin activity log</h2>
          {adminActivity.length === 0 ? (
            <p className="text-white/50 text-sm">No logged actions yet.</p>
          ) : (
            <ul className="space-y-2 text-xs text-white/70 max-h-64 overflow-y-auto">
              {adminActivity.map((a: any) => (
                <li key={a.id} className="border-b border-white/5 pb-2">
                  <span className="text-gold/90">{a.action}</span>{" "}
                  {a.target_table && (
                    <span className="text-white/50">
                      {a.target_table} {a.target_id?.slice(0, 8)}
                    </span>
                  )}
                  <span className="text-white/40 ml-2">{new Date(a.created_at).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <h2 className="font-serif text-2xl sm:text-3xl text-gold">Seller Applications</h2>
            <div className="flex flex-wrap gap-2">
              {["all", "pending", "approved", "rejected"].map((status) => (
                <Button
                  key={status}
                  variant={applicationStatusFilter === status ? "primary" : "outline"}
                  size="sm"
                  onClick={() => setApplicationStatusFilter(status)}
                  className="text-xs sm:text-sm"
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </Button>
              ))}
            </div>
          </div>
          {applications.length === 0 ? (
            <p className="text-white/50">No applications found.</p>
          ) : (
            <div className="space-y-4">
              {applications
                .filter((app) => applicationStatusFilter === "all" || app.status === applicationStatusFilter)
                .map((application) => {
                const identityInfo = application.identity_info ?? {};
                const storeInfo = application.store_info ?? {};
                return (
                  <div
                    key={application.id}
                    className="p-6 border border-white/10 bg-white/5 space-y-4"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                      <div className="flex-1">
                        <p className="text-white font-medium text-lg">
                          {identityInfo.fullName ?? application.profile?.username ?? "Applicant"}
                        </p>
                        <p className="text-white/60 text-sm">{identityInfo.email ?? "No email"}</p>
                        <p className="text-white/50 text-sm mt-1">
                          Phone: {identityInfo.phone ?? "N/A"} | Business: {identityInfo.businessName ?? "N/A"}
                        </p>
                        <div className="mt-2">
                          <Badge variant={application.status === "pending" ? "outline" : application.status === "approved" ? "gold" : "outline"}>
                            {application.status}
                          </Badge>
                        </div>
                        {storeInfo.categories && (
                          <p className="text-white/50 text-xs mt-2">
                            Categories: {storeInfo.categories}
                          </p>
                        )}
                        {storeInfo.experience && (
                          <p className="text-white/50 text-xs">
                            Experience: {storeInfo.experience}
                          </p>
                        )}
                        {application.created_at && (
                          <p className="text-white/40 text-xs mt-2">
                            Applied: {new Date(application.created_at).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col sm:flex-row gap-3">
                        {application.status === "pending" && (
                          <>
                            <Button
                              variant="primary"
                              onClick={() => updateApplication(application.id, "approved")}
                            >
                              Approve
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => updateApplication(application.id, "rejected")}
                            >
                              Reject
                            </Button>
                          </>
                        )}
                        {application.user_id && (
                          <Button
                            variant="outline"
                            onClick={() => banUser(application.user_id, true)}
                          >
                            Ban User
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <h2 className="font-serif text-2xl sm:text-3xl text-gold">User Approvals</h2>
            <div className="flex flex-wrap gap-2">
              {["pending", "approved", "all"].map((filter) => (
                <Button
                  key={filter}
                  variant={userFilter === filter ? "primary" : "outline"}
                  size="sm"
                  onClick={() => setUserFilter(filter)}
                  className="text-xs sm:text-sm"
                >
                  {filter.charAt(0).toUpperCase() + filter.slice(1)}
                </Button>
              ))}
            </div>
          </div>
          {users.length === 0 ? (
            <p className="text-white/50">No users found.</p>
          ) : (
            <div className="space-y-4">
              {users
                .filter((u) => {
                  if (userFilter === "pending") return !u.is_admin_approved && u.role !== "admin";
                  if (userFilter === "approved") return u.is_admin_approved;
                  return true; // "all" shows everyone
                })
                .map((user) => (
                  <div
                    key={user.user_id}
                    className="p-4 sm:p-6 border border-white/10 bg-white/5 space-y-3 sm:space-y-4"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 sm:gap-4">
                      <div className="flex-1">
                        <p className="text-white font-medium text-base sm:text-lg">
                          {user.username ?? "No username"}
                        </p>
                        <p className="text-white/60 text-xs sm:text-sm">
                          {user.user?.email ?? "No email"}
                        </p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <Badge variant={user.is_verified ? "gold" : "outline"} className="text-xs">
                            {user.is_verified ? "Email Verified" : "Not Verified"}
                          </Badge>
                          <Badge variant={user.is_admin_approved ? "gold" : "outline"} className="text-xs">
                            {user.is_admin_approved ? "Approved" : "Pending Approval"}
                          </Badge>
                          <Badge variant="outline" className="text-xs">{user.role}</Badge>
                        </div>
                        {user.created_at && (
                          <p className="text-white/40 text-xs mt-2">
                            Joined: {new Date(user.created_at).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                        {!user.is_admin_approved && user.role !== "admin" && (
                          <Button
                            variant="primary"
                            onClick={() => approveUser(user.user_id, true)}
                            className="w-full sm:w-auto"
                          >
                            Approve User
                          </Button>
                        )}
                        {user.is_admin_approved && (
                          <Button
                            variant="outline"
                            onClick={() => approveUser(user.user_id, false)}
                            className="w-full sm:w-auto"
                          >
                            Revoke Approval
                          </Button>
                        )}
                        {!user.is_banned && (
                          <Button
                            variant="outline"
                            onClick={() => banUser(user.user_id, true)}
                            className="w-full sm:w-auto"
                          >
                            Ban User
                          </Button>
                        )}
                        {user.is_banned && (
                          <Button
                            variant="outline"
                            onClick={() => banUser(user.user_id, false)}
                            className="w-full sm:w-auto"
                          >
                            Unban
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </section>

        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-2xl sm:text-3xl text-gold">Listings Moderation</h2>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={listingStatusFilter === "all" ? "primary" : "outline"}
                size="sm"
                onClick={() => setListingStatusFilter("all")}
              >
                All
              </Button>
              <Button
                variant={listingStatusFilter === "under_review" ? "primary" : "outline"}
                size="sm"
                onClick={() => setListingStatusFilter("under_review")}
              >
                Under Review
              </Button>
              <Button
                variant={listingStatusFilter === "active" ? "primary" : "outline"}
                size="sm"
                onClick={() => setListingStatusFilter("active")}
              >
                Active
              </Button>
              <Button
                variant={listingStatusFilter === "sold" ? "primary" : "outline"}
                size="sm"
                onClick={() => setListingStatusFilter("sold")}
              >
                Sold
              </Button>
            </div>
          </div>
          {products.length === 0 ? (
            <p className="text-white/50">No listings found.</p>
          ) : (
            <div className="space-y-4">
              {products
                .filter((p) => listingStatusFilter === "all" || p.status === listingStatusFilter)
                .map((product) => (
                  <div
                    key={product.id}
                    className="border border-white/10 bg-white/5 overflow-hidden"
                  >
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 p-6">
                      {/* Product Image */}
                      <div className="lg:col-span-1">
                        {product.images && product.images.length > 0 ? (
                          <div className="space-y-2">
                            <div className="grid grid-cols-2 gap-1">
                              {product.images.slice(0, 4).map((img: { url: string }, idx: number) => (
                                <img
                                  key={idx}
                                  src={img.url}
                                  alt={`${product.name} ${idx + 1}`}
                                  className="w-full aspect-square object-cover border border-white/20"
                                />
                              ))}
                            </div>
                            {product.images.length > 4 && (
                              <p className="text-white/40 text-xs">+{product.images.length - 4} more angles</p>
                            )}
                            {product.images_verified_at && (
                              <Badge variant="gold" className="text-[10px]">
                                Imagery verified
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <div className="w-full aspect-square bg-white/5 border border-white/20 flex items-center justify-center">
                            <p className="text-white/30 text-sm">No Image</p>
                          </div>
                        )}
                      </div>

                      {/* Product Details */}
                      <div className="lg:col-span-2 space-y-4">
                        <div>
                          <h3 className="text-white text-xl font-semibold mb-1">{product.name}</h3>
                          <p className="text-gold font-medium">{product.brand}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-white/50 mb-1">Price</p>
                            <p className="text-white font-medium">{formatPrice(Number(product.price))}</p>
                          </div>
                          <div>
                            <p className="text-white/50 mb-1">Condition</p>
                            <p className="text-white">{product.condition}</p>
                          </div>
                          <div>
                            <p className="text-white/50 mb-1">Size</p>
                            <p className="text-white">{product.size}</p>
                          </div>
                          <div>
                            <p className="text-white/50 mb-1">Category</p>
                            <p className="text-white">{product.category?.name || "N/A"}</p>
                          </div>
                          {product.colorway && (
                            <div>
                              <p className="text-white/50 mb-1">Colorway</p>
                              <p className="text-white">{product.colorway}</p>
                            </div>
                          )}
                          {product.release_year && (
                            <div>
                              <p className="text-white/50 mb-1">Release Year</p>
                              <p className="text-white">{product.release_year}</p>
                            </div>
                          )}
                        </div>

                        {product.description && (
                          <div>
                            <p className="text-white/50 text-sm mb-1">Description</p>
                            <p className="text-white/70 text-sm line-clamp-3">{product.description}</p>
                          </div>
                        )}

                        {/* Seller Info */}
                        {product.seller && (
                          <div className="pt-2 border-t border-white/10">
                            <p className="text-white/50 text-sm mb-1">Seller</p>
                            <p className="text-white text-sm">
                              {product.seller.username || "Unknown"} 
                              {product.seller.is_admin_approved && (
                                <Badge variant="gold" className="ml-2 text-xs">Verified</Badge>
                              )}
                            </p>
                            {product.seller.email && (
                              <p className="text-white/50 text-xs mt-1">{product.seller.email}</p>
                            )}
                          </div>
                        )}

                        <div className="text-white/40 text-xs">
                          Created: {new Date(product.created_at).toLocaleDateString()}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="lg:col-span-1 flex flex-col gap-3">
                        <div className="flex items-center justify-between mb-2">
                          <Badge 
                            variant={
                              product.status === "active" ? "gold" : 
                              product.status === "sold" ? "outline" : 
                              "outline"
                            }
                          >
                            {product.status.replace("_", " ")}
                          </Badge>
                          {product.authenticated && (
                            <Badge variant="gold" className="text-xs">Authenticated</Badge>
                          )}
                        </div>

                        <div className="space-y-2">
                          {product.status === "under_review" && (
                            <>
                              <Button
                                variant="primary"
                                size="sm"
                                className="w-full"
                                disabled={(product.images?.length ?? 0) < 4}
                                title={
                                  (product.images?.length ?? 0) < 4
                                    ? "Requires at least 4 listing photos before approval"
                                    : undefined
                                }
                                onClick={() =>
                                  updateProductRecord(product.id, {
                                    status: "active",
                                    authenticated: true,
                                    images_verified_at: new Date().toISOString(),
                                  })
                                }
                              >
                                Approve imagery & publish
                              </Button>
                              {(product.images?.length ?? 0) < 4 && (
                                <p className="text-white/40 text-[10px] text-center leading-snug">
                                  Minimum 4 angles required to approve imagery.
                                </p>
                              )}
                            </>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => updateProductStatus(product.id, "draft")}
                          >
                            Take down (draft)
                          </Button>
                          <Button
                            variant={product.status === "under_review" ? "primary" : "outline"}
                            size="sm"
                            className="w-full"
                            onClick={() => updateProductStatus(product.id, "under_review")}
                          >
                            Under Review
                          </Button>
                          <Button
                            variant={product.status === "active" ? "primary" : "outline"}
                            size="sm"
                            className="w-full"
                            onClick={() => updateProductStatus(product.id, "active")}
                          >
                            Mark Active
                          </Button>
                          <Button
                            variant={product.status === "sold" ? "primary" : "outline"}
                            size="sm"
                            className="w-full"
                            onClick={() => updateProductStatus(product.id, "sold")}
                          >
                            Mark Sold
                          </Button>
                        </div>

                        <a
                          href={`/product/${product.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gold hover:text-gold/80 text-sm text-center mt-2"
                        >
                          View Listing →
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
