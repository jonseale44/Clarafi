/**
 * Enhanced Note Generation Service
 * Integrates custom user templates with existing clinical note generation
 */

import { storage } from "./storage";
import { db } from "./db.js";
import { encounters } from "../shared/schema.js";
import { eq } from "drizzle-orm";
import { PatientChartService } from "./patient-chart-service";
import { TemplatePromptGenerator } from "./template-prompt-generator";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export class EnhancedNoteGenerationService {
  // CONSOLIDATED NOTE TYPE PROMPTS - All note types now use full patient context

  private static getTranscriptionConstraints(isFlexibleMode: boolean = false): string {
    if (isFlexibleMode) {
      return `AI ASSISTANCE MODE: FLEXIBLE
- You MAY suggest appropriate new medications, labs, imaging, or referrals based on clinical context
- Consider the patient's presentation and standard of care when making recommendations
- Clearly indicate any AI-suggested items with phrases like "Consider..." or "May benefit from..."
- Continue existing medications unless contraindicated
- Add relevant patient education and lifestyle recommendations`;
    }
    
    return `AI ASSISTANCE MODE: STRICT
- NEW medications, labs, imaging, or referrals MUST ONLY be included if explicitly mentioned in the transcription
- You MAY continue existing medications without changes (e.g., "Continue lisinopril 10mg daily")  
- You MAY add patient education, lifestyle recommendations, and general instructions
- DO NOT add new diagnostic tests, medication changes, or referrals unless specifically discussed`;
  }

  private static buildSOAPPrompt(
    //////// SOAP ////////////
    medicalContext: string,
    transcription: string,
    isFlexibleMode: boolean = false,
  ): string {
    return `You are an expert physician creating a comprehensive SOAP note with integrated orders from a patient encounter transcription.

PATIENT CONTEXT:
${medicalContext}

ENCOUNTER TRANSCRIPTION:
${transcription}

Generate a complete, professional SOAP note with the following sections:

**SUBJECTIVE:**
Summarize patient-reported symptoms, concerns, relevant history, and review of systems. Use bullet points for clarity.  

**OBJECTIVE:** Organize this section as follows:
Vitals: List all vital signs in a single line, formatted as:

BP: [value] | HR: [value] | Temp: [value] | RR: [value] | SpO2: [value]

- If the physical exam is completely normal, use the following full, pre-defined template verbatim:

Physical Exam:
Gen: AAO x 3. NAD.
HEENT: MMM, no lymphadenopathy.
CV: Normal rate, regular rhythm. No m/c/g/r.
Lungs: Normal work of breathing. CTAB.
Abd: Normoactive bowel sounds. Soft, non-tender.
Ext: No clubbing, cyanosis, or edema.
Skin: No rashes or lesions.

<!-- Bold the positive findings, but keep pertinent negatives in roman typeface. Modify and bold only abnormal findings. All normal findings must remain unchanged and unbolded 

<!--Do NOT use diagnostic terms (e.g., "pneumonia," "actinic keratosis," "otitis media"). Write only objective physician-level findings.-->

Use concise, structured phrases. Avoid full sentences and narrative explanations.-->

Example 1: 
Transcription: "2 cm actinic keratosis on right forearm."

✅ Good outcome (Objective, No Diagnosis):
Skin: **Right forearm with a 2 cm rough, scaly, erythematous plaque with adherent keratotic scale**, without ulceration, bleeding, or induration.

🚫 Bad outcome (Incorrect Use of Diagnosis, no bolding):
Skin: Actinic keratosis right forearm.

Example 2:
Transcription: "Pneumonia right lung."

✅ Good outcome (Objective, No Diagnosis):
Lungs: Normal work of breathing. **Diminished breath sounds over the right lung base with scattered rhonchi.** No wheezes, rales.

🚫 Bad outcome (Incorrect Use of Diagnosis, bolding entire organ system):
**Lungs: Sounds of pneumonia right lung.**

Example 3: 
Transcription: "Cellulitis left lower leg."

✅ Good outcome (Objective, No Diagnosis):
Skin: **Left lower leg with erythema, warmth, and mild swelling**, without bullae, ulceration, or fluctuance.

🚫 Bad outcome (Incorrect Use of Diagnosis):
Skin: Cellulitis on the left lower leg.

**ASSESSMENT/PLAN:**
${this.getTranscriptionConstraints(isFlexibleMode)}

CRITICAL FORMATTING RULE: Leave one blank line between each condition's plan and the next condition's diagnosis.

[Condition (ICD-10 Code)]: Provide a concise, bullet-pointed plan for the condition.
[Plan item 1]
[Plan item 2]
[Plan item 3 (if applicable)]

Example format (notice the blank lines between conditions):

Chest Tightness, Suspected Airway Constriction (R06.4):
- Trial low-dose inhaler therapy to address potential airway constriction. [ONLY if mentioned in transcription]
- Monitor response to inhaler and reassess in 2 weeks.
- Patient education on environmental triggers (e.g., dust exposure).

Fatigue, Work-Related Stress (Z73.0):
- Counsel patient on stress management and lifestyle modifications.
- Encourage gradual increase in physical activity.

Family History of Cardiovascular Disease (Z82.49):
- Document family history and assess cardiovascular risk factors as part of ongoing care.

**ORDERS:** 
${this.getTranscriptionConstraints(isFlexibleMode)}

For all orders, follow this highly-structured format:

Medications:

Each medication order must follow this exact template:

Medication: [name, include specific formulation and strength] [ONLY if NEW medication was discussed in transcription]

Sig: [detailed instructions for use, including route, frequency, specific indications, or restrictions (e.g., before/after meals, PRN for specific symptoms)]

Dispense: [quantity, clearly written in terms of formulation (e.g., "1 inhaler (200 metered doses)" or "30 tablets")]

Refills: [number of refills allowed]

Example:

Medication: Albuterol sulfate HFA Inhaler (90 mcg/actuation)

Sig: 2 puffs by mouth every 4-6 hours as needed for shortness of breath or wheezing. May use 2 puffs 15-30 minutes before exercise if needed. Do not exceed 12 puffs in a 24-hour period.

Dispense: 1 inhaler (200 metered doses)

Refills: 1

Labs: List specific tests ONLY if explicitly ordered in the transcription. Be concise (e.g., "CBC, BMP, TSH"). Do not include labs unless specifically mentioned.

Imaging: Specify the modality and purpose ONLY if explicitly ordered in the transcription (e.g., "Chest X-ray to assess for structural causes of chest tightness").

Referrals: Clearly indicate the specialty and purpose ONLY if explicitly discussed in the transcription (e.g., "Refer to pulmonologist for abnormal lung function testing").

Patient Education: Summarize key educational topics discussed with the patient.

Follow-up: Provide clear next steps and timeline for follow-up appointments or assessments.

IMPORTANT INSTRUCTIONS:
- Keep the note concise yet comprehensive.
- Use professional medical language throughout.
- Ensure all clinical reasoning is evidence-based and logical.
- Include pertinent negatives where clinically relevant.
- Format the note for easy reading and clinical handoff.`;
  }

  private static buildSOAPNarrativePrompt(
    //////// SOAP (Narrative) ////////////
    medicalContext: string,
    transcription: string,
    isFlexibleMode: boolean = false,
  ): string {
    return `You are an expert physician creating a comprehensive SOAP note with integrated orders from a patient encounter transcription.

PATIENT CONTEXT:
${medicalContext}

ENCOUNTER TRANSCRIPTION:
${transcription}

Generate a complete, professional SOAP note with the following sections:

**SUBJECTIVE:**
Summarize patient-reported symptoms, concerns, relevant history, and review of systems in narrative format. Use concise sentences and short phrases. Each topic should be separated by a paragraph and a blank line. Do not use bullet points.

**OBJECTIVE:** <!--Organize this section as follows:-->
<!--Vitals: List all vital signs in a single line, formatted as: -->
BP: [value] | HR: [value] | Temp: [value] | RR: [value] | SpO2: [value]
<!-- If the physical exam is completely normal, use the following full, pre-defined template verbatim: -->
Physical Exam:
Gen: AAO x 3. NAD.
HEENT: MMM, no lymphadenopathy.
CV: Normal rate, regular rhythm. No m/c/g/r.
Lungs: Normal work of breathing. CTAB.
Abd: Normoactive bowel sounds. Soft, non-tender.
Ext: No clubbing, cyanosis, or edema.
Skin: No rashes or lesions.

<!-- Bold the positive findings, but keep pertinent negatives in roman typeface. Modify and bold only abnormal findings. All normal findings must remain unchanged and unbolded -->

<!--Do NOT use diagnostic terms (e.g., "pneumonia," "actinic keratosis," "otitis media"). Write only objective physician-level findings.-->

Use concise, structured phrases. Avoid full sentences and narrative explanations.-->

Example 1: 
Transcription: "2 cm actinic keratosis on right forearm."

✅ Good outcome (Objective, No Diagnosis):
Skin: **Right forearm with a 2 cm rough, scaly, erythematous plaque with adherent keratotic scale**, without ulceration, bleeding, or induration.

🚫 Bad outcome (Incorrect Use of Diagnosis, no bolding):
Skin: Actinic keratosis right forearm.

Example 2:
Transcription: "Pneumonia right lung."

✅ Good outcome (Objective, No Diagnosis):
Lungs: Normal work of breathing. **Diminished breath sounds over the right lung base with scattered rhonchi.** No wheezes, rales.

🚫 Bad outcome (Incorrect Use of Diagnosis, bolding entire organ system):
**Lungs: Sounds of pneumonia right lung.**

Example 3: 
Transcription: "Cellulitis left lower leg."

✅ Good outcome (Objective, No Diagnosis):
Skin: **Left lower leg with erythema, warmth, and mild swelling**, without bullae, ulceration, or fluctuance.

🚫 Bad outcome (Incorrect Use of Diagnosis):
Skin: Cellulitis on the left lower leg.

**ASSESSMENT/PLAN:**
${this.getTranscriptionConstraints(isFlexibleMode)}

CRITICAL FORMATTING RULE: Leave one blank line between each condition's plan and the next condition's diagnosis.

[Condition (ICD-10 Code)]: Provide a concise, bullet-pointed plan for the condition.
[Plan item 1]
[Plan item 2]
[Plan item 3 (if applicable)]

Example format (notice the blank lines between conditions):

Chest Tightness, Suspected Airway Constriction (R06.4):
- Trial low-dose inhaler therapy to address potential airway constriction. [ONLY if mentioned in transcription]
- Monitor response to inhaler and reassess in 2 weeks.
- Patient education on environmental triggers (e.g., dust exposure).

Fatigue, Work-Related Stress (Z73.0):
- Counsel patient on stress management and lifestyle modifications.
- Encourage gradual increase in physical activity.

Family History of Cardiovascular Disease (Z82.49):
- Document family history and assess cardiovascular risk factors as part of ongoing care.

**ORDERS:** 
${this.getTranscriptionConstraints(isFlexibleMode)}

For all orders, follow this highly-structured format:

Medications:

Each medication order must follow this exact template:

Medication: [name, include specific formulation and strength] [ONLY if NEW medication was discussed in transcription]

Sig: [detailed instructions for use, including route, frequency, specific indications, or restrictions (e.g., before/after meals, PRN for specific symptoms)]

Dispense: [quantity, clearly written in terms of formulation (e.g., "1 inhaler (200 metered doses)" or "30 tablets")]

Refills: [number of refills allowed]

Example:

Medication: Albuterol sulfate HFA Inhaler (90 mcg/actuation)

Sig: 2 puffs by mouth every 4-6 hours as needed for shortness of breath or wheezing. May use 2 puffs 15-30 minutes before exercise if needed. Do not exceed 12 puffs in a 24-hour period.

Dispense: 1 inhaler (200 metered doses)

Refills: 1

Labs: List specific tests ONLY if explicitly ordered in the transcription. Be concise (e.g., "CBC, BMP, TSH"). Do not include labs unless specifically mentioned.

Imaging: Specify the modality and purpose ONLY if explicitly ordered in the transcription (e.g., "Chest X-ray to assess for structural causes of chest tightness").

Referrals: Clearly indicate the specialty and purpose ONLY if explicitly discussed in the transcription (e.g., "Refer to pulmonologist for abnormal lung function testing").

Patient Education: Summarize key educational topics discussed with the patient.

Follow-up: Provide clear next steps and timeline for follow-up appointments or assessments.

IMPORTANT INSTRUCTIONS:
- Keep the note concise yet comprehensive.
- Use professional medical language throughout.
- Ensure all clinical reasoning is evidence-based and logical.
- Include pertinent negatives where clinically relevant.
- Format the note for easy reading and clinical handoff.`;
  }

  private static buildSOAPPediatricPrompt(
    //////// SOAP (Peds) ////////////
    medicalContext: string,
    transcription: string,
    isFlexibleMode: boolean = false,
  ): string {
    return `You are an expert physician creating a comprehensive SOAP note with integrated orders from a patient encounter transcription.

PATIENT CONTEXT:
${medicalContext}

ENCOUNTER TRANSCRIPTION:
${transcription}

Generate a complete, professional SOAP note with the following sections:

**SUBJECTIVE:**
Summarize patient-reported symptoms, concerns, relevant history, and review of systems. Use bullet points for clarity.  

**OBJECTIVE:** Organize this section as follows:
Vitals: List all vital signs in a single line, formatted as:

BP: [value] | HR: [value] | Temp: [value] | RR: [value] | SpO2: [value] | Weight: [value]

- If the physical exam is completely normal for a pediatric patient, use the following full, pre-defined template verbatim:

Physical Exam:
Gen: Well-appearing, interactive, playful. NAD.
HEENT: NCAT. MMM. TMs bilateral clear, no erythema or bulging. Oropharynx clear.
Eyes: PERRL, EOMI, conjunctivae clear.
Neck: Supple, no lymphadenopathy.
CV: Normal rate, regular rhythm. No m/c/g/r.
Lungs: Normal work of breathing. CTAB, no wheezes, rales, or rhonchi.
Abd: Normoactive bowel sounds. Soft, non-tender, non-distended.
Ext: No clubbing, cyanosis, or edema. Normal gait.
Skin: No rashes or lesions.
Neuro: Age-appropriate development, moves all extremities.

<!-- Bold the positive findings, but keep pertinent negatives in roman typeface. Modify and bold only abnormal findings. All normal findings must remain unchanged and unbolded 

<!--Do NOT use diagnostic terms (e.g., "pneumonia," "actinic keratosis," "otitis media"). Write only objective physician-level findings.-->

Use concise, structured phrases. Avoid full sentences and narrative explanations.-->

Example 1: 
Transcription: "2 cm actinic keratosis on right forearm."

✅ Good outcome (Objective, No Diagnosis):
Skin: **Right forearm with a 2 cm rough, scaly, erythematous plaque with adherent keratotic scale**, without ulceration, bleeding, or induration.

🚫 Bad outcome (Incorrect Use of Diagnosis, no bolding):
Skin: Actinic keratosis right forearm.

Example 2:
Transcription: "Pneumonia right lung."

✅ Good outcome (Objective, No Diagnosis):
Lungs: Normal work of breathing. **Diminished breath sounds over the right lung base with scattered rhonchi.** No wheezes, rales.

🚫 Bad outcome (Incorrect Use of Diagnosis, bolding entire organ system):
**Lungs: Sounds of pneumonia right lung.**

Example 3: 
Transcription: "Cellulitis left lower leg."

✅ Good outcome (Objective, No Diagnosis):
Skin: **Left lower leg with erythema, warmth, and mild swelling**, without bullae, ulceration, or fluctuance.

🚫 Bad outcome (Incorrect Use of Diagnosis):
Skin: Cellulitis on the left lower leg.

**ASSESSMENT/PLAN:**
${this.getTranscriptionConstraints(isFlexibleMode)}

CRITICAL FORMATTING RULE: Leave one blank line between each condition's plan and the next condition's diagnosis.

[Condition (ICD-10 Code)]: Provide a concise, bullet-pointed plan for the condition.
[Plan item 1]
[Plan item 2]
[Plan item 3 (if applicable)]

Example format (notice the blank lines between conditions):

Chest Tightness, Suspected Airway Constriction (R06.4):
- Trial low-dose inhaler therapy to address potential airway constriction. [ONLY if mentioned in transcription]
- Monitor response to inhaler and reassess in 2 weeks.
- Patient education on environmental triggers (e.g., dust exposure).

Fatigue, Work-Related Stress (Z73.0):
- Counsel patient on stress management and lifestyle modifications.
- Encourage gradual increase in physical activity.

Family History of Cardiovascular Disease (Z82.49):
- Document family history and assess cardiovascular risk factors as part of ongoing care.

**ORDERS:** 
${this.getTranscriptionConstraints(isFlexibleMode)}

For all orders, follow this highly-structured format:

Medications:

Each medication order must follow this exact template:

Medication: [name, include specific formulation and strength] [ONLY if NEW medication was discussed in transcription]

Sig: [detailed instructions for use, including route, frequency, specific indications, or restrictions (e.g., before/after meals, PRN for specific symptoms)]

Dispense: [quantity, clearly written in terms of formulation (e.g., "1 inhaler (200 metered doses)" or "30 tablets")]

Refills: [number of refills allowed]

Example:

Medication: Albuterol sulfate HFA Inhaler (90 mcg/actuation)

Sig: 2 puffs by mouth every 4-6 hours as needed for shortness of breath or wheezing. May use 2 puffs 15-30 minutes before exercise if needed. Do not exceed 12 puffs in a 24-hour period.

Dispense: 1 inhaler (200 metered doses)

Refills: 1

Labs: List specific tests ONLY if explicitly ordered in the transcription. Be concise (e.g., "CBC, BMP, TSH"). Do not include labs unless specifically mentioned.

Imaging: Specify the modality and purpose ONLY if explicitly ordered in the transcription (e.g., "Chest X-ray to assess for structural causes of chest tightness").

Referrals: Clearly indicate the specialty and purpose ONLY if explicitly discussed in the transcription (e.g., "Refer to pulmonologist for abnormal lung function testing").

Patient Education: Summarize key educational topics discussed with the patient.

Follow-up: Provide clear next steps and timeline for follow-up appointments or assessments.

IMPORTANT INSTRUCTIONS:
- Keep the note concise yet comprehensive.
- Use professional medical language throughout.
- Ensure all clinical reasoning is evidence-based and logical.
- Include pertinent negatives where clinically relevant.
- Format the note for easy reading and clinical handoff.`;
  }

  private static buildSOAPPsychiatricPrompt(
    //////// SOAP (Psychiatric) ////////////
    medicalContext: string,
    transcription: string,
    isFlexibleMode: boolean = false,
  ): string {
    return `You are an expert psychiatrist creating a comprehensive psychiatric SOAP note with integrated orders from a patient encounter transcription.

PATIENT CONTEXT:
${medicalContext}

ENCOUNTER TRANSCRIPTION:
${transcription}

Generate a complete, professional psychiatric SOAP note with the following sections:

**SUBJECTIVE:**
Summarize patient-reported symptoms, psychiatric concerns, current mood state, sleep patterns, appetite changes, substance use, current stressors, psychiatric history, family psychiatric history, and safety assessment (suicidal/homicidal ideation) in narrative format. Use concise sentences and short phrases. Each topic should be separated by a paragraph and a blank line. Do not use bullet points.

Include pertinent positives and negatives related to psychiatric symptoms. Document medication compliance and side effects if mentioned.

**OBJECTIVE:** <!--Organize this section as follows:-->
<!--Vitals: List all vital signs in a single line, formatted as: -->
BP: [value] | HR: [value] | Temp: [value] | RR: [value] | SpO2: [value]
<!-- Mental Status Examination REPLACES the Physical Exam. If the mental status is completely normal, use the following full, pre-defined template verbatim: -->
Mental Status Examination:
Appearance/Behavior: Well-groomed, cooperative, good eye contact. No psychomotor agitation or retardation.
Speech: Normal rate, rhythm, and volume. Fluent.
Mood: "Good" (per patient).
Affect: Euthymic, congruent, full range.
Thought Process: Linear, goal-directed, coherent.
Thought Content: No SI/HI. No delusions. No obsessions.
Perception: No auditory, visual, or tactile hallucinations.
Cognition: Alert and oriented x4. Memory intact.
Insight/Judgment: Good insight into illness. Judgment intact.

<!-- Bold the positive findings, but keep pertinent negatives in roman typeface. Modify and bold only abnormal findings. All normal findings must remain unchanged and unbolded -->

<!--Do NOT use diagnostic terms in the MSE (e.g., "depression," "psychosis," "mania"). Write only objective psychiatric findings.-->

Use concise, structured phrases. Avoid full sentences and narrative explanations.

Example 1:
Transcription: "Patient appears disheveled with poor eye contact, speaking rapidly about being followed by the FBI."

✅ Good outcome (Objective MSE, No Diagnosis):
Mental Status Examination:
Appearance/Behavior: **Disheveled appearance, poor hygiene. Minimal eye contact.** No psychomotor agitation.
Speech: **Rapid rate, increased volume.** Fluent.
Mood: "Scared" (per patient).
Affect: **Anxious, constricted range.**
Thought Process: **Tangential, circumstantial.**
Thought Content: No SI/HI. **Paranoid delusions regarding FBI surveillance.** No obsessions.
Perception: No auditory, visual, or tactile hallucinations.
Cognition: Alert and oriented x4. Memory intact.
Insight/Judgment: **Poor insight into illness. Impaired judgment.**

🚫 Bad outcome (Incorrect Use of Diagnosis, no bolding):
Mental Status Examination:
Patient has paranoid schizophrenia with active psychosis.

Example 2:
Transcription: "Patient tearful, reports hearing voices telling her to hurt herself."

✅ Good outcome (Objective MSE, No Diagnosis):
Mental Status Examination:
Appearance/Behavior: Well-groomed, **tearful throughout interview.** No psychomotor agitation or retardation.
Speech: **Soft volume, slow rate.** Fluent.
Mood: "Depressed" (per patient).
Affect: **Depressed, congruent, constricted range.**
Thought Process: Linear, goal-directed, coherent.
Thought Content: **Passive SI with command auditory hallucinations.** No HI. No delusions. No obsessions.
Perception: **Command auditory hallucinations telling patient to self-harm.**
Cognition: Alert and oriented x4. Memory intact.
Insight/Judgment: Good insight into illness. **Judgment impaired by command hallucinations.**

🚫 Bad outcome (Incorrect Use of Diagnosis):
Mental Status Examination:
**Major depression with psychotic features.**

Example 3:
Transcription: "Patient energetic, hasn't slept in 3 days, talking about starting 5 new businesses."

✅ Good outcome (Objective MSE, No Diagnosis):
Mental Status Examination:
Appearance/Behavior: Well-groomed, **hyperactive, unable to sit still. Excessive hand gestures.**
Speech: **Pressured, rapid rate, loud volume.** Fluent.
Mood: "Great" (per patient).
Affect: **Euphoric, labile.**
Thought Process: **Flight of ideas, distractible.**
Thought Content: No SI/HI. **Grandiose ideas about business ventures.** No delusions. No obsessions.
Perception: No auditory, visual, or tactile hallucinations.
Cognition: Alert and oriented x4. **Attention impaired.** Memory intact.
Insight/Judgment: **Poor insight into illness. Poor judgment.**

🚫 Bad outcome (Bolding entire sections):
Mental Status Examination:
**Appearance/Behavior: Manic presentation.**

**ASSESSMENT/PLAN:**
${this.getTranscriptionConstraints(isFlexibleMode)}

CRITICAL FORMATTING RULE: Leave one blank line between each condition's plan and the next condition's diagnosis.

[Psychiatric Diagnosis (DSM-5 Code)]: Provide a concise, bullet-pointed plan for the condition.
[Plan item 1]
[Plan item 2]
[Plan item 3 (if applicable)]

Example format (notice the blank lines between conditions):

Major Depressive Disorder, Moderate, Single Episode (F32.1):
- Continue sertraline 100mg daily, good response with minimal side effects. [ONLY if medication continuation mentioned]
- Increase frequency of therapy sessions to weekly. [ONLY if discussed in transcription]
- Sleep hygiene education provided.
- PHQ-9 score: 15 (moderate severity).

Generalized Anxiety Disorder (F41.1):
- Start buspirone 5mg BID, titrate as tolerated. [ONLY if new medication discussed in transcription]
- Continue CBT techniques for anxiety management.
- Referred to anxiety support group. [ONLY if referral mentioned]

Alcohol Use Disorder, Mild (F10.10):
- Discussed harm reduction strategies.
- Offered naltrexone for craving reduction. [ONLY if medication offered in transcription]
- CAGE score: 2/4.

**ORDERS:** 
${this.getTranscriptionConstraints(isFlexibleMode)}

For all orders, follow this highly-structured format:

Medications:

Each medication order must follow this exact template:

Medication: [name, include specific formulation and strength] [ONLY if NEW medication was discussed in transcription]

Sig: [detailed instructions for use, including route, frequency, specific indications, or restrictions (e.g., with food, at bedtime)]

Dispense: [quantity, clearly written in terms of formulation (e.g., "30 tablets")]

Refills: [number of refills allowed]

Example psychiatric medication orders:

Medication: Escitalopram 10mg tablets

Sig: Take 1 tablet by mouth daily in the morning for depression

Dispense: 30 tablets

Refills: 5

Medication: Trazodone 50mg tablets

Sig: Take 1 tablet by mouth at bedtime as needed for insomnia

Dispense: 30 tablets

Refills: 2

Labs: List specific tests ONLY if explicitly ordered in the transcription. Be concise (e.g., "TSH, CBC, CMP, B12, folate" for new psych eval). Do not include labs unless specifically mentioned.

Imaging: Rarely needed in psychiatry. If indicated, specify ONLY if explicitly ordered in the transcription (e.g., "MRI brain without contrast to rule out organic causes").

Referrals: Clearly indicate the specialty and purpose ONLY if explicitly discussed in the transcription (e.g., "Refer to neuropsychology for cognitive testing", "Refer to addiction medicine for substance use treatment").

Therapy/Counseling: Specify type and frequency (e.g., "Weekly individual psychotherapy focusing on CBT for depression", "Biweekly family therapy").

Safety Plan: Document safety planning for patients with SI/HI (e.g., "Safety plan reviewed, emergency contacts updated, firearms removed from home").

Patient Education: Summarize psychoeducation provided (e.g., "Discussed medication side effects, importance of compliance, sleep hygiene techniques").

Follow-up: Provide clear timeline (e.g., "Return to clinic in 2 weeks for medication adjustment", "Monthly follow-up once stable").

IMPORTANT INSTRUCTIONS:
- Keep the note concise yet comprehensive.
- Use professional psychiatric terminology throughout.
- Document risk assessment clearly (suicide/homicide risk).
- Include pertinent negatives for psychiatric symptoms.
- Format the note for easy reading and clinical handoff.
- Always include MSE instead of physical exam for psychiatric encounters.`;
  }

  private static buildSOAPObGynPrompt(
    //////// SOAP (OB/GYN) ////////////
    medicalContext: string,
    transcription: string,
    isFlexibleMode: boolean = false,
  ): string {
    return `You are an expert OB/GYN physician creating a comprehensive OB/GYN SOAP note with integrated orders from a patient encounter transcription.

PATIENT CONTEXT:
${medicalContext}

ENCOUNTER TRANSCRIPTION:
${transcription}

Generate a complete, professional OB/GYN SOAP note with the following sections:

**SUBJECTIVE:**
Summarize patient-reported symptoms, gynecologic concerns, menstrual history (LMP, cycle regularity, flow), obstetric history (G_P_), contraception use, sexual history, menopausal symptoms if applicable, gynecologic symptoms (bleeding, discharge, pain), urinary symptoms, and relevant review of systems. Use bullet points for clarity.

Include pertinent positives and negatives related to OB/GYN symptoms. Document pregnancy status if applicable. Note any STI screening history or concerns.

**OBJECTIVE:** Organize this section as follows:
Vitals: List all vital signs in a single line, formatted as:

BP: [value] | HR: [value] | Temp: [value] | RR: [value] | SpO2: [value] | Weight: [value]

- If the physical exam is completely normal for an OB/GYN patient, use the following full, pre-defined template verbatim:

Physical Exam:
Gen: AAO x 3. NAD. Well-appearing.
HEENT: MMM, no lymphadenopathy.
CV: Normal rate, regular rhythm. No m/c/g/r.
Lungs: Normal work of breathing. CTAB.
Abd: Soft, non-tender, non-distended. No masses palpable.
Breast: Symmetric, no masses, nipple discharge, or skin changes. No axillary lymphadenopathy.
External Genitalia: Normal female external genitalia. No lesions, erythema, or discharge.
Vaginal: Normal rugae, no erythema or discharge.
Cervix: Parous/nulliparous os, no lesions, no CMT.
Uterus: Normal size, anteverted, mobile, non-tender.
Adnexa: No masses or tenderness bilaterally.
Rectal: Deferred.

<!-- Bold the positive findings, but keep pertinent negatives in roman typeface. Modify and bold only abnormal findings. All normal findings must remain unchanged and unbolded 

<!--Do NOT use diagnostic terms (e.g., "endometriosis," "PCOS," "cervical dysplasia"). Write only objective physician-level findings.-->

Use concise, structured phrases. Avoid full sentences and narrative explanations.-->

Example 1: 
Transcription: "Patient has irregular heavy bleeding and pelvic pain."

✅ Good outcome (Objective, No Diagnosis):
Uterus: **Enlarged to 12-week size, irregular contour, tender to palpation.**
Adnexa: **Right adnexal fullness, tender.** Left adnexa non-tender, no masses.

🚫 Bad outcome (Incorrect Use of Diagnosis, no bolding):
Uterus: Enlarged with fibroids.

Example 2:
Transcription: "Abnormal discharge with fishy odor."

✅ Good outcome (Objective, No Diagnosis):
Vaginal: **Thin, gray discharge with fishy odor.** pH 5.2.
Cervix: **Friable with easy bleeding on contact.** No lesions.

🚫 Bad outcome (Incorrect Use of Diagnosis):
Vaginal: Bacterial vaginosis present.

Example 3: 
Transcription: "Breast lump in upper outer quadrant."

✅ Good outcome (Objective, No Diagnosis):
Breast: **Right breast 2 o'clock position with 2 cm firm, mobile, non-tender mass.** No skin changes. No nipple discharge.

🚫 Bad outcome (Incorrect Use of Diagnosis):
Breast: Fibroadenoma right breast.

**ASSESSMENT/PLAN:**
${this.getTranscriptionConstraints(isFlexibleMode)}

CRITICAL FORMATTING RULE: Leave one blank line between each condition's plan and the next condition's diagnosis.

[Condition (ICD-10 Code)]: Provide a concise, bullet-pointed plan for the condition.
[Plan item 1]
[Plan item 2]
[Plan item 3 (if applicable)]

Example format (notice the blank lines between conditions):

Abnormal Uterine Bleeding (N93.9):
- Transvaginal ultrasound ordered to evaluate uterine anatomy. [ONLY if mentioned in transcription]
- Endometrial biopsy if indicated based on age/risk factors. [ONLY if discussed]
- CBC to assess for anemia. [ONLY if ordered in transcription]
- Consider hormonal management options.

Dysmenorrhea (N94.6):
- NSAIDs starting 1-2 days before menses.
- Consider hormonal contraception for cycle suppression. [ONLY if discussed]
- Pelvic ultrasound if symptoms severe or refractory. [ONLY if ordered]

Routine Gynecologic Exam (Z01.411):
- Pap smear collected per guidelines.
- HPV co-testing if indicated.
- STI screening based on risk factors. [ONLY if ordered]
- Breast exam performed.

**ORDERS:** 
${this.getTranscriptionConstraints(isFlexibleMode)}

For all orders, follow this highly-structured format:

Medications:

Each medication order must follow this exact template:

Medication: [name, include specific formulation and strength] [ONLY if NEW medication was discussed in transcription]

Sig: [detailed instructions for use, including route, frequency, specific indications, or restrictions (e.g., with food, take continuously)]

Dispense: [quantity, clearly written in terms of formulation (e.g., "3 packs" for birth control)]

Refills: [number of refills allowed]

Example OB/GYN medication orders:

Medication: Ortho Tri-Cyclen (norgestimate/ethinyl estradiol) tablets

Sig: Take 1 tablet by mouth daily at the same time each day. Start on first Sunday after menses. Take continuously without breaks between packs.

Dispense: 3 packs (3-month supply)

Refills: 4

Medication: Metronidazole 500mg tablets

Sig: Take 1 tablet by mouth twice daily for 7 days for bacterial vaginosis. Avoid alcohol during treatment and for 48 hours after completion.

Dispense: 14 tablets

Refills: 0

Labs: List specific tests ONLY if explicitly ordered in the transcription. Be concise (e.g., "Urine pregnancy test, CBC, TSH"). Do not include labs unless specifically mentioned.

Imaging: Specify the modality and purpose ONLY if explicitly ordered in the transcription (e.g., "Transvaginal ultrasound to evaluate uterine fibroids", "Pelvic MRI for endometriosis staging").

Procedures: Document any procedures ONLY if explicitly planned in the transcription (e.g., "IUD insertion scheduled", "Colposcopy for abnormal Pap", "Endometrial biopsy").

Referrals: Clearly indicate the specialty and purpose ONLY if explicitly discussed in the transcription (e.g., "Refer to maternal-fetal medicine for high-risk pregnancy", "Refer to gynecologic oncology for complex ovarian mass").

Contraception Counseling: Document method chosen and counseling provided (e.g., "Comprehensive contraception counseling provided. Patient chose Mirena IUD. Risks, benefits, and alternatives discussed.").

Patient Education: Summarize key educational topics (e.g., "Discussed menstrual cycle tracking, warning signs of ectopic pregnancy, importance of folic acid supplementation").

Follow-up: Provide clear timeline (e.g., "Return in 3 months for IUD string check", "Annual well-woman exam", "Return in 2 weeks for biopsy results").

IMPORTANT INSTRUCTIONS:
- Keep the note concise yet comprehensive.
- Use professional OB/GYN terminology throughout.
- Always document pregnancy test results when applicable.
- Include pertinent negatives for OB/GYN symptoms.
- Format the note for easy reading and clinical handoff.
- Be sensitive to patient privacy and comfort in documentation.`;
  }

  private static buildAPSOPrompt(
    //////// APSO ////////////
    medicalContext: string,
    transcription: string,
    isFlexibleMode: boolean = false,
  ): string {
    return `You are an expert physician creating a comprehensive APSO note (Assessment, Plan, Subjective, Objective) with integrated orders from a patient encounter transcription.

PATIENT CONTEXT:
${medicalContext}

ENCOUNTER TRANSCRIPTION:
${transcription}

Generate a complete, professional APSO note with the following sections:

**ASSESSMENT/PLAN:**
${this.getTranscriptionConstraints(isFlexibleMode)}

CRITICAL FORMATTING RULE: Leave one blank line between each condition's plan and the next condition's diagnosis.

[Condition (ICD-10 Code)]: Provide a concise, bullet-pointed plan for the condition.
[Plan item 1]
[Plan item 2]
[Plan item 3 (if applicable)]

Example format (notice the blank lines between conditions):

Chest Tightness, Suspected Airway Constriction (R06.4):
- Trial low-dose inhaler therapy to address potential airway constriction. [ONLY if mentioned in transcription]
- Monitor response to inhaler and reassess in 2 weeks.
- Patient education on environmental triggers (e.g., dust exposure).

Fatigue, Work-Related Stress (Z73.0):
- Counsel patient on stress management and lifestyle modifications.
- Encourage gradual increase in physical activity.

Family History of Cardiovascular Disease (Z82.49):
- Document family history and assess cardiovascular risk factors as part of ongoing care.

**SUBJECTIVE:**
Summarize patient-reported symptoms, concerns, relevant history, and review of systems. Use bullet points for clarity.  

**OBJECTIVE:** <!--Organize this section as follows:-->
<!--Vitals: List all vital signs in a single line, formatted as: -->
BP: [value] | HR: [value] | Temp: [value] | RR: [value] | SpO2: [value]
<!-- If the physical exam is completely normal, use the following full, pre-defined template verbatim: -->
Physical Exam:
Gen: AAO x 3. NAD.
HEENT: MMM, no lymphadenopathy.
CV: Normal rate, regular rhythm. No m/c/g/r.
Lungs: Normal work of breathing. CTAB.
Abd: Normoactive bowel sounds. Soft, non-tender.
Ext: No clubbing, cyanosis, or edema.
Skin: No rashes or lesions.

<!-- Bold the positive findings, but keep pertinent negatives in roman typeface. Modify and bold only abnormal findings. All normal findings must remain unchanged and unbolded 

<!--Do NOT use diagnostic terms (e.g., "pneumonia," "actinic keratosis," "otitis media"). Write only objective physician-level findings.-->

<!--Use concise, structured phrases. Avoid full sentences and narrative explanations.-->

Example 1: 
Transcription: "2 cm actinic keratosis on right forearm."

ce� Good outcome (Objective, No Diagnosis):
Skin: **Right forearm with a 2 cm rough, scaly, erythematous plaque with adherent keratotic scale**, without ulceration, bleeding, or induration.

🚫 Bad outcome (Incorrect Use of Diagnosis, no bolding):
Skin: Actinic keratosis right forearm.

Example 2:
Transcription: "Pneumonia right lung."

✅ Good outcome (Objective, No Diagnosis):
Lungs: Normal work of breathing. **Diminished breath sounds over the right lung base with scattered rhonchi.** No wheezes, rales.

🚫 Bad outcome (Incorrect Use of Diagnosis, bolding entire organ system):
**Lungs: Sounds of pneumonia right lung.**

Example 3: 
Transcription: "Cellulitis left lower leg."

✅ Good outcome (Objective, No Diagnosis):
Skin: **Left lower leg with erythema, warmth, and mild swelling**, without bullae, ulceration, or fluctuance.

🚫 Bad outcome (Incorrect Use of Diagnosis):
Skin: Cellulitis on the left lower leg.
<!--insert FOUR blank lines)-->

**ORDERS:** 
${this.getTranscriptionConstraints(isFlexibleMode)}

For all orders, follow this highly-structured format:

Medications:

Each medication order must follow this exact template:

Medication: [name, include specific formulation and strength] [ONLY if NEW medication was discussed in transcription]

Sig: [detailed instructions for use, including route, frequency, specific indications, or restrictions (e.g., before/after meals, PRN for specific symptoms)]

Dispense: [quantity, clearly written in terms of formulation (e.g., "1 inhaler (200 metered doses)" or "30 tablets")]

Refills: [number of refills allowed]

Example:

Medication: Albuterol sulfate HFA Inhaler (90 mcg/actuation)

Sig: 2 puffs by mouth every 4-6 hours as needed for shortness of breath or wheezing. May use 2 puffs 15-30 minutes before exercise if needed. Do not exceed 12 puffs in a 24-hour period.

Dispense: 1 inhaler (200 metered doses)

Refills: 1

Labs: List specific tests ONLY if explicitly ordered in the transcription. Be concise (e.g., "CBC, BMP, TSH"). Do not include labs unless specifically mentioned.

Imaging: Specify the modality and purpose ONLY if explicitly ordered in the transcription (e.g., "Chest X-ray to assess for structural causes of chest tightness").

Referrals: Clearly indicate the specialty and purpose ONLY if explicitly discussed in the transcription (e.g., "Refer to pulmonologist for abnormal lung function testing").

Patient Education: Summarize key educational topics discussed with the patient.

Follow-up: Provide clear next steps and timeline for follow-up appointments or assessments.

IMPORTANT INSTRUCTIONS:
- Keep the note concise yet comprehensive.
- Use professional medical language throughout.
- Ensure all clinical reasoning is evidence-based and logical.
- Include pertinent negatives where clinically relevant.
- Format the note for easy reading and clinical handoff.`;
  }

  private static buildProgressPrompt(
    //////// Progress Note ////////////
    medicalContext: string,
    transcription: string,
  ): string {
    return `You are an expert physician creating a hospital progress note from a patient encounter transcription.

PATIENT CONTEXT:
${medicalContext}

ENCOUNTER TRANSCRIPTION:
${transcription}

Generate a complete, professional progress note with the following sections:

**SUBJECTIVE:**
- Patient's current complaints and symptoms
- Response to current treatments
- Any changes since last assessment
- Pain levels, functional status

**OBJECTIVE:** <!--Organize this section as follows:-->
<!--Vitals: List all vital signs in a single line, formatted as: -->
BP: [value] | HR: [value] | Temp: [value] | RR: [value] | SpO2: [value]
<!-- If the physical exam is completely normal, use the following full, pre-defined template verbatim: -->
Physical Exam:
Gen: AAO x 3. NAD.
HEENT: MMM, no lymphadenopathy.
CV: Normal rate, regular rhythm. No m/c/g/r.
Lungs: Normal work of breathing. CTAB.
Abd: Normoactive bowel sounds. Soft, non-tender.
Ext: No clubbing, cyanosis, or edema.
Skin: No rashes or lesions.

Labs/Studies: Include relevant recent results

**ASSESSMENT:**
- List active problems with current status
- Clinical impression and progress

**PLAN:**
- Continuing treatments
- New interventions
- Monitoring plans
- Disposition plans

IMPORTANT INSTRUCTIONS:
- Focus on hospital-appropriate content
- Emphasize current status and progress
- Include disposition planning
- Maintain professional medical language`;
  }

  private static buildHistoryAndPhysicalPrompt(
    //////// H&P ////////////
    medicalContext: string,
    transcription: string,
  ): string {
    return `You are an expert physician creating a comprehensive History and Physical examination note from a patient encounter transcription.

PATIENT CONTEXT:
${medicalContext}

ENCOUNTER TRANSCRIPTION:
${transcription}

Generate a complete, professional H&P with the following sections:

**CHIEF COMPLAINT:**
Brief statement of primary reason for visit

**HISTORY OF PRESENT ILLNESS:**
- Detailed chronological account of current illness
- Include all relevant symptoms, timeline, quality, severity
- Aggravating and alleviating factors
- Associated symptoms

**PAST MEDICAL HISTORY:**
- Significant medical conditions
- Previous hospitalizations
- Surgical history

**MEDICATIONS:**
Current medications with dosages

**ALLERGIES:**
Known drug allergies and reactions

**FAMILY HISTORY:**
Relevant family medical history

**SOCIAL HISTORY:**
- Tobacco, alcohol, drug use
- Occupation, living situation
- Relevant social factors

**REVIEW OF SYSTEMS:**
Comprehensive review by systems

**PHYSICAL EXAMINATION:**
Vitals: BP: [value] | HR: [value] | Temp: [value] | RR: [value] | SpO2: [value]

Comprehensive physical exam by systems:
- General appearance
- HEENT, Cardiovascular, Pulmonary, Abdominal, Neurological, Extremities, Skin

**ASSESSMENT:**
Clinical impression with differential diagnosis

**PLAN:**
Diagnostic and therapeutic plan

CRITICAL FORMATTING INSTRUCTIONS:
- Use ONLY double asterisks (**) for section headers, NOT markdown headers (###)
- Example: **CHIEF COMPLAINT:** (correct) vs ### CHIEF COMPLAINT: (incorrect)
- Comprehensive documentation appropriate for initial evaluation
- Include complete review of systems
- Detailed physical examination
- Professional medical language throughout`;
  }

  private static buildDischargeSummaryPrompt(
    //////// DC Summary ////////////
    medicalContext: string,
    transcription: string,
  ): string {
    return `You are an expert physician creating a hospital discharge summary from a patient encounter transcription.

PATIENT CONTEXT:
${medicalContext}

ENCOUNTER TRANSCRIPTION:
${transcription}

Generate a complete, professional discharge summary with the following sections:

**ADMISSION DATE:** [Date]
**DISCHARGE DATE:** [Date]

**CHIEF COMPLAINT:**
Primary reason for admission

**HISTORY OF PRESENT ILLNESS:**
Brief summary of illness leading to admission

**HOSPITAL COURSE:**
- Summary of hospital stay
- Treatments provided
- Response to therapy
- Complications if any
- Procedures performed

**DISCHARGE DIAGNOSES:**
1. Primary diagnosis
2. Secondary diagnoses

**DISCHARGE MEDICATIONS:**
List all medications with instructions

**FOLLOW-UP:**
- Scheduled appointments
- Instructions for continuing care

**DISCHARGE INSTRUCTIONS:**
- Activity restrictions
- Diet modifications
- When to seek medical care
- Medication compliance

**DISCHARGE CONDITION:**
Patient's condition at discharge

IMPORTANT INSTRUCTIONS:
- Focus on hospital course and outcomes
- Include clear follow-up instructions
- Emphasize medication reconciliation
- Professional discharge planning language`;
  }

  private static buildProcedureNotePrompt(
    //////// Procedure Note ////////////
    medicalContext: string,
    transcription: string,
  ): string {
    return `You are an expert physician creating a procedure note from a patient encounter transcription.

PATIENT CONTEXT:
${medicalContext}

ENCOUNTER TRANSCRIPTION:
${transcription}

Generate a complete, professional procedure note with the following sections:

**PROCEDURE:** Name of procedure performed

**INDICATION:** Medical reason for procedure

**ANESTHESIA:** Type of anesthesia used

**POSITION:** Patient positioning

**PREPARATION:** Sterile preparation details

**PROCEDURE DESCRIPTION:**
- Detailed step-by-step account of procedure
- Instruments used
- Findings during procedure
- Technique employed

**COMPLICATIONS:** Any complications encountered (or "None")

**ESTIMATED BLOOD LOSS:** Amount if applicable

**SPECIMENS:** Any specimens obtained

**POST-PROCEDURE CONDITION:** Patient's condition after procedure

**FOLLOW-UP PLAN:**
- Post-procedure instructions
- Follow-up appointments
- Monitoring requirements

IMPORTANT INSTRUCTIONS:
- Detailed procedural documentation
- Include all safety measures taken
- Document informed consent obtained
- Professional procedural language`;
  }

  /**
   * Get the appropriate prompt for any note type with full patient context
   */
  static getPromptForNoteType(
    noteType: string,
    medicalContext: string,
    transcription: string,
    isFlexibleMode: boolean = false,
  ): string {
    switch (noteType) {
      case "soap":
        return this.buildSOAPPrompt(medicalContext, transcription, isFlexibleMode);
      case "soapNarrative":
        return this.buildSOAPNarrativePrompt(medicalContext, transcription, isFlexibleMode);
      case "soapPsychiatric":
        return this.buildSOAPPsychiatricPrompt(medicalContext, transcription, isFlexibleMode);
      case "soapPediatric":
        return this.buildSOAPPediatricPrompt(medicalContext, transcription, isFlexibleMode);
      case "soapObGyn":
        return this.buildSOAPObGynPrompt(medicalContext, transcription, isFlexibleMode);
      case "apso":
        return this.buildAPSOPrompt(medicalContext, transcription);
      case "progress":
        return this.buildProgressPrompt(medicalContext, transcription);
      case "hAndP":
        return this.buildHistoryAndPhysicalPrompt(
          medicalContext,
          transcription,
        );
      case "discharge":
        return this.buildDischargeSummaryPrompt(medicalContext, transcription);
      case "procedure":
        return this.buildProcedureNotePrompt(medicalContext, transcription);
      default:
        console.warn(
          `⚠️ [EnhancedNotes] Unknown note type: ${noteType}, defaulting to SOAP`,
        );
        return this.buildSOAPPrompt(medicalContext, transcription, isFlexibleMode);
    }
  }

  /**
   * Generates a clinical note using either base templates or custom user templates
   */
  static async generateNote(
    noteType: string,
    patientId: number,
    encounterId: string,
    transcription: string,
    userId?: number,
    customTemplateId?: number,
  ): Promise<string> {
    console.log(`🩺 [EnhancedNotes] Starting note generation:`, {
      noteType,
      patientId,
      encounterId,
      userId,
      customTemplateId,
      transcriptionLength: transcription?.length || 0,
    });

    try {
      // Get user preferences to check AI assistance mode
      let isFlexibleMode = false; // Default to strict mode
      if (userId) {
        try {
          const userPreferences = await storage.getUserNotePreferences(userId);
          isFlexibleMode = userPreferences?.aiAssistanceMode === 'flexible';
          console.log(`🤖 [EnhancedNotes] AI Assistance Mode:`, {
            userId,
            mode: isFlexibleMode ? 'flexible' : 'strict',
            hasPreferences: !!userPreferences
          });
        } catch (error) {
          console.warn(`⚠️ [EnhancedNotes] Failed to fetch user preferences, defaulting to strict mode:`, error);
        }
      }

      // Get patient chart data
      console.log(
        `📊 [EnhancedNotes] Fetching patient chart data for patient ${patientId}`,
      );
      const patientChart =
        await PatientChartService.getPatientChartData(patientId);
      console.log(`📊 [EnhancedNotes] Patient chart retrieved:`, {
        hasChart: !!patientChart,
        hasDemographics: !!patientChart?.demographics,
        medicalProblemsCount: patientChart?.medicalProblems?.length || 0,
        medicationsCount: patientChart?.currentMedications?.length || 0,
        allergiesCount: patientChart?.allergies?.length || 0,
        vitalsCount: patientChart?.vitals?.length || 0,
      });

      const medicalContext = await this.buildMedicalContext(
        patientChart,
        encounterId,
      );
      console.log(
        `🔧 [EnhancedNotes] Medical context built, length: ${medicalContext.length}`,
      );
      console.log(
        `🔧 [EnhancedNotes] Medical context sample:`,
        medicalContext.substring(0, 200) + "...",
      );

      let prompt: string;
      let templateUsed: string = noteType;

      // Determine which template/prompt to use
      console.log(`🎯 [EnhancedNotes] Template selection logic:`, {
        hasCustomTemplateId: !!customTemplateId,
        hasUserId: !!userId,
      });

      if (customTemplateId && userId) {
        console.log(
          `🔍 [EnhancedNotes] Attempting to use custom template ${customTemplateId}`,
        );
        // Use custom template
        const customTemplate =
          await storage.getUserNoteTemplate(customTemplateId);
        console.log(`🔍 [EnhancedNotes] Custom template query result:`, {
          found: !!customTemplate,
          templateUserId: customTemplate?.userId,
          requestUserId: userId,
          authorized: customTemplate?.userId === userId,
        });

        if (customTemplate && customTemplate.userId === userId) {
          prompt = this.prepareCustomPrompt(
            customTemplate.generatedPrompt,
            medicalContext,
            transcription,
          );
          templateUsed = customTemplate.templateName;

          // Increment usage count
          await storage.incrementTemplateUsage(customTemplateId);

          console.log(
            `📋 [EnhancedNotes] Using custom template: ${customTemplate.templateName}`,
          );
        } else {
          console.warn(
            `⚠️ [EnhancedNotes] Custom template ${customTemplateId} not found or unauthorized, falling back to base template`,
          );
          // Use enhanced service prompts with full patient context for ALL note types
          prompt = this.getPromptForNoteType(
            noteType,
            medicalContext,
            transcription,
            isFlexibleMode,
          );
        }
      } else if (userId) {
        console.log(
          `🔍 [EnhancedNotes] Checking for user's default template for ${noteType}`,
        );
        console.log(
          `🔍 [EnhancedNotes] User ID: ${userId}, Note Type: ${noteType}`,
        );

        try {
          // Check for user's default template for this note type
          const userTemplates = await storage.getUserTemplatesByType(
            userId,
            noteType,
          );
          console.log(
            `🔍 [EnhancedNotes] User templates found: ${userTemplates.length}`,
          );

          if (userTemplates.length > 0) {
            console.log(
              `🔍 [EnhancedNotes] Available templates:`,
              userTemplates.map((t) => ({
                id: t.id,
                name: t.templateName,
                isDefault: t.isDefault,
                active: t.active,
              })),
            );
          }

          const defaultTemplate = userTemplates.find((t) => t.isDefault);
          console.log(
            `🔍 [EnhancedNotes] Default template found:`,
            !!defaultTemplate,
          );

          if (defaultTemplate) {
            console.log(`🔍 [EnhancedNotes] Using default template:`, {
              id: defaultTemplate.id,
              name: defaultTemplate.templateName,
              promptLength: defaultTemplate.generatedPrompt?.length || 0,
            });

            prompt = this.prepareCustomPrompt(
              defaultTemplate.generatedPrompt,
              medicalContext,
              transcription,
            );
            templateUsed = defaultTemplate.templateName;

            // Increment usage count
            await storage.incrementTemplateUsage(defaultTemplate.id);

            console.log(
              `⭐ [EnhancedNotes] Using user's default template: ${defaultTemplate.templateName}`,
            );
          } else {
            // No default set, use base template
            console.log(
              `📋 [EnhancedNotes] No default template found, using base template`,
            );
            // Use enhanced service prompts with full patient context for ALL note types
            prompt = this.getPromptForNoteType(
              noteType,
              medicalContext,
              transcription,
              isFlexibleMode,
            );
          }
        } catch (templateError: any) {
          console.error(`❌ [EnhancedNotes] Error checking user templates:`, {
            error: templateError.message,
            stack: templateError.stack,
            userId,
            noteType,
          });
          // Fallback to base template if template system fails
          // Use enhanced service prompts with full patient context for ALL note types
          prompt = this.getPromptForNoteType(
            noteType,
            medicalContext,
            transcription,
            isFlexibleMode,
          );
        }
      } else {
        // No user context, use base template
        console.log(`📋 [EnhancedNotes] No user context, using base template`);
        // Use enhanced service prompts with full patient context for ALL note types
        prompt = this.getPromptForNoteType(
          noteType,
          medicalContext,
          transcription,
          isFlexibleMode,
        );
      }

      console.log(
        `🤖 [EnhancedNotes] Prompt prepared, length: ${prompt.length}`,
      );
      console.log(`🤖 [EnhancedNotes] Template used: ${templateUsed}`);
      console.log(
        `🤖 [EnhancedNotes] Prompt preview:`,
        prompt.substring(0, 300) + "...",
      );

      // Generate note using GPT
      console.log(`🚀 [EnhancedNotes] Calling OpenAI API...`);
      const completion = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 4000,
      });

      console.log(`📥 [EnhancedNotes] OpenAI response received:`, {
        choices: completion.choices.length,
        hasContent: !!completion.choices[0]?.message?.content,
        contentLength: completion.choices[0]?.message?.content?.length || 0,
        usage: completion.usage,
      });

      const generatedNote = completion.choices[0]?.message?.content;
      if (!generatedNote) {
        console.error(
          `❌ [EnhancedNotes] No content in OpenAI response:`,
          completion,
        );
        throw new Error(`No ${noteType} note generated from OpenAI`);
      }

      console.log(`💾 [EnhancedNotes] Saving note to encounter ${encounterId}`);
      // Save note to encounter
      await storage.updateEncounter(parseInt(encounterId), {
        note: generatedNote,
      });

      console.log(
        `✅ [EnhancedNotes] Generated ${noteType} note using template: ${templateUsed}, length: ${generatedNote.length}`,
      );
      return generatedNote;
    } catch (error: any) {
      console.error(`❌ [EnhancedNotes] Error in note generation:`, {
        error: error.message,
        stack: error.stack,
        noteType,
        patientId,
        encounterId,
        userId,
        customTemplateId,
      });
      throw error;
    }
  }

  /**
   * Prepares a custom template prompt by inserting patient context and transcription
   */
  private static prepareCustomPrompt(
    templatePrompt: string,
    medicalContext: string,
    transcription: string,
  ): string {
    return (
      templatePrompt
        .replace(/\{medicalContext\}/g, medicalContext)
        .replace(/\{transcription\}/g, transcription)
        // Also support the old format for backward compatibility
        .replace(
          /PATIENT CONTEXT:\s*\$\{medicalContext\}/g,
          `PATIENT CONTEXT:\n${medicalContext}`,
        )
        .replace(
          /ENCOUNTER TRANSCRIPTION:\s*\$\{transcription\}/g,
          `ENCOUNTER TRANSCRIPTION:\n${transcription}`,
        )
    );
  }

  /**
   * Builds medical context string for templates
   */
  private static async buildMedicalContext(
    patientChart: any,
    encounterId: string,
  ): Promise<string> {
    try {
      const demographics = patientChart.demographics || {};
      const age = demographics.age || "Unknown";

      // Fetch encounter date for proper vitals filtering
      let encounterDate: Date | null = null;
      if (encounterId) {
        try {
          const encounter = await db
            .select({ 
              encounterDate: encounters.encounterDate,
              createdAt: encounters.createdAt 
            })
            .from(encounters)
            .where(eq(encounters.id, parseInt(encounterId)))
            .limit(1);
          
          // Use encounterDate if available (actual visit date), fallback to createdAt
          if (encounter[0]?.encounterDate) {
            encounterDate = new Date(encounter[0].encounterDate);
            console.log(
              `🔍 [EnhancedNotes] Using encounter date (visit date) for vitals filtering: ${encounterDate.toISOString()}`
            );
          } else if (encounter[0]?.createdAt) {
            encounterDate = new Date(encounter[0].createdAt);
            console.log(
              `⚠️ [EnhancedNotes] No encounterDate found, using createdAt for vitals filtering: ${encounterDate.toISOString()}`
            );
          }
        } catch (error) {
          console.error(
            `❌ [EnhancedNotes] Error fetching encounter date:`,
            error
          );
        }
      }

      console.log(
        `🔧 [EnhancedNotes] Building medical context with chart data:`,
        {
          hasDemographics: !!demographics,
          firstName: demographics.firstName,
          lastName: demographics.lastName,
          medicalProblemsCount: patientChart.medicalProblems?.length || 0,
          medicationsCount: patientChart.currentMedications?.length || 0,
          allergiesCount: patientChart.allergies?.length || 0,
          vitalsCount: patientChart.vitals?.length || 0,
          imagingResultsCount: patientChart.imagingResults?.length || 0,
        },
      );

      const currentMedicalProblems =
        patientChart.medicalProblems?.length > 0
          ? patientChart.medicalProblems
              .map(
                (problem: any) =>
                  `- ${problem.problemDescription || "Unspecified condition"}`,
              )
              .join("\n")
          : "- No active medical problems documented";

      const currentMedications =
        patientChart.currentMedications?.length > 0
          ? patientChart.currentMedications
              .map(
                (med: any) =>
                  `- ${med.medicationName || "Unknown medication"} ${med.dosage || ""}`,
              )
              .join("\n")
          : "- No current medications documented";

      const knownAllergies =
        patientChart.allergies?.length > 0
          ? patientChart.allergies
              .map(
                (allergy: any) =>
                  `- ${allergy.allergen || "Unknown allergen"} (${allergy.reaction || "Unknown reaction"})`,
              )
              .join("\n")
          : "- No Known Drug Allergies";

      // Format vitals for clinical context
      const formatVitalsForContext = (vitalsList: any[]) => {
        if (!vitalsList || vitalsList.length === 0) {
          return "- No recent vitals recorded";
        }

        // Filter vitals by encounter date if available
        const recentVitals = (() => {
          if (encounterDate) {
            // Filter to only show vitals from the same day as the encounter
            const startOfDay = new Date(encounterDate);
            startOfDay.setHours(0, 0, 0, 0);
            
            const endOfDay = new Date(encounterDate);
            endOfDay.setHours(23, 59, 59, 999);

            const filtered = vitalsList.filter((vital: any) => {
              if (!vital.recordedAt) {
                console.log(`⚠️ [EnhancedNotes] Vital missing recordedAt:`, vital);
                return false;
              }
              
              const vitalDate = new Date(vital.recordedAt);
              // Check for invalid dates
              if (isNaN(vitalDate.getTime())) {
                console.log(`⚠️ [EnhancedNotes] Invalid recordedAt date for vital:`, {
                  vitalId: vital.id,
                  recordedAt: vital.recordedAt
                });
                return false;
              }
              
              const isWithinDay = vitalDate >= startOfDay && vitalDate <= endOfDay;
              
              // Enhanced debugging for vitals filtering
              if (!isWithinDay) {
                console.log(`🚫 [EnhancedNotes] Excluding vital from different day:`, {
                  vitalId: vital.id,
                  vitalDate: vitalDate.toISOString(),
                  encounterDate: encounterDate.toISOString(),
                  daysDifference: Math.floor((encounterDate.getTime() - vitalDate.getTime()) / (1000 * 60 * 60 * 24))
                });
              }
              
              return isWithinDay;
            });

            console.log(
              `🔍 [EnhancedNotes] Filtered vitals for encounter date ${encounterDate.toISOString()}:`,
              {
                originalCount: vitalsList.length,
                filteredCount: filtered.length,
                dateRange: `${startOfDay.toISOString()} to ${endOfDay.toISOString()}`,
                keptVitals: filtered.map((v: any) => ({
                  id: v.id,
                  recordedAt: v.recordedAt,
                  encounterId: v.encounterId
                }))
              },
            );

            return filtered;
          } else {
            // Fallback: filter to last 24 hours if no encounter date
            const twentyFourHoursAgo = new Date();
            twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

            return vitalsList.filter((vital: any) => {
              if (!vital.recordedAt) return false;
              const vitalDate = new Date(vital.recordedAt);
              return vitalDate >= twentyFourHoursAgo;
            });
          }
        })();

        if (recentVitals.length === 0) {
          return encounterDate 
            ? "- No vitals recorded for this encounter date"
            : "- No vitals recorded in the last 24 hours";
        }

        const latestVitals = recentVitals[0];
        const vitalParts = [];

        // Debug log to see what vitals data we have
        console.log("🔍 [EnhancedNotes] Latest vitals data:", {
          systolicBp: latestVitals.systolicBp,
          diastolicBp: latestVitals.diastolicBp,
          heartRate: latestVitals.heartRate,
          temperature: latestVitals.temperature,
          respiratoryRate: latestVitals.respiratoryRate,
          oxygenSaturation: latestVitals.oxygenSaturation,
          recordedAt: latestVitals.recordedAt
        });

        if (
          latestVitals.systolicBp &&
          latestVitals.diastolicBp
        ) {
          vitalParts.push(
            `BP: ${latestVitals.systolicBp}/${latestVitals.diastolicBp} mmHg`,
          );
        }
        if (latestVitals.heartRate)
          vitalParts.push(`HR: ${latestVitals.heartRate} bpm`);
        if (latestVitals.temperature)
          vitalParts.push(`Temp: ${latestVitals.temperature}°F`);
        if (latestVitals.respiratoryRate)
          vitalParts.push(`RR: ${latestVitals.respiratoryRate}/min`);
        if (latestVitals.oxygenSaturation)
          vitalParts.push(`SpO2: ${latestVitals.oxygenSaturation}%`);

        return vitalParts.length > 0
          ? `- ${vitalParts.join(" | ")}`
          : "- Vitals documented but incomplete";
      };

      const recentImaging =
        patientChart.imagingResults?.length > 0
          ? patientChart.imagingResults
              .slice(0, 5)
              .map((img: any) => {
                const date = new Date(img.studyDate).toLocaleDateString();
                return `- ${date}: ${img.modality || "Unknown modality"} ${img.bodyPart || ""} - ${img.clinicalSummary || img.impression || "Results pending"}`;
              })
              .join("\n")
          : "- No recent imaging studies available";

      const context = `
PATIENT CONTEXT:
- Name: ${demographics.firstName || "Unknown"} ${demographics.lastName || "Unknown"}
- Age: ${age} years old
- Gender: ${demographics.gender || "Unknown"}
- MRN: ${demographics.mrn || "Unknown"}

ACTIVE MEDICAL PROBLEMS:
${currentMedicalProblems}

CURRENT MEDICATIONS:
${currentMedications}

KNOWN ALLERGIES:
${knownAllergies}

RECENT VITALS:
${formatVitalsForContext(patientChart.vitals || [])}

RECENT IMAGING:
${recentImaging}
      `.trim();

      console.log(
        `✅ [EnhancedNotes] Medical context built successfully, length: ${context.length}`,
      );
      return context;
    } catch (error: any) {
      console.error(`❌ [EnhancedNotes] Error building medical context:`, {
        error: error.message,
        stack: error.stack,
        patientChart: !!patientChart,
      });

      // Return minimal fallback context
      return `
PATIENT CONTEXT:
- Name: Unknown Patient
- Age: Unknown
- Gender: Unknown
- MRN: Unknown

ACTIVE MEDICAL PROBLEMS:
- Unable to retrieve medical problems

CURRENT MEDICATIONS:
- Unable to retrieve current medications

KNOWN ALLERGIES:
- Unable to retrieve allergies

RECENT VITALS:
- Unable to retrieve recent vitals

RECENT IMAGING:
- Unable to retrieve recent imaging
      `.trim();
    }
  }

  /**
   * Gets available templates for a user and note type
   */
  static async getAvailableTemplates(userId: number, noteType: string) {
    const customTemplates = await storage.getUserTemplatesByType(
      userId,
      noteType,
    );

    // Add base template option
    const baseTemplate = {
      id: `base-${noteType}`,
      templateName: noteType.toUpperCase(),
      displayName: `${noteType.toUpperCase()} (Standard)`,
      baseNoteType: noteType,
      isPersonal: false,
      isDefault: false,
      isBaseTemplate: true,
    };

    return [baseTemplate, ...customTemplates];
  }

  /**
   * Phase 2 preparation: Track note edits for AI learning
   */
  static async trackNoteEdit(
    userId: number,
    templateId: number,
    originalNote: string,
    editedNote: string,
    noteType: string,
  ): Promise<void> {
    // This will be implemented in Phase 2
    // For now, we just log the edit for future analysis
    console.log(
      `📝 [EnhancedNotes] Note edit tracked for user ${userId}, template ${templateId} (${noteType})`,
    );
    console.log(
      `📝 [EnhancedNotes] Original length: ${originalNote.length}, Edited length: ${editedNote.length}`,
    );

    // TODO Phase 2: Analyze edits and update template prompts automatically
    // This could involve:
    // 1. Detecting formatting preference changes
    // 2. Identifying content style modifications
    // 3. Learning section organization preferences
    // 4. Updating the template's generated prompt via TemplatePromptGenerator.updatePromptFromEdits()
  }
}
