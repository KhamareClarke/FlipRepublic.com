"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

function SignupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
    // Check if user already exists as seller or buyer
    let hasApprovedApplication = false;
    let applicationId = null;
    let isBuyer = false;
    let isSeller = false;
    
    try {
      // First check if email is already registered (as buyer or seller)
      const checkBuyerResponse = await fetch("/api/check-buyer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      
      if (checkBuyerResponse.ok) {
        const buyerData = await checkBuyerResponse.json();
        
        if (buyerData.exists && buyerData.isSeller) {
          setError("This email is already registered as a seller. Please login instead.");
          setLoading(false);
          return;
        }
        
        if (buyerData.exists && buyerData.isBuyer) {
          setError("This email is already registered as a buyer. Please login instead. If you want to become a seller, please use a different email address.");
          setLoading(false);
          return;
        }
      }
      
      // Check seller application status
      const appCheckResponse = await fetch("/api/check-seller-application", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (appCheckResponse.ok) {
        const appData = await appCheckResponse.json();
        
        if (appData.status === "approved") {
          hasApprovedApplication = true;
          applicationId = appData.applicationId;
          isSeller = true;
        } else if (appData.status === "pending") {
          setError("Your seller application is pending approval. Please wait for admin approval before signing up as a seller. You can sign up as a buyer with a different email.");
          setLoading(false);
          return;
        } else if (appData.status === "rejected") {
          // Rejected application - allow signup as buyer
          isBuyer = true;
        } else {
          // No application found - allow signup as buyer
          isBuyer = true;
        }
      } else {
        // No application - allow signup as buyer
        isBuyer = true;
      }
    } catch (checkError) {
      console.error("Error checking seller application:", checkError);
      // On error, allow signup as buyer
      isBuyer = true;
    }

    // If we get here, proceed with signup (either as seller with approved app, or as buyer)

    // FIRST: Check if user already exists (maybe from previous signup attempt)
    // If they exist and have approved application, just sign them in directly
    console.log("Checking if user already exists...");
    try {
      const checkResponse = await fetch("/api/check-user-exists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      
      if (checkResponse.ok) {
        const checkData = await checkResponse.json();
        if (checkData.exists && checkData.userId) {
          // User already exists! Try to sign them in directly
          console.log("User already exists, attempting to sign in directly...");
          
          const supabase = createSupabaseBrowserClient();
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          
          if (!signInError && signInData?.user) {
            // Successfully signed in! Redirect to account
            console.log("✅ Successfully signed in existing user");
            setLoading(false);
            router.push("/account");
            return;
          } else {
            // Sign in failed - maybe wrong password, continue with signup attempt
            console.log("Sign in failed, will attempt signup:", signInError?.message);
          }
        }
      }
    } catch (checkErr) {
      console.warn("Error checking if user exists, continuing with signup:", checkErr);
    }

    // User doesn't exist or sign in failed - proceed with signup
    // For approved sellers, use admin API to bypass rate limits
    let signUpData: any = null;
    let signUpError: any = null;

    if (hasApprovedApplication) {
      // Use admin API to create user (bypasses rate limits)
      console.log("User has approved application - using admin API to create account...");
      try {
        const adminCreateResponse = await fetch("/api/create-user-admin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            email, 
            password, 
            username,
            applicationId 
          }),
        });

        const adminCreateData = await adminCreateResponse.json();

        if (adminCreateResponse.ok && adminCreateData.userId) {
          // User created successfully via admin API
          signUpData = { user: { id: adminCreateData.userId, email: adminCreateData.email } };
          signUpError = null;
          console.log("✅ User created via admin API:", adminCreateData.userId);
        } else if (adminCreateData.code === "USER_EXISTS") {
          // User already exists, try to sign them in
          console.log("User already exists, attempting to sign in...");
          const supabase = createSupabaseBrowserClient();
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          
          if (!signInError && signInData?.user) {
            setLoading(false);
            router.push("/account");
            return;
          } else {
            setError("Account already exists. Please sign in instead.");
            setLoading(false);
            return;
          }
        } else {
          // Admin API failed, fall back to regular signup
          console.log("Admin API failed, falling back to regular signup:", adminCreateData.error);
          signUpError = { message: adminCreateData.error || "Failed to create account" };
        }
      } catch (adminErr) {
        console.error("Error using admin API, falling back to regular signup:", adminErr);
        // Fall through to regular signup
      }
    }

    // If admin API wasn't used or failed, use buyer admin API (to auto-confirm email)
    if (!signUpData) {
      // For buyers, use buyer admin API to auto-confirm email (no confirmation needed)
      console.log("Buyer signup - using buyer admin API to create account with auto-confirmed email...");
      try {
        const buyerCreateResponse = await fetch("/api/create-user-buyer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            email, 
            password, 
            username
          }),
        });

        const buyerCreateData = await buyerCreateResponse.json();

        if (buyerCreateResponse.ok && buyerCreateData.userId) {
          signUpData = { user: { id: buyerCreateData.userId, email: buyerCreateData.email } };
          signUpError = null;
          console.log("✅ Buyer created via admin API:", buyerCreateData.userId);
        } else if (buyerCreateData.code === "USER_EXISTS" || buyerCreateData.code === "ALREADY_SELLER") {
          // User already exists, try to sign them in
          console.log("User already exists, attempting to sign in...");
          const supabase = createSupabaseBrowserClient();
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          
          if (!signInError && signInData?.user) {
            setLoading(false);
            const redirectUrl = searchParams.get("redirect");
            router.push(redirectUrl || "/account");
            return;
          } else {
            setError(buyerCreateData.error || "Account already exists. Please sign in instead.");
            setLoading(false);
            return;
          }
        } else {
          // Buyer admin API failed, show error
          console.log("Buyer admin API failed:", buyerCreateData.error);
          signUpError = { message: buyerCreateData.error || "Failed to create account" };
        }
      } catch (buyerErr) {
        console.error("Error using buyer admin API:", buyerErr);
        signUpError = { message: "Failed to create account. Please try again." };
      }
    }

    // Handle errors
    if (signUpError) {
      const errorMsg = signUpError.message || "";
      
      // If it's a trigger error about approved application, show error immediately
      if (errorMsg.includes("approved seller application") || 
          errorMsg.includes("No approved seller application") ||
          errorMsg.includes("User signup blocked")) {
        setError("No approved seller application found for this email. Please ensure your seller application is approved and the email matches exactly. Contact support if you believe this is an error.");
        setLoading(false);
        return;
      }
      
      // Rate limit errors should not happen for approved sellers (we use admin API)
      // But if they do, show a helpful message
      if (errorMsg.includes("rate limit") || errorMsg.includes("rate_limit")) {
        if (hasApprovedApplication) {
          setError("Signup temporarily unavailable. Please try again in a moment or contact support.");
        } else {
          setError("Too many signup attempts. Please wait a few minutes and try again, or contact support if this persists.");
        }
        setLoading(false);
        return;
      }
      
      // For other errors, try recovery (user might have been created)
      console.log("Signup error detected, attempting recovery...", errorMsg);
        
        // Wait a moment for user to be committed
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Try to find user by email (limited attempts)
        let userFound = false;
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            const checkResponse = await fetch("/api/check-user-exists", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email }),
            });
            
            if (checkResponse.ok) {
              const checkData = await checkResponse.json();
              if (checkData.exists && checkData.userId) {
                signUpData = { user: { id: checkData.userId } };
                signUpError = null;
                userFound = true;
                console.log(`✅ User found on attempt ${attempt + 1}:`, checkData.userId);
                break;
              }
            }
          } catch (checkErr) {
            console.warn(`Check attempt ${attempt + 1} failed:`, checkErr);
          }
          
          if (!userFound && attempt < 2) {
            await new Promise(resolve => setTimeout(resolve, 1500));
          }
        }
        
        // If user not found, show error immediately (don't keep trying)
        if (!userFound) {
          if (errorMsg.includes("already registered") || errorMsg.includes("already been registered")) {
            setError("An account with this email already exists. Please sign in instead.");
          } else if (errorMsg.includes("password") || errorMsg.includes("Password")) {
            setError("Password is too weak. Please use a stronger password (at least 6 characters).");
          } else {
            setError(
              `Signup error: ${errorMsg || "Database error updating user"}\n\n` +
              `If you have an approved seller application, please verify:\n` +
              `1. The email in your application matches exactly: ${email}\n` +
              `2. Your application status is "approved"\n` +
              `3. Contact support if the issue persists`
            );
          }
          setLoading(false);
          return;
        }
      }

      if (!signUpData?.user) {
        // Log the actual error for debugging
        console.error("Signup failed - no user data:", {
          signUpError,
          signUpData,
          email
        });
        
        // Try one more time to find the user
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        try {
          const finalCheck = await fetch("/api/check-user-exists", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email }),
          });
          
          if (finalCheck.ok) {
            const finalData = await finalCheck.json();
            if (finalData.exists && finalData.userId) {
              signUpData = { user: { id: finalData.userId } };
              console.log("User found on final check:", finalData.userId);
            }
          }
        } catch (finalErr) {
          console.error("Final check failed:", finalErr);
        }
        
        if (!signUpData?.user) {
          const errorMsg = signUpError?.message || "Unknown error";
          setError(`Failed to create account: ${errorMsg}. Please check the browser console for details.`);
          setLoading(false);
          return;
        }
      }

      // Wait for user to be committed (especially important for admin-created users)
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Only create seller account if they have approved application
      if (hasApprovedApplication && isSeller) {
        console.log("Creating seller account for approved seller...");
        const sellerResponse = await fetch("/api/create-seller", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            userId: signUpData.user.id,
            email,
            username,
            applicationId: applicationId
          }),
        });

        if (!sellerResponse.ok) {
          const errorData = await sellerResponse.json();
          
          // If seller already exists, that's okay
          if (errorData.message?.includes("already exists") || errorData.error?.includes("duplicate")) {
            // Continue - seller exists
          } else if (errorData.code === "ALREADY_BUYER") {
            setError("This email is already registered as a buyer. A buyer account cannot be converted to a seller account. Please use a different email for seller registration.");
            setLoading(false);
            return;
          } else if (errorData.code === "USER_NOT_FOUND") {
            setError("Account created but user verification failed. Please wait a moment and try logging in.");
            setLoading(false);
            return;
          } else {
            setError(errorData.error || errorData.message || "Seller account creation failed. Please try logging in - your account may still work.");
            setLoading(false);
            return;
          }
        }
      } else {
        // Buyer signup - create buyer record
        console.log("Buyer signup - creating buyer account...");
        const buyerResponse = await fetch("/api/create-buyer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            userId: signUpData.user.id,
            email,
            username
          }),
        });

        if (!buyerResponse.ok) {
          const errorData = await buyerResponse.json();
          
          // If buyer already exists, that's okay
          if (errorData.message?.includes("already exists") || errorData.error?.includes("duplicate")) {
            // Continue - buyer exists
          } else if (errorData.code === "ALREADY_SELLER") {
            setError("This email is already registered as a seller. A seller account cannot be converted to a buyer account. Please use a different email for buyer registration.");
            setLoading(false);
            return;
          } else if (errorData.code === "USER_NOT_FOUND") {
            setError("Account created but user verification failed. Please wait a moment and try logging in.");
            setLoading(false);
            return;
          } else {
            console.warn("Buyer account creation failed, but continuing:", errorData);
            // Continue anyway - user account is created
          }
        }
      }

      // Notify admin
      try {
        await fetch("/api/notify-admin-signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            email, 
            userId: signUpData.user.id,
            username 
          }),
        });
      } catch (notifyError) {
        // Don't fail signup if notification fails
        console.warn("Failed to notify admin:", notifyError);
      }

      // Success - automatically sign the user in
      console.log("Signup successful, automatically signing in...");
      
      // Create supabase client for sign in
      const supabaseClient = createSupabaseBrowserClient();
      
      // Wait a bit more for admin-created users to be fully ready
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Try to sign in - if it fails, just redirect to login page
      const { data: signInData, error: signInError } = await supabaseClient.auth.signInWithPassword({
        email,
        password,
      });
      
      if (signInError || !signInData?.user) {
        // If auto-login fails, redirect to login page (user can sign in manually)
        console.warn("Auto-login failed, redirecting to login:", signInError?.message);
        setLoading(false);
        // Use setTimeout to avoid navigation errors
        setTimeout(() => {
          router.push("/login?signup=success");
        }, 100);
        return;
      }
      
      // Successfully signed in! Redirect based on role
      console.log("✅ Successfully signed in, checking role for redirect...");
      
      // Get user profile to determine redirect
      const profileRes = await fetch("/api/profile", {
        headers: { Authorization: `Bearer ${signInData.session?.access_token}` },
      });
      
      if (profileRes.ok) {
        const { profile } = await profileRes.json();
        const userRole = profile?.role;
        
        if (userRole === "admin") {
          router.push("/admin");
        } else if (userRole === "seller") {
          router.push("/dashboard");
        } else {
          // Buyer or no role - go to account page
          router.push("/account");
        }
      } else {
        // No profile yet - redirect based on signup type
        const redirectUrl = searchParams.get("redirect");
        
        if (redirectUrl) {
          router.push(redirectUrl);
        } else if (hasApprovedApplication && isSeller) {
          // Seller with approved app - might need to wait for seller record
          setTimeout(() => router.push("/dashboard"), 1000);
        } else {
          // Buyer - go to account page
          router.push("/account");
        }
      }
      
      setLoading(false);
      
    } catch (err: any) {
      console.error("Signup error:", err);
      console.error("Error details:", {
        message: err?.message,
        stack: err?.stack,
        name: err?.name
      });
      
      // More specific error messages
      if (err?.message?.includes("router")) {
        setError("Account created successfully! Please sign in to continue.");
        setLoading(false);
        setTimeout(() => {
          router.push("/login?signup=success");
        }, 2000);
      } else {
        setError(`An unexpected error occurred: ${err?.message || "Unknown error"}. Your account may have been created - please try signing in.`);
        setLoading(false);
        setTimeout(() => {
          router.push("/login?signup=success");
        }, 3000);
      }
    }
  };

  return (
    <div className="min-h-screen bg-black py-20 sm:py-24">
      <div className="max-w-lg mx-auto px-4 sm:px-6">
        <h1 className="font-serif text-3xl sm:text-4xl mb-4 sm:mb-6 font-bold">
          <span className="text-gradient-luxury">Create Buyer Account</span>
        </h1>
        <p className="text-white/70 text-sm sm:text-base mb-8 sm:mb-10">Sign up as a buyer to browse and purchase from the private luxury marketplace.</p>
        
        <div className="mb-6 flex flex-col sm:flex-row gap-3">
          <Link href="/signup/seller" className="flex-1">
            <Button variant="outline" className="w-full">
              Sign up as Seller
            </Button>
          </Link>
        </div>

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
            {loading ? "Creating account..." : "Create Account"}
          </Button>
        </form>

        <p className="text-white/50 text-sm mt-8">
          Already have an account?{" "}
          <Link href="/login" className="text-gold hover:text-gold/80 transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black py-24">
        <div className="max-w-lg mx-auto px-6 text-center">
          <p className="text-white/70">Loading...</p>
        </div>
      </div>
    }>
      <SignupContent />
    </Suspense>
  );
}
