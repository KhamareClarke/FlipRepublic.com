"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

function SellerSignupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const prefill = searchParams.get("email");
    if (prefill) setEmail(prefill);
  }, [searchParams]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Check if user has an approved seller application
      const appCheckResponse = await fetch("/api/check-seller-application", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!appCheckResponse.ok) {
        setError("Failed to check seller application status. Please try again.");
        setLoading(false);
        return;
      }

      const appData = await appCheckResponse.json();
      
      if (appData.status !== "approved") {
        if (appData.status === "pending") {
          setError("Your seller application is pending approval. Please wait for admin approval before signing up. If you haven't applied yet, please apply first.");
        } else if (appData.status === "rejected") {
          setError("Your seller application was rejected. Please contact support or apply again.");
        } else {
          setError("No approved seller application found for this email. Please ensure your seller application is approved first. If you haven't applied yet, please apply to become a seller.");
        }
        setLoading(false);
        return;
      }

      // Check if user already exists
      const checkResponse = await fetch("/api/check-user-exists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      
      if (checkResponse.ok) {
        const checkData = await checkResponse.json();
        if (checkData.exists && checkData.userId) {
          // User already exists - try to sign them in
          const supabase = createSupabaseBrowserClient();
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          
          if (!signInError && signInData?.user) {
            setLoading(false);
            router.push("/dashboard");
            return;
          } else {
            setError("Account already exists. Please sign in instead.");
            setLoading(false);
            return;
          }
        }
      }

      // Create user using admin API (bypasses rate limits)
      const adminCreateResponse = await fetch("/api/create-user-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          email, 
          password, 
          username,
          applicationId: appData.applicationId 
        }),
      });

      const adminCreateData = await adminCreateResponse.json();

      if (!adminCreateResponse.ok || !adminCreateData.userId) {
        if (adminCreateData.code === "USER_EXISTS") {
          setError("Account already exists. Please sign in instead.");
        } else {
          setError(adminCreateData.error || "Failed to create account. Please try again.");
        }
        setLoading(false);
        return;
      }

      // Wait for user to be committed
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Create seller account
      const sellerResponse = await fetch("/api/create-seller", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          userId: adminCreateData.userId,
          email,
          username,
          applicationId: appData.applicationId
        }),
      });

      if (!sellerResponse.ok) {
        const errorData = await sellerResponse.json();
        if (!errorData.message?.includes("already exists")) {
          setError(errorData.error || errorData.message || "Seller account creation failed. Please try logging in.");
          setLoading(false);
          return;
        }
      }

      // Notify admin
      try {
        await fetch("/api/notify-admin-signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            email, 
            userId: adminCreateData.userId,
            username 
          }),
        });
      } catch (notifyError) {
        console.warn("Failed to notify admin:", notifyError);
      }

      // Auto-login
      const supabaseClient = createSupabaseBrowserClient();
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const { data: signInData, error: signInError } = await supabaseClient.auth.signInWithPassword({
        email,
        password,
      });
      
      if (signInError || !signInData?.user) {
        setLoading(false);
        setTimeout(() => {
          router.push("/login?signup=success");
        }, 100);
        return;
      }
      
      // Successfully signed in - redirect to dashboard
      router.push("/dashboard");
      setLoading(false);
      
    } catch (err: any) {
      console.error("Seller signup error:", err);
      setError(`An unexpected error occurred: ${err?.message || "Unknown error"}. Please try again or contact support.`);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black py-24">
      <div className="max-w-lg mx-auto px-6">
        <h1 className="font-serif text-4xl mb-6 font-bold">
          <span className="text-gradient-luxury">Sign up as Seller</span>
        </h1>
        <p className="text-white/70 mb-4">Create your seller account. You must have an approved seller application to sign up.</p>
        <p className="text-white/50 text-sm mb-10">
          Don&apos;t have an approved application?{" "}
          <Link href="/apply" className="text-gold hover:text-gold/80">
            Apply to Sell
          </Link>
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-white/60 text-sm mb-2">Username</label>
            <input
              type="text"
              required
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="w-full bg-black border border-white/20 px-4 py-3 text-white focus:border-gold focus:outline-none transition-colors"
              placeholder="Your brand name"
            />
          </div>
          <div>
            <label className="block text-white/60 text-sm mb-2">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full bg-black border border-white/20 px-4 py-3 text-white focus:border-gold focus:outline-none transition-colors"
              placeholder="you@domain.com"
            />
            <p className="text-white/40 text-xs mt-1">Must match the email in your approved seller application</p>
          </div>
          <div>
            <label className="block text-white/60 text-sm mb-2">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full bg-black border border-white/20 px-4 py-3 text-white focus:border-gold focus:outline-none transition-colors"
              placeholder="Create a secure password"
            />
          </div>

          {error && (
            <div className="bg-red-900/20 border border-red-500/50 rounded p-4">
              <p className="text-red-400 text-sm whitespace-pre-line">{error}</p>
            </div>
          )}

          <Button type="submit" size="lg" variant="primary" className="w-full" disabled={loading}>
            {loading ? "Creating seller account..." : "Create Seller Account"}
          </Button>
        </form>

        <p className="text-white/50 text-sm mt-8">
          Already have an account?{" "}
          <Link href="/login" className="text-gold hover:text-gold/80 transition-colors">
            Sign in
          </Link>
        </p>

        <p className="text-white/50 text-sm mt-4">
          Want to sign up as a buyer instead?{" "}
          <Link href="/signup" className="text-gold hover:text-gold/80 transition-colors">
            Create Buyer Account
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function SellerSignupPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black py-24 px-6">
          <p className="text-white/60">Loading…</p>
        </div>
      }
    >
      <SellerSignupContent />
    </Suspense>
  );
}
