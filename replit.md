# Clarafi EMR - Replit Project Documentation

## Overview
A comprehensive medical transcription and lab management platform designed to streamline healthcare workflows with advanced trial capabilities and intelligent user experience.

### Stack
- TypeScript
- React frontend with mobile-first design
- Node.js backend
- WebSocket real-time communication
- Drizzle ORM for database interactions
- LOINC-compliant lab test catalog
- Stripe-powered subscription management
- Tailwind CSS for responsive design
- Shadcn UI component library

## Deployment Workflow

### Production Environment
- **Live URL**: https://clarafi.ai
- **AWS Region**: us-east-2 (Ohio)
- **Infrastructure**: AWS App Runner (HIPAA compliant with BAA)
- **Database**: RDS PostgreSQL at clarafi-db.ca54qe20gs6u.us-east-1.rds.amazonaws.com
- **DNS**: Route 53 managing clarafi.ai domain

### Deployment Process
1. **Development**: Make changes in Replit and test locally
2. **Commit**: Push changes to GitHub `main2` branch (NOT main)
3. **Deploy**: Manually trigger deployment in AWS App Runner console
   - Log into AWS Console → App Runner → clarafi service → Click "Deploy"
   - Automatic GitHub deployments are NOT working - must be done manually
4. **Monitor**: Check deployment logs and verify at https://clarafi.ai

### Important Notes
- Full deployment guide: See `AWS_DEPLOYMENT_WORKFLOW_GUIDE.md`
- Emergency rollback: Use App Runner's "Deploy this version" feature
- Environment variables: Managed in App Runner configuration
- Cost: ~$25-45/month (App Runner + RDS)

## Recent Changes

### July 31, 2025 - Email Verification Technical Debt Analysis
- ✅ Identified critical technical debt in email verification systems
- ✅ Documented differences between tier 1 and tier 2 registration flows
- ✅ Created comprehensive plan to address email verification issues
- ✅ **Important Discovery**: Tier 1 now offers 30-day free trial (NO immediate payment required)
- ✅ Found three separate email systems: standard verification, magic links, and admin verification
- ✅ Identified legacy tier 3 references throughout codebase

### July 31, 2025 - Deployment Workflow Documentation
- ✅ Created comprehensive AWS deployment workflow guide
- ✅ Documented GitHub to AWS App Runner deployment process
- ✅ Confirmed production deployment at https://clarafi.ai
- ✅ Verified Route 53 DNS configuration for clarafi.ai domain

### July 30, 2025 - OpenAI Realtime API Troubleshooting
**Issue**: Intermittent 403 Forbidden errors during voice transcription despite successful WebSocket connections.

**Root Cause**: Whisper API must be enabled in OpenAI account settings for the Realtime API transcription to work.

**Solution**: Enable Whisper in your OpenAI account settings. The 403 errors are not related to API key security or WebSocket implementation.

**Key Learning**: The OpenAI Realtime API requires both:
1. A valid API key with Realtime API access
2. Whisper enabled for transcription functionality

### July 29-30, 2025 - AWS Deployment Migration - MAJOR CHANGE
**Decision**: After 2.5+ hours of failed Elastic Beanstalk attempts, switching to AWS App Runner.

**Reason**: Elastic Beanstalk has a critical bug with Node.js 20 platform repeatedly failing with:
- "Unknown or duplicate parameter: NodeVersion"
- "Unknown or duplicate parameter: NodeCommand"

This occurred even with:
- Brand new applications
- Minimal configurations
- Clean files with no NodeVersion/NodeCommand parameters

**New Implementation**: AWS App Runner
- No configuration files needed (no .ebextensions)
- Still HIPAA compliant with BAA
- Simpler deployment (5 minutes vs hours of debugging)
- Automatic scaling and HTTPS included
- GitHub integration for auto-deployment

**Key Files**:
- `AWS_DEPLOYMENT_TROUBLESHOOTING.md` - Complete documentation of EB failures
- `AWS_APP_RUNNER_DEPLOYMENT.md` - New deployment guide
- `.ebextensions/` - Now in `.ebextensions.full-backup` (not needed for App Runner)

**Status**: Proceeding with App Runner deployment

