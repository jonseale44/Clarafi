import { Router, Request, Response, NextFunction } from 'express';
import { tenantIsolation } from './tenant-isolation.js';
import { ElectronicSignatureService } from './electronic-signature-service.js';
import { PharmacyIntelligenceService } from './pharmacy-intelligence-service.js';
import { PrescriptionTransmissionService } from './prescription-transmission-service.js';
import { db } from './db.js';
import { medications, orders, pharmacies, prescriptionTransmissions, electronicSignatures, patients, users } from '../shared/schema.js';
import { eq, and, desc, sql } from 'drizzle-orm';
import OpenAI from 'openai';
import { PrescriptionPdfService } from './prescription-pdf-service.js';
import { twilioFaxService } from './twilio-fax-service.js';
import { npiRegistryService } from './npi-registry-service.js';
import { pharmacyService } from './pharmacy-validation-service.js';

// Middleware to ensure user is authenticated
const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

const router = Router();
const signatureService = new ElectronicSignatureService();
const pharmacyService = new PharmacyIntelligenceService();
const transmissionService = new PrescriptionTransmissionService();

// Create electronic signature
router.post('/api/eprescribing/signature', requireAuth, tenantIsolation, async (req, res) => {
  try {
    console.log('📝 [EPrescribing] Creating electronic signature');
    
    const {
      encounterId,
      signatureType,
      signatureData,
      authenticationMethod,
      twoFactorUsed,
      medicationIds,
      deaSignature
    } = req.body;

    // Validate required fields
    if (!signatureType || !signatureData || !authenticationMethod) {
      return res.status(400).json({ 
        error: 'Missing required fields: signatureType, signatureData, authenticationMethod' 
      });
    }

    // Create signature
    const signature = await signatureService.createSignature({
      userId: req.user!.id,
      encounterId,
      signatureType,
      signatureData,
      authenticationMethod,
      twoFactorUsed,
      deaSignature,
      medicationIds,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.json({ success: true, signatureId: signature.id });
  } catch (error) {
    console.error('❌ [EPrescribing] Error creating signature:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to create signature' 
    });
  }
});

// Get recent valid signature
router.get('/api/eprescribing/signature/recent', requireAuth, async (req, res) => {
  try {
    const deaRequired = req.query.dea === 'true';
    
    const signature = await signatureService.getRecentSignature(
      req.user!.id,
      deaRequired
    );

    if (!signature) {
      return res.status(404).json({ error: 'No valid signature found' });
    }

    res.json(signature);
  } catch (error) {
    console.error('❌ [EPrescribing] Error getting recent signature:', error);
    res.status(500).json({ error: 'Failed to get signature' });
  }
});

// Select best pharmacy for prescription
router.post('/api/eprescribing/pharmacy/select', requireAuth, tenantIsolation, async (req, res) => {
  try {
    console.log('🏥 [EPrescribing] Selecting best pharmacy');
    
    const {
      patientId,
      medicationIds,
      preferredPharmacyId,
      requiresCompounding,
      isControlled,
      urgency,
      patientLocation
    } = req.body;

    // Validate patient belongs to health system
    const [patient] = await db.select()
      .from(patients)
      .where(and(
        eq(patients.id, patientId),
        eq(patients.healthSystemId, req.userHealthSystemId!)
      ));

    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    // Select pharmacy
    const selection = await pharmacyService.selectBestPharmacy({
      patientId,
      medicationIds,
      preferredPharmacyId,
      requiresCompounding,
      isControlled,
      urgency,
      patientLocation
    });

    res.json({
      pharmacy: selection.pharmacy,
      reasoning: selection.reasoning,
      confidence: selection.confidence,
      alternatives: selection.alternatives
    });
  } catch (error) {
    console.error('❌ [EPrescribing] Error selecting pharmacy:', error);
    res.status(500).json({ error: 'Failed to select pharmacy' });
  }
});

// Validate pharmacy capability
router.post('/api/eprescribing/pharmacy/validate', requireAuth, async (req, res) => {
  try {
    console.log('✅ [EPrescribing] Validating pharmacy capability');
    const { pharmacyId, requirements } = req.body;

    // For Google Places pharmacies (string IDs starting with ChI...), assume basic capabilities
    if (typeof pharmacyId === 'string' && !pharmacyId.match(/^\d+$/)) {
      console.log('🌐 [EPrescribing] Google Places pharmacy - assuming basic capabilities');
      return res.json({
        canFill: true,
        issues: [],
        recommendations: []
      });
    }

    // Convert to number for database pharmacies
    const numericPharmacyId = typeof pharmacyId === 'string' ? parseInt(pharmacyId, 10) : pharmacyId;
    
    if (isNaN(numericPharmacyId)) {
      return res.status(400).json({ error: 'Invalid pharmacy ID' });
    }

    const validation = await pharmacyService.validatePharmacyCapability(
      numericPharmacyId,
      requirements
    );

    res.json(validation);
  } catch (error) {
    console.error('❌ [EPrescribing] Error validating pharmacy:', error);
    res.status(500).json({ error: 'Failed to validate pharmacy' });
  }
});

// Search pharmacies - using Google Places API as primary source
router.get('/api/eprescribing/pharmacy/search', requireAuth, tenantIsolation, async (req, res) => {
  try {
    const { query = '', city, state, lat, lng } = req.query;
    console.log('🔍 [Pharmacy Search] Request:', { query, city, state, lat, lng });

    // First try Google Places API
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    
    if (apiKey) {
      console.log('🔍 [Pharmacy Search] Using Google Places API');
      
      let googleResults = [];
      
      if (query) {
        // Text search for pharmacies
        const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json`;
        const params = new URLSearchParams({
          key: apiKey,
          query: `${query} pharmacy`,
          type: 'pharmacy'
        });
        
        try {
          const response = await fetch(`${searchUrl}?${params}`);
          const data = await response.json();
          
          if (data.status === 'OK' && data.results) {
            googleResults = data.results;
          }
        } catch (error) {
          console.error('❌ [Pharmacy Search] Google Places API error:', error);
        }
      } else if (lat && lng) {
        // Nearby search for pharmacies
        const nearbyUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json`;
        const params = new URLSearchParams({
          key: apiKey,
          location: `${lat},${lng}`,
          radius: '5000', // 5km radius
          type: 'pharmacy'
        });
        
        try {
          const response = await fetch(`${nearbyUrl}?${params}`);
          const data = await response.json();
          
          if (data.status === 'OK' && data.results) {
            googleResults = data.results;
          }
        } catch (error) {
          console.error('❌ [Pharmacy Search] Google Places API error:', error);
        }
      }
      
      // Transform Google Places results to our pharmacy format
      if (googleResults.length > 0) {
        const transformedPharmacies = googleResults.map(place => ({
          id: place.place_id, // Use place_id as unique identifier
          name: place.name,
          address: place.vicinity || place.formatted_address?.split(',')[0] || '',
          city: place.formatted_address?.split(',')[1]?.trim() || city || 'Unknown',
          state: place.formatted_address?.split(',')[2]?.trim()?.split(' ')[0] || state || 'TX',
          zipCode: place.formatted_address?.match(/\d{5}/)?.[0] || '00000',
          phone: place.formatted_phone_number || '',
          pharmacyType: 'retail',
          acceptsEprescribe: true, // Most modern pharmacies accept e-prescribe
          acceptsControlled: place.types?.includes('pharmacy'), // Assume true pharmacies can handle controlled
          acceptsCompounding: place.name?.toLowerCase().includes('compound') || false,
          hours: place.opening_hours?.weekday_text?.join(', ') || 'Hours not available',
          active: true,
          ncpdpId: null, // Google Places doesn't provide NCPDP ID
          distance: undefined // Will be calculated client-side if needed
        }));
        
        console.log(`✅ [Pharmacy Search] Found ${transformedPharmacies.length} pharmacies via Google Places`);
        return res.json(transformedPharmacies);
      }
    }
    
    // Fallback: Check local database
    console.log('⚠️ [Pharmacy Search] Google Places API not available or no results, checking local database');
    
    let pharmacyQuery = db.select()
      .from(pharmacies)
      .where(eq(pharmacies.status, 'active'))
      .limit(20);

    // Add filters if provided
    if (query) {
      pharmacyQuery = pharmacyQuery.where(
        pharmacies.name as any,
        'ilike',
        `%${query}%`
      );
    }

    const results = await pharmacyQuery;
    
    // If no local pharmacies either, return mock data for development
    if (results.length === 0) {
      console.log('🔍 [Pharmacy Search] No local pharmacies, returning mock data');
      const mockPharmacies = [
        {
          id: 'mock-cvs-1',
          name: 'CVS Pharmacy',
          address: '123 Main Street',
          city: 'Waco',
          state: 'TX',
          zipCode: '76701',
          phone: '(254) 555-0100',
          pharmacyType: 'retail',
          acceptsEprescribe: true,
          acceptsControlled: true,
          acceptsCompounding: false,
          hours: 'Mon-Fri: 9AM-9PM, Sat: 9AM-6PM, Sun: 10AM-5PM',
          active: true,
          ncpdpId: null
        },
        {
          id: 'mock-walgreens-1',
          name: 'Walgreens',
          address: '456 Oak Avenue',
          city: 'Waco',
          state: 'TX',
          zipCode: '76702',
          phone: '(254) 555-0200',
          pharmacyType: 'retail',
          acceptsEprescribe: true,
          acceptsControlled: true,
          acceptsCompounding: false,
          hours: 'Mon-Sun: 8AM-10PM',
          active: true,
          ncpdpId: null
        },
        {
          id: 'mock-heb-1',
          name: 'HEB Pharmacy',
          address: '789 Valley Mills Dr',
          city: 'Waco',
          state: 'TX',
          zipCode: '76710',
          phone: '(254) 555-0300',
          pharmacyType: 'retail',
          acceptsEprescribe: true,
          acceptsControlled: false,
          acceptsCompounding: false,
          hours: 'Mon-Sat: 8AM-9PM, Sun: 9AM-7PM',
          active: true,
          ncpdpId: null
        }
      ];
      return res.json(mockPharmacies);
    }
    
    res.json(results);
  } catch (error) {
    console.error('❌ [EPrescribing] Error searching pharmacies:', error);
    res.status(500).json({ error: 'Failed to search pharmacies' });
  }
});

// Save Google Places pharmacy to database
router.post('/api/eprescribing/pharmacies/save-google-place', requireAuth, tenantIsolation, async (req, res) => {
  try {
    console.log('💾 [EPrescribing] Saving Google Places pharmacy to database');
    
    const { placeId } = req.body;
    if (!placeId) {
      return res.status(400).json({ error: 'Place ID is required' });
    }
    
    // First check if this pharmacy already exists in our database
    const existing = await db.select()
      .from(pharmacies)
      .where(eq(pharmacies.googlePlaceId, placeId))
      .limit(1);
      
    if (existing.length > 0) {
      console.log('✅ [EPrescribing] Pharmacy already exists in database:', existing[0].id);
      return res.json({ pharmacy: existing[0] });
    }
    
    // Fetch details from Google Places
    const placesApiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!placesApiKey) {
      return res.status(500).json({ error: 'Google Places API key not configured' });
    }
    
    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_address,formatted_phone_number,opening_hours,types,geometry&key=${placesApiKey}`;
    const detailsResponse = await fetch(detailsUrl);
    const detailsData = await detailsResponse.json();
    
    if (!detailsData.result) {
      return res.status(404).json({ error: 'Pharmacy not found' });
    }
    
    const place = detailsData.result;
    
    // Parse address components from formatted address
    const addressParts = place.formatted_address.split(',').map(part => part.trim());
    const stateZipMatch = addressParts[addressParts.length - 2]?.match(/([A-Z]{2})\s+(\d{5})/);
    
    // Use GPT to enrich pharmacy data
    const enrichmentPrompt = `
      Analyze this pharmacy information and provide enriched data:
      
      Name: ${place.name}
      Address: ${place.formatted_address}
      Phone: ${place.formatted_phone_number || 'Not available'}
      Hours: ${place.opening_hours?.weekday_text?.join(', ') || 'Not available'}
      
      Determine:
      1. Pharmacy type (retail, hospital, specialty, compounding, mail-order)
      2. If it's a chain pharmacy, identify the chain
      3. Parse operating hours into a standardized format
      4. Extract city, state, and zip code from the address
      5. Identify any special services based on the name (24-hour, compounding, etc.)
      
      Return as JSON with fields:
      {
        "pharmacyType": "retail|hospital|specialty|compounding|mail-order",
        "chainName": "CVS|Walgreens|HEB|etc or null",
        "parsedHours": "human-readable hours string",
        "city": "city name",
        "state": "2-letter state code",
        "zipCode": "5-digit zip",
        "acceptsCompounding": boolean,
        "is24Hour": boolean
      }
    `;
    
    let enrichedData = {
      pharmacyType: 'retail',
      chainName: null,
      parsedHours: place.opening_hours?.weekday_text?.join(', ') || 'Hours not available',
      city: addressParts[addressParts.length - 3] || '',
      state: stateZipMatch?.[1] || '',
      zipCode: stateZipMatch?.[2] || '',
      acceptsCompounding: false,
      is24Hour: false
    };
    
    try {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const enrichmentResponse = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: enrichmentPrompt }],
        response_format: { type: 'json_object' },
        temperature: 0
      });
      
      if (enrichmentResponse.choices[0]?.message?.content) {
        enrichedData = JSON.parse(enrichmentResponse.choices[0].message.content);
      }
    } catch (error) {
      console.error('⚠️ [EPrescribing] GPT enrichment failed, using basic parsing:', error);
    }
    
    // Create pharmacy record
    const [newPharmacy] = await db.insert(pharmacies).values({
      healthSystemId: req.userHealthSystemId,
      name: place.name,
      address: addressParts[0] || place.formatted_address,
      city: enrichedData.city,
      state: enrichedData.state,
      zipCode: enrichedData.zipCode,
      phone: place.formatted_phone_number || null,
      fax: null,
      pharmacyType: enrichedData.pharmacyType,
      chainAffiliation: enrichedData.chainName,
      acceptsEprescribe: true, // Most modern pharmacies accept e-prescribing
      acceptsControlled: enrichedData.chainName ? true : false, // Major chains usually accept controlled
      acceptsCompounding: enrichedData.acceptsCompounding,
      preferredForControlled: false,
      hours: enrichedData.parsedHours,
      googlePlaceId: placeId,
      latitude: place.geometry?.location?.lat || null,
      longitude: place.geometry?.location?.lng || null,
      ncpdpId: null, // Will need to be added later for actual e-prescribing
      npi: null,
      status: 'active'
    }).returning();
    
    console.log('✅ [EPrescribing] Saved new pharmacy:', newPharmacy[0].id);
    res.json({ pharmacy: newPharmacy[0] });
    
  } catch (error) {
    console.error('❌ [EPrescribing] Error saving pharmacy:', error);
    res.status(500).json({ error: 'Failed to save pharmacy' });
  }
});

// Get pharmacy details by ID
router.get('/api/eprescribing/pharmacies/:id', requireAuth, tenantIsolation, async (req, res) => {
  try {
    const pharmacyId = parseInt(req.params.id);
    console.log('🔍 [EPrescribing] Fetching pharmacy details:', pharmacyId);
    
    const [pharmacy] = await db.select()
      .from(pharmacies)
      .where(eq(pharmacies.id, pharmacyId))
      .limit(1);
      
    if (!pharmacy) {
      return res.status(404).json({ error: 'Pharmacy not found' });
    }
    
    res.json(pharmacy);
  } catch (error) {
    console.error('❌ [EPrescribing] Error fetching pharmacy:', error);
    res.status(500).json({ error: 'Failed to fetch pharmacy' });
  }
});

// Update pharmacy fax number
router.put('/api/eprescribing/pharmacies/:id/fax', requireAuth, tenantIsolation, async (req, res) => {
  try {
    const pharmacyId = parseInt(req.params.id);
    const { fax } = req.body;
    
    console.log('📠 [EPrescribing] Updating pharmacy fax number:', pharmacyId, fax);
    
    // Verify pharmacy exists and belongs to health system
    const [existingPharmacy] = await db.select()
      .from(pharmacies)
      .where(and(
        eq(pharmacies.id, pharmacyId),
        eq(pharmacies.healthSystemId, req.userHealthSystemId!)
      ))
      .limit(1);
      
    if (!existingPharmacy) {
      return res.status(404).json({ error: 'Pharmacy not found' });
    }
    
    // Update fax number
    const [updatedPharmacy] = await db.update(pharmacies)
      .set({ fax })
      .where(eq(pharmacies.id, pharmacyId))
      .returning();
    
    console.log('✅ [EPrescribing] Updated pharmacy fax number');
    res.json(updatedPharmacy);
  } catch (error) {
    console.error('❌ [EPrescribing] Error updating pharmacy fax:', error);
    res.status(500).json({ error: 'Failed to update pharmacy fax number' });
  }
});

// Search pharmacies with fax numbers from both local DB and NPI Registry
router.get('/api/eprescribing/pharmacies/search', requireAuth, tenantIsolation, async (req, res) => {
  try {
    const { name, city, state, postalCode, limit = 20 } = req.query;
    
    console.log('🔍 [EPrescribing] Searching pharmacies:', { name, city, state, postalCode });
    
    // Search local database first
    let localResults = await db.select()
      .from(pharmacies)
      .where(and(
        eq(pharmacies.healthSystemId, req.userHealthSystemId!),
        eq(pharmacies.status, 'active')
      ))
      .limit(Number(limit));
    
    // Filter by search criteria if provided
    if (name) {
      localResults = localResults.filter(p => 
        p.name.toLowerCase().includes(String(name).toLowerCase())
      );
    }
    if (city) {
      localResults = localResults.filter(p => 
        p.city?.toLowerCase() === String(city).toLowerCase()
      );
    }
    if (state) {
      localResults = localResults.filter(p => 
        p.state?.toLowerCase() === String(state).toLowerCase()
      );
    }
    
    // If we have enough results with fax numbers, return them
    const resultsWithFax = localResults.filter(p => p.fax);
    if (resultsWithFax.length >= 5) {
      console.log(`✅ [EPrescribing] Found ${resultsWithFax.length} pharmacies with fax numbers`);
      return res.json(resultsWithFax);
    }
    
    // Otherwise, search NPI Registry for additional pharmacies
    console.log('🔍 [EPrescribing] Searching NPI Registry for additional pharmacies');
    const npiResults = await npiRegistryService.searchPharmacies({
      name: name as string,
      city: city as string,
      state: state as string,
      postalCode: postalCode as string,
      limit: 50
    });
    
    // Convert NPI results and add to our database if they have fax numbers
    const newPharmacies = [];
    for (const npiResult of npiResults) {
      const pharmacy = npiRegistryService.convertToPharmacy(npiResult);
      if (pharmacy && pharmacy.fax) {
        // Check if this pharmacy already exists in our DB
        const existing = localResults.find(p => 
          p.npiNumber === pharmacy.npiNumber ||
          (p.name === pharmacy.name && p.address === pharmacy.address)
        );
        
        if (!existing) {
          // Add to our database
          const [newPharmacy] = await db.insert(pharmacies)
            .values({
              name: pharmacy.name,
              address: pharmacy.address,
              city: pharmacy.city,
              state: pharmacy.state,
              zipCode: pharmacy.zipCode,
              phone: pharmacy.phone,
              fax: pharmacy.fax,
              npiNumber: pharmacy.npiNumber,
              healthSystemId: req.userHealthSystemId!,
              source: 'npi_registry',
              status: 'active'
            })
            .returning();
          
          newPharmacies.push(newPharmacy);
        }
      }
    }
    
    // Combine local and new results
    const allResults = [...localResults, ...newPharmacies];
    
    console.log(`✅ [EPrescribing] Found ${allResults.length} total pharmacies (${newPharmacies.length} from NPI)`);
    res.json(allResults);
  } catch (error) {
    console.error('❌ [EPrescribing] Search error:', error);
    res.status(500).json({ error: 'Failed to search pharmacies' });
  }
});

// Transmit prescription
router.post('/api/eprescribing/transmit', requireAuth, tenantIsolation, async (req, res) => {
  try {
    console.log('📤 [EPrescribing] Transmitting prescription');
    
    const {
      medicationId,
      orderId,
      pharmacyId,
      transmissionMethod,
      electronicSignatureId,
      urgency
    } = req.body;

    // Validate medication and order belong to health system
    const [medication] = await db.select()
      .from(medications)
      .innerJoin(orders, eq(medications.orderId, orders.id))
      .innerJoin(patients, eq(orders.patientId, patients.id))
      .where(and(
        eq(medications.id, medicationId),
        eq(orders.id, orderId),
        eq(patients.healthSystemId, req.userHealthSystemId!)
      ));

    if (!medication) {
      return res.status(404).json({ error: 'Medication or order not found' });
    }

    // Transmit prescription
    const transmission = await transmissionService.transmitPrescription({
      medicationId,
      orderId,
      providerId: req.user!.id,
      pharmacyId,
      transmissionMethod,
      electronicSignatureId,
      urgency
    });

    res.json({
      success: true,
      transmissionId: transmission.id,
      status: transmission.transmissionStatus
    });
  } catch (error) {
    console.error('❌ [EPrescribing] Error transmitting prescription:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to transmit prescription' 
    });
  }
});

// Fax status callback endpoint for Twilio
router.post('/api/eprescribing/fax-status', async (req, res) => {
  try {
    console.log('📠 [EPrescribing] Received fax status callback:', req.body);
    
    const {
      FaxSid,
      Status,
      ErrorCode,
      ErrorMessage,
      From,
      To,
      NumPages,
      Duration,
      Direction
    } = req.body;
    
    // Find transmission by fax SID using SQL JSON operators
    const transmissions = await db.select()
      .from(prescriptionTransmissions)
      .where(sql`${prescriptionTransmissions.transmissionMetadata}->>'faxSid' = ${FaxSid}`);
      
    const transmission = transmissions[0];
      
    if (transmission) {
      const metadata = transmission.transmissionMetadata as any || {};
      
      // Update transmission status based on Twilio status
      const updateData: any = {
        transmissionMetadata: {
          ...metadata,
          faxStatus: Status,
          faxNumPages: NumPages,
          faxDuration: Duration,
          faxDirection: Direction,
          lastStatusUpdate: new Date().toISOString()
        }
      };
      
      if (Status === 'delivered') {
        updateData.transmissionStatus = 'transmitted';
        updateData.transmittedAt = new Date();
        console.log(`✅ [EPrescribing] Fax ${FaxSid} delivered successfully`);
      } else if (Status === 'failed' || Status === 'no-answer' || Status === 'busy') {
        updateData.transmissionStatus = 'failed';
        updateData.errorMessage = ErrorMessage || `Fax failed with status: ${Status}`;
        if (ErrorCode) {
          updateData.transmissionMetadata.faxErrorCode = ErrorCode;
        }
        console.error(`❌ [EPrescribing] Fax ${FaxSid} failed: ${Status} - ${ErrorMessage}`);
      }
      
      await db.update(prescriptionTransmissions)
        .set(updateData)
        .where(eq(prescriptionTransmissions.id, transmission.id));
    } else {
      console.warn(`⚠️ [EPrescribing] No transmission found for fax SID: ${FaxSid}`);
    }
    
    // Always respond with 200 OK to acknowledge receipt
    res.sendStatus(200);
  } catch (error) {
    console.error('❌ [EPrescribing] Error processing fax status callback:', error);
    // Still respond with 200 to avoid Twilio retries
    res.sendStatus(200);
  }
});

// Get transmission history
router.get('/api/eprescribing/transmissions/:patientId', requireAuth, tenantIsolation, async (req, res) => {
  try {
    const patientId = parseInt(req.params.patientId);

    // Validate patient belongs to health system
    const [patient] = await db.select()
      .from(patients)
      .where(and(
        eq(patients.id, patientId),
        eq(patients.healthSystemId, req.userHealthSystemId!)
      ));

    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const history = await transmissionService.getTransmissionHistory(patientId);
    res.json(history);
  } catch (error) {
    console.error('❌ [EPrescribing] Error getting transmission history:', error);
    res.status(500).json({ error: 'Failed to get transmission history' });
  }
});

// Retry failed transmission
router.post('/api/eprescribing/transmission/:transmissionId/retry', requireAuth, tenantIsolation, async (req, res) => {
  try {
    const transmissionId = parseInt(req.params.transmissionId);

    // Get the transmission record
    const [transmission] = await db.select()
      .from(prescriptionTransmissions)
      .where(eq(prescriptionTransmissions.id, transmissionId));

    if (!transmission) {
      return res.status(404).json({ error: 'Transmission not found' });
    }

    // Validate patient belongs to health system
    const [patient] = await db.select()
      .from(patients)
      .where(and(
        eq(patients.id, transmission.patientId),
        eq(patients.healthSystemId, req.userHealthSystemId!)
      ));

    if (!patient) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Only allow retry for failed transmissions
    if (transmission.transmissionStatus !== 'failed') {
      return res.status(400).json({ error: 'Can only retry failed transmissions' });
    }

    // Get medication and pharmacy data
    const [medication] = await db.select()
      .from(medications)
      .where(eq(medications.id, transmission.medicationId));

    const [pharmacy] = await db.select()
      .from(pharmacies)
      .where(eq(pharmacies.id, transmission.pharmacyId!));

    if (!medication || !pharmacy) {
      return res.status(400).json({ error: 'Missing medication or pharmacy data' });
    }

    // Retry the transmission based on the original method
    let result;
    if (transmission.transmissionMethod === 'electronic') {
      result = await transmissionService.transmitElectronic(medication, pharmacy, patient, req.user!);
    } else if (transmission.transmissionMethod === 'fax') {
      // Generate PDF and send fax
      const pdfBuffer = await transmissionService.generatePrescriptionPDF(medication, patient, req.user!);
      result = await transmissionService.transmitFax(medication, pharmacy, patient, req.user!, pdfBuffer);
    } else {
      return res.status(400).json({ error: 'Invalid transmission method for retry' });
    }

    // Update the transmission record with retry information
    await db.update(prescriptionTransmissions)
      .set({
        transmissionStatus: 'pending',
        transmissionMetadata: {
          ...transmission.transmissionMetadata as any,
          retryAttempt: ((transmission.transmissionMetadata as any)?.retryAttempt || 0) + 1,
          retryInitiatedAt: new Date().toISOString(),
          retryInitiatedBy: req.user!.username
        },
        updatedAt: new Date()
      })
      .where(eq(prescriptionTransmissions.id, transmissionId));

    res.json({ success: true, message: 'Transmission queued for retry' });
  } catch (error) {
    console.error('❌ [EPrescribing] Error retrying transmission:', error);
    res.status(500).json({ error: 'Failed to retry transmission' });
  }
});

// Get transmission status
router.get('/api/eprescribing/transmission/:id/status', requireAuth, async (req, res) => {
  try {
    const transmissionId = parseInt(req.params.id);

    const [transmission] = await db.select()
      .from(prescriptionTransmissions)
      .where(eq(prescriptionTransmissions.id, transmissionId));

    if (!transmission) {
      return res.status(404).json({ error: 'Transmission not found' });
    }

    res.json({
      id: transmission.id,
      status: transmission.transmissionStatus,
      method: transmission.transmissionMethod,
      transmittedAt: transmission.transmittedAt,
      errorMessage: transmission.errorMessage
    });
  } catch (error) {
    console.error('❌ [EPrescribing] Error getting transmission status:', error);
    res.status(500).json({ error: 'Failed to get transmission status' });
  }
});

// Process refill request
router.post('/api/eprescribing/refill', requireAuth, async (req, res) => {
  try {
    console.log('💊 [EPrescribing] Processing refill request');
    
    const {
      originalTransmissionId,
      pharmacyId,
      refillRequestData
    } = req.body;

    const result = await transmissionService.processRefillRequest({
      originalTransmissionId,
      pharmacyId,
      refillRequestData
    });

    res.json(result);
  } catch (error) {
    console.error('❌ [EPrescribing] Error processing refill:', error);
    res.status(500).json({ error: 'Failed to process refill request' });
  }
});

// Get pharmacies for dropdown
router.get('/api/eprescribing/pharmacies', requireAuth, tenantIsolation, async (req, res) => {
  try {
    // Get all active pharmacies - in production, this would be filtered by location
    const activePharmacies = await db.select()
      .from(pharmacies)
      .where(eq(pharmacies.status, 'active'))
      .orderBy(pharmacies.name)
      .limit(50);

    res.json(activePharmacies);
  } catch (error) {
    console.error('❌ [EPrescribing] Error getting pharmacies:', error);
    res.status(500).json({ error: 'Failed to get pharmacies' });
  }
});

// Get prescription PDF
router.get('/api/eprescribing/prescription-pdf/:transmissionId', requireAuth, tenantIsolation, async (req, res) => {
  try {
    const transmissionId = parseInt(req.params.transmissionId);
    console.log('📄 [EPrescribing] Retrieving prescription PDF for transmission:', transmissionId);
    
    // Get transmission record with all related data
    const [transmission] = await db.select({
      transmission: prescriptionTransmissions,
      medication: medications,
      order: orders,
      patient: patients
    })
    .from(prescriptionTransmissions)
    .innerJoin(medications, eq(prescriptionTransmissions.medicationId, medications.id))
    .innerJoin(orders, eq(medications.orderId, orders.id))
    .innerJoin(patients, eq(orders.patientId, patients.id))
    .where(and(
      eq(prescriptionTransmissions.id, transmissionId),
      eq(patients.healthSystemId, req.userHealthSystemId!)
    ));
    
    if (!transmission) {
      return res.status(404).json({ error: 'Transmission not found' });
    }
    
    // Check if PDF already exists in metadata
    const metadata = transmission.transmission.transmissionMetadata as any;
    if (metadata?.pdfData) {
      // Return existing PDF
      const pdfBuffer = Buffer.from(metadata.pdfData, 'base64');
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="prescription-${transmissionId}.pdf"`);
      return res.send(pdfBuffer);
    }
    
    // Generate PDF if it doesn't exist
    console.log('📄 [EPrescribing] Generating new PDF for transmission:', transmissionId);
    
    // Get provider and pharmacy data
    const [provider] = await db.select()
      .from(users)
      .where(eq(users.id, transmission.transmission.providerId));
      
    const [pharmacy] = await db.select()
      .from(pharmacies)
      .where(eq(pharmacies.id, transmission.transmission.pharmacyId!));
    
    // Prepare prescription data
    const prescriptionData = {
      prescriptionNumber: `RX-${transmission.transmission.id}`,
      date: transmission.transmission.transmittedAt?.toISOString() || new Date().toISOString(),
      patient: {
        name: `${transmission.patient.firstName} ${transmission.patient.lastName}`,
        dateOfBirth: transmission.patient.dateOfBirth,
        address: `${transmission.patient.address || ''}, ${transmission.patient.city || ''}, ${transmission.patient.state || ''} ${transmission.patient.zip || ''}`
      },
      prescriber: {
        name: `${provider.firstName} ${provider.lastName}, ${provider.credentials || ''}`,
        npi: provider.npi || undefined,
        licenseNumber: provider.licenseNumber || undefined,
        address: 'Clinic Address', // Would fetch from provider's location
        phone: transmission.patient.contactNumber || undefined
      },
      pharmacy: pharmacy ? {
        name: pharmacy.name,
        address: `${pharmacy.address}, ${pharmacy.city}, ${pharmacy.state} ${pharmacy.zipCode}`,
        phone: pharmacy.phone || undefined,
        fax: pharmacy.fax || undefined
      } : {
        name: 'Print for Patient',
        address: 'Patient will select pharmacy',
        phone: undefined,
        fax: undefined
      },
      medication: {
        name: transmission.medication.name,
        strength: transmission.medication.strength || undefined,
        form: transmission.medication.dosageForm || undefined,
        quantity: `${transmission.order.quantity} ${transmission.order.quantityUnit}`,
        sig: transmission.medication.sig,
        refills: transmission.order.refills || 0,
        daysSupply: transmission.order.daysSupply || 30,
        deaSchedule: transmission.medication.deaSchedule || undefined,
        genericSubstitution: transmission.order.substitutionAllowed !== false ? 'Permitted' : 'Dispense as Written'
      }
    };
    
    // Generate PDF
    const { PrescriptionPdfService } = await import('./prescription-pdf-service.js');
    const pdfBuffer = PrescriptionPdfService.generatePrescriptionPdf(prescriptionData);
    
    // Update transmission with PDF data
    await db.update(prescriptionTransmissions)
      .set({
        transmissionMetadata: {
          ...metadata,
          pdfData: pdfBuffer.toString('base64'),
          pdfGeneratedAt: new Date().toISOString()
        }
      })
      .where(eq(prescriptionTransmissions.id, transmissionId));
    
    // Return PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="prescription-${transmissionId}.pdf"`);
    res.send(pdfBuffer);
    
  } catch (error) {
    console.error('❌ [EPrescribing] Error retrieving prescription PDF:', error);
    res.status(500).json({ error: 'Failed to retrieve prescription PDF' });
  }
});

