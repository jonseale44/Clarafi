# Test Clinic Examples for Admin Verification

Use these REAL clinic addresses with YOUR contact info for testing:

## Test Case 1: Small Private Practice (Should Auto-Approve)
- **Organization Name**: Austin Family Medicine
- **Address**: 1301 W 38th St, Suite 102
- **City**: Austin
- **State**: TX
- **ZIP**: 78705
- **Your Email**: [your-email]
- **Your Phone**: [your-phone]
- **Tax ID**: 12-3456789 (test format)
- **Expected Providers**: 3
- **Organization Type**: private_practice

## Test Case 2: Medium Clinic
- **Organization Name**: Cleveland Clinic Main Campus
- **Address**: 9500 Euclid Ave
- **City**: Cleveland  
- **State**: OH
- **ZIP**: 44195
- **Your Email**: [your-email]
- **Your Phone**: [your-phone]
- **Tax ID**: 34-5678901 (test format)
- **Expected Providers**: 50
- **Organization Type**: clinic

## Test Case 3: Large Health System
- **Organization Name**: Mayo Clinic
- **Address**: 200 First St SW
- **City**: Rochester
- **State**: MN
- **ZIP**: 55905
- **Your Email**: [your-email]
- **Your Phone**: [your-phone]
- **Tax ID**: 41-1234567 (test format)
- **NPI**: 1234567890 (optional)
- **Expected Providers**: 200
- **Organization Type**: health_system

## Test Case 4: Should Fail Verification
- **Organization Name**: Fake Medical Center
- **Address**: 123 Fake Street
- **City**: Nowhere
- **State**: XX
- **ZIP**: 00000
- **Your Email**: fake@fake.com
- **Your Phone**: 000-000-0000
- **Tax ID**: 00-0000000

## What Will Happen:

1. Google Places will find the real clinics at their real addresses
2. Email verification will check YOUR email domain
3. SMS will go to YOUR phone
4. You'll get admin access to a NEW, EMPTY health system
5. No risk to any real patient data!

The beauty is: even if someone malicious does this with a real clinic's info, they just get an empty EMR they have to pay for!