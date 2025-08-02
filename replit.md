# Clarafi EMR - Replit Project Documentation

## Overview
Clarafi EMR is a comprehensive medical transcription and lab management platform designed to streamline healthcare workflows. It integrates advanced trial capabilities and focuses on providing an intelligent user experience. The project's vision is to offer a robust solution for healthcare providers, enhancing efficiency in managing patient data, transcriptions, and lab results.

## User Preferences
(To be updated based on user feedback and preferences)

## System Architecture

### Frontend
- **Framework**: React with TypeScript
- **Styling**: Tailwind CSS for responsive design, Shadcn UI component library
- **Design**: Mobile-first approach
- **Data Management**: React Query for data fetching and caching
- **Structure**: Pages in `client/src/pages/`, components in `client/src/components/`

### Backend
- **Framework**: Node.js with Express and TypeScript
- **Database ORM**: Drizzle ORM for PostgreSQL interactions
- **Real-time Communication**: WebSocket for live updates
- **Authentication**: Multiple methods including WebAuthn (passkeys), magic links, and traditional passwords; session-based with secure cookies; multi-factor authentication support. WebAuthn configuration is dynamic, supporting `PRODUCTION_DOMAIN` environment variable.
- **Data Management**: Database migrations via Drizzle; PostgreSQL with tenant isolation.
- **Core Functionality**:
    - **Medical Transcription**: AI-powered transcription services.
    - **Lab Management**: LOINC-compliant lab test catalog.
    - **Document Processing**: Utilizes ImageMagick and Poppler for PDF processing.
    - **Subscription Management**: Supports Tier 1 (Individual Provider) and Tier 2 (Enterprise) subscriptions, with a 30-day free trial for Tier 1. Integration with Stripe for payments.
    - **Email Verification**: Three distinct systems for standard verification, magic links, and admin verification for enterprise onboarding.
- **Shared Schemas**: `shared/schema.ts` for consistent data structures between frontend and backend.

### Deployment & Environment
- **Environment**: Production deployed on AWS App Runner (HIPAA compliant with BAA) in `us-east-2`.
- **Database**: AWS RDS PostgreSQL.
- **DNS**: Route 53.
- **File Storage**: AWS App Runner has a read-only file system. Production uploads use `/tmp/clarafi-storage/` for writable storage.
- **Development Guidelines**:
    - Avoid modifying Vite setup files.
    - Use Drizzle ORM for all database operations and update schema types accordingly.
    - Ensure proper tenant isolation.

## External Dependencies
- **Cloud Platform**: AWS (App Runner, RDS PostgreSQL, Route 53)
- **Payment Gateway**: Stripe
- **AI/ML Services**: OpenAI (specifically Realtime API for transcription, requires Whisper enabled)
- **Database**: PostgreSQL
- **Utilities**:
    - ImageMagick (for image manipulation)
    - Poppler (for PDF processing, e.g., `pdftoppm`)
    - Sharp (npm package, includes precompiled libvips binaries, no system libvips required)
```