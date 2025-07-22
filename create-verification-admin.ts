import { db } from './server/db';
import { users, clinicAdminVerifications } from './shared/schema';
import { eq } from 'drizzle-orm';
import { hashPassword } from './server/auth';

async function createVerificationAdmin(email: string) {
  console.log(`Creating admin account for ${email}...`);
  
  // Get verification record
  const [verification] = await db.select()
    .from(clinicAdminVerifications)
    .where(eq(clinicAdminVerifications.email, email))
    .limit(1);
  
  if (!verification) {
    console.error('Verification not found');
    return;
  }
  
  const verificationData = verification.verificationData as any;
  
  // Generate temporary password
  const length = 16;
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=';
  let tempPassword = '';
  
  // Ensure at least one of each required character type
  tempPassword += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)];
  tempPassword += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)];
  tempPassword += '0123456789'[Math.floor(Math.random() * 10)];
  tempPassword += '!@#$%^&*()_+-='[Math.floor(Math.random() * 14)];
  
  // Fill the rest randomly
  for (let i = tempPassword.length; i < length; i++) {
    tempPassword += charset[Math.floor(Math.random() * charset.length)];
  }
  
  // Shuffle the password
  tempPassword = tempPassword.split('').sort(() => Math.random() - 0.5).join('');
  
  // Create admin user
  const [adminUser] = await db.insert(users).values({
    username: email.split('@')[0],
    email: email,
    password: await hashPassword(tempPassword),
    firstName: verificationData.firstName,
    lastName: verificationData.lastName,
    role: 'admin',
    healthSystemId: verification.healthSystemId!,
    emailVerified: true,
    verificationStatus: 'tier3_verified',
    mfaEnabled: true,
    requirePasswordChange: true
  }).returning();
  
  console.log('✅ Admin account created successfully!');
  console.log('Username:', adminUser.username);
  console.log('Temporary Password:', tempPassword);
  console.log('\nPlease save these credentials and log in at https://clarafi.ai/auth');
  console.log('You will be prompted to change your password on first login.');
  
  process.exit(0);
}

// Get email from command line argument
const email = process.argv[2];
if (!email) {
  console.error('Please provide email as argument: npm run create-verification-admin jonathanseale+14@gmail.com');
  process.exit(1);
}

createVerificationAdmin(email).catch(console.error);