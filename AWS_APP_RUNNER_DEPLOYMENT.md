# AWS App Runner Deployment Guide for Clarafi EMR

## Why App Runner Instead of Elastic Beanstalk?

After hours of debugging Elastic Beanstalk configuration issues, App Runner offers a simpler path:
- **No .ebextensions needed** - Zero configuration files
- **No NodeVersion/NodeCommand errors** - App Runner handles all runtime setup
- **HIPAA compliant** - With signed BAA
- **Automatic HTTPS** - SSL certificates included
- **5-minute deployments** - Not hours of debugging

## Prerequisites

1. AWS Account with BAA accepted (same as before)
2. Your application code ready
3. PostgreSQL database (we'll use RDS separately)

## Step-by-Step Deployment

### Step 1: Prepare Your Application

First, ensure your application has these files:

**1. Create `.dockerignore`** (if not exists):
```
node_modules
.git
.env
dist
.elasticbeanstalk
.ebextensions
```

**2. Update `package.json`** to ensure proper start script:
```json
{
  "scripts": {
    "start": "NODE_ENV=production node dist/index.js",
    "build": "vite build && esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist"
  }
}
```

### Step 2: Create RDS Database (One Time)

Since App Runner doesn't create databases, we'll set up RDS separately:

```bash
# Using AWS CLI
aws rds create-db-instance \
  --db-instance-identifier clarafi-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version 15 \
  --master-username clarafiadmin \
  --master-user-password YOUR_SECURE_PASSWORD \
  --allocated-storage 20 \
  --backup-retention-period 7 \
  --storage-encrypted
```

Or use AWS Console:
1. Go to RDS → Create database
2. Choose PostgreSQL
3. Select "Free tier" template for testing
4. Set username: `clarafiadmin`
5. Set your password
6. Enable encryption

### Step 3: Deploy to App Runner

#### Option A: Using AWS Console (Recommended)

1. **Go to App Runner Console**: https://console.aws.amazon.com/apprunner
2. Click **"Create service"**
3. **Source and deployment**:
   - Source: "Source code repository"
   - Connect your GitHub account
   - Select your repository and branch
   - Deployment trigger: "Automatic" (redeploys on push)

4. **Build settings**:
   - Runtime: "Node.js 20"
   - Build command: `npm install && npm run build`
   - Start command: `npm start`
   - Port: `8080`

5. **Service settings**:
   - Service name: `clarafi-emr`
   - CPU: 0.25 vCPU (can increase later)
   - Memory: 0.5 GB (can increase later)

6. **Environment variables** - Add all required:
   ```
   NODE_ENV=production
   DATABASE_URL=postgres://clarafiadmin:PASSWORD@your-rds-endpoint:5432/postgres
   SESSION_SECRET=your-long-random-secret
   JWT_SECRET=another-long-random-secret
   OPENAI_API_KEY=your-key
   STRIPE_SECRET_KEY=your-key
   STRIPE_WEBHOOK_SECRET=your-key
   SENDGRID_API_KEY=your-key
   TWILIO_ACCOUNT_SID=your-sid
   TWILIO_AUTH_TOKEN=your-token
   TWILIO_PHONE_NUMBER=your-number
   PRODUCTION_DOMAIN=clarafi.ai
   VITE_GA_MEASUREMENT_ID=G-TLTL94GKCQ
   ```

7. **Health check**:
   - Path: `/api/health`
   - Interval: 30 seconds

8. Click **"Create & deploy"**

#### Option B: Using AWS CLI

```bash
# Create apprunner.yaml in your project root
cat > apprunner.yaml << 'EOF'
version: 1.0
runtime: nodejs20
build:
  commands:
    build:
      - npm install
      - npm run build
run:
  runtime-version: 20
  command: npm start
  network:
    port: 8080
    env: PORT
  env:
    - name: NODE_ENV
      value: production
    - name: DATABASE_URL
      value: "postgres://clarafiadmin:PASSWORD@your-rds-endpoint:5432/postgres"
    # Add other environment variables here
EOF

# Create the service
aws apprunner create-service \
  --service-name clarafi-emr \
  --source-configuration file://apprunner.yaml
```

### Step 4: Configure Database Access

1. **Get your App Runner service's VPC**:
   - In App Runner console, click your service
   - Go to "Networking" tab
   - Note the VPC connector

2. **Update RDS security group**:
   - Go to RDS → Your database → Security groups
   - Add inbound rule:
     - Type: PostgreSQL
     - Port: 5432
     - Source: App Runner VPC security group

### Step 5: Set Up Custom Domain

1. In App Runner console → Your service → "Custom domains"
2. Click "Add domain"
3. Enter: `clarafi.ai`
4. App Runner provides CNAME records
5. Update Network Solutions DNS with provided records

### Step 6: Enable HIPAA Compliance

1. **In App Runner settings**:
   - Enable "Encrypt at rest"
   - Enable "Encrypt in transit"

2. **Configure logging**:
   - Enable CloudWatch logs
   - Set retention to meet HIPAA requirements (typically 6 years)

## Monitoring and Maintenance

### View Logs
```bash
# Using AWS Console
App Runner → Your service → Logs

# Using CLI
aws logs tail /aws/apprunner/clarafi-emr/service
```

### Deploy Updates
Simply push to your GitHub repository - App Runner auto-deploys!

### Scale Up
In App Runner console → Configuration → Edit:
- Increase CPU/Memory as needed
- Set auto-scaling rules

## Cost Estimate

- **App Runner**: ~$10-30/month (based on usage)
- **RDS (db.t3.micro)**: ~$15/month
- **Total**: ~$25-45/month

Much simpler than Elastic Beanstalk with similar costs!

## Rollback if Needed

App Runner keeps previous versions:
1. Go to your service → "Activity" tab
2. Find previous successful deployment
3. Click "Deploy this version"

## Next Steps After Deployment

1. Test all features thoroughly
2. Set up monitoring alerts
3. Configure backups for RDS
4. Document any custom configurations

## Troubleshooting

**If build fails**: Check build logs in App Runner console
**If app doesn't start**: Verify environment variables, especially DATABASE_URL
**If database connection fails**: Check security groups

## Why This Works Better

1. **No configuration files** - App Runner handles everything
2. **No platform conflicts** - Uses standard Node.js container
3. **Automatic scaling** - No load balancer configuration
4. **Built-in health checks** - Automatic restarts on failure
5. **GitHub integration** - Push to deploy

This approach eliminates all the Elastic Beanstalk configuration complexity while maintaining HIPAA compliance and scalability.