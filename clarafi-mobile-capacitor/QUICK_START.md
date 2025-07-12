# Quick Start Guide for Ionic Capacitor Project

## Installation Issue Resolution

Since npm install is timing out in the Replit environment, here are alternative approaches:

### Option 1: Local Development Setup (Recommended)
1. Clone this project to your local machine
2. Run these commands locally:
   ```bash
   cd clarafi-mobile-capacitor
   npm install
   npx cap add ios
   npx cap add android
   npm run build
   npx cap sync
   ```
3. Commit the node_modules and platform folders
4. Push back to GitHub

### Option 2: Use Ionic Appflow Build Service
1. Push the current project to GitHub as-is (without node_modules)
2. Connect to Ionic Appflow
3. Let Appflow handle the dependency installation during build

### Option 3: Gradual Installation
Run these commands one at a time in terminal:
```bash
cd clarafi-mobile-capacitor
npm install @ionic/react
npm install @ionic/react-router
npm install react react-dom
npm install ionicons
npm install @capacitor/core
npm install -D @capacitor/cli
npm install -D typescript vite @vitejs/plugin-react
```

## Project Structure Explanation

The project is fully configured with:
- TypeScript configuration (tsconfig.json)
- Vite build setup (vite.config.ts)
- Capacitor configuration (capacitor.config.ts)
- Ionic configuration (ionic.config.json)
- Complete source code structure

## Running Without Full Dependencies

To see the project structure without errors:
1. Navigate to `clarafi-mobile-capacitor/src/`
2. Review the code structure:
   - `App.tsx` - Main app with routing
   - `pages/` - Login, Home, PatientList pages
   - `services/api.service.ts` - API connection
   - `theme/variables.css` - Clarafi branding

## Ionic Appflow Integration

The project is already configured for Appflow:
- App ID: `com.clarafi.mobile`
- Type: Capacitor
- Root directory: `clarafi-mobile-capacitor`

Just connect your GitHub repository to Appflow and it will handle the rest!