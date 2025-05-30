import OpenAI from "openai";
import { toUTCDate } from "../../client/src/utils/date-utils";
import {
  type InsertMedicalProblem,
  type InsertMedication,
  type InsertAllergy,
  type InsertLab,
  type InsertImaging,p
  type InsertSurgicalHistory,
  type InsertFamilyHistory,
  type InsertSocialHistory,
  type InsertVital,
} from "@db/schema";

//==============================================================================
// CONFIGURATION AND INITIALIZATION
//==============================================================================

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

//==============================================================================
// ANALYSIS FRAMEWORK DEFINITIONS
//==============================================================================

const ANALYSIS_FRAMEWORK = `MEDICAL PROBLEMS:
  Analysis Framework:
    - Evaluate condition progression and complications
    - Assess severity and acuity changes
    - Identify condition relationships
    - Monitor treatment responses
    - Track risk factors

  Decision Rules:
    - Require clinical evidence for changes
    - Update ICD-10 codes for progression
    - Document all status changes
    - Link related conditions
    - Preserve condition history

  Data Structure:
    - Condition name and ICD-10 code
    - Status (active/resolved)
    - Relevant labs and/or imaging and associated dates 
    - Progression history
    - Current medication and dose

MEDICATIONS:
  API Format:
    - Required fields: name, dosage, frequency, quantity, refills, sig, start_date
    - Optional fields: end_date, prescriber, form
    - Avoid speculative fields like “effectiveness” unless explicitly stated
    - Store usage instructions (SIG) in the "sig" field, NOT "frequency"
    - frequency should reflect dose timing (e.g., “BID”, “Once daily”)

  Analysis Framework:
    - Update current medications if dose, instructions, or quantity changes
    - Preserve timestamps for unchanged medications to avoid overwriting edits
    - Do not add duplicate entries if same medication name already appears
    - Mark truly discontinued medications with an end_date if mentioned
    - Only remove medications if SOAP note explicitly negates their use

  Decision Rules:
    - Medication entries must include patient_id and created_at, updated_at
    - Match existing chart medications by name (exact or near match)
    - If a new version of the same med is added (e.g. different dose), overwrite the old entry
    - For new meds, populate all schema fields with sensible defaults (e.g., form = tablet, refills = 0)
    - Important: Incomplete or vague mentions (e.g. “only taking insulin”) should still create a full entry if possible


ALLERGIES:
  Analysis Framework:
    - Assess reaction severity
    - Identify cross-reactions
    - Monitor exposure risks
    - Track reaction patterns
    - Review prevention measures

  Decision Rules:
    - Document all reactions
    - Update severity assessments
    - Record exposure incidents
    - Flag high-risk allergens
    - Track preventive measures

  Data Structure:
    - Trigger and type
    - Reaction description
    - Severity level
    - Date identified
    - Prevention notes

LABS:
⚠️ This medical note may contain labs from different clinical visits, often structured under dated SOAP notes, headers like “Date of Visit,” or references to visit timing such as “at follow-up” or “most recent labs.”

Please follow these instructions:

Parse each clinical visit and its associated labs independently to clearly distinguish between different visits.

Determine the correct date for each lab test:

If a lab collection date is explicitly listed next to the results, use it as the test_date.
If labs are listed under a visit or section with a specific date or header (e.g., “Date of Visit: 2022-11-10”), use that visit date as the test_date for all labs within that section when no specific lab date is mentioned.
If multiple labs are listed in a single sentence without individual dates, and there is only one dated visit in the note, assume they were conducted on that visit date.
Avoid assumptions based on document metadata:

Do not default to using scan dates or dates unrelated to the actual collection, such as document creation or modification dates, as test dates.
Maintain chronological order:

Ensure that labs from earlier visits are preserved chronologically and are not mistakenly overwritten or grouped into later notes.
Reflect clinical timing accurately:

Every lab entry should accurately reflect the clinical timing based on the note structure, using context and explicit dates provided within each section of the document.

Analysis Framework:

Track result patterns over multiple encounters
Compare results to stated or inferred normal reference ranges
Correlate abnormalities with present or historical clinical conditions
Monitor rising or falling trends across repeated tests
Identify and indicate critical or clinically concerning values
Decision Rules:

You must record every explicitly mentioned lab value, including:

Inline metrics (e.g., K: 4.6, Na: 137)
Repeated values that update a previously recorded one (e.g., Creatinine 1.9 now after 2.1 previously)
Standard labs (BMP/CMP/CBC) even if no interpretation is given
Do NOT skip lab values simply because they were also referenced in a prior note or seem to reinforce a known trend. Record each instance with the proper test_date.

Do not skip BUN, potassium, sodium, glucose, WBC, platelets, or any value that might be considered part of a basic/complete metabolic panel, CMP, CBC, or routine monitoring.

This also includes single-line labs without interpreting comments (e.g., “Na: 137, K: 4.6”).
Populate the results field with value, units, and reference range when available
Flag abnormal values using context or reference ranges (set status to "abnormal" if indicated)
Track repeat tests by test name and date
Document ordering provider if specified and include test dates
Note when results are missing and mark with status: "ordered"
Omit entries that don't reference a test name (e.g., vague mentions of "labs pending")
Do not return lab entries with empty results unless status is "ordered" and value truly isn't available
Data Structure:

test_name: name of the lab (e.g., "Creatinine", "BNP")
test_date: ISO 8601 format (YYYY-MM-DD); use note context to determine when it was performed. U
results:
value: numerical or stated result, include inequality symbol if applicable (e.g., ">1000", "<3")
units: appropriate unit abbreviation (e.g., mg/dL, pg/mL)
reference_range: label as stated in note, or clearly inferred (e.g., "0.6–1.2")
ordered_by: provider or clinician name if mentioned
status: one of: "completed", "ordered", or "abnormal"
patient_id: include if provided; otherwise leave blank
created_at/updated_at: (automatically applied — set to "AUTO_GENERATE" as placeholder)
Example Output:
{
"labs": [
{
"patient_id": "423",
"test_name": "BNP",
"test_date": "2025-03-21",
"results": {
"value": 585,
"units": "pg/mL",
"reference_range": "<100"
},
"ordered_by": "Dr. Hensley",
"status": "abnormal",
"created_at": "AUTO_GENERATE",
"updated_at": "AUTO_GENERATE"
},
{
"patient_id": "423",
"test_name": "Creatinine",
"test_date": "2025-03-21",
"results": {
"value": 1.8,
"units": "mg/dL",
"reference_range": "0.6–1.2"
},
"ordered_by": "Dr. Hensley",
"status": "abnormal",
"created_at": "AUTO_GENERATE",
"updated_at": "AUTO_GENERATE"
}
]
}

Note:

Include all available fields from the structure above.
Do not omit results if a value is stated.
If no result is available, leave results empty but mark status as "ordered".
Ensure every lab object contains at least test_name and one identifying field such as test_date or status.

VITALS:
  Analysis Framework:
    - Track trends over time
    - Identify abnormal patterns
    - Correlate with conditions
    - Assess stability
    - Flag critical values

  Decision Rules:
    - Record all measurements
    - Compare to baselines
    - Flag abnormal ranges
    - Track intervention responses
    - Document context

  Data Structure:
    - Date and time
    - Measurements (BP, HR, etc)
    - Normal ranges
    - Trending data
    - Clinical context

IMAGING:
  Analysis Framework:

    Review findings from imaging reports
    Compare results to prior studies or baselines if referenced
    Track changes in pathology appearance or resolution
    Assess indications for further imaging or clinical follow-up
    Factor in related clinical concerns linked to imaging findings
    Decision Rules:

    Extract each imaging study as a structured object
    Ensure study_type is clearly defined or inferred (e.g. “CT Chest,” “MRI Brain”)
    Set study_date from documentation if available, else leave for backend to assign
    If findings or interpretation are present, populate results as an object (not free-text)
    If no results are available, return an empty results: {} and set status to "ordered"
    Use status:
    "completed" for standard findings
    "abnormal" if results indicate concern (e.g. mass, infiltrates, etc.)
    "ordered" if study is referenced but not completed
    Use provider_notes for:
    Comparisons to prior studies
    Any impressions, recommendations, or follow-up suggestions
    Technical notes if stated (e.g. "limited study due to motion")
    Include ordered_by if a provider is mentioned as requesting the study
    Only include imaging objects that contain at least a valid study_type
    Data Structure:

    study_type: name of the imaging modality and region (e.g., "CT Abdomen," "Echocardiogram")
    study_date: date of study (ISO-8601 format, YYYY-MM-DD), fallback to current date if not provided
    results: structured object containing findings (can be raw interpretation or mapped values)
    ordered_by: name of the provider who ordered the study, if available
    status: "completed", "abnormal", or "ordered"
    provider_notes: narrative observations, comparisons, or technical notes from the provider or radiologist
    patient_id: passed from context or assigned upstream
    created_at: "AUTO_GENERATE"
    updated_at: "AUTO_GENERATE"
    Example Output:
    {
    "imaging": [
    {
    "patient_id": 424,
    "study_type": "Echocardiogram",
    "study_date": "2011-09-10",
    "results": {
    "ef": "50%",
    "structural_findings": "Mild LVH and trace mitral regurgitation"
    },
    "ordered_by": "Dr. Peterson",
    "status": "abnormal",
    "provider_notes": "Compared to 2009, LVH appears progressive. Recommend repeat echo in 6 months.",
    "created_at": "AUTO_GENERATE",
    "updated_at": "AUTO_GENERATE"
    },
    {
    "patient_id": 424,
    "study_type": "Chest X-ray",
    "study_date": "2025-03-30",
    "results": {
    "findings": "No infiltrates. Lungs clear. Cardiac silhouette normal."
    },
    "ordered_by": "",
    "status": "completed",
    "provider_notes": "",
    "created_at": "AUTO_GENERATE",
    "updated_at": "AUTO_GENERATE"
    },
    {
    "patient_id": 424,
    "study_type": "CT Abdomen",
    "study_date": "2025-03-30",
    "results": {},
    "ordered_by": "Dr. Kim",
    "status": "ordered",
    "provider_notes": "Awaiting abdominal CT to evaluate for obstruction.",
    "created_at": "AUTO_GENERATE",
    "updated_at": "AUTO_GENERATE"
    }
    ]
    }

    Instructions to Model:

    Each imaging study should be returned as a separate object
    Do not leave results: {} unless the study has not yet been completed
    Avoid hallucinating study types — only use those supported by note content
    Keep JSON syntax valid and well-structured
    Ensure alignment to format: study_type, study_date, results, ordered_by, status, provider_notes

FAMILY HISTORY:
  Analysis Framework:
    - Identify hereditary risks and patterns
    - Maintain comprehensive multi-generational history
    - Track age of onset patterns
    - Assess cumulative familial risk
    - Monitor screening implications

  Decision Rules:
    - Preserve existing family history entries unless explicitly contradicted
    - Add new family members' conditions without removing others
    - Combine maternal/paternal histories for complete picture
    - Update only if new information clarifies or corrects existing entries
    - Maintain separate entries for each affected family member
    - Consolidate duplicate conditions within same relation

  Data Structure:
    - Relation (specific family member)
    - Condition with age of onset
    - Family pattern (maternal/paternal lineage)
    - Risk assessment
    - Prevention recommendations
    - Notes for contradictions or clarifications

SOCIAL HISTORY:
  Analysis Framework:
    - Evaluate lifestyle factors
    - Assess risk behaviors
    - Monitor changes
    - Review support needs
    - Track interventions

  Decision Rules:
    - Document current status
    - Record behavioral changes
    - Update risk factors
    - Plan interventions
    - Monitor progress

  Data Structure:
    - Smoking status
    - Alcohol use
    - Drug use
    - Occupation
    - Marital status
    - Exercise habits

SURGICAL HISTORY:
  Analysis Framework:
    - Review procedure outcomes
    - Track complications
    - Monitor recovery progress
    - Assess functional status
    - Review follow-up needs

  Decision Rules:
    - Evaluate all surgeries mentioned in the SOAP note
    - Return the complete list of surgeries in the response
    - Update existing surgery details if new information is available
    - Add new surgeries mentioned in the current note
    - Remove surgeries only if explicitly contradicted or corrected
    - Include past surgeries even if not mentioned in current note
    - Maintain chronological timeline of procedures
    - Update details like surgeon, facility, and complications when new information emerges

  Data Structure:
    - Procedure name and date
    - Surgeon and facility
    - Complications if any
    - Recovery notes`;

