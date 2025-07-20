import { db } from './db.js';
import { healthSystems, organizations, locations, InsertHealthSystem, InsertOrganization, InsertLocation } from '@shared/schema';
import { eq, and, or, like } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import csv from 'csv-parser';
import { createReadStream } from 'fs';

interface NPPESProvider {
  NPI: string;
  'Entity Type Code': string; // '1' = Individual, '2' = Organization
  'Provider Organization Name (Legal Business Name)': string;
  'Provider First Name': string;
  'Provider Last Name (Legal Name)': string;
  'Provider First Line Business Practice Location Address': string;
  'Provider Second Line Business Practice Location Address': string;
  'Provider Business Practice Location Address City Name': string;
  'Provider Business Practice Location Address State Name': string;
  'Provider Business Practice Location Address Postal Code': string;
  'Provider Business Practice Location Address Telephone Number': string;
  'Provider Business Practice Location Address Fax Number': string;
  'Healthcare Provider Taxonomy Code_1': string;
  'Healthcare Provider Taxonomy Group_1'?: string;
  'Is Organization Subpart': string;
  'Parent Organization LBN': string;
  'Parent Organization TIN': string;
}

// Primary care taxonomy codes from NUCC taxonomy
const PRIMARY_CARE_TAXONOMIES = [
  '207Q00000X', // Family Medicine
  '207QA0505X', // Family Medicine - Adult Medicine
  '207R00000X', // Internal Medicine
  '207RA0000X', // Internal Medicine - Adolescent Medicine
  '208D00000X', // General Practice
  '208000000X', // Pediatrics
  '2080A0000X', // Pediatrics - Adolescent Medicine
  '261QP2300X', // Primary Care Clinic/Center
  '261QF0400X', // Federally Qualified Health Center (FQHC)
  '261QR1300X', // Rural Health Clinic
  '261QC1500X', // Community Health Center
];

export class ClinicDataImportService {
  private processedNPIs = new Set<string>();
  private healthSystemCache = new Map<string, number>();
  private organizationCache = new Map<string, number>();
  
  async importFromNPPES(filePath: string, options: {
    limit?: number;
    stateFilter?: string[];
    skipExisting?: boolean;
  } = {}) {
    console.log('🏥 Starting NPPES data import...');
    
    const stats = {
      totalProcessed: 0,
      clinicsImported: 0,
      providersImported: 0,
      errors: 0,
      skipped: 0
    };

    return new Promise((resolve, reject) => {
      const stream = createReadStream(filePath)
        .pipe(csv())
        .on('data', async (row: NPPESProvider) => {
          if (options.limit && stats.totalProcessed >= options.limit) {
            stream.destroy();
            return;
          }

          stats.totalProcessed++;

          try {
            // Filter by state if specified
            if (options.stateFilter && !options.stateFilter.includes(row['Provider Business Practice Location Address State Name'])) {
              stats.skipped++;
              return;
            }

            // Check if it's a primary care provider
            if (!this.isPrimaryCareProvider(row)) {
              stats.skipped++;
              return;
            }

            // Skip if already processed
            if (this.processedNPIs.has(row.NPI)) {
              stats.skipped++;
              return;
            }

            // Process based on entity type
            if (row['Entity Type Code'] === '2') {
              // Organization
              await this.importOrganization(row);
              stats.clinicsImported++;
            } else {
              // Individual provider - we'll handle these separately
              stats.providersImported++;
            }

            this.processedNPIs.add(row.NPI);

            if (stats.totalProcessed % 1000 === 0) {
              console.log(`📊 Progress: ${stats.totalProcessed} processed, ${stats.clinicsImported} clinics imported`);
            }
          } catch (error) {
            console.error(`Error processing NPI ${row.NPI}:`, error);
            stats.errors++;
          }
        })
        .on('end', () => {
          console.log('✅ NPPES import completed:', stats);
          resolve(stats);
        })
        .on('error', reject);
    });
  }

  private isPrimaryCareProvider(row: NPPESProvider): boolean {
    return PRIMARY_CARE_TAXONOMIES.includes(row['Healthcare Provider Taxonomy Code_1']);
  }

