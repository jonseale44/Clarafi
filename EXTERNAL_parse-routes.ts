import { Router } from "express";
import { z } from "zod";
import { parsePatientInfoFromImage } from "../services/patient-parser-service";

const router = Router();

// Enhanced schema for validating the patient info parsing request
// Supporting both text and image data
const parsePatientInfoSchema = z.object({
  imageData: z.string().min(1, "Patient information data is required"),
  isTextContent: z.boolean().default(true),
});

/**
 * Parses patient information from text or image using GPT-4o Vision
 * Handles both direct text input and image uploads
 */
router.post("/parse-patient-info", async (req, res) => {
  try {
    console.log("[API] Patient info parse request received");

    // Validate request
    const result = parsePatientInfoSchema.safeParse(req.body);
    if (!result.success) {
      console.error(
        "[API] Invalid parse patient info request:",
        result.error.format(),
      );
      return res.status(400).json({
        error: "Invalid request data",
        details: result.error.format(),
      });
    }

    const { imageData, isTextContent } = result.data;

    // Check if data is actually an image when isTextContent is false
    // PNG and JPEG signatures in base64
    const isPngSignature =
      imageData.startsWith("iVBORw0KG") ||
      imageData.startsWith("data:image/png;base64,");
    const isJpegSignature =
      imageData.startsWith("/9j/") ||
      imageData.startsWith("data:image/jpeg;base64,");

    // If it claims to be text but has image signatures, override it
    const actualIsTextContent =
      isTextContent && !(isPngSignature || isJpegSignature);

    if (isTextContent !== actualIsTextContent) {
      console.log(
        `[API] Detected mismatch in content type: claimed ${isTextContent ? "text" : "image"} but appears to be ${actualIsTextContent ? "text" : "image"}. Overriding.`,
      );
    }

    console.log(
      `[API] Processing patient info from ${actualIsTextContent ? "text" : "image"}`,
    );

    // Check if OpenAI API key is available
    if (!process.env.OPENAI_API_KEY) {
      console.error("[API] Missing OpenAI API key");
      return res.status(500).json({
        error: "OpenAI API key is not configured",
      });
    }

    // Use the enhanced patient parser service
    try {
      const parsedInfo = await parsePatientInfoFromImage(
        imageData,
        actualIsTextContent,
      );

      if (!parsedInfo) {
        return res.status(422).json({
          error: "Could not extract patient information from the provided data",
        });
      }

      console.log("[API] Successfully parsed patient info");
      return res.status(200).json(parsedInfo);
    } catch (parserError: any) {
      console.error(
        "[API] Error in patient parser service:",
        parserError.message,
      );
      return res.status(500).json({
        error: "Error processing patient information",
        details: parserError.message,
      });
    }
  } catch (error: any) {
    console.error("Error handling parse patient info request:", error);
    return res.status(500).json({
      error: "Server error while parsing patient information",
      details: error.message,
    });
  }
});

export default router;
