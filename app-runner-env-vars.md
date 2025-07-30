# App Runner Environment Variables

Add these in the App Runner console:

| Variable Name | Value |
|--------------|-------|
| NODE_ENV | production |
| DATABASE_URL | postgresql://clarafiadmin:Yregru$55555@[YOUR_ENDPOINT]:5432/postgres |
| SESSION_SECRET | [YOUR_GENERATED_SECRET] |
| PORT | 8080 |
| OPENAI_API_KEY | [REQUIRED - Get from https://platform.openai.com/api-keys] |

Additional variables you may need later:
- STRIPE_SECRET_KEY
- SENDGRID_API_KEY
- TWILIO_ACCOUNT_SID
- TWILIO_AUTH_TOKEN