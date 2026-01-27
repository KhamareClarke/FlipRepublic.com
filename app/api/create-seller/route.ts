import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const payload = await request.json();
  let { userId, email, username, applicationId } = payload;

  if (!userId || !email) {
    return NextResponse.json({ error: "userId and email are required." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();

  // First, verify the user exists in auth.users (try by ID first, then by email)
  let userExists = false;
  let verifiedUserId = userId;
  let retries = 10;
  
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

  // Check if user is already a buyer (exists in auth.users but not in sellers)
  // This prevents same email from being both buyer and seller
  const { data: existingSeller, error: checkError } = await supabase
    .from("sellers")
    .select("user_id, username, seller_application_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (existingSeller) {
    console.log(`Seller already exists for user ${userId}:`, existingSeller);
    return NextResponse.json({ 
      success: true, 
      message: "Seller account already exists.",
      seller: existingSeller
    });
  }

  // Check if user exists in auth.users but not in sellers = they're a buyer
  // This means they signed up as a buyer and can't become a seller with same email
  const { data: authUser } = await supabase.auth.admin.getUserById(userId);
  if (authUser?.user) {
    // User exists in auth.users, check if they have any seller record
    const { data: anySeller } = await supabase
      .from("sellers")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();
    
    if (!anySeller) {
      // User exists but no seller record = they're a buyer
      // Check if they have an approved seller application (they might be converting)
      const { data: allApps } = await supabase
        .from("seller_applications")
        .select("id, status, identity_info")
        .eq("status", "approved")
        .limit(100);
      
      const emailLower = email.toLowerCase().trim();
      const matchingApp = allApps?.find((app: any) => {
        const appEmail = app.identity_info?.email?.toLowerCase()?.trim();
        return appEmail === emailLower;
      });
      
      if (!matchingApp) {
        return NextResponse.json({ 
          error: "This email is already registered as a buyer. A buyer account cannot be converted to a seller account. Please use a different email for seller registration.",
          code: "ALREADY_BUYER"
        }, { status: 409 });
      }
      // If they have approved application, allow conversion (they're upgrading from buyer to seller)
    }
  }

  // Log if there was an error checking (but continue - might be fine)
  if (checkError && checkError.code !== 'PGRST116') {
    console.warn("Warning checking for existing seller:", checkError);
  }

  // Generate unique username
  let baseUsername = username || email.split("@")[0];
  baseUsername = baseUsername.replace(/[^a-zA-Z0-9_-]/g, "").substring(0, 50);
  if (!baseUsername || baseUsername.length === 0) {
    baseUsername = "seller";
  }

  let finalUsername = baseUsername;
  let counter = 0;

  // Find unique username
  while (counter < 1000) {
    const { data: existing } = await supabase
      .from("sellers")
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
    finalUsername = `seller-${Date.now()}-${userId.substring(0, 8)}`;
  }

  // Verify they have an approved seller application
  let approvedApplicationId = applicationId;
  
  if (!approvedApplicationId) {
    // Try to find approved application by email
    const { data: allApps, error: appsError } = await supabase
      .from("seller_applications")
      .select("id, identity_info, status")
      .eq("status", "approved")
      .is("user_id", null)
      .limit(100);

    if (appsError) {
      console.error("Error fetching seller applications:", appsError);
    }

    const matchingApp = allApps?.find((app: any) => {
      const appEmail = app.identity_info?.email?.toLowerCase()?.trim();
      const signupEmail = email.toLowerCase().trim();
      return appEmail === signupEmail;
    });

    if (matchingApp) {
      approvedApplicationId = matchingApp.id;
      console.log(`✅ Found approved seller application ${approvedApplicationId} for ${email}`);
    } else {
      console.error(`❌ No approved seller application found for ${email}`);
      return NextResponse.json({ 
        error: "No approved seller application found. You must have an approved application to create a seller account.",
        code: "NO_APPROVED_APPLICATION"
      }, { status: 403 });
    }
  }

  // Check if the seller application is approved - if so, auto-approve the user
  let shouldAutoApprove = false;
  if (approvedApplicationId) {
    const { data: application } = await supabase
      .from("seller_applications")
      .select("status")
      .eq("id", approvedApplicationId)
      .single();
    
    if (application?.status === "approved") {
      shouldAutoApprove = true;
      console.log(`✅ Seller application is approved - auto-approving user ${userId}`);
    }
  }

  // Insert seller record
  console.log(`Attempting to create seller for user ${userId} with username ${finalUsername}`);
  const { data: seller, error } = await supabase
    .from("sellers")
    .insert({
      user_id: userId,
      username: finalUsername,
      is_admin_approved: shouldAutoApprove, // Auto-approve if they have approved seller application
      seller_application_id: approvedApplicationId,
    })
    .select()
    .single();

  if (error) {
    console.error("Seller creation error details:", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      fullError: error
    });
    
    // Check if it's a duplicate key error
    if (error.code === '23505' || error.message?.includes('duplicate') || error.message?.includes('already exists')) {
      console.log("Seller might already exist, fetching it...");
      const { data: existing } = await supabase
        .from("sellers")
        .select("*")
        .eq("user_id", userId)
        .single();
      
      if (existing) {
        console.log("Found existing seller:", existing);
        
        // If seller exists but isn't approved and has approved application, auto-approve them
        if (!existing.is_admin_approved && shouldAutoApprove) {
          console.log("Auto-approving existing seller with approved application...");
          const { data: updatedSeller, error: updateError } = await supabase
            .from("sellers")
            .update({ 
              is_admin_approved: true,
              seller_application_id: approvedApplicationId || existing.seller_application_id
            })
            .eq("user_id", userId)
            .select()
            .single();
          
          if (!updateError && updatedSeller) {
            console.log("✅ Successfully auto-approved existing seller");
            return NextResponse.json({ 
              success: true, 
              message: "Seller account already exists and has been auto-approved.",
              seller: updatedSeller
            });
          }
        }
        
        return NextResponse.json({ 
          success: true, 
          message: "Seller account already exists.",
          seller: existing
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
  
  console.log(`✅ Seller created successfully:`, seller);

  // Link seller application to user
  if (approvedApplicationId) {
    const { error: linkError } = await supabase
      .from("seller_applications")
      .update({ user_id: userId })
      .eq("id", approvedApplicationId);
    
    if (linkError) {
      console.error("Error linking seller application:", linkError);
    } else {
      console.log(`✅ Successfully linked seller application ${approvedApplicationId} to user ${userId}`);
    }
  }

  return NextResponse.json({ 
    success: true, 
    seller
  });
}
