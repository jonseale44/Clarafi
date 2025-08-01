import { db } from './db.js';
import { locations } from '@shared/schema';
import { count } from 'drizzle-orm';
import { ClinicDataImportService } from './clinic-data-import-service.js';
import { downloadNPPESData } from './download-nppes-data.js';

export async function initializeSystemData() {
  console.log('🚀 Checking system data initialization...');
  
  try {
    // Check if we already have clinic data
    const [locationCount] = await db.select({ count: count() }).from(locations);
    
    if (locationCount.count > 100) {
      console.log(`✅ System already has ${locationCount.count} locations - skipping import`);
      return;
    }
    
    console.log('📊 System needs clinic data - automatic import temporarily disabled');
    console.log('💡 The searchable clinic dropdown will show existing health systems and their locations');
    
    // NPPES download temporarily disabled due to file format issues
    // The full NPPES file is 8GB+ and requires special handling
    // For now, users can search existing clinics in the database
    
    // TODO: Re-enable when NPPES file format is resolved
    // const csvPath = await downloadNPPESData();
    // const importService = new ClinicDataImportService();
    // const stats = await importService.importFromNPPES(csvPath, {
    //   stateFilter: ['TX'],
    //   limit: 5000,
    //   skipExisting: true
    // });
    
    console.log('✅ System ready with existing clinic data');
    
  } catch (error) {
    console.error('❌ System initialization error:', error);
    // Don't crash the server if import fails
  }
}