//==============================================================================
// TYPE DEFINITIONS
//==============================================================================

interface ChartData {
  medicalProblems: InsertMedicalProblem[];
  medications: InsertMedication[];
  allergies: InsertAllergy[];
  labs: InsertLab[];
  vitals: InsertVital[];
  imaging: InsertImaging[];
  familyHistory: InsertFamilyHistory[];
  socialHistory: InsertSocialHistory[];
  surgicalHistory: InsertSurgicalHistory[];
  visit_highlight?: string; // Added to store concise clinical action summary
}

interface Visit {
  date: string;
  notes: string;
}

interface Problem {
  problem?: string;
  condition_name?: string;
  condition?: string;
  notes?: string;
  progression_history?: string;
  current_visit_notes?: string;
  assessment?: string;
  icd10_code?: string;
  status?: string;
  visit_history?: Visit[];
  diagnosis_date?: string;
  created_at?: string;
}

//==============================================================================
// UTILITY FUNCTIONS
//==============================================================================

function logGptResponse(response: any) {
  console.log(
    "[GPT Service] Raw GPT Response:",
    JSON.stringify(response.choices[0].message.content, null, 2),
  );
}

// Helper function to extract date from problem - placed BEFORE being used
function extractDateFromProblem2(p: Problem): string {
  // Try to get the diagnosis_date if available
  if (p.diagnosis_date) {
    // Check if it's already a date object
    if (p.diagnosis_date instanceof Date) {
      return p.diagnosis_date.toISOString();
    }
    // Otherwise try to parse it
    try {
      return new Date(p.diagnosis_date).toISOString();
    } catch (e) {
      console.warn(
        "[GPT Service] Invalid diagnosis date format:",
        p.diagnosis_date,
      );
    }
  }
  // Fall back to created_at if available
  if (p.created_at) {
    if (p.created_at instanceof Date) {
      return p.created_at.toISOString();
    }
    try {
      return new Date(p.created_at).toISOString();
    } catch (e) {
      console.warn(
        "[GPT Service] Invalid created_at date format:",
        p.created_at,
      );
    }
  }
  // Default to current date if no valid date found
  return new Date().toISOString();
}

//==============================================================================
// MAIN SOAP NOTE PROCESSING
//==============================================================================