**Progress**: 
- ✅ AWS account created with Business support plan
- ✅ BAA accepted in AWS Artifact (HIPAA compliance active)
- ✅ SSH keypair created with passphrase: Yregru$44
- ✅ RDS PostgreSQL database created: clarafi-db.ca54qe20gs6u.us-east-1.rds.amazonaws.com
- ✅ Database credentials: clarafiadmin / Yregru$55555
- ✅ App Runner service created with GitHub integration
- ✅ All environment variables configured
- ✅ Production path resolution fixed (replaced process.cwd() with safe path utilities)
- ✅ Code pushed to GitHub for automatic deployment
- ✅ Code successfully pushed to GitHub main2 branch
- ✅ All environment variables configured in App Runner (including STRIPE_SECRET_KEY)
- 🔄 Ready for App Runner deployment - user needs to change branch to main2 and save
- ⚠️ IMPORTANT: Automatic deployments from GitHub do NOT work - must manually press "Deploy" in App Runner console after each push
- ⚠️ Fixed port configuration - app now uses PORT env variable instead of hardcoded 5000
- ✅ Fixed production path resolution - removed import.meta.dirname error by using dynamic imports
- ✅ Fixed EFaxService path.resolve error - made uploads directory resolution lazy
- ✅ Created vite-wrapper.ts to prevent vite bundling in production
- ✅ Successfully deployed to production at https://clarafi.ai

### July 29, 2025 - WebAuthn Passkey Fix
**Issue**: Passkey registration failed when deployed due to hardcoded RP ID (Relying Party ID) set to Replit development domain.

**Solution**: Made WebAuthn configuration dynamic:
- Updated `WebAuthnService` to determine RP ID and origin dynamically based on the request
- Added support for `PRODUCTION_DOMAIN` environment variable
- Modified all WebAuthn methods to accept an optional origin parameter
- Updated routes to pass the origin from request headers to the service

**Key Changes**:
1. Added `getRPID()` and `getOrigin()` methods that check for production domain first, then fall back to request origin or Replit dev domain
2. Updated all WebAuthn service methods to accept origin parameter:
   - `generateRegistrationOptions(userId, origin?)`
   - `verifyRegistrationResponse(userId, response, challenge, origin?)`
   - `generateAuthenticationOptions(email?, origin?)`
   - `verifyAuthenticationResponse(response, challenge, origin?)`
3. Updated all WebAuthn routes to extract origin from request headers and pass to service methods

**Environment Variable**: Set `PRODUCTION_DOMAIN` to your production domain (e.g., `myapp.com`) to ensure proper passkey functionality in production.

**Important Note about Iframe Deployment**: Passkeys will not work when the site is accessed through an iframe (such as Replit's deployment preview) due to browser security restrictions. The parent frame must explicitly allow `publickey-credentials-create` and `publickey-credentials-get` permissions in its Permissions-Policy header. For full passkey functionality, the site must be:
1. Accessed directly (not through an iframe), OR
2. Embedded in an iframe that includes: `Permissions-Policy: publickey-credentials-create=(self "https://yourdomain.com"), publickey-credentials-get=(self "https://yourdomain.com")`

## Registration & Payment Flows (CURRENT STATE - July 31, 2025)

### Tier 1 (Individual Provider) - $149/month
1. **Registration**: Select "Create my own individual practice"
2. **Trial Period**: 30-day FREE trial (NO immediate payment)
3. **Email Verification**: Standard verification email with yellow button
4. **After Trial**: Optional upgrade to paid plan via `/api/trial/upgrade`
5. **Status**: `subscriptionStatus: 'trial'` during trial period

### Tier 2 (Enterprise) - Custom Pricing
**Path A - New Organization:**
1. Apply at `/admin-verification`
2. AI/manual review process
3. Receive 6-character verification CODE (not a link)
4. Enter code at `/admin-verification-complete`
5. Receive temporary password

**Path B - Join Existing:**
1. Admin generates subscription keys
2. Staff receives invitation email with key
3. Register with key (no payment required)
4. Standard email verification
5. Access granted after verification

### Email Systems (3 Separate Systems)
1. **Standard Email Verification**: Yellow button, dev environment notice
2. **Magic Links**: Alternative login (currently broken - route mismatch)
3. **Admin Verification**: 6-character codes for enterprise admins

## Project Architecture

### Frontend Architecture
- Pages located in `client/src/pages/`
- Components in `client/src/components/`
- Shared schemas in `shared/schema.ts`
- React Query for data fetching with automatic caching

### Backend Architecture
- Express server with TypeScript
- API routes in `server/routes.ts`
- WebAuthn authentication in `server/webauthn-service.ts` and `server/webauthn-routes.ts`
- Database migrations handled via Drizzle with `npm run db:push`
- PostgreSQL database with tenant isolation

### Authentication
- Multiple auth methods: passkeys, magic links, traditional passwords
- WebAuthn/passkeys for passwordless authentication
- Session-based authentication with secure cookies
- Multi-factor authentication support

## User Preferences
(To be updated based on user feedback and preferences)

## Development Guidelines
- Never modify Vite setup files
- Use Drizzle ORM for all database operations
- Always update schema types when modifying database structure
- Use the packager tool for installing dependencies, not npm/yarn directly
- Ensure proper tenant isolation for multi-tenant features