/**
 * Test Allergy Processing via API
 * This will show us exactly what GPT returns and how it's processed
 */

async function testAllergyProcessing() {
  console.log("🧪 Starting allergy processing test");
  
  const testScenarios = [
    {
      name: "Latex allergy + Resolved PCN",
      soapNote: `
SUBJECTIVE:
The patient reports an allergy to latex, which causes a rash. 
He states that he no longer has an allergy to penicillin.
No other allergies noted.
      `,
      patientId: 14,
      encounterId: 26
    }
  ];

  for (const scenario of testScenarios) {
    console.log(`\n🔬 Testing: ${scenario.name}`);
    
    try {
      const response = await fetch("http://localhost:5000/api/allergies/process-unified", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Cookie": "connect.sid=s%3A1LdQU0Z51ZT-sQxvjKO7PN50u3sGxCRh.kHJEd2n%2FzaKJNRzfYDc9VR4xsxUFwEMKGJpnMHcI7Nc"
        },
        body: JSON.stringify({
          patientId: scenario.patientId,
          soapNote: scenario.soapNote,
          encounterId: scenario.encounterId,
          triggerType: "test_process"
        })
      });

      const result = await response.json();
      console.log("📊 API Response:", JSON.stringify(result, null, 2));
      
    } catch (error) {
      console.error("❌ Test failed:", error);
    }
  }
}

// Run the test
testAllergyProcessing().catch(console.error);