// Send prescription via fax
router.post('/api/eprescribing/transmit-fax', requireAuth, tenantIsolation, async (req, res) => {
  try {
    console.log('📠 [EPrescribing] Sending prescription via fax');
    
    const { transmissionId, faxNumber } = req.body;
    
    if (!transmissionId || !faxNumber) {
      return res.status(400).json({ error: 'Transmission ID and fax number are required' });
    }
    
    // Validate fax number format
    const cleanFaxNumber = faxNumber.replace(/\D/g, '');
    if (cleanFaxNumber.length !== 10 && cleanFaxNumber.length !== 11) {
      return res.status(400).json({ error: 'Invalid fax number format' });
    }
    
    // Get transmission with verification
    const [transmission] = await db.select()
      .from(prescriptionTransmissions)
      .innerJoin(medications, eq(prescriptionTransmissions.medicationId, medications.id))
      .innerJoin(orders, eq(medications.orderId, orders.id))
      .innerJoin(patients, eq(orders.patientId, patients.id))
      .where(and(
        eq(prescriptionTransmissions.id, transmissionId),
        eq(patients.healthSystemId, req.userHealthSystemId!)
      ));
      
    if (!transmission) {
      return res.status(404).json({ error: 'Transmission not found' });
    }
    
    // Check if transmission was already sent
    if (transmission.prescriptionTransmissions.transmissionStatus === 'transmitted' && 
        transmission.prescriptionTransmissions.transmissionMethod === 'fax') {
      return res.status(400).json({ error: 'Prescription already sent via fax' });
    }
    
    // Get PDF for the prescription
    console.log(`📠 [EPrescribing] Generating PDF for fax transmission`);
    
    // Get provider and pharmacy data for PDF generation
    const [provider] = await db.select()
      .from(users)
      .where(eq(users.id, transmission.orders.orderedBy!));
      
    const pdfService = new PrescriptionPDFService();
    const prescriptionData = {
      prescriptionNumber: `RX-${transmission.prescriptionTransmissions.id}`,
      date: new Date().toISOString(),
      patient: {
        name: `${transmission.patients.firstName} ${transmission.patients.lastName}`,
        dateOfBirth: transmission.patients.dateOfBirth,
        address: `${transmission.patients.address || ''}, ${transmission.patients.city || ''}, ${transmission.patients.state || ''} ${transmission.patients.zip || ''}`
      },
      prescriber: {
        name: `${provider.firstName} ${provider.lastName}, ${provider.credentials || ''}`,
        npi: provider.npi || undefined,
        licenseNumber: provider.licenseNumber || undefined,
        address: 'Clinic Address', // Would fetch from provider's location
        phone: transmission.patients.contactNumber || undefined
      },
      pharmacy: {
        name: 'Via Fax',
        address: 'See fax header',
        phone: undefined,
        fax: cleanFaxNumber
      },
      medication: {
        name: transmission.medications.name,
        strength: transmission.medications.strength || undefined,
        form: transmission.medications.dosageForm || undefined,
        sig: transmission.medications.instructions || '',
        quantity: transmission.medications.quantity || 0,
        refills: transmission.medications.refills || 0,
        genericSubstitution: !transmission.medications.brandRequired
      }
    };
    
    const pdfBuffer = await pdfService.generatePrescriptionPDF(prescriptionData);
    
    // Send fax using Twilio
    const faxResult = await twilioFaxService.sendFax({
      to: faxNumber,
      pdfBuffer,
      statusCallback: `${process.env.BASE_URL}/api/eprescribing/fax-status`
    });
    
    if (!faxResult.success) {
      return res.status(500).json({ error: faxResult.error || 'Failed to send fax' });
    }
    
    // Update transmission record
    await db.update(prescriptionTransmissions)
      .set({
        transmissionMethod: 'fax',
        transmissionStatus: 'transmitted',
        transmittedAt: new Date(),
        transmissionMetadata: {
          ...(transmission.prescriptionTransmissions.transmissionMetadata as any || {}),
          faxNumber: cleanFaxNumber,
          faxSentAt: new Date().toISOString(),
          faxStatus: 'sent',
          faxProvider: 'twilio',
          faxSid: faxResult.faxSid,
          pdfData: pdfBuffer.toString('base64') // Store PDF for reference
        }
      })
      .where(eq(prescriptionTransmissions.id, transmissionId));
    
    res.json({
      success: true,
      message: `Prescription faxed successfully to ${faxNumber}`,
      transmissionId
    });
    
  } catch (error) {
    console.error('❌ [EPrescribing] Error sending fax:', error);
    res.status(500).json({ error: 'Failed to send prescription via fax' });
  }
});

