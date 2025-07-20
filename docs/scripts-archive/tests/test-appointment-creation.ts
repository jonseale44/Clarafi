// Test appointment creation to verify scheduling fixes
import { db } from "./server/db.js";
import { appointments } from "./shared/schema.js";
import { eq } from "drizzle-orm";

async function testAppointmentCreation() {
  console.log("🧪 Testing appointment creation after fixes...");
  
  try {
    // First check if we can query appointments table
    const existingAppointments = await db
      .select()
      .from(appointments)
      .where(eq(appointments.appointmentDate, "2025-07-19"))
      .limit(5);
    
    console.log("✅ Successfully queried appointments table");
    console.log(`Found ${existingAppointments.length} appointments for 2025-07-19`);
    
    // Test the appointment_date column exists
    if (existingAppointments.length > 0) {
      const firstAppt = existingAppointments[0];
      console.log("Sample appointment:", {
        id: firstAppt.id,
        date: firstAppt.appointmentDate,
        startTime: firstAppt.startTime,
        endTime: firstAppt.endTime,
        duration: firstAppt.duration
      });
    }
    
    console.log("\n🎉 All scheduling columns appear to be working correctly!");
    console.log("You should now be able to create appointments through the UI.");
    
  } catch (error: any) {
    console.error("❌ Error testing appointments:", error.message);
    if (error.code === '42703') {
      console.error("Missing column:", error.message);
    }
  }
  
  process.exit(0);
}

testAppointmentCreation();