"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { getAccessToken } from "@/lib/supabase/session";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createSupabaseBrowserClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    const token = await getAccessToken();
    if (!token) {
      setError("Failed to get session.");
      setLoading(false);
      return;
    }

    const profileResponse = await fetch("/api/profile", {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!profileResponse.ok) {
      setError("Failed to verify admin access.");
      setLoading(false);
      return;
    }

    const { profile } = await profileResponse.json();

    if (!profile) {
      setError("Profile not found. Please sign up first.");
      setLoading(false);
      await supabase.auth.signOut();
      return;
    }

    // If user is not admin, deny access
    if (profile.role !== "admin") {
      setError("Access denied. Admin role required. Please run the SQL script in FIX-ADMIN-ROLE.sql to set admin role.");
      setLoading(false);
      await supabase.auth.signOut();
      return;
    }

    router.push("/admin");
  };

  return (
    <div className="min-h-screen bg-black py-24 flex items-center justify-center">
      <div className="max-w-md w-full mx-auto px-6">
        <div className="text-center mb-8">
          <h1 className="font-serif text-4xl mb-2 font-bold">
            <span className="text-gradient-luxury">Admin Login</span>
          </h1>
          <p className="text-white/70">Access the admin console</p>
        </div>

        <form onSubmit={handleSubmit} className="glass-effect p-8 rounded-lg space-y-6">
          <div>
            <label className="block text-white/60 text-sm mb-2">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full bg-black border border-white/20 px-4 py-3 text-white focus:border-gold focus:outline-none transition-colors"
              placeholder="admin@fliprepublic.com"
            />
          </div>
          <div>
            <label className="block text-white/60 text-sm mb-2">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full bg-black border border-white/20 px-4 py-3 text-white focus:border-gold focus:outline-none transition-colors"
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <Button type="submit" size="lg" variant="primary" className="w-full" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </Button>
        </form>
      </div>
    </div>
  );
}
