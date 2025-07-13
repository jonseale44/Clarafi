# Admin Verification Testing Guide

## Quick Start Testing

### Test Case 1: Hillsboro Clinic (Your Location)
1. Go to `/admin-verification`
2. Click "Search for clinics near you"
3. Click the location button (compass icon)
4. Select **Waco Family Medicine - Hillsboro**
5. The form auto-fills with:
   - Organization: Waco Family Medicine - Hillsboro
   - Address: 1323 East Franklin St #105
   - City: Hillsboro
   - State: TX
   - ZIP: 76645
6. Fill in YOUR details:
   - Your First/Last Name
   - YOUR Email (for verification)
   - YOUR Phone (for SMS)
   - Title: Practice Administrator
   - Tax ID: 12-3456789 (test format - NOT verified against IRS)
   - Expected Providers: 3
   - Type: private_practice

### What Happens Next

When you submit, the system will:

1. **Google Places API**: Verify the clinic exists at that address ✓
2. **NPPES NPI Registry**: Check for healthcare providers (may or may not have NPI)
3. **Email Verification**: Check YOUR email domain
4. **Address Verification**: Validate the physical address ✓
5. **SMS Verification**: Send code to YOUR phone
6. **Risk Score Calculation**: Based on verification results

### Expected Results

- **Small Practice (1-5 providers)**: Needs 2+ verifications, 50+ score = Auto-approved
- **Larger Clinics**: Need 3+ verifications, 70+ score
- **If Approved**: You get admin access to a NEW, EMPTY health system
- **If Manual Review**: You'll see why and what's needed

## Security Model Explained

### What You're Creating
```
New Health System: "Waco Family Medicine - Hillsboro" (ID: 999)
├── 0 Patients (completely empty)
├── 1 Admin User (you)
├── $299/month subscription
└── NO ACCESS to any other system's data
```

### Why This Is Safe
- Even though it's a real clinic name/address
- You get a BRAND NEW empty EMR instance
- Zero access to any existing patient data
- Multi-tenant isolation prevents cross-system access
- You're paying for the service

## Additional Test Scenarios

### Test Different Organization Types

#### Small Private Practice (Auto-approve likely)
- Type: private_practice
- Expected Providers: 1-5
- Monthly Patients: 100-500

#### Medium Clinic
- Type: clinic  
- Expected Providers: 5-50
- Monthly Patients: 500-2000

#### Large Health System (Manual review likely)
- Type: health_system
- Expected Providers: 50+
- Monthly Patients: 5000+

### Test with Invalid Data (Should Fail)
- Organization: Fake Medical Center
- Address: 123 Fake Street
- City: Nowhere
- State: XX
- ZIP: 00000

## API Keys Not Set Up?

If you haven't added the API keys yet, the system will:
1. Log mock API calls to console
2. Show simulated verification results
3. Still let you test the full workflow
4. Display warnings about missing production APIs

## Monitoring Results

Check the console for detailed logs:
- `🔍 [Verification] Starting comprehensive automated verification...`
- `📊 [Verification] API verification results:`
- Individual API responses
- Risk score calculation
- Final approval decision

## After Successful Verification

If auto-approved:
1. Admin account created automatically
2. Redirected to login after 5 seconds
3. Login with your email/temporary password
4. Access admin dashboard for your new health system
5. Generate subscription keys for staff

## Troubleshooting

### "Organization already registered"
- That Tax ID is already in use
- Try a different test Tax ID format

### Low verification score
- Make sure address is exactly correct
- Use a real website URL if possible
- Ensure email domain looks legitimate

### API errors
- Check if API keys are set in .env
- Verify API services are active
- Check rate limits

## The Bottom Line

You're testing the verification system, not trying to impersonate clinics. The system is designed to:
- Verify legitimate businesses
- Prevent obvious fraud
- Create isolated EMR instances
- Protect existing patient data

Go ahead and test with confidence!