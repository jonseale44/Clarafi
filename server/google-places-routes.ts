import { Router } from "express";
import { config } from "dotenv";

config();

const router = Router();

// Calculate distance between two coordinates in miles
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959; // Radius of the Earth in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Real Google Places API integration for healthcare facilities
const searchPlaces = async (query: string, location?: { lat: number; lng: number }) => {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  
  if (!apiKey) {
    throw new Error('Google Places API key not configured');
  }

  try {
    // Use Places API Text Search with healthcare-specific types
    const baseUrl = 'https://maps.googleapis.com/maps/api/place/textsearch/json';
    const params = new URLSearchParams({
      query: `${query} clinic hospital medical center doctor`,
      type: 'health',
      key: apiKey,
      fields: 'place_id,name,formatted_address,geometry,types,formatted_phone_number,website,opening_hours'
    });

    // Add location bias if provided (prioritize nearby results)
    if (location) {
      params.append('location', `${location.lat},${location.lng}`);
      params.append('radius', '50000'); // 50km radius
    }

    // Focus on Texas for initial deployment
    params.append('region', 'us');

    const response = await fetch(`${baseUrl}?${params}`);
    const data = await response.json();

    if (data.status !== 'OK') {
      console.error('Google Places API error:', data.status, data.error_message);
      return [];
    }

    // Filter and format results for healthcare facilities
    return data.results
      .filter((place: any) => {
        const types = place.types || [];
        return types.some((type: string) => 
          ['hospital', 'doctor', 'health', 'physiotherapist', 'dentist'].includes(type)
        );
      })
      .map((place: any) => ({
        place_id: place.place_id,
        name: place.name,
        formatted_address: place.formatted_address,
        geometry: place.geometry,
        types: place.types,
        formatted_phone_number: place.formatted_phone_number,
        website: place.website,
        opening_hours: place.opening_hours,
        // Additional fields for our system
        place_details: {
          hours: place.opening_hours?.weekday_text?.join('; ') || 'Hours not available',
          rating: place.rating,
          user_ratings_total: place.user_ratings_total
        }
      }))
      .slice(0, 20); // Limit results

  } catch (error) {
    console.error('Error calling Google Places API:', error);
    return [];
  }
};

// Search for pharmacies using Google Places API
router.get("/api/places/search-pharmacies", async (req, res) => {
  try {
    const { query, lat, lng, radius = 10000 } = req.query;
    
    console.log("🔍 [Google Places] Searching for pharmacies:", { query, lat, lng, radius });

    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    
    if (!apiKey) {
      console.error("❌ [Google Places] GOOGLE_PLACES_API_KEY environment variable not found!");
      // Return mock pharmacies for development
      const mockPharmacies = [
        {
          place_id: "ChIJPharmacy001",
          name: "CVS Pharmacy",
          formatted_address: "123 Main Street, Waco, TX 76701",
          geometry: { location: { lat: 31.5493, lng: -97.1467 } },
          types: ["pharmacy", "health", "store"],
          formatted_phone_number: "(254) 555-0100",
          opening_hours: { weekday_text: ["Monday: 9:00 AM – 9:00 PM", "Tuesday: 9:00 AM – 9:00 PM"] }
        },
        {
          place_id: "ChIJPharmacy002",
          name: "Walgreens",
          formatted_address: "456 Oak Avenue, Waco, TX 76702",
          geometry: { location: { lat: 31.5593, lng: -97.1367 } },
          types: ["pharmacy", "health", "store"],
          formatted_phone_number: "(254) 555-0200",
          opening_hours: { weekday_text: ["Monday: 8:00 AM – 10:00 PM", "Tuesday: 8:00 AM – 10:00 PM"] }
        }
      ];
      
      return res.json({
        status: "OK",
        results: mockPharmacies
      });
    }
    
    // If searching by text query
    if (query) {
      const baseUrl = "https://maps.googleapis.com/maps/api/place/textsearch/json";
      const params = new URLSearchParams({
        key: apiKey,
        query: `${query} pharmacy`,
        type: "pharmacy"
      });

      const response = await fetch(`${baseUrl}?${params}`);
      const data = await response.json();
      
      if (data.status === "OK") {
        // Add distance calculation if user location provided
        if (lat && lng) {
          data.results = data.results.map(place => ({
            ...place,
            distance: calculateDistance(
              parseFloat(lat as string),
              parseFloat(lng as string),
              place.geometry.location.lat,
              place.geometry.location.lng
            )
          })).sort((a, b) => a.distance - b.distance);
        }
        
        console.log(`✅ [Google Places] Found ${data.results.length} pharmacies`);
        return res.json(data);
      }
    }
    // If searching by location (nearby search)
    else if (lat && lng) {
      const baseUrl = "https://maps.googleapis.com/maps/api/place/nearbysearch/json";
      const params = new URLSearchParams({
        key: apiKey,
        location: `${lat},${lng}`,
        radius: radius.toString(),
        type: "pharmacy"
      });

      const response = await fetch(`${baseUrl}?${params}`);
      const data = await response.json();
      
      if (data.status === "OK") {
        // Calculate distances
        data.results = data.results.map(place => ({
          ...place,
          distance: calculateDistance(
            parseFloat(lat as string),
            parseFloat(lng as string),
            place.geometry.location.lat,
            place.geometry.location.lng
          )
        })).sort((a, b) => a.distance - b.distance);
        
        console.log(`✅ [Google Places] Found ${data.results.length} nearby pharmacies`);
        return res.json(data);
      }
    }
    
    res.json({ status: "OK", results: [] });
  } catch (error) {
    console.error("❌ [Google Places] Error searching pharmacies:", error);
    res.status(500).json({
      status: "ERROR",
      error: "Failed to search pharmacies"
    });
  }
});

