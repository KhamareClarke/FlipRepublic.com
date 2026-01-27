import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getUserFromRequest } from "@/lib/supabase/auth";
import { sendEmail } from "@/lib/email";

export async function PATCH(
  request: NextRequest,
  context: { params: { id: string } }
) {
  const user = await getUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseAdminClient();
  
  // Check if user is the seller of this order
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("*")
    .eq("id", context.params.id)
    .single();

  if (orderError || !order) {
    console.error("Order fetch error:", orderError);
    return NextResponse.json({ error: orderError?.message ?? "Order not found." }, { status: 404 });
  }

  // Verify user is the seller
  if (order.seller_id !== user.id) {
    return NextResponse.json({ error: "Unauthorized. You can only update your own orders." }, { status: 403 });
  }

  const payload = await request.json();
  const { status } = payload;

  if (!status || !["paid", "out_for_delivery", "delivered", "refunded", "cancelled"].includes(status)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  // Update order status
  const { data: updatedOrder, error: updateError } = await supabase
    .from("orders")
    .update({ status })
    .eq("id", context.params.id)
    .select("*")
    .single();

  if (updateError || !updatedOrder) {
    console.error("Order update error:", updateError);
    return NextResponse.json({ 
      error: updateError?.message ?? "Failed to update order.",
      details: updateError 
    }, { status: 500 });
  }

  // Get product name for email
  let productName = "Product";
  try {
    const { data: product } = await supabase
      .from("products")
      .select("name")
      .eq("id", order.product_id)
      .single();
    if (product) {
      productName = product.name;
    }
  } catch (err) {
    console.error("Failed to fetch product:", err);
  }

  // Send email notification to buyer when status changes
  try {
    const { data: buyerAuthUser } = await supabase.auth.admin.getUserById(order.buyer_id);
    const buyerEmail = buyerAuthUser?.user?.email;
    
    if (buyerEmail) {
      const statusMessages: Record<string, string> = {
        out_for_delivery: "Your order is out for delivery!",
        delivered: "Your order has been delivered!",
        refunded: "Your order has been refunded.",
        cancelled: "Your order has been cancelled.",
      };

      const message = statusMessages[status] || `Your order status has been updated to: ${status}`;
      
      await sendEmail({
        to: buyerEmail,
        subject: `Order Update - FlipRepublic`,
        text: `${message}

Order ID: ${order.id}
Product: ${productName}
Amount: £${Number(order.amount).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
Status: ${status}

${status === "delivered" ? "Thank you for your purchase! We hope you enjoy your item." : ""}

View your order details:
${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/account

Thank you!`,
      });
    }
  } catch (emailError) {
    console.error("Failed to send buyer notification:", emailError);
    // Don't fail the update if email fails
  }

  return NextResponse.json({ order: updatedOrder });
}
