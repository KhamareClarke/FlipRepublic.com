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

  // First, verify the user exists in auth.users (try by ID first, then by email)
  let userExists = false;
  let verifiedUserId = userId;
  let retries = 10; // Increased retries
  
  // Try to find user by ID first
  while (retries > 0 && !userExists) {
    try {
      const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId);
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
      console.log(`User not found by ID yet (${11 - retries}/10 attempts), waiting...`);
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
    retries--;
  }

  // If not found by ID, try to find by email
  if (!userExists && email) {
    console.log(`User not found by ID, trying to find by email: ${email}`);
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
    console.error(`User ${userId} (email: ${email}) not found in auth.users after all attempts`);
    return NextResponse.json({ 
      error: "User not found in authentication system. The account may not have been created successfully. Please try signing up again.",
      code: "USER_NOT_FOUND",
      userId,
      email
    }, { status: 404 });
  }

  // Use the verified user ID
  userId = verifiedUserId;

  // Check if profile already exists (use maybeSingle to avoid error if not found)
  const { data: existingProfile, error: checkError } = await supabase
    .from("profiles")
    .select("user_id, username, role, is_verified, is_admin_approved")
    .eq("user_id", userId)
    .maybeSingle();

  if (existingProfile) {
    console.log(`Profile already exists for user ${userId}:`, existingProfile);
    return NextResponse.json({ 
      success: true, 
      message: "Profile already exists.",
      profile: existingProfile,
      role: existingProfile.role,
      isSeller: existingProfile.role === "seller"
    });
  }

  // Log if there was an error checking (but continue - might be fine)
  if (checkError && checkError.code !== 'PGRST116') {
    console.warn("Warning checking for existing profile:", checkError);
  }

  // Generate unique username
  let baseUsername = username || email.split("@")[0];
  baseUsername = baseUsername.replace(/[^a-zA-Z0-9_-]/g, "").substring(0, 50);
  if (!baseUsername || baseUsername.length === 0) {
    baseUsername = "user";
  }

  let finalUsername = baseUsername;
  let counter = 0;

  // Find unique username
  while (counter < 1000) {
    const { data: existing } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("username", finalUsername)
      .single();

    if (!existing) {
      break;
    }

    counter++;
    finalUsername = `${baseUsername}-${counter}`;
  }

  // If still not unique, use timestamp
  if (counter >= 1000) {
    finalUsername = `user-${Date.now()}-${userId.substring(0, 8)}`;
  }

  // Check for approved seller application
  let userRole = "buyer";
  let isVerified = false;

  // Get all approved applications to check email match
  const { data: allApps, error: appsError } = await supabase
    .from("seller_applications")
    .select("id, identity_info, user_id, status")
    .eq("status", "approved")
    .is("user_id", null)
    .limit(100);

  if (appsError) {
    console.error("Error fetching seller applications:", appsError);
  }

  const matchingApp = allApps?.find((app: any) => {
    const appEmail = app.identity_info?.email?.toLowerCase()?.trim();
    const signupEmail = email.toLowerCase().trim();
    const matches = appEmail === signupEmail;
    if (matches) {
      console.log(`✅ Found approved seller application for ${email} - setting role to seller`);
    }
    return matches;
  });

  if (matchingApp) {
    userRole = "seller";
    isVerified = true;
    console.log(`Seller profile will be created for user ${userId} with application ID ${matchingApp.id}`);
  } else {
    console.log(`No approved seller application found for ${email} - creating buyer profile`);
  }

  // Insert profile
  console.log(`Attempting to create profile for user ${userId} with username ${finalUsername}, role ${userRole}`);
  const { data: profile, error } = await supabase
    .from("profiles")
    .insert({
      user_id: userId,
      username: finalUsername,
      role: userRole,
      is_verified: isVerified,
      is_admin_approved: false,
    })
    .select()
    .single();

  if (error) {
    console.error("Profile creation error details:", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      fullError: error
    });
    
    // Check if it's a duplicate key error (profile might have been created between check and insert)
    if (error.code === '23505' || error.message?.includes('duplicate') || error.message?.includes('already exists')) {
      console.log("Profile might already exist, fetching it...");
      const { data: existing } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .single();
      
      if (existing) {
        console.log("Found existing profile:", existing);
        return NextResponse.json({ 
          success: true, 
          message: "Profile already exists.",
          profile: existing,
          role: existing.role,
          isSeller: existing.role === "seller"
        });
      }
    }
    
    return NextResponse.json({ 
      error: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint
    }, { status: 500 });
  }
  
  console.log(`✅ Profile created successfully:`, profile);

  // Link seller application if found
  if (matchingApp) {
    const { error: linkError } = await supabase
      .from("seller_applications")
      .update({ user_id: userId })
      .eq("id", matchingApp.id);
    
    if (linkError) {
      console.error("Error linking seller application:", linkError);
    } else {
      console.log(`✅ Successfully linked seller application ${matchingApp.id} to user ${userId}`);
    }
  }

  return NextResponse.json({ 
    success: true, 
    profile,
    role: userRole,
    isSeller: userRole === "seller"
  });
}