// Search for medical facilities using Google Places API
router.get("/api/places/search-medical", async (req, res) => {
  try {
    const { query, lat, lng, radius = 10000 } = req.query;
    
    console.log("🔍 [Google Places] Searching for medical facilities:", { query, lat, lng, radius });

    // Use the actual Google Places API
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    
    if (!apiKey) {
      console.error("❌ [Google Places] GOOGLE_PLACES_API_KEY environment variable not found!");
      return res.status(500).json({
        status: "ERROR",
        error: "Google Places API key not configured"
      });
    }
    
    // If searching by text query - Enhanced multi-pass search
    if (query) {
      console.log("🔍 [Google Places] Enhanced search for:", query);
      
      // First, try exact name search without additional keywords
      let allResults = [];
      const searchPasses = [
        // Pass 1: Exact name search
        { query: query, types: "" },
        // Pass 2: Name + medical keywords
        { query: `${query} medical clinic hospital doctor healthcare`, types: "hospital|doctor|health|medical_center|clinic|pharmacy|physiotherapist" },
        // Pass 3: Name + location context if applicable
        { query: `${query} family medicine primary care urgent care`, types: "" }
      ];

      for (const pass of searchPasses) {
        const baseUrl = "https://maps.googleapis.com/maps/api/place/textsearch/json";
        const params = new URLSearchParams({
          key: apiKey,
          query: pass.query
        });
        
        if (pass.types) {
          params.append("type", pass.types);
        }

        try {
          const response = await fetch(`${baseUrl}?${params}`);
          const data = await response.json();
          
          if (data.status === "OK" && data.results) {
            // Filter for healthcare-related results
            const healthcareResults = data.results.filter(place => {
              const types = place.types || [];
              const name = place.name?.toLowerCase() || "";
              const isHealthcare = types.some(type => 
                ['hospital', 'doctor', 'health', 'medical_center', 'clinic', 'pharmacy', 'physiotherapist'].includes(type)
              ) || name.includes('medical') || name.includes('clinic') || name.includes('hospital') || 
                name.includes('health') || name.includes('doctor') || name.includes('family medicine') ||
                name.includes('urgent care') || name.includes('primary care');
              return isHealthcare;
            });
            
            allResults = [...allResults, ...healthcareResults];
          }
        } catch (error) {
          console.error(`❌ [Google Places] Error in search pass:`, error);
        }
      }

      // Remove duplicates based on place_id
      const uniqueResults = Array.from(
        new Map(allResults.map(item => [item.place_id, item])).values()
      );

      // Sort by relevance (exact name matches first)
      const sortedResults = uniqueResults.sort((a, b) => {
        const aNameMatch = a.name?.toLowerCase().includes(query.toLowerCase()) ? 1 : 0;
        const bNameMatch = b.name?.toLowerCase().includes(query.toLowerCase()) ? 1 : 0;
        return bNameMatch - aNameMatch;
      });

      console.log(`✅ [Google Places] Found ${sortedResults.length} unique healthcare facilities`);
      
      res.json({
        status: "OK",
        results: sortedResults
      });
    } 
    // If searching by location - Enhanced nearby search
    else if (lat && lng) {
      console.log("🔍 [Google Places] Enhanced nearby search at:", lat, lng);
      
      let allResults = [];
      
      // Multiple search passes with different keywords to catch all healthcare facilities
      const searchKeywords = [
        "medical clinic",
        "family medicine", 
        "hospital",
        "urgent care",
        "primary care",
        "healthcare center",
        "medical center",
        "doctor office",
        "physician",
        "health clinic"
      ];
      
      // First, do a comprehensive nearby search
      const baseUrl = "https://maps.googleapis.com/maps/api/place/nearbysearch/json";
      
      for (const keyword of searchKeywords) {
        const params = new URLSearchParams({
          key: apiKey,
          location: `${lat},${lng}`,
          radius: radius.toString(),
          keyword: keyword
        });
        
        try {
          const response = await fetch(`${baseUrl}?${params}`);
          const data = await response.json();
          
          if (data.status === "OK" && data.results) {
            // Filter for healthcare facilities
            const healthcareResults = data.results.filter(place => {
              const types = place.types || [];
              const name = place.name?.toLowerCase() || "";
              const isHealthcare = types.some(type => 
                ['hospital', 'doctor', 'health', 'medical_center', 'clinic', 'pharmacy', 
                 'physiotherapist', 'dentist'].includes(type)
              ) || name.includes('medical') || name.includes('clinic') || name.includes('hospital') || 
                name.includes('health') || name.includes('doctor') || name.includes('family medicine') ||
                name.includes('urgent care') || name.includes('primary care') || name.includes('physician');
              return isHealthcare;
            });
            
            allResults = [...allResults, ...healthcareResults];
          }
        } catch (error) {
          console.error(`❌ [Google Places] Error searching for "${keyword}":`, error);
        }
      }
      
      // Remove duplicates based on place_id
      const uniqueResults = Array.from(
        new Map(allResults.map(item => [item.place_id, item])).values()
      );
      
      // Calculate distances and sort by proximity
      const resultsWithDistance = uniqueResults.map(place => {
        if (place.geometry?.location) {
          const distance = calculateDistance(
            parseFloat(lat.toString()),
            parseFloat(lng.toString()),
            place.geometry.location.lat,
            place.geometry.location.lng
          );
          return { ...place, distance };
        }
        return place;
      }).sort((a, b) => (a.distance || 999) - (b.distance || 999));
      
      console.log(`✅ [Google Places] Found ${resultsWithDistance.length} unique healthcare facilities nearby`);
      
      res.json({
        status: "OK",
        results: resultsWithDistance.slice(0, 50) // Limit to 50 closest results
      });
    } else {
      res.status(400).json({ 
        status: "ERROR",
        error: "Either query or location (lat/lng) must be provided" 
      });
    }

  } catch (error) {
    console.error("❌ [Google Places] Search error:", error);
    res.status(500).json({ 
      status: "ERROR",
      error: "Failed to search for medical facilities" 
    });
  }
});

