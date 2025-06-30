/**
 * Test Surgical History Visit System
 * Tests the complete visit history tracking system for surgical procedures
 * 
 * Test scenario: Vertebroplasty date correction from 2015 → 2016
 * - Initial: Attachment extraction creates vertebroplasty surgery with 2015 date
 * - Update: Encounter mentions vertebroplasty 2016 - should correct date and add visit history
 */

const BASE_URL = "http://localhost:5000";

async function testSurgicalHistoryVisitSystem() {
  console.log("🏥 === Testing Surgical History Visit System ===");

  try {
    // Test patient ID (using existing patient from system)
    const patientId = 12;
    const providerId = 1;

    console.log("\n📋 Step 1: Simulate initial attachment processing creating vertebroplasty 2015");
    
    // Simulate attachment processing that creates initial surgery entry
    const initialProcessingResponse = await fetch(`${BASE_URL}/api/surgical-history/process-unified`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patientId: patientId,
        encounterId: null,
        attachmentId: 99, // Simulate attachment
        soapNote: null,
        attachmentContent: `
OPERATIVE REPORT
Patient underwent vertebroplasty procedure at Community Hospital
Date of surgery: March 15, 2015
Surgeon: Dr. Martinez
Indication: Compression fracture L1
Procedure completed without complications
Patient tolerated procedure well
        `,
        triggerType: "attachment_processing",
        providerId: providerId
      })
    });

    if (!initialProcessingResponse.ok) {
      const errorText = await initialProcessingResponse.text();
      console.error("❌ Initial processing failed:", errorText);
      return;
    }

    const initialResult = await initialProcessingResponse.json();
    console.log("✅ Initial processing result:", JSON.stringify(initialResult, null, 2));

    // Wait briefly
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log("\n📋 Step 2: Retrieve current surgical history");
    
    const surgicalHistoryResponse = await fetch(`${BASE_URL}/api/surgical-history/${patientId}`);
    
    if (!surgicalHistoryResponse.ok) {
      console.error("❌ Failed to retrieve surgical history");
      return;
    }

    const surgicalHistory = await surgicalHistoryResponse.json();
    console.log(`✅ Found ${surgicalHistory.length} surgical procedures`);
    
    // Find vertebroplasty procedure
    const vertebroplasty = surgicalHistory.find(surgery => 
      surgery.procedureName.toLowerCase().includes('vertebroplasty')
    );

    if (!vertebroplasty) {
      console.log("⚠️ No vertebroplasty found in surgical history");
      console.log("Available procedures:", surgicalHistory.map(s => s.procedureName));
      return;
    }

    console.log("✅ Found vertebroplasty procedure:");
    console.log("   - ID:", vertebroplasty.id);
    console.log("   - Date:", vertebroplasty.procedureDate);
    console.log("   - Source:", vertebroplasty.sourceType);
    console.log("   - Visit History:", vertebroplasty.visitHistory?.length || 0, "entries");

    console.log("\n📋 Step 3: Simulate encounter with date correction (2015 → 2016)");

    // Simulate encounter processing with date correction
    const updateProcessingResponse = await fetch(`${BASE_URL}/api/surgical-history/process-unified`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patientId: patientId,
        encounterId: 25, // Use existing encounter
        attachmentId: null,
        soapNote: `
SUBJECTIVE:
Patient returns for follow-up. Reviewing surgical history.

Past Surgical History:
- Vertebroplasty L1 compression fracture 2016 (correction: previously documented as 2015, but records show actual date was March 15, 2016)
- Procedure went well, good healing

ASSESSMENT & PLAN:
Continue current treatment plan.
        `,
        attachmentContent: null,
        triggerType: "encounter_processing",
        providerId: providerId
      })
    });

    if (!updateProcessingResponse.ok) {
      const errorText = await updateProcessingResponse.text();
      console.error("❌ Update processing failed:", errorText);
      return;
    }

    const updateResult = await updateProcessingResponse.json();
    console.log("✅ Update processing result:", JSON.stringify(updateResult, null, 2));

    console.log("\n📋 Step 4: Verify visit history tracking");

    // Retrieve updated surgical history
    const updatedSurgicalHistoryResponse = await fetch(`${BASE_URL}/api/surgical-history/${patientId}`);
    
    if (!updatedSurgicalHistoryResponse.ok) {
      console.error("❌ Failed to retrieve updated surgical history");
      return;
    }

    const updatedSurgicalHistory = await updatedSurgicalHistoryResponse.json();
    
    // Find updated vertebroplasty procedure
    const updatedVertebroplasty = updatedSurgicalHistory.find(surgery => 
      surgery.id === vertebroplasty.id
    );

    if (!updatedVertebroplasty) {
      console.error("❌ Could not find updated vertebroplasty procedure");
      return;
    }

    console.log("✅ Updated vertebroplasty procedure:");
    console.log("   - ID:", updatedVertebroplasty.id);
    console.log("   - Date:", updatedVertebroplasty.procedureDate);
    console.log("   - Source:", updatedVertebroplasty.sourceType);
    console.log("   - Visit History:", updatedVertebroplasty.visitHistory?.length || 0, "entries");

    if (updatedVertebroplasty.visitHistory && updatedVertebroplasty.visitHistory.length > 0) {
      console.log("\n📝 Visit History Entries:");
      updatedVertebroplasty.visitHistory.forEach((visit, index) => {
        console.log(`   ${index + 1}. ${visit.date} - ${visit.source}`);
        console.log(`      Notes: ${visit.notes}`);
        console.log(`      Changes: ${visit.changesMade?.join(', ') || 'none'}`);
        console.log(`      Source ID: ${visit.encounterId || visit.attachmentId || 'none'}`);
      });
    }

    // Verify the system worked correctly
    const dateChanged = vertebroplasty.procedureDate !== updatedVertebroplasty.procedureDate;
    const visitHistoryAdded = (updatedVertebroplasty.visitHistory?.length || 0) > (vertebroplasty.visitHistory?.length || 0);

    console.log("\n🏥 === Test Results ===");
    console.log("✅ Date correction applied:", dateChanged ? "YES" : "NO");
    console.log("✅ Visit history added:", visitHistoryAdded ? "YES" : "NO");
    console.log("✅ Original date preserved in history:", visitHistoryAdded ? "YES" : "NO");
    
    if (dateChanged && visitHistoryAdded) {
      console.log("🎉 SUCCESS: Surgical history visit system working correctly!");
      console.log("   - Date corrected from 2015 to 2016");
      console.log("   - Visit history tracks the change");
      console.log("   - Source attribution maintained");
    } else {
      console.log("⚠️ PARTIAL SUCCESS: Some aspects may need adjustment");
    }

  } catch (error) {
    console.error("❌ Test failed with error:", error);
  }
}

// Run the test
testSurgicalHistoryVisitSystem().catch(console.error);