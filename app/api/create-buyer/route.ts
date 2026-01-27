import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const payload = await request.json();
  let { userId, email, username } = payload;

  if (!userId || !email) {
    return NextResponse.json({ error: "userId and email are required." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();

  // Verify user exists in auth.users
  let userExists = false;
  let verifiedUserId = userId;
  let retries = 10;
  
  while (retries > 0 && !userExists) {
    try {
      const { data: authUser } = await supabase.auth.admin.getUserById(userId);
      if (authUser?.user?.id) {
        userExists = true;
        verifiedUserId = authUser.user.id;
        console.log(`✅ User verified in auth.users by ID: ${verifiedUserId}`);
        break;
      }
    } catch (err) {
      // Ignore errors, try again
    }
    
    if (!userExists && retries > 1) {
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
    retries--;
  }

  if (!userExists && email) {
    try {
      const { data: users } = await supabase.auth.admin.listUsers();
      const matchingUser = users?.users?.find(
        (u) => u.email?.toLowerCase().trim() === email.toLowerCase().trim()
      );
      
      if (matchingUser?.id) {
        userExists = true;
        verifiedUserId = matchingUser.id;
        console.log(`✅ User found by email in auth.users: ${verifiedUserId}`);
      }
    } catch (err) {
      console.error("Error searching users by email:", err);
    }
  }

  if (!userExists) {
    return NextResponse.json({ 
      error: "User not found in authentication system.",
      code: "USER_NOT_FOUND"
    }, { status: 404 });
  }

  userId = verifiedUserId;

  // Check if buyer already exists
  const { data: existingBuyer } = await supabase
    .from("buyers")
    .select("user_id, username")
    .eq("user_id", userId)
    .maybeSingle();

  if (existingBuyer) {
    return NextResponse.json({ 
      success: true, 
      message: "Buyer account already exists.",
      buyer: existingBuyer
    });
  }

  // Check if user is already a seller (prevent same email being both)
  const { data: existingSeller } = await supabase
    .from("sellers")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (existingSeller) {
    return NextResponse.json({ 
      error: "This email is already registered as a seller. A seller account cannot be converted to a buyer account. Please use a different email for buyer registration.",
      code: "ALREADY_SELLER"
    }, { status: 409 });
  }

  // Generate unique username
  let baseUsername = username || email.split("@")[0];
  baseUsername = baseUsername.replace(/[^a-zA-Z0-9_-]/g, "").substring(0, 50);
  if (!baseUsername || baseUsername.length === 0) {
    baseUsername = "buyer";
  }

  let finalUsername = baseUsername;
  let counter = 0;

  while (counter < 1000) {
    const { data: existing } = await supabase
      .from("buyers")
      .select("user_id")
      .eq("username", finalUsername)
      .single();

    if (!existing) {
      break;
    }

    counter++;
    finalUsername = `${baseUsername}-${counter}`;
  }

  if (counter >= 1000) {
    finalUsername = `buyer-${Date.now()}-${userId.substring(0, 8)}`;
  }

  // Create buyer record
  const { data: buyer, error } = await supabase
    .from("buyers")
    .insert({
      user_id: userId,
      email: email.toLowerCase().trim(),
      username: finalUsername,
    })
    .select("*")
    .single();

  if (error) {
    console.error("Error creating buyer:", error);
    return NextResponse.json({ 
      error: error.message || "Failed to create buyer account.",
      code: "BUYER_CREATION_FAILED"
    }, { status: 500 });
  }

  console.log(`✅ Buyer created successfully: ${buyer.user_id}`);

  return NextResponse.json({ 
    success: true,
    buyer,
    message: "Buyer account created successfully."
  });
}
