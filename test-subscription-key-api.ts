import fetch from 'node-fetch';

async function testSubscriptionKeyAPI() {
  try {
    // Test with the active key for nurse1
    const key = 'WIL-2025-BE85-4337';
    
    const response = await fetch(`http://localhost:5000/api/subscription-keys/details/${key}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    console.log('API Response Status:', response.status);
    console.log('API Response Data:', JSON.stringify(data, null, 2));
    
    if (data.success) {
      console.log('\n✅ Key Details Retrieved Successfully');
      console.log('Health System:', data.healthSystemName);
      console.log('\nPractice Info:', data.practiceInfo);
      console.log('\nEmployee Info:', data.employeeInfo);
    } else {
      console.log('\n❌ Failed to retrieve key details');
    }
    
  } catch (error) {
    console.error('Error testing API:', error);
  }
}

testSubscriptionKeyAPI();