// Get place details including NPI from NPPES
router.get("/api/places/details/:placeId", async (req, res) => {
  try {
    const { placeId } = req.params;
    
    console.log("🔍 [Google Places] Getting details for place:", placeId);

    // In production, fetch from Google Places API and NPPES
    // For now, return mock enhanced details
    const mockDetails = {
      place_id: placeId,
      name: "Dallas Medical City Hospital",
      formatted_address: "7777 Forest Ln, Dallas, TX 75230",
      formatted_phone_number: "(972) 566-7000",
      website: "https://medicalcityhospital.com",
      geometry: {
        location: { lat: 32.9099, lng: -96.7637 }
      },
      opening_hours: {
        weekday_text: [
          "Monday: Open 24 hours",
          "Tuesday: Open 24 hours",
          "Wednesday: Open 24 hours",
          "Thursday: Open 24 hours",
          "Friday: Open 24 hours",
          "Saturday: Open 24 hours",
          "Sunday: Open 24 hours"
        ]
      },
      // Enhanced with healthcare-specific data
      healthcare_details: {
        npi: "1234567890",
        taxonomy: "General Acute Care Hospital",
        accepting_new_patients: true,
        specialties: ["Emergency Medicine", "Internal Medicine", "Surgery"],
        insurance_accepted: ["Medicare", "Medicaid", "Most Private Insurance"]
      }
    };

    res.json({
      status: "OK",
      result: mockDetails
    });

  } catch (error) {
    console.error("❌ [Google Places] Details error:", error);
    res.status(500).json({ 
      status: "ERROR",
      error: "Failed to get place details" 
    });
  }
});

