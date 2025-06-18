import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export function parseDate(text: string): string {
  const dateMatch = text.match(
    /(?:\b(?:on|dated?|from)\s+)?(\d{1,2}\/\d{1,2}\/\d{2,4}|\d{4}-\d{2}-\d{2})/i,
  );

  let date: Date;
  if (dateMatch) {
    date = new Date(dateMatch[1]);
  } else {
    date = new Date();
  }

  date.setHours(12, 0, 0, 0);
  return date.toISOString();
}

/**
 * Service to parse vitals text using GPT (multi-visit aware)
 */
export async function parseVitalsWithGPT(vitalsText: string) {
  const requestId = Math.random().toString(36).substring(7);
  try {
    console.log("[Vitals Parser] Starting extraction:", {
      requestId,
      timestamp: new Date().toISOString(),
      textType: vitalsText?.includes("SOAP Note") ? "soap_note" : "attachment",
      hasVitalsSection: vitalsText?.toLowerCase().includes("vital") || false,
      textLength: vitalsText?.length,
    });

    console.log("[Vitals Parser] Processing vitals text:", vitalsText);

    const prompt = `
You are a medical vitals parser.

Your task is to scan the input text and extract one or more sets of vitals measurements, especially when the document contains multiple SOAP notes or multiple dates of visit.

For each set of vitals, extract these fields (return null for missing values):

- blood_pressure_systolic (number)
- blood_pressure_diastolic (number)
- heart_rate (number)
- respiratory_rate (number)
- temperature (number)
- temperature_unit (string, either "F" or "C")
- oxygen_saturation (number)
- height (number, in cm)
- weight (number, in kg)
- measured_at (ISO 8601 string)

Rules for measured_at:
- Use a date mentioned near the vitals section
- If multiple visits exist, assign the right date to each
- If no date is found, infer or use today's date (12:00 noon)

Return an array of vitals objects — one per visit.

Example:
[
  {
    "blood_pressure_systolic": 120,
    "blood_pressure_diastolic": 80,
    "heart_rate": 72,
    "respiratory_rate": 16,
    "temperature": 98.6,
    "temperature_unit": "F",
    "oxygen_saturation": 98,
    "height": 170,
    "weight": 70,
    "measured_at": "2024-03-08T12:00:00Z"
  }
]

Return only the JSON array. No explanation.
Input:
"""${vitalsText}"""
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4.1-nano",
      messages: [
        {
          role: "system",
          content:
            "You are a medical vitals parser that converts text into structured data. Return only valid JSON.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0,
    });

    const rawContent = response.choices[0].message.content || "";

    // Strip potential Markdown code blocks (e.g., ```json ... ```)
    const cleanContent = rawContent
      .replace(/^```json\s*/i, "") // remove starting ```json
      .replace(/^```\s*/i, "") // or plain ```
      .replace(/```\s*$/i, ""); // and ending fence

    const parsedResponseRaw = JSON.parse(cleanContent);

    const vitalsArray = Array.isArray(parsedResponseRaw)
      ? parsedResponseRaw
      : [parsedResponseRaw];

    const fallbackDate = parseDate(vitalsText); // for entries without a date

    const validVitals = vitalsArray
      .map((v) => ({
        blood_pressure_systolic: v.blood_pressure_systolic ?? null,
        blood_pressure_diastolic: v.blood_pressure_diastolic ?? null,
        heart_rate: v.heart_rate ?? null,
        respiratory_rate: v.respiratory_rate ?? null,
        temperature: v.temperature ?? null,
        temperature_unit: v.temperature_unit ?? "F",
        oxygen_saturation: v.oxygen_saturation ?? null,
        height: v.height ?? null,
        weight: v.weight ?? null,
        measured_at: v.measured_at || fallbackDate,
      }))
      .filter((vital) =>
        Object.entries(vital).some(
          ([key, value]) => key !== "measured_at" && value !== null,
        ),
      );

    console.log("[Vitals Parser] GPT parsed vitals:", validVitals);

    return validVitals.length > 0 ? validVitals : null;
  } catch (error) {
    console.error("[Vitals Parser] Error parsing vitals with GPT:", error);
    return null;
  }
}
