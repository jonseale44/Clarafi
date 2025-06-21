import fetch from 'node-fetch';

const baseUrl = 'http://localhost:5000';
let sessionCookie = '';

async function login() {
  const response = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'jonseale', password: 'password123' })
  });
  
  const cookies = response.headers.get('set-cookie');
  if (cookies) {
    sessionCookie = cookies.split(';')[0];
  }
  
  return response.json();
}

async function updateSOAPNote(encounterId) {
  const response = await fetch(`${baseUrl}/api/encounters/${encounterId}/note`, {
    method: 'PUT',
    headers: { 
      'Content-Type': 'application/json',
      'Cookie': sessionCookie
    },
    body: JSON.stringify({
      note: 'S: Patient presents for routine follow-up.\nO: Vital signs stable. Physical exam unremarkable.\nA: Continue current management.\nP: Lab work ordered for monitoring.'
    })
  });
  
  return response.json();
}

async function setDeliveryPreferences(patientId, labMethod, medicationMethod) {
  const response = await fetch(`${baseUrl}/api/patients/${patientId}/order-preferences`, {
    method: 'PUT',
    headers: { 
      'Content-Type': 'application/json',
      'Cookie': sessionCookie
    },
    body: JSON.stringify({
      labDeliveryMethod: labMethod,
      medicationDeliveryMethod: medicationMethod,
      imagingDeliveryMethod: 'print_pdf'
    })
  });
  
  return response.json();
}

async function signOrders(orderIds) {
  const response = await fetch(`${baseUrl}/api/orders/bulk-sign`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Cookie': sessionCookie
    },
    body: JSON.stringify({
      orderIds: orderIds,
      signatureNote: 'Test delivery preferences'
    })
  });
  
  return response.json();
}

async function getDraftOrders(patientId) {
  const response = await fetch(`${baseUrl}/api/patients/${patientId}/draft-orders`, {
    headers: { 'Cookie': sessionCookie }
  });
  
  return response.json();
}

async function testDeliveryPreferences() {
  console.log('🧪 Testing delivery preferences system...');
  
  // Login
  const loginResult = await login();
  console.log('✅ Logged in:', loginResult.success);
  
  const patientId = 127;
  const encounterId = 359;
  
  // Update SOAP note to enable signing
  await updateSOAPNote(encounterId);
  console.log('✅ Updated SOAP note');
  
  // Test 1: Lab orders with mock_service (should NOT generate PDF)
  console.log('\n📋 Test 1: Lab orders with mock_service delivery');
  await setDeliveryPreferences(patientId, 'mock_service', 'preferred_pharmacy');
  
  const draftOrders = await getDraftOrders(patientId);
  const labOrders = draftOrders.filter(order => order.orderType === 'lab');
  
  if (labOrders.length > 0) {
    console.log(`Found ${labOrders.length} lab orders to sign`);
    const signResult = await signOrders(labOrders.map(o => o.id));
    console.log('Sign result:', signResult.success ? 'SUCCESS' : 'FAILED');
    
    // Check logs for PDF generation messages
    console.log('Check server logs for "PDF generation skipped" messages');
  }
  
  // Test 2: Lab orders with print_pdf (should generate PDF)
  console.log('\n📋 Test 2: Lab orders with print_pdf delivery');
  await setDeliveryPreferences(patientId, 'print_pdf', 'preferred_pharmacy');
  
  // Wait a moment then clean up
  setTimeout(() => {
    console.log('✅ Test completed. Check server logs for delivery preference messages.');
    process.exit(0);
  }, 2000);
}

testDeliveryPreferences().catch(console.error);