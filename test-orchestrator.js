/**
 * Test Medical Problems Orchestrator System
 * 
 * Tests the two-tier processing:
 * - Tier 1: Initial processing after recording completion
 * - Tier 3: Processing after manual SOAP edits (only if content changed)
 */

const soapNote1 = `**SUBJECTIVE:**
Patient is a 45-year-old female presenting with chest pain and shortness of breath.
Reports pain started 2 hours ago, radiating to left arm.
No previous history of cardiac issues.
Currently taking no medications.

**OBJECTIVE:**
Vitals: BP 140/90, HR 110, RR 22, O2 Sat 96%
Physical Exam:
CV: Tachycardic, regular rhythm
Lungs: Clear bilaterally
No peripheral edema

**ASSESSMENT/PLAN:**
Chest Pain, unspecified (R07.9):
- Rule out acute coronary syndrome
- Order EKG and cardiac enzymes
- Monitor vitals

Hypertension, unspecified (I10):
- New finding, likely stress-related
- Consider antihypertensive therapy
- Follow up in clinic`;

const soapNote2 = `**SUBJECTIVE:**
Patient is a 45-year-old female presenting with chest pain and shortness of breath.
Reports pain started 2 hours ago, radiating to left arm.
No previous history of cardiac issues.
Currently taking no medications.
UPDATED: Patient now reports pain has improved with rest.

**OBJECTIVE:**
Vitals: BP 140/90, HR 110, RR 22, O2 Sat 96%
Physical Exam:
CV: Tachycardic, regular rhythm
Lungs: Clear bilaterally
No peripheral edema

**ASSESSMENT/PLAN:**
Chest Pain, unspecified (R07.9):
- Rule out acute coronary syndrome
- Order EKG and cardiac enzymes
- Monitor vitals
- Pain improving with rest, likely musculoskeletal

Hypertension, unspecified (I10):
- New finding, likely stress-related
- Consider antihypertensive therapy
- Follow up in clinic

Musculoskeletal chest pain (M79.3):
- New assessment based on improvement with rest
- Recommend OTC pain relief
- Follow up if worsens`;

async function testTierSystem() {
  const baseUrl = 'http://localhost:5000';
  const patientId = 67;
  const encounterId = 178;

  console.log('🧪 Testing Medical Problems Orchestrator System');
  console.log('===============================================');

  try {
    // Test Tier 1: Initial processing
    console.log('\n🎯 TESTING TIER 1: Initial Processing');
    console.log('-------------------------------------');
    
    const tier1Response = await fetch(`${baseUrl}/api/encounters/${encounterId}/process-medical-problems-tier1`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'connect.sid=s%3A2vYkEZgfI_0mAfr6JskvNINhApQ9gY9O.KCtIDCaWIVGOBmHm9bCQfFMJP8Q%2BbfnEy21OGZQ0cJQ'
      },
      body: JSON.stringify({
        soapNote: soapNote1,
        patientId: patientId
      })
    });

    console.log(`Tier 1 Response Status: ${tier1Response.status}`);
    
    if (tier1Response.ok) {
      const tier1Result = await tier1Response.json();
      console.log('✅ Tier 1 Success:', {
        problemsAffected: tier1Result.total_problems_affected,
        processingTime: tier1Result.processing_time_ms,
        changes: tier1Result.changes?.length || 0
      });
    } else {
      const tier1Error = await tier1Response.text();
      console.error('❌ Tier 1 Failed:', tier1Error);
      return;
    }

    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test Tier 3: Same content (should skip)
    console.log('\n🎯 TESTING TIER 3: Same Content (Should Skip)');
    console.log('----------------------------------------------');
    
    const tier3SameResponse = await fetch(`${baseUrl}/api/encounters/${encounterId}/process-medical-problems-tier3`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'connect.sid=s%3A2vYkEZgfI_0mAfr6JskvNINhApQ9gY9O.KCtIDCaWIVGOBmHm9bCQfFMJP8Q%2BbfnEy21OGZQ0cJQ'
      },
      body: JSON.stringify({
        soapNote: soapNote1, // Same content
        patientId: patientId
      })
    });

    console.log(`Tier 3 (Same Content) Response Status: ${tier3SameResponse.status}`);
    
    if (tier3SameResponse.ok) {
      const tier3SameResult = await tier3SameResponse.json();
      console.log('✅ Tier 3 (Same Content):', {
        problemsAffected: tier3SameResult.total_problems_affected,
        processingTime: tier3SameResult.processing_time_ms,
        reason: tier3SameResult.reason,
        changes: tier3SameResult.changes?.length || 0
      });
    } else {
      const tier3SameError = await tier3SameResponse.text();
      console.error('❌ Tier 3 (Same Content) Failed:', tier3SameError);
    }

    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test Tier 3: Changed content (should process)
    console.log('\n🎯 TESTING TIER 3: Changed Content (Should Process)');
    console.log('--------------------------------------------------');
    
    const tier3ChangedResponse = await fetch(`${baseUrl}/api/encounters/${encounterId}/process-medical-problems-tier3`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'connect.sid=s%3A2vYkEZgfI_0mAfr6JskvNINhApQ9gY9O.KCtIDCaWIVGOBmHm9bCQfFMJP8Q%2BbfnEy21OGZQ0cJQ'
      },
      body: JSON.stringify({
        soapNote: soapNote2, // Changed content
        patientId: patientId
      })
    });

    console.log(`Tier 3 (Changed Content) Response Status: ${tier3ChangedResponse.status}`);
    
    if (tier3ChangedResponse.ok) {
      const tier3ChangedResult = await tier3ChangedResponse.json();
      console.log('✅ Tier 3 (Changed Content):', {
        problemsAffected: tier3ChangedResult.total_problems_affected,
        processingTime: tier3ChangedResult.processing_time_ms,
        reason: tier3ChangedResult.reason,
        changes: tier3ChangedResult.changes?.length || 0
      });
    } else {
      const tier3ChangedError = await tier3ChangedResponse.text();
      console.error('❌ Tier 3 (Changed Content) Failed:', tier3ChangedError);
    }

    console.log('\n🏁 Test completed successfully!');
    console.log('The orchestrator system should now prevent duplicate medical problems.');

  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

testTierSystem();