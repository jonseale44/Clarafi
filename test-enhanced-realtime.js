import { WebSocket } from 'ws';

// Comprehensive test of the enhanced realtime suggestions system
const testEnhancedRealtimeSystem = async () => {
  console.log('Testing Enhanced Realtime Suggestions System...');
  
  // Test 1: Medical Context API
  console.log('\n1. Testing Medical Context API...');
  try {
    const response = await fetch('http://localhost:5000/api/patients/56/medical-context');
    const data = await response.json();
    console.log('✓ Medical context retrieved:', data.success);
    console.log('  - Token count:', data.context?.tokenCount);
    console.log('  - Cache enabled:', data.context ? 'Yes' : 'No');
  } catch (error) {
    console.log('✗ Medical context failed:', error.message);
  }

  // Test 2: Medical Index Stats
  console.log('\n2. Testing Medical Index Performance...');
  try {
    const response = await fetch('http://localhost:5000/api/medical-index/stats');
    const data = await response.json();
    console.log('✓ Medical index stats:', data.success);
    console.log('  - System type:', data.stats?.systemType);
    console.log('  - Response time:', data.stats?.averageResponseTime);
    console.log('  - Token usage:', data.stats?.averageTokenUsage);
  } catch (error) {
    console.log('✗ Medical index stats failed:', error.message);
  }

  // Test 3: Semantic Search
  console.log('\n3. Testing Semantic Medical Search...');
  try {
    const response = await fetch('http://localhost:5000/api/patients/56/search-medical-context', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'respiratory symptoms', limit: 3 })
    });
    const data = await response.json();
    console.log('✓ Semantic search completed:', data.success);
    console.log('  - Results found:', data.count);
  } catch (error) {
    console.log('✗ Semantic search failed:', error.message);
  }

  // Test 4: WebSocket Connectivity
  console.log('\n4. Testing WebSocket Connectivity...');
  return new Promise((resolve) => {
    const ws = new WebSocket('ws://localhost:5000/ws/enhanced-realtime');
    let connected = false;
    
    const timeout = setTimeout(() => {
      if (!connected) {
        console.log('✗ WebSocket connection timeout');
        ws.close();
        resolve();
      }
    }, 5000);

    ws.on('open', () => {
      connected = true;
      console.log('✓ WebSocket connected successfully');
      
      // Test session initialization
      ws.send(JSON.stringify({
        type: 'initialize_session',
        patientId: 56,
        userRole: 'provider',
        sessionId: 'test-' + Date.now()
      }));
      
      setTimeout(() => {
        ws.close();
        clearTimeout(timeout);
        resolve();
      }, 2000);
    });

    ws.on('message', (data) => {
      const message = JSON.parse(data.toString());
      console.log('  - Received message type:', message.type);
    });

    ws.on('error', (error) => {
      console.log('✗ WebSocket error:', error.message);
      clearTimeout(timeout);
      resolve();
    });

    ws.on('close', () => {
      console.log('  - WebSocket connection closed');
      if (connected) {
        console.log('✓ WebSocket test completed successfully');
      }
      clearTimeout(timeout);
      resolve();
    });
  });
};

testEnhancedRealtimeSystem().then(() => {
  console.log('\nEnhanced Realtime System Test Complete');
  process.exit(0);
});