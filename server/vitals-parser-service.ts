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
  extractedDate?: string; // ISO date string extracted by GPT
  timeContext?: string; // e.g., "admission", "day 2", "discharge", "0800 hours"
}

interface VitalsParsingResult {
  success: boolean;
  data?: ParsedVitalsData[]; // Changed to array for multiple vitals sets
  errors?: string[];
  confidence: number;
  originalText: string;
  totalSetsFound?: number;
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
    patientContext?: { age?: number; gender?: string },
  ): Promise<VitalsParsingResult> {
    if (!vitalsText || vitalsText.trim().length === 0) {
      return {
        success: false,
        errors: ["No vitals text provided"],
        confidence: 0,
        originalText: vitalsText || "",
      };
    }

    console.log(
      "🔥 [VITALS PARSING] ============= STARTING GPT-4.1-NANO VITALS PARSING =============",
    );
    console.log(
      "🩺 [VitalsParser] Input text length:",
      vitalsText.length,
      "characters",
    );
    console.log("🩺 [VitalsParser] Patient context:", patientContext);
    console.log(
      "🩺 [VitalsParser] Parsing vitals text preview:",
      vitalsText.substring(0, 200) + (vitalsText.length > 200 ? "..." : ""),
    );
    console.log("🩺 [VitalsParser] Starting AI parsing process...");

    try {
      // Enhanced GPT prompt for multiple vitals extraction with temporal intelligence
      const prompt = `You are a medical AI assistant that extracts ALL vital signs from clinical text, including multiple sets across different dates/times.

Analyze this clinical text and identify EVERY DISTINCT SET of vital signs. Each set may be from different dates, times, or clinical contexts (admission, daily rounds, discharge, etc.).

Return ONLY a valid JSON array with this structure:
[
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
    "extractedDate": "YYYY-MM-DD or null if no date found",
    "timeContext": "admission/day1/day2/discharge/0800hrs/etc or null",
    "parsedText": "brief description of this vitals set",
    "warnings": ["array of critical value warnings for this set"]
  }
]

CRITICAL INTELLIGENCE RULES:
- Convert Celsius to Fahrenheit (°F = °C × 9/5 + 32)
- Convert kg to lbs (lbs = kg × 2.20462)
- Convert cm to inches (inches = cm ÷ 2.54)
- Blood pressure format: "120/80" means systolic=120, diastolic=80
- Use your intelligence to extract dates from context (e.g., "Day 2" relative to admission date)
- Separate vitals by temporal context even without explicit dates
- If same vitals repeated, only include once unless different contexts
- Flag critical values in warnings array
- Return empty array if no vitals found
- No explanatory text, ONLY the JSON array

STRICT NO-EMPTY-VITALS RULES:
- NEVER create a vitals entry just because a date is mentioned in the document
- ONLY create vitals entries where actual vital signs measurements are documented
- Do NOT create entries for dates with no corresponding vital signs
- Do NOT create placeholder entries with all null values
- Each vitals entry must have AT LEAST ONE non-null vital sign measurement
- If a date is mentioned but no vitals are recorded for that date, ignore that date completely
- Examples of what NOT to extract:
  * "Patient seen on 01/15/2024" (date only, no vitals)
  * "Follow-up scheduled for next week" (future date, no current vitals)
  * "Previous visit on 12/10/2023 showed improvement" (historical reference without specific vitals)
- Examples of what TO extract:
  * "01/15/2024: BP 120/80, HR 72" (date with actual vitals)
  * "On admission: Temperature 98.6°F, pulse 85" (context with measurements)

Input: "${vitalsText}"`;

      console.log("🩺 [VitalsParser] 🤖 Calling OpenAI GPT-4.1-nano...");
      console.log(
        "🩺 [VitalsParser] 🤖 Model: gpt-4.1-nano, Temperature: 0.1, Max tokens: 1500",
      );

      const startTime = Date.now();
      const response = await this.openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
        max_tokens: 30000, // Increased to prevent truncation of multiple vitals sets
      });
      const processingTime = Date.now() - startTime;

      console.log(
        `🩺 [VitalsParser] ✅ OpenAI response received in ${processingTime}ms`,
      );
      console.log(
        `🩺 [VitalsParser] ✅ Token usage: ${response.usage?.total_tokens || "unknown"} tokens`,
      );

      const content = response.choices[0]?.message?.content;
      if (!content) {
        return {
          success: false,
          errors: ["No response from OpenAI"],
          confidence: 0,
          originalText: vitalsText,
        };
      }

      console.log("🩺 [VitalsParser] Raw response:", content);

      // Clean the response - remove markdown formatting
      let cleanedContent = content.trim();
      if (cleanedContent.startsWith("```json")) {
        cleanedContent = cleanedContent
          .replace(/^```json\s*/, "")
          .replace(/\s*```$/, "");
      }
      if (cleanedContent.startsWith("```")) {
        cleanedContent = cleanedContent
          .replace(/^```\s*/, "")
          .replace(/\s*```$/, "");
      }

      console.log("🩺 [VitalsParser] Cleaned content:", cleanedContent);
      console.log("🩺 [VitalsParser] Content length:", cleanedContent.length);
      console.log(
        "🩺 [VitalsParser] Starts with [:",
        cleanedContent.startsWith("["),
      );
      console.log(
        "🩺 [VitalsParser] Starts with {:",
        cleanedContent.startsWith("{"),
      );

      let parsedData: ParsedVitalsData[];
      try {
        // Check if the content looks truncated
        if (
          !cleanedContent.trim().endsWith("]") &&
          !cleanedContent.trim().endsWith("}")
        ) {
          console.warn(
            "⚠️ [VitalsParser] Response appears truncated, attempting to fix...",
          );
          // Try to find the last complete vitals set
          const lastCompleteObject = cleanedContent.lastIndexOf("}");
          if (lastCompleteObject > -1) {
            cleanedContent = cleanedContent.substring(
              0,
              lastCompleteObject + 1,
            );
            if (
              cleanedContent.trim().startsWith("[") &&
              !cleanedContent.trim().endsWith("]")
            ) {
              cleanedContent = cleanedContent + "]";
            }
            console.log("🩺 [VitalsParser] Attempted to fix truncated JSON");
          }
        }

        const parsed = JSON.parse(cleanedContent);
        console.log("🩺 [VitalsParser] Parsed JSON type:", typeof parsed);
        console.log("🩺 [VitalsParser] Is array:", Array.isArray(parsed));
        console.log(
          "🩺 [VitalsParser] Parsed data preview:",
          JSON.stringify(parsed).substring(0, 200),
        );

        // Handle both array and single object responses from GPT
        parsedData = Array.isArray(parsed) ? parsed : [parsed];
        console.log(
          "🩺 [VitalsParser] Final parsedData length:",
          parsedData.length,
        );
      } catch (parseError) {
        console.error("❌ [VitalsParser] JSON parse error:", parseError);
        console.error(
          "❌ [VitalsParser] Content that failed to parse:",
          cleanedContent.substring(0, 500) + "...",
        );
        return {
          success: false,
          errors: [`Invalid JSON response: ${parseError}`],
          confidence: 0,
          originalText: vitalsText,
        };
      }

      // Calculate overall confidence based on how many vitals were extracted
      let totalExtracted = 0;
      let totalPossible = 0;

      parsedData.forEach((vitalSet, index) => {
        const vitalFields = [
          vitalSet.systolicBp,
          vitalSet.diastolicBp,
          vitalSet.heartRate,
          vitalSet.temperature,
          vitalSet.respiratoryRate,
          vitalSet.oxygenSaturation,
        ];
        const setExtracted = vitalFields.filter(
          (field) => field !== null && field !== undefined,
        ).length;
        totalExtracted += setExtracted;
        totalPossible += vitalFields.length;

        // Add default parsedText if not present
        if (!vitalSet.parsedText) {
          vitalSet.parsedText = `Vitals set ${index + 1} from document`;
        }
      });

      const confidence =
        totalPossible > 0
          ? Math.round((totalExtracted / totalPossible) * 100)
          : 0;

      console.log(
        `🔥 [VITALS PARSING] ============= VITALS PARSING COMPLETE =============`,
      );
      console.log(
        `✅ [VitalsParser] Successfully parsed ${parsedData.length} vitals sets with ${confidence}% confidence`,
      );

      parsedData.forEach((vitalSet, index) => {
        console.log(`✅ [VitalsParser] === VITALS SET ${index + 1} ===`);
        if (vitalSet.extractedDate) {
          console.log(`✅ [VitalsParser] - Date: ${vitalSet.extractedDate}`);
        }
        if (vitalSet.timeContext) {
          console.log(`✅ [VitalsParser] - Context: ${vitalSet.timeContext}`);
        }
        if (vitalSet.systolicBp && vitalSet.diastolicBp) {
          console.log(
            `✅ [VitalsParser] - Blood Pressure: ${vitalSet.systolicBp}/${vitalSet.diastolicBp} mmHg`,
          );
        }
        if (vitalSet.heartRate) {
          console.log(
            `✅ [VitalsParser] - Heart Rate: ${vitalSet.heartRate} bpm`,
          );
        }
        if (vitalSet.temperature) {
          console.log(
            `✅ [VitalsParser] - Temperature: ${vitalSet.temperature}°F`,
          );
        }
        if (vitalSet.weight) {
          console.log(`✅ [VitalsParser] - Weight: ${vitalSet.weight} lbs`);
        }
        if (vitalSet.height) {
          console.log(`✅ [VitalsParser] - Height: ${vitalSet.height} inches`);
        }
        if (vitalSet.oxygenSaturation) {
          console.log(
            `✅ [VitalsParser] - O2 Saturation: ${vitalSet.oxygenSaturation}%`,
          );
        }
        if (vitalSet.respiratoryRate) {
          console.log(
            `✅ [VitalsParser] - Respiratory Rate: ${vitalSet.respiratoryRate} breaths/min`,
          );
        }
        if (vitalSet.painScale !== null && vitalSet.painScale !== undefined) {
          console.log(
            `✅ [VitalsParser] - Pain Scale: ${vitalSet.painScale}/10`,
          );
        }
        if (vitalSet.warnings && vitalSet.warnings.length > 0) {
          console.log(
            `⚠️ [VitalsParser] - Warnings: ${vitalSet.warnings.join(", ")}`,
          );
        }
      });

      console.log(
        `🔥 [VITALS PARSING] ============= PARSING SUCCESS =============`,
      );

      return {
        success: true,
        data: parsedData,
        confidence,
        originalText: vitalsText,
        totalSetsFound: parsedData.length,
      };
    } catch (error) {
      console.error("❌ [VitalsParser] Error:", error);
      return {
        success: false,
        errors: [error instanceof Error ? error.message : "Unknown error"],
        confidence: 0,
        originalText: vitalsText,
      };
    }
  }
}
