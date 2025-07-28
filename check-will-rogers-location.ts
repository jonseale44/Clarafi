import { db } from "./server/db";
import { locations, healthSystems } from "./shared/schema";
import { eq } from "drizzle-orm";

async function checkWillRogersLocation() {
  try {
    // Get Will Rogers health system
    const [healthSystem] = await db.select()
      .from(healthSystems)
      .where(eq(healthSystems.name, "Will Rogers Clinic "));
    
    if (!healthSystem) {
      console.log("Will Rogers Clinic health system not found");
      return;
    }
    
    console.log("Health System:", healthSystem);
    
    // Get all locations for this health system
    const clinicLocations = await db.select()
      .from(locations)
      .where(eq(locations.healthSystemId, healthSystem.id));
    
    console.log("\nLocations for Will Rogers Clinic:");
    console.log(JSON.stringify(clinicLocations, null, 2));
    
    if (clinicLocations.length > 0) {
      const location = clinicLocations[0];
      console.log("\nChecking location fields:");
      console.log("- address:", location.address);
      console.log("- city:", location.city);
      console.log("- state:", location.state);
      console.log("- zip_code:", location.zip_code);
      console.log("- phone:", location.phone);
    }
    
  } catch (error) {
    console.error("Error:", error);
  } finally {
    process.exit(0);
  }
}

checkWillRogersLocation();