// Test script to trigger medical problems processing
const fetch = require('node-fetch');

const soapNote = `**SUBJECTIVE:**
- 61-year-old male presents with concern about a facial rash.
- Reports the rash has been present for an unspecified duration and is causing significant worry.
- Endorses fatigue, generalized achiness, and joint swelling.
- Denies known medication allergies.
- No current medications.

**OBJECTIVE:**
Vitals: BP: N/A | HR: N/A | Temp: N/A | RR: N/A | SpO2: N/A

Physical Exam:
Gen: AAO x 3. NAD.
HEENT: MMM, no lymphadenopathy.
CV: Normal rate, regular rhythm. No m/c/g/r.
Lungs: Normal work of breathing. CTAB.
Abd: Normoactive bowel sounds. Soft, non-tender.
Ext: **Joints with visible swelling.**
Skin: **Erythematous rash on face.**

**ASSESSMENT/PLAN:**
Suspected Systemic Lupus Erythematosus (M32.9):
- Initiate hydroxychloroquine therapy
- Order serologic testing for autoimmune markers
- Monitor for medication side effects

Fatigue and Arthralgia (R53.83, M25.50):
- Symptom management as needed
- Monitor for progression

Unspecified Facial Rash (R21):
- Document and monitor rash progression
- Advise sun protection`;

async function testMedicalProblems() {
  try {
    console.log('Testing medical problems processing...');
    
    const response = await fetch('http://localhost:5000/api/encounters/12/process-medical-problems', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        soapNote: soapNote,
        patientId: 6
      })
    });

    console.log('Response status:', response.status);
    const result = await response.text();
    console.log('Response:', result);

  } catch (error) {
    console.error('Error:', error);
  }
}

testMedicalProblems();