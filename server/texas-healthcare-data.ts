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
  'Provider Business Practice Location Address City Name': string;
  'Provider Business Practice Location Address State Name': string;
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
  
  // Skip individual practitioners (Entity Type Code 1)
  if (record['Entity Type Code'] !== '2') {
    return null;
  }

  // Debug logging for first few Entity Type 2 records
  if (name) {
    console.log(`🔍 Processing Entity Type 2: "${name}" - Taxonomy: "${taxonomyDesc}"`);
    
    // Show available fields for debugging (first few records only)
    const availableFields = Object.keys(record);
    if (availableFields.length > 0) {
      console.log(`📋 Available fields (${availableFields.length}):`, availableFields.slice(0, 10));
      console.log(`📍 Address fields:`, {
        address: record['Provider First Line Business Practice Location Address'],
        city_name: record['Provider Business Practice Location Address City Name'],
        state_name: record['Provider Business Practice Location Address State Name']
      });
    }
  }

  // Skip if no organization name
  if (!name || name.trim() === '' || name === '<UNAVAIL>') {
    console.log(`⚠️ Skipping record with no valid name: "${name}"`);
    return null;
  }
  
  const nameLower = name.toLowerCase();

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
           nameLower.includes('physicians') ||
           nameLower.includes('medical') ||
           nameLower.includes('healthcare') ||
           nameLower.includes('health') ||
           taxonomyDesc.toLowerCase().includes('clinic') ||
           taxonomyDesc.toLowerCase().includes('family practice') ||
           taxonomyDesc.toLowerCase().includes('internal medicine') ||
           taxonomyDesc.toLowerCase().includes('pediatrics')) {
    organizationType = 'clinic_group';
    locationType = 'clinic';
  }
  // Accept any remaining Entity Type 2 organizations as clinic groups
  else {
    organizationType = 'clinic_group';
    locationType = 'clinic';
  }

  // Safely handle postal code - some records may have missing data
  const postalCode = record['Provider Business Practice Location Postal Code'] || (record as any)[33];
  const zipCode = postalCode && typeof postalCode === 'string' ? postalCode.substring(0, 5) : '';

  // Validate required fields - skip records with missing critical data
  // Use both field names and column positions as fallback
  const address = record['Provider First Line Business Practice Location Address'] || (record as any)[29];
  const city = record['Provider Business Practice Location Address City Name'] || (record as any)[31];
  const state = record['Provider Business Practice Location Address State Name'] || (record as any)[32];
  
  // Skip records missing critical address components (be more lenient)
  if (!address || !city || !state) {
    console.log(`⚠️ Skipping "${name}" - missing address data: address="${address}", city="${city}", state="${state}"`);
    return null;
  }
  
  // Use default zipCode if missing
  const finalZipCode = zipCode || '00000';

  console.log(`✅ Created organization: "${name}" (${organizationType}) in ${city}, ${state}`);
  
  return {
    npi: record.NPI,
    name: name,
    address: address,
    city: city,
    state: state,
    zipCode: finalZipCode,
    phone: record['Provider Business Practice Location Phone Number'] || (record as any)[35],
    taxonomyCode: record['Healthcare Provider Taxonomy Code_1'] || (record as any)[48],
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
        .pipe(csv({ headers: false })) // Parse as array instead of object
        .on('data', (row: string[]) => {
          processedCount++;
          
          // Progress indicator
          if (processedCount % 100000 === 0) {
            console.log(`📊 Processed ${processedCount} records, found ${orgCount} healthcare organizations`);
          }
          
          // Skip header row
          if (processedCount === 1) return;
          
          // Convert array to record object for processing
          const record: NPPESRecord = {
            NPI: row[0] || '',
            'Entity Type Code': row[1] || '',
            'Provider Organization Name (Legal Business Name)': row[4] || '',
            'Provider First Line Business Practice Location Address': row[28] || '',
            'Provider Business Practice Location Address City Name': row[30] || '',
            'Provider Business Practice Location Address State Name': row[31] || '',
            'Provider Business Practice Location Postal Code': row[32] || '',
            'Provider Business Practice Location Phone Number': row[34] || '',
            'Healthcare Provider Taxonomy Code_1': row[47] || '',
            'Healthcare Provider Taxonomy Description_1': row[48] || ''
          };
          
          // Process ALL states (remove Texas filter)
          const org = classifyHealthcareOrganization(record);
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

    // Group organizations based on REAL ownership relationships only
    const trueHealthSystemsMap = new Map<string, TexasHealthcareOrganization[]>();
    const majorHospitalSystemsMap = new Map<string, TexasHealthcareOrganization[]>();
    const independentClinics: TexasHealthcareOrganization[] = [];

    console.log('🔍 Analyzing healthcare organizations for real ownership relationships...');

    for (const org of healthcareOrganizations) {
      const nameLower = org.name.toLowerCase();
      
      // Check if this is a TRUE health system (very strict criteria)
      if (org.organizationType === 'health_system' || 
          nameLower.endsWith('health system') ||
          nameLower.endsWith('healthcare system') ||
          nameLower.endsWith('medical system') ||
          nameLower.endsWith('hospital system')) {
        
        // Extract base system name for grouping related locations
        const baseSystemName = extractBaseSystemName(org.name);
        if (!trueHealthSystemsMap.has(baseSystemName)) {
          trueHealthSystemsMap.set(baseSystemName, []);
        }
        trueHealthSystemsMap.get(baseSystemName)!.push(org);
      }
      // Check for major hospital networks with REAL ownership relationships
      else if ((nameLower.includes('mayo clinic') || 
                nameLower.includes('cleveland clinic') ||
                nameLower.includes('kaiser permanente') ||
                nameLower.includes('providence') ||
                nameLower.includes('ascension') ||
                nameLower.includes('hca healthcare') ||
                nameLower.includes('commonspirit') ||
                nameLower.includes('trinity health') ||
                nameLower.includes('adventhealth')) &&
               !nameLower.includes('independent')) {
        
        const baseSystemName = extractMajorSystemName(org.name);
        if (!majorHospitalSystemsMap.has(baseSystemName)) {
          majorHospitalSystemsMap.set(baseSystemName, []);
        }
        majorHospitalSystemsMap.get(baseSystemName)!.push(org);
      }
      // Independent clinics - each one becomes its own isolated health system
      else {
        independentClinics.push(org);
      }
    }

    console.log(`📊 Grouping results:`);
    console.log(`   - True health systems: ${trueHealthSystemsMap.size}`);
    console.log(`   - Major hospital networks: ${majorHospitalSystemsMap.size}`);
    console.log(`   - Independent clinics: ${independentClinics.length}`);

    // Create true health systems
    for (const [systemName, systemOrgs] of Array.from(trueHealthSystemsMap)) {
      try {
        const result = await db
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
        
        const healthSystemRecord = result[0];

        if (healthSystemRecord) {
          console.log(`✅ Created true health system: ${systemName}`);
          
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

    // Create major hospital systems
    for (const [systemName, systemOrgs] of Array.from(majorHospitalSystemsMap)) {
      try {
        const result = await db
          .insert(healthSystems)
          .values({
            name: systemName,
            systemType: 'hospital',
            subscriptionTier: 1,
            subscriptionStatus: 'pending' as const,
            active: true
          })
          .onConflictDoNothing()
          .returning();
        
        const healthSystemRecord = result[0];

        if (healthSystemRecord) {
          console.log(`✅ Created major hospital network: ${systemName}`);
          
          // Create locations for this system
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
        console.error(`❌ Error creating hospital system ${systemName}:`, error);
      }
    }

    // Create independent clinics - each as its own health system
    for (const clinic of independentClinics) {
      try {
        // Create a health system for this truly independent clinic
        const healthSystemName = `${clinic.name} System`;
        
        const result = await db
          .insert(healthSystems)
          .values({
            name: healthSystemName,
            systemType: 'clinic',
            subscriptionTier: 1,
            subscriptionStatus: 'pending' as const,
            active: true
          })
          .onConflictDoNothing()
          .returning();
        
        const healthSystemRecord = result[0];

        if (healthSystemRecord) {
          console.log(`✅ Created independent clinic system: ${healthSystemName}`);
          
          // CRITICAL: Create the actual location for this clinic
          await db
            .insert(locations)
            .values({
              healthSystemId: healthSystemRecord.id,
              name: clinic.name,  // The location keeps the original clinic name
              locationType: clinic.locationType,
              address: clinic.address,
              city: clinic.city,
              state: clinic.state,
              zipCode: clinic.zipCode,
              phone: clinic.phone,
              npi: clinic.npi,
              active: true
            })
            .onConflictDoNothing();
          
          console.log(`   - Added location: ${clinic.name}`);
        }
      } catch (error) {
        console.error(`❌ Error creating independent clinic ${clinic.name}:`, error);
      }
    }

    // Calculate totals
    const totalHealthSystems = trueHealthSystemsMap.size + majorHospitalSystemsMap.size + independentClinics.length;
    const totalLocations = healthcareOrganizations.length;

    console.log('🎉 Nationwide healthcare data import completed successfully!');
    console.log(`📊 Final totals:`);
    console.log(`   - True health systems created: ${trueHealthSystemsMap.size}`);
    console.log(`   - Major hospital networks created: ${majorHospitalSystemsMap.size}`);
    console.log(`   - Independent clinic systems created: ${independentClinics.length}`);
    console.log(`   - Total parent systems created: ${totalHealthSystems}`);
    console.log(`   - Total clinic locations created: ${totalLocations}`);

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

// Helper function to extract base health system name
function extractBaseSystemName(fullName: string): string {
  // Remove common suffixes and variations
  const cleaned = fullName
    .replace(/\s*-\s*.*$/, '') // Remove everything after dash
    .replace(/\s+(Health System|Healthcare System|Medical System|Hospital System)$/i, '')
    .replace(/\s+(of|at|in)\s+.*$/i, '') // Remove location suffixes
    .trim();
  
  return cleaned || fullName;
}

// Helper function to extract major hospital system name
function extractMajorSystemName(fullName: string): string {
  const nameLower = fullName.toLowerCase();
  
  // Map variations to canonical names
  if (nameLower.includes('mayo clinic')) return 'Mayo Clinic';
  if (nameLower.includes('cleveland clinic')) return 'Cleveland Clinic';
  if (nameLower.includes('kaiser permanente')) return 'Kaiser Permanente';
  if (nameLower.includes('providence')) return 'Providence';
  if (nameLower.includes('ascension')) return 'Ascension';
  if (nameLower.includes('hca healthcare')) return 'HCA Healthcare';
  if (nameLower.includes('commonspirit')) return 'CommonSpirit Health';
  if (nameLower.includes('trinity health')) return 'Trinity Health';
  if (nameLower.includes('adventhealth')) return 'AdventHealth';
  
  // Default: clean up the name
  return fullName.replace(/\s*-\s*.*$/, '').trim();
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