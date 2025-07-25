import dotenv from "dotenv";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { healthSystems } from "./shared/schema";
import { eq } from "drizzle-orm";

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool);

async function updateTrialStatus(healthSystemId: number, daysFromNow: number) {
  const newTrialEndDate = new Date();
  newTrialEndDate.setDate(newTrialEndDate.getDate() + daysFromNow);
  
  console.log(`\n🧪 [Trial Test] Setting trial end date to ${daysFromNow} days from now...`);
  console.log(`   Trial end date: ${newTrialEndDate.toISOString()}`);
  
  const result = await db
    .update(healthSystems)
    .set({
      trialEndDate: newTrialEndDate,
      // Reset grace period if extending trial
      gracePeriodEndDate: daysFromNow > 0 ? null : undefined,
      // Reactivate if extending trial
      subscriptionStatus: daysFromNow > 0 ? 'trial' : undefined
    })
    .where(eq(healthSystems.id, healthSystemId))
    .returning();
    
  if (result.length > 0) {
    console.log(`✅ [Trial Test] Updated health system ${healthSystemId}`);
    console.log(`   New trial end date: ${result[0].trialEndDate}`);
    console.log(`   Subscription status: ${result[0].subscriptionStatus}`);
  } else {
    console.log(`❌ [Trial Test] Health system ${healthSystemId} not found`);
  }
}

async function setGracePeriod(healthSystemId: number) {
  const trialEnd = new Date();
  trialEnd.setDate(trialEnd.getDate() - 1); // Trial ended yesterday
  
  const graceEnd = new Date();
  graceEnd.setDate(graceEnd.getDate() + 7); // Grace period ends in 7 days
  
  console.log(`\n🧪 [Trial Test] Setting grace period for health system ${healthSystemId}...`);
  console.log(`   Trial ended: ${trialEnd.toISOString()}`);
  console.log(`   Grace period ends: ${graceEnd.toISOString()}`);
  
  const result = await db
    .update(healthSystems)
    .set({
      trialEndDate: trialEnd,
      gracePeriodEndDate: graceEnd,
      subscriptionStatus: 'trial_expired'
    })
    .where(eq(healthSystems.id, healthSystemId))
    .returning();
    
  if (result.length > 0) {
    console.log(`✅ [Trial Test] Set grace period for health system ${healthSystemId}`);
  } else {
    console.log(`❌ [Trial Test] Health system ${healthSystemId} not found`);
  }
}

async function deactivateAccount(healthSystemId: number) {
  const trialEnd = new Date();
  trialEnd.setDate(trialEnd.getDate() - 8); // Trial ended 8 days ago
  
  const graceEnd = new Date();
  graceEnd.setDate(graceEnd.getDate() - 1); // Grace period ended yesterday
  
  console.log(`\n🧪 [Trial Test] Deactivating account for health system ${healthSystemId}...`);
  
  const result = await db
    .update(healthSystems)
    .set({
      trialEndDate: trialEnd,
      gracePeriodEndDate: graceEnd,
      subscriptionStatus: 'deactivated'
    })
    .where(eq(healthSystems.id, healthSystemId))
    .returning();
    
  if (result.length > 0) {
    console.log(`✅ [Trial Test] Deactivated health system ${healthSystemId}`);
  } else {
    console.log(`❌ [Trial Test] Health system ${healthSystemId} not found`);
  }
}

async function showCurrentStatus(healthSystemId: number) {
  const result = await db
    .select()
    .from(healthSystems)
    .where(eq(healthSystems.id, healthSystemId));
    
  if (result.length > 0) {
    const system = result[0];
    console.log(`\n📊 [Current Status] Health System ${healthSystemId}:`);
    console.log(`   Name: ${system.name}`);
    console.log(`   Subscription Status: ${system.subscriptionStatus}`);
    console.log(`   Trial End Date: ${system.trialEndDate}`);
    console.log(`   Grace Period End: ${system.gracePeriodEndDate || 'None'}`);
    console.log(`   Stripe Customer ID: ${system.stripeCustomerId || 'None'}`);
    
    // Calculate days remaining
    if (system.trialEndDate) {
      const now = new Date();
      const trialEnd = new Date(system.trialEndDate);
      const diffTime = trialEnd.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      console.log(`   Days until trial end: ${diffDays}`);
    }
  } else {
    console.log(`❌ Health system ${healthSystemId} not found`);
  }
}

async function main() {
  const command = process.argv[2];
  const healthSystemId = parseInt(process.argv[3]);
  const days = parseInt(process.argv[4]);
  
  if (!command || !healthSystemId) {
    console.log(`
🧪 Trial Status Test Tool

Usage:
  npm run trial-test status <healthSystemId>           - Show current trial status
  npm run trial-test extend <healthSystemId> <days>    - Extend trial by N days (positive number)
  npm run trial-test expire <healthSystemId> <days>    - Set trial to expire in N days (negative for past)
  npm run trial-test grace <healthSystemId>            - Set account to grace period
  npm run trial-test deactivate <healthSystemId>       - Deactivate account

Examples:
  npm run trial-test status 5322                       - Check status of health system 5322
  npm run trial-test extend 5322 30                    - Extend trial by 30 days
  npm run trial-test expire 5322 3                     - Trial expires in 3 days (warning state)
  npm run trial-test expire 5322 -1                    - Trial expired yesterday
  npm run trial-test grace 5322                        - Set to grace period (read-only)
  npm run trial-test deactivate 5322                   - Deactivate account
    `);
    process.exit(1);
  }
  
  try {
    switch (command) {
      case 'status':
        await showCurrentStatus(healthSystemId);
        break;
      case 'extend':
        if (isNaN(days)) {
          console.log('❌ Please specify number of days to extend');
          process.exit(1);
        }
        await updateTrialStatus(healthSystemId, days);
        await showCurrentStatus(healthSystemId);
        break;
      case 'expire':
        if (isNaN(days)) {
          console.log('❌ Please specify number of days until expiry');
          process.exit(1);
        }
        await updateTrialStatus(healthSystemId, days);
        await showCurrentStatus(healthSystemId);
        break;
      case 'grace':
        await setGracePeriod(healthSystemId);
        await showCurrentStatus(healthSystemId);
        break;
      case 'deactivate':
        await deactivateAccount(healthSystemId);
        await showCurrentStatus(healthSystemId);
        break;
      default:
        console.log(`❌ Unknown command: ${command}`);
        process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

main();