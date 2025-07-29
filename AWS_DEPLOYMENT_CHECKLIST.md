# AWS Deployment Checklist for Clarafi EMR

## Pre-Deployment Checklist

- [ ] AWS Account created
- [ ] **BAA (Business Associate Agreement) accepted in AWS Artifact** ⚠️ CRITICAL
- [ ] AWS CLI installed locally
- [ ] EB CLI installed locally
- [ ] All secrets/API keys ready to configure

## Initial Setup (One Time)

- [ ] RDS PostgreSQL database created with:
  - [ ] Encryption enabled (HIPAA requirement)
  - [ ] Automated backups enabled
  - [ ] Multi-AZ deployment (for production)
- [ ] Elastic Beanstalk application initialized with `eb init`
- [ ] Environment created with `eb create clarafi-production`
- [ ] Environment variables configured:
  - [ ] DATABASE_URL
  - [ ] SESSION_SECRET
  - [ ] PRODUCTION_DOMAIN=clarafi.ai
  - [ ] All API keys (OpenAI, SendGrid, Stripe, etc.)
- [ ] HTTPS/SSL certificate configured
- [ ] DNS updated to point to EB environment

## Security Setup (HIPAA Required)

- [ ] CloudTrail enabled for audit logging
- [ ] GuardDuty enabled for threat detection
- [ ] AWS Backup configured
- [ ] VPC Security Groups properly configured:
  - [ ] Web tier: Only HTTPS (443) from internet
  - [ ] Database: Only accessible from EB instances
- [ ] CloudWatch alarms set up for monitoring

## For Each Deployment

1. **Test locally first**
   ```bash
   npm run build
   npm start
   ```

2. **Deploy to AWS**
   ```bash
   eb deploy
   ```

3. **Monitor deployment**
   ```bash
   eb status
   eb logs --tail
   ```

4. **Verify deployment**
   - [ ] Site loads on HTTPS
   - [ ] Can log in
   - [ ] WebSockets work (real-time features)
   - [ ] File uploads work
   - [ ] Passkeys/WebAuthn work

## Troubleshooting Commands

```bash
# View recent logs
eb logs

# SSH into instance
eb ssh

# Check environment info
eb status

# Rollback if needed
eb deploy --version=<previous-version-label>
```

## Important Reminders

⚠️ **NEVER deploy without BAA accepted**
⚠️ **ALWAYS use HTTPS in production**
⚠️ **MONITOR costs - set up billing alerts**
⚠️ **BACKUP database regularly**

## Support Contacts

- AWS Support: https://console.aws.amazon.com/support
- AWS Health Dashboard: https://status.aws.amazon.com/
- Your account team (after you scale)