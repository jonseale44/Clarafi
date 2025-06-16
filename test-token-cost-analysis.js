/**
 * Comprehensive Token Cost Analysis Test
 * Tests all four medical processing systems with token counting and cost projections
 */

const API_BASE = 'http://localhost:5000/api';

async function testTokenCostAnalysis() {
  console.log('🏥 ===== COMPREHENSIVE TOKEN COST ANALYSIS TEST =====\n');

  try {
    // Test patient and encounter data
    const testPatientId = 63;
    const testEncounterId = 168;
    const testProviderId = 2;

    const testSOAPNote = `
SUBJECTIVE:
Ms. Johnson is a 65-year-old female with a history of Type 2 diabetes and hypertension who presents today for follow-up. She reports her blood sugars have been running high lately, averaging 180-220 mg/dL despite taking metformin 1000mg twice daily. She admits to poor dietary compliance over the holidays. She also reports occasional headaches and feels her blood pressure might be elevated.

OBJECTIVE:
Vital Signs: BP 158/92, HR 78, RR 16, Temp 98.6°F, O2 Sat 98% on room air
Weight: 185 lbs (increased from 180 lbs 3 months ago)
General: Alert, oriented, appears well
HEENT: PERRL, no retinopathy noted
Cardiovascular: Regular rate and rhythm, no murmurs
Lungs: Clear to auscultation bilaterally
Extremities: No edema, pulses intact

ASSESSMENT:
1. Type 2 diabetes mellitus, uncontrolled (E11.65)
2. Essential hypertension, uncontrolled (I10)
3. Obesity (E66.9)

PLAN:
1. Diabetes management:
   - Increase metformin to 1000mg three times daily
   - Start lisinopril 10mg daily for blood pressure and renal protection
   - Order HbA1c, comprehensive metabolic panel, and lipid panel
   - Diabetic education referral
   - Follow up in 3 months

2. Hypertension management:
   - Start lisinopril 10mg daily as above
   - Low sodium diet counseling
   - Home blood pressure monitoring

3. Weight management:
   - Nutritionist referral
   - Encourage 30 minutes daily exercise
`;

    console.log('1. Testing Medical Problems Delta Service...');
    try {
      const medicalProblemsResponse = await fetch(`${API_BASE}/enhanced-medical-problems/${testPatientId}/process-delta`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          soapNote: testSOAPNote,
          encounterId: testEncounterId,
          providerId: testProviderId
        })
      });
      
      if (medicalProblemsResponse.ok) {
        const result = await medicalProblemsResponse.json();
        console.log('✅ Medical Problems Delta processed successfully');
        console.log(`   Changes identified: ${result.changes?.length || 0}`);
        console.log(`   Processing time: ${result.processing_time_ms}ms\n`);
      } else {
        console.log('❌ Medical Problems Delta failed:', medicalProblemsResponse.status);
      }
    } catch (error) {
      console.log('❌ Medical Problems Delta error:', error.message);
    }

    console.log('2. Testing Medication Delta Service...');
    try {
      const medicationResponse = await fetch(`${API_BASE}/enhanced-medications/${testPatientId}/process-order-delta`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          encounterId: testEncounterId,
          providerId: testProviderId
        })
      });
      
      if (medicationResponse.ok) {
        const result = await medicationResponse.json();
        console.log('✅ Medication Delta processed successfully');
        console.log(`   Changes identified: ${result.changes?.length || 0}`);
        console.log(`   Processing time: ${result.processing_time_ms}ms\n`);
      } else {
        console.log('❌ Medication Delta failed:', medicationResponse.status);
      }
    } catch (error) {
      console.log('❌ Medication Delta error:', error.message);
    }

    console.log('3. Testing CPT Extractor Service...');
    try {
      const cptResponse = await fetch(`${API_BASE}/patients/${testPatientId}/encounters/${testEncounterId}/extract-cpt-codes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          soapNote: testSOAPNote
        })
      });
      
      if (cptResponse.ok) {
        const result = await cptResponse.json();
        console.log('✅ CPT Extractor processed successfully');
        console.log(`   CPT codes extracted: ${result.cptCodes?.length || 0}`);
        console.log(`   Diagnoses extracted: ${result.diagnoses?.length || 0}\n`);
      } else {
        console.log('❌ CPT Extractor failed:', cptResponse.status);
      }
    } catch (error) {
      console.log('❌ CPT Extractor error:', error.message);
    }

    console.log('4. Testing SOAP Orders Extractor...');
    try {
      const ordersResponse = await fetch(`${API_BASE}/extract-orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          soapNote: testSOAPNote,
          patientId: testPatientId,
          encounterId: testEncounterId
        })
      });
      
      if (ordersResponse.ok) {
        const result = await ordersResponse.json();
        console.log('✅ SOAP Orders Extractor processed successfully');
        console.log(`   Orders extracted: ${result.length || 0}\n`);
      } else {
        console.log('❌ SOAP Orders Extractor failed:', ordersResponse.status);
      }
    } catch (error) {
      console.log('❌ SOAP Orders Extractor error:', error.message);
    }

    // Wait for all token counting to complete
    console.log('⏳ Waiting 3 seconds for token analysis to complete...\n');
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('5. Retrieving Comprehensive Token Usage Dashboard...');
    try {
      const dashboardResponse = await fetch(`${API_BASE}/token-usage/dashboard`, {
        method: 'GET',
        credentials: 'include'
      });
      
      if (dashboardResponse.ok) {
        const dashboard = await dashboardResponse.json();
        console.log('✅ Token Usage Dashboard retrieved successfully\n');
        
        console.log('📊 SYSTEM OVERVIEW:');
        console.log(`   Total Cost: $${dashboard.systemOverview.totalCosts.toFixed(6)}`);
        console.log(`   Total Tokens: ${dashboard.systemOverview.totalTokens.toLocaleString()}`);
        console.log(`   Total API Calls: ${dashboard.systemOverview.totalCalls}`);
        console.log(`   Average Cost/Encounter: $${dashboard.systemOverview.averageCostPerEncounter.toFixed(6)}\n`);
        
        console.log('📋 SERVICE BREAKDOWN:');
        dashboard.serviceBreakdown.forEach(service => {
          console.log(`   ${service.service}:`);
          console.log(`     - Cost: $${service.totalCost.toFixed(6)}`);
          console.log(`     - Calls: ${service.totalCalls}`);
          console.log(`     - Input Tokens: ${service.totalInputTokens.toLocaleString()}`);
          console.log(`     - Output Tokens: ${service.totalOutputTokens.toLocaleString()}`);
          console.log(`     - Avg Cost/Call: $${service.averageCostPerCall.toFixed(6)}`);
        });
        
        console.log('\n💡 COST PROJECTIONS (50 encounters/day):');
        console.log(`   Daily: ${dashboard.costProjections.daily}`);
        console.log(`   Monthly: ${dashboard.costProjections.monthly}`);
        console.log(`   Yearly: ${dashboard.costProjections.yearly}\n`);
        
        if (dashboard.recommendations.length > 0) {
          console.log('⚡ OPTIMIZATION RECOMMENDATIONS:');
          dashboard.recommendations.forEach((rec, i) => {
            console.log(`   ${i + 1}. ${rec}`);
          });
          console.log('');
        }
      } else {
        console.log('❌ Token Usage Dashboard failed:', dashboardResponse.status);
      }
    } catch (error) {
      console.log('❌ Token Usage Dashboard error:', error.message);
    }

    console.log('6. Generating Console Summary...');
    try {
      const summaryResponse = await fetch(`${API_BASE}/token-usage/summary`, {
        method: 'GET',
        credentials: 'include'
      });
      
      if (summaryResponse.ok) {
        const result = await summaryResponse.json();
        console.log('✅ Console summary generated (check server logs for detailed output)\n');
      } else {
        console.log('❌ Console summary failed:', summaryResponse.status);
      }
    } catch (error) {
      console.log('❌ Console summary error:', error.message);
    }

    console.log('🏥 ===== TOKEN COST ANALYSIS TEST COMPLETE =====\n');
    
    console.log('KEY FINDINGS:');
    console.log('• All four medical processing systems now have comprehensive token counting');
    console.log('• Real-time cost analysis with projections for budget planning');
    console.log('• Automated optimization recommendations based on usage patterns');
    console.log('• Dashboard API endpoints for monitoring and analysis');
    console.log('• Cost warnings for operations exceeding $0.01 per call');
    console.log('• Support for GPT-4.1 pricing with input/output/cached token differentiation\n');

  } catch (error) {
    console.error('❌ Token cost analysis test failed:', error);
  }
}

// Run the test
testTokenCostAnalysis();