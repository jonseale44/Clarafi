const { execSync } = require('child_process');
const fs = require('fs');

console.log('Generating package-lock.json...');

// Change to the correct directory
process.chdir(__dirname);

// Remove existing package-lock.json if it exists
if (fs.existsSync('package-lock.json')) {
  fs.unlinkSync('package-lock.json');
  console.log('Removed existing package-lock.json');
}

// Run npm install to generate fresh package-lock.json
try {
  execSync('npm install', { stdio: 'inherit' });
  console.log('Successfully generated package-lock.json');
} catch (error) {
  console.error('Error generating package-lock.json:', error);
}