"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getAccessToken } from "@/lib/supabase/session";

const SAMPLE = `name,brand,condition,size,price,category_slug,description,sku,stock_quantity,track_inventory,image_urls
"Sample Sneaker","Nike","New","UK 9",199.99,sneakers,"CSV import row",SKU-CSV-1,2,true,https://example.com/a.jpg|https://example.com/b.jpg|https://example.com/c.jpg|https://example.com/d.jpg`;

export default function ImportProductsPage() {
  const router = useRouter();
  const [csv, setCsv] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const submit = async () => {
    setLoading(true);
    setResult(null);
    const token = await getAccessToken();
    if (!token) {
      router.push("/login");
      return;
    }
    try {
      const res = await fetch("/api/products/import-csv", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ csv }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult(data.error || "Import failed.");
      } else {
        const errs = (data.errors as { row: number; message: string }[]) ?? [];
        const errText =
          errs.length > 0 ? errs.map((e) => `Row ${e.row}: ${e.message}`).join("\n") : "";
        setResult(
          `Created ${data.created ?? 0} listing(s).${data.truncated ? " (Rows beyond limit were skipped.)" : ""}${errText ? "\n" + errText : ""}`
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black py-20 sm:py-24">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <h1 className="font-serif text-3xl sm:text-4xl mb-2 font-bold">
          <span className="text-gradient-luxury">Bulk import (CSV)</span>
        </h1>
        <p className="text-white/55 text-sm mb-6 max-w-2xl">
          Header row required. Columns:{" "}
          <code className="text-gold/90">name, brand, condition, size, price, image_urls</code> (pipe-separated
          URLs; count must meet MIN_PRODUCT_IMAGES). Optional:{" "}
          <code className="text-gold/90">category_slug, description, sku, stock_quantity, track_inventory</code>{" "}
          (true/false). Max 80 rows per upload. New listings start as under review.
        </p>
        <div className="space-y-4">
          <textarea
            value={csv}
            onChange={(e) => setCsv(e.target.value)}
            rows={16}
            className="w-full bg-black border border-white/20 px-4 py-3 text-white text-sm font-mono focus:border-gold focus:outline-none"
            placeholder="Paste CSV here…"
          />
          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="outline" onClick={() => setCsv(SAMPLE)}>
              Load sample header
            </Button>
            <Button type="button" variant="primary" onClick={() => void submit()} disabled={loading || !csv.trim()}>
              {loading ? "Importing…" : "Import"}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.push("/dashboard")}>
              Back to dashboard
            </Button>
          </div>
          {result && (
            <pre className="whitespace-pre-wrap text-sm text-white/80 border border-white/15 rounded p-4 bg-white/[0.03]">
              {result}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
