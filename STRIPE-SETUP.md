# Stripe Payment Configuration Guide

This guide will help you set up Stripe payments for FlipRepublic.

## Prerequisites

1. A Stripe account (sign up at https://stripe.com)
2. Access to your Stripe Dashboard

## Step 1: Get Your Stripe API Keys

1. Log in to your [Stripe Dashboard](https://dashboard.stripe.com)
2. Go to **Developers** → **API keys**
3. Copy your **Secret key** (starts with `sk_test_` for test mode or `sk_live_` for live mode)
4. Keep this page open for the webhook secret in the next step

## Step 2: Set Up Webhooks

1. In Stripe Dashboard, go to **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Set the endpoint URL to:
   ```
   https://yourdomain.com/api/webhooks/stripe
   ```
   (Replace `yourdomain.com` with your actual domain)
4. Select events to listen to:
   - `checkout.session.completed`
5. Click **Add endpoint**
6. After creating, click on the webhook endpoint
7. Click **Reveal** next to "Signing secret"
8. Copy the **Signing secret** (starts with `whsec_`)

## Step 3: Configure Environment Variables

Add the following environment variables to your hosting platform (Vercel, Railway, etc.):

```bash
# Stripe Configuration (REQUIRED for real payments)
STRIPE_SECRET_KEY=sk_test_... # Your Stripe Secret Key
STRIPE_WEBHOOK_SECRET=whsec_... # Your Webhook Signing Secret

# App URL (for redirects)
NEXT_PUBLIC_APP_URL=https://yourdomain.com

# Optional: Set to "true" ONLY for testing (disables Stripe, creates free orders)
# DO NOT set this to "true" in production!
USE_FREE_PAYMENT=false
```

### For Local Development

Create a `.env.local` file in your project root:

```bash
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_APP_URL=http://localhost:3000
USE_FREE_PAYMENT=false
```

## Step 4: Test Mode vs Live Mode

### Test Mode
- Use test API keys (start with `sk_test_`)
- Use test card numbers (see below)
- No real charges are made
- Perfect for development and testing

### Live Mode
- Use live API keys (start with `sk_live_`)
- Real charges are made
- Only use after thorough testing

## Step 5: Test Card Numbers

Use these test card numbers in Stripe test mode:

### Successful Payment
- **Card Number**: `4242 4242 4242 4242`
- **Expiry**: Any future date (e.g., `12/34`)
- **CVC**: Any 3 digits (e.g., `123`)
- **ZIP**: Any 5 digits (e.g., `12345`)

### Declined Payment
- **Card Number**: `4000 0000 0000 0002`
- **Expiry**: Any future date
- **CVC**: Any 3 digits
- **ZIP**: Any 5 digits

### 3D Secure Authentication
- **Card Number**: `4000 0025 0000 3155`
- **Expiry**: Any future date
- **CVC**: Any 3 digits
- **ZIP**: Any 5 digits

## Step 6: Testing Webhooks Locally

To test webhooks locally, use Stripe CLI:

1. Install [Stripe CLI](https://stripe.com/docs/stripe-cli)
2. Login: `stripe login`
3. Forward webhooks: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
4. Copy the webhook signing secret from the CLI output
5. Use that secret in your `.env.local` as `STRIPE_WEBHOOK_SECRET`

## Step 7: Verify Configuration

1. Make a test purchase on your site
2. You should be redirected to Stripe Checkout
3. Complete the payment with a test card
4. Check Stripe Dashboard → **Payments** to see the payment
5. Check your database to verify the order was created
6. Check that the seller received an email notification

## How It Works

1. **Buyer clicks "Complete Purchase"** → Address modal appears
2. **Buyer fills in shipping address** → Address is collected
3. **Buyer clicks "Complete Purchase"** → Checkout API creates Stripe session
4. **Buyer is redirected to Stripe Checkout** → Enters payment details
5. **Payment is processed** → Stripe webhook is triggered
6. **Order is created** → Product marked as sold, seller notified

## Troubleshooting

### Payment Not Processing / Still Shows "Free"
- Verify `STRIPE_SECRET_KEY` is set correctly
- Check that `USE_FREE_PAYMENT` is NOT set to `"true"`
- Ensure the product price is greater than 0
- Check server logs for errors

### Not Redirected to Stripe
- Verify `STRIPE_SECRET_KEY` is set
- Check that `USE_FREE_PAYMENT` is `false` or not set
- Ensure the checkout API is returning a URL
- Check browser console for errors

### Webhook Not Working
- Verify `STRIPE_WEBHOOK_SECRET` matches your webhook endpoint
- Check webhook endpoint URL is correct
- Ensure `checkout.session.completed` event is selected
- Check server logs for webhook errors
- Test locally with Stripe CLI

### Orders Not Created
- Check webhook is receiving events (Stripe Dashboard → Webhooks → Your endpoint)
- Verify database connection
- Check server logs for errors
- Ensure webhook secret is correct

### Shipping Address Not Saved
- Ensure shipping address fields exist in your `orders` table
- Check webhook is processing `checkout.session.completed` event
- Verify metadata is being passed correctly
- Check that address is collected in the modal before checkout

## Security Notes

- **Never commit** your Stripe secret keys to version control
- Use environment variables for all sensitive data
- Use test mode during development
- Only switch to live mode after thorough testing
- Regularly rotate your API keys
- Monitor your Stripe Dashboard for suspicious activity
- **Never set `USE_FREE_PAYMENT=true` in production**

## Support

- [Stripe Documentation](https://stripe.com/docs)
- [Stripe Support](https://support.stripe.com)
- [Stripe Testing](https://stripe.com/docs/testing)
