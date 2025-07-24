import { db } from "./server/db.js";
import { labResults, labOrders, patients } from "./shared/schema.js";
import { eq, isNull, and, sql } from "drizzle-orm";

async function testDashboardQuery() {
  console.log("=== Testing Dashboard Query ===");
  
  const userId = 1; // Same as used in dashboard
  
  // First check if we have matching lab orders with orderedBy = 1
  const ordersCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(labOrders)
    .where(eq(labOrders.orderedBy, userId));
    
  console.log(`\nLab orders with orderedBy = ${userId}: ${ordersCount[0].count}`);
  
  // Check lab results with joins
  const labOrdersToReview = await db
    .select({
      id: labResults.id,
      labOrderId: labOrders.id,
      patientId: labOrders.patientId,
      patientName: sql<string>`concat(${patients.firstName}, ' ', ${patients.lastName})`,
      testName: labOrders.testName,
      orderedDate: labOrders.orderedAt,
      status: labResults.resultStatus,
      priority: labOrders.priority,
      criticalFlag: sql<boolean>`case when ${labResults.abnormalFlag} in ('HH', 'LL') then true else false end`,
      results: labResults.resultValue,
      orderedBy: labOrders.orderedBy,
      reviewedBy: labResults.reviewedBy
    })
    .from(labResults)
    .innerJoin(labOrders, eq(labResults.labOrderId, labOrders.id))
    .innerJoin(patients, eq(labOrders.patientId, patients.id))
    .where(
      and(
        eq(labOrders.orderedBy, userId),
        eq(labResults.resultStatus, "final"),
        isNull(labResults.reviewedBy)
      )
    )
    .limit(10);
    
  console.log(`\nLab orders to review found: ${labOrdersToReview.length}`);
  labOrdersToReview.forEach(lab => {
    console.log(`- Order ${lab.labOrderId}: ${lab.testName} for ${lab.patientName}`);
    console.log(`  OrderedBy: ${lab.orderedBy}, ReviewedBy: ${lab.reviewedBy}, Status: ${lab.status}`);
  });
  
  // Let's also check without the orderedBy filter
  const allUnreviewedResults = await db
    .select({
      id: labResults.id,
      labOrderId: labOrders.id,
      orderedBy: labOrders.orderedBy,
      testName: labOrders.testName,
      resultStatus: labResults.resultStatus,
      reviewedBy: labResults.reviewedBy
    })
    .from(labResults)
    .innerJoin(labOrders, eq(labResults.labOrderId, labOrders.id))
    .where(
      and(
        eq(labResults.resultStatus, "final"),
        isNull(labResults.reviewedBy)
      )
    )
    .limit(10);
    
  console.log(`\n\nAll unreviewed results (no orderedBy filter): ${allUnreviewedResults.length}`);
  allUnreviewedResults.forEach(r => {
    console.log(`- OrderedBy: ${r.orderedBy}, Test: ${r.testName}`);
  });
  
  process.exit(0);
}

testDashboardQuery().catch(console.error);
