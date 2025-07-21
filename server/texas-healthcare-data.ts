import { db } from "./db.js";
import { healthSystems, organizations, locations } from "@shared/schema";
import { sql, eq } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import { downloadNPPESData } from './download-nppes-data.js';

interface NPPESRecord {
  NPI: string;
  'Entity Type Code': string;
  'Provider Organization Name (Legal Business Name)': string;
  'Provider First Line Business Practice Location Address': string;
  'Provider Business Practice Location City Name': string;
  'Provider Business Practice Location State Name': string;
  'Provider Business Practice Location Postal Code': string;
  'Provider Business Practice Location Phone Number': string;
  'Healthcare Provider Taxonomy Code_1': string;
  'Healthcare Provider Taxonomy Description_1': string;
}

interface TexasHealthcareOrganization {
  npi: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  taxonomyCode: string;
  taxonomyDescription: string;
  organizationType: 'health_system' | 'hospital' | 'clinic_group' | 'urgent_care' | 'specialty_center';
  locationType: 'clinic' | 'hospital' | 'urgent_care' | 'specialty_center' | 'outpatient_center';
}

// Classify healthcare organizations based on taxonomy codes and names
function classifyHealthcareOrganization(record: NPPESRecord): TexasHealthcareOrganization | null {
  const name = record['Provider Organization Name (Legal Business Name)'];
  const taxonomyDesc = record['Healthcare Provider Taxonomy Description_1'] || '';
  const nameLower = name.toLowerCase();
  
  // Skip individual practitioners (Entity Type Code 1)
  if (record['Entity Type Code'] !== '2') {
    return null;
  }

  // Determine organization and location type
  let organizationType: TexasHealthcareOrganization['organizationType'];
  let locationType: TexasHealthcareOrganization['locationType'];

  // Health System identification
  if (nameLower.includes('health system') || 
      nameLower.includes('health network') ||
      nameLower.includes('healthcare system') ||
      nameLower.includes('medical system')) {
    organizationType = 'health_system';
    locationType = 'hospital';
  }
  // Hospital identification
  else if (nameLower.includes('hospital') || 
           nameLower.includes('medical center') ||
           taxonomyDesc.toLowerCase().includes('hospital')) {
    organizationType = 'hospital';
    locationType = 'hospital';
  }
  // Urgent Care identification
  else if (nameLower.includes('urgent care') || 
           nameLower.includes('emergency care') ||
           taxonomyDesc.toLowerCase().includes('urgent care')) {
    organizationType = 'urgent_care';
    locationType = 'urgent_care';
  }
  // Specialty Center identification
  else if (nameLower.includes('specialty') || 
           nameLower.includes('cancer center') ||
           nameLower.includes('heart center') ||
           taxonomyDesc.toLowerCase().includes('specialty')) {
    organizationType = 'specialty_center';
    locationType = 'specialty_center';
  }
  // Default to clinic group for other organizations
  else if (nameLower.includes('clinic') || 
           nameLower.includes('family medicine') ||
           nameLower.includes('primary care') ||
           nameLower.includes('medical group') ||
           nameLower.includes('associates') ||
           taxonomyDesc.toLowerCase().includes('clinic')) {
    organizationType = 'clinic_group';
    locationType = 'clinic';
  }
  // Skip if we can't classify
  else {
    return null;
  }

  // Safely handle postal code - some records may have missing data
  const postalCode = record['Provider Business Practice Location Postal Code'];
  const zipCode = postalCode && typeof postalCode === 'string' ? postalCode.substring(0, 5) : '';

  // Validate required fields - skip records with missing critical data
  const address = record['Provider First Line Business Practice Location Address'];
  const city = record['Provider Business Practice Location City Name'];
  const state = record['Provider Business Practice Location State Name'];
  
  // Skip records missing required address components
  if (!address || !city || !state || !zipCode) {
    return null;
  }

  return {
    npi: record.NPI,
    name: name,
    address: address,
    city: city,
    state: state,
    zipCode: zipCode,
    phone: record['Provider Business Practice Location Phone Number'],
    taxonomyCode: record['Healthcare Provider Taxonomy Code_1'],
    taxonomyDescription: taxonomyDesc,
    organizationType,
    locationType
  };
}

