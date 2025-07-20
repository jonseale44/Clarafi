import { db } from "./db.js";
import { healthSystems, organizations, locations, userLocations } from "@shared/schema";

async function restoreLocations() {
  console.log("🏥 Starting location restoration...");

  try {
    // First create Waco Family Medicine health system
    const [wacoHealthSystem] = await db.insert(healthSystems).values({
      name: "Waco Family Medicine",
      shortName: "WFM",
      systemType: "clinic_group",
      primaryContact: "Dr. Jonathan Seale",
      phone: "254-313-4200",
      email: "info@wacofamilymedicine.org",
      website: "https://www.wacofamilymedicine.org",
      npi: "1234567890",
      taxId: "74-1234567",
      active: true
    }).returning();
    
    console.log("✅ Created Waco Family Medicine health system");

    // Create Waco regional organization
    const [wacoOrg] = await db.insert(organizations).values({
      healthSystemId: wacoHealthSystem.id,
      name: "Waco Family Medicine - Waco Region",
      organizationType: "regional_health",
      shortName: "Waco Region",
      region: "Central Texas",
      city: "Waco",
      state: "TX",
      zipCode: "76707",
      phone: "254-313-4200",
      email: "info@wacofamilymedicine.org",
      address: "1600 Providence Dr, Waco, TX 76707",
      taxId: "74-1234567",
      active: true
    }).returning();
    
    console.log("✅ Created Waco regional organization");

    // Create all Waco Family Medicine locations
    const locationsData = [
      {
        healthSystemId: wacoHealthSystem.id,
        organizationId: wacoOrg.id,
        name: "Waco Family Medicine - Hillsboro",
        locationType: "clinic",
        address: "1323 E Franklin St #105",
        city: "Hillsboro",
        state: "TX",
        zipCode: "76645",
        phone: "254-582-7481",
        fax: "254-582-7482",
        operatingHours: {
          monday: { open: "08:00", close: "17:00" },
          tuesday: { open: "08:00", close: "17:00" },
          wednesday: { open: "08:00", close: "17:00" },
          thursday: { open: "08:00", close: "17:00" },
          friday: { open: "08:00", close: "17:00" }
        },
        services: ["primary_care", "preventive_medicine", "chronic_disease_management"],
        hasLab: false,
        hasImaging: false,
        hasPharmacy: false,
        active: true
      },
      {
        healthSystemId: wacoHealthSystem.id,
        organizationId: wacoOrg.id,
        name: "Waco Family Medicine - Central",
        locationType: "hospital",
        address: "1600 Providence Dr",
        city: "Waco",
        state: "TX",
        zipCode: "76707",
        phone: "254-313-4200",
        fax: "254-313-4201",
        operatingHours: {
          monday: { open: "08:00", close: "20:00" },
          tuesday: { open: "08:00", close: "20:00" },
          wednesday: { open: "08:00", close: "20:00" },
          thursday: { open: "08:00", close: "20:00" },
          friday: { open: "08:00", close: "20:00" },
          saturday: { open: "09:00", close: "17:00" }
        },
        services: ["primary_care", "urgent_care", "specialty_services", "pharmacy", "lab"],
        hasLab: true,
        hasImaging: true,
        hasPharmacy: true,
        active: true
      },
      {
        healthSystemId: wacoHealthSystem.id,
        organizationId: wacoOrg.id,
        name: "Waco Family Medicine - Tom Oliver S. 18th",
        locationType: "clinic",
        address: "1800 Gurley Lane",
        city: "Waco",
        state: "TX",
        zipCode: "76706",
        phone: "254-313-6000",
        fax: "254-313-6001",
        operatingHours: {
          monday: { open: "08:00", close: "18:00" },
          tuesday: { open: "08:00", close: "18:00" },
          wednesday: { open: "08:00", close: "18:00" },
          thursday: { open: "08:00", close: "18:00" },
          friday: { open: "08:00", close: "18:00" }
        },
        services: ["primary_care", "dental", "lab", "pharmacy"],
        hasLab: true,
        hasImaging: false,
        hasPharmacy: true,
        active: true
      },
      {
        healthSystemId: wacoHealthSystem.id,
        organizationId: wacoOrg.id,
        name: "Waco Family Medicine - West Waco",
        locationType: "clinic",
        address: "600 W State Highway 6",
        city: "Woodway",
        state: "TX",
        zipCode: "76712",
        phone: "254-313-6700",
        fax: "254-313-6701",
        operatingHours: {
          monday: { open: "08:00", close: "17:00" },
          tuesday: { open: "08:00", close: "17:00" },
          wednesday: { open: "08:00", close: "17:00" },
          thursday: { open: "08:00", close: "17:00" },
          friday: { open: "08:00", close: "17:00" }
        },
        services: ["primary_care", "pediatrics", "womens_health"],
        hasLab: false,
        hasImaging: false,
        hasPharmacy: false,
        active: true
      },
      {
        healthSystemId: wacoHealthSystem.id,
        organizationId: wacoOrg.id,
        name: "Waco Family Medicine - Hillcrest Medical",
        locationType: "clinic",
        address: "120 Hillcrest Medical Blvd Building II",
        city: "Waco",
        state: "TX",
        zipCode: "76708",
        phone: "254-313-6000",
        fax: "254-313-6001",
        operatingHours: {
          monday: { open: "08:00", close: "17:00" },
          tuesday: { open: "08:00", close: "17:00" },
          wednesday: { open: "08:00", close: "17:00" },
          thursday: { open: "08:00", close: "17:00" },
          friday: { open: "08:00", close: "17:00" }
        },
        services: ["primary_care", "senior_care", "geriatrics"],
        hasLab: false,
        hasImaging: false,
        hasPharmacy: false,
        active: true
      }
    ];

    const createdLocations = await db.insert(locations).values(locationsData).returning();
    console.log(`✅ Created ${createdLocations.length} Waco Family Medicine locations`);

    // Create Mission Hillsboro as separate health system
    const [missionHealthSystem] = await db.insert(healthSystems).values({
      name: "Mission Hillsboro Medical Clinic",
      shortName: "Mission Hillsboro",
      systemType: "independent",
      primaryContact: "Clinic Manager",
      phone: "254-479-1489",
      email: "info@missionhillsboro.org",
      website: "https://www.missionhillsboro.org",
      npi: "0987654321",
      taxId: "74-7654321",
      active: true
    }).returning();

    console.log("✅ Created Mission Hillsboro health system");

    // Create Mission Hillsboro location
    const [missionLocation] = await db.insert(locations).values({
      healthSystemId: missionHealthSystem.id,
      organizationId: null, // Independent clinic, no organization layer
      name: "Mission Hillsboro Medical Clinic",
      locationType: "clinic",
      address: "120 E Franklin St",
      city: "Hillsboro",
      state: "TX",
      zipCode: "76645",
      phone: "254-479-1489",
      fax: "254-479-1490",
      operatingHours: {
        monday: { open: "08:00", close: "17:00" },
        tuesday: { open: "08:00", close: "17:00" },
        wednesday: { open: "08:00", close: "17:00" },
        thursday: { open: "08:00", close: "17:00" },
        friday: { open: "08:00", close: "17:00" }
      },
      services: ["primary_care", "walk_in_services", "community_health"],
      hasLab: false,
      hasImaging: false,
      hasPharmacy: false,
      active: true
    }).returning();

    console.log("✅ Created Mission Hillsboro location");

    // Get user ID 2 and 3 to assign locations
    const allLocationIds = [...createdLocations, missionLocation].map(loc => loc.id);
    
    // Check correct field name for userLocations
    const user2Assignments = allLocationIds.map((locationId, index) => ({
      userId: 2,
      locationId,
      roleAtLocation: index === 1 ? "primary" : "covering", // Central as primary
      startDate: new Date(),
      isActive: true
    }));

    await db.insert(userLocations).values(user2Assignments);
    console.log("✅ Assigned user 2 to all locations");

    // Assign user 3 (jonseale44) to all locations  
    const user3Assignments = allLocationIds.map((locationId, index) => ({
      userId: 3,
      locationId,
      roleAtLocation: index === 1 ? "primary" : "covering", // Central as primary
      startDate: new Date(),
      isActive: true
    }));

    await db.insert(userLocations).values(user3Assignments);
    console.log("✅ Assigned user 3 to all locations");

    console.log("🎉 Location restoration complete!");
    console.log(`Total locations restored: ${allLocationIds.length}`);

  } catch (error) {
    console.error("❌ Error restoring locations:", error);
    throw error;
  }
}

// Run the restoration
restoreLocations()
  .then(() => {
    console.log("✅ Location restoration completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Location restoration failed:", error);
    process.exit(1);
  });