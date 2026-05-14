"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { getAccessToken } from "@/lib/supabase/session";
import { Star } from "lucide-react";

type ReviewRow = {
  id: string;
  rating: number;
  body: string;
  buyer_username: string;
  created_at: string;
};

type Props = {
  productId: string;
};

export function ProductReviewsSection({ productId }: Props) {
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [stats, setStats] = useState<{ avg: number | null; count: number }>({ avg: null, count: 0 });
  const [eligible, setEligible] = useState(false);
  const [eligibleOrderId, setEligibleOrderId] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = await getAccessToken();
    const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
    const res = await fetch(`/api/products/${productId}/reviews`, { headers });
    const data = await res.json();
    setReviews(data.reviews ?? []);
    setStats(data.stats ?? { avg: null, count: 0 });
    setEligible(Boolean(data.eligible));
    setEligibleOrderId(data.eligibleOrderId ?? null);
  }, [productId]);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async () => {
    if (!eligibleOrderId) return;
    setSubmitting(true);
    setMessage(null);
    const token = await getAccessToken();
    if (!token) {
      window.location.href = `/login?redirect=/product/${productId}`;
      return;
    }
    const res = await fetch(`/api/products/${productId}/reviews`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ orderId: eligibleOrderId, rating, body }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setMessage(data.error || "Could not submit review.");
      return;
    }
    setMessage("Thank you — your review is live.");
    setBody("");
    load();
  };

  return (
    <div className="glass-effect p-5 sm:p-6 rounded-lg space-y-6 border border-white/10">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h3 className="font-serif text-xl text-gold">Reviews</h3>
        {stats.count > 0 && (
          <div className="flex items-center gap-2 text-sm text-white/80">
            <span className="text-gold font-semibold">{stats.avg?.toFixed(1) ?? "—"}</span>
            <div className="flex">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star
                  key={i}
                  className={`w-4 h-4 ${i <= Math.round(stats.avg ?? 0) ? "text-gold fill-gold" : "text-white/20"}`}
                />
              ))}
            </div>
            <span className="text-white/50">({stats.count})</span>
          </div>
        )}
      </div>

      {eligible && eligibleOrderId && (
        <div className="border border-gold/30 rounded-lg p-4 space-y-3 bg-gold/5">
          <p className="text-white/80 text-sm">You purchased this item — share a quick rating.</p>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setRating(v)}
                className={`p-1 rounded ${rating >= v ? "text-gold" : "text-white/25"}`}
                aria-label={`${v} stars`}
              >
                <Star className={`w-6 h-6 ${rating >= v ? "fill-gold" : ""}`} />
              </button>
            ))}
          </div>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="Optional notes (condition, shipping, authenticity experience)…"
            className="w-full bg-black border border-white/20 px-3 py-2 text-sm text-white focus:border-gold focus:outline-none rounded"
          />
          <Button variant="primary" size="sm" onClick={submit} disabled={submitting}>
            {submitting ? "Submitting…" : "Submit review"}
          </Button>
          {message && <p className="text-xs text-white/70">{message}</p>}
        </div>
      )}

      <ul className="space-y-4">
        {reviews.length === 0 ? (
          <li className="text-white/45 text-sm">No reviews yet.</li>
        ) : (
          reviews.map((r) => (
            <li key={r.id} className="border-b border-white/10 pb-4 last:border-0 last:pb-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-white font-medium text-sm">{r.buyer_username || "Verified buyer"}</span>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star
                      key={i}
                      className={`w-3 h-3 ${i <= r.rating ? "text-gold fill-gold" : "text-white/15"}`}
                    />
                  ))}
                </div>
              </div>
              {r.body ? <p className="text-white/65 text-sm leading-relaxed">{r.body}</p> : null}
              <p className="text-white/35 text-xs mt-2">
                {new Date(r.created_at).toLocaleDateString("en-GB", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </p>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