// Create or join a health system from Google Places data
router.post("/api/places/create-health-system", async (req, res) => {
  try {
    // Note: This endpoint doesn't require authentication because it's used during registration
    // The actual health system creation happens during the registration process
    
    const { placeData, joinAsAdmin } = req.body;
    
    console.log("🏥 [Google Places] Processing clinic data:", placeData);

    // Check if this place already exists in our database
    const { db } = await import("./db.js");
    const { healthSystems, locations } = await import("@shared/schema");
    const { eq, like, sql } = await import("drizzle-orm");
    
    // First check if this is a location of an existing health system
    // Look for exact name match or partial match (e.g., "Waco Family Medicine - Central" matches "Waco Family Medicine")
    const baseName = placeData.name.split(' - ')[0].trim();
    
    const existingSystem = await db
      .select()
      .from(healthSystems)
      .where(sql`${healthSystems.name} ILIKE ${baseName + '%'}`)
      .limit(1);

    if (existingSystem.length > 0) {
      // Check if this specific location already exists
      const existingLocation = await db
        .select()
        .from(locations)
        .where(eq(locations.healthSystemId, existingSystem[0].id))
        .where(like(locations.address, placeData.formatted_address.split(",")[0] + '%'))
        .limit(1);
      
      if (existingLocation.length > 0) {
        return res.json({
          exists: true,
          healthSystemId: existingSystem[0].id,
          locationId: existingLocation[0].id,
          message: "This clinic location already exists. You can join it with the appropriate credentials."
        });
      }
      
      // System exists but location doesn't - create the location
      const newLocation = await db.insert(locations).values({
        healthSystemId: existingSystem[0].id,
        name: placeData.name,
        locationType: "clinic",
        address: placeData.formatted_address.split(",")[0],
        city: placeData.formatted_address.split(",")[1]?.trim() || "",
        state: placeData.formatted_address.split(",")[2]?.trim()?.split(" ")[0] || "TX",
        zipCode: placeData.formatted_address.match(/\d{5}/)?.[0] || "00000",
        phone: placeData.formatted_phone_number,
        npi: placeData.healthcare_details?.npi,
        active: true
      }).returning();
      
      return res.json({
        exists: true,
        healthSystemId: existingSystem[0].id,
        locationId: newLocation[0].id,
        message: "Added as a new location to existing health system."
      });
    }

    // No existing system found - determine if this is a single clinic or health system
    // Single clinics should NOT be created as health systems
    const isSingleClinic = !placeData.name.includes("Health System") && 
                          !placeData.name.includes("Medical Group") &&
                          !placeData.name.includes("Healthcare") &&
                          !placeData.name.includes("Hospital Network") &&
                          !placeData.name.includes("Medical Center") &&
                          placeData.types?.some(type => ['doctor', 'clinic', 'medical_center'].includes(type));
    
    let healthSystemId;
    let healthSystemName;
    
    if (isSingleClinic) {
      // This is a single clinic - find or create appropriate parent health system
      const state = placeData.formatted_address.split(",")[2]?.trim()?.split(" ")[0] || "Unknown";
      const parentSystemName = `Independent Clinics - ${state}`;
      
      // Check if parent system exists
      const parentSystem = await db
        .select()
        .from(healthSystems)
        .where(eq(healthSystems.name, parentSystemName))
        .limit(1);
      
      if (parentSystem.length > 0) {
        healthSystemId = parentSystem[0].id;
        healthSystemName = parentSystem[0].name;
      } else {
        // Create parent system for independent clinics in this state
        const newParentSystem = await db.insert(healthSystems).values({
          name: parentSystemName,
          systemType: "independent_clinics",
          subscriptionTier: 1,
          subscriptionStatus: "pending"
        }).returning();
        
        healthSystemId = newParentSystem[0].id;
        healthSystemName = newParentSystem[0].name;
      }
    } else {
      // This appears to be a health system - create it
      const newHealthSystem = await db.insert(healthSystems).values({
        name: baseName,
        systemType: "clinic_group",
        subscriptionTier: 1,
        subscriptionStatus: "pending"
      }).returning();
      
      healthSystemId = newHealthSystem[0].id;
      healthSystemName = newHealthSystem[0].name;
    }

    // Create the location with full name
    const newLocation = await db.insert(locations).values({
      healthSystemId: healthSystemId,
      name: placeData.name,
      locationType: "clinic",
      address: placeData.formatted_address.split(",")[0],
      city: placeData.formatted_address.split(",")[1]?.trim() || "",
      state: placeData.formatted_address.split(",")[2]?.trim()?.split(" ")[0] || "TX",
      zipCode: placeData.formatted_address.match(/\d{5}/)?.[0] || "00000",
      phone: placeData.formatted_phone_number,
      npi: placeData.healthcare_details?.npi,
      active: true
    }).returning();

    res.json({
      success: true,
      healthSystemId: healthSystemId,
      locationId: newLocation[0].id,
      message: isSingleClinic ? 
        `Clinic added to "${healthSystemName}". Proceed with registration.` :
        "Health system and location created successfully. Proceed with registration."
    });

  } catch (error) {
    console.error("❌ [Google Places] Create health system error:", error);
    res.status(500).json({ error: "Failed to create health system" });
  }
});

