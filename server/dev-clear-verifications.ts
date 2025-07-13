import { db } from './db';
import { clinicAdminVerifications, healthSystems } from '../shared/schema';
import { eq } from 'drizzle-orm';

async function clearTestVerifications() {
  console.log('🧹 Clearing test verification data...');
  
  try {
    // Clear test verifications
    const deletedVerifications = await db.delete(clinicAdminVerifications)
      .where(eq(clinicAdminVerifications.organizationName, 'Clarafi'))
      .returning();
    
    console.log(`✅ Deleted ${deletedVerifications.length} test verifications`);
    
    // Also clear any test health systems
    const deletedHealthSystems = await db.delete(healthSystems)
      .where(eq(healthSystems.name, 'Clarafi'))
      .returning();
      
    console.log(`✅ Deleted ${deletedHealthSystems.length} test health systems`);
    
    console.log('✨ Test data cleared successfully');
  } catch (error) {
    console.error('❌ Error clearing test data:', error);
  }
  
  process.exit(0);
}

clearTestVerifications();