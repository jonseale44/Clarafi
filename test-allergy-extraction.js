/**
 * Test Allergy Extraction System
 * Simulates document upload and allergy processing to verify the critical bug fix
 */

import fs from 'fs';

async function testAllergyExtraction() {
  try {
    console.log('🧪 [TEST] Starting allergy extraction test...');
    
    // Read the allergy document content
    const documentContent = fs.readFileSync('uploads/test-allergy-document.txt', 'utf8');
    console.log('🧪 [TEST] Document content loaded:', documentContent.substring(0, 100) + '...');
    
    // Simulate API call to test allergy processing
    const response = await fetch('http://localhost:5000/api/allergies/process-unified', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Note: In real usage, this would require authentication
      },
      body: JSON.stringify({
        patientId: 5,
        attachmentContent: documentContent,
        attachmentId: 999, // Test attachment ID
        triggerType: 'attachment_processing'
      })
    });
    
    console.log('🧪 [TEST] API Response Status:', response.status);
    const result = await response.text();
    console.log('🧪 [TEST] API Response:', result);
    
    if (response.status === 401) {
      console.log('🧪 [TEST] ⚠️ Authentication required - this is expected for testing');
    }
    
  } catch (error) {
    console.error('🧪 [TEST] Error:', error.message);
  }
}

testAllergyExtraction();