// Autocomplete endpoint for clinic names
router.get("/api/places/autocomplete", async (req, res) => {
  try {
    const { input } = req.query;
    
    if (!input || typeof input !== 'string' || input.length < 2) {
      return res.json({ predictions: [] });
    }
    
    console.log("🔍 [Google Places] Autocomplete for:", input);
    
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    
    if (!apiKey) {
      // Return common healthcare facility names as fallback
      const fallbackSuggestions = [
        "Family Medicine",
        "Medical Center", 
        "Urgent Care",
        "Primary Care",
        "Healthcare Center",
        "Community Health",
        "Medical Clinic"
      ].filter(s => s.toLowerCase().includes(input.toLowerCase()))
        .map(s => ({
          description: s,
          place_id: `fallback_${s.replace(/\s+/g, '_')}`,
        }));
      
      return res.json({ predictions: fallbackSuggestions });
    }
    
    // Use Google Places Autocomplete API
    const baseUrl = "https://maps.googleapis.com/maps/api/place/autocomplete/json";
    const params = new URLSearchParams({
      key: apiKey,
      input: input,
      types: "establishment",
      components: "country:us", // Limit to US for now
    });
    
    const response = await fetch(`${baseUrl}?${params}`);
    const data = await response.json();
    
    if (data.status === "OK") {
      // Filter for healthcare-related predictions
      const healthcarePredictions = data.predictions.filter((pred: any) => {
        const desc = pred.description.toLowerCase();
        return desc.includes('medical') || desc.includes('clinic') || 
               desc.includes('hospital') || desc.includes('health') ||
               desc.includes('doctor') || desc.includes('physician') ||
               desc.includes('urgent care') || desc.includes('family medicine');
      });
      
      res.json({ predictions: healthcarePredictions });
    } else {
      res.json({ predictions: [] });
    }
    
  } catch (error) {
    console.error("❌ [Google Places] Autocomplete error:", error);
    res.json({ predictions: [] });
  }
});

export default router;