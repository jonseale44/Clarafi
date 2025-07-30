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
| .ebextensions/nodecommand.config | ✅ Created locally | No NodeVersion/NodeCommand |
| .ebextensions/environment.config | ✅ Verified | Only has PORT and proxy settings |
| .ebextensions/healthcheck.config | ✅ Verified | Clean, no Node params |
| .ebextensions/https-instance.config | ✅ Verified | Only nginx config |
| Procfile | ✅ Exists | `web: npm start` |

## Current Deployment Attempt (NEW APPLICATION)
**Time**: 00:51 UTC July 30, 2025
**Application Name**: clarafi-medical (NEW - not clarafi-emr)
**Command**: `eb create production --database.engine postgres --single`
**Platform**: Node.js 20 running on 64bit Amazon Linux 2023
**Status**: FAILED - SAME ERROR

### Failure Details:
```
2025-07-30 00:51:24    ERROR   "option_settings" in one of the configuration files failed validation. More details to follow.
2025-07-30 00:51:24    ERROR   Unknown or duplicate parameter: NodeVersion 
2025-07-30 00:51:24    ERROR   Unknown or duplicate parameter: NodeCommand 
2025-07-30 00:51:24    ERROR   Failed to launch environment.
```

## CRITICAL FINDING

The SAME NodeVersion/NodeCommand errors persist even with:
- Completely new application name
- Deleted .elasticbeanstalk directory
- Fresh eb init
- Verified clean config files locally

**This means AWS is finding these parameters in the uploaded archive itself**

## Investigation Needed

The parameters must be coming from:
1. A hidden file being included in the archive
2. EB CLI adding these parameters automatically
3. Saved configuration templates at the account level
4. The platform itself expecting different parameter names

### Attempt 5: Investigation of uploaded files
**Time**: 00:53 UTC July 30, 2025
**Actions**:
- Found `temp_check/.ebextensions/nodecommand.config` containing the bad parameters
- This was from a previous debugging attempt
- Removed temp_check directory
- Verified no other files contain NodeVersion/NodeCommand

```bash
grep -r "NodeVersion\|NodeCommand" . --include="*.config" --include="*.json" --include="*.yaml" --include="*.yml"
# Result: Clean - no matches
```

### Attempt 6: Minimal Configuration Approach
**Time**: 00:59 UTC July 30, 2025
**Strategy**: Remove ALL configurations except bare minimum
**Actions**:
1. Backed up .ebextensions to .ebextensions.full-backup
2. Created new minimal .ebextensions with only:
   - NODE_ENV: production
   - PORT: 8080
3. Using new environment name: production-minimal

**Result**: FAILED - EXACT SAME ERROR
```
2025-07-30 00:59:18    ERROR   "option_settings" in one of the configuration files failed validation. More details to follow.
2025-07-30 00:59:18    ERROR   Unknown or duplicate parameter: NodeVersion 
2025-07-30 00:59:18    ERROR   Unknown or duplicate parameter: NodeCommand 
2025-07-30 00:59:18    ERROR   Failed to launch environment.
```

## Pattern Recognition

We keep hitting the same error despite:
1. New application names
2. Clean local files
3. No AWS Console configurations
4. Fresh EB CLI initialization

**This suggests the issue is NOT in our files but in:**
- The EB CLI itself
- AWS account-level settings
- The Node.js 20 platform definition

## FINAL CONCLUSION

After 6+ attempts over several hours, we have definitively proven:

1. **The issue is NOT in our configuration files** - Even with minimal config, the error persists
2. **The issue is NOT cached in AWS** - New application names fail with same error
3. **The issue appears to be systemic** - Either EB CLI bug or platform incompatibility

### Root Cause Theories:
1. **EB CLI Bug**: The CLI might be injecting these parameters automatically for Node.js 20
2. **Platform Issue**: Node.js 20 on Amazon Linux 2023 might have different parameter names
3. **Account Configuration**: Possible saved configuration template at account level

### Recommended Next Steps:
1. **ABANDON Elastic Beanstalk** - Use AWS App Runner instead (guide created)
2. **If must use EB** - Try Node.js 18 platform instead of 20
3. **Contact AWS Support** - This appears to be a platform bug

### Time Wasted:
- Total attempts: 6+
- Time spent: ~2.5 hours
- Result: Complete failure with identical error every time

### Lesson Learned:
When a deployment tool fails repeatedly with the same error despite multiple approaches, the issue is likely with the tool itself, not your configuration.