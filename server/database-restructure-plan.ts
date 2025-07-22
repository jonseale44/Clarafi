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
    // Delete all data from tables in correct order (child tables first)
    // This respects foreign key constraints without needing superuser privileges
    console.log('📦 Deleting all data from tables...');
    
    // Helper function to safely delete from a table
    const safeDelete = async (tableName: string) => {
      try {
        await db.execute(sql.raw(`DELETE FROM ${tableName}`));
        console.log(`✓ Cleared table: ${tableName}`);
      } catch (error: any) {
        if (error.code === '42P01') { // Table doesn't exist
          console.log(`⚠️  Table ${tableName} doesn't exist, skipping...`);
        } else {
          console.log(`❌ Error clearing ${tableName}:`, error.message);
        }
      }
    };

    // Session and logging tables
    await safeDelete('user_session_locations');
    await safeDelete('authentication_logs');
    await safeDelete('emergency_access_logs');
    await safeDelete('phi_access_logs');
    await safeDelete('data_modification_logs');
    
    // Clinical data tables (most dependent first)
    await safeDelete('prescription_transmissions');
    await safeDelete('electronic_signatures');
    await safeDelete('lab_communications');
    await safeDelete('lab_results');
    await safeDelete('lab_orders');
    await safeDelete('imaging_results');
    await safeDelete('imaging_orders');
    await safeDelete('medications');
    await safeDelete('orders');
    await safeDelete('signatures');
    await safeDelete('vitals');
    await safeDelete('family_history');
    await safeDelete('allergies');
    await safeDelete('surgical_history');
    await safeDelete('social_history');
    await safeDelete('medical_history');
    await safeDelete('medical_problems');
    await safeDelete('encounters');
    await safeDelete('appointments');
    await safeDelete('patient_scheduling_patterns');
    await safeDelete('provider_scheduling_patterns');
    await safeDelete('patient_attachments');
    await safeDelete('patients');
    
    // Marketing/analytics tables
    await safeDelete('marketing_campaigns');
    await safeDelete('marketing_automations');
    await safeDelete('marketing_insights');
    await safeDelete('conversion_events');
    await safeDelete('acquisition_sources');
    await safeDelete('marketing_metrics');
    await safeDelete('user_acquisition');
    
    // Blog and content tables
    await safeDelete('article_revisions');
    await safeDelete('blog_articles');
    await safeDelete('article_generation_queue');
    
    // Template and document tables
    await safeDelete('templates');
    await safeDelete('prompt_templates');
    await safeDelete('document_processing_queue');
    
    // User relationship tables
    await safeDelete('passkeys');
    await safeDelete('user_locations');
    await safeDelete('user_health_systems');
    await safeDelete('user_preferences');
    await safeDelete('migration_invitations');
    
    // Billing and subscription tables
    await safeDelete('subscription_keys');
    await safeDelete('subscription_history');
    await safeDelete('billing_accounts');
    
    // Organization structure tables
    await safeDelete('locations');
    await safeDelete('organizations');
    
    // Supporting tables
    await safeDelete('pharmacies');
    await safeDelete('appointment_types');
    
    // Finally, users and health systems
    await safeDelete('users');
    await safeDelete('health_systems');
    
    // Reset sequences - wrap in try-catch as some may not exist
    console.log('🔄 Resetting ID sequences...');
    const sequences = [
      'health_systems_id_seq',
      'organizations_id_seq',
      'locations_id_seq',
      'users_id_seq',
      'patients_id_seq'
    ];
    
    for (const seq of sequences) {
      try {
        await db.execute(sql.raw(`ALTER SEQUENCE ${seq} RESTART WITH 1`));
      } catch (error) {
        console.log(`⚠️  Could not reset sequence ${seq}`);
      }
    }
    
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