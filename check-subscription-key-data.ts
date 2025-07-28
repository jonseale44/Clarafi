import { db } from "./server/db";
import { subscriptionKeys } from "./shared/schema";
import { eq } from "drizzle-orm";

async function checkSubscriptionKeyData() {
  try {
    // Get the most recent subscription keys
    const keys = await db.select()
      .from(subscriptionKeys)
      .where(eq(subscriptionKeys.status, 'active'))
      .orderBy(subscriptionKeys.id)
      .limit(100); // Get active keys
    
    console.log("Recent subscription keys for Will Rogers Clinic:");
    
    for (const key of keys) {
      console.log("\n=================");
      console.log("Key ID:", key.id);
      console.log("Key:", key.key);
      console.log("Status:", key.status);
      console.log("Type:", key.keyType);
      console.log("Metadata:", JSON.stringify(key.metadata, null, 2));
    }
    
  } catch (error) {
    console.error("Error:", error);
  } finally {
    process.exit(0);
  }
}

checkSubscriptionKeyData();