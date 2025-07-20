import { db } from "./db.js";
import { healthSystems, locations } from "@shared/schema";
import { eq, sql } from "drizzle-orm";

async function fixHealthSystemsData() {
  try {
    console.log("🔍 Checking and fixing health systems data...\n");
    
    // First, check all health systems regardless of status
    const allHealthSystems = await db
      .select()
      .from(healthSystems)
      .orderBy(healthSystems.name);
    
    console.log(`Found ${allHealthSystems.length} health systems total:\n`);
    
    for (const hs of allHealthSystems) {
      console.log(`- ${hs.name} (ID: ${hs.id}, Status: ${hs.subscriptionStatus})`);
    }
    
    // Check if there are any locations
    const allLocations = await db.select().from(locations);
    console.log(`\nFound ${allLocations.length} locations total\n`);
    
    // Update subscription status for existing health systems to make them searchable
    const inactiveHealthSystems = allHealthSystems.filter(hs => hs.subscriptionStatus !== 'active');
    if (inactiveHealthSystems.length > 0) {
      console.log(`\nFound ${inactiveHealthSystems.length} inactive health systems. Activating them...`);
      
      for (const hs of inactiveHealthSystems) {
        await db
          .update(healthSystems)
          .set({ subscriptionStatus: 'active' })
          .where(eq(healthSystems.id, hs.id));
        console.log(`✅ Activated: ${hs.name}`);
      }
    }
    
    // Add some test health systems if we have too few
    if (allHealthSystems.length < 3) {
      console.log("\n📍 Adding test health systems for better search functionality...\n");
      
      // Add Hillsboro health systems
      const testSystems = [
        {
          name: "Hillsboro Community Hospital",
          systemType: "hospital",
          subscriptionTier: 2,
          subscriptionStatus: 'active' as const,
          active: true
        },
        {
          name: "Hillsboro Family Medical Center",
          systemType: "clinic_group",
          subscriptionTier: 2,
          subscriptionStatus: 'active' as const,
          active: true
        },
        {
          name: "Austin Regional Clinic",
          systemType: "multi_location_practice",
          subscriptionTier: 2,
          subscriptionStatus: 'active' as const,
          active: true
        },
        {
          name: "Dallas Medical City",
          systemType: "hospital_network",
          subscriptionTier: 3,
          subscriptionStatus: 'active' as const,
          active: true
        }
      ];
      
      for (const system of testSystems) {
        try {
          const [newHS] = await db
            .insert(healthSystems)
            .values(system)
            .onConflictDoNothing()
            .returning();
          
          if (newHS) {
            console.log(`✅ Added health system: ${newHS.name} (ID: ${newHS.id})`);
            
            // Add a location for this health system
            if (system.name.includes("Hillsboro")) {
              await db.insert(locations).values({
                healthSystemId: newHS.id,
                name: `${newHS.name} - Main Campus`,
                locationType: system.systemType === "hospital" ? "hospital" : "clinic",
                address: `${100 + newHS.id} Main Street`,
                city: "Hillsboro",
                state: "TX",
                zipCode: "76645",
                phone: `(254) 555-${1000 + newHS.id}`,
                active: true
              });
              console.log(`  ✅ Added location in Hillsboro`);
            } else if (system.name.includes("Austin")) {
              // Add multiple locations for Austin Regional Clinic
              const austinLocations = [
                { name: "ARC North", city: "Austin", address: "1000 N Lamar Blvd" },
                { name: "ARC South", city: "Austin", address: "2000 S Congress Ave" },
                { name: "ARC West", city: "Austin", address: "3000 W 6th St" }
              ];
              
              for (const loc of austinLocations) {
                await db.insert(locations).values({
                  healthSystemId: newHS.id,
                  name: `${newHS.name} - ${loc.name}`,
                  locationType: "clinic",
                  address: loc.address,
                  city: loc.city,
                  state: "TX",
                  zipCode: "78701",
                  phone: `(512) 555-${2000 + newHS.id}`,
                  active: true
                });
              }
              console.log(`  ✅ Added 3 locations in Austin`);
            } else if (system.name.includes("Dallas")) {
              await db.insert(locations).values({
                healthSystemId: newHS.id,
                name: `${newHS.name} Hospital`,
                locationType: "hospital",
                address: "7777 Forest Lane",
                city: "Dallas",
                state: "TX",
                zipCode: "75230",
                phone: "(972) 566-7000",
                active: true
              });
              console.log(`  ✅ Added location in Dallas`);
            }
          }
        } catch (error) {
          console.log(`  ⚠️  Skipped ${system.name} (may already exist)`);
        }
      }
    }
    
    // Now check locations again
    const updatedLocations = await db
      .select({
        id: locations.id,
        name: locations.name,
        city: locations.city,
        state: locations.state,
        healthSystemId: locations.healthSystemId,
        healthSystemName: healthSystems.name
      })
      .from(locations)
      .leftJoin(healthSystems, eq(locations.healthSystemId, healthSystems.id));
    
    console.log(`\n📍 Current locations (${updatedLocations.length} total):\n`);
    for (const loc of updatedLocations) {
      console.log(`- ${loc.name} in ${loc.city}, ${loc.state} (Health System: ${loc.healthSystemName || 'Unknown'})`);
    }
    
    console.log("\n✅ Data fix complete!");
    console.log("The location search should now work properly with multiple clinics available.");
    
    process.exit(0);
  } catch (error) {
    console.error("Error fixing health systems data:", error);
    process.exit(1);
  }
}

fixHealthSystemsData();