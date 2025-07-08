import { db } from "./server/db.js";
import { vitals } from "./shared/schema.js";
import { eq } from "drizzle-orm";

async function testVitalsSave() {
  try {
    console.log("=== TESTING VITALS SAVE ===");
    
    // Create a test vital
    const testVital = {
      patientId: 13,
      encounterId: null,
      recordedAt: new Date('2024-01-01'),
      systolicBp: 120,
      diastolicBp: 80,
      heartRate: 70,
      temperature: 98.6,
      respiratoryRate: 16,
      oxygenSaturation: 98,
      weight: 80,
      height: 170,
      bmi: 27.7,
      sourceType: "manual" as const,
      sourceConfidence: "1.00",
      sourceNotes: "Test vital for debugging",
      extractedFromAttachmentId: null,
      enteredBy: 5,
      parsedFromText: false,
      originalText: null,
      alerts: null
    };
    
    console.log("Attempting to insert test vital...");
    console.log("Test vital data:", testVital);
    
    const [insertedVital] = await db.insert(vitals).values([testVital]).returning();
    
    console.log("✅ Test vital saved successfully!");
    console.log("Inserted vital ID:", insertedVital.id);
    
    // Query back
    const savedVitals = await db.select().from(vitals).where(eq(vitals.patientId, 13));
    console.log(`\n✅ Total vitals for patient 13: ${savedVitals.length}`);
    
  } catch (error: any) {
    console.error("❌ ERROR saving test vital:", error);
    console.error("Error code:", error.code);
    console.error("Error detail:", error.detail);
    console.error("Error constraint:", error.constraint);
  } finally {
    process.exit(0);
  }
}

testVitalsSave();