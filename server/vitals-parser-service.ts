import { OpenAI } from "openai";
import { z } from "zod";

/**
 * Vitals Parser Service - modeled after PatientParserService
 * Extracts structured vital signs from freeform clinical text using GPT
 */

// Schema for extracted vitals data
const extractedVitalsSchema = z.object({
  systolic_bp: z.number().nullable(),
  diastolic_bp: z.number().nullable(),
  heart_rate: z.number().nullable(),
  temperature: z.number().nullable(),
  weight: z.number().nullable(),
  height: z.number().nullable(),
  bmi: z.number().nullable(),
  oxygen_saturation: z.number().nullable(),
  respiratory_rate: z.number().nullable(),
  pain_scale: z.number().nullable(),
  alerts: z.array(z.string()).default([]),
});

export type ExtractedVitals = z.infer<typeof extractedVitalsSchema>;

export interface VitalsParseResult {
  success: boolean;
  data?: ExtractedVitals;
  error?: string;
  confidence?: number;
}

export class VitalsParserService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async parseVitalsText(vitalsText: string): Promise<VitalsParseResult> {
    try {
      console.log("🩺 [VitalsParser] Starting vitals parsing...");
      
      const systemPrompt = `You are a medical AI assistant specialized in extracting vital signs from clinical documentation, nursing notes, and medical records.

CRITICAL INSTRUCTIONS:
- Extract ONLY the vital signs that are clearly stated in the text
- DO NOT make assumptions or generate fake data
- Convert all measurements to US standard units (°F, lbs, inches)
- Return null for any vital sign that cannot be determined from the input
- For blood pressure, extract both systolic and diastolic values
- Normalize units consistently (temperature in Fahrenheit, weight in pounds, etc.)

Return a JSON object with these exact fields:
{
  "systolic_bp": number or null,
  "diastolic_bp": number or null,
  "heart_rate": number or null,
  "temperature": number or null,
  "weight": number or null,
  "height": number or null,
  "bmi": number or null,
  "oxygen_saturation": number or null,
  "respiratory_rate": number or null,
  "pain_scale": number or null,
  "alerts": ["array of any concerning findings"]
}`;

      const messages: any[] = [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Extract vital signs from this clinical text:\n\n${vitalsText}`,
        },
      ];

      console.log("🩺 [VitalsParser] Calling OpenAI API...");
      console.log("🩺 [VitalsParser] OpenAI API Key exists:", !!process.env.OPENAI_API_KEY);
      console.log("🩺 [VitalsParser] Messages:", JSON.stringify(messages, null, 2));
      
      try {
        const response = await this.openai.chat.completions.create({
          model: "gpt-4.1-mini", 
          messages,
          response_format: { type: "json_object" },
          temperature: 0,
          max_tokens: 1000,
        });

        console.log("🩺 [VitalsParser] OpenAI response received");
        console.log("🩺 [VitalsParser] Response choices length:", response.choices?.length);
        
        const content = response.choices[0].message.content;
        console.log("🩺 [VitalsParser] Raw GPT response:", content);
        
        if (!content) {
          console.error("❌ [VitalsParser] No content in OpenAI response");
          return {
            success: false,
            error: "No response from AI service",
          };
        }
      } catch (apiError) {
        console.error("❌ [VitalsParser] OpenAI API error:", apiError);
        return {
          success: false,
          error: `OpenAI API error: ${apiError instanceof Error ? apiError.message : 'Unknown error'}`,
        };
      }
      
      let rawData;
      try {
        rawData = JSON.parse(content);
        console.log("🩺 [VitalsParser] Parsed raw data:", rawData);
      } catch (parseError) {
        console.error("❌ [VitalsParser] Failed to parse OpenAI JSON:", parseError);
        console.error("❌ [VitalsParser] Content was:", content);
        return {
          success: false,
          error: "Invalid JSON from AI service",
        };
      }

      // Validate and transform the extracted data
      let validatedData;
      try {
        validatedData = extractedVitalsSchema.parse(rawData);
        console.log("🩺 [VitalsParser] Validated data:", validatedData);
      } catch (validationError) {
        console.error("❌ [VitalsParser] Schema validation failed:", validationError);
        return {
          success: false,
          error: "Data validation failed",
        };
      }
      console.log("✅ [VitalsParser] Validated data:", validatedData);

      // Calculate confidence based on completeness
      const vitalFields = [
        "systolic_bp",
        "diastolic_bp", 
        "heart_rate",
        "temperature",
        "oxygen_saturation",
        "respiratory_rate"
      ];
      const completedFields = vitalFields.filter(
        (field) => validatedData[field as keyof ExtractedVitals] !== null
      ).length;

      const confidence = Math.round((completedFields / vitalFields.length) * 100);
      console.log(`📊 [VitalsParser] Confidence: ${confidence}%`);

      return {
        success: true,
        data: validatedData,
        confidence,
      };
    } catch (error) {
      console.error("❌ [VitalsParser] Parsing error:", error);

      if (error instanceof z.ZodError) {
        return {
          success: false,
          error: `Data validation failed: ${error.errors.map((e) => e.message).join(", ")}`,
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown parsing error",
      };
    }
  }
}