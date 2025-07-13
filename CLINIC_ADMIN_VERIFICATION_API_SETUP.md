# Production-Ready Clinic Admin Verification API Setup

This document outlines all the API keys and services required for the comprehensive automated clinic administrator verification system.

## Required API Keys and Services

### 1. Google Places API
- **Purpose**: Verify business locations and get Google business trust scores
- **Sign up**: https://console.cloud.google.com/apis/library/places-backend.googleapis.com
- **Environment Variable**: `GOOGLE_PLACES_API_KEY`
- **Cost**: $17 per 1,000 requests for Place Details
- **Setup Steps**:
  1. Create a Google Cloud Project
  2. Enable Places API
  3. Create API key with IP restrictions
  4. Add to .env file

### 2. Hunter.io Email Verification API
- **Purpose**: Verify organizational email domains and check email deliverability
- **Sign up**: https://hunter.io/users/sign_up
- **Environment Variable**: `HUNTER_API_KEY`
- **Cost**: Starting at $49/month for 1,000 verifications
- **Features**: Domain search, email pattern detection, deliverability check

### 3. Clearbit Company Enrichment API
- **Purpose**: Get company size, industry, and additional verification data
- **Sign up**: https://clearbit.com/
- **Environment Variable**: `CLEARBIT_API_KEY`
- **Cost**: $99/month for 250 enrichments
- **Features**: Company size, revenue estimates, social profiles

### 4. Melissa Data Address Verification API
- **Purpose**: Verify and standardize physical addresses
- **Sign up**: https://www.melissa.com/
- **Environment Variable**: `MELISSA_API_KEY`
- **Cost**: Starting at $0.01 per verification
- **Features**: USPS validation, geocoding, address standardization

### 5. Twilio SMS API
- **Purpose**: Send SMS verification codes for multi-factor authentication
- **Sign up**: https://www.twilio.com/try-twilio
- **Environment Variables**: 
  - `TWILIO_ACCOUNT_SID`
  - `TWILIO_AUTH_TOKEN`
  - `TWILIO_PHONE_NUMBER`
- **Cost**: $0.0075 per SMS in the US
- **Features**: SMS delivery, phone number verification

### 6. NPPES NPI Registry (FREE)
- **Purpose**: Verify healthcare provider NPI numbers
- **API**: https://npiregistry.cms.hhs.gov/api
- **Environment Variable**: None required (public API)
- **Cost**: FREE - Government public API
- **Rate Limit**: 2 requests per second

## Environment Variables Setup

Add the following to your `.env` file:

```env
# Google Places API
GOOGLE_PLACES_API_KEY=your_google_places_api_key_here

# Hunter.io Email Verification
HUNTER_API_KEY=your_hunter_api_key_here

# Clearbit Company Data
CLEARBIT_API_KEY=your_clearbit_api_key_here

# Melissa Data Address Verification
MELISSA_API_KEY=your_melissa_api_key_here

# Twilio SMS (for MFA)
TWILIO_ACCOUNT_SID=your_twilio_account_sid_here
TWILIO_AUTH_TOKEN=your_twilio_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890  # Your Twilio phone number

# SendGrid Email (already configured)
SENDGRID_API_KEY=your_sendgrid_api_key_here
SENDGRID_FROM_EMAIL=noreply@clarafi.ai
```

## API Integration Features

### Comprehensive Verification Process
1. **Google Places**: Verifies business exists at claimed address
2. **NPI Registry**: Confirms healthcare provider credentials
3. **Email Verification**: Validates organizational email domain
4. **Address Verification**: Ensures deliverable physical address
5. **Company Enrichment**: Gets additional business data
6. **SMS Verification**: Sends 6-digit code for MFA

### Risk Scoring Algorithm
- Each successful verification adds to trust score
- Failed verifications increase risk score
- Automatic approval for low-risk applications
- Manual review queue for high-risk applications

### Production Security Features
- API keys stored securely in environment variables
- Rate limiting on all external API calls
- Comprehensive audit logging
- HIPAA-compliant data handling

## Testing Without API Keys

For development/testing, the system will:
1. Log mock API calls to console
2. Return simulated verification results
3. Show warning that production APIs are not configured
4. Still allow testing of the full workflow

## Cost Optimization

### Estimated Monthly Costs (1000 verifications)
- Google Places: ~$17
- Hunter.io: $49 (includes 1000 verifications)
- Clearbit: $99 (250 enrichments, use selectively)
- Melissa Data: ~$10
- Twilio SMS: ~$7.50
- **Total**: ~$182.50/month for 1000 verifications

### Cost Saving Tips
1. Cache verification results for 30 days
2. Only use Clearbit for larger organizations
3. Batch verify during off-peak hours
4. Use NPPES (free) before paid services

## Monitoring and Alerts

Set up monitoring for:
- API rate limit warnings
- Failed verification attempts
- Unusual verification patterns
- API service outages

## Support

For API-specific support:
- Google Places: https://developers.google.com/maps/support
- Hunter.io: support@hunter.io
- Clearbit: support@clearbit.com
- Melissa Data: https://www.melissa.com/support
- Twilio: https://support.twilio.com

## Next Steps

1. Sign up for required API services
2. Add API keys to .env file
3. Test verification workflow with real data
4. Monitor API usage and costs
5. Set up alerts for anomalies

This production-ready verification system exceeds the security standards of major EMRs like Athena and Epic by using multiple real-world data sources for comprehensive verification.