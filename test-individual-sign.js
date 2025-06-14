/**
 * Test individual order signing and medication activation
 */

async function testIndividualOrderSigning() {
  const baseUrl = 'http://localhost:5000';
  
  try {
    // First, login to get session
    const loginResponse = await fetch(`${baseUrl}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' }),
      credentials: 'include'
    });
    
    if (!loginResponse.ok) {
      throw new Error('Login failed');
    }
    
    console.log('✅ Logged in successfully');
    
    // Create a test patient first
    const patientResponse = await fetch(`${baseUrl}/api/patients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName: 'Test',
        lastName: 'Patient',
        dateOfBirth: '1980-01-01',
        gender: 'male',
        contactNumber: '555-1234'
      }),
      credentials: 'include'
    });
    
    const patient = await patientResponse.json();
    console.log(`✅ Created test patient: ${patient.id}`);
    
    // Create a test encounter
    const encounterResponse = await fetch(`${baseUrl}/api/encounters`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patientId: patient.id,
        encounterType: 'office_visit',
        chiefComplaint: 'Test encounter for medication signing'
      }),
      credentials: 'include'
    });
    
    const encounter = await encounterResponse.json();
    console.log(`✅ Created test encounter: ${encounter.id}`);
    
    // Create a medication order
    const orderResponse = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patientId: patient.id,
        encounterId: encounter.id,
        orderType: 'medication',
        orderStatus: 'draft',
        medicationName: 'Test Medication',
        dosage: '10 mg',
        quantity: 30,
        sig: 'Take once daily',
        refills: 1,
        priority: 'routine'
      }),
      credentials: 'include'
    });
    
    const order = await orderResponse.json();
    console.log(`✅ Created medication order: ${order.id}`);
    
    // Check initial medication status
    const initialMedsResponse = await fetch(`${baseUrl}/api/patients/${patient.id}/medications-enhanced`, {
      credentials: 'include'
    });
    const initialMeds = await initialMedsResponse.json();
    console.log(`📋 Initial medications:`, initialMeds.medications.map(m => `${m.medicationName} - ${m.status}`));
    
    // Sign the individual order
    console.log(`🔄 Signing individual order: ${order.id}`);
    const signResponse = await fetch(`${baseUrl}/api/orders/${order.id}/sign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        signatureNote: 'Individual order signing test'
      }),
      credentials: 'include'
    });
    
    const signResult = await signResponse.json();
    console.log(`✅ Sign response:`, signResult);
    
    // Wait a moment for processing
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check updated medication status
    const updatedMedsResponse = await fetch(`${baseUrl}/api/patients/${patient.id}/medications-enhanced`, {
      credentials: 'include'
    });
    const updatedMeds = await updatedMedsResponse.json();
    console.log(`📋 Updated medications:`, updatedMeds.medications.map(m => `${m.medicationName} - ${m.status}`));
    
    // Verify the medication status changed from pending to active
    const testMed = updatedMeds.medications.find(m => m.medicationName === 'Test Medication');
    if (testMed && testMed.status === 'active') {
      console.log(`✅ SUCCESS: Medication status updated to 'active'`);
    } else {
      console.log(`❌ FAILURE: Medication status is '${testMed?.status}', expected 'active'`);
    }
    
    // Clean up - delete the test patient (cascades to all related data)
    await fetch(`${baseUrl}/api/patients/${patient.id}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    console.log(`🗑️ Cleaned up test data`);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testIndividualOrderSigning();