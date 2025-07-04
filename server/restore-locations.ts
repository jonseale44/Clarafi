import { db } from "./db";
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
      organizationType: "Regional",
      description: "Waco region family medicine services",
      phoneNumber: "254-313-4200",
      faxNumber: "254-313-4201",
      billingAddress: "1600 Providence Dr, Waco, TX 76707",
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
        locationType: "Clinic",
        address: "1323 E Franklin St #105",
        city: "Hillsboro",
        state: "TX",
        zipCode: "76645",
        phoneNumber: "254-582-7481",
        faxNumber: "254-582-7482",
        operatingHours: JSON.stringify({
          monday: { open: "08:00", close: "17:00" },
          tuesday: { open: "08:00", close: "17:00" },
          wednesday: { open: "08:00", close: "17:00" },
          thursday: { open: "08:00", close: "17:00" },
          friday: { open: "08:00", close: "17:00" }
        }),
        servicesOffered: ["Primary Care", "Preventive Medicine", "Chronic Disease Management"],
        active: true
      },
      {
        healthSystemId: wacoHealthSystem.id,
        organizationId: wacoOrg.id,
        name: "Waco Family Medicine - Central",
        locationType: "Hospital",
        address: "1600 Providence Dr",
        city: "Waco",
        state: "TX",
        zipCode: "76707",
        phoneNumber: "254-313-4200",
        faxNumber: "254-313-4201",
        operatingHours: JSON.stringify({
          monday: { open: "08:00", close: "20:00" },
          tuesday: { open: "08:00", close: "20:00" },
          wednesday: { open: "08:00", close: "20:00" },
          thursday: { open: "08:00", close: "20:00" },
          friday: { open: "08:00", close: "20:00" },
          saturday: { open: "09:00", close: "17:00" }
        }),
        servicesOffered: ["Primary Care", "Urgent Care", "Specialty Services", "Pharmacy", "Laboratory"],
        facilityCapabilities: ["Emergency Care", "Surgery", "Imaging", "Pharmacy"],
        active: true
      },
      {
        healthSystemId: wacoHealthSystem.id,
        organizationId: wacoOrg.id,
        name: "Waco Family Medicine - Tom Oliver S. 18th",
        locationType: "Clinic",
        address: "1800 Gurley Lane",
        city: "Waco",
        state: "TX",
        zipCode: "76706",
        phoneNumber: "254-313-6000",
        faxNumber: "254-313-6001",
        operatingHours: JSON.stringify({
          monday: { open: "08:00", close: "18:00" },
          tuesday: { open: "08:00", close: "18:00" },
          wednesday: { open: "08:00", close: "18:00" },
          thursday: { open: "08:00", close: "18:00" },
          friday: { open: "08:00", close: "18:00" }
        }),
        servicesOffered: ["Primary Care", "Dental Services", "Laboratory", "Pharmacy"],
        facilityCapabilities: ["Dental", "Laboratory", "Pharmacy"],
        active: true
      },
      {
        healthSystemId: wacoHealthSystem.id,
        organizationId: wacoOrg.id,
        name: "Waco Family Medicine - West Waco",
        locationType: "Clinic",
        address: "600 W State Highway 6",
        city: "Woodway",
        state: "TX",
        zipCode: "76712",
        phoneNumber: "254-313-6700",
        faxNumber: "254-313-6701",
        operatingHours: JSON.stringify({
          monday: { open: "08:00", close: "17:00" },
          tuesday: { open: "08:00", close: "17:00" },
          wednesday: { open: "08:00", close: "17:00" },
          thursday: { open: "08:00", close: "17:00" },
          friday: { open: "08:00", close: "17:00" }
        }),
        servicesOffered: ["Primary Care", "Pediatrics", "Women's Health"],
        active: true
      },
      {
        healthSystemId: wacoHealthSystem.id,
        organizationId: wacoOrg.id,
        name: "Waco Family Medicine - Hillcrest Medical",
        locationType: "Clinic",
        address: "120 Hillcrest Medical Blvd Building II",
        city: "Waco",
        state: "TX",
        zipCode: "76708",
        phoneNumber: "254-313-6000",
        faxNumber: "254-313-6001",
        operatingHours: JSON.stringify({
          monday: { open: "08:00", close: "17:00" },
          tuesday: { open: "08:00", close: "17:00" },
          wednesday: { open: "08:00", close: "17:00" },
          thursday: { open: "08:00", close: "17:00" },
          friday: { open: "08:00", close: "17:00" }
        }),
        servicesOffered: ["Primary Care", "Senior Care", "Geriatrics"],
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
      locationType: "Clinic",
      address: "120 E Franklin St",
      city: "Hillsboro",
      state: "TX",
      zipCode: "76645",
      phoneNumber: "254-479-1489",
      faxNumber: "254-479-1490",
      operatingHours: JSON.stringify({
        monday: { open: "08:00", close: "17:00" },
        tuesday: { open: "08:00", close: "17:00" },
        wednesday: { open: "08:00", close: "17:00" },
        thursday: { open: "08:00", close: "17:00" },
        friday: { open: "08:00", close: "17:00" }
      }),
      servicesOffered: ["Primary Care", "Walk-in Services", "Community Health"],
      active: true
    }).returning();

    console.log("✅ Created Mission Hillsboro location");

    // Get user ID 2 and 3 to assign locations
    const allLocationIds = [...createdLocations, missionLocation].map(loc => loc.id);
    
    // Assign user 2 (jonseale) to all locations
    const user2Assignments = allLocationIds.map((locationId, index) => ({
      userId: 2,
      locationId,
      role: index === 1 ? "primary" : "covering", // Central as primary
      startDate: new Date(),
      isActive: true
    }));

    await db.insert(userLocations).values(user2Assignments);
    console.log("✅ Assigned user 2 to all locations");

    // Assign user 3 (jonseale44) to all locations  
    const user3Assignments = allLocationIds.map((locationId, index) => ({
      userId: 3,
      locationId,
      role: index === 1 ? "primary" : "covering", // Central as primary
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