// Process ALL US healthcare organizations from NPPES data
export async function importUSHealthcareData(): Promise<void> {
  console.log('🏥 Starting nationwide healthcare data import from NPPES...');
  
  try {
    // Download latest NPPES data
    const csvPath = await downloadNPPESData();
    console.log(`📄 Processing NPPES data from: ${csvPath}`);

    const healthcareOrganizations: TexasHealthcareOrganization[] = [];
    let processedCount = 0;
    let orgCount = 0;

    // Stream process the large CSV file
    await new Promise<void>((resolve, reject) => {
      fs.createReadStream(csvPath)
        .pipe(csv())
        .on('data', (row: NPPESRecord) => {
          processedCount++;
          
          // Progress indicator
          if (processedCount % 100000 === 0) {
            console.log(`📊 Processed ${processedCount} records, found ${orgCount} healthcare organizations`);
          }
          
          // Process ALL states (remove Texas filter)
          const org = classifyHealthcareOrganization(row);
          if (org) {
            orgCount++;
            healthcareOrganizations.push(org);
          }
        })
        .on('end', () => {
          console.log(`✅ Finished processing ${processedCount} total records`);
          console.log(`🏥 Found ${healthcareOrganizations.length} healthcare organizations nationwide`);
          resolve();
        })
        .on('error', reject);
    });

    // Group organizations by health system vs standalone
    const healthSystemsMap = new Map<string, TexasHealthcareOrganization[]>();
    const standaloneLocations: TexasHealthcareOrganization[] = [];

    for (const org of healthcareOrganizations) {
      if (org.organizationType === 'health_system') {
        if (!healthSystemsMap.has(org.name)) {
          healthSystemsMap.set(org.name, []);
        }
        healthSystemsMap.get(org.name)!.push(org);
      } else {
        standaloneLocations.push(org);
      }
    }

    console.log(`🏢 Creating ${healthSystemsMap.size} health systems...`);
    console.log(`🏥 Creating ${standaloneLocations.length} standalone locations...`);

    // Import health systems first
    for (const [systemName, systemOrgs] of healthSystemsMap) {
      try {
        // Create health system
        const [healthSystemRecord] = await db
          .insert(healthSystems)
          .values({
            name: systemName,
            systemType: 'health_system',
            subscriptionTier: 1,
            subscriptionStatus: 'pending' as const,
            active: true
          })
          .onConflictDoNothing()
          .returning();

        if (healthSystemRecord) {
          console.log(`✅ Created health system: ${systemName}`);
          
          // Create locations for this health system
          for (const org of systemOrgs) {
            await db
              .insert(locations)
              .values({
                healthSystemId: healthSystemRecord.id,
                name: org.name,
                locationType: org.locationType,
                address: org.address,
                city: org.city,
                state: org.state,
                zipCode: org.zipCode,
                phone: org.phone,
                npi: org.npi,
                active: true
              })
              .onConflictDoNothing();
          }
        }
      } catch (error) {
        console.error(`❌ Error creating health system ${systemName}:`, error);
      }
    }

    // Import standalone locations
    let importedCount = 0;
    for (const org of standaloneLocations) {
      try {
        // Create individual health system for standalone clinic
        const [healthSystemRecord] = await db
          .insert(healthSystems)
          .values({
            name: org.name,
            systemType: determineSystemType(org.organizationType),
            subscriptionTier: 1,
            subscriptionStatus: 'pending' as const,
            active: true
          })
          .onConflictDoNothing()
          .returning();

        if (healthSystemRecord) {
          // Create location
          await db
            .insert(locations)
            .values({
              healthSystemId: healthSystemRecord.id,
              name: org.name,
              locationType: org.locationType,
              address: org.address,
              city: org.city,
              state: org.state,
              zipCode: org.zipCode,
              phone: org.phone,
              npi: org.npi,
              active: true
            })
            .onConflictDoNothing();

          importedCount++;
          
          if (importedCount % 100 === 0) {
            console.log(`📊 Imported ${importedCount} standalone healthcare organizations`);
          }
        }
      } catch (error) {
        console.error(`❌ Error importing ${org.name}:`, error);
      }
    }

    console.log('🎉 Nationwide healthcare data import completed successfully!');
    console.log(`📊 Final totals:`);
    console.log(`   - Health systems: ${healthSystemsMap.size}`);
    console.log(`   - Standalone organizations: ${importedCount}`);
    console.log(`   - Total locations created: ${healthcareOrganizations.length}`);

  } catch (error) {
    console.error('❌ Error importing US healthcare data:', error);
    throw error;
  }
}

function determineSystemType(orgType: TexasHealthcareOrganization['organizationType']): string {
  switch (orgType) {
    case 'health_system': return 'health_system';
    case 'hospital': return 'hospital';
    case 'clinic_group': return 'clinic_group';
    case 'urgent_care': return 'urgent_care';
    case 'specialty_center': return 'specialty_center';
    default: return 'clinic_group';
  }
}

// Quick stats function
export async function getUSHealthcareStats() {
  const healthSystemCount = await db
    .select({ count: sql`COUNT(*)` })
    .from(healthSystems)
    .where(eq(healthSystems.active, true));
    
  const locationCount = await db
    .select({ count: sql`COUNT(*)` })
    .from(locations)
    .innerJoin(healthSystems, eq(locations.healthSystemId, healthSystems.id))
    .where(eq(locations.active, true));

  return {
    healthSystems: healthSystemCount[0]?.count || 0,
    locations: locationCount[0]?.count || 0
  };
}