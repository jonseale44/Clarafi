/**
 * Script to create a new admin account
 * Run with: npx tsx create-admin-account.ts
 */

import { db } from './server/db.js';
import { users, healthSystems } from './shared/schema.js';
import { hashPassword } from './server/auth.js';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query: string): Promise<string> => 
  new Promise(resolve => rl.question(query, resolve));

async function createAdminAccount() {
  try {
    console.log('🔑 Create New Admin Account\n');
    
    // Get admin details
    const username = await question('Username: ');
    const email = await question('Email: ');
    const password = await question('Password: ');
    const firstName = await question('First Name: ');
    const lastName = await question('Last Name: ');
    
    // Get or create health system
    const healthSystemName = await question('Health System Name (or press Enter for "Admin Health System"): ') || 'Admin Health System';
    
    // Check if health system exists
    const [existingHealthSystem] = await db.select()
      .from(healthSystems)
      .where(eq(healthSystems.name, healthSystemName))
      .limit(1);
    
    let healthSystemId: number;
    
    if (existingHealthSystem) {
      healthSystemId = existingHealthSystem.id;
      console.log(`✓ Using existing health system: ${healthSystemName}`);
    } else {
      // Create new health system
      const [newHealthSystem] = await db.insert(healthSystems)
        .values({
          name: healthSystemName,
          shortName: healthSystemName.substring(0, 20),
          systemType: 'health_system',
          active: true,
          subscriptionTier: 3,
          subscriptionStatus: 'active'
        })
        .returning();
      
      healthSystemId = newHealthSystem.id;
      console.log(`✓ Created new health system: ${healthSystemName}`);
    }
    
    // Hash password
    const hashedPassword = await hashPassword(password);
    
    // Create admin user
    const [newUser] = await db.insert(users)
      .values({
        username,
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role: 'admin',
        healthSystemId,
        emailVerified: true,
        accountStatus: 'active',
        active: true,
        verificationStatus: 'verified'
      })
      .returning();
    
    console.log(`\n✅ Admin account created successfully!`);
    console.log(`   Username: ${username}`);
    console.log(`   Email: ${email}`);
    console.log(`   User ID: ${newUser.id}`);
    console.log(`   Health System: ${healthSystemName} (ID: ${healthSystemId})`);
    console.log(`\nYou can now log in with these credentials.`);
    
  } catch (error) {
    console.error('❌ Error creating admin account:', error);
  } finally {
    rl.close();
    process.exit(0);
  }
}

// Import eq operator
import { eq } from 'drizzle-orm';

// Run the script
createAdminAccount();