// Bulk import pharmacies from CSV
router.post('/api/eprescribing/pharmacies/import', requireAuth, tenantIsolation, async (req, res) => {
  try {
    const { pharmacies: pharmacyData } = req.body;
    
    if (!Array.isArray(pharmacyData)) {
      return res.status(400).json({ error: 'Invalid data format. Expected array of pharmacies.' });
    }
    
    console.log(`📥 [EPrescribing] Importing ${pharmacyData.length} pharmacies`);
    
    let imported = 0;
    let skipped = 0;
    let errors = 0;
    
    for (const pharmacy of pharmacyData) {
      try {
        // Validate required fields
        if (!pharmacy.name || !pharmacy.address || !pharmacy.fax) {
          skipped++;
          continue;
        }
        
        // Check if pharmacy already exists
        const existing = await db.select()
          .from(pharmacies)
          .where(and(
            eq(pharmacies.healthSystemId, req.userHealthSystemId!),
            eq(pharmacies.name, pharmacy.name),
            eq(pharmacies.address, pharmacy.address)
          ))
          .limit(1);
          
        if (existing.length > 0) {
          // Update fax if it's missing
          if (!existing[0].fax && pharmacy.fax) {
            await db.update(pharmacies)
              .set({ fax: pharmacy.fax })
              .where(eq(pharmacies.id, existing[0].id));
            imported++;
          } else {
            skipped++;
          }
        } else {
          // Insert new pharmacy
          await db.insert(pharmacies)
            .values({
              name: pharmacy.name,
              address: pharmacy.address,
              city: pharmacy.city || '',
              state: pharmacy.state || '',
              zipCode: pharmacy.zipCode || '',
              phone: pharmacy.phone || null,
              fax: pharmacy.fax,
              npiNumber: pharmacy.npiNumber || null,
              healthSystemId: req.userHealthSystemId!,
              source: pharmacy.source || 'csv_import',
              status: 'active'
            });
          imported++;
        }
      } catch (error) {
        console.error('❌ [EPrescribing] Error importing pharmacy:', error);
        errors++;
      }
    }
    
    console.log(`✅ [EPrescribing] Import complete: ${imported} imported, ${skipped} skipped, ${errors} errors`);
    res.json({
      success: true,
      imported,
      skipped,
      errors,
      total: pharmacyData.length
    });
  } catch (error) {
    console.error('❌ [EPrescribing] Import error:', error);
    res.status(500).json({ error: 'Failed to import pharmacies' });
  }
});

export { router as eprescribingRoutes };