/**
 * Test Medication Extraction Fix
 * Now that encounter_id is nullable, test medication extraction from attachment
 */

async function testMedicationExtraction() {
  console.log('🧪 [Test] Starting medication extraction test for attachment 34');
  
  try {
    // Get the attachment content
    const attachmentResponse = await fetch('http://localhost:5000/api/attachments/34/content');
    const attachmentData = await attachmentResponse.json();
    
    console.log('📄 [Test] Attachment data retrieved:', {
      id: attachmentData.id,
      filename: attachmentData.filename,
      hasContent: !!attachmentData.extractedText
    });
    
    // Trigger medication processing directly
    const medicationResponse = await fetch('http://localhost:5000/api/attachments/34/process-medications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (medicationResponse.ok) {
      const result = await medicationResponse.json();
      console.log('✅ [Test] Medication processing successful:', result);
    } else {
      console.log('❌ [Test] Medication processing failed:', medicationResponse.status);
    }
    
    // Check if medications were created
    const medicationsResponse = await fetch('http://localhost:5000/api/patients/19/medications');
    const medications = await medicationsResponse.json();
    
    console.log('💊 [Test] Medications found:', medications.length);
    medications.forEach(med => {
      console.log(`  - ${med.medicationName} ${med.dosage} (source: ${med.sourceType})`);
    });
    
  } catch (error) {
    console.error('💥 [Test] Error:', error);
  }
}

// Run the test
testMedicationExtraction();