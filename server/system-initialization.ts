import { db } from './db';
import { locations } from '@shared/schema';
import { count } from 'drizzle-orm';
import { ClinicDataImportService } from './clinic-data-import-service';
import { downloadNPPESData } from './download-nppes-data';

export async function initializeSystemData() {
  console.log('🚀 Checking system data initialization...');
  
  try {
    // Check if we already have clinic data
    const [locationCount] = await db.select({ count: count() }).from(locations);
    
    if (locationCount.count > 100) {
      console.log(`✅ System already has ${locationCount.count} locations - skipping import`);
      return;
    }
    
    console.log('📊 System needs clinic data - starting automatic import...');
    
    // Download real NPPES data
    const csvPath = await downloadNPPESData();
    
    // Import real clinics
    const importService = new ClinicDataImportService();
    const stats = await importService.importFromNPPES(csvPath, {
      stateFilter: ['TX'], // Start with Texas
      limit: 5000, // Import 5000 real clinics
      skipExisting: true
    });
    
    console.log('✅ Automatic clinic import completed:', stats);
    console.log(`📍 System now has real clinic data from NPPES`);
    
  } catch (error) {
    console.error('❌ System initialization error:', error);
    // Don't crash the server if import fails
  }
}