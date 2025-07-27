// Wait for page to load
setTimeout(() => {
  console.log('Navigating to subscription keys page...');
  
  // Navigate to the subscription keys page
  window.location.href = '/admin/subscription-keys';
  
  console.log('Navigation successful');
}, 1000);