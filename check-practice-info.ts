import { db } from './server/db';
import { locations, healthSystems } from './shared/schema';
import { eq } from 'drizzle-orm';

async function checkPracticeInfo() {
  try {
    // Get Will Roger's health system info (healthSystemId: 6)
    const healthSystemId = 6;
    
    console.log('Checking practice information for healthSystemId:', healthSystemId);
    
    // Get health system details
    const [healthSystem] = await db.select()
      .from(healthSystems)
      .where(eq(healthSystems.id, healthSystemId));
      
    console.log('\nHealth System:', healthSystem);
    
    // Get all locations for this health system
    const clinicLocations = await db.select()
      .from(locations)
      .where(eq(locations.healthSystemId, healthSystemId));
      
    console.log('\nLocations for this health system:', clinicLocations.length);
    
    if (clinicLocations.length > 0) {
      console.log('\nFirst location (used for practice info):');
      const location = clinicLocations[0];
      console.log('- Name:', location.name);
      console.log('- Address:', location.address);
      console.log('- City:', location.city);
      console.log('- State:', location.state);
      console.log('- Zip Code:', location.zipCode);
      console.log('- Phone:', location.phone);
      console.log('- Type:', location.locationType);
      
      console.log('\nAll locations:');
      clinicLocations.forEach((loc, index) => {
        console.log(`\nLocation ${index + 1}:`);
        console.log('- ID:', loc.id);
        console.log('- Name:', loc.name);
        console.log('- Address:', loc.address);
        console.log('- City:', loc.city);
        console.log('- State:', loc.state);
      });
    } else {
      console.log('\nNo locations found for this health system.');
    }
    
  } catch (error) {
    console.error('Error checking practice info:', error);
  } finally {
    process.exit(0);
  }
}

checkPracticeInfo();