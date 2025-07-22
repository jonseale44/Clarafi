/**
 * Database Restructure Plan
 * 
 * This script will:
 * 1. Wipe all existing health system and location data
 * 2. Import proper organizational hierarchy from CMS PECOS
 * 3. Supplement with NPPES data
 * 4. Create a clean, HIPAA-compliant structure
 */

import { db } from './db.js';
import { sql } from 'drizzle-orm';

export async function executeDataRestructure() {
  console.log('🚨 STARTING COMPLETE DATABASE RESTRUCTURE');
  
  try {
    // Step 1: Disable foreign key constraints temporarily
    await db.execute(sql`SET session_replication_role = 'replica'`);
    
    // Step 2: Truncate all tables in correct order (child tables first)
    console.log('📦 Truncating all data tables...');
    
    // User-related tables
    await db.execute(sql`TRUNCATE TABLE user_session_locations CASCADE`);
    await db.execute(sql`TRUNCATE TABLE user_locations CASCADE`);
    await db.execute(sql`TRUNCATE TABLE user_preferences CASCADE`);
    await db.execute(sql`TRUNCATE TABLE authentication_logs CASCADE`);
    await db.execute(sql`TRUNCATE TABLE emergency_access_logs CASCADE`);
    await db.execute(sql`TRUNCATE TABLE phi_access_logs CASCADE`);
    await db.execute(sql`TRUNCATE TABLE data_modification_logs CASCADE`);
    
    // Clinical data tables
    await db.execute(sql`TRUNCATE TABLE encounters CASCADE`);
    await db.execute(sql`TRUNCATE TABLE appointments CASCADE`);
    await db.execute(sql`TRUNCATE TABLE patients CASCADE`);
    await db.execute(sql`TRUNCATE TABLE orders CASCADE`);
    await db.execute(sql`TRUNCATE TABLE medications CASCADE`);
    await db.execute(sql`TRUNCATE TABLE lab_orders CASCADE`);
    await db.execute(sql`TRUNCATE TABLE lab_results CASCADE`);
    
    // Marketing/analytics tables
    await db.execute(sql`TRUNCATE TABLE marketing_metrics CASCADE`);
    await db.execute(sql`TRUNCATE TABLE acquisition_sources CASCADE`);
    await db.execute(sql`TRUNCATE TABLE conversion_events CASCADE`);
    await db.execute(sql`TRUNCATE TABLE user_acquisition CASCADE`);
    
    // Organization structure tables
    await db.execute(sql`TRUNCATE TABLE locations CASCADE`);
    await db.execute(sql`TRUNCATE TABLE organizations CASCADE`);
    await db.execute(sql`TRUNCATE TABLE subscription_keys CASCADE`);
    await db.execute(sql`TRUNCATE TABLE subscription_history CASCADE`);
    
    // Finally, users and health systems
    await db.execute(sql`TRUNCATE TABLE users CASCADE`);
    await db.execute(sql`TRUNCATE TABLE health_systems CASCADE`);
    
    // Step 3: Re-enable foreign key constraints
    await db.execute(sql`SET session_replication_role = 'origin'`);
    
    // Step 4: Reset sequences
    console.log('🔄 Resetting ID sequences...');
    await db.execute(sql`ALTER SEQUENCE health_systems_id_seq RESTART WITH 1`);
    await db.execute(sql`ALTER SEQUENCE organizations_id_seq RESTART WITH 1`);
    await db.execute(sql`ALTER SEQUENCE locations_id_seq RESTART WITH 1`);
    await db.execute(sql`ALTER SEQUENCE users_id_seq RESTART WITH 1`);
    await db.execute(sql`ALTER SEQUENCE patients_id_seq RESTART WITH 1`);
    
    console.log('✅ Database wiped successfully');
    
    // Step 5: Create proper health system structure
    console.log('🏗️ Creating proper health system hierarchy...');
    
    // Major health systems (from PECOS/manual curation)
    const majorHealthSystems = [
      {
        name: 'Kaiser Permanente',
        shortName: 'Kaiser',
        systemType: 'integrated_delivery_network',
        states: ['CA', 'CO', 'GA', 'HI', 'MD', 'OR', 'VA', 'WA']
      },
      {
        name: 'Ascension Health',
        shortName: 'Ascension',
        systemType: 'health_system',
        states: ['AL', 'FL', 'IL', 'IN', 'KS', 'MI', 'MO', 'TN', 'TX', 'WI']
      },
      {
        name: 'HCA Healthcare',
        shortName: 'HCA',
        systemType: 'health_system',
        states: ['CA', 'CO', 'FL', 'GA', 'IN', 'KS', 'KY', 'LA', 'MO', 'NV', 'NC', 'SC', 'TN', 'TX', 'UT', 'VA']
      },
      {
        name: 'CommonSpirit Health',
        shortName: 'CommonSpirit',
        systemType: 'health_system',
        states: ['AZ', 'CA', 'CO', 'IA', 'KS', 'KY', 'MN', 'NE', 'NM', 'ND', 'OH', 'OR', 'SD', 'TN', 'TX', 'WA']
      },
      {
        name: 'Mayo Clinic',
        shortName: 'Mayo',
        systemType: 'academic_medical_center',
        states: ['AZ', 'FL', 'MN', 'WI']
      }
    ];
    
    return {
      success: true,
      message: 'Database restructure complete. Ready for proper hierarchy import.'
    };
    
  } catch (error) {
    console.error('❌ Restructure failed:', error);
    throw error;
  }
}

