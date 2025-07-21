
import { db } from "./server/db.js";
import { externalLabs } from "@shared/schema";

async function createExternalLabRecords() {
  console.log("🧪 [LabFix] Creating missing external lab records...");
  
  try {
    // Check if external lab with ID 1 exists
    const existingLabs = await db.select().from(externalLabs);
    console.log(`🧪 [LabFix] Found ${existingLabs.length} existing external labs`);
    
    if (!existingLabs.some(lab => lab.id === 1)) {
      // Create default external lab record
      await db.insert(externalLabs).values({
        id: 1,
        labName: "Mock Lab Service",
        labIdentifier: "MOCK001",
        integrationType: "mock",
        supportedTests: ["CBC", "CMP", "Lipase", "A1C"],
        turnaroundTimes: {
          "routine": "2-4 hours",
          "urgent": "1 hour",
          "stat": "30 minutes"
        },
        active: true
      });
      
      console.log("✅ [LabFix] Created Mock Lab Service with ID 1");
    }
    
    // Also create LabCorp and Quest as common external labs
    if (!existingLabs.some(lab => lab.labName === "LabCorp")) {
      await db.insert(externalLabs).values({
        labName: "LabCorp",
        labIdentifier: "LABCORP001",
        integrationType: "hl7",
        supportedTests: ["CBC", "CMP", "TSH", "Lipid Panel"],
        turnaroundTimes: {
          "routine": "1-2 days",
          "urgent": "4-6 hours",
          "stat": "2 hours"
        },
        active: true
      });
      
      console.log("✅ [LabFix] Created LabCorp external lab");
    }
    
    if (!existingLabs.some(lab => lab.labName === "Quest Diagnostics")) {
      await db.insert(externalLabs).values({
        labName: "Quest Diagnostics",
        labIdentifier: "QUEST001", 
        integrationType: "hl7",
        supportedTests: ["CBC", "CMP", "A1C", "Urinalysis"],
        turnaroundTimes: {
          "routine": "1-2 days",
          "urgent": "4-6 hours", 
          "stat": "2 hours"
        },
        active: true
      });
      
      console.log("✅ [LabFix] Created Quest Diagnostics external lab");
    }
    
    console.log("✅ [LabFix] External lab setup complete");
    
  } catch (error) {
    console.error("❌ [LabFix] Failed to create external lab records:", error);
  }
  
  process.exit(0);
}

createExternalLabRecords();
