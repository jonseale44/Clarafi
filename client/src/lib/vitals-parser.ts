/**
 * Client-side vitals parser using OpenAI
 * Direct implementation to avoid API routing issues
 */

interface ParsedVitalsData {
  systolicBp?: number;
  diastolicBp?: number;
  heartRate?: number;
  temperature?: number;
  weight?: number;
  height?: number;
  bmi?: number;
  oxygenSaturation?: number;
  respiratoryRate?: number;
  painScale?: number;
  originalText?: string;
  alerts?: string[];
}

interface VitalsParsingResult {
  success: boolean;
  data?: ParsedVitalsData;
  errors?: string[];
  confidence: number;
  originalText: string;
}

export class ClientVitalsParser {
  async parseVitalsText(vitalsText: string): Promise<VitalsParsingResult> {
    try {
      console.log("🩺 [ClientVitalsParser] Starting vitals parsing...");
      
      // Extract vitals using regex patterns (reliable and fast)
      const extractedVitals = this.extractVitalsFromText(vitalsText);
      
      // Calculate confidence based on how many vitals were extracted
      const extractedCount = Object.values(extractedVitals).filter(v => v !== null && v !== undefined && v !== vitalsText).length;
      const confidence = Math.min(95, extractedCount * 15 + 20); // 20-95% confidence
      
      return {
        success: extractedCount > 0,
        data: extractedVitals,
        confidence: confidence,
        originalText: vitalsText,
        errors: extractedCount === 0 ? ["No recognizable vital signs found in the text"] : []
      };

    } catch (error) {
      console.error("❌ [ClientVitalsParser] Error:", error);
      return {
        success: false,
        errors: [error instanceof Error ? error.message : "Unknown parsing error"],
        confidence: 0,
        originalText: vitalsText
      };
    }
  }

  private extractVitalsFromText(text: string): ParsedVitalsData {
    const vitals: ParsedVitalsData = {
      originalText: text
    };

    // Blood pressure patterns - more comprehensive
    const bpPatterns = [
      /(?:BP|blood pressure|B\.P\.)[:\s]*(\d{2,3})\/(\d{2,3})/i,
      /(\d{2,3})\/(\d{2,3})\s*(?:mmHg|mm Hg)?/i,
      /systolic[:\s]*(\d{2,3}).*diastolic[:\s]*(\d{2,3})/i
    ];
    
    for (const pattern of bpPatterns) {
      const match = text.match(pattern);
      if (match) {
        vitals.systolicBp = parseInt(match[1]);
        vitals.diastolicBp = parseInt(match[2]);
        break;
      }
    }

    // Heart rate patterns - more comprehensive
    const hrPatterns = [
      /(?:HR|heart rate|pulse|P)[:\s]*(\d{1,3})/i,
      /(\d{1,3})\s*(?:bpm|beats per minute)/i
    ];
    
    for (const pattern of hrPatterns) {
      const match = text.match(pattern);
      if (match) {
        vitals.heartRate = parseInt(match[1]);
        break;
      }
    }

    // Temperature patterns - more comprehensive
    const tempPatterns = [
      /(?:temp|temperature|T)[:\s]*(\d{1,3}(?:\.\d{1,2})?)\s*°?[Ff]?/i,
      /(\d{1,3}(?:\.\d{1,2})?)\s*degrees?[:\s]*[Ff]/i,
      /(\d{1,3}(?:\.\d{1,2})?)\s*°F/i
    ];
    
    for (const pattern of tempPatterns) {
      const match = text.match(pattern);
      if (match) {
        vitals.temperature = parseFloat(match[1]);
        break;
      }
    }

    // Respiratory rate patterns
    const rrPatterns = [
      /(?:RR|respiratory rate|respiration|R)[:\s]*(\d{1,2})/i,
      /(\d{1,2})\s*(?:breaths per minute|bpm|respirations)/i
    ];
    
    for (const pattern of rrPatterns) {
      const match = text.match(pattern);
      if (match) {
        vitals.respiratoryRate = parseInt(match[1]);
        break;
      }
    }

    // Oxygen saturation patterns
    const o2Patterns = [
      /(?:O2|oxygen|sat|SpO2|O2 sat)[:\s]*(\d{1,3})%?/i,
      /(\d{1,3})%\s*(?:oxygen|O2)/i,
      /oxygen[:\s]*(\d{1,3})/i
    ];
    
    for (const pattern of o2Patterns) {
      const match = text.match(pattern);
      if (match) {
        vitals.oxygenSaturation = parseInt(match[1]);
        break;
      }
    }

    // Weight patterns
    const weightMatch = text.match(/(?:weight|wt)[:\s]*(\d{1,3}(?:\.\d{1,2})?)\s*(?:lbs?|pounds?)?/i);
    if (weightMatch) {
      vitals.weight = parseFloat(weightMatch[1]);
    }

    // Height patterns
    const heightMatch = text.match(/(?:height|ht)[:\s]*(\d{1,2})(?:'|ft)?\s*(\d{1,2})(?:"|in)?|(\d{1,2}(?:\.\d{1,2})?)\s*(?:inches?|in)/i);
    if (heightMatch) {
      if (heightMatch[3]) {
        // Height in inches
        vitals.height = parseFloat(heightMatch[3]);
      } else if (heightMatch[1] && heightMatch[2]) {
        // Height in feet and inches
        vitals.height = parseInt(heightMatch[1]) * 12 + parseInt(heightMatch[2]);
      }
    }

    // Calculate BMI if we have both height and weight
    if (vitals.height && vitals.weight) {
      vitals.bmi = Math.round((vitals.weight / (vitals.height * vitals.height)) * 703 * 10) / 10;
    }

    // Pain scale patterns
    const painMatch = text.match(/(?:pain)[:\s]*(\d{1,2})(?:\/10)?/i);
    if (painMatch) {
      vitals.painScale = parseInt(painMatch[1]);
    }

    return vitals;
  }
}