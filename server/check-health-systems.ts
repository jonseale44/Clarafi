import { db } from "./db";
import { healthSystems, locations } from "@shared/schema";
import { sql } from "drizzle-orm";

async function checkHealthSystems() {
  try {
    console.log("🔍 Checking all health systems in database...\n");
    
    // Get all health systems
    const allHealthSystems = await db
      .select()
      .from(healthSystems)
      .orderBy(healthSystems.name);
    
    console.log(`Found ${allHealthSystems.length} health systems:\n`);
    
    for (const hs of allHealthSystems) {
      console.log(`ID: ${hs.id}`);
      console.log(`Name: ${hs.name}`);
      console.log(`Type: ${hs.systemType || 'N/A'}`);
      console.log(`Subscription Status: ${hs.subscriptionStatus || 'N/A'}`);
      console.log(`Subscription Tier: ${hs.subscriptionTier || 'N/A'}`);
      console.log(`Active: ${hs.active}`);
      
      // Get locations for this health system
      try {
        const hsLocations = await db
          .select()
          .from(locations)
          .where(sql`${locations.healthSystemId} = ${hs.id}`)
          .orderBy(locations.name);
        
        console.log(`Locations (${hsLocations.length}):`);
        for (const loc of hsLocations) {
          console.log(`  - ${loc.name} (${loc.city}, ${loc.state})`);
        }
      } catch (locError) {
        console.log(`Locations: Error querying - ${locError.message}`);
      }
      
      console.log('----------------------------\n');
    }
    
    // Check subscription status distribution
    const statusCounts = await db
      .select({
        status: healthSystems.subscriptionStatus,
        count: sql<number>`count(*)`.as('count')
      })
      .from(healthSystems)
      .groupBy(healthSystems.subscriptionStatus);
    
    console.log('Subscription Status Distribution:');
    for (const status of statusCounts) {
      console.log(`  ${status.status || 'NULL'}: ${status.count}`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error("Error checking health systems:", error);
    process.exit(1);
  }
}

checkHealthSystems();