/**
 * Test Medication Visit History with Ultra-Concise Format
 * Tests document date extraction and visit history creation with dose changes
 */

import fetch from 'node-fetch';

const API_URL = 'http://localhost:3000/api';
const ATTACHMENT_ID = 45; // Same attachment we used before
const PATIENT_ID = 14;
const ENCOUNTER_ID = 31;
const PROVIDER_ID = 1;

// Sample H&P document text with medication history
const sampleText = `
HOSPITAL ADMISSION H&P

Date: June 12, 2010

MEDICATIONS:
1. Citalopram 20mg PO daily for depression - started 2008
2. Levothyroxine 100mcg PO daily for hypothyroidism
3. Atenolol 50mg PO daily for hypertension
4. Recently increased citalopram to 40mg daily due to worsening depression (May 2010)

HISTORY:
Patient reports taking medications as prescribed. The citalopram dose was increased from 20mg to 40mg in May 2010 after discussing with psychiatrist due to persistent depressive symptoms.
`;

async function processAndCheckMedications() {
  try {
    console.log('🔬 Testing Medication Visit History Processing...\n');
    
    // First, let's check existing medications
    const existingMedsResponse = await fetch(
      `${API_URL}/patients/${PATIENT_ID}/medications-enhanced`,
      {
        headers: {
          'Cookie': 'connect.sid=s%3AMTpYNYT8rBkWcnLlfWD94KY28yk1AZXG.%2FKjNADnnf9wkMcZ8FYEOmtmVgKoA91%2BDgV0e8qBBxmE'
        }
      }
    );
    const existingMeds = await existingMedsResponse.json();
    console.log('📋 Existing medications count:', existingMeds.medications?.length || 0);
    
    // Show existing citalopram if present
    const existingCitalopram = existingMeds.medications?.find(med => 
      med.medicationName.toLowerCase().includes('citalopram')
    );
    if (existingCitalopram) {
      console.log('\n📊 Existing Citalopram:');
      console.log(`   Name: ${existingCitalopram.medicationName}`);
      console.log(`   Dosage: ${existingCitalopram.dosage}`);
      console.log(`   Visit History Count: ${existingCitalopram.visitHistory?.length || 0}`);
      if (existingCitalopram.visitHistory?.length > 0) {
        console.log('   Recent Visit History:');
        existingCitalopram.visitHistory.slice(0, 3).forEach(visit => {
          console.log(`     - ${visit.encounterDate}: ${visit.notes}`);
        });
      }
    }
    
    // Process attachment medications
    console.log('\n🔄 Processing attachment medications...');
    const response = await fetch(
      `${API_URL}/medications/process-attachment`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'connect.sid=s%3AMTpYNYT8rBkWcnLlfWD94KY28yk1AZXG.%2FKjNADnnf9wkMcZ8FYEOmtmVgKoA91%2BDgV0e8qBBxmE'
        },
        body: JSON.stringify({
          attachmentId: ATTACHMENT_ID,
          patientId: PATIENT_ID,
          encounterId: ENCOUNTER_ID,
          extractedText: sampleText,
          providerId: PROVIDER_ID
        })
      }
    );
    
    const result = await response.json();
    console.log('✅ Processing complete:', result.medicationsProcessed, 'medications processed');
    
    // Check updated medications
    const updatedMedsResponse = await fetch(
      `${API_URL}/patients/${PATIENT_ID}/medications-enhanced`,
      {
        headers: {
          'Cookie': 'connect.sid=s%3AMTpYNYT8rBkWcnLlfWD94KY28yk1AZXG.%2FKjNADnnf9wkMcZ8FYEOmtmVgKoA91%2BDgV0e8qBBxmE'
        }
      }
    );
    const updatedMeds = await updatedMedsResponse.json();
    
    // Check citalopram with visit history
    const updatedCitalopram = updatedMeds.medications?.find(med => 
      med.medicationName.toLowerCase().includes('citalopram')
    );
    
    if (updatedCitalopram) {
      console.log('\n📊 Updated Citalopram with Visit History:');
      console.log(`   Name: ${updatedCitalopram.medicationName}`);
      console.log(`   Current Dosage: ${updatedCitalopram.dosage}`);
      console.log(`   Visit History Count: ${updatedCitalopram.visitHistory?.length || 0}`);
      
      if (updatedCitalopram.visitHistory?.length > 0) {
        console.log('\n   📅 Complete Visit History:');
        updatedCitalopram.visitHistory.forEach((visit, index) => {
          console.log(`   ${index + 1}. Date: ${visit.encounterDate}`);
          console.log(`      Notes: ${visit.notes}`);
          console.log(`      Confidence: ${visit.confidence ? Math.round(visit.confidence * 100) + '%' : 'N/A'}`);
          console.log(`      Source: ${visit.source}`);
          if (visit.extractedData) {
            console.log(`      Extracted Dosage: ${visit.extractedData.dosage || 'N/A'}`);
          }
          console.log('');
        });
      }
    }
    
    // Show all medications with visit history
    console.log('\n📋 All Medications with Visit History:');
    updatedMeds.medications?.forEach(med => {
      if (med.visitHistory?.length > 0) {
        console.log(`\n   ${med.medicationName} ${med.dosage}:`);
        med.visitHistory.slice(0, 2).forEach(visit => {
          console.log(`     - ${visit.encounterDate}: ${visit.notes}`);
        });
      }
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      const text = await error.response.text();
      console.error('Response:', text);
    }
  }
}

processAndCheckMedications();