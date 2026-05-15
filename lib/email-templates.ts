/**
 * Branded HTML + plain-text bodies for transactional mail.
 * Pair with `sendEmail` from `@/lib/email` (pass `html` alongside `text`).
 */

import { getSiteBaseUrl } from "@/lib/site-url";

export type EmailContent = {
  subject: string;
  text: string;
  html: string;
};

const defaultBaseUrl = () => getSiteBaseUrl();

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Shared FlipRepublic luxury frame (table-based for clients). */
export function wrapLuxuryEmail(opts: {
  title: string;
  intro?: string;
  bodyHtml: string;
  ctaLabel?: string;
  ctaHref?: string;
  footer?: string;
}): string {
  const { title, intro, bodyHtml, ctaLabel, ctaHref, footer } = opts;
  const base = defaultBaseUrl();
  const ctaBlock =
    ctaLabel && ctaHref
      ? `<p style="margin:28px 0 0;text-align:center;">
          <a href="${escapeHtml(ctaHref)}" style="display:inline-block;padding:14px 28px;background:linear-gradient(135deg,#c9a227,#8b6914);color:#0a0a0a;font-weight:bold;text-decoration:none;border-radius:6px;font-size:14px;">${escapeHtml(ctaLabel)}</a>
        </p>`
      : "";
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width"/></head>
<body style="margin:0;background:#050505;color:#e8e4dc;font-family:Georgia,'Times New Roman',serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#050505;padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;border:1px solid rgba(201,162,39,0.45);border-radius:12px;background:#0c0c0c;overflow:hidden;">
<tr><td style="padding:28px 28px 8px;text-align:center;border-bottom:1px solid rgba(201,162,39,0.25);">
<p style="margin:0;font-size:11px;letter-spacing:0.35em;text-transform:uppercase;color:#c9a227;">FlipRepublic</p>
<h1 style="margin:12px 0 0;font-size:22px;font-weight:normal;color:#f5f0e6;">${escapeHtml(title)}</h1>
${intro ? `<p style="margin:14px 0 0;font-size:14px;line-height:1.6;color:#b8b3a8;font-family:system-ui,sans-serif;">${intro}</p>` : ""}
</td></tr>
<tr><td style="padding:24px 28px 32px;font-size:14px;line-height:1.65;color:#cfc8bc;font-family:system-ui,-apple-system,sans-serif;">
${bodyHtml}
${ctaBlock}
<p style="margin:32px 0 0;font-size:11px;color:#6a665c;line-height:1.5;font-family:system-ui,sans-serif;">
${escapeHtml(footer ?? `You are receiving this because you have an account or order at FlipRepublic.\n${base}`)}
</p>
</td></tr></table>
</td></tr></table></body></html>`;
}

function moneyGBP(n: number | string) {
  const v = typeof n === "string" ? Number(n) : n;
  if (Number.isNaN(v)) return "—";
  return `£${v.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ——— 15+ transactional templates ———

export function tplPasswordResetLink(args: { resetUrl: string; expiresIn?: string }): EmailContent {
  const { resetUrl, expiresIn = "1 hour" } = args;
  const subject = "Reset your FlipRepublic password";
  const text = `Reset your password using this link (expires in ${expiresIn}):\n${resetUrl}\n\nIf you did not request this, you can ignore this email.`;
  const html = wrapLuxuryEmail({
    title: "Password reset",
    intro: `We received a request to reset your password. Link expires in ${escapeHtml(expiresIn)}.`,
    bodyHtml: `<p>Use the button below to choose a new password.</p>`,
    ctaLabel: "Reset password",
    ctaHref: resetUrl,
  });
  return { subject, text, html };
}

export function tplEmailVerification(args: { verifyUrl: string }): EmailContent {
  const { verifyUrl } = args;
  const subject = "Verify your FlipRepublic email";
  const text = `Verify your email:\n${verifyUrl}`;
  const html = wrapLuxuryEmail({
    title: "Verify your email",
    intro: "Confirm your address to secure your account.",
    bodyHtml: `<p>One click and you are set.</p>`,
    ctaLabel: "Verify email",
    ctaHref: verifyUrl,
  });
  return { subject, text, html };
}

export function tplWelcomeBuyer(args: { displayName?: string }): EmailContent {
  const name = args.displayName?.trim() || "there";
  const base = defaultBaseUrl();
  const subject = "Welcome to FlipRepublic";
  const text = `Hi ${name},\n\nWelcome to the private market. Browse authenticated listings: ${base}/marketplace`;
  const html = wrapLuxuryEmail({
    title: `Welcome, ${escapeHtml(name)}`,
    intro: "Your buyer account is active.",
    bodyHtml: `<p>Explore curated, authenticated luxury — with buyer protection on every eligible purchase.</p>`,
    ctaLabel: "Enter marketplace",
    ctaHref: `${base}/marketplace`,
  });
  return { subject, text, html };
}

export function tplWelcomeSellerApproved(args: { displayName?: string }): EmailContent {
  const name = args.displayName?.trim() || "there";
  const base = defaultBaseUrl();
  const subject = "Your FlipRepublic seller access is approved";
  const text = `Hi ${name},\n\nYou can list items and manage orders here: ${base}/dashboard`;
  const html = wrapLuxuryEmail({
    title: "Seller access approved",
    intro: `Congratulations, ${escapeHtml(name)} — you are cleared to list on FlipRepublic.`,
    bodyHtml: `<p>Complete your first listing and respond to offers from your dashboard.</p>`,
    ctaLabel: "Open seller dashboard",
    ctaHref: `${base}/dashboard`,
  });
  return { subject, text, html };
}

export function tplOrderPlacedBuyer(args: {
  orderId: string;
  productName: string;
  amount: number | string;
  shippingSummary?: string;
}): EmailContent {
  const base = defaultBaseUrl();
  const subject = `Order confirmed — ${args.productName}`;
  const ship = args.shippingSummary ? `\n\nShipping:\n${args.shippingSummary}` : "";
  const text = `Your order is confirmed.\n\nOrder: ${args.orderId}\nItem: ${args.productName}\nTotal: ${moneyGBP(args.amount)}${ship}\n\nTrack status: ${base}/account`;
  const html = wrapLuxuryEmail({
    title: "Order confirmed",
    intro: "Thank you — payment is recorded.",
    bodyHtml: `<p><strong>Order</strong> ${escapeHtml(args.orderId)}</p>
<p><strong>Item</strong> ${escapeHtml(args.productName)}</p>
<p><strong>Total</strong> ${escapeHtml(moneyGBP(args.amount))}</p>
${args.shippingSummary ? `<p><strong>Shipping</strong><br/>${escapeHtml(args.shippingSummary).replace(/\n/g, "<br/>")}</p>` : ""}`,
    ctaLabel: "View account & orders",
    ctaHref: `${base}/account`,
  });
  return { subject, text, html };
}

export function tplOrderPlacedSeller(args: {
  orderId: string;
  productName: string;
  amount: number | string;
  buyerLabel: string;
  shippingBlock: string;
}): EmailContent {
  const base = defaultBaseUrl();
  const subject = `New order — ${args.productName}`;
  const text = `New order received.\n\nOrder: ${args.orderId}\nProduct: ${args.productName}\nAmount: ${moneyGBP(args.amount)}\nBuyer: ${args.buyerLabel}\n\n${args.shippingBlock}\n\nDashboard: ${base}/dashboard`;
  const html = wrapLuxuryEmail({
    title: "New order received",
    intro: "Ship promptly and update order status from your dashboard.",
    bodyHtml: `<p><strong>Order</strong> ${escapeHtml(args.orderId)}</p>
<p><strong>Product</strong> ${escapeHtml(args.productName)}</p>
<p><strong>Amount</strong> ${escapeHtml(moneyGBP(args.amount))}</p>
<p><strong>Buyer</strong> ${escapeHtml(args.buyerLabel)}</p>
<p><strong>Ship to</strong><br/>${escapeHtml(args.shippingBlock).replace(/\n/g, "<br/>")}</p>`,
    ctaLabel: "Seller dashboard",
    ctaHref: `${base}/dashboard`,
  });
  return { subject, text, html };
}

export function tplAdminNewOrder(args: {
  orderId: string;
  productName: string;
  amount: number | string;
  stripeSessionId?: string | null;
  paymentMode: string;
  sellerSummary: string;
  buyerSummary: string;
  shippingBlock: string;
}): EmailContent {
  const subject = `Admin: new paid order ${args.orderId}`;
  const text = `New paid order\nOrder: ${args.orderId}\nMode: ${args.paymentMode}\nProduct: ${args.productName}\nAmount: ${moneyGBP(args.amount)}\nSeller: ${args.sellerSummary}\nBuyer: ${args.buyerSummary}\n\n${args.shippingBlock}\nStripe: ${args.stripeSessionId ?? "—"}`;
  const html = wrapLuxuryEmail({
    title: "New paid order",
    intro: args.paymentMode,
    bodyHtml: `<p><strong>Order</strong> ${escapeHtml(args.orderId)}</p>
<p><strong>Product</strong> ${escapeHtml(args.productName)}</p>
<p><strong>Amount</strong> ${escapeHtml(moneyGBP(args.amount))}</p>
<p><strong>Seller</strong> ${escapeHtml(args.sellerSummary)}</p>
<p><strong>Buyer</strong> ${escapeHtml(args.buyerSummary)}</p>
<p><strong>Ship to</strong><br/>${escapeHtml(args.shippingBlock).replace(/\n/g, "<br/>")}</p>
<p><strong>Stripe session</strong> ${escapeHtml(args.stripeSessionId ?? "—")}</p>`,
  });
  return { subject, text, html };
}

export function tplOfferNewSeller(args: {
  productName: string;
  brand?: string;
  listPrice: number | string;
  offerPrice: number | string;
  buyerLabel: string;
}): EmailContent {
  const base = defaultBaseUrl();
  const subject = `New offer — ${args.productName}`;
  const text = `New offer on ${args.productName} (${args.brand ?? "—"}).\nListed: ${moneyGBP(args.listPrice)}\nOffer: ${moneyGBP(args.offerPrice)}\nBuyer: ${args.buyerLabel}\n\nRespond: ${base}/dashboard`;
  const html = wrapLuxuryEmail({
    title: "New offer received",
    intro: "A buyer submitted an offer on your listing.",
    bodyHtml: `<p><strong>Product</strong> ${escapeHtml(args.productName)}</p>
<p><strong>Brand</strong> ${escapeHtml(args.brand ?? "—")}</p>
<p><strong>List price</strong> ${escapeHtml(moneyGBP(args.listPrice))}</p>
<p><strong>Offer</strong> ${escapeHtml(moneyGBP(args.offerPrice))}</p>
<p><strong>Buyer</strong> ${escapeHtml(args.buyerLabel)}</p>`,
    ctaLabel: "Review offers",
    ctaHref: `${base}/dashboard`,
  });
  return { subject, text, html };
}

export function tplOfferAcceptedBuyer(args: {
  productName: string;
  brand?: string;
  offerPrice: number | string;
  listPrice: number | string;
  sellerName: string;
  productUrl: string;
}): EmailContent {
  const subject = `Offer accepted — ${args.productName}`;
  const text = `Your offer was accepted!\n\n${args.productName}\nBrand: ${args.brand ?? "—"}\nYour offer: ${moneyGBP(args.offerPrice)}\nList: ${moneyGBP(args.listPrice)}\nSeller: ${args.sellerName}\n\nComplete purchase: ${args.productUrl}`;
  const html = wrapLuxuryEmail({
    title: "Your offer was accepted",
    intro: "Complete checkout while inventory is held for you.",
    bodyHtml: `<p><strong>Product</strong> ${escapeHtml(args.productName)}</p>
<p><strong>Your offer</strong> ${escapeHtml(moneyGBP(args.offerPrice))}</p>
<p><strong>List price</strong> ${escapeHtml(moneyGBP(args.listPrice))}</p>
<p><strong>Seller</strong> ${escapeHtml(args.sellerName)}</p>`,
    ctaLabel: "View product",
    ctaHref: args.productUrl,
  });
  return { subject, text, html };
}

export function tplOfferRejectedBuyer(args: { productName: string; offerPrice: number | string }): EmailContent {
  const base = defaultBaseUrl();
  const subject = `Offer update — ${args.productName}`;
  const text = `Your offer of ${moneyGBP(args.offerPrice)} for ${args.productName} was declined.\nBrowse more: ${base}/marketplace`;
  const html = wrapLuxuryEmail({
    title: "Offer not accepted",
    intro: "The seller declined this round.",
    bodyHtml: `<p><strong>Product</strong> ${escapeHtml(args.productName)}</p>
<p><strong>Your offer</strong> ${escapeHtml(moneyGBP(args.offerPrice))}</p>`,
    ctaLabel: "Browse marketplace",
    ctaHref: `${base}/marketplace`,
  });
  return { subject, text, html };
}

export function tplOrderShippedBuyer(args: {
  orderId: string;
  productName: string;
  carrierLine?: string;
}): EmailContent {
  const base = defaultBaseUrl();
  const subject = `Shipped — ${args.productName}`;
  const text = `Your order ${args.orderId} is on the way.\nItem: ${args.productName}\n${args.carrierLine ?? ""}\n\nAccount: ${base}/account`;
  const html = wrapLuxuryEmail({
    title: "Order shipped",
    intro: "Your seller has marked this order as shipped.",
    bodyHtml: `<p><strong>Order</strong> ${escapeHtml(args.orderId)}</p>
<p><strong>Item</strong> ${escapeHtml(args.productName)}</p>
${args.carrierLine ? `<p>${escapeHtml(args.carrierLine)}</p>` : ""}`,
    ctaLabel: "Order details",
    ctaHref: `${base}/account`,
  });
  return { subject, text, html };
}

export function tplOrderCompletedBuyer(args: { orderId: string; productName: string }): EmailContent {
  const base = defaultBaseUrl();
  const subject = `Delivered — ${args.productName}`;
  const text = `Order ${args.orderId} is marked complete.\n${args.productName}\n\nThank you — ${base}/account`;
  const html = wrapLuxuryEmail({
    title: "Order completed",
    intro: "This sale is marked complete. Enjoy your pickup.",
    bodyHtml: `<p><strong>Order</strong> ${escapeHtml(args.orderId)}</p>
<p><strong>Item</strong> ${escapeHtml(args.productName)}</p>`,
    ctaLabel: "View account",
    ctaHref: `${base}/account`,
  });
  return { subject, text, html };
}

export function tplOrderRefundedBuyer(args: { orderId: string; productName: string }): EmailContent {
  const base = defaultBaseUrl();
  const subject = `Refund processed — ${args.productName}`;
  const text = `Order ${args.orderId} has been refunded.\n${args.productName}\n\nSupport: ${base}/trust`;
  const html = wrapLuxuryEmail({
    title: "Refund processed",
    intro: "Your order was updated to refunded.",
    bodyHtml: `<p><strong>Order</strong> ${escapeHtml(args.orderId)}</p>
<p><strong>Item</strong> ${escapeHtml(args.productName)}</p>`,
    ctaLabel: "Buyer protection",
    ctaHref: `${base}/trust`,
  });
  return { subject, text, html };
}

export function tplOrderCancelledBuyer(args: { orderId: string; productName: string }): EmailContent {
  const base = defaultBaseUrl();
  const subject = `Order cancelled — ${args.productName}`;
  const text = `Order ${args.orderId} was cancelled.\n${args.productName}\n\n${base}/account`;
  const html = wrapLuxuryEmail({
    title: "Order cancelled",
    intro: "The seller updated this order to cancelled.",
    bodyHtml: `<p><strong>Order</strong> ${escapeHtml(args.orderId)}</p>
<p><strong>Item</strong> ${escapeHtml(args.productName)}</p>`,
    ctaLabel: "Account",
    ctaHref: `${base}/account`,
  });
  return { subject, text, html };
}

export function tplOrderStatusBuyer(args: {
  orderId: string;
  productName: string;
  amount: number | string;
  status: string;
  headline: string;
}): EmailContent {
  const base = defaultBaseUrl();
  const subject = `Order update (${args.status}) — ${args.productName}`;
  const text = `${args.headline}\n\nOrder: ${args.orderId}\nProduct: ${args.productName}\nAmount: ${moneyGBP(args.amount)}\nStatus: ${args.status}\n\n${base}/account`;
  const html = wrapLuxuryEmail({
    title: "Order status update",
    intro: escapeHtml(args.headline),
    bodyHtml: `<p><strong>Status</strong> ${escapeHtml(args.status)}</p>
<p><strong>Order</strong> ${escapeHtml(args.orderId)}</p>
<p><strong>Product</strong> ${escapeHtml(args.productName)}</p>
<p><strong>Amount</strong> ${escapeHtml(moneyGBP(args.amount))}</p>`,
    ctaLabel: "View account",
    ctaHref: `${base}/account`,
  });
  return { subject, text, html };
}

export function tplSellerApplicationAdmin(args: {
  applicantEmail: string;
  username?: string;
  applicationId: string;
}): EmailContent {
  const base = defaultBaseUrl();
  const subject = "New seller application";
  const text = `New seller application\nID: ${args.applicationId}\nUser: ${args.username ?? "—"}\nEmail: ${args.applicantEmail}\n\nReview: ${base}/admin`;
  const html = wrapLuxuryEmail({
    title: "New seller application",
    intro: "Review identity and store details in admin.",
    bodyHtml: `<p><strong>Application</strong> ${escapeHtml(args.applicationId)}</p>
<p><strong>Email</strong> ${escapeHtml(args.applicantEmail)}</p>
<p><strong>Username</strong> ${escapeHtml(args.username ?? "—")}</p>`,
    ctaLabel: "Open admin",
    ctaHref: `${base}/admin`,
  });
  return { subject, text, html };
}

export function tplSellerApplicationPublicAdmin(args: { summary: string }): EmailContent {
  const base = defaultBaseUrl();
  const subject = "Seller application (public form)";
  const text = `${args.summary}\n\n${base}/admin`;
  const html = wrapLuxuryEmail({
    title: "Seller application submitted",
    intro: "Details from the public application form:",
    bodyHtml: `<pre style="white-space:pre-wrap;font-family:system-ui,sans-serif;font-size:13px;color:#cfc8bc;">${escapeHtml(args.summary)}</pre>`,
    ctaLabel: "Admin",
    ctaHref: `${base}/admin`,
  });
  return { subject, text, html };
}

export function tplSellerApplicationApproved(args: {
  applicantName: string;
  applicantEmail: string;
  hasAccount: boolean;
}): EmailContent {
  const base = defaultBaseUrl();
  const name = args.applicantName.trim() || "there";
  const subject = "Your FlipRepublic seller account is approved! 🎉";

  if (args.hasAccount) {
    const text = `Congratulations ${name}!

Your seller account has been approved. You can now list products on FlipRepublic.

Login: ${base}/login
Email: ${args.applicantEmail}

Seller dashboard: ${base}/dashboard

Welcome to FlipRepublic!`;
    const html = wrapLuxuryEmail({
      title: "Seller account approved",
      intro: `Congratulations, ${escapeHtml(name)} — your seller access is live.`,
      bodyHtml: `<p>Sign in with <strong>${escapeHtml(args.applicantEmail)}</strong> to list inventory and manage orders.</p>`,
      ctaLabel: "Open seller dashboard",
      ctaHref: `${base}/dashboard`,
    });
    return { subject, text, html };
  }

  const text = `Congratulations ${name}!

Your seller application has been approved! 🎉

Create your account with the email from your application:
Email: ${args.applicantEmail}

1. Go to ${base}/signup
2. Sign up with ${args.applicantEmail}
3. Your account will be set up as a seller
4. Dashboard: ${base}/dashboard

Welcome to FlipRepublic!`;
  const html = wrapLuxuryEmail({
    title: "Application approved",
    intro: `Congratulations, ${escapeHtml(name)} — you're approved to sell on FlipRepublic.`,
    bodyHtml: `<p>Use <strong>${escapeHtml(args.applicantEmail)}</strong> when you sign up so we can link your seller profile.</p>
      <ol style="color:#ccc;line-height:1.8;padding-left:1.2em">
        <li>Create your account</li>
        <li>Complete your first listing</li>
        <li>Manage orders from your dashboard</li>
      </ol>`,
    ctaLabel: "Create seller account",
    ctaHref: `${base}/signup`,
  });
  return { subject, text, html };
}

export function tplSellerApplicationDecision(args: {
  approved: boolean;
  notes?: string;
}): EmailContent {
  const base = defaultBaseUrl();
  const subject = args.approved
    ? "FlipRepublic — seller application approved"
    : "FlipRepublic — seller application update";
  const text = args.approved
    ? `Your seller application was approved.\n\n${args.notes ? `Notes: ${args.notes}\n` : ""}${base}/dashboard`
    : `Your seller application was not approved at this time.\n\n${args.notes ? `Notes: ${args.notes}\n` : ""}${base}/apply`;
  const html = wrapLuxuryEmail({
    title: args.approved ? "Application approved" : "Application update",
    intro: args.approved
      ? "You may list inventory and manage orders."
      : "Thank you for applying. You may re-apply when requirements are met.",
    bodyHtml: args.notes ? `<p><strong>Notes</strong><br/>${escapeHtml(args.notes)}</p>` : "<p>No additional notes were provided.</p>",
    ctaLabel: args.approved ? "Go to dashboard" : "Apply again",
    ctaHref: args.approved ? `${base}/dashboard` : `${base}/apply`,
  });
  return { subject, text, html };
}

export function tplAdminNewListing(args: { productName: string; sellerUsername: string; productUrl: string }): EmailContent {
  const subject = `New listing pending review — ${args.productName}`;
  const text = `Seller ${args.sellerUsername} listed ${args.productName}\n${args.productUrl}`;
  const html = wrapLuxuryEmail({
    title: "New listing",
    intro: `${escapeHtml(args.sellerUsername)} published a new item.`,
    bodyHtml: `<p><strong>Product</strong> ${escapeHtml(args.productName)}</p>`,
    ctaLabel: "Review listing",
    ctaHref: args.productUrl,
  });
  return { subject, text, html };
}

export function tplAdminUserCredentials(args: {
  email: string;
  tempPassword?: string;
  loginUrl: string;
}): EmailContent {
  const subject = "FlipRepublic — account update";
  const text = `Account email: ${args.email}\n${args.tempPassword ? `Temporary password: ${args.tempPassword}\n` : ""}Login: ${args.loginUrl}`;
  const html = wrapLuxuryEmail({
    title: "Account update",
    intro: "An administrator updated your access.",
    bodyHtml: `<p><strong>Email</strong> ${escapeHtml(args.email)}</p>
${args.tempPassword ? `<p><strong>Temporary password</strong> ${escapeHtml(args.tempPassword)}</p><p style="color:#b8a56c;">Change this password immediately after signing in.</p>` : ""}`,
    ctaLabel: "Sign in",
    ctaHref: args.loginUrl,
  });
  return { subject, text, html };
}

export function tplPayoutSeller(args: { amount: number | string; reference?: string }): EmailContent {
  const base = defaultBaseUrl();
  const subject = "Payout processed — FlipRepublic";
  const text = `A payout of ${moneyGBP(args.amount)} was processed.${args.reference ? `\nRef: ${args.reference}` : ""}\n\n${base}/dashboard`;
  const html = wrapLuxuryEmail({
    title: "Payout processed",
    intro: "Funds are on the way per your payout method on file.",
    bodyHtml: `<p><strong>Amount</strong> ${escapeHtml(moneyGBP(args.amount))}</p>
${args.reference ? `<p><strong>Reference</strong> ${escapeHtml(args.reference)}</p>` : ""}`,
    ctaLabel: "Dashboard",
    ctaHref: `${base}/dashboard`,
  });
  return { subject, text, html };
}

export function tplBuyerSignupNotifyAdmin(args: {
  buyerEmail: string;
  username?: string;
  userId?: string;
  role?: string;
}): EmailContent {
  const base = defaultBaseUrl();
  const subject = "New user registration — FlipRepublic";
  const text = `New user\nEmail: ${args.buyerEmail}\nUsername: ${args.username ?? "—"}\nRole: ${args.role ?? "buyer"}\nUser ID: ${args.userId ?? "—"}\n\n${base}/admin`;
  const html = wrapLuxuryEmail({
    title: "New registration",
    intro: "A new account was created on FlipRepublic.",
    bodyHtml: `<p><strong>Email</strong> ${escapeHtml(args.buyerEmail)}</p>
<p><strong>Username</strong> ${escapeHtml(args.username ?? "—")}</p>
<p><strong>Role</strong> ${escapeHtml(args.role ?? "buyer")}</p>
<p><strong>User ID</strong> ${escapeHtml(args.userId ?? "—")}</p>`,
    ctaLabel: "Admin dashboard",
    ctaHref: `${base}/admin`,
  });
  return { subject, text, html };
}

export function tplDisputeOpenedStub(args: { orderId: string; summary: string }): EmailContent {
  const subject = `Dispute opened — order ${args.orderId}`;
  const text = `A dispute was logged for order ${args.orderId}.\n\n${args.summary}`;
  const html = wrapLuxuryEmail({
    title: "Dispute logged",
    intro: "Our team will review and follow up.",
    bodyHtml: `<p><strong>Order</strong> ${escapeHtml(args.orderId)}</p>
<p>${escapeHtml(args.summary)}</p>`,
  });
  return { subject, text, html };
}

export function tplDisputeResolvedStub(args: {
  orderId: string;
  status: string;
  resolution: string;
}): EmailContent {
  const base = defaultBaseUrl();
  const subject = `Dispute update — order ${args.orderId.slice(0, 8)}`;
  const text = `Your order dispute was updated.\nStatus: ${args.status}\nResolution: ${args.resolution}\n\nOrder: ${args.orderId}\n${base}/account`;
  const html = wrapLuxuryEmail({
    title: "Dispute update",
    intro: "The FlipRepublic team has processed your dispute.",
    bodyHtml: `<p><strong>Status</strong> ${escapeHtml(args.status)}</p>
<p><strong>Resolution</strong> ${escapeHtml(args.resolution)}</p>
<p><strong>Order</strong> ${escapeHtml(args.orderId)}</p>`,
    ctaLabel: "Your account",
    ctaHref: `${base}/account`,
  });
  return { subject, text, html };
}

export function tplListingRejectedSeller(args: { productName: string; reason?: string }): EmailContent {
  const base = defaultBaseUrl();
  const subject = `Listing update — ${args.productName}`;
  const text = `Your listing "${args.productName}" needs changes.${args.reason ? `\nReason: ${args.reason}` : ""}\n\n${base}/dashboard`;
  const html = wrapLuxuryEmail({
    title: "Listing needs attention",
    intro: "Review team feedback and resubmit when ready.",
    bodyHtml: `<p><strong>Listing</strong> ${escapeHtml(args.productName)}</p>
${args.reason ? `<p><strong>Notes</strong> ${escapeHtml(args.reason)}</p>` : ""}`,
    ctaLabel: "Dashboard",
    ctaHref: `${base}/dashboard`,
  });
  return { subject, text, html };
}

export function tplNewMessageRecipient(args: {
  preview: string;
  productName?: string | null;
  messagesUrl: string;
}): EmailContent {
  const subject = args.productName
    ? `New message — ${args.productName}`
    : "New message on FlipRepublic";
  const text = `You have a new message.\n\n${args.preview.slice(0, 200)}${args.preview.length > 200 ? "…" : ""}\n\nOpen inbox: ${args.messagesUrl}`;
  const html = wrapLuxuryEmail({
    title: "New message",
    intro: args.productName
      ? `Regarding <strong>${escapeHtml(args.productName)}</strong>.`
      : "Someone replied in your inbox.",
    bodyHtml: `<p style="white-space:pre-wrap;font-size:14px;color:#e8e4dc;">${escapeHtml(args.preview.slice(0, 500))}</p>`,
    ctaLabel: "Open messages",
    ctaHref: args.messagesUrl,
  });
  return { subject, text, html };
}

export function tplOfferCounteredBuyer(args: {
  productName: string;
  offerPrice: number | string;
  listPrice?: number | string;
  sellerName?: string;
  productUrl: string;
}): EmailContent {
  const subject = `Offer update — ${args.productName}`;
  const text = `The seller responded to your offer on "${args.productName}".\nYour offer: ${moneyGBP(args.offerPrice)}\n${args.listPrice != null ? `List price: ${moneyGBP(args.listPrice)}\n` : ""}\nCheck your account for the latest status.\n\n${args.productUrl}`;
  const html = wrapLuxuryEmail({
    title: "Offer updated",
    intro: `${escapeHtml(args.sellerName ?? "The seller")} updated the negotiation on this listing.`,
    bodyHtml: `<p><strong>Listing</strong> ${escapeHtml(args.productName)}</p>
<p><strong>Your last offer</strong> ${escapeHtml(moneyGBP(args.offerPrice))}</p>
${args.listPrice != null ? `<p><strong>List price</strong> ${escapeHtml(moneyGBP(args.listPrice))}</p>` : ""}`,
    ctaLabel: "View listing",
    ctaHref: args.productUrl,
  });
  return { subject, text, html };
}

export function tplSellerOrderStatusSelf(args: {
  orderId: string;
  productName: string;
  status: string;
}): EmailContent {
  const base = defaultBaseUrl();
  const subject = `You updated order ${args.orderId.slice(0, 8)} — ${args.status}`;
  const text = `You marked order ${args.orderId} as ${args.status}.\n${args.productName}\n\n${base}/dashboard`;
  const html = wrapLuxuryEmail({
    title: "Order status saved",
    intro: `Status is now <strong>${escapeHtml(args.status)}</strong>.`,
    bodyHtml: `<p><strong>Order</strong> ${escapeHtml(args.orderId)}</p>
<p><strong>Product</strong> ${escapeHtml(args.productName)}</p>`,
    ctaLabel: "Seller dashboard",
    ctaHref: `${base}/dashboard`,
  });
  return { subject, text, html };
}
