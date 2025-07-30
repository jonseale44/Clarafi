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

## Recent Changes

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
- 🔄 App Runner deployment in progress
- ⚠️ Fixed port configuration - app now uses PORT env variable instead of hardcoded 5000
- ✅ Fixed production path resolution - removed import.meta.dirname error by using dynamic imports

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