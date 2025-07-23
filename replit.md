# CLARAFI Medical EMR Platform

## Overview
A comprehensive medical EMR (Electronic Medical Records) platform built with TypeScript, React, Node.js, and PostgreSQL. The platform streamlines healthcare professional workflows through intelligent technology and comprehensive digital health management.

### Key Features
- Patient management and demographics
- Medical transcription with AI-powered analysis
- Photo capture for patient documents
- Real-time WebSocket communication
- Secure authentication with payment verification
- Lab order management and review
- Prescription management
- Appointment scheduling
- Comprehensive clinical documentation

## Recent Changes (July 23, 2025)

### Enhanced Patient Parser Logging
Added comprehensive logging and validation to diagnose and fix "Invalid MIME type" errors when parsing patient information from images:

1. **Request Logging** - Logs incoming request details, image data length, and MIME type
2. **Image Data Validation** - Checks if data has data URL prefix and validates base64 format
3. **MIME Type Validation** - Ensures only OpenAI-supported formats (JPEG, PNG, GIF, WebP)
4. **HEIF/HEIC Detection** - Warns users these formats aren't supported by OpenAI
5. **Enhanced Error Messages** - Provides specific feedback about unsupported formats
6. **Base64 Validation** - Ensures image data is properly encoded

### Photo Capture Flow
- Photos are uploaded via `/api/photo-capture/sessions/:sessionId/upload`
- Stored in `/uploads/photo-capture/` directory
- Served with proper MIME types via Express static middleware
- Client fetches photos and converts to base64 before sending to patient parser

### QR Code Photo Capture in Patient Attachments
Replicated the QR code photo capture functionality from PatientParser to the patient attachments section:

1. **Added Photo Capture States** - Session management, QR code display, and polling logic
2. **QR Code Generation** - Creates scannable QR codes for mobile photo capture
3. **Session Polling** - Polls for uploaded photos every 2 seconds
4. **Automatic OCR Processing** - Photos are automatically processed with GPT-4 Vision when uploaded
5. **UI Integration** - Added "Capture Photo with Mobile Device" button alongside traditional upload
6. **Error Handling** - Comprehensive error messages and cleanup on failure

The OCR processing happens automatically through the existing document analysis pipeline:
- Files uploaded as attachments are queued for processing
- GPT-4 Vision extracts text, generates titles, and classifies document types
- Results are stored in the `attachmentExtractedContent` table

## Project Architecture

### Frontend (React + TypeScript)
- Located in `client/src/`
- Uses Vite for development and building
- Shadcn UI components with Tailwind CSS
- React Query for data fetching
- Wouter for routing

### Backend (Node.js + Express)
- Located in `server/`
- RESTful API with comprehensive routing
- WebSocket support for real-time features
- Multer for file uploads
- OpenAI integration for AI features
- Drizzle ORM for database operations

### Database (PostgreSQL)
- Managed through Drizzle ORM
- Schema defined in `shared/schema.ts`
- Migrations handled via `npm run db:push`

### Key Services
- **PatientParserService** - Extracts patient info from images/text using GPT-4 Vision
- **PhotoCaptureService** - Handles mobile photo uploads via QR codes
- **LabOrderService** - Manages lab orders and results
- **AuthService** - Handles authentication and session management

## User Preferences
- Prefer clear, actionable error messages
- Focus on data integrity and real API usage
- Document all major architectural changes

## Development Guidelines
1. Never modify `vite.config.ts` or `server/vite.ts`
2. Use the package installer tool instead of manual package.json edits
3. Always update this file when making architectural changes
4. Use `npm run dev` to start the development server
5. Database changes should be made through Drizzle schema updates