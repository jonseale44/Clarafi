# Subscription Key System Testing Guide

## Quick Test Instructions

### As System Admin (current user):
1. Navigate to **Admin Keys** in dashboard
2. Click **Generate Keys**
3. Select **Austin Regional Medical Group (Tier 3)** from dropdown
4. Generate some test keys (e.g., 2 provider keys, 3 staff keys)
5. Copy one of the generated keys

### Test New User Registration:
1. Log out from admin account
2. Go to registration page
3. Select **"Join Existing Health System"**
4. Choose **Austin Regional Medical Group** locations
5. Enter the subscription key you copied
6. Complete registration
7. Verify the key is marked as "used" in admin panel

## Current Test Setup

### Pre-configured Tier 3 Health System:
- **Name**: Austin Regional Medical Group
- **Tier**: 3 (Enterprise)
- **Status**: Active (bypasses payment for testing)
- **Key Limits**: 50 provider keys, 100 staff keys

### How Payment Would Work in Production:
1. Health system signs up and selects Tier 3
2. Redirected to Stripe checkout for custom pricing
3. After payment, admin account is created
4. Admin can then generate and distribute keys to staff

## Development Testing Without Payment

### Option 1: Use Existing Test Data
- Austin Regional Medical Group is already tier 3
- Generate keys as system admin
- Test registration with those keys

### Option 2: Manually Update Health System Tier
```sql
-- Make any health system tier 3 for testing
UPDATE health_systems 
SET subscription_tier = 3,
    subscription_status = 'active',
    subscription_limits = '{"providerKeys": 50, "staffKeys": 100}'::jsonb
WHERE name = 'Your Test Health System';
```

### Option 3: Development Mode (if needed)
- Set environment variable: `BYPASS_PAYMENT=true`
- Skip Stripe redirect for tier 3 signups
- Automatically set to active status

## Key Testing Scenarios

### 1. Valid Key Usage
- Generate provider key
- Register new provider account
- Verify key marked as "used"

### 2. Staff vs Provider Keys
- Generate staff key
- Try registering as provider (should fail)
- Register as nurse/MA (should succeed)

### 3. Key Expiration
- Keys expire after 72 hours if unused
- Test by manually updating expiry date in database

### 4. Duplicate Key Prevention
- Try using same key twice
- Should get "already used" error

### 5. Cross-Health System Security
- Generate key for Austin Regional
- Try using it for different health system
- Should get validation error

## Database Queries for Testing

### View All Keys:
```sql
SELECT 
  sk.key,
  sk.key_type,
  sk.status,
  sk.expires_at,
  hs.name as health_system_name,
  u.username as used_by
FROM subscription_keys sk
JOIN health_systems hs ON sk.health_system_id = hs.id
LEFT JOIN users u ON sk.used_by = u.id
ORDER BY sk.created_at DESC;
```

### Reset a Used Key for Re-testing:
```sql
UPDATE subscription_keys 
SET status = 'active', 
    used_by = NULL, 
    used_at = NULL
WHERE key = 'YOUR-KEY-HERE';
```

### Check Health System Tiers:
```sql
SELECT id, name, subscription_tier, subscription_status
FROM health_systems
ORDER BY subscription_tier DESC;
```