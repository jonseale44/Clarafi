import { db } from "./server/db.js";
import { labResults, labOrders } from "./shared/schema.js";
import { eq, isNull, and, desc } from "drizzle-orm";

async function checkLabResults() {
  console.log("=== Checking Lab Results ===");
  
  // Check recent lab results
  const recentResults = await db
    .select({
      id: labResults.id,
      labOrderId: labResults.labOrderId,
      testName: labResults.testName,
      resultStatus: labResults.resultStatus,
      reviewedBy: labResults.reviewedBy,
      needsReview: labResults.needsReview,
      reviewStatus: labResults.reviewStatus,
      createdAt: labResults.createdAt
    })
    .from(labResults)
    .orderBy(desc(labResults.createdAt))
    .limit(10);
    
  console.log("\nRecent Lab Results:");
  recentResults.forEach(r => {
    console.log(`ID: ${r.id}, OrderID: ${r.labOrderId}, Test: ${r.testName}`);
    console.log(`  Status: ${r.resultStatus}, ReviewedBy: ${r.reviewedBy}, NeedsReview: ${r.needsReview}, ReviewStatus: ${r.reviewStatus}`);
    console.log(`  Created: ${r.createdAt}`);
  });
  
  // Check specifically for unreviewed results
  const unreviewedResults = await db
    .select({
      id: labResults.id,
      labOrderId: labResults.labOrderId,
      testName: labResults.testName,
      resultStatus: labResults.resultStatus,
      reviewedBy: labResults.reviewedBy
    })
    .from(labResults)
    .where(
      and(
        eq(labResults.resultStatus, "final"),
        isNull(labResults.reviewedBy)
      )
    )
    .limit(10);
    
  console.log("\n\nUnreviewed Results (final status, null reviewedBy):");
  console.log(`Found ${unreviewedResults.length} results`);
  unreviewedResults.forEach(r => {
    console.log(`ID: ${r.id}, OrderID: ${r.labOrderId}, Test: ${r.testName}`);
  });

  // Check lab orders
  const recentOrders = await db
    .select({
      id: labOrders.id,
      testName: labOrders.testName,
      orderStatus: labOrders.orderStatus,
      orderedBy: labOrders.orderedBy
    })
    .from(labOrders)
    .orderBy(desc(labOrders.orderedAt))
    .limit(10);
    
  console.log("\n\nRecent Lab Orders:");
  recentOrders.forEach(o => {
    console.log(`ID: ${o.id}, Test: ${o.testName}, Status: ${o.orderStatus}, OrderedBy: ${o.orderedBy}`);
  });
  
  process.exit(0);
}

checkLabResults().catch(console.error);