  private async importOrganization(row: NPPESProvider) {
    // Determine if this is part of a larger health system
    const healthSystemInfo = this.extractHealthSystemInfo(row);
    
    let healthSystemId: number | null = null;
    if (healthSystemInfo) {
      healthSystemId = await this.getOrCreateHealthSystem(healthSystemInfo);
    }

    // Create the location
    const locationData: InsertLocation = {
      healthSystemId: healthSystemId,
      organizationId: null, // We're flattening the hierarchy for now
      name: row['Provider Organization Name (Legal Business Name)'],
      shortName: this.generateShortName(row['Provider Organization Name (Legal Business Name)']),
      locationType: this.determineLocationType(row),
      address: row['Provider First Line Business Practice Location Address'],
      city: row['Provider Business Practice Location Address City Name'],
      state: row['Provider Business Practice Location Address State Name'],
      zipCode: row['Provider Business Practice Location Address Postal Code'].substring(0, 5),
      phone: this.formatPhone(row['Provider Business Practice Location Address Telephone Number']),
      fax: this.formatPhone(row['Provider Business Practice Location Address Fax Number']),
      npi: row.NPI,
      facilityCode: row.NPI, // Using NPI as facility code
      services: this.extractServices(row),
      hasLab: false, // Conservative defaults
      hasImaging: false,
      hasPharmacy: false,
      active: true
    };

    try {
      await db.insert(locations).values(locationData);
    } catch (error: any) {
      if (error.code === '23505') { // Duplicate key
        // Location already exists, skip
        return;
      }
      throw error;
    }
  }

  private extractHealthSystemInfo(row: NPPESProvider): { name: string; shortName: string } | null {
    const orgName = row['Provider Organization Name (Legal Business Name)'].toUpperCase();
    
    // Known health system patterns
    const healthSystemPatterns = [
      { pattern: /KAISER\s+PERMANENTE/i, name: 'Kaiser Permanente', shortName: 'Kaiser' },
      { pattern: /ASCENSION/i, name: 'Ascension Health', shortName: 'Ascension' },
      { pattern: /HCA\s+HEALTHCARE/i, name: 'HCA Healthcare', shortName: 'HCA' },
      { pattern: /COMMONSPIRIT/i, name: 'CommonSpirit Health', shortName: 'CommonSpirit' },
      { pattern: /TRINITY\s+HEALTH/i, name: 'Trinity Health', shortName: 'Trinity' },
      { pattern: /ADVOCATE\s+AURORA/i, name: 'Advocate Aurora Health', shortName: 'Advocate' },
      { pattern: /BAYLOR\s+SCOTT/i, name: 'Baylor Scott & White Health', shortName: 'BSW' },
      { pattern: /PROVIDENCE/i, name: 'Providence Health', shortName: 'Providence' },
      { pattern: /SUTTER\s+HEALTH/i, name: 'Sutter Health', shortName: 'Sutter' },
      { pattern: /MAYO\s+CLINIC/i, name: 'Mayo Clinic', shortName: 'Mayo' },
    ];

    for (const { pattern, name, shortName } of healthSystemPatterns) {
      if (pattern.test(orgName)) {
        return { name, shortName };
      }
    }

    // Check for parent organization
    if (row['Parent Organization LBN']) {
      return {
        name: row['Parent Organization LBN'],
        shortName: this.generateShortName(row['Parent Organization LBN'])
      };
    }

    return null;
  }

  private async getOrCreateHealthSystem(info: { name: string; shortName: string }): Promise<number> {
    // Check cache first
    if (this.healthSystemCache.has(info.name)) {
      return this.healthSystemCache.get(info.name)!;
    }

    // Check database
    const existing = await db.select()
      .from(healthSystems)
      .where(eq(healthSystems.name, info.name))
      .limit(1);

    if (Array.isArray(existing) && existing.length > 0) {
      this.healthSystemCache.set(info.name, existing[0].id);
      return existing[0].id;
    }

    // Create new health system
    const newHealthSystem: InsertHealthSystem = {
      name: info.name,
      shortName: info.shortName,
      systemType: 'multi_location_practice',
      taxId: null,
      npi: null,
      active: true,
      subscriptionTier: 2, // Default to small group practice
      subscriptionStatus: 'pending',
    };

    const [created] = await db.insert(healthSystems)
      .values([newHealthSystem])
      .returning();

    this.healthSystemCache.set(info.name, created.id);
    return created.id;
  }

