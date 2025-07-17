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

// Mock Google Places API response for development
const mockSearchPlaces = async (query: string, location?: { lat: number; lng: number }) => {
  // In production, this would call the actual Google Places API
  // For now, return mock data based on the query
  const mockPlaces = [
    {
      place_id: "ChIJN1t_tDeuEmsRUsoyG83frY4",
      name: "Dallas Medical City Hospital",
      formatted_address: "7777 Forest Ln, Dallas, TX 75230",
      geometry: {
        location: { lat: 32.9099, lng: -96.7637 }
      },
      types: ["hospital", "health", "point_of_interest"],
      formatted_phone_number: "(972) 566-7000",
      website: "https://medicalcityhospital.com",
      place_details: {
        npi: "1234567890", // In production, fetch from NPPES
        hours: "24/7 Emergency Services"
      }
    },
    {
      place_id: "ChIJgUbEo8cfqokR5lP9_Wh_DaM",
      name: "UT Southwestern Medical Center",
      formatted_address: "5323 Harry Hines Blvd, Dallas, TX 75390",
      geometry: {
        location: { lat: 32.8127, lng: -96.8408 }
      },
      types: ["hospital", "university", "health"],
      formatted_phone_number: "(214) 648-3111",
      website: "https://www.utsouthwestern.edu",
      place_details: {
        npi: "1987654321",
        hours: "Mon-Fri 8:00 AM - 5:00 PM"
      }
    },
    {
      place_id: "ChIJP3Sa8ziYEmsRKErVGEaa11w",
      name: "Family Practice Associates",
      formatted_address: "123 Main St, Dallas, TX 75201",
      geometry: {
        location: { lat: 32.7767, lng: -96.7970 }
      },
      types: ["doctor", "health", "establishment"],
      formatted_phone_number: "(214) 555-0123",
      website: "https://familypracticeassoc.com",
      place_details: {
        npi: "1122334455",
        hours: "Mon-Fri 9:00 AM - 5:00 PM"
      }
    },
    // Hillsboro, TX clinics
    {
      place_id: "ChIJh4k_3Hx0T4YRxGxBVSZ1QxI",
      name: "Mission Hillsboro Medical Clinic",
      formatted_address: "101 Mission Dr, Hillsboro, TX 76645",
      geometry: {
        location: { lat: 32.0148, lng: -97.1300 }
      },
      types: ["doctor", "health", "establishment"],
      formatted_phone_number: "(254) 582-8416",
      website: "https://missionhillsboro.com",
      place_details: {
        npi: "1558301234",
        hours: "Mon-Fri 8:00 AM - 5:00 PM"
      }
    },
    {
      place_id: "ChIJh4k_3Hx0T4YRxGxBVSZ1QxJ",
      name: "Hill Regional Hospital",
      formatted_address: "101 Circle Dr, Hillsboro, TX 76645",
      geometry: {
        location: { lat: 32.0085, lng: -97.1136 }
      },
      types: ["hospital", "health", "point_of_interest"],
      formatted_phone_number: "(254) 580-8500",
      website: "https://hillregional.com",
      place_details: {
        npi: "1588604321",
        hours: "24/7 Emergency Services"
      }
    },
    {
      place_id: "ChIJh4k_3Hx0T4YRxGxBVSZ1QxK",
      name: "Hillsboro Family Medicine",
      formatted_address: "1323 E Franklin St, Hillsboro, TX 76645",
      geometry: {
        location: { lat: 32.0107, lng: -97.1129 }
      },
      types: ["doctor", "health", "establishment"],
      formatted_phone_number: "(254) 582-2555",
      website: "https://hillsborofamilymed.com",
      place_details: {
        npi: "1659387654",
        hours: "Mon-Fri 8:00 AM - 5:00 PM, Sat 9:00 AM - 12:00 PM"
      }
    },
    // Waco clinics
    {
      place_id: "ChIJh4k_3Hx0T4YRxGxBVSZ1QxL",
      name: "Waco Family Medicine",
      formatted_address: "4800 W Waco Dr, Waco, TX 76710",
      geometry: {
        location: { lat: 31.5161, lng: -97.1886 }
      },
      types: ["doctor", "health", "establishment"],
      formatted_phone_number: "(254) 776-5600",
      website: "https://wacofamilymedicine.com",
      place_details: {
        npi: "1760412345",
        hours: "Mon-Fri 8:00 AM - 5:00 PM"
      }
    },
    {
      place_id: "ChIJh4k_3Hx0T4YRxGxBVSZ1QxM",
      name: "Baylor Scott & White Medical Center - Hillcrest",
      formatted_address: "100 Hillcrest Medical Blvd, Waco, TX 76712",
      geometry: {
        location: { lat: 31.5055, lng: -97.1935 }
      },
      types: ["hospital", "health", "point_of_interest"],
      formatted_phone_number: "(254) 202-2000",
      website: "https://bswhealth.com/locations/waco-hillcrest",
      place_details: {
        npi: "1861498765",
        hours: "24/7 Emergency Services"
      }
    }
  ];

  // Filter based on query
  if (query) {
    return mockPlaces.filter(place => 
      place.name.toLowerCase().includes(query.toLowerCase()) ||
      place.formatted_address.toLowerCase().includes(query.toLowerCase())
    );
  }

  // If location provided, sort by distance (mock calculation)
  if (location) {
    return mockPlaces.map(place => ({
      ...place,
      distance: Math.random() * 10 // Mock distance in miles
    })).sort((a, b) => a.distance - b.distance);
  }

  return mockPlaces;
};

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
    
    console.log("🏥 [Google Places] Creating health system from place data:", placeData);

    // Check if this place already exists in our database
    const { db } = await import("./db.js");
    const { healthSystems, locations } = await import("@shared/schema");
    const { eq } = await import("drizzle-orm");
    
    // Try to find by name and address
    const existingSystem = await db
      .select()
      .from(healthSystems)
      .where(eq(healthSystems.name, placeData.name))
      .limit(1);

    if (existingSystem.length > 0) {
      // System exists - user can join it
      return res.json({
        exists: true,
        healthSystemId: existingSystem[0].id,
        message: "This health system already exists. You can join it with the appropriate credentials."
      });
    }

    // Create new health system
    const newHealthSystem = await db.insert(healthSystems).values({
      name: placeData.name,
      systemType: placeData.healthcare_details?.taxonomy || "Medical Practice",
      subscriptionTier: 1, // Start with individual tier
      subscriptionStatus: "pending",
      patientCount: 0,
      activeUserCount: 1
    }).returning();

    // Create the main location
    await db.insert(locations).values({
      healthSystemId: newHealthSystem[0].id,
      name: placeData.name,
      address: placeData.formatted_address.split(",")[0],
      city: placeData.formatted_address.split(",")[1]?.trim() || "",
      state: placeData.formatted_address.split(",")[2]?.trim()?.split(" ")[0] || "TX",
      zipCode: placeData.formatted_address.match(/\d{5}/)?.[0] || "00000",
      phone: placeData.formatted_phone_number,
      npi: placeData.healthcare_details?.npi,
      locationType: "main",
      isActive: true
    });

    res.json({
      success: true,
      healthSystemId: newHealthSystem[0].id,
      message: "Health system created successfully. Proceed with registration."
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