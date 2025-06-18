import OpenAI from "openai";

interface ParsedVitalsData {
  systolicBp?: number;
  diastolicBp?: number;
  heartRate?: number;
  temperature?: string;
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

export class VitalsParserService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

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

    console.log("🩺 [VitalsParser] Parsing vitals text:", vitalsText);

    try {
      // Enhanced GPT prompt for better vitals extraction
      const prompt = `You are a medical AI assistant that extracts vital signs from clinical text.

Parse this vitals text and return ONLY a valid JSON object with the following structure:
{
  "systolicBp": number or null,
  "diastolicBp": number or null,
  "heartRate": number or null,
  "temperature": "string with decimal" or null,
  "weight": "string with decimal" or null,
  "height": "string with decimal" or null,
  "bmi": "string with decimal" or null,
  "oxygenSaturation": "string with decimal" or null,
  "respiratoryRate": number or null,
  "painScale": number (0-10) or null,
  "parsedText": "cleaned interpretation",
  "warnings": ["array of critical value warnings"]
}

CRITICAL RULES:
- Convert Celsius to Fahrenheit (°F = °C × 9/5 + 32)
- Convert kg to lbs (lbs = kg × 2.20462)
- Convert cm to inches (inches = cm ÷ 2.54)
- Blood pressure format: "120/80" means systolic=120, diastolic=80
- Temperature, weight, height, BMI, O2 sat as strings with decimals
- Heart rate, respiratory rate, pain scale as numbers
- Flag critical values in warnings array
- Return null for missing values
- No explanatory text, ONLY the JSON object

Input: "${vitalsText}"`;

      console.log("🩺 [VitalsParser] Calling OpenAI...");
      
      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
        max_tokens: 800,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        return {
          success: false,
          errors: ["No response from OpenAI"],
          confidence: 0,
          originalText: vitalsText
        };
      }

      console.log("🩺 [VitalsParser] Raw response:", content);

      // Clean the response - remove markdown formatting
      let cleanedContent = content.trim();
      if (cleanedContent.startsWith('```json')) {
        cleanedContent = cleanedContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      }
      if (cleanedContent.startsWith('```')) {
        cleanedContent = cleanedContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      console.log("🩺 [VitalsParser] Cleaned content:", cleanedContent);

      let parsedData: ParsedVitalsData;
      try {
        parsedData = JSON.parse(cleanedContent);
      } catch (parseError) {
        console.error("❌ [VitalsParser] JSON parse error:", parseError);
        return {
          success: false,
          errors: [`Invalid JSON response: ${parseError}`],
          confidence: 0,
          originalText: vitalsText
        };
      }

      // Calculate confidence based on how many fields were extracted
      const vitalFields = [
        parsedData.systolicBp, parsedData.diastolicBp, parsedData.heartRate,
        parsedData.temperature, parsedData.respiratoryRate, parsedData.oxygenSaturation
      ];
      const extractedCount = vitalFields.filter(field => field !== null && field !== undefined).length;
      const confidence = Math.round((extractedCount / vitalFields.length) * 100);

      // Add timestamp if not present
      if (!parsedData.parsedText) {
        parsedData.parsedText = vitalsText;
      }

      console.log(`✅ [VitalsParser] Successfully parsed ${extractedCount} vitals with ${confidence}% confidence`);

      return {
        success: true,
        data: parsedData,
        confidence,
        originalText: vitalsText
      };

    } catch (error) {
      console.error("❌ [VitalsParser] Error:", error);
      return {
        success: false,
        errors: [error instanceof Error ? error.message : "Unknown error"],
        confidence: 0,
        originalText: vitalsText
      };
    }
  }
}