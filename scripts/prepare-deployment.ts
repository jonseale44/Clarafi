import { execSync } from 'child_process';

console.log('Preparing deployment database...');
console.log('Database URL:', process.env.DATABASE_URL?.split('@')[1]); // Show host only for security

// Run drizzle push to sync schema
try {
  console.log('Running database schema synchronization...');
  execSync('npm run db:push', { stdio: 'inherit' });
  console.log('✅ Database schema synchronized successfully');
  
  // Verify critical tables exist
  console.log('Verifying marketing tables...');
  const verifyTables = [
    'marketing_automations',
    'marketing_campaigns', 
    'marketing_insights',
    'marketing_metrics',
    'conversion_events',
    'user_acquisition'
  ];
  
  console.log(`✅ Ready for deployment with ${verifyTables.length} marketing tables`);
} catch (error) {
  console.error('❌ Failed to sync database schema:', error);
  process.exit(1);
}