export async function generateMessageSuggestions(
  messageContent: string,
  patientId: number,
  messageType: string,
  suggestionType: string,
  patientData?: any,
  patientChart?: ChartData,
): Promise<string[]> {
  try {
    const startTime = Date.now();
    console.log(`[GPT Service] Starting message suggestion generation:`, {
      messageType,
      suggestionType,
      patientId,
      contentLength: messageContent.length,
      hasPatientChart: !!patientChart,
    });

    // Build the prompt based on suggestion type
    let prompt = `You are an AI assistant helping healthcare providers draft better patient communications. 

Original message: 
"""
${messageContent}
"""

`;

    // Add patient chart data if available
    if (patientChart) {
      console.log(
        "[GPT Service] Raw medical problems from chart:",
        JSON.stringify(patientChart.medicalProblems, null, 2),
      );

      // First try to use existing medical problems
      let extractedMedicalProblems = Array.isArray(
        patientChart?.medicalProblems,
      )
        ? patientChart.medicalProblems.map((problem) => ({
            ...problem,
            source: "medical_problems_section",
          }))
        : [];

      console.log(
        "[GPT Service] Extracted medical problems count:",
        extractedMedicalProblems.length,
      );

      // Only try to extract from medications if we have no medical problems
      if (
        extractedMedicalProblems.length === 0 &&
        Array.isArray(patientChart?.medications) &&
        patientChart.medications.length > 0
      ) {
        // Create a Set to avoid duplicates
        const uniqueConditions = new Set();

        patientChart.medications.forEach((med) => {
          if (
            med.medical_condition &&
            !uniqueConditions.has(med.medical_condition)
          ) {
            uniqueConditions.add(med.medical_condition);
            extractedMedicalProblems.push({
              problem: med.medical_condition,
              status: "active", // Assuming active since the medication is prescribed
              extracted_from_medication: true, // Mark as extracted
            });
          }
        });

        console.log(
          `[GPT Service] Extracted ${extractedMedicalProblems.length} medical problems from medications`,
        );
        if (extractedMedicalProblems.length > 0) {
          console.log(
            "[GPT Service] Extracted conditions:",
            extractedMedicalProblems.map((p) => p.problem).join(", "),
          );
        }
      }

      // Create a summarized version of the chart data for the prompt
      const chartSummary = {
        medicalProblems:
          // First priority: actual medical problems
          Array.isArray(patientChart?.medicalProblems) &&
          patientChart.medicalProblems.length > 0
            ? patientChart.medicalProblems
            : // Use extracted problems from medications
              extractedMedicalProblems.length > 0
              ? extractedMedicalProblems
              : // Fallback to empty array
                [],
        medications: patientChart?.medications || [],
        allergies: patientChart?.allergies || [],
        vitals: (patientChart?.vitals || []).slice(0, 3),
        labs: (patientChart?.labs || []).slice(0, 5),
        surgicalHistory: patientChart?.surgicalHistory || [],
      };

      console.log("[GPT Service] Medical problems being processed:", {
        fromPatientChart: patientChart?.medicalProblems?.length || 0,
        fromMedications: extractedMedicalProblems.length,
        finalCount: chartSummary.medicalProblems.length,
      });

      console.log(
        "[GPT Service] Medical problems being sent:",
        chartSummary.medicalProblems.length,
      );

      console.log(
        "[GPT Service] Adding patient chart data to prompt. Summary:",
        JSON.stringify(chartSummary, null, 2).substring(0, 500) + "...",
      );

      prompt += `\nPatient Chart Information:
"""
${JSON.stringify(chartSummary, null, 2)}
"""

`;
    } else {
      console.log("[GPT Service] No patient chart data available for prompt");
    }

    // Add specific instructions based on suggestion type
    switch (suggestionType) {
      case "clarity":
        prompt += `Please rephrase the above message to improve clarity and make it easier to understand. 
Keep the same meaning and medical information, but use simpler language while remaining professional.
Focus on organizing the information in a logical flow and removing any ambiguity.`;
        break;
      case "empathy":
        prompt += `Please rewrite the above message to add more empathy and compassion.
Use a supportive tone that acknowledges the patient's situation and feelings.
Maintain medical accuracy but make the message more personable and caring.`;
        break;
      case "simplify":
        prompt += `Please rewrite the above message to simplify any medical terminology.
Replace complex medical terms with plain language that a patient without medical training would understand.
Include brief explanations in parentheses for any medical terms that must be kept.`;
        break;
      case "reminder":
        prompt += `Please enhance the above message by adding relevant reminders based on typical clinical guidelines.
Add a brief, focused reminder at the end about medication adherence, follow-up appointments, or lifestyle modifications
that would be relevant to this type of communication. Keep the reminder concise and specific.`;
        break;
      case "generate":
        prompt += `Please treat the above text as instructions and generate content that follows those instructions.
If the message contains a request to create a specific type of communication (letter, email, text, etc.), 
generate that content according to the specifications provided.
If no specific format is mentioned, create a professionally formatted message suitable for healthcare communication.`;
        break;
      default:
        prompt += `Please improve the above message to make it more clear, professional, and patient-friendly.`;
    }

    prompt += `\n\nReturn only the revised message without any explanations or commentary. 
Keep the message concise and focused on the essential information. Do not use markdown formatting (no asterisks for bold/italic).

The message is for a ${messageType === "sms" ? "text message" : messageType === "call" ? "phone call script" : messageType === "email" ? "email" : "patient letter"}.`;

    // If we have patient data, we could add context here
    if (patientData) {
      prompt += `\n\nAdditional context about the patient: ${JSON.stringify(patientData)}`;
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a healthcare professional communication assistant.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
    });

    const completionTime = Date.now() - startTime;
    console.log(
      `[GPT Service] Message suggestion generated in ${completionTime}ms`,
    );

    if (!response.choices[0].message.content) {
      throw new Error("Empty response from GPT");
    }

    // Return the suggestion as an array with one item
    // This format allows for future expansion to multiple suggestions
    return [response.choices[0].message.content.trim()];
  } catch (error) {
    console.error("[GPT Service] Error generating message suggestions:", error);
    throw error;
  }
}

