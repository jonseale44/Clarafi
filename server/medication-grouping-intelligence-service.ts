/**
 * Medication Grouping Intelligence Service
 * 
 * Uses GPT to intelligently group medications by therapeutic area and clinical indication
 * Handles complex multi-indication medications and clinical hierarchies
 */

import OpenAI from "openai";

export interface MedicationGrouping {
  groupName: string;
  description: string;
  medications: Array<{
    id: number;
    medicationName: string;
    specificIndication?: string; // e.g., "for rate control" under AF group
  }>;
  priority: number; // For ordering groups
}

export class MedicationGroupingIntelligenceService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Analyze medications and return intelligent therapeutic groupings
   */
  async groupMedicationsIntelligently(
    medications: Array<{
      id: number;
      medicationName: string;
      clinicalIndication?: string;
      dosage?: string;
      route?: string;
    }>
  ): Promise<MedicationGrouping[]> {
    console.log(`🧠 [MedGrouping] Analyzing ${medications.length} medications for intelligent grouping`);
    
    if (medications.length === 0) {
      return [];
    }

    const systemPrompt = `You are an expert clinical pharmacist organizing medications for physician review.
Your task is to group medications by their PRIMARY therapeutic area or clinical use.

CRITICAL GROUPING PRINCIPLES:
1. Use clinical hierarchies - group related conditions together (e.g., HFrEF under Heart Failure)
2. Assign medications to their most likely primary indication based on the medication and any provided indication
3. Common therapeutic groups should include:
   - Cardiovascular - Heart Failure (includes HFrEF, HFpEF, CHF)
   - Cardiovascular - Hypertension
   - Cardiovascular - Arrhythmia
   - Cardiovascular - Anticoagulation/Antiplatelet
   - Diabetes Management
   - Lipid Management
   - Respiratory
   - Pain Management
   - Psychiatric Medications
   - GI/Acid Suppression
   - Thyroid
   - Other (for miscellaneous)

4. For multi-indication medications (e.g., Metoprolol for HTN + CHF + AF):
   - Place in the most clinically relevant group based on dosing and context
   - Add a specific indication note if helpful

5. Recognize medication classes:
   - ACE inhibitors/ARBs often for HTN + Heart Failure
   - Beta blockers for HTN + Heart Failure + Arrhythmia
   - Diuretics for HTN + Heart Failure + Edema

RESPONSE FORMAT:
{
  "groups": [
    {
      "groupName": "Cardiovascular - Heart Failure",
      "description": "Medications for heart failure management",
      "priority": 1,
      "medications": [
        {
          "id": 123,
          "medicationName": "Furosemide",
          "specificIndication": "diuresis"
        }
      ]
    }
  ]
}`;

    const userPrompt = `Please group these medications intelligently:

${medications.map(med => 
  `ID: ${med.id}
Name: ${med.medicationName}
Current Indication: ${med.clinicalIndication || 'Not specified'}
Dosage: ${med.dosage || 'Not specified'}
Route: ${med.route || 'Not specified'}`
).join('\n\n')}

Group these medications by their primary therapeutic area, using clinical judgment to handle multi-indication medications appropriately.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o", // Using latest model as per blueprint
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.2, // Lower temperature for consistency
        response_format: { type: "json_object" }
      });

      const result = JSON.parse(response.choices[0]?.message?.content || "{}");
      
      console.log(`🧠 [MedGrouping] Successfully grouped medications into ${result.groups?.length || 0} therapeutic areas`);
      
      // Map the response to our interface
      return (result.groups || []).map((group: any) => ({
        groupName: group.groupName,
        description: group.description,
        priority: group.priority,
        medications: group.medications.map((med: any) => ({
          id: med.id,
          medicationName: med.medicationName,
          specificIndication: med.specificIndication
        }))
      }));

    } catch (error) {
      console.error("❌ [MedGrouping] Error grouping medications:", error);
      // Fallback to simple grouping by indication
      return this.fallbackGrouping(medications);
    }
  }

  /**
   * Fallback grouping method if GPT fails
   */
  private fallbackGrouping(medications: any[]): MedicationGrouping[] {
    const groups: Map<string, MedicationGrouping> = new Map();
    
    medications.forEach(med => {
      const indication = med.clinicalIndication || 'Other';
      
      if (!groups.has(indication)) {
        groups.set(indication, {
          groupName: indication,
          description: `Medications for ${indication}`,
          priority: 99,
          medications: []
        });
      }
      
      groups.get(indication)!.medications.push({
        id: med.id,
        medicationName: med.medicationName
      });
    });
    
    return Array.from(groups.values());
  }

  /**
   * Get a simplified therapeutic category for a medication
   * Used for quick categorization without full GPT analysis
   */
  static getTherapeuticCategory(medicationName: string, indication?: string): string {
    const name = medicationName.toLowerCase();
    const ind = indication?.toLowerCase() || '';
    
    // Cardiovascular - Heart Failure
    if (ind.includes('hfref') || ind.includes('hfpef') || ind.includes('chf') || 
        ind.includes('heart failure') || ind.includes('edema')) {
      return 'Cardiovascular - Heart Failure';
    }
    
    // Common medication patterns
    if (name.includes('furosemide') || name.includes('torsemide') || name.includes('bumetanide')) {
      return 'Cardiovascular - Heart Failure';
    }
    
    if (name.includes('lisinopril') || name.includes('enalapril') || name.includes('ramipril') ||
        name.includes('losartan') || name.includes('valsartan')) {
      return ind.includes('heart failure') ? 'Cardiovascular - Heart Failure' : 'Cardiovascular - Hypertension';
    }
    
    if (name.includes('metoprolol') || name.includes('carvedilol') || name.includes('bisoprolol')) {
      return ind.includes('heart failure') ? 'Cardiovascular - Heart Failure' : 'Cardiovascular - Hypertension';
    }
    
    if (name.includes('spironolactone') || name.includes('eplerenone')) {
      return 'Cardiovascular - Heart Failure';
    }
    
    // Diabetes
    if (name.includes('insulin') || name.includes('metformin') || name.includes('glipizide') ||
        name.includes('januvia') || name.includes('ozempic') || ind.includes('diabetes') || 
        ind.includes('t2dm') || ind.includes('t1dm')) {
      return 'Diabetes Management';
    }
    
    // Anticoagulation
    if (name.includes('warfarin') || name.includes('eliquis') || name.includes('xarelto') ||
        name.includes('pradaxa') || name.includes('aspirin') || ind.includes('anticoag') ||
        ind.includes('dvt') || ind.includes('prophylaxis')) {
      return 'Cardiovascular - Anticoagulation';
    }
    
    // Lipids
    if (name.includes('statin') || name.includes('atorvastatin') || name.includes('simvastatin') ||
        name.includes('rosuvastatin') || ind.includes('hyperlipidemia') || ind.includes('cholesterol')) {
      return 'Lipid Management';
    }
    
    // Default
    return 'Other';
  }
}