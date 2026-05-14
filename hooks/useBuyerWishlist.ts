"use client";

import { useCallback, useEffect, useState } from "react";
import { getAccessToken } from "@/lib/supabase/session";

export type WishlistVariant = "guest" | "seller" | "buyer";

export function useBuyerWishlist() {
  const [ready, setReady] = useState(false);
  const [variant, setVariant] = useState<WishlistVariant>("guest");
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = await getAccessToken();
      if (!token) {
        if (!cancelled) {
          setVariant("guest");
          setSavedIds(new Set());
          setReady(true);
        }
        return;
      }

      const profileResponse = await fetch("/api/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (profileResponse.ok) {
        const { profile } = await profileResponse.json();
        if (profile?.role === "seller" || profile?.role === "admin") {
          if (!cancelled) {
            setVariant("seller");
            setSavedIds(new Set());
            setReady(true);
          }
          return;
        }
      }

      const savedResponse = await fetch("/api/saved-products", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const savedData = savedResponse.ok ? await savedResponse.json() : { savedProducts: [] };
      const ids = new Set<string>(
        (savedData.savedProducts ?? [])
          .map((row: { product?: { id?: string } | null }) => row.product?.id)
          .filter((id: string | undefined): id is string => Boolean(id))
      );
      if (!cancelled) {
        setSavedIds(ids);
        setVariant("buyer");
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const updateSaved = useCallback((id: string, saved: boolean) => {
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (saved) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  return { ready, variant, savedIds, updateSaved };
}
