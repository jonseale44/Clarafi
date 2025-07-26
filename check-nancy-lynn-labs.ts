
import { db } from "./server/db.js";
import { labResults, patients } from "./shared/schema.js";
import { eq, sql } from "drizzle-orm";

async function checkNancyLynnLabs() {
  try {
    console.log("🔍 Searching for Nancy Lynn in patients table...");
    
    // First, find Nancy Lynn in the patients table
    const nancyPatients = await db
      .select()
      .from(patients)
      .where(
        sql`LOWER(${patients.firstName}) LIKE '%nancy%' AND LOWER(${patients.lastName}) LIKE '%lynn%'`
      );

    console.log(`Found ${nancyPatients.length} patients matching Nancy Lynn:`);
    nancyPatients.forEach(patient => {
      console.log(`- ID: ${patient.id}, Name: ${patient.firstName} ${patient.lastName}, DOB: ${patient.dateOfBirth}`);
    });

    if (nancyPatients.length === 0) {
      console.log("❌ No patients found matching 'Nancy Lynn'");
      
      // Let's also check for partial matches
      console.log("\n🔍 Checking for partial name matches...");
      const partialMatches = await db
        .select()
        .from(patients)
        .where(
          sql`LOWER(${patients.firstName}) LIKE '%nancy%' OR LOWER(${patients.lastName}) LIKE '%lynn%'`
        );
      
      console.log(`Found ${partialMatches.length} patients with partial name matches:`);
      partialMatches.forEach(patient => {
        console.log(`- ID: ${patient.id}, Name: ${patient.firstName} ${patient.lastName}, DOB: ${patient.dateOfBirth}`);
      });
      
      return;
    }

    // Check lab results for each Nancy Lynn patient
    for (const patient of nancyPatients) {
      console.log(`\n🧪 Checking lab results for patient ID ${patient.id} (${patient.firstName} ${patient.lastName})...`);
      
      const labs = await db
        .select({
          id: labResults.id,
          testName: labResults.testName,
          resultValue: labResults.resultValue,
          resultUnits: labResults.resultUnits,
          referenceRange: labResults.referenceRange,
          abnormalFlag: labResults.abnormalFlag,
          resultAvailableAt: labResults.resultAvailableAt,
          sourceType: labResults.sourceType,
          extractedFromAttachmentId: labResults.extractedFromAttachmentId
        })
        .from(labResults)
        .where(eq(labResults.patientId, patient.id))
        .orderBy(labResults.resultAvailableAt);

      console.log(`Found ${labs.length} lab results for ${patient.firstName} ${patient.lastName}:`);
      
      if (labs.length > 0) {
        labs.forEach((lab, index) => {
          console.log(`\n  Lab ${index + 1}:`);
          console.log(`    Test: ${lab.testName}`);
          console.log(`    Result: ${lab.resultValue} ${lab.resultUnits || ''}`);
          console.log(`    Reference Range: ${lab.referenceRange || 'N/A'}`);
          console.log(`    Abnormal Flag: ${lab.abnormalFlag || 'Normal'}`);
          console.log(`    Date: ${lab.resultAvailableAt}`);
          console.log(`    Source: ${lab.sourceType || 'Unknown'}`);
          if (lab.extractedFromAttachmentId) {
            console.log(`    Extracted from Attachment ID: ${lab.extractedFromAttachmentId}`);
          }
        });
      } else {
        console.log(`    ❌ No lab results found for ${patient.firstName} ${patient.lastName}`);
      }
    }

    // Also show total lab results count in database
    const totalLabsCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(labResults);
    
    console.log(`\n📊 Total lab results in database: ${totalLabsCount[0]?.count || 0}`);

  } catch (error) {
    console.error("❌ Error checking Nancy Lynn labs:", error);
  } finally {
    process.exit(0);
  }
}

checkNancyLynnLabs();
