import { db } from "./db.js";
import { healthSystems } from "@shared/schema";

async function addTestHealthSystems() {
  try {
    console.log("📍 Adding test health systems for better search functionality...\n");
    
    // Add test health systems
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
        subscriptionTier: 2,
        subscriptionStatus: 'active' as const,
        active: true
      },
      {
        name: "Hill Country Family Medicine - Hillsboro",
        systemType: "clinic",
        subscriptionTier: 1,
        subscriptionStatus: 'active' as const,
        active: true
      },
      {
        name: "Hillsboro Urgent Care",
        systemType: "urgent_care",
        subscriptionTier: 1,
        subscriptionStatus: 'active' as const,
        active: true
      }
    ];
    
    let added = 0;
    for (const system of testSystems) {
      try {
        const [newHS] = await db
          .insert(healthSystems)
          .values(system)
          .onConflictDoNothing()
          .returning();
        
        if (newHS) {
          console.log(`✅ Added health system: ${newHS.name} (ID: ${newHS.id})`);
          added++;
        } else {
          console.log(`⚠️  ${system.name} already exists`);
        }
      } catch (error) {
        console.log(`❌ Error adding ${system.name}: ${error.message}`);
      }
    }
    
    console.log(`\n✅ Added ${added} new health systems!`);
    console.log("The location search should now show more options.");
    
    process.exit(0);
  } catch (error) {
    console.error("Error adding health systems:", error);
    process.exit(1);
  }
}

addTestHealthSystems();