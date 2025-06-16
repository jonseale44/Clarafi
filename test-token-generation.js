/**
 * Test Token Generation - Trigger real AI processing to populate dashboard
 */

const testSOAPNote = `
SUBJECTIVE:
Ms. Johnson is a 65-year-old female with Type 2 diabetes and hypertension presenting for routine follow-up. She reports her blood sugars have been running high lately, averaging 180-220 mg/dL. She admits to poor dietary compliance over the holidays. Reports occasional headaches and feels her blood pressure might be elevated.

OBJECTIVE:
Vital Signs: BP 158/92, HR 78, RR 16, Temp 98.6°F
General: Alert, oriented, appears well
HEENT: PERRL, no retinopathy noted
Cardiovascular: Regular rate and rhythm, no murmurs
Lungs: Clear to auscultation bilaterally

ASSESSMENT:
1. Type 2 diabetes mellitus, uncontrolled (E11.65)
2. Essential hypertension, uncontrolled (I10)

PLAN:
1. Increase metformin to 1000mg three times daily
2. Start lisinopril 10mg daily
3. Order HbA1c and comprehensive metabolic panel
4. Follow up in 3 months
`;

async function triggerAIProcessing() {
  console.log('Testing AI processing systems to generate token usage...\n');
  
  const baseURL = 'http://localhost:5000/api';
  const sessionCookie = 'connect.sid=s%3Al3uU_jT-MS-yvNU0ffeCkO3MC0LcnIJK.P5JicL2rUYLYwYlTGvTHPRlDgS5ebRvjzioVSyvchTM';
  
  try {
    // Test CPT Extractor - should generate real OpenAI API calls
    console.log('1. Testing CPT Extractor...');
    const cptResponse = await fetch(`${baseURL}/patients/64/encounters/169/extract-cpt-codes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': sessionCookie
      },
      body: JSON.stringify({
        soapNote: testSOAPNote
      })
    });
    
    if (cptResponse.ok) {
      const cptResult = await cptResponse.json();
      console.log(`✅ CPT Extractor: Found ${cptResult.cptCodes?.length || 0} codes`);
    } else {
      console.log(`❌ CPT Extractor failed: ${cptResponse.status}`);
    }
    
    // Wait a moment for token tracking
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test Medical Problems Delta
    console.log('\n2. Testing Medical Problems Delta...');
    const problemsResponse = await fetch(`${baseURL}/enhanced-medical-problems/64/process-delta`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': sessionCookie
      },
      body: JSON.stringify({
        soapNote: testSOAPNote,
        encounterId: 169,
        providerId: 2
      })
    });
    
    if (problemsResponse.ok) {
      const problemsResult = await problemsResponse.json();
      console.log(`✅ Medical Problems: ${problemsResult.changes?.length || 0} changes identified`);
    } else {
      console.log(`❌ Medical Problems failed: ${problemsResponse.status}`);
    }
    
    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check token dashboard
    console.log('\n3. Checking Token Dashboard...');
    const dashboardResponse = await fetch(`${baseURL}/token-usage/dashboard`, {
      headers: { 'Cookie': sessionCookie }
    });
    
    if (dashboardResponse.ok) {
      const dashboard = await dashboardResponse.json();
      console.log('\n📊 TOKEN USAGE DASHBOARD:');
      console.log(`Total Cost: $${dashboard.systemOverview.totalCosts.toFixed(6)}`);
      console.log(`Total Tokens: ${dashboard.systemOverview.totalTokens.toLocaleString()}`);
      console.log(`API Calls: ${dashboard.systemOverview.totalCalls}`);
      
      if (dashboard.serviceBreakdown.length > 0) {
        console.log('\nService Breakdown:');
        dashboard.serviceBreakdown.forEach(service => {
          console.log(`  ${service.service}: $${service.totalCost.toFixed(6)} (${service.totalCalls} calls)`);
        });
      } else {
        console.log('No service data yet - token tracking may need time to register');
      }
    }
    
  } catch (error) {
    console.error('Error testing AI systems:', error.message);
  }
}

triggerAIProcessing();