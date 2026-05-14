import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getUserFromRequest } from "@/lib/supabase/auth";
import { sendEmail } from "@/lib/email";
import {
  tplOrderCancelledBuyer,
  tplOrderCompletedBuyer,
  tplOrderRefundedBuyer,
  tplOrderShippedBuyer,
  tplSellerOrderStatusSelf,
} from "@/lib/email-templates";

export const runtime = "nodejs";

const ORDER_STATUSES = ["paid", "shipped", "completed", "refunded", "cancelled"] as const;

function isOrderStatus(s: string): s is (typeof ORDER_STATUSES)[number] {
  return (ORDER_STATUSES as readonly string[]).includes(s);
}

export async function PATCH(
  request: NextRequest,
  context: { params: { id: string } }
) {
  const user = await getUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseAdminClient();

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("*")
    .eq("id", context.params.id)
    .single();

  if (orderError || !order) {
    console.error("Order fetch error:", orderError);
    return NextResponse.json({ error: orderError?.message ?? "Order not found." }, { status: 404 });
  }

  if (order.seller_id !== user.id) {
    return NextResponse.json({ error: "Unauthorized. You can only update your own orders." }, { status: 403 });
  }

  const payload = await request.json();
  const { status } = payload;

  if (!status || !isOrderStatus(status)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  const { data: updatedOrder, error: updateError } = await supabase
    .from("orders")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", context.params.id)
    .select("*")
    .single();

  if (updateError || !updatedOrder) {
    console.error("Order update error:", updateError);
    return NextResponse.json(
      {
        error: updateError?.message ?? "Failed to update order.",
        details: updateError,
      },
      { status: 500 }
    );
  }

  let productName = "Product";
  try {
    const { data: product } = await supabase.from("products").select("name").eq("id", order.product_id).single();
    if (product?.name) productName = product.name;
  } catch (err) {
    console.error("Failed to fetch product:", err);
  }

  try {
    const { data: buyerAuthUser } = await supabase.auth.admin.getUserById(order.buyer_id);
    const buyerEmail = buyerAuthUser?.user?.email;
    if (buyerEmail) {
      let mail = null;
      if (status === "shipped") {
        mail = tplOrderShippedBuyer({
          orderId: order.id,
          productName,
        });
      } else if (status === "completed") {
        mail = tplOrderCompletedBuyer({ orderId: order.id, productName });
      } else if (status === "refunded") {
        mail = tplOrderRefundedBuyer({ orderId: order.id, productName });
      } else if (status === "cancelled") {
        mail = tplOrderCancelledBuyer({ orderId: order.id, productName });
      }

      if (mail) {
        await sendEmail({ to: buyerEmail, ...mail });
      }
    }

    const { data: sellerAuthUser } = await supabase.auth.admin.getUserById(user.id);
    const sellerSelfEmail = sellerAuthUser?.user?.email;
    if (sellerSelfEmail) {
      const selfMail = tplSellerOrderStatusSelf({
        orderId: order.id,
        productName,
        status,
      });
      await sendEmail({ to: sellerSelfEmail, ...selfMail });
    }
  } catch (emailError) {
    console.error("Failed to send buyer notification:", emailError);
  }

  return NextResponse.json({ order: updatedOrder });
}
