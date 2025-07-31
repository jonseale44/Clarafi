# Stripe Subscription Key Testing Guide

## Overview
This guide explains how to test the complete subscription key lifecycle with Stripe in sandbox mode.

## Prerequisites

### 1. Set Up Stripe Test Account
1. Go to https://stripe.com and sign up for a free account
2. Switch to **Test mode** in the Stripe dashboard (toggle in top right)
3. Get your test API keys from https://dashboard.stripe.com/test/apikeys
4. Copy the following:
   - Secret key (starts with `sk_test_`)
   - Publishable key (starts with `pk_test_`)

### 2. Configure Environment Variables
Update your `.env` file with:
```
STRIPE_SECRET_KEY=sk_test_YOUR_TEST_SECRET_KEY
STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_TEST_PUBLISHABLE_KEY
REPLIT_DEV_DOMAIN=https://YOUR-REPL-URL.replit.app
```

### 3. Set Up Stripe Webhook (Optional for full testing)
1. In Stripe Dashboard, go to Developers → Webhooks
2. Add endpoint: `https://YOUR-REPL-URL.replit.app/api/stripe/webhook`
3. Select events: `checkout.session.completed`, `customer.subscription.created`
4. Copy the webhook signing secret (starts with `whsec_`)
5. Add to `.env`: `STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET`

## Test Scenarios

### Scenario 1: Individual Provider Registration (Tier 1)
**Goal**: Test individual provider signs up for 30-day free trial

1. **Register as Individual Provider**
   - Go to `/auth` and click "Register"
   - Select "Create my own individual practice"
   - Fill in provider details
   - Submit registration

2. **Email Verification**
   - Check your email for verification link
   - Click the yellow "Verify Email Address" button
   - Or enter the verification code manually

3. **Verify Access**
   - Login with your credentials
   - Verify you have tier 1 access with 30-day trial
   - Trial banner should show days remaining

4. **Optional: Upgrade After Trial**
   - After trial expires (or during trial)
   - Use `/api/trial/upgrade` endpoint
   - Complete Stripe payment ($149/month)

### Scenario 2: Health System Upgrade to Tier 3
**Goal**: Test health system admin upgrading to tier 3 to get subscription keys

1. **Login as Health System Admin**
   - Use existing admin account or create one
   - Must be admin of a health system (e.g., Austin Regional Medical Group)

2. **Upgrade to Tier 3**
   - From dashboard, click "🚀 Test Upgrade" in the admin navigation
   - Review tier comparison and benefits
   - Click "Upgrade to Enterprise" button
   - Complete Stripe payment (use test card 4242 4242 4242 4242)

3. **Generate Subscription Keys**
   - After successful payment, health system automatically upgraded to tier 3
   - Go to "Subscription Keys" in admin navigation
   - Generate keys for providers and staff
   - Keys will have format: `ARG-2025-XXXX-XXXX`

### Scenario 3: User Registration with Subscription Key
**Goal**: Test new user joining tier 3 health system with subscription key

1. **Obtain a Subscription Key**
   - Get a key from Scenario 2 or ask system admin

2. **Register with Key**
   - Go to `/auth` and click "Register"
   - Select "Join existing health system"
   - Choose the tier 3 health system
   - Enter the subscription key
   - Complete registration (no payment required!)

3. **Verify Access**
   - Login with credentials
   - Verify full tier 3 access
   - Check key is marked as "used" in admin panel

## Test Data

### Test Credit Cards (Stripe Sandbox)
- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **Requires Authentication**: `4000 0025 0000 3155`

### Test Users
- **System Admin**: `admin` / `admin123`
- **Health System Admin**: Create via admin panel

### Sample Subscription Keys
Generate real keys through the system after tier 3 upgrade

## Monitoring & Debugging

### Check Stripe Dashboard
1. Go to https://dashboard.stripe.com/test/payments
2. View all test transactions
3. Check webhook logs in Developers → Webhooks

### Database Checks
- Subscription keys: `subscription_keys` table
- User verification status: `users.verificationStatus`
- Health system tier: `health_systems.subscriptionTier`

### Common Issues
1. **"Invalid subscription key"**: Key expired, already used, or wrong health system
2. **Payment redirect fails**: Check REPLIT_DEV_DOMAIN in .env
3. **Webhook not working**: Verify webhook secret and endpoint URL

## Testing Checklist

- [ ] Individual provider can register and pay
- [ ] Payment redirects work correctly
- [ ] Health system can upgrade to tier 3
- [ ] Subscription keys can be generated
- [ ] Keys show in admin interface
- [ ] New users can register with keys
- [ ] Keys are marked as "used" after registration
- [ ] Users have correct tier access after verification
- [ ] Key expiration works (wait 48-72 hours)
- [ ] Admin can deactivate keys

## Next Steps

After successful testing:
1. Configure production Stripe keys
2. Set up production webhook endpoints
3. Implement subscription management portal
4. Add billing history and invoices
5. Set up automated key expiration notifications