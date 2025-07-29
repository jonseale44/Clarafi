# AWS Deployment Guide for Clarafi EMR

This guide will walk you through deploying your HIPAA-compliant medical EMR to AWS using Elastic Beanstalk.

## Prerequisites

1. AWS Account (create at aws.amazon.com)
2. Credit card for AWS billing
3. Your domain (clarafi.ai) ready to point to AWS

## Step 1: Accept the BAA (Business Associate Agreement)

**This is required for HIPAA compliance!**

1. Log into AWS Console
2. Search for "AWS Artifact" in the search bar
3. Click on "AWS Artifact"
4. Find "AWS Business Associate Addendum"
5. Click "Accept" - This is instant, no waiting!

## Step 2: Install AWS CLI and EB CLI

On your local machine:

```bash
# Install AWS CLI
curl "https://awscli.amazonaws.com/AWSCLIV2.pkg" -o "AWSCLIV2.pkg"
sudo installer -pkg AWSCLIV2.pkg -target /

# Install EB CLI
pip install awsebcli --upgrade --user
```

## Step 3: Configure AWS Credentials

1. In AWS Console, go to IAM
2. Create a new user with programmatic access
3. Attach policy: "AdministratorAccess-AWSElasticBeanstalk"
4. Save the Access Key ID and Secret Access Key

Configure locally:
```bash
aws configure
# Enter your Access Key ID
# Enter your Secret Access Key
# Default region: us-east-1
# Default output format: json
```

## Step 4: Prepare Your Application

Your application is already configured with:
- `.ebextensions/` folder with required configs
- Proper build scripts in package.json

## Step 5: Create RDS Database (HIPAA-Compliant)

1. Go to RDS in AWS Console
2. Click "Create database"
3. Choose:
   - PostgreSQL
   - Production template
   - db.t3.medium (minimum for production)
   - Enable encryption (required for HIPAA)
   - Enable automated backups
   - Create new VPC security group

Save your database credentials!

## Step 6: Initialize Elastic Beanstalk

In your project directory:

```bash
eb init

# Select:
# - Region: us-east-1
# - Application name: clarafi-emr
# - Platform: Node.js
# - Platform branch: Node.js 20
# - CodeCommit: No
# - SSH: Yes (create new keypair)
```

## Step 7: Create Environment

```bash
eb create clarafi-production

# This will:
# - Create a new EB environment
# - Deploy your application
# - Take about 5-10 minutes
```

## Step 8: Configure Environment Variables

```bash
# Set your environment variables
eb setenv DATABASE_URL=postgresql://username:password@your-rds-endpoint.amazonaws.com:5432/clarafi
eb setenv SESSION_SECRET=your-secure-session-secret
eb setenv PRODUCTION_DOMAIN=clarafi.ai
eb setenv NODE_ENV=production

# Add your API keys
eb setenv OPENAI_API_KEY=your-key
eb setenv SENDGRID_API_KEY=your-key
eb setenv STRIPE_SECRET_KEY=your-key
# Add all other secrets from your Replit deployment
```

## Step 9: Enable HTTPS

1. In AWS Console, go to your EB environment
2. Click "Configuration"
3. Under "Load balancer", click "Edit"
4. Add listener:
   - Port: 443
   - Protocol: HTTPS
   - SSL certificate: Request new ACM certificate for clarafi.ai

## Step 10: Update DNS

1. Get your EB environment URL (something.us-east-1.elasticbeanstalk.com)
2. In Network Solutions DNS settings:
   - Create CNAME record
   - Name: @ (or www)
   - Value: your-eb-environment.us-east-1.elasticbeanstalk.com

## Step 11: Security Hardening (HIPAA Required)

1. Enable AWS CloudTrail for audit logging
2. Enable AWS GuardDuty for threat detection
3. Set up AWS Backup for automated backups
4. Configure VPC security groups:
   - Only allow HTTPS (443) from internet
   - Restrict database access to EB instances only

## Step 12: Deploy Updates

For future deployments:

```bash
# Deploy new version
eb deploy

# View logs if issues
eb logs

# Open your site
eb open
```

## Cost Optimization Tips

1. Use Reserved Instances for predictable workloads
2. Set up billing alerts
3. Use CloudWatch to monitor usage
4. Consider using Aurora Serverless for database (auto-scaling)

## Monitoring Setup

1. CloudWatch Dashboards for:
   - Application performance
   - Database connections
   - Error rates
   - User activity

2. Set up alarms for:
   - High CPU usage
   - Database connection errors
   - Application errors
   - Unusual traffic patterns

## Support Resources

- AWS Support: https://aws.amazon.com/support
- HIPAA on AWS: https://aws.amazon.com/compliance/hipaa-compliance/
- EB Documentation: https://docs.aws.amazon.com/elasticbeanstalk/

## Important Notes

1. **Never deploy without the BAA accepted**
2. **Always use encryption for data at rest and in transit**
3. **Regular backups are mandatory for HIPAA**
4. **Monitor access logs for security compliance**

## Troubleshooting Common Issues

**502 Bad Gateway**
- Check eb logs
- Ensure PORT environment variable is set to 8080
- Verify Node.js version compatibility

**Database Connection Issues**
- Check security group rules
- Verify DATABASE_URL format
- Ensure RDS is in same VPC

**WebSocket Issues**
- Nginx configuration in .ebextensions handles this
- Check Application Load Balancer sticky sessions

---

Once deployed, your application will be:
✅ HIPAA compliant with signed BAA
✅ Scalable to thousands of users
✅ Properly secured with encryption
✅ WebAuthn/Passkeys fully functional
✅ Compatible with Median mobile app