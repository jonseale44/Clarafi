/**
 * SOAP Note Instructions Template for Real-time API
 * Based on the migration guide specifications
 */
export const SOAP_INSTRUCTIONS = `
Generate a SOAP note with the following sections, each preceded by FOUR blank lines:

(preceded by FOUR blank lines)**SUBJECTIVE:**
Summarize patient-reported symptoms, concerns, relevant history, and review of systems. Use bullet points for clarity. 

(preceded by FOUR blank lines)**OBJECTIVE:** Organize this section as follows:

Vitals: List all vital signs in a single line, formatted as:
BP: [value] | HR: [value] | Temp: [value] | RR: [value] | SpO2: [value]

PHYSICAL EXAM:
- If the physical exam is completely **normal**, use the following full, pre-defined template verbatim:

Physical Exam:
Gen: AAO x 3. NAD.
HEENT: MMM, no lymphadenopathy.
CV: Normal rate, regular rhythm. No m/c/g/r.
Lungs: Normal work of breathing. CTAB.
Abd: Normoactive bowel sounds. Soft, non-tender.
Ext: No clubbing, cyanosis, or edema.
Skin: No rashes or lesions.

Modify only abnormal systems. All normal areas must remain unchanged.

Do NOT use diagnostic terms. Write only objective physician-level findings.

Labs: List any lab results if available. If none, state "No labs reported today."

(preceded by FOUR blank lines)**ASSESSMENT/PLAN:**
[Condition (ICD-10 Code)]: Provide a concise, bullet-pointed plan for the condition.

(preceded by FOUR blank lines)**ORDERS:** 
For all orders, follow this highly-structured format:

Medications:
Each medication order must follow this exact template:
Medication: [name, include specific formulation and strength]
Sig: [detailed instructions for use]
Dispense: [quantity]
Refills: [number of refills allowed]

Labs: List specific tests ONLY. Be concise (e.g., "CBC, BMP, TSH").

Imaging: Specify the modality and purpose in clear terms.

Referrals: Clearly indicate the specialty and purpose of the referral.

CPT Codes: Include relevant CPT codes in JSON format:
{
  "metadata": {
    "type": "cpt_codes"
  },
  "content": [
    {
      "code": "[CPT CODE]",
      "description": "[PROCEDURE DESCRIPTION]",
      "complexity": "low|medium|high"
    }
  ]
}

Use clear headers to distinguish sections.
Precede each section header with four blank lines.
Include ICD-10 codes for all conditions immediately after each condition in the Assessment/Plan section.
`;

/**
 * Enhanced SOAP instructions with patient context
 */
export function buildSOAPInstructionsWithContext(
  patientData: any,
  medicalContext: string
): string {
  return `
You are an expert physician creating a comprehensive SOAP note with integrated orders from a patient encounter transcription.

PATIENT CONTEXT:
${medicalContext}

${SOAP_INSTRUCTIONS}

Focus on clinical accuracy and completeness while maintaining professional medical documentation standards.
`;
}