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
    mimeType: string = 'image/jpeg',
  ): Promise<PatientParseResult> {
    try {
      console.log("🔄 [PatientParser] Starting parsePatientInfo with:", {
        hasImageData: !!imageData,
        imageDataLength: imageData?.length || 0,
        hasTextContent: !!textContent,
        textContentLength: textContent?.length || 0,
        isTextContent,
        mimeType
      });

      const systemPrompt = `You are a medical AI assistant specialized in extracting patient demographic information from medical documents, insurance cards, EHR screenshots, and intake forms.

CRITICAL INSTRUCTIONS:
- Extract ONLY the demographic information that is clearly visible/stated
- DO NOT make assumptions or generate fake data
- Format dates as YYYY-MM-DD
- Normalize gender to lowercase (male, female, other, unknown)
- Return "unknown" for any field that cannot be determined from the input
- Ensure phone numbers include area codes when visible
- Extract complete addresses when available
- NORMALIZE NAME CAPITALIZATION: Always format names with proper capitalization (first letter uppercase, remaining letters lowercase). Examples:
  * "JOHN SMITH" → "John Smith"
  * "jane doe" → "Jane Doe" 
  * "mARY jOHNSON" → "Mary Johnson"
  * "o'CONNOR" → "O'connor"
  * "mcDONALD" → "Mcdonald"

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
        console.log("📝 [PatientParser] Processing text content");
        messages = [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Extract patient demographic information from this text:\n\n${textContent}`,
          },
        ];
      } else if (imageData) {
        // Process image data
        console.log("🖼️ [PatientParser] Processing image data");
        
        // Validate base64 format
        const base64Pattern = /^[A-Za-z0-9+/]*={0,2}$/;
        if (!base64Pattern.test(imageData)) {
          console.error("❌ [PatientParser] Invalid base64 format detected");
          console.log("🔍 [PatientParser] First 100 chars of imageData:", imageData.substring(0, 100));
        }
        
        // Check if imageData already includes data URL prefix
        const hasDataPrefix = imageData.startsWith('data:');
        console.log("🔍 [PatientParser] Image data has data: prefix:", hasDataPrefix);
        
        // Validate and normalize MIME type for OpenAI
        const supportedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        let normalizedMimeType = mimeType.toLowerCase();
        
        // Handle HEIF/HEIC by converting to JPEG (OpenAI doesn't support these)
        if (normalizedMimeType === 'image/heif' || normalizedMimeType === 'image/heic') {
          console.warn("⚠️ [PatientParser] HEIF/HEIC format detected - OpenAI doesn't support this format");
          return {
            success: false,
            error: "HEIF/HEIC image format is not supported. Please convert to JPEG or PNG.",
          };
        }
        
        // Ensure MIME type is supported
        if (!supportedMimeTypes.includes(normalizedMimeType)) {
          console.error("❌ [PatientParser] Unsupported MIME type:", normalizedMimeType);
          console.log("🔍 [PatientParser] Supported types:", supportedMimeTypes);
          return {
            success: false,
            error: `Unsupported image format: ${normalizedMimeType}. Supported formats: JPEG, PNG, GIF, WebP`,
          };
        }
        
        const imageUrl = hasDataPrefix ? imageData : `data:${normalizedMimeType};base64,${imageData}`;
        console.log("🔍 [PatientParser] Image URL prefix:", imageUrl.substring(0, 100));
        console.log("🔍 [PatientParser] Normalized MIME type:", normalizedMimeType);
        
        // Validate base64 data if not already a data URL
        if (!hasDataPrefix) {
          // Check if base64 data looks valid
          const base64Sample = imageData.substring(0, 100);
          console.log("🔍 [PatientParser] Base64 sample:", base64Sample);
          
          // Basic validation - should only contain base64 characters
          if (!/^[A-Za-z0-9+/]*={0,2}$/.test(imageData.replace(/\s/g, ''))) {
            console.error("❌ [PatientParser] Invalid base64 data detected");
            return {
              success: false,
              error: "Invalid image data format. Please ensure the image is properly encoded.",
            };
          }
        }
        
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
                  url: imageUrl,
                  detail: "high",
                },
              },
            ],
          },
        ];
      } else {
        console.error("❌ [PatientParser] No content provided");
        return {
          success: false,
          error: "Either imageData or textContent must be provided",
        };
      }

      console.log("🚀 [PatientParser] Sending request to OpenAI API");
      console.log("📊 [PatientParser] Message structure:", {
        messageCount: messages.length,
        hasSystemMessage: messages[0]?.role === "system",
        userMessageType: isTextContent ? "text" : "image",
        userMessageContentType: typeof messages[1]?.content
      });

      const response = await this.openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages,
        response_format: { type: "json_object" },
        temperature: 0,
        max_tokens: 1000,
      });

      console.log("✅ [PatientParser] Received response from OpenAI");
      
      const content = response.choices[0].message.content;
      if (!content) {
        console.error("❌ [PatientParser] No content in OpenAI response");
        return {
          success: false,
          error: "No response from AI service",
        };
      }

      console.log("📝 [PatientParser] Response content length:", content.length);
      const rawData = JSON.parse(content);
      console.log("📊 [PatientParser] Parsed response data:", rawData);

      // Validate and transform the extracted data
      const validatedData = extractedPatientSchema.parse(rawData);
      console.log("✅ [PatientParser] Data validation successful");

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
    } catch (error: any) {
      console.error("❌ [PatientParser] Error occurred:", error);
      console.error("❌ [PatientParser] Error type:", error?.constructor?.name);
      console.error("❌ [PatientParser] Error message:", error?.message);
      
      if (error?.response) {
        console.error("❌ [PatientParser] API Response status:", error.response.status);
        console.error("❌ [PatientParser] API Response data:", error.response.data);
      }
      
      if (error?.code) {
        console.error("❌ [PatientParser] Error code:", error.code);
      }

      if (error instanceof z.ZodError) {
        console.error("❌ [PatientParser] Zod validation errors:", error.errors);
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

    // Utility function to normalize name capitalization
    const normalizeNameCapitalization = (name: string): string => {
      if (!name || name === "unknown") return name;
      
      return name
        .split(' ')
        .map(word => {
          if (!word) return word;
          // Handle special cases like O'Connor, McDonald, etc.
          if (word.includes("'")) {
            return word.split("'").map(part => 
              part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
            ).join("'");
          }
          return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        })
        .join(' ');
    };

    return {
      mrn: generateMRN(),
      firstName: normalizeNameCapitalization(extractedData.first_name),
      lastName: normalizeNameCapitalization(extractedData.last_name),
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