export async function processSOAPNoteAndParseFields(
  soapNoteContent: string,
  currentChart: ChartData,
  patientId: number,
  options: { forceProcessing?: boolean; source?: string } = {},
): Promise<ChartData> {
  const forceProcessing = options.forceProcessing === true;
  const source = options.source || "unknown";
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(7);

  // ENHANCED DEBUGGING FOR OPENAI ISSUE
  console.log(`[GPT-DEBUG-OPENAI-FIX-${requestId}] *** DEBUGGING SOAP NOTE PROCESSING ***`);
  console.log(`[GPT-DEBUG-OPENAI-FIX-${requestId}] OpenAI API Key present: ${!!process.env.OPENAI_API_KEY}`);
  console.log(`[GPT-DEBUG-OPENAI-FIX-${requestId}] Content Length: ${soapNoteContent?.length || 0}`);
  console.log(`[GPT-DEBUG-OPENAI-FIX-${requestId}] Content Preview: ${soapNoteContent?.substring(0, 100) || 'EMPTY'}`);
  console.log(`[GPT-DEBUG-OPENAI-FIX-${requestId}] Content Type: ${typeof soapNoteContent}`);
  console.log(`[GPT-DEBUG-OPENAI-FIX-${requestId}] Patient ID: ${patientId}`);
  console.log(`[GPT-DEBUG-OPENAI-FIX-${requestId}] Force Processing: ${forceProcessing}`);
  console.log(`[GPT-DEBUG-OPENAI-FIX-${requestId}] Source: ${source}`);

  console.log(
    `[GPT-DEBUG-${requestId}] ========= STARTING SOAP NOTE PROCESSING =========`,
  );
  console.log(
    `[GPT-DEBUG-${requestId}] Processing options: forceProcessing=${forceProcessing}, source=${source}`,
  );
  console.log(
    `[GPT-DEBUG-${requestId}] Starting SOAP note processing at ${new Date().toISOString()}`,
  );
  console.log(`[GPT-DEBUG-${requestId}] Patient ID: ${patientId}`);
  console.log(`[GPT-DEBUG-${requestId}] Current chart state:`, {
    hasProblems: currentChart.medicalProblems?.length > 0,
    problemsCount: currentChart.medicalProblems?.length || 0,
    hasMedications: currentChart.medications?.length > 0,
    medicationsCount: currentChart.medications?.length || 0,
    hasAllergies: currentChart.allergies?.length > 0,
    allergiesCount: currentChart.allergies?.length || 0,
    hasLabs: currentChart.labs?.length > 0,
    labsCount: currentChart.labs?.length || 0,
    hasImaging: currentChart.imaging?.length > 0,
    imagingCount: currentChart.imaging?.length || 0,
    hasVitals: currentChart.vitals?.length > 0,
    vitalsCount: currentChart.vitals?.length || 0,
  });

  if (!patientId) {
    console.error("Missing patient ID in processSOAPNoteAndParseFields");
    throw new Error("Patient ID is required");
  }

  // Construct visit history context from current chart
  const visitHistoryContext =
    currentChart.medicalProblems
      ?.map((problem) => ({
        problem: problem.problem,
        history: problem.visit_history || [],
      }))
      .filter(Boolean)
      .map(
        (p) =>
          `${p.problem}: ${p.history
            .map((v) => `${new Date(v.date).toLocaleDateString()}: ${v.notes}`)
            .join(", ")}`,
      )
      .join("\n") || "No previous visit history";

  const baseChart: ChartData = {
    medicalProblems: currentChart?.medicalProblems || [],
    medications: currentChart?.medications || [],
    allergies: currentChart?.allergies || [],
    labs: currentChart?.labs || [],
    vitals: currentChart?.vitals || [],
    imaging: currentChart?.imaging || [],
    familyHistory: currentChart?.familyHistory || [],
    socialHistory: currentChart?.socialHistory || [],
    surgicalHistory: currentChart?.surgicalHistory || [],
    visit_highlight: currentChart?.visit_highlight || "",
  };

  console.log("[GPT Service] Chart sections initialized:", {
    hasProblems: currentChart.medicalProblems.length,
    hasMeds: currentChart.medications.length,
    hasAllergies: currentChart.allergies.length,
    hasLabs: currentChart.labs.length,
  });

  console.log("\n=== GPT Processing Start ===");
  console.log("Input validation:", {
    hasContent: !!soapNoteContent,
    contentLength: soapNoteContent?.length,
    hasChart: !!currentChart,
    patientId,
  });

  const enrichedChart = {
    ...currentChart,
    surgicalHistory: currentChart.surgicalHistory?.length
      ? currentChart.surgicalHistory
      : [],
  };

  console.log(
    "Current enriched chart data:",
    JSON.stringify(enrichedChart, null, 2),
  );

  //==============================================================================
  // GPT PROMPT DEFINITION AND API CALL
  //==============================================================================

  const prompt = `
    Using the following analysis framework and decision rules:

    ${ANALYSIS_FRAMEWORK}

    Previous visit history for each condition:
    ${visitHistoryContext}

    Analyze this SOAP note and the current patient chart data. Extract and update relevant information into the appropriate sections.
    Return every section of the chart, including unchanged sections. For any section not mentioned in the SOAP note, still include existing entries from the current chart unchanged. Your JSON response must include the full current state of every section. For example, if the current chart has 3 medical problems and the new note adds 0, your response must include all 3. This ensures the chart remains complete.
    Return a valid JSON object with the following sections: medicalProblems (each with a required ICD-10 code), medications, allergies, labs, imaging, surgicalHistory, familyHistory, socialHistory, vitals, and visit_highlight.

    The visit_highlight field should be a brief, action-oriented string that summarizes the main clinical action or decision from this visit. Examples: "Started insulin for uncontrolled diabetes" or "CT brain ordered for headache evaluation".

    Important formatting requirements:
    - For medicalProblems: Always include the ICD-10 code in the format "Problem Name (ICD-10)" or separately in the icd10_code field.
    - For socialHistory: Always structure as an array of objects with these fields: smoking_status, alcohol_use, drug_use, occupation, marital_status, exercise_habits.
      Example: "socialHistory": [{"smoking_status": "Never smoker", "alcohol_use": "Occasional", "drug_use": "None", "occupation": "Teacher", "marital_status": "Married", "exercise_habits": "Regular"}]

    Current chart data:
    ${JSON.stringify(enrichedChart, null, 2)}

    SOAP Note content:
    ${soapNoteContent}

    Rules:
    1. Preserve all existing chart data unless explicitly contradicted or corrected by new information in the SOAP note.
    2. If a diagnosis, medication, or other chart entry in the SOAP note explicitly contradicts an existing entry in the chart, update or replace the chart with the latest information.
    3. Remove any entries from the chart if they are explicitly negated or corrected in the SOAP note (e.g., the patient denies a previously diagnosed condition).
    4. For allergies specifically:
     - Parse both explicit allergy sections ("Allergies:") and narrative mentions in subjective/history
     - Treat statements like "no known allergies", "denies allergies", "no known drug allergies" as valid allergy status updates
    5. Ensure there are no duplicate entries (e.g., a single diagnosis like "hypertension" should only appear once in the updated chart).
    6. Include all updated data in a complete and valid JSON object matching the required structure.
    7. For each section, provide complete structured data matching the database schema.
    8. Include patient_id (${patientId}) in all entries.
    9. Add appropriate timestamps (created_at, updated_at) for new entries.
    10. For medical problems, always include the original diagnosis_date if available in the current chart. For new problems mentioned in the SOAP note, use the SOAP note date as the diagnosis date.
    11. When preserving existing medical problems, maintain their original diagnosis_date value.
    12. If the current chart contains an empty section (e.g., no prior \`vitals\`, \`medications\`, etc.), populate it with relevant information parsed from the SOAP note. Do not skip empty sections.
    13. Avoid assumptions based on document metadata: Do not default to using scan dates or dates unrelated to the actual collection, such as document creation or modification dates, as test dates.

Special instructions for "medications":
- Do not guess at drug interactions unless stated explicitly
- Do not fabricate side effect data unless clearly mentioned in the SOAP note
- When mapping SIG (usage instructions), use the "sig" field
- Use "frequency" only to refer to timing like "twice daily", not full instructions
- Ensure typical default values are used (form: "tablet", quantity: 30, refills: 0) unless alternatives are mentioned
- Match current medications by exact name to avoid duplication
- Remove a medication only if the SOAP note explicitly says it has been stopped or discontinued

Special instructions for "visit_highlight":
- This should be a single, concise sentence that captures the main clinical action or decision
- Focus on the most significant clinical action: medication changes, new diagnoses, tests ordered, or procedures performed
- Use active, action-oriented phrasing (e.g., "Started", "Adjusted", "Ordered", "Diagnosed")
- Keep it short and focused on the primary clinical action or decision
- If multiple actions were taken, focus on the most clinically significant one
- Examples: "Initiated metformin for new-onset type 2 diabetes", "Adjusted warfarin dose based on elevated INR", "Ordered CT scan for persistent headache"

    `;

  try {
    const apiCallStartTime = Date.now();
    console.log(
      `[TIMING] Starting OpenAI API call at ${new Date().toISOString()}`,
    );

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: prompt,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0,
    });

    const apiCallEndTime = Date.now();
    console.log(
      `[TIMING] OpenAI API call completed in ${apiCallEndTime - apiCallStartTime}ms`,
    );

    console.log(
      "[GPT Response] Raw content:",
      response.choices[0].message.content,
    );

    if (!response.choices[0].message.content) {
      throw new Error("Empty response from GPT");
    }

    // Log the raw GPT response for debugging
    logGptResponse(response);
    const parsedResponse = JSON.parse(response.choices[0].message.content);
    console.log(
      "[GPT Service] GPT-parsed chart updates:",
      JSON.stringify(parsedResponse, null, 2),
    );

    if (
      !parsedResponse.surgicalHistory ||
      parsedResponse.surgicalHistory.length === 0
    ) {
      console.warn(
        "[GPT Service] 🚨 WARNING: GPT response is missing surgical history! This may cause unintended deletion of prior surgeries.",
      );
      console.warn(
        "[GPT Service] Current chart surgical history:",
        JSON.stringify(currentChart.surgicalHistory, null, 2),
      );
    }

    console.log(
      "[GPT Response] GPT-parsed JSON:",
      JSON.stringify(parsedResponse, null, 2),
    );

    console.log("\nProcessing Time:", `${Date.now() - startTime}ms`);

    //==============================================================================
    // CHART DATA NORMALIZATION
    //==============================================================================

    // Define defaults for array sections
    const sectionArrayDefaults = {
      medicalProblems: [],
      medications: [],
      allergies: [],
      labs: [],
      vitals: [],
      imaging: [],
      familyHistory: [],
      socialHistory: [],
      surgicalHistory: [],
    };

    // Define defaults for all sections including non-array types
    const sectionDefaults = {
      ...sectionArrayDefaults,
      visit_highlight: "",
    };

    // Process the parsed response, handling both array and non-array fields
    const processedResponse = Object.entries(parsedResponse).reduce(
      (acc, [key, value]) => {
        // Handle visit_highlight as a string field, not an array
        if (key === "visit_highlight") {
          acc[key] = typeof value === "string" ? value : "";
        } else {
          // For all other fields expect arrays
          acc[key] = Array.isArray(value) ? value : [];
        }
        return acc;
      },
      {} as Record<string, any>,
    );

    const normalizedResponse = {
      ...sectionDefaults,
      ...processedResponse,
    } as ChartData;

    (Object.keys(normalizedResponse) as Array<keyof ChartData>).forEach(
      (section) => {
        if (Array.isArray(normalizedResponse[section])) {
          normalizedResponse[section] = normalizedResponse[section].map(
            (item: any) => {
              const processedItem = { ...item };
              return {
                ...processedItem,
                patient_id: patientId,
                created_at: new Date(),
                updated_at: new Date(),
              };
            },
          );
        }
      },
    );

    //==============================================================================
    // MEDICAL PROBLEMS FORMATTING AND PROCESSING
    //==============================================================================

    console.log("[GPT Service] Starting medical problems formatting");

    // First try to parse medical problems using the dedicated API endpoint
    try {
      console.log(
        "\n[GPT Service] *** STARTING MEDICAL PROBLEMS EXTRACTION ***",
      );
      console.log("[GPT Service] 🤖 ATTEMPTING TO USE GPT API PARSER 🤖");
      console.log(
        "[GPT Service] Calling problems parser API with SOAP note content (length):",
        soapNoteContent.length,
      );

      ////// Use the same medical problems parsing endpoint as we defined ----> ROUTES --> medical-problems-parser-service
      const medicalProblemsApiStartTime = Date.now();
      console.log(
        `[TIMING] Starting medical problems API call at ${new Date().toISOString()}`,
      );

      const problemsResponse = await fetch(
        `${process.env.HOST_URL || "http://localhost:5000"}/api/parse-medical-problems`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            problemsText: soapNoteContent,
            currentChart: currentChart,
          }),
        },
      );

      const medicalProblemsApiEndTime = Date.now();
      console.log(
        `[TIMING] Medical problems API call completed in ${medicalProblemsApiEndTime - medicalProblemsApiStartTime}ms`,
      );

      ////////---> medical-problems-parser-service --> ROUTES -->
      console.log(
        "[GPT Service] Problems API response status:",
        problemsResponse.status,
      );

      if (problemsResponse.ok) {
        const extractedProblems = await problemsResponse.json();
        console.log(
          "[GPT Service] Extracted medical problems:",
          JSON.stringify(extractedProblems, null, 2),
        );

        if (extractedProblems && extractedProblems.length > 0) {
          console.log(
            "[GPT Service] ✅ SUCCESS: Found",
            extractedProblems.length,
            "medical problems with GPT API parser",
          );

          // Simply use the raw GPT response directly
          console.log(
            "[GPT Service] Using raw GPT response for medical problems",
          );
          console.log("[GPT Service] Parsed chart updates:", {
            medicalProblems: extractedProblems,
          });

          // Use the raw GPT response without additional processing
          normalizedResponse.medicalProblems = extractedProblems;
          console.log(
            "[GPT Service] 🤖 SUCCESSFULLY USING RAW GPT API RESPONSE FOR MEDICAL PROBLEMS 🤖",
          );
        } else {
          console.log(
            "[GPT Service] ⚠️ WARNING: No medical problems extracted from GPT API",
          );
          console.log(
            "[GPT Service] 🔍 FALLING BACK TO REGEX-BASED PARSING 🔍",
          );
          proceedWithFallbackParsing();
        }
      } else {
        console.log(
          "[GPT Service] ❌ ERROR: Failed to extract medical problems with GPT API parser",
        );
        console.log("[GPT Service] 🔍 FALLING BACK TO REGEX-BASED PARSING 🔍");
        proceedWithFallbackParsing();
      }
    } catch (error) {
      console.error(
        "[GPT Service] ❌ ERROR extracting medical problems with GPT API:",
        error,
      );
      console.log("[GPT Service] 🔍 FALLING BACK TO REGEX-BASED PARSING 🔍");
      proceedWithFallbackParsing();
    }

    // Fallback parsing function
    function proceedWithFallbackParsing() {
      console.log("[GPT Service] 🔍 BEGINNING REGEX-BASED FALLBACK PARSING 🔍");
      const formattedProblems = (
        normalizedResponse.medicalProblems as Problem[]
      ).map((p: Problem) => {
        console.log("[GPT Service] Processing medical problem:", {
          raw: p,
          problemName: p.problem || p.condition_name || p.condition,
          notes:
            p.notes ||
            p.progression_history ||
            p.current_visit_notes ||
            p.assessment,
        });

        const extractICD10 = (text: string): string => {
          if (!text) return "";
          console.log("[GPT Service] Extracting ICD10 from:", text);
          const formats = [
            /\(([A-Z][0-9][0-9A-Z]\.?[0-9A-Z]*)\)/,
            /([A-Z][0-9][0-9A-Z]\.?[0-9A-Z]*)/,
          ];

          for (const format of formats) {
            const match = text.match(format);
            if (match) return match[1];
          }
          return "";
        };

        const rawProblem = p.problem || p.condition_name || p.condition || "";
        const problem = rawProblem
          .replace(/\s*\([A-Z][0-9][0-9A-Z]\.?[0-9A-Z]*\)\s*:?$/, "")
          .trim();
        const icd10_code = p.icd10_code || extractICD10(rawProblem) || "";

        const existingProblem = currentChart.medicalProblems.find(
          (mp) =>
            mp.problem
              .replace(/\s*\([A-Z][0-9][0-9A-Z]\.?[0-9A-Z]*\)\s*:?$/, "")
              .trim() === problem,
        );

        // Get existing visit history
        const existingVisitHistory = existingProblem?.visit_history || [];

        // Format current visit notes
        const currentVisitNotes = [
          p.notes,
          p.progression_history,
          p.assessment,
          p.current_visit_notes,
        ]
          .filter(Boolean)
          .join("\n")
          .trim();

        // Include visit history in GPT prompt
        const visitHistoryContext =
          existingVisitHistory.length > 0
            ? `Previous visits:\n${existingVisitHistory
                .map(
                  (v) =>
                    `- ${new Date(v.date).toLocaleDateString()}: ${v.notes}`,
                )
                .join("\n")}\n`
            : "";

        if (!currentVisitNotes) {
          console.warn(
            "[GPT Service] Warning: No notes found for current visit",
          );
        }

        const currentVisit: Visit = {
          date: new Date().toISOString(),
          notes: currentVisitNotes,
        };

        // Remove duplicate declaration
        const visitHistory = [
          currentVisit,
          ...(Array.isArray(existingProblem?.visit_history)
            ? existingProblem.visit_history
            : []),
        ].sort(
          (a: Visit, b: Visit) =>
            new Date(b.date).getTime() - new Date(a.date).getTime(),
        );

        // Add visit history to the normalized problem data
        p.visit_history = visitHistory;

        console.log("[GPT Service] Visit history constructed:", {
          problem,
          icd10_code,
          visitHistory,
          currentVisitNotes,
        });

        return {
          patient_id: patientId,
          problem,
          icd10_code,
          diagnosis_date: extractDateFromProblem2(p),
          status: p.status || "active",
          visit_history: visitHistory,
          created_at: existingProblem?.created_at
            ? new Date(existingProblem.created_at)
            : new Date(),
          updated_at: new Date(),
        };
      });

      normalizedResponse.medicalProblems = formattedProblems;
      console.log(
        "[GPT Service] 🔍 COMPLETED REGEX-BASED FALLBACK PARSING WITH",
        formattedProblems.length,
        "PROBLEMS 🔍",
      );
    }

    //==============================================================================
    // MEDICATIONS FORMATTING AND PROCESSING
    //==============================================================================

    console.log("[GPT Service] Starting medications formatting");

    // Check if medications data exists before processing
    if (
      normalizedResponse.medications &&
      normalizedResponse.medications.length > 0
    ) {
      const formattedMedications = normalizedResponse.medications
        .filter((med: any) => med.name || med.medication_name) // Only include medications with a name
        .map((med: any) => {
          const medicationName = med.name || med.medication_name || "";
          const dosage = med.dosage || med.strength || "Not specified";

          // Use provided form or infer from name
          const form =
            med.form ||
            (medicationName.toLowerCase().includes("capsule")
              ? "capsule"
              : "tablet");

          // Separate frequency and sig
          const frequency = med.frequency || ""; // e.g., "Once daily", "BID", etc.
          const sig = med.sig || med.instructions || "Take as directed"; // Full instruction string

          const quantity = med.quantity || med.dispense || 30;
          const refills = med.refills || 0;

          console.log("[GPT Service] Processing medication:", {
            name: medicationName,
            dosage,
            frequency,
          });

          // Find if this medication already exists in the current chart
          const existingMedication = currentChart.medications.find(
            (m) => m.medication_name === medicationName,
          );

          return {
            patient_id: patientId,
            medication_name: medicationName,
            dosage: dosage,
            frequency: frequency, // Only short interval descriptions here
            sig: sig, // Full dosing instructions go here
            form: form,
            quantity: quantity,
            refills: refills,
            start_date: med.start_date ? new Date(med.start_date) : new Date(),
            end_date: med.end_date ? new Date(med.end_date) : null,
            prescriber: med.prescriber || "",
            created_at: existingMedication?.created_at
              ? new Date(existingMedication.created_at)
              : new Date(),
            updated_at: new Date(),
          };
        });

      normalizedResponse.medications = formattedMedications;
      console.log(
        `[GPT Service] Processed ${formattedMedications.length} medications`,
      );
    } else {
      console.log("[GPT Service] No medications to process");
    }

    //==============================================================================
    // SOCIAL HISTORY FORMATTING AND PROCESSING
    //==============================================================================

    // Log the raw social history data for debugging
    console.log(
      "[GPT Service] Starting social history parsing. Raw data:",
      JSON.stringify(normalizedResponse.socialHistory, null, 2),
    );
    console.log("[GPT Service] Starting social history formatting");

    // Normalize social history data before processing
    // Handle different formats: array, single object, or empty data
    let socialHistoryArray = [];

    try {
      if (normalizedResponse.socialHistory) {
        // If it's an array, use it directly
        if (Array.isArray(normalizedResponse.socialHistory)) {
          socialHistoryArray = normalizedResponse.socialHistory;
        }
        // If it's an object but not an array, wrap it in an array
        else if (typeof normalizedResponse.socialHistory === "object") {
          socialHistoryArray = [normalizedResponse.socialHistory];
        }
        // If it's a string, try to parse it as JSON
        else if (typeof normalizedResponse.socialHistory === "string") {
          try {
            const parsed = JSON.parse(normalizedResponse.socialHistory);
            if (Array.isArray(parsed)) {
              socialHistoryArray = parsed;
            } else {
              socialHistoryArray = [parsed];
            }
          } catch (e) {
            // If can't parse as JSON, create an entry with what we have
            socialHistoryArray = [
              { description: normalizedResponse.socialHistory },
            ];
          }
        }
      }

      // Check if we have any social history data to process
      if (socialHistoryArray.length === 0) {
        console.log(
          "[GPT Service] No new social history data to process, preserving existing data",
        );
        // Preserve existing social history data if no new data is provided
        normalizedResponse.socialHistory = currentChart.socialHistory || [];
      } else {
        // Format social history with normalized data
        const formattedSocialHistory = socialHistoryArray.map((entry: any) => ({
          patient_id: patientId,
          smoking_status: entry.smoking_status || null,
          alcohol_use: entry.alcohol_use || null,
          drug_use: entry.drug_use || null,
          occupation: entry.occupation || null,
          marital_status: entry.marital_status || null,
          exercise_habits: entry.exercise_habits || null,
          created_at: new Date(),
          updated_at: new Date(),
        }));

        console.log(
          "[GPT Service] Normalized social history array:",
          JSON.stringify(socialHistoryArray, null, 2),
        );

        normalizedResponse.socialHistory = formattedSocialHistory;
      }
    } catch (error) {
      console.error("[GPT Service] Error formatting social history:", error);
      // Preserve existing social history data in case of error
      normalizedResponse.socialHistory = currentChart.socialHistory || [
        {
          patient_id: patientId,
          smoking_status: null,
          alcohol_use: null,
          drug_use: null,
          occupation: null,
          marital_status: null,
          exercise_habits: null,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];
    }
    console.log(
      "[GPT Service] Final formatted social history:",
      normalizedResponse.socialHistory,
    );

    //==============================================================================
    // FAMILY HISTORY FORMATTING AND PROCESSING
    //==============================================================================

    console.log("[GPT Service] Starting family history formatting");

    try {
      if (
        normalizedResponse.familyHistory &&
        normalizedResponse.familyHistory.length > 0
      ) {
        // Format family history with normalized data
        const formattedFamilyHistory = normalizedResponse.familyHistory
          .filter((history: any) => history.relation || history.condition)
          .map((history: any) => ({
            patient_id: patientId,
            relation: history.relation || "Unknown",
            condition:
              history.condition || history.condition_name || "Unspecified",
            age_of_onset: history.age_of_onset || null,
            notes: history.notes || null,
            created_at: new Date(),
            updated_at: new Date(),
          }));

        console.log(
          "[GPT Service] Formatted family history:",
          JSON.stringify(formattedFamilyHistory, null, 2),
        );

        normalizedResponse.familyHistory = formattedFamilyHistory;
      } else {
        console.log(
          "[GPT Service] No new family history to process, preserving existing data",
        );
        normalizedResponse.familyHistory = currentChart.familyHistory || [];
      }
    } catch (error) {
      console.error("[GPT Service] Error formatting family history:", error);
      normalizedResponse.familyHistory = currentChart.familyHistory || [];
    }

    //==============================================================================
    // ALLERGIES FORMATTING AND PROCESSING
    //==============================================================================

    console.log("[GPT Service] Starting allergies formatting");

    // Format allergies with normalized data
    try {
      if (
        normalizedResponse.allergies &&
        normalizedResponse.allergies.length > 0
      ) {
        const formattedAllergies = normalizedResponse.allergies
          .filter((allergy: any) => allergy.allergen || allergy.trigger)
          .map((allergy: any) => ({
            patient_id: patientId,
            allergen: allergy.allergen || allergy.trigger || "Unknown",
            reaction: allergy.reaction || allergy.reaction_description || null,
            severity: allergy.severity || allergy.severity_level || null,
            created_at: new Date(),
            updated_at: new Date(),
          }));

        console.log(
          "[GPT Service] Formatted allergies:",
          JSON.stringify(formattedAllergies, null, 2),
        );

        normalizedResponse.allergies = formattedAllergies;
      } else {
        console.log("[GPT Service] No allergies to process");
      }
    } catch (error) {
      console.error("[GPT Service] Error formatting allergies:", error);
      normalizedResponse.allergies = [];
    }

    //==============================================================================
    // VITALS PROCESSING - Physical measurements & signs
    //==============================================================================

    console.log("[GPT Service] Starting vitals extraction:", {
      sourceType: soapNoteContent?.includes("SOAP Note")
        ? "soap_note"
        : "attachment",
      requestId: Math.random().toString(36).substring(7),
      timestamp: new Date().toISOString(),
      contentLength: soapNoteContent?.length,
      // Add more diagnostic info to help track the issue
      existingVitals: currentChart.vitals ? currentChart.vitals.length : 0,
      hasExistingMedications:
        currentChart.medications && currentChart.medications.length > 0,
      hasExistingProblems:
        currentChart.medicalProblems && currentChart.medicalProblems.length > 0,
      method:
        currentChart.vitals && currentChart.vitals.length > 0
          ? "Method A (with existing vitals)"
          : "Method B (no existing vitals)",
    });

    // Format vitals with normalized data
    try {
      // Parse vitals using the client-side API for consistency
      try {
        // Initialize a flag to control vitals processing
        let skipVitalsProcessing = false;

        // Check if there are already vitals in the incoming currentChart
        // We need to prevent duplicates when the SOAP note is already processed
        // Unless force processing is enabled, which ensures all data is processed completely
        if (
          currentChart.vitals &&
          Array.isArray(currentChart.vitals) &&
          currentChart.vitals.length > 0 &&
          !forceProcessing // Skip only if not forcing processing
        ) {
          console.log(
            `[GPT Service] SKIPPING vitals extraction - ${currentChart.vitals.length} vitals already exist in currentChart`,
          );
          // Use the vitals that already exist in the chart - don't reprocess
          normalizedResponse.vitals = currentChart.vitals;

          // CRITICAL BUG FIX: Do NOT return from the function here as it prevents processing other chart sections
          // Instead, set a flag to skip only the vitals processing but continue with other chart data
          skipVitalsProcessing = true;
          console.log(
            `[GPT Service] Skipping vitals extraction - using ${currentChart.vitals.length} existing vitals`,
          );
        } else if (forceProcessing) {
          console.log(
            `[GPT Service] Force processing flag is set - will reprocess vitals even if they exist`,
          );
        }

        // Only proceed with vitals extraction if we're not skipping it
        if (!skipVitalsProcessing) {
          // First use the same vital parsing endpoint as the client uses
          console.log(
            "[GPT Service] Attempting primary vitals extraction via API endpoint",
          );
          // This is a server-side extraction for database persistence
          const vitalsResponse = await fetch(
            `${process.env.HOST_URL || "http://localhost:5000"}/api/parse-vitals`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                vitalsText: soapNoteContent,
                // When processing a SOAP note on server side, we are NOT in display-only mode
                // This is the actual extraction that should be saved to the database
                displayOnly: false,
              }),
            },
          );

          if (!vitalsResponse.ok) {
            console.error(
              "[GPT Service] Failed to extract vitals from SOAP Note",
            );
            normalizedResponse.vitals = [];
          } else {
            const extractedVitals = await vitalsResponse.json();
            console.log("[GPT Service] Primary extraction path results:", {
              hasVitals: !!extractedVitals,
              timestamp: new Date().toISOString(),
              path: "api_endpoint",
            });

            const vitalsArray = Array.isArray(extractedVitals)
              ? extractedVitals
              : [extractedVitals];

            const normalizedVitals = vitalsArray.map((vital) => ({
              blood_pressure_systolic: vital.blood_pressure_systolic ?? null,
              blood_pressure_diastolic: vital.blood_pressure_diastolic ?? null,
              heart_rate: vital.heart_rate ?? null,
              respiratory_rate: vital.respiratory_rate ?? null,
              temperature: vital.temperature ?? null,
              temperature_unit: vital.temperature_unit ?? "F",
              oxygen_saturation: vital.oxygen_saturation ?? null,
              height: vital.height ?? null,
              weight: vital.weight ?? null,
              measured_at: toUTCDate(
                vital.measured_at || new Date(),
              ).toISOString(),
              created_at: toUTCDate(new Date()).toISOString(),
              updated_at: toUTCDate(new Date()).toISOString(),
            }));

            normalizedResponse.vitals = normalizedVitals;
          }
        }
      } catch (error) {
        console.error("[GPT Service] Error extracting vitals:", error);
      }

      if (normalizedResponse.vitals && normalizedResponse.vitals.length > 0) {
        // First create properly formatted vitals from the API response
        const formattedVitals = normalizedResponse.vitals.map((vital: any) => {
          console.log("[GPT Service] Processing vital:", vital);
          return {
            patient_id: parseInt(patientId),
            blood_pressure_systolic:
              vital.blood_pressure_systolic || vital.systolic || null,
            blood_pressure_diastolic:
              vital.blood_pressure_diastolic || vital.diastolic || null,
            heart_rate: vital.heart_rate || vital.pulse || null,
            respiratory_rate:
              vital.respiratory_rate || vital.respiration || null,
            temperature: vital.temperature || null,
            temperature_unit: vital.temperature_unit || "F",
            oxygen_saturation: vital.oxygen_saturation || vital.spo2 || null,
            height: vital.height || null,
            weight: vital.weight || null,
            measured_at: vital.measured_at
              ? new Date(vital.measured_at)
              : new Date(),
            created_at: new Date(),
            updated_at: new Date(),
          };
        });

        console.log(
          "[GPT Service] Formatted vitals:",
          JSON.stringify(formattedVitals, null, 2),
        );

        // Check if any valid vitals data was found in the API response
        const hasAPIExtractedVitals = formattedVitals.some(
          (vital) =>
            vital.blood_pressure_systolic ||
            vital.blood_pressure_diastolic ||
            vital.heart_rate ||
            vital.respiratory_rate ||
            vital.temperature ||
            vital.oxygen_saturation,
        );

        // Disabled regex extraction for SOAP notes completely to prevent duplication
        if (!hasAPIExtractedVitals) {
          console.log(
            "[GPT Service] No valid vitals extracted by API. Regex extraction has been disabled.",
          );
          // Regex extraction disabled - the following code is commented out
          /*
            const extractedVital = await extractVitalsFromText(soapNoteContent);

            if (extractedVital.hasValues) {
              console.log(
                "[GPT Service] Successfully extracted vitals from text:",
                extractedVital,
              );
              // Clear any empty placeholders and use the regex extracted vital
              formattedVitals.length = 0;
              formattedVitals.push(extractedVital); // Push entire vital into the array
            }
            */
        } else {
          console.log(
            "[GPT Service] Using API-parsed vitals. Skipping additional extraction.",
          );
        }

        // Use API endpoint instead of direct DB insertion
        try {
          // Send vitals to API endpoint using server-side API
          const { default: axios } = await import("axios");
          const baseUrl = process.env.BASE_URL || "http://localhost:5000";
          const response = await axios.post(
            `${baseUrl}/api/patients/${patientId}/vitals`,
            formattedVitals, // Send the array directly without wrapping in a 'vitals' object
          );

          if (response.status !== 201) {
            throw new Error(
              `Failed to store vitals via API: ${response.statusText}`,
            );
          }

          console.log(
            "[GPT Service] Vitals successfully sent to API endpoint:",
            response.data.length,
            "vitals saved",
          );
          // Store the formatted vitals in normalizedResponse so they're available to the calling function,
          // but don't directly insert them into the database
          normalizedResponse.vitals = formattedVitals;
        } catch (apiError) {
          console.error("[GPT Service] Error sending vitals to API:", apiError);
          // If API call fails, still include vitals in the response for consistency
          normalizedResponse.vitals = formattedVitals;
        }
      } else {
        console.log("[GPT Service] No vitals to process");
        normalizedResponse.vitals = [];
      }
    } catch (error) {
      console.error("[GPT Service] Error formatting vitals:", error);
      normalizedResponse.vitals = [];
    }

    // Helper function to extract vitals directly from SOAP note text
    async function extractVitalsFromText(text: string): Promise<any> {
      const extractedVital: any = {
        patient_id: patientId,
        hasValues: false,
      };

      // Extract blood pressure (e.g., "120/80" or "BP 120/80")
      const bpMatch = text.match(/(?:BP\s*)?(\d{2,3})\s*\/\s*(\d{2,3})/i);
      if (bpMatch) {
        const systolic = parseInt(bpMatch[1]);
        const diastolic = parseInt(bpMatch[2]);

        // Validate blood pressure values are in normal range
        if (
          systolic >= 70 &&
          systolic <= 220 &&
          diastolic >= 40 &&
          diastolic <= 120
        ) {
          extractedVital.blood_pressure_systolic = systolic;
          extractedVital.blood_pressure_diastolic = diastolic;
          extractedVital.hasValues = true;
        } else {
          console.log(
            "[GPT Service] Invalid blood pressure values detected:",
            systolic,
            "/",
            diastolic,
          );
        }
      }

      // Extract heart rate (e.g., "HR 72" or "P 72" or "Pulse 72" or "HR 72 bpm")
      const hrMatch = text.match(
        /(?<!BP\s*)(?:HR|(?<!B)P|Pulse)\s*(\d{2,3})\s*(?:bpm)?/i,
      );
      if (hrMatch) {
        extractedVital.heart_rate = parseInt(hrMatch[1]);
        extractedVital.hasValues = true;
      }

      // Extract respiratory rate (e.g., "RR 16")
      const rrMatch = text.match(/RR\s*(\d{1,2})/i);
      if (rrMatch) {
        extractedVital.respiratory_rate = parseInt(rrMatch[1]);
        extractedVital.hasValues = true;
      }

      // Extract temperature (e.g., "T 98.6F" or "Temp 37.2C")
      const tempMatch = text.match(
        /(?:T|Temp)\s*(\d{1,3}(?:\.\d+)?)\s*([FC])?/i,
      );
      if (tempMatch) {
        extractedVital.temperature = parseFloat(tempMatch[1]);
        if (tempMatch[2]) {
          extractedVital.temperature_unit = tempMatch[2].toUpperCase();
        }
        extractedVital.hasValues = true;
      }

      // Extract oxygen saturation with multiple approaches, matching chart-section.tsx
      // 1. Try with prefix (O2, SpO2, etc.)
      const o2WithPrefixMatch = text.match(
        /(?:O2|O₂|SpO2|Sat)\s*(\d{1,3})\s*%?/i,
      );
      if (o2WithPrefixMatch) {
        extractedVital.oxygen_saturation = parseInt(o2WithPrefixMatch[1]);
        extractedVital.hasValues = true;
      }

      // 2. Try with just a percentage
      if (!extractedVital.oxygen_saturation) {
        const simplePercentMatch = text.match(/\b(\d{2,3})\s{0,2}%\b/i);
        if (simplePercentMatch) {
          extractedVital.oxygen_saturation = parseInt(simplePercentMatch[1]);
          extractedVital.hasValues = true;
        }
      }

      // 3. Look for standalone numbers in the SpO2 range (if not part of BP)
      if (!extractedVital.oxygen_saturation) {
        const possibleO2Values = text.match(/\b(9[0-9]|100)\b/g);
        if (possibleO2Values) {
          const nonBPValues = possibleO2Values.filter((value) => {
            return !text.includes(`/${value}`);
          });
          if (nonBPValues.length > 0) {
            extractedVital.oxygen_saturation = parseInt(nonBPValues[0]);
            extractedVital.hasValues = true;
          }
        }
      }

      // Extract height with multiple format support
      const heightCmMatch = text.match(
        /(?:Ht|Height)\s*(\d+(?:\.\d+)?)\s*(?:cm|centimeters)/i,
      );
      const heightMMatch = text.match(
        /(?:Ht|Height)\s*(\d+(?:\.\d+)?)\s*(?:m|meters)/i,
      );
      const heightFtInMatch = text.match(
        /(?:Ht|Height)\s*(\d+)[\s\'\"]*(?:ft|feet)?\s*(?:and)?\s*(\d+)?[\s\'\"]*(?:in|inches)?/i,
      );
      const simpleCmMatch = text.match(/\b(\d{2,3})\s*cm\b/i);

      if (heightCmMatch) {
        extractedVital.height = parseFloat(heightCmMatch[1]);
        extractedVital.hasValues = true;
      } else if (heightMMatch) {
        extractedVital.height = parseFloat(heightMMatch[1]) * 100;
        extractedVital.hasValues = true;
      } else if (heightFtInMatch) {
        const feet = parseInt(heightFtInMatch[1]);
        const inches = heightFtInMatch[2] ? parseInt(heightFtInMatch[2]) : 0;
        extractedVital.height = feet * 30.48 + inches * 2.54;
        extractedVital.hasValues = true;
      } else if (simpleCmMatch) {
        extractedVital.height = parseFloat(simpleCmMatch[1]);
        extractedVital.hasValues = true;
      }

      // Extract weight with multiple format support
      const weightKgMatch = text.match(
        /(?:Wt|Weight)\s*(\d+(?:\.\d+)?)\s*(?:kg|kilograms)/i,
      );
      const weightLbMatch = text.match(
        /(?:Wt|Weight)\s*(\d+(?:\.\d+)?)\s*(?:lb|lbs|pounds)/i,
      );
      const simpleKgMatch = text.match(/\b(\d+(?:\.\d+)?)\s*kg\b/i);

      if (weightKgMatch) {
        extractedVital.weight = parseFloat(weightKgMatch[1]);
        extractedVital.hasValues = true;
      } else if (weightLbMatch) {
        extractedVital.weight = parseFloat(weightLbMatch[1]) * 0.453592;
        extractedVital.hasValues = true;
      } else if (simpleKgMatch) {
        extractedVital.weight = parseFloat(simpleKgMatch[1]);
        extractedVital.hasValues = true;
      }

      return extractedVital;
    }

    //==============================================================================
    // LABS FORMATTING AND PROCESSING
    //==============================================================================

    console.log("[GPT Service] Starting labs formatting");

    // ✅ FIXED: Properly return a Date object
    const setTimeToNoon = (dateStr: string): Date => {
      const date = new Date(dateStr);
      date.setHours(12, 0, 0, 0);
      return date;
    };

    try {
      if (normalizedResponse.labs && normalizedResponse.labs.length > 0) {
        const formattedLabs = normalizedResponse.labs
          .filter((lab: any) => lab.test_name || lab.test)
          .map((lab: any) => ({
            patient_id: patientId,
            test_name: lab.test_name || lab.test || "Unknown Test",
            test_date: lab.test_date
              ? setTimeToNoon(lab.test_date)
              : setTimeToNoon(new Date().toISOString()),
            results: lab.results || {},
            ordered_by: lab.ordered_by || "",
            status: lab.status || "ordered",
            created_at: setTimeToNoon(new Date().toISOString()),
            updated_at: setTimeToNoon(new Date().toISOString()),
          }));

        console.log(
          "[GPT Service] Formatted labs:",
          JSON.stringify(formattedLabs, null, 2),
        );

        // Merge with existing labs in the chart
        const existingLabs: any[] = Array.isArray(currentChart?.labs)
          ? currentChart.labs
          : [];

        const mergedLabs = [...existingLabs];

        for (const newLab of formattedLabs) {
          const isDuplicate = mergedLabs.some((lab) => {
            const sameName =
              lab.test_name?.toLowerCase() === newLab.test_name?.toLowerCase();
            const sameDate =
              new Date(lab.test_date).toISOString().split("T")[0] ===
              new Date(newLab.test_date).toISOString().split("T")[0];
            const sameValue =
              lab.results?.value === newLab.results?.value &&
              lab.results?.units === newLab.results?.units;

            return sameName && sameDate && sameValue;
          });

          if (!isDuplicate) {
            mergedLabs.push(newLab);
          }
        }

        console.log(
          "[GPT Service] Final merged labs across all visits:",
          JSON.stringify(mergedLabs, null, 2),
        );

        // Save the merged version
        normalizedResponse.labs = mergedLabs;
      } else {
        console.log("[GPT Service] No labs to process");
      }
    } catch (error) {
      console.error("[GPT Service] Error formatting labs:", error);
      normalizedResponse.labs = [];
    }

    //==============================================================================
    // IMAGING FORMATTING AND PROCESSING
    //==============================================================================

    console.log("[GPT Service] Starting imaging formatting");

    // Format imaging with normalized data
    try {
      if (normalizedResponse.imaging && normalizedResponse.imaging.length > 0) {
        const formattedImaging = normalizedResponse.imaging
          .filter((img: any) => img.study_type)
          .map((img: any) => ({
            patient_id: patientId,
            study_type: img.study_type,
            study_date: img.study_date ? new Date(img.study_date) : new Date(),
            results: img.results || img.findings || {},
            ordered_by: img.ordered_by || "",
            status: img.status || "ordered",
            provider_notes: img.provider_notes || img.notes || "",
            created_at: new Date(),
            updated_at: new Date(),
          }));

        console.log(
          "[GPT Service] Formatted imaging:",
          JSON.stringify(formattedImaging, null, 2),
        );

        normalizedResponse.imaging = formattedImaging;
      } else {
        console.log(
          "[GPT Service] No new imaging data to process, preserving existing data",
        );
        // Preserve existing imaging data if no new data is provided
        normalizedResponse.imaging = currentChart.imaging || [];
      }
    } catch (error) {
      console.error("[GPT Service] Error formatting imaging:", error);
      // Preserve existing imaging data in case of error
      normalizedResponse.imaging = currentChart.imaging || [];
    }

    //==============================================================================
    // SURGICAL HISTORY FORMATTING AND PROCESSING
    //==============================================================================

    console.log("[GPT Service] Starting surgical history formatting");

    try {
      if (
        normalizedResponse.surgicalHistory &&
        normalizedResponse.surgicalHistory.length > 0
      ) {
        // Process surgical history similar to medical problems, allowing GPT to make updates
        const formattedSurgicalHistory = normalizedResponse.surgicalHistory
          .filter(
            (surgery: any) =>
              surgery.procedure_name || surgery.procedure || surgery.note,
          )
          .map((surgery: any) => {
            // Handle various date formats
            let surgeryDate;
            if (surgery.date instanceof Date) {
              surgeryDate = surgery.date;
            } else if (typeof surgery.date === "string") {
              const yearMatch = surgery.date.match(/^\d{4}$/);
              if (yearMatch) {
                // For year-only values, use January 1st of that year
                // This ensures the correct year displays in the UI
                const year = parseInt(yearMatch[0]);
                surgeryDate = new Date(Date.UTC(year, 0, 1));
              } else {
                surgeryDate = new Date(surgery.date);
              }
            } else {
              surgeryDate = new Date();
            }

            // Determine procedure name with fallbacks
            const procedure =
              surgery.procedure_name ||
              surgery.procedure ||
              surgery.note ||
              "Unspecified Procedure";

            // Find matching surgery in existing history
            const existingEntry = currentChart.surgicalHistory?.find(
              (existing) =>
                existing.procedure.toLowerCase() === procedure.toLowerCase() &&
                new Date(existing.date).getTime() === surgeryDate.getTime(),
            );

            return {
              patient_id: patientId,
              date: surgeryDate,
              procedure: procedure,
              surgeon: surgery.surgeon || existingEntry?.surgeon || "",
              facility: surgery.facility || existingEntry?.facility || "",
              notes: surgery.notes || existingEntry?.notes || "",
              created_at: existingEntry?.created_at
                ? new Date(existingEntry.created_at)
                : new Date(),
              updated_at: new Date(),
            };
          });

        console.log(
          "[GPT Service] Formatted surgical history:",
          JSON.stringify(formattedSurgicalHistory, null, 2),
        );

        normalizedResponse.surgicalHistory = formattedSurgicalHistory;
      } else {
        // If GPT's response doesn't include surgical history,
        // use existing data from the current chart
        console.log("[GPT Service] Using existing surgical history data");
        normalizedResponse.surgicalHistory = currentChart.surgicalHistory || [];
      }
    } catch (error) {
      console.error("[GPT Service] Error formatting surgical history:", error);
      normalizedResponse.surgicalHistory = [];
    }

    const endTime = Date.now();
    const totalProcessingTime = endTime - startTime;

    console.log(
      `[TIMING] SOAP note processing completed at ${new Date().toISOString()}`,
    );
    console.log(
      `[TIMING] Total SOAP note processing time: ${totalProcessingTime}ms`,
    );
    console.log(`[TIMING] Breakdown of processing time:`);
    console.log(
      `[TIMING]   - Initial OpenAI API call: ${apiCallEndTime - apiCallStartTime}ms`,
    );
    console
      .log
      //`[TIMING]   - Medical problems API call: ${medicalProblemsApiEndTime - medicalProblemsApiStartTime}ms`,
      ();
    console
      .log
      //`[TIMING]   - Other processing: ${totalProcessingTime - (apiCallEndTime - apiCallStartTime) - (medicalProblemsApiEndTime - medicalProblemsApiStartTime)}ms`,
      ();

    // Add detailed summary logging to verify both Method A and Method B work correctly
    console.log("[GPT Service] SOAP Note Processing Summary", {
      method:
        currentChart.vitals && currentChart.vitals.length > 0
          ? "Method A (with existing vitals)"
          : "Method B (no existing vitals)",
      patientId: patientId,
      // Document what data was processed
      processedData: {
        vitals: normalizedResponse.vitals
          ? normalizedResponse.vitals.length
          : 0,
        medications: normalizedResponse.medications
          ? normalizedResponse.medications.length
          : 0,
        medicalProblems: normalizedResponse.medicalProblems
          ? normalizedResponse.medicalProblems.length
          : 0,
        allergies: normalizedResponse.allergies
          ? normalizedResponse.allergies.length
          : 0,
        labs: normalizedResponse.labs ? normalizedResponse.labs.length : 0,
        imaging: normalizedResponse.imaging
          ? normalizedResponse.imaging.length
          : 0,
      },
      timestamp: new Date().toISOString(),
    });

    return normalizedResponse;
  } catch (error) {
    console.error("Error processing SOAP note:", error);
    return currentChart;
  }
}
