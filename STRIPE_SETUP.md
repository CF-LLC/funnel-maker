# Complete Stripe Setup Guide for Funnel Maker

This guide will walk you through setting up Stripe payments for your Funnel Maker application in **live mode** for production use.

## Step 1: Create a Stripe Account

1. Go to [https://stripe.com](https://stripe.com)
2. Click "Sign Up" or "Start Now"
3. Fill in your business information
4. Verify your email address
5. **Complete your business verification** - Required for live payments:
   - Business details (name, address, tax ID)
   - Bank account for payouts
   - Identity verification documents
   - Processing statement

## Step 2: Get Your Live API Keys

1. Log into your Stripe Dashboard
2. Make sure you're in **Live Mode** (toggle in the top right)
3. Click "Developers" in the left sidebar
4. Click "API keys"
5. You'll see two keys:
   - **Publishable key** (starts with `pk_live_`)
   - **Secret key** (starts with `sk_live_`) - click "Reveal live key"

6. Add these to your `.env.local` file:
```bash
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your_key_here
STRIPE_SECRET_KEY=sk_live_your_key_here
```

⚠️ **Security**: Never commit your secret key to git. Keep `.env.local` in your `.gitignore`

## Step 3: Create Products and Prices

### Create Starter Plan - $9/month (3 funnels)

1. In Stripe Dashboard, go to "Products" in the left sidebar
2. Click "+ Add product"
3. Fill in details:
   - **Name**: Funnel Maker Starter
   - **Description**: Starter plan with up to 3 funnels
   - **Pricing model**: Recurring
   - **Price**: $9 USD
   - **Billing period**: Monthly
4. Click "Save product"
5. Copy the **Price ID** (starts with `price_`)
6. Add to `.env.local`:
```bash
STRIPE_STARTER_PRICE_ID=price_1234567890abcdefg
```

### Create Pro Plan - $29/month (Unlimited funnels)

1. Click "+ Add product" again
2. Fill in details:
   - **Name**: Funnel Maker Pro
   - **Description**: Professional plan with unlimited funnels
   - **Pricing model**: Recurring
   - **Price**: $29 USD
   - **Billing period**: Monthly
3. Click "Save product"
4. Copy the **Price ID**
5. Add to `.env.local`:
```bash
STRIPE_PRO_PRICE_ID=price_0987654321zyxwvut
```

### Create Enterprise Plan - $99/month (Team features)

1. Click "+ Add product" again
2. Fill in details:
   - **Name**: Funnel Maker Enterprise
   - **Description**: Enterprise plan with priority support and team features
   - **Pricing model**: Recurring
   - **Price**: $99 USD
   - **Billing period**: Monthly
3. Click "Save product"
4. Copy the **Price ID**
5. Add to `.env.local`:
```bash
STRIPE_ENTERPRISE_PRICE_ID=price_abcdefg1234567890
```

## Step 4: Set Up Webhook

Webhooks allow Stripe to notify your app when payments succeed, fail, or subscriptions change.

### Create Webhook Endpoint

1. Go to "Developers" → "Webhooks" in Stripe Dashboard
2. Click "+ Add endpoint"
3. Enter your **production** webhook URL:
   - `https://yourdomain.com/api/billing/webhook`

4. Click "Select events" and choose these events:
   - ✅ `customer.subscription.created`
   - ✅ `customer.subscription.updated`
   - ✅ `customer.subscription.deleted`
   - ✅ `invoice.payment_succeeded`
   - ✅ `invoice.payment_failed`
   - ✅ `checkout.session.completed`

5. Click "Add endpoint"
6. Click "Reveal" next to "Signing secret"
7. Copy the webhook secret (starts with `whsec_`)
8. Add to `.env.local`:
```bash
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

## Step 5: Configure Customer Portal

The Customer Portal allows users to manage their subscriptions.

1. Go to "Settings" → "Billing" → "Customer Portal"
2. Click "Activate"
3. Configure portal settings:
   - ✅ Allow customers to update payment methods
   - ✅ Allow customers to update billing information
   - ✅ Allow customers to cancel subscriptions (choose "Cancel immediately" or "At period end")
   - ✅ Show invoices and receipts
   - ✅ Allow customers to switch plans
4. Click "Save"

## Step 6: Configure Tax Collection (Optional but Recommended)

1. Go to "Settings" → "Tax"
2. Click "Start collecting tax"
3. Configure automatic tax collection for your regions
4. Stripe will automatically calculate and collect sales tax

## Step 7: Environment Variables Checklist

Make sure your `.env.local` has all these variables:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...

# App
NEXT_PUBLIC_APP_URL=https://yourdomain.com

# Stripe (Live Mode)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_STARTER_PRICE_ID=price_...
STRIPE_PRO_PRICE_ID=price_...
STRIPE_ENTERPRISE_PRICE_ID=price_...

# Optional
RESEND_API_KEY=re_...
OPENAI_API_KEY=sk-...
```

## Step 8: Update Code to Use Starter Plan

The Starter plan ($9/month for 3 funnels) needs to be added to your middleware and billing logic:

1. Update middleware to check funnel limits:
   - Free: 1 funnel
   - Starter: 3 funnels
   - Pro: Unlimited
   - Enterprise: Unlimited

2. Update billing pages to show Starter plan option

## Step 9: Production Deployment Checklist

Before going live:

- [x] Stripe business verification completed
- [x] Live API keys configured in production environment
- [x] All 3 products created (Starter, Pro, Enterprise)
- [x] Webhook endpoint configured and verified
- [x] Customer Portal activated
- [ ] Test checkout flow with real card (small test purchase)
- [ ] Verify webhook events are being received
- [ ] Check subscription creation in database
- [ ] Test Customer Portal access
- [ ] Configure email receipts in Stripe Settings
- [ ] Set up proper error monitoring
- [ ] Review refund and cancellation policies

## Step 10: Testing in Production

### Test with Real Payment

1. Use your own real credit card
2. Subscribe to Starter plan ($9)
3. Verify:
   - Payment succeeds in Stripe Dashboard
   - Webhook fires successfully
   - Subscription created in database
   - User can access 3 funnels
   - Customer Portal works

4. Cancel the subscription immediately to avoid charges

## Common Issues

### Webhook not receiving events
- Check webhook URL is publicly accessible (no localhost)
- Verify webhook secret matches production value
- Check server logs for errors
- Ensure endpoint returns 200 status
- Test using "Send test webhook" in Stripe Dashboard

### Payment fails
- Verify price IDs match your products
- Check Stripe Dashboard for error details
- Review server logs
- Ensure user is not already subscribed

### Subscription not created in database
- Verify webhook is configured correctly
- Check database RLS policies allow inserts
- Review webhook handler code
- Check server logs for database errors

## Monitoring & Maintenance

### Regular Checks
1. Monitor failed payments in Stripe Dashboard
2. Review webhook delivery attempts
3. Check for failed subscriptions
4. Monitor churn rate
5. Review customer support tickets

### Stripe Dashboard Sections
- **Payments**: See all transactions
- **Customers**: View customer list
- **Subscriptions**: Active and canceled subscriptions
- **Disputes**: Handle chargebacks
- **Reports**: Revenue and analytics

## Support Resources

- [Stripe Documentation](https://stripe.com/docs)
- [Stripe Support](https://support.stripe.com) - Live chat available
- [Stripe Webhooks Guide](https://stripe.com/docs/webhooks)
- [Stripe Customer Portal](https://stripe.com/docs/billing/subscriptions/integrating-customer-portal)
- [Stripe Status Page](https://status.stripe.com) - Check for outages

## Security Best Practices

1. Never log or expose secret keys
2. Always verify webhook signatures
3. Use HTTPS for all endpoints
4. Implement rate limiting on billing endpoints
5. Regularly rotate API keys
6. Monitor for suspicious activity
7. Enable Stripe Radar for fraud prevention

## Next Steps

After setup is complete:
1. Monitor first few real transactions closely
2. Set up email notifications for failed payments
3. Create documentation for your support team
4. Plan your pricing strategy and promotional offers
5. Consider implementing usage-based billing for scale
