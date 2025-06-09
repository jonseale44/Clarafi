import WebSocket from 'ws';

// Test the enhanced realtime suggestions system
const testRealtimeSuggestions = () => {
  console.log('🧪 Testing Enhanced Realtime Suggestions System...');
  
  const ws = new WebSocket('ws://localhost:5000/ws/enhanced-realtime');
  
  ws.on('open', () => {
    console.log('✅ WebSocket connected');
    
    // Initialize session
    ws.send(JSON.stringify({
      type: 'initialize_session',
      patientId: 56,
      userRole: 'provider',
      sessionId: 'test-session-' + Date.now()
    }));
    
    setTimeout(() => {
      console.log('🎯 Starting suggestions...');
      ws.send(JSON.stringify({
        type: 'start_suggestions'
      }));
      
      setTimeout(() => {
        console.log('📝 Sending test transcription...');
        ws.send(JSON.stringify({
          type: 'process_transcription',
          transcription: 'Patient reports chest pain and shortness of breath'
        }));
        
        setTimeout(() => {
          console.log('⏹️ Stopping suggestions...');
          ws.send(JSON.stringify({
            type: 'stop_suggestions'
          }));
          
          setTimeout(() => {
            ws.close();
          }, 1000);
        }, 3000);
      }, 1000);
    }, 1000);
  });
  
  ws.on('message', (data) => {
    const message = JSON.parse(data.toString());
    console.log('📨 Received:', message.type, message.message || message.delta || '');
  });
  
  ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error.message);
  });
  
  ws.on('close', () => {
    console.log('🔌 WebSocket closed');
  });
};

testRealtimeSuggestions();