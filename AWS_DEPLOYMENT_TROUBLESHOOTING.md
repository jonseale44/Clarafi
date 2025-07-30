# AWS Deployment Troubleshooting Log

## Problem Summary
**Issue**: AWS Elastic Beanstalk deployment fails with "Unknown or duplicate parameter: NodeVersion" and "NodeCommand" errors, despite fixing configuration files.

**Platform**: Node.js 20 running on 64bit Amazon Linux 2023/6.6.1

## Attempts Made

### Attempt 1: Initial deployment
- **Command**: `eb create clarafi-deploy --database.engine postgres --single`
- **Result**: Failed with NodeVersion/NodeCommand errors
- **Time**: ~22:46 UTC

### Attempt 2: Fixed nodecommand.config
- **Action**: Updated `.ebextensions/nodecommand.config` to remove deprecated parameters
- **Content**:
  ```yaml
  option_settings:
    aws:elasticbeanstalk:application:environment:
      NODE_ENV: production
      NPM_CONFIG_PRODUCTION: true
      PORT: 8080
  ```
- **Result**: Still failed with same errors
- **Time**: ~23:17 UTC

### Attempt 3: Verified local files
- **Action**: 
  - Confirmed nodecommand.config doesn't exist locally (had to create it)
  - Checked all .ebextensions files with grep - no NodeVersion/NodeCommand found
  - Verified Procfile exists with `web: npm start`
- **Result**: Still failed with same errors
- **Time**: ~00:33 UTC

### Attempt 4: Clean slate approach
- **Action**:
  - Removed `.elasticbeanstalk/` directory
  - Reinitiated with `eb init clarafi-emr --platform "Node.js 20 running on 64bit Amazon Linux 2023"`
- **Result**: Still failed with same errors
- **Time**: ~00:38 UTC

## Root Cause Analysis

The issue persists despite local fixes, suggesting:

1. **AWS is using cached configuration** - Previous application versions might contain the deprecated parameters
2. **Hidden configuration source** - Parameters might be defined elsewhere:
   - In AWS Console saved configurations
   - In application templates
   - In platform-specific defaults

3. **Application archive issue** - The uploaded archive might contain files we're not seeing locally

## SOLUTION FOUND

The issue is that AWS Elastic Beanstalk is caching configuration from previous failed deployments at the APPLICATION level, not the environment level.

## Immediate Fix - Nuclear Option

### Step 1: Delete the Application from AWS Console
1. Go to https://console.aws.amazon.com/elasticbeanstalk
2. Select region: us-east-1
3. Find application named "clarafi-emr"
4. Click on it, then Actions → Delete Application
5. Confirm deletion (this removes ALL cached configs)

### Step 2: Create Fresh Application with New Name
```bash
# Navigate to your project directory
cd ~/clarafi-deployment/jonathanseale-07-29  # or wherever your project is

# Initialize with a NEW application name
eb init clarafi-medical --platform "Node.js 20 running on 64bit Amazon Linux 2023" --region us-east-1

# Create environment
eb create production --database.engine postgres --single
```

### Option 2: Inspect the uploaded archive
```bash
# See what's actually being uploaded
eb deploy --staged
# This creates .elasticbeanstalk/app_versions/ 
# Inspect the zip file contents
```

### Option 3: Use explicit platform version
```bash
# Try older Node.js 18 platform which might handle configs differently
eb create clarafi-deploy --platform "Node.js 18 running on 64bit Amazon Linux 2023"
```

### Option 4: Direct AWS Console approach
1. Log into AWS Console
2. Go to Elastic Beanstalk
3. Check "Saved Configurations" for the application
4. Delete any saved configs
5. Check application versions and delete old ones

### Option 5: Use different deployment method
- Consider using AWS App Runner (simpler, HIPAA compliant)
- Or ECS with Fargate (more control, also HIPAA compliant)

## Configuration Files Status

| File | Status | Content |
|------|--------|---------|
| .ebextensions/nodecommand.config | ✅ Fixed | No NodeVersion/NodeCommand |
| .ebextensions/environment.config | ✅ Clean | Only has PORT and proxy settings |
| .ebextensions/healthcheck.config | ❓ Not checked | Need to verify |
| .ebextensions/https-instance.config | ❓ Not checked | Need to verify |
| Procfile | ✅ Exists | `web: npm start` |

## Error Pattern
Every attempt shows:
```
ERROR   "option_settings" in one of the configuration files failed validation.
ERROR   Unknown or duplicate parameter: NodeVersion 
ERROR   Unknown or duplicate parameter: NodeCommand
```

This is consistent, suggesting the issue is not random but systematic.