"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (searchParams.get("signup") === "success") {
      setSuccess("✅ Account created successfully! You can now login.");
    }
  }, [searchParams]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createSupabaseBrowserClient();
    
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      // Provide more helpful error messages
      if (signInError.message.includes("Invalid login credentials")) {
        // Check if user exists in auth system and is a seller
        try {
          const authCheckResponse = await fetch("/api/check-user-auth", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email }),
          });
          
          if (authCheckResponse.ok) {
            const authData = await authCheckResponse.json();
            
            if (!authData.exists && authData.needsSellerSignup) {
              setError(
                "Your seller application is approved, but you have not created a login yet. Use “Create seller account” below with the same email and a new password — then you can sign in."
              );
            } else if (!authData.exists) {
              setError("No account found for this email. Create an account first, or check the email spelling.");
            } else if (authData.isSeller) {
              setError("Invalid password. Your seller account exists but the password is incorrect. Please contact support.");
            } else {
              setError("Invalid email or password. Please check your credentials and try again.");
            }
          } else {
            setError("Invalid email or password. Please check your credentials and try again.");
          }
        } catch {
          setError("Invalid email or password. Please check your credentials and try again.");
        }
      } else if (signInError.message.includes("Email not confirmed")) {
        setError("Please check your email and confirm your account before logging in.");
      } else {
        setError(signInError.message);
      }
      setLoading(false);
      return;
    }

    if (!signInData.user) {
      setError("Login failed. Please try again.");
      setLoading(false);
      return;
    }

    const token = signInData.session?.access_token;
    if (!token) {
      setError("Failed to get session token.");
      setLoading(false);
      return;
    }

    const profileResponse = await fetch("/api/profile", {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!profileResponse.ok) {
      setError("Failed to verify account status.");
      setLoading(false);
      return;
    }

    const { profile } = await profileResponse.json();

    // Determine user role from profile - prioritize sellers table
    let userRole = profile?.role;
    
    // If profile has a role from sellers table, use it directly
    if (userRole === "seller" || userRole === "admin") {
      // Seller or admin - allow login and redirect to dashboard/admin
      // No need to check applications if they're already in sellers table
    } else {
      // Check if user is a buyer
      const checkBuyerResponse = await fetch("/api/check-buyer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: signInData.user.email }),
      });
      
      if (checkBuyerResponse.ok) {
        const buyerData = await checkBuyerResponse.json();
        if (buyerData.isBuyer) {
          userRole = "buyer";
        } else if (buyerData.isSeller) {
          // User exists in sellers table but profile didn't return seller role
          // This shouldn't happen, but handle it anyway
          userRole = "seller";
        }
      }
      
      // If still no role determined, default to buyer
      if (!userRole) {
        userRole = "buyer";
      }
    }
    
    // For admins: Auto-approve if not already approved
    if (userRole === "admin") {
      if (profile && !profile.is_admin_approved) {
        const approveResponse = await fetch(`/api/admin/users/${signInData.user.id}`, {
          method: "PATCH",
          headers: { 
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}` 
          },
          body: JSON.stringify({ is_admin_approved: true }),
        });
        
        if (!approveResponse.ok) {
          // If auto-approve fails, still allow admin to login (they can approve themselves)
          console.warn("Failed to auto-approve admin account");
        }
      }
    }
    
    // Check 2: Account must not be banned (if profile exists)
    if (profile?.is_banned) {
      setError("Your account has been banned. Please contact support.");
      setLoading(false);
      return;
    }

    // Check for redirect parameter
    const redirectUrl = searchParams.get("redirect");
    
    if (redirectUrl) {
      // Redirect to the requested page
      router.push(redirectUrl);
    } else {
      // Redirect based on user role (userRole already defined above)
      if (userRole === "admin") {
        router.push("/admin");
      } else if (userRole === "seller") {
        router.push("/dashboard");
      } else {
        router.push("/account");
      }
    }
  };

  return (
    <div className="min-h-screen bg-black py-20 sm:py-24">
      <div className="max-w-lg mx-auto px-4 sm:px-6">
        <h1 className="font-serif text-3xl sm:text-4xl mb-4 sm:mb-6 font-bold">
          <span className="text-gradient-luxury">Welcome Back</span>
        </h1>
        <p className="text-white/70 text-sm sm:text-base mb-8 sm:mb-10">Sign in to your account. Note: The account page is for buyers only. Sellers will be redirected to the seller dashboard.</p>

        <form onSubmit={handleSubmit} className="space-y-6">
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

          {success && <p className="text-green-400 text-sm mb-4">{success}</p>}
          {error && <p className="text-red-400 text-sm">{error}</p>}

          <Button type="submit" size="lg" variant="primary" className="w-full" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </Button>
        </form>

        <div className="space-y-3 mt-8">
          <p className="text-white/50 text-sm">
            Approved seller but never signed up?{" "}
            <Link
              href={
                email.trim()
                  ? `/signup/seller?email=${encodeURIComponent(email.trim())}`
                  : "/signup/seller"
              }
              className="text-gold hover:text-gold/80 transition-colors font-medium"
            >
              Create seller account
            </Link>
          </p>
          <p className="text-white/50 text-sm">
            New buyer?{" "}
            <Link
              href={
                searchParams.get("redirect")
                  ? `/signup?redirect=${encodeURIComponent(searchParams.get("redirect")!)}`
                  : "/signup"
              }
              className="text-gold hover:text-gold/80 transition-colors"
            >
              Create buyer account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black py-24">
        <div className="max-w-lg mx-auto px-6 text-center">
          <p className="text-white/70">Loading...</p>
        </div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