  private generateShortName(fullName: string): string {
    // Remove common suffixes
    let name = fullName
      .replace(/\b(LLC|INC|CORP|CORPORATION|COMPANY|CO|LTD|LP|LLP|PA|PC|PLLC|PLC)\b/gi, '')
      .replace(/[,.\-]/g, ' ')
      .trim();

    // Take first few words or initials
    const words = name.split(/\s+/).filter(w => w.length > 0);
    
    if (words.length <= 2) {
      return words.join(' ');
    }

    // Create acronym for longer names
    return words
      .filter(w => !['THE', 'OF', 'AND', 'FOR', 'AT'].includes(w.toUpperCase()))
      .map(w => w[0])
      .join('')
      .toUpperCase()
      .substring(0, 10);
  }

  private determineLocationType(row: NPPESProvider): string {
    const taxonomyCode = row['Healthcare Provider Taxonomy Code_1'];
    const orgName = row['Provider Organization Name (Legal Business Name)'].toUpperCase();

    if (taxonomyCode === '261QF0400X') return 'fqhc';
    if (taxonomyCode === '261QR1300X') return 'rural_health';
    if (taxonomyCode === '261QC1500X') return 'community_health';
    
    if (orgName.includes('URGENT') || orgName.includes('WALK-IN')) return 'urgent_care';
    if (orgName.includes('HOSPITAL')) return 'hospital';
    if (orgName.includes('SPECIALTY')) return 'specialty_center';
    
    return 'clinic';
  }

  private formatPhone(phone: string): string | null {
    if (!phone) return null;
    
    // Remove all non-digits
    const digits = phone.replace(/\D/g, '');
    
    if (digits.length === 10) {
      return `${digits.substring(0, 3)}-${digits.substring(3, 6)}-${digits.substring(6)}`;
    }
    
    return phone;
  }

  private extractServices(row: NPPESProvider): string[] {
    const services: string[] = ['primary_care'];
    const taxonomyCode = row['Healthcare Provider Taxonomy Code_1'];
    
    if (taxonomyCode === '208000000X' || taxonomyCode === '2080A0000X') {
      services.push('pediatrics');
    }
    
    if (taxonomyCode === '207RA0000X' || taxonomyCode === '2080A0000X') {
      services.push('adolescent_medicine');
    }
    
    return services;
  }

  // Import HRSA Health Centers (FQHCs)
  async importHRSAHealthCenters() {
    console.log('🏥 Importing HRSA Health Centers...');
    
    // This would connect to HRSA API
    // For now, we'll create a few examples
    const exampleFQHCs = [
      {
        name: 'Community Health Center of Central Texas',
        address: '123 Main Street',
        city: 'Austin',
        state: 'TX',
        zip: '78701',
        phone: '512-555-0100'
      },
      {
        name: 'Valley Community Health Center',
        address: '456 Health Plaza',
        city: 'McAllen',
        state: 'TX',
        zip: '78501',
        phone: '956-555-0200'
      }
    ];

    for (const fqhc of exampleFQHCs) {
      const locationData: InsertLocation = {
        healthSystemId: null,
        organizationId: null,
        name: fqhc.name,
        shortName: this.generateShortName(fqhc.name),
        locationType: 'fqhc',
        address: fqhc.address,
        city: fqhc.city,
        state: fqhc.state,
        zipCode: fqhc.zip,
        phone: fqhc.phone,
        services: ['primary_care', 'behavioral_health', 'dental', 'pharmacy'],
        hasLab: true,
        hasImaging: false,
        hasPharmacy: true,
        active: true
      };

      try {
        await db.insert(locations).values(locationData);
      } catch (error: any) {
        if (error.code !== '23505') { // Ignore duplicates
          console.error('Error inserting FQHC:', error);
        }
      }
    }
  }
}

// Export the service for use in other modules