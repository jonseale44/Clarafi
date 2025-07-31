# Email Verification & Registration Technical Debt Resolution Plan

## Overview
This document outlines the systematic approach to resolve technical debt in the email verification and registration systems, addressing confusion between tier 1/2 workflows, outdated documentation, and broken email links.

## Priority 1: Critical Fixes (Immediate)

### 1.1 Fix Magic Link Route Mismatch
**Issue**: Magic link emails send to `/auth/magic-link/{token}` but handler expects `/api/auth/magic-link/{token}`
**Impact**: Users cannot log in via magic links
**Solution**:
- Update `magic-link-service.ts` to generate correct URL format
- OR add route handler at `/auth/magic-link/{token}` that redirects to API endpoint

### 1.2 Fix Email Verification URLs in Development
**Issue**: Verification links contain full Replit workspace URLs that break in different contexts
**Impact**: Email verification fails when opened in different browser/session
**Solution**:
- Implement proper domain detection in `getBaseUrl()` function
- Add environment variable `PUBLIC_DOMAIN` for production URL
- Update email templates to handle development vs production URLs better

### 1.3 Remove Duplicate Route Definitions
**Issue**: Validation endpoints defined twice in `auth.ts`
**Impact**: Code confusion, potential bugs
**Solution**:
- Remove duplicate definitions (lines 229-316)
- Keep only the first set (lines 92-226)
- Test all validation endpoints still work

## Priority 2: Documentation & Code Cleanup (This Week)

### 2.1 Update Tier 1 Registration Documentation
**Issue**: Docs still mention immediate Stripe payment for tier 1
**Current Reality**: 30-day free trial, then optional upgrade to $149/month
**Actions**:
- Update `SUBSCRIPTION_KEY_TESTING_GUIDE.md`
- Update inline code comments in `registration-service.ts`
- Update `pricing.tsx` to reflect current model
- Document the trial → paid upgrade flow

### 2.2 Remove Tier 3 References
**Issue**: Legacy tier 3 references throughout codebase
**Impact**: Confusion about pricing tiers
**Actions**:
- Search and replace `tier3_verified` → `tier2_verified` in code
- Update all documentation mentioning tier 3
- Update database enum values if possible
- Add migration to clean up legacy data

### 2.3 Consolidate Email Verification Systems
**Issue**: Three different email verification approaches
**Goal**: Clear separation of concerns
**Actions**:
- Document when each system is used:
  - Standard email verification: Tier 1 users, Tier 2 staff with keys
  - Magic links: Alternative login method (all users)
  - Admin verification: Tier 2 enterprise admins only
- Add clear comments in each service explaining its purpose

## Priority 3: Schema & Database Cleanup (Next Sprint)

### 3.1 Fix clinic_admin_verifications Schema
**Issue**: Database has 24 columns, schema defines only 15
**Solution**:
- Run full schema comparison
- Update Drizzle schema to match database
- Document any columns that should be removed
- Create migration if needed

### 3.2 Clean Up User Verification Fields
**Issue**: Users table has both `emailVerified` and `verificationStatus`
**Solution**:
- Determine which field should be authoritative
- Migrate data to single field if possible
- Update all code references
- Remove deprecated field

## Priority 4: Long-term Improvements (Future)

### 4.1 Unified Email Service
**Goal**: Single email service handling all email types
**Benefits**: Consistent formatting, easier maintenance
**Actions**:
- Create `UnifiedEmailService` class
- Migrate all email sending to use this service
- Implement email templates system
- Add email preview/testing capability

### 4.2 Improved Development Experience
**Goal**: Email verification that works seamlessly in development
**Actions**:
- Implement email capture in development (show in console/UI)
- Add "development mode" flag to bypass email verification
- Create test accounts with pre-verified emails
- Document development workflow

### 4.3 Comprehensive Testing Suite
**Goal**: Prevent regression of email/registration issues
**Actions**:
- Add unit tests for all email services
- Add integration tests for registration flows
- Add E2E tests for email verification
- Document test scenarios

## Implementation Timeline

### Week 1 (Immediate)
- [ ] Fix magic link route mismatch
- [ ] Fix email verification URLs
- [ ] Remove duplicate routes
- [ ] Update critical documentation

### Week 2-3
- [ ] Remove all tier 3 references
- [ ] Document email verification systems
- [ ] Begin schema cleanup
- [ ] Create migration scripts

### Month 2
- [ ] Implement unified email service
- [ ] Add comprehensive testing
- [ ] Complete schema consolidation
- [ ] Update all documentation

## Success Metrics
- Zero failed email verifications due to URL issues
- Zero references to tier 3 in codebase
- All email links work in development and production
- Clear documentation for each verification flow
- No duplicate code or route definitions

## Notes
- Each fix should be tested in both development and production environments
- Database changes require careful migration planning
- User communication needed before any breaking changes
- Consider feature flags for gradual rollout