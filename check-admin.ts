import { db } from './server/db.js';
import { users } from './shared/schema.js';
import { eq } from 'drizzle-orm';

async function checkAdmin() {
  try {
    const adminUsers = await db.select()
      .from(users)
      .where(eq(users.username, 'admin'));
    
    if (adminUsers.length > 0) {
      console.log('✅ Admin user exists');
      console.log('Username: admin');
      console.log('You can login with the default password: admin123');
    } else {
      console.log('❌ No admin user found');
      console.log('Creating default admin account...');
      
      // Import and create default admin
      const { hashPassword } = await import('./server/auth.js');
      const { healthSystems } = await import('./shared/schema.js');
      
      // Create admin health system
      const [adminHS] = await db.insert(healthSystems)
        .values({
          name: 'System Administration',
          shortName: 'SysAdmin',
          systemType: 'health_system',
          active: true,
          subscriptionTier: 3,
          subscriptionStatus: 'active'
        })
        .returning();
      
      // Create admin user
      const hashedPassword = await hashPassword('admin123');
      await db.insert(users)
        .values({
          username: 'admin',
          email: 'admin@system.local',
          password: hashedPassword,
          firstName: 'System',
          lastName: 'Administrator',
          role: 'admin',
          healthSystemId: adminHS.id,
          emailVerified: true,
          accountStatus: 'active',
          isSystemAdmin: true
        });
      
      console.log('✅ Created default admin account');
      console.log('Username: admin');
      console.log('Password: admin123');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

checkAdmin();
