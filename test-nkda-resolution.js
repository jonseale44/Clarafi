/**
 * Test NKDA Resolution System
 * Simple test to trigger allergy processing via API call
 */

import { UnifiedAllergyParser } from './server/unified-allergy-parser.js';

async function testNKDAResolution() {
  console.log("🧪 [Test] Starting NKDA Resolution Test");
  
  const parser = new UnifiedAllergyParser();
  
  // Simulate patient 14 existing allergies (from console logs)
  const existingAllergies = [
    {
      id: 26,
      allergen: "No Known Drug Allergies",
      status: "active",
      sourceType: "attachment_extracted",
      extractedFromAttachmentId: 28
    },
    {
      id: 27,
      allergen: "Penicillin",
      reaction: "rash",
      severity: "moderate",
      status: "active",
      sourceType: "attachment_extracted", 
      extractedFromAttachmentId: 29
    }
  ];

  // Test content that should resolve NKDA
  const testContent = `
ALLERGIES: 
Patient reports allergy to Penicillin - causes rash and hives.
No other known drug allergies.
  `;

  const patientContext = `
Patient: Johnny McRae (ID: 14)
Previous Allergies: NKDA documented in earlier attachment
  `;

  try {
    console.log("🔍 [Test] Calling processAllergiesWithGPT with NKDA resolution scenario");
    
    const result = await parser.processAllergiesWithGPT(
      existingAllergies,
      testContent,
      patientContext,
      "test_trigger",
      undefined, // encounterId
      29        // attachmentId - simulating PCN allergy attachment
    );

    console.log("🎯 [Test] ===== FINAL GPT RESULT =====");
    console.log("🎯 [Test] Number of changes:", result.length);
    result.forEach((change, index) => {
      console.log(`🎯 [Test] Change ${index + 1}:`, {
        action: change.action,
        allergen: change.allergen,
        status: change.status,
        existingRecordId: change.existingRecordId,
        temporalConflictResolution: change.temporalConflictResolution
      });
    });
    console.log("🎯 [Test] ===== END RESULT =====");

  } catch (error) {
    console.error("🚨 [Test] Error in NKDA resolution test:", error);
  }
}

// Run the test
testNKDAResolution().catch(console.error);