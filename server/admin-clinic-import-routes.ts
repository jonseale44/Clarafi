import { Router } from 'express';
import { db } from './db';
import { healthSystems, locations } from '@shared/schema';
import { eq, like, or, and, sql } from 'drizzle-orm';
import { ClinicDataImportService } from './clinic-data-import-service';
import multer from 'multer';
import * as fs from 'fs';
import * as path from 'path';

const router = Router();
const upload = multer({ dest: 'uploads/nppes/' });

// Ensure only admins can access these routes
router.use((req, res, next) => {
  if (!req.isAuthenticated() || req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
});

// Get import statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = await db.select({
      healthSystems: sql<number>`count(distinct ${healthSystems.id})`,
      locations: sql<number>`count(distinct ${locations.id})`,
      primaryCareClinics: sql<number>`count(distinct ${locations.id}) filter (where ${locations.locationType} = 'clinic')`,
      fqhcs: sql<number>`count(distinct ${locations.id}) filter (where ${locations.locationType} = 'fqhc')`,
    })
    .from(locations)
    .leftJoin(healthSystems, eq(locations.healthSystemId, healthSystems.id));

    res.json(stats[0] || {
      healthSystems: 0,
      locations: 0,
      primaryCareClinics: 0,
      fqhcs: 0,
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Search facilities
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || typeof q !== 'string' || q.length < 3) {
      return res.json([]);
    }

    const searchTerm = `%${q}%`;
    const results = await db.select()
      .from(locations)
      .where(
        or(
          like(locations.name, searchTerm),
          like(locations.city, searchTerm),
          like(locations.npi, searchTerm),
        )
      )
      .limit(20);

    res.json(results);
  } catch (error) {
    console.error('Error searching facilities:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// Get recent import history
router.get('/recent', async (req, res) => {
  // For now, return empty array since we don't have an import history table yet
  res.json([]);
});

// Upload and process NPPES file
router.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    const importService = new ClinicDataImportService();
    
    // Start import in background
    setImmediate(async () => {
      try {
        await importService.importFromNPPES(req.file!.path, {
          limit: 5000, // Process first 5000 records
          stateFilter: ['TX'], // Start with Texas
          skipExisting: true,
        });
        
        // Clean up uploaded file
        fs.unlinkSync(req.file!.path);
      } catch (error) {
        console.error('Import error:', error);
      }
    });

    res.json({ 
      message: 'Import started',
      fileSize: req.file.size,
      fileName: req.file.originalname,
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to start import' });
  }
});

// Download sample NPPES data
router.get('/sample', async (req, res) => {
  try {
    // Create sample CSV data
    const sampleData = `NPI,Entity Type Code,Provider Organization Name (Legal Business Name),Provider Last Name (Legal Name),Provider First Name,Provider First Line Business Practice Location Address,Provider Second Line Business Practice Location Address,Provider Business Practice Location Address City Name,Provider Business Practice Location Address State Name,Provider Business Practice Location Address Postal Code,Provider Business Practice Location Address Telephone Number,Provider Business Practice Location Address Fax Number,Healthcare Provider Taxonomy Code_1,Healthcare Provider Taxonomy Group_1,Is Organization Subpart,Parent Organization LBN,Parent Organization TIN
1234567890,2,Austin Family Medicine Center,,,123 Main Street,,Austin,TX,78701,512-555-0100,512-555-0101,261QP2300X,Primary Care Clinic/Center,N,,
2345678901,2,Cedar Park Primary Care,,,456 Oak Avenue,,Cedar Park,TX,78613,512-555-0200,512-555-0201,207Q00000X,Family Medicine,N,,
3456789012,2,Round Rock Community Health Center,,,789 Health Plaza,,Round Rock,TX,78664,512-555-0300,512-555-0301,261QF0400X,Federally Qualified Health Center (FQHC),N,,
4567890123,2,Pflugerville Medical Associates,,,321 Medical Drive,,Pflugerville,TX,78660,512-555-0400,512-555-0401,207R00000X,Internal Medicine,N,,
5678901234,2,Georgetown Family Practice,,,654 Wellness Way,,Georgetown,TX,78626,512-555-0500,512-555-0501,207Q00000X,Family Medicine,N,,`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="nppes_sample.csv"');
    res.send(sampleData);
  } catch (error) {
    console.error('Error generating sample:', error);
    res.status(500).json({ error: 'Failed to generate sample' });
  }
});

// Quick import presets
router.post('/quick-import/:preset', async (req, res) => {
  const { preset } = req.params;
  const importService = new ClinicDataImportService();

  try {
    switch (preset) {
      case 'texas-primary-care':
        // Import sample Texas clinics
        await importSampleTexasClinics();
        break;
        
      case 'fqhcs':
        // Import HRSA health centers
        await importService.importHRSAHealthCenters();
        break;
        
      case 'major-health-systems':
        // Import major health systems
        await importMajorHealthSystems();
        break;
        
      default:
        return res.status(400).json({ error: 'Invalid preset' });
    }
    
    res.json({ message: `Import completed for ${preset}` });
  } catch (error) {
    console.error('Quick import error:', error);
    res.status(500).json({ error: 'Import failed' });
  }
});

// Helper function to import sample Texas clinics
async function importSampleTexasClinics() {
  const sampleClinics = [
    {
      name: 'Austin Regional Clinic - Far West',
      shortName: 'ARC Far West',
      address: '6811 Austin Center Blvd',
      city: 'Austin',
      state: 'TX',
      zipCode: '78731',
      phone: '512-346-6611',
      locationType: 'clinic' as const,
      services: ['primary_care', 'pediatrics'],
    },
    {
      name: 'Baylor Scott & White - Round Rock',
      shortName: 'BSW Round Rock',
      address: '300 University Blvd',
      city: 'Round Rock',
      state: 'TX',
      zipCode: '78665',
      phone: '512-509-0100',
      locationType: 'clinic' as const,
      services: ['primary_care', 'urgent_care'],
    },
    {
      name: 'Seton Family of Doctors - Kyle',
      shortName: 'Seton Kyle',
      address: '5103 Kyle Center Dr',
      city: 'Kyle',
      state: 'TX',
      zipCode: '78640',
      phone: '512-324-4870',
      locationType: 'clinic' as const,
      services: ['primary_care', 'pediatrics'],
    },
  ];

  // Get or create a health system for these clinics
  const [ascensionSystem] = await db.insert(healthSystems)
    .values({
      name: 'Ascension Texas',
      shortName: 'Ascension',
      systemType: 'multi_location_practice',
      active: true,
      subscriptionTier: 2,
      subscriptionStatus: 'active',
    })
    .onConflictDoNothing()
    .returning();

  for (const clinic of sampleClinics) {
    await db.insert(locations)
      .values({
        ...clinic,
        healthSystemId: ascensionSystem?.id || null,
        organizationId: null,
        npi: Math.floor(Math.random() * 9000000000 + 1000000000).toString(),
        facilityCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
        hasLab: false,
        hasImaging: false,
        hasPharmacy: false,
        active: true,
      })
      .onConflictDoNothing();
  }
}

// Helper function to import major health systems
async function importMajorHealthSystems() {
  const majorSystems = [
    {
      name: 'Kaiser Permanente',
      shortName: 'Kaiser',
      systemType: 'integrated_delivery_network' as const,
      subscriptionTier: 3,
    },
    {
      name: 'HCA Healthcare',
      shortName: 'HCA',
      systemType: 'hospital_system' as const,
      subscriptionTier: 3,
    },
    {
      name: 'CommonSpirit Health',
      shortName: 'CommonSpirit',
      systemType: 'integrated_delivery_network' as const,
      subscriptionTier: 3,
    },
  ];

  for (const system of majorSystems) {
    await db.insert(healthSystems)
      .values({
        ...system,
        active: true,
        subscriptionStatus: 'pending',
      })
      .onConflictDoNothing();
  }
}

export const adminClinicImportRoutes = router;