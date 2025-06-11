import OpenAI from "openai";
import { z } from "zod";

// Schema for extracted patient information
export const extractedPatientSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  date_of_birth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  gender: z
    .string()
    .toLowerCase()
    .transform((val) => val.toLowerCase()),
  address: z.string().optional(),
  contact_number: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  emergency_contact: z.string().optional(),
  insurance_info: z.string().optional(),
});

export type ExtractedPatient = z.infer<typeof extractedPatientSchema>;

export interface PatientParseResult {
  success: boolean;
  data?: ExtractedPatient;
  error?: string;
  confidence?: number;
}

export class PatientParserService {
  private openai: OpenAI;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY environment variable is required");
    }
    this.openai = new OpenAI({ apiKey });
  }

  /**
   * Parse patient information from image data or text content
   */
  async parsePatientInfo(
    imageData?: string,
    textContent?: string,
    isTextContent: boolean = false,
  ): Promise<PatientParseResult> {
    try {
      const systemPrompt = `You are a medical AI assistant specialized in extracting patient demographic information from medical documents, insurance cards, EHR screenshots, and intake forms.

CRITICAL INSTRUCTIONS:
- Extract ONLY the demographic information that is clearly visible/stated
- DO NOT make assumptions or generate fake data
- Format dates as YYYY-MM-DD
- Normalize gender to lowercase (male, female, other, unknown)
- Return "unknown" for any field that cannot be determined from the input
- Ensure phone numbers include area codes when visible
- Extract complete addresses when available

Return a JSON object with these exact fields:
{
  "first_name": "string",
  "last_name": "string", 
  "date_of_birth": "YYYY-MM-DD",
  "gender": "male|female|other|unknown",
  "address": "string or empty if not found",
  "contact_number": "string or empty if not found",
  "email": "string or empty if not found",
  "emergency_contact": "string or empty if not found",
  "insurance_info": "string or empty if not found"
}`;

      let messages: any[];

      if (isTextContent && textContent) {
        // Process text content
        messages = [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Extract patient demographic information from this text:\n\n${textContent}`,
          },
        ];
      } else if (imageData) {
        // Process image data
        messages = [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Extract patient demographic information from this medical document, insurance card, or form:",
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${imageData}`,
                  detail: "high",
                },
              },
            ],
          },
        ];
      } else {
        return {
          success: false,
          error: "Either imageData or textContent must be provided",
        };
      }

      const response = await this.openai.chat.completions.create({
        model: "gpt-4.1-nano",
        messages,
        response_format: { type: "json_object" },
        temperature: 0,
        max_tokens: 1000,
      });

      const content = response.choices[0].message.content;
      if (!content) {
        return {
          success: false,
          error: "No response from AI service",
        };
      }

      const rawData = JSON.parse(content);

      // Validate and transform the extracted data
      const validatedData = extractedPatientSchema.parse(rawData);

      // Calculate confidence based on completeness of required fields
      const requiredFields = [
        "first_name",
        "last_name",
        "date_of_birth",
        "gender",
      ];
      const completedRequired = requiredFields.filter(
        (field) =>
          validatedData[field as keyof ExtractedPatient] &&
          validatedData[field as keyof ExtractedPatient] !== "unknown",
      ).length;

      const confidence = (completedRequired / requiredFields.length) * 100;

      return {
        success: true,
        data: validatedData,
        confidence: Math.round(confidence),
      };
    } catch (error) {
      console.error("Patient parsing error:", error);

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

  /**
   * Format extracted data for patient creation
   */
  formatForPatientCreation(extractedData: ExtractedPatient): any {
    // Generate MRN (in production, this would follow hospital standards)
    const generateMRN = () => {
      const timestamp = Date.now().toString().slice(-6);
      const random = Math.floor(Math.random() * 1000)
        .toString()
        .padStart(3, "0");
      return `MRN${timestamp}${random}`;
    };

    return {
      mrn: generateMRN(),
      firstName: extractedData.first_name,
      lastName: extractedData.last_name,
      dateOfBirth: extractedData.date_of_birth,
      gender: extractedData.gender,
      contactNumber: extractedData.contact_number || null,
      email: extractedData.email || null,
      address: extractedData.address || null,
      emergencyContact: extractedData.emergency_contact || null,
    };
  }

  /**
   * Validate that required fields are present for patient creation
   */
  validateRequiredFields(data: ExtractedPatient): {
    valid: boolean;
    missingFields: string[];
  } {
    const requiredFields = [
      "first_name",
      "last_name",
      "date_of_birth",
      "gender",
    ];
    const missingFields = requiredFields.filter((field) => {
      const value = data[field as keyof ExtractedPatient];
      return !value || value === "unknown";
    });

    return {
      valid: missingFields.length === 0,
      missingFields,
    };
  }
}
