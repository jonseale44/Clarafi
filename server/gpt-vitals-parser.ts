import OpenAI from "openai";
import { InsertVitals } from "@shared/schema";

interface ParsedVitalsData {
  systolicBp?: number;
  diastolicBp?: number;
  heartRate?: number;
  temperature?: string; // stored as string in decimal format
  weight?: string;
  height?: string;
  bmi?: string;
  oxygenSaturation?: string;
  respiratoryRate?: number;
  painScale?: number;
  parsedText?: string;
  confidence?: number;
  warnings?: string[];
}

interface VitalsParsingResult {
  success: boolean;
  data?: ParsedVitalsData;
  errors?: string[];
  confidence: number;
  originalText: string;
}

/**
 * GPT-powered vitals parser for converting freeform text to structured vitals data
 * Handles common medical abbreviations, unit conversions, and clinical formats
 * Designed for US clinic-based EMR standards (imperial units as primary)
 */
export class GPTVitalsParser {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Parse freeform vitals text into structured data
   * Handles automatic unit conversion and validation
   */
  async parseVitalsText(
    vitalsText: string,
    patientContext?: { age?: number; gender?: string; }
  ): Promise<VitalsParsingResult> {
    if (!vitalsText || vitalsText.trim().length === 0) {
      return {
        success: false,
        errors: ["No vitals text provided"],
        confidence: 0,
        originalText: vitalsText || ""
      };
    }

    try {
      const systemPrompt = this.buildVitalsParsingPrompt(patientContext);
      
      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          { role: "system", content: systemPrompt },
          { 
            role: "user", 
            content: `Parse the following vitals text and return structured data:\n\n"${vitalsText.trim()}"` 
          }
        ],
        temperature: 0.1, // Low temperature for consistent parsing
        max_tokens: 1000,
      });

      const gptResponse = response.choices[0]?.message?.content;
      if (!gptResponse) {
        throw new Error("No response from GPT");
      }

      // Parse GPT JSON response
      const parsedData = this.parseGPTResponse(gptResponse);
      
      // Validate and clean the parsed data
      const validatedData = this.validateParsedVitals(parsedData);
      
      // Calculate confidence score
      const confidence = this.calculateConfidenceScore(vitalsText, validatedData);

      return {
        success: true,
        data: validatedData,
        confidence,
        originalText: vitalsText
      };

    } catch (error) {
      console.error("❌ [VitalsParser] Error parsing vitals:", error);
      return {
        success: false,
        errors: [error instanceof Error ? error.message : "Unknown parsing error"],
        confidence: 0,
        originalText: vitalsText
      };
    }
  }

  /**
   * Build comprehensive system prompt for vitals parsing
   */
  private buildVitalsParsingPrompt(patientContext?: { age?: number; gender?: string; }): string {
    return `You are an expert clinical vitals parser for a US clinic-based EMR system. Your job is to extract and standardize vital signs from freeform text input.

CRITICAL REQUIREMENTS:
1. Parse common vitals formats and medical abbreviations
2. Convert ALL measurements to US standard units (imperial system)
3. Handle unit conversions automatically (metric to imperial)
4. Validate ranges and flag abnormal values
5. Return structured JSON data only

US STANDARD UNITS TO USE:
- Blood Pressure: mmHg (systolic/diastolic)
- Temperature: Fahrenheit (°F) - store as decimal string
- Weight: pounds (lbs) - store as decimal string  
- Height: inches (in) - store as decimal string
- Heart Rate: beats per minute (bpm) - store as integer
- Respiratory Rate: breaths per minute - store as integer
- Oxygen Saturation: percentage (%) - store as decimal string
- Pain Scale: 0-10 scale - store as integer
- BMI: calculated if height/weight available - store as decimal string

COMMON ABBREVIATIONS TO RECOGNIZE:
- BP, B/P = Blood Pressure
- HR, P, Pulse = Heart Rate
- T, Temp = Temperature
- RR, Resp = Respiratory Rate
- O2, O2Sat, SpO2 = Oxygen Saturation
- Wt, Weight = Weight
- Ht, Height = Height
- Pain = Pain Scale

UNIT CONVERSIONS:
- Celsius to Fahrenheit: (°C × 9/5) + 32
- Kilograms to pounds: kg × 2.20462
- Centimeters to inches: cm ÷ 2.54
- Meters to inches: m × 39.3701

CRITICAL VALUE RANGES (for warnings):
- Systolic BP: <90 or >180 mmHg
- Diastolic BP: <60 or >110 mmHg  
- Heart Rate: <50 or >120 bpm
- Temperature: <96°F or >101°F
- Respiratory Rate: <12 or >24 per minute
- Oxygen Saturation: <95%
- Pain Scale: >7/10

${patientContext ? `
PATIENT CONTEXT:
- Age: ${patientContext.age || 'Unknown'}
- Gender: ${patientContext.gender || 'Unknown'}
` : ''}

RESPONSE FORMAT - Return ONLY valid JSON:
{
  "systolicBp": number | null,
  "diastolicBp": number | null,
  "heartRate": number | null,
  "temperature": "decimal_string" | null,
  "weight": "decimal_string" | null,
  "height": "decimal_string" | null,
  "bmi": "decimal_string" | null,
  "oxygenSaturation": "decimal_string" | null,
  "respiratoryRate": number | null,
  "painScale": number | null,
  "parsedText": "cleaned_readable_summary",
  "confidence": number_0_to_100,
  "warnings": ["array_of_critical_value_warnings"]
}

EXAMPLES:
Input: "120/80, P 80, RR 23, 98% on room air"
Output: {"systolicBp": 120, "diastolicBp": 80, "heartRate": 80, "respiratoryRate": 23, "oxygenSaturation": "98", "parsedText": "BP 120/80, HR 80, RR 23, O2 Sat 98%", "confidence": 95, "warnings": []}

Input: "BP 180/95, temp 38.5C, wt 70kg"  
Output: {"systolicBp": 180, "diastolicBp": 95, "temperature": "101.3", "weight": "154.3", "parsedText": "BP 180/95, Temp 101.3°F, Weight 154.3 lbs", "confidence": 90, "warnings": ["Critical: Systolic BP >180 mmHg", "Elevated: Temperature >101°F"]}`;
  }

  /**
   * Parse GPT JSON response safely
   */
  private parseGPTResponse(gptResponse: string): ParsedVitalsData {
    try {
      // Clean the response to extract JSON
      const jsonMatch = gptResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in GPT response");
      }

      const parsedData = JSON.parse(jsonMatch[0]);
      return parsedData;
    } catch (error) {
      console.error("❌ [VitalsParser] Error parsing GPT JSON:", error);
      throw new Error("Invalid JSON response from GPT");
    }
  }

  /**
   * Validate and clean parsed vitals data
   */
  private validateParsedVitals(data: ParsedVitalsData): ParsedVitalsData {
    const validated: ParsedVitalsData = {};

    // Validate blood pressure
    if (data.systolicBp && data.systolicBp > 50 && data.systolicBp < 300) {
      validated.systolicBp = Math.round(data.systolicBp);
    }
    if (data.diastolicBp && data.diastolicBp > 30 && data.diastolicBp < 200) {
      validated.diastolicBp = Math.round(data.diastolicBp);
    }

    // Validate heart rate
    if (data.heartRate && data.heartRate > 20 && data.heartRate < 300) {
      validated.heartRate = Math.round(data.heartRate);
    }

    // Validate temperature (Fahrenheit)
    if (data.temperature) {
      const temp = parseFloat(data.temperature);
      if (temp > 80 && temp < 115) {
        validated.temperature = temp.toFixed(1);
      }
    }

    // Validate weight (pounds)
    if (data.weight) {
      const weight = parseFloat(data.weight);
      if (weight > 10 && weight < 1000) {
        validated.weight = weight.toFixed(1);
      }
    }

    // Validate height (inches)
    if (data.height) {
      const height = parseFloat(data.height);
      if (height > 12 && height < 96) {
        validated.height = height.toFixed(1);
      }
    }

    // Calculate BMI if both height and weight are available
    if (validated.weight && validated.height) {
      const weightLbs = parseFloat(validated.weight);
      const heightInches = parseFloat(validated.height);
      const bmi = (weightLbs / (heightInches * heightInches)) * 703;
      validated.bmi = bmi.toFixed(1);
    } else if (data.bmi) {
      const bmi = parseFloat(data.bmi);
      if (bmi > 10 && bmi < 80) {
        validated.bmi = bmi.toFixed(1);
      }
    }

    // Validate oxygen saturation
    if (data.oxygenSaturation) {
      const o2sat = parseFloat(data.oxygenSaturation);
      if (o2sat > 50 && o2sat <= 100) {
        validated.oxygenSaturation = o2sat.toFixed(0);
      }
    }

    // Validate respiratory rate
    if (data.respiratoryRate && data.respiratoryRate > 5 && data.respiratoryRate < 60) {
      validated.respiratoryRate = Math.round(data.respiratoryRate);
    }

    // Validate pain scale
    if (data.painScale !== undefined && data.painScale >= 0 && data.painScale <= 10) {
      validated.painScale = Math.round(data.painScale);
    }

    // Copy text fields
    validated.parsedText = data.parsedText || "";
    validated.confidence = data.confidence || 0;
    validated.warnings = data.warnings || [];

    return validated;
  }

  /**
   * Calculate confidence score based on parsing results
   */
  private calculateConfidenceScore(originalText: string, parsedData: ParsedVitalsData): number {
    let score = 0;
    let maxScore = 0;

    // Check for common vitals patterns
    const commonPatterns = [
      /\d+\/\d+/, // BP pattern
      /\d+\s*(bpm|hr|p|pulse)/i, // Heart rate
      /\d+\.?\d*\s*(f|fahrenheit|c|celsius)/i, // Temperature
      /\d+\s*%/, // Oxygen saturation
      /\d+\s*(rr|resp)/i, // Respiratory rate
    ];

    commonPatterns.forEach(pattern => {
      maxScore += 20;
      if (pattern.test(originalText)) {
        score += 20;
      }
    });

    // Bonus for successfully parsed values
    const parsedFields = Object.keys(parsedData).filter(key => 
      parsedData[key as keyof ParsedVitalsData] !== null && 
      parsedData[key as keyof ParsedVitalsData] !== undefined &&
      key !== 'parsedText' && key !== 'confidence' && key !== 'warnings'
    );

    score += parsedFields.length * 5;
    maxScore += 50; // Maximum possible bonus

    return Math.min(100, Math.round((score / maxScore) * 100));
  }

  /**
   * Create InsertVitals object from parsed data
   */
  createVitalsRecord(
    parsedData: ParsedVitalsData,
    patientId: number,
    encounterId: number,
    recordedBy: string = "GPT Parser"
  ): InsertVitals {
    return {
      patientId,
      encounterId,
      measuredAt: new Date(),
      systolicBp: parsedData.systolicBp || null,
      diastolicBp: parsedData.diastolicBp || null,
      heartRate: parsedData.heartRate || null,
      temperature: parsedData.temperature || null,
      weight: parsedData.weight || null,
      height: parsedData.height || null,
      bmi: parsedData.bmi || null,
      oxygenSaturation: parsedData.oxygenSaturation || null,
      respiratoryRate: parsedData.respiratoryRate || null,
      painScale: parsedData.painScale || null,
      recordedBy,
    };
  }
}

export const gptVitalsParser = new GPTVitalsParser();