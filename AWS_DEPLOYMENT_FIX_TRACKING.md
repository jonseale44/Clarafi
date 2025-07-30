# AWS App Runner Deployment Fix Tracking Document
Created: July 30, 2025

## Current Status
- **Issue**: App fails to start with `TypeError [ERR_INVALID_ARG_TYPE]: The "paths[0]" argument must be of type string. Received undefined`
- **Root Cause**: EFaxService uses `process.cwd()` during module initialization, which is undefined in production builds
- **Fix Applied**: Created lazy path resolution and vite wrapper to prevent bundling issues

## Files Created/Modified in Replit (Not Yet on Your Local Machine)

### 1. Created: `server/vite-wrapper.ts`
- Prevents vite.ts from being bundled in production
- Uses eval() to hide the import from esbuild

### 2. Modified: `server/index.ts`
- Changed line 130 from `import("./vite")` to `import("./vite-wrapper")`
- This prevents vite from being included in the production bundle

### 3. Modified: `server/efax-service.ts`
- Changed constructor to defer path resolution
- Added `getUploadsDir()` method for lazy initialization
- Updated methods to use `getUploadsDir()` instead of direct `this.uploadsDir`

## EXACT STEPS YOU NEED TO FOLLOW NOW

### Step 1: Navigate to your project directory
```bash
cd /path/to/your/jonathanseale-07-29
```

### Step 2: Pull ALL changes from Replit
```bash
git pull origin main2
```

**What this does**: Downloads the 3 files I created/modified from Replit to your local machine

### Step 3: Verify the files exist
```bash
ls -la server/vite-wrapper.ts
ls -la server/index.ts
ls -la server/efax-service.ts
```

**Expected**: You should see all 3 files listed

### Step 4: Add the files to git
```bash
git add server/vite-wrapper.ts server/index.ts server/efax-service.ts
```

### Step 5: Commit the changes
```bash
git commit -m "Fix production deployment path.resolve error - lazy EFax initialization"
```

### Step 6: Push to GitHub
```bash
git push origin main2
```

## AWS App Runner Configuration

### The Problem
App Runner is configured to watch the `main` branch, but your code is on `main2` branch.

### How to Fix It
1. Log into AWS Console: https://console.aws.amazon.com
2. Navigate to App Runner
3. Click on your service "clarafi"
4. Click "Configuration" tab
5. Find "Source and deployment" section
6. Click "Edit"
7. Change branch from `main` to `main2`
8. Click "Save changes"

## What Happens Next
- App Runner will detect the branch change
- It will automatically pull the latest code from main2
- Deployment will start (takes ~5 minutes)
- Monitor the deployment logs for success

## Previous Attempts That Failed
1. Creating index-production.ts - didn't help because build still used index.ts
2. Try-catch blocks - didn't prevent module initialization errors
3. Dynamic imports with path checking - esbuild still bundled the files

## Why This Fix Works
1. **vite-wrapper.ts** - Uses eval() to hide the import from esbuild's static analysis
2. **Lazy path resolution** - Defers `process.cwd()` until runtime when it's actually defined
3. **No vite in production** - The wrapper ensures vite is never loaded in production

## If Deployment Still Fails
Check the App Runner logs for the exact error and let me know. The error should be different now.