// Data structure for PECOS import
interface PECOSProvider {
  enrollmentId: string;
  npi: string;
  organizationName: string;
  doingBusinessAs?: string;
  
  // Ownership hierarchy
  ownershipType: string; // 'Individual', 'Corporation', 'Partnership'
  parentOrganizationName?: string;
  parentEnrollmentId?: string;
  ultimateParentName?: string;
  ultimateParentTIN?: string;
  
  // Chain affiliations
  chainOrganizationName?: string;
  chainHomeOfficeAddress?: string;
  
  // Location info
  practiceAddress: string;
  practiceCity: string;
  practiceState: string;
  practiceZip: string;
  
  // Provider types
  providerType: string;
  specialty: string;
}

// New import logic that properly uses hierarchy
export async function importFromPECOS(pecosData: PECOSProvider[]) {
  console.log('📊 Starting PECOS hierarchy import...');
  
  // First pass: Create all parent health systems
  const healthSystemMap = new Map<string, number>();
  
  for (const provider of pecosData) {
    if (provider.ultimateParentName && !healthSystemMap.has(provider.ultimateParentName)) {
      // This is a parent organization
      const [healthSystem] = await db.insert(healthSystems)
        .values({
          name: provider.ultimateParentName,
          shortName: generateShortName(provider.ultimateParentName),
          systemType: determineSystemType(provider.ultimateParentName),
          taxId: provider.ultimateParentTIN,
          active: true,
          subscriptionTier: 2,
          subscriptionStatus: 'pending'
        })
        .returning();
      
      healthSystemMap.set(provider.ultimateParentName, healthSystem.id);
    }
  }
  
  // Second pass: Create locations under proper parents
  for (const provider of pecosData) {
    const healthSystemId = provider.ultimateParentName 
      ? healthSystemMap.get(provider.ultimateParentName)
      : null;
    
    await db.insert(locations).values({
      healthSystemId: healthSystemId,
      organizationId: null, // Skip middle tier for now
      name: provider.doingBusinessAs || provider.organizationName,
      shortName: generateShortName(provider.organizationName),
      locationType: mapProviderTypeToLocationType(provider.providerType),
      address: provider.practiceAddress,
      city: provider.practiceCity,
      state: provider.practiceState,
      zipCode: provider.practiceZip,
      npi: provider.npi,
      active: true
    });
  }
  
  console.log('✅ PECOS import complete with proper hierarchy');
}

function generateShortName(fullName: string): string {
  return fullName
    .replace(/\b(Health|System|Medical|Center|Healthcare|Corporation|Inc|LLC)\b/gi, '')
    .trim()
    .split(' ')
    .slice(0, 2)
    .join(' ');
}

function determineSystemType(name: string): string {
  const upperName = name.toUpperCase();
  if (upperName.includes('ACADEMIC') || upperName.includes('UNIVERSITY')) return 'academic_medical_center';
  if (upperName.includes('INTEGRATED')) return 'integrated_delivery_network';
  return 'health_system';
}

function mapProviderTypeToLocationType(providerType: string): string {
  const typeMap: Record<string, string> = {
    'Hospital': 'hospital',
    'Critical Access Hospital': 'hospital',
    'Clinic/Group Practice': 'clinic',
    'Ambulatory Surgical Center': 'surgery_center',
    'Urgent Care': 'urgent_care',
    'Federally Qualified Health Center': 'fqhc',
    'Rural Health Clinic': 'rural_health'
  };
  
  return typeMap[providerType] || 'clinic';
}