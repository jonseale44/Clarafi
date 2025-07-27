import { db } from './server/db';
import { patients, labResults, gptLabReviewNotes } from './shared/schema';
import { eq, or, like, sql } from 'drizzle-orm';

async function checkZTest3Reviews() {
  console.log('Searching for ZTest 3 patient...');
  
  // Search for patient with name or MRN containing "ZTest 3"
  const patientSearch = await db.select()
    .from(patients)
    .where(or(
      like(patients.firstName, '%ZTest%3%'),
      like(patients.lastName, '%ZTest%3%'),
      like(patients.mrn, '%ZTEST%3%'),
      sql`CONCAT(${patients.firstName}, ' ', ${patients.lastName}) LIKE '%ZTest 3%'`
    ))
    .limit(10);
    
  console.log('\nFound patients:', patientSearch.length);
  patientSearch.forEach(p => {
    console.log(`- ID: ${p.id}, Name: ${p.firstName} ${p.lastName}, MRN: ${p.mrn}`);
  });
  
  if (patientSearch.length > 0) {
    const patient = patientSearch[0];
    console.log(`\nChecking lab results and reviews for patient ${patient.id}...`);
    
    // Get lab results count
    const labResultsCount = await db.select({ count: sql`COUNT(*)` })
      .from(labResults)
      .where(eq(labResults.patientId, patient.id));
      
    console.log(`Lab results count: ${labResultsCount[0].count}`);
    
    // Get GPT lab reviews
    const reviews = await db.select()
      .from(gptLabReviewNotes)
      .where(eq(gptLabReviewNotes.patientId, patient.id))
      .orderBy(gptLabReviewNotes.createdAt);
      
    console.log(`\nGPT Lab Reviews found: ${reviews.length}`);
    
    reviews.forEach((review, index) => {
      console.log(`\n--- Review ${index + 1} ---`);
      console.log(`ID: ${review.id}`);
      console.log(`Created: ${review.createdAt}`);
      console.log(`Result IDs: ${review.resultIds}`);
      console.log(`Has Clinical Review: ${!!review.clinicalReview}`);
      console.log(`Has Patient Message: ${!!review.patientMessage}`);
      console.log(`Has Nurse Message: ${!!review.nurseMessage}`);
      console.log(`Has Conversation Review: ${!!review.conversationReview}`);
      console.log(`Conversation Closed: ${review.conversationClosed}`);
      
      if (review.conversationReview) {
        console.log(`\nConversation Review Summary:`);
        console.log(review.conversationReview);
      }
    });
    
    // Also check for specific lab results
    const recentLabResults = await db.select({
      id: labResults.id,
      testName: labResults.testName,
      resultValue: labResults.resultValue,
      reviewedAt: labResults.reviewedAt,
      reviewedBy: labResults.reviewedBy,
      needsReview: labResults.needsReview
    })
    .from(labResults)
    .where(eq(labResults.patientId, patient.id))
    .orderBy(labResults.createdAt)
    .limit(10);
    
    console.log(`\nRecent lab results (showing first 10):`);
    recentLabResults.forEach(lr => {
      console.log(`- ${lr.testName}: ${lr.resultValue} (ID: ${lr.id}, Reviewed: ${lr.reviewedAt ? 'Yes' : 'No'})`);
    });
  }
}

checkZTest3Reviews()
  .then(() => {
    console.log('\nDone checking ZTest 3 reviews');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });