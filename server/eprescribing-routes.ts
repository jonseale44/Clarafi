import { Router, Request, Response, NextFunction } from 'express';
import { tenantIsolation } from './tenant-isolation.js';
import { ElectronicSignatureService } from './electronic-signature-service.js';
import { PharmacyIntelligenceService } from './pharmacy-intelligence-service.js';
import { PrescriptionTransmissionService } from './prescription-transmission-service.js';
import { db } from './db.js';
import { medications, orders, pharmacies, prescriptionTransmissions, electronicSignatures, patients } from '../shared/schema.js';
import { eq, and, desc } from 'drizzle-orm';
import OpenAI from 'openai';

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
    const { pharmacyId, requirements } = req.body;

    const validation = await pharmacyService.validatePharmacyCapability(
      pharmacyId,
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

export { router as eprescribingRoutes };