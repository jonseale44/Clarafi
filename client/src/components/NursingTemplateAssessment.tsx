import {
  useState,
  useRef,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Play, Square, Activity, Edit2, Save, FileText, RefreshCw } from "lucide-react";

interface NursingTemplateData {
  cc: string; // Chief Complaint
  hpi: string; // History of Present Illness
  pmh: string; // Past Medical History
  meds: string; // Medications
  allergies: string; // Allergies
  famHx: string; // Family History
  soHx: string; // Social History
  psh: string; // Past Surgical History
  ros: string; // Review of Systems
  vitals: string; // Vital Signs
}

interface NursingTemplateAssessmentProps {
  patientId: string;
  encounterId: string;
  isRecording: boolean;
  transcription: string;
  onTemplateUpdate: (template: NursingTemplateData) => void;
  autoStart?: boolean;
}

export interface NursingTemplateRef {
  startTemplateAssessment: () => void;
  stopTemplateAssessment: () => void;
  getCurrentTemplate: () => NursingTemplateData;
  saveTemplate: () => void;
  generateSummary: () => void;
}

export const NursingTemplateAssessment = forwardRef<
  NursingTemplateRef,
  NursingTemplateAssessmentProps
>(
  (
    {
      patientId,
      encounterId,
      isRecording,
      transcription,
      onTemplateUpdate,
      autoStart = false,
    },
    ref,
  ) => {
    const [isActive, setIsActive] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [editingField, setEditingField] = useState<string | null>(null);
    const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
    const [nursingSummary, setNursingSummary] = useState<string>("");
    const [isEditingSummary, setIsEditingSummary] = useState(false);

    // Format nursing summary text with proper HTML formatting
    const formatNursingSummary = (text: string): string => {
      if (!text) return '';
      
      return text
        // Convert **text** to <strong>text</strong>
        .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>')
        // Convert bullet points to proper list items with spacing
        .replace(/^- (.*?)$/gm, '<div class="ml-4 mb-1">• $1</div>')
        // Add spacing between sections (double line breaks)
        .replace(/\n\n/g, '<div class="mb-4"></div>')
        // Convert single line breaks to <br>
        .replace(/\n/g, '<br>');
    };

    const [templateData, setTemplateData] = useState<NursingTemplateData>({
      cc: "",
      hpi: "",
      pmh: "",
      meds: "",
      allergies: "",
      famHx: "",
      soHx: "",
      psh: "",
      ros: "",
      vitals: "",
    });

    const wsRef = useRef<WebSocket | null>(null);
    const sessionIdRef = useRef<string>(
      `nursing_template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    );
    const lastTranscriptionRef = useRef("");
    const { toast } = useToast();

    // Expose methods to parent component
    useImperativeHandle(ref, () => ({
      startTemplateAssessment,
      stopTemplateAssessment,
      getCurrentTemplate: () => templateData,
      saveTemplate,
      generateSummary,
    }));

    // Auto-start when recording begins
    useEffect(() => {
      if (autoStart && isRecording && !isActive) {
        startTemplateAssessment();
      } else if (!isRecording && isActive) {
        stopTemplateAssessment();
      }
    }, [isRecording, autoStart]);

    // Load existing nursing summary on component mount
    useEffect(() => {
      const loadExistingSummary = async () => {
        try {
          const response = await fetch(`/api/encounters/${encounterId}/nursing-summary`, {
            credentials: "include",
          });
          if (response.ok) {
            const data = await response.json();
            if (data.data?.nursingSummary) {
              setNursingSummary(data.data.nursingSummary);
            }
          }
        } catch (error) {
          console.error("❌ [NursingTemplate] Error loading existing summary:", error);
        }
      };

      if (encounterId) {
        loadExistingSummary();
      }
    }, [encounterId]);

    // Auto-generate summary when template is sufficiently complete
    useEffect(() => {
      const completedFields = Object.values(templateData).filter(v => v.trim()).length;
      const shouldAutoGenerate = completedFields >= 5 && !nursingSummary && !isGeneratingSummary;
      
      if (shouldAutoGenerate) {
        console.log("🏥 [NursingTemplate] Auto-generating summary (5+ fields completed)");
        generateSummary();
      }
    }, [templateData, nursingSummary, isGeneratingSummary]);

    // Process new transcription when it changes
    useEffect(() => {
      if (
        isActive &&
        transcription !== lastTranscriptionRef.current &&
        transcription.trim()
      ) {
        processTranscriptionUpdate(transcription);
        lastTranscriptionRef.current = transcription;
      }
    }, [transcription, isActive]);

    const startTemplateAssessment = async () => {
      if (isActive) return;

      console.log(
        `🏥 [NursingTemplate] Starting template assessment for session ${sessionIdRef.current}`,
      );

      try {
        // Get API key from environment
        const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
        if (!apiKey) {
          throw new Error("OpenAI API key not configured");
        }

        // Step 1: Create session like working implementation
        console.log("🔧 [NursingTemplate] Creating OpenAI session...");
        const sessionConfig = {
          model: "gpt-4o-mini-realtime-preview",
          modalities: ["text"],
          instructions: `You are an expert registered nurse with 15+ years of clinical experience extracting structured information from patient conversations. Your documentation must meet professional nursing standards, EMR requirements, and use proper medical abbreviations and formatting.

CRITICAL DOCUMENTATION STANDARDS:
1. Use standard medical abbreviations consistently
2. Format ALL content with bullet points using hyphens (-)
3. Capitalize appropriately and use proper medical terminology
4. Include specific, measurable observations
5. Follow evidence-based nursing practice guidelines
6. Only document information explicitly mentioned in conversation

MANDATORY MEDICAL ABBREVIATIONS TO USE:
- Hypertension → HTN
- Diabetes Type 2 → DM2, Diabetes Type 1 → DM1
- Coronary Artery Disease → CAD
- Congestive Heart Failure → CHF
- Chronic Obstructive Pulmonary Disease → COPD
- Gastroesophageal Reflux Disease → GERD
- Chronic Kidney Disease → CKD
- Atrial Fibrillation → AFib
- Myocardial Infarction → MI
- Cerebrovascular Accident → CVA
- Deep Vein Thrombosis → DVT
- Pulmonary Embolism → PE
- Hyperlipidemia → HLD
- Hypothyroidism → Hypothyroid
- Osteoarthritis → OA
- Rheumatoid Arthritis → RA
- Urinary Tract Infection → UTI
- Upper Respiratory Infection → URI
- Benign Prostatic Hyperplasia → BPH
- Activities of Daily Living → ADLs
- Range of Motion → ROM
- Shortness of Breath → SOB
- Chest Pain → CP
- Nausea and Vomiting → N/V
- Blood Pressure → BP
- Heart Rate → HR
- Respiratory Rate → RR
- Temperature → T
- Oxygen Saturation → O2 Sat
- Room Air → RA
- Normal Saline → NS
- Intravenous → IV
- Per Oral → PO
- Twice Daily → BID
- Once Daily → QD
- As Needed → PRN
- Nothing by Mouth → NPO
- Fall Risk → High/Moderate/Low Risk
- Skin Integrity → Intact/Compromised

TEMPLATE FIELDS FORMATTING REQUIREMENTS:

cc: Chief Complaint
- Brief, clear statement using proper medical terminology
- Example: "CP rated 7/10, substernal"

hpi: History of Present Illness  
- Use bullet points with hyphens (-) for each symptom/timeline element
- Include duration, quality, severity, aggravating/alleviating factors
- Maintain chronological order
- Example: "- CP onset 2 hours ago, crushing quality\\n- Radiates to left arm\\n- Relieved partially with rest"

pmh: Past Medical History
- Convert ALL conditions to standard abbreviations
- Use bullet points with hyphens (-) for each condition
- Include relevant dates if available
- Example: "- HTN\\n- DM2\\n- CAD\\n- GERD"

meds: Current Medications
- Use generic names with proper capitalization (Lisinopril not lisinopril)
- Include strength, frequency, and route using standard abbreviations
- Format: "- Medication name [strength] [frequency] [route]"
- Example: "- Lisinopril 10mg QD PO\\n- Metformin 1000mg BID PO\\n- Atorvastatin 40mg QHS PO"

allergies: Known Allergies
- Use "NKDA" if no known allergies
- Format as "- Allergen: Reaction type"
- Example: "- Penicillin: Rash\\n- Shellfish: Anaphylaxis" or "- NKDA"

famHx: Family History
- Use standard abbreviations for conditions
- Format as "- Relationship: Conditions"
- Example: "- Father: HTN, DM2\\n- Mother: Breast CA, HTN"

soHx: Social History
- Use bullet points for each social factor
- Include specific quantities when mentioned
- Example: "- Tobacco: 20 pack-year history\\n- Alcohol: 2-3 drinks weekly\\n- Occupation: Teacher"

psh: Past Surgical History
- Include year if mentioned
- Use bullet points
- Include complications if noted
- Example: "- 2018 Cholecystectomy\\n- 2020 Appendectomy"

ros: Review of Systems
- Only include positive findings
- Use standard abbreviations and bullet points
- Organize by body system
- Example: "- Constitutional: Fatigue, weight loss\\n- CV: CP, palpitations\\n- Respiratory: SOB on exertion"

vitals: Vital Signs
- Use standard format and abbreviations
- Include trending information if available
- Example: "- BP: 140/90 mmHg\\n- HR: 88 BPM\\n- RR: 20/min\\n- T: 98.6°F\\n- O2 Sat: 96% on RA\\n- Pain: 7/10"

RESPONSE FORMAT EXAMPLES:

For Past Medical History:
{"pmh": "- HTN\\n- DM2\\n- CAD"}

For Current Medications:
{"meds": "- Lisinopril 10mg QD PO\\n- Metformin 1000mg BID PO"}

For Vital Signs:
{"vitals": "- BP: 140/90 mmHg\\n- HR: 88 BPM\\n- T: 98.6°F"}

For Family History:
{"famHx": "- Father: HTN, DM2\\n- Mother: Breast CA"}

CRITICAL RULES:
1. Transform ALL long-form medical conditions to standard abbreviations
2. Use bullet points with hyphens (-) for multi-item fields
3. Only include fields with new information in your JSON response
4. Never add information not explicitly mentioned in conversation
5. Use professional nursing terminology consistently
6. Include specific measurements when provided
7. Format medications with complete dosing information
8. Maintain professional nursing documentation standards

Return only valid JSON with fields containing new information. Do not include empty fields or fields without updates.`,
          input_audio_format: "pcm16",
          input_audio_transcription: {
            model: "whisper-1",
            language: "en",
          },
          turn_detection: {
            type: "server_vad",
            threshold: 0.3,
            prefix_padding_ms: 300,
            silence_duration_ms: 200,
            create_response: true,
          },
        };

        const sessionResponse = await fetch(
          "https://api.openai.com/v1/realtime/sessions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
              "OpenAI-Beta": "realtime=v1",
            },
            body: JSON.stringify(sessionConfig),
          },
        );

        if (!sessionResponse.ok) {
          const error = await sessionResponse.json();
          console.log("❌ [NursingTemplate] Session creation failed:", error);
          throw new Error(
            `Failed to create session: ${error.message || "Unknown error"}`,
          );
        }

        const session = await sessionResponse.json();
        console.log("✅ [NursingTemplate] Session created:", session.id);

        // Step 2: Connect via WebSocket with proper protocols
        const protocols = [
          "realtime",
          `openai-insecure-api-key.${apiKey}`,
          "openai-beta.realtime-v1",
        ];

        const params = new URLSearchParams({
          model: "gpt-4o-mini-realtime-preview",
        });

        const ws = new WebSocket(
          `wss://api.openai.com/v1/realtime?${params.toString()}`,
          protocols,
        );

        wsRef.current = ws;

        ws.onopen = () => {
          console.log("🌐 [NursingTemplate] Connected to OpenAI Realtime API");
          setIsConnected(true);
          setIsActive(true);

          // Configure session for nursing template extraction like working implementation
          const sessionUpdateMessage = {
            type: "session.update",
            session: {
              instructions: `You are an expert registered nurse with 15+ years of clinical experience extracting structured information from patient conversations. Your documentation must meet professional nursing standards and use proper medical abbreviations and formatting.

CRITICAL DOCUMENTATION STANDARDS:
1. Use standard medical abbreviations consistently
2. Format medical histories with bullet points using hyphens (-)
3. Convert long-form medical conditions to proper abbreviations
4. Use professional nursing terminology throughout
5. Include specific measurements and observations
6. Only document information explicitly mentioned in conversation

MANDATORY MEDICAL ABBREVIATIONS TO USE:
- Hypertension → HTN
- Diabetes Type 2 → DM2, Diabetes Type 1 → DM1
- Coronary Artery Disease → CAD
- Congestive Heart Failure → CHF
- Chronic Obstructive Pulmonary Disease → COPD
- Gastroesophageal Reflux Disease → GERD
- Chronic Kidney Disease → CKD
- Atrial Fibrillation → AFib
- Myocardial Infarction → MI
- Cerebrovascular Accident → CVA
- Deep Vein Thrombosis → DVT
- Pulmonary Embolism → PE
- Hyperlipidemia → HLD
- Hypothyroidism → Hypothyroid
- Osteoarthritis → OA
- Rheumatoid Arthritis → RA
- Urinary Tract Infection → UTI
- Upper Respiratory Infection → URI
- Benign Prostatic Hyperplasia → BPH
- Activities of Daily Living → ADLs
- Range of Motion → ROM
- Shortness of Breath → SOB
- Chest Pain → CP
- Nausea and Vomiting → N/V
- Blood Pressure → BP
- Heart Rate → HR
- Respiratory Rate → RR
- Temperature → T
- Oxygen Saturation → O2 Sat
- Room Air → RA
- Pain Scale → 0-10 scale
- Twice Daily → BID
- Once Daily → QD
- As Needed → PRN
- By Mouth → PO
- Intravenous → IV

TEMPLATE FIELDS FORMATTING REQUIREMENTS:

cc: Chief Complaint
- Brief, clear statement using proper medical terminology
- Example: "CP rated 7/10, substernal"

hpi: History of Present Illness  
- Use bullet points with hyphens (-) for each symptom/timeline element
- Include duration, quality, severity, aggravating/alleviating factors
- Example: "- CP onset 2 hours ago, crushing quality\n- Radiates to left arm\n- Relieved partially with rest"

pmh: Past Medical History
- Convert ALL conditions to standard abbreviations
- Use bullet points with hyphens (-) for each condition
- Example: "- HTN\n- DM2\n- CAD\n- GERD"

meds: Current Medications
- Use generic names with proper capitalization
- Include strength, frequency, and route
- Use standard abbreviations for dosing
- Example: "- Lisinopril 10mg QD PO\n- Metformin 1000mg BID PO\n- Atorvastatin 40mg QHS PO"

allergies: Known Allergies
- Use "NKDA" if no known allergies
- Format as "Allergen: Reaction type"
- Example: "- Penicillin: Rash\n- Shellfish: Anaphylaxis" or "- NKDA"

famHx: Family History
- Use standard abbreviations for conditions
- Format as "Relationship: Conditions"
- Example: "- Father: HTN, DM2\n- Mother: Breast CA, HTN"

soHx: Social History
- Use bullet points for each social factor
- Include specific quantities when mentioned
- Example: "- Tobacco: 20 pack-year history\n- Alcohol: 2-3 drinks weekly\n- Occupation: Teacher"

psh: Past Surgical History
- Include year if mentioned
- Use bullet points
- Example: "- 2018 Cholecystectomy\n- 2020 Appendectomy"

ros: Review of Systems
- Only include positive findings
- Use standard abbreviations and bullet points
- Organize by body system
- Example: "- Constitutional: Fatigue, weight loss\n- CV: CP, palpitations\n- Respiratory: SOB on exertion"

vitals: Vital Signs
- Use standard format and abbreviations
- Example: "- BP: 140/90 mmHg\n- HR: 88 BPM\n- RR: 20/min\n- T: 98.6°F\n- O2 Sat: 96% on RA\n- Pain: 7/10"

RESPONSE FORMAT EXAMPLES:

For Past Medical History:
{"pmh": "- HTN\n- DM2\n- CAD"}

For Current Medications:
{"meds": "- Lisinopril 10mg QD PO\n- Metformin 1000mg BID PO"}

For Vital Signs:
{"vitals": "- BP: 140/90 mmHg\n- HR: 88 BPM\n- T: 98.6°F"}

CRITICAL RULES:
1. Transform ALL long-form medical conditions to standard abbreviations
2. Use bullet points with hyphens (-) for multi-item fields
3. Only include fields with new information in your JSON response
4. Never add information not explicitly mentioned in conversation
5. Use professional nursing terminology consistently
6. Include specific measurements when provided
7. Format medications with complete dosing information

Return only valid JSON with fields containing new information. Do not include empty fields or fields without updates.`,
              modalities: ["text"],
              input_audio_format: "pcm16",
              input_audio_transcription: {
                model: "whisper-1",
                language: "en",
              },
              turn_detection: {
                type: "server_vad",
                threshold: 0.3,
                prefix_padding_ms: 300,
                silence_duration_ms: 200,
                create_response: true,
              },
            },
          };

          ws.send(JSON.stringify(sessionUpdateMessage));

          toast({
            title: "Template Assessment Started",
            description:
              "Nursing template will update automatically during conversation",
          });
        };

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            handleRealtimeMessage(message);
          } catch (error) {
            console.error(
              "❌ [NursingTemplate] Error parsing WebSocket message:",
              error,
            );
          }
        };

        ws.onerror = (error) => {
          console.error("❌ [NursingTemplate] WebSocket error:", error);
          setIsConnected(false);
          toast({
            variant: "destructive",
            title: "Connection Error",
            description: "Failed to connect to template assessment service",
          });
        };

        ws.onclose = (event) => {
          console.log(
            "🔌 [NursingTemplate] WebSocket closed:",
            event.code,
            event.reason,
          );
          setIsActive(false);
          setIsConnected(false);
        };
      } catch (error) {
        console.error(
          "❌ [NursingTemplate] Error starting template assessment:",
          error,
        );
        setIsActive(false);
        setIsConnected(false);

        toast({
          variant: "destructive",
          title: "Assessment Failed",
          description: "Failed to start template assessment",
        });
      }
    };

    const stopTemplateAssessment = () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }

      setIsActive(false);
      setIsConnected(false);

      console.log(
        `🛑 [NursingTemplate] Template assessment stopped for session ${sessionIdRef.current}`,
      );

      toast({
        title: "Template Assessment Stopped",
        description: "Nursing template assessment has been finalized",
      });
    };

    const processTranscriptionUpdate = (newTranscription: string) => {
      if (!wsRef.current || !isConnected) return;

      console.log(`📝 [NursingTemplate] Processing transcription update`);

      // Send transcription to OpenAI for field extraction using correct format
      const contextMessage = {
        type: "conversation.item.create",
        item: {
          type: "message",
          role: "user",
          content: [
            {
              type: "input_text",
              text: `Extract nursing assessment information from this conversation transcript. Only include fields with new information:\n\n${newTranscription}`,
            },
          ],
        },
      };

      wsRef.current.send(JSON.stringify(contextMessage));

      const responseRequest = {
        type: "response.create",
        response: {
          modalities: ["text"],
          instructions: `Extract nursing assessment data from the conversation and return as JSON with only populated fields. Use this exact format:
{"cc": "value", "hpi": "value", "pmh": "value", "meds": "value", "allergies": "value", "famHx": "value", "soHx": "value", "psh": "value", "ros": "value", "vitals": "value"}

Only include fields that have information mentioned in the conversation.`,
        },
      };

      wsRef.current.send(JSON.stringify(responseRequest));
    };

    const handleRealtimeMessage = (message: any) => {
      console.log(`📨 [NursingTemplate] OpenAI message type: ${message.type}`);

      switch (message.type) {
        case "session.created":
          console.log("✅ [NursingTemplate] Session created successfully");
          break;

        case "session.updated":
          console.log("✅ [NursingTemplate] Session updated successfully");
          break;

        case "response.audio_transcript.delta":
        case "conversation.item.input_audio_transcription.delta":
          // Handle transcription deltas - not needed for template extraction
          break;

        case "response.text.delta":
          // Accumulate text deltas for complete response
          const deltaContent = message.delta || message.text || "";
          if (deltaContent) {
            console.log(
              "📝 [NursingTemplate] Text delta:",
              deltaContent.substring(0, 50),
            );
          }
          break;

        case "response.text.done":
          try {
            const content = message.text || "";
            console.log(
              "📝 [NursingTemplate] Complete response received:",
              content,
            );

            // Try to parse as JSON and update template fields
            if (content.trim()) {
              // Clean up the response to extract JSON
              const jsonMatch = content.match(/\{[^}]*\}/);
              if (jsonMatch) {
                const updates = JSON.parse(jsonMatch[0]);
                console.log("📝 [NursingTemplate] Parsed updates:", updates);
                updateTemplateFields(updates);
              } else {
                console.log("📝 [NursingTemplate] No JSON found in response");
              }
            }
          } catch (error) {
            console.error(
              "❌ [NursingTemplate] Error parsing template updates:",
              error,
            );
          }
          break;

        case "conversation.item.input_audio_transcription.completed":
          const finalTranscript = message.transcript || "";
          console.log(
            "✅ [NursingTemplate] Transcription completed:",
            finalTranscript,
          );

          // Process the complete transcription for template extraction
          if (finalTranscript.trim() && wsRef.current) {
            processTranscriptionForTemplate(finalTranscript);
          }
          break;

        case "error":
          console.error("❌ [NursingTemplate] OpenAI error:", message);
          toast({
            variant: "destructive",
            title: "AI Processing Error",
            description: message.error?.message || "Unknown error occurred",
          });
          break;

        default:
          console.log(
            `📊 [NursingTemplate] Unhandled message type: ${message.type}`,
          );
      }
    };

    const processTranscriptionForTemplate = (transcriptText: string) => {
      if (!wsRef.current || !isConnected) return;

      console.log(
        `🔍 [NursingTemplate] Processing transcript for template extraction`,
      );

      // Create a conversation item with the transcription
      const contextMessage = {
        type: "conversation.item.create",
        item: {
          type: "message",
          role: "user",
          content: [
            {
              type: "input_text",
              text: `Extract nursing assessment information from this conversation transcript. Only include fields with new information. Return as JSON:

${transcriptText}`,
            },
          ],
        },
      };

      wsRef.current.send(JSON.stringify(contextMessage));

      // Request a response
      const responseRequest = {
        type: "response.create",
        response: {
          modalities: ["text"],
          instructions: `Extract nursing assessment data from the conversation and return as JSON with only populated fields. Use this exact format:
{"cc": "value", "hpi": "value", "pmh": "value", "meds": "value", "allergies": "value", "famHx": "value", "soHx": "value", "psh": "value", "ros": "value", "vitals": "value"}

Only include fields that have information mentioned in the conversation.`,
        },
      };

      wsRef.current.send(JSON.stringify(responseRequest));
    };

    const updateTemplateFields = (updates: Partial<NursingTemplateData>) => {
      setTemplateData((prev) => {
        const newData = { ...prev, ...updates };
        onTemplateUpdate(newData);
        return newData;
      });

      // Show which fields were updated
      const updatedFields = Object.keys(updates);
      if (updatedFields.length > 0) {
        toast({
          title: "Template Updated",
          description: `Updated: ${updatedFields.join(", ")}`,
        });
      }
    };

    const handleFieldEdit = (
      field: keyof NursingTemplateData,
      value: string,
    ) => {
      setTemplateData((prev) => {
        const newData = { ...prev, [field]: value };
        onTemplateUpdate(newData);
        return newData;
      });
    };

    const saveTemplate = async () => {
      try {
        const response = await fetch(`/api/encounters/${encounterId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nurseAssessment: JSON.stringify(templateData, null, 2),
          }),
        });

        if (!response.ok) throw new Error("Failed to save template");

        toast({
          title: "Template Saved",
          description: "Nursing assessment template saved successfully",
        });
      } catch (error) {
        console.error("❌ [NursingTemplate] Error saving template:", error);
        toast({
          variant: "destructive",
          title: "Save Failed",
          description: "Failed to save nursing template",
        });
      }
    };

    const generateSummary = async () => {
      setIsGeneratingSummary(true);
      try {
        console.log("🏥 [NursingTemplate] Generating nursing summary...");
        
        const response = await fetch(`/api/encounters/${encounterId}/generate-nursing-summary`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            templateData,
            transcription,
            patientId: parseInt(patientId),
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to generate nursing summary: ${response.status}`);
        }

        const data = await response.json();
        setNursingSummary(data.data.nursingSummary);
        
        toast({
          title: "Summary Generated",
          description: "Nursing summary has been created and saved",
        });

        console.log("✅ [NursingTemplate] Summary generated successfully");
      } catch (error) {
        console.error("❌ [NursingTemplate] Error generating summary:", error);
        toast({
          variant: "destructive",
          title: "Generation Failed",
          description: "Failed to generate nursing summary",
        });
      } finally {
        setIsGeneratingSummary(false);
      }
    };

    const saveSummary = async () => {
      try {
        const response = await fetch(`/api/encounters/${encounterId}/nursing-summary`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ nursingSummary }),
        });

        if (!response.ok) {
          throw new Error("Failed to save nursing summary");
        }

        toast({
          title: "Summary Saved",
          description: "Nursing summary updated successfully",
        });
        setIsEditingSummary(false);
      } catch (error) {
        console.error("❌ [NursingTemplate] Error saving summary:", error);
        toast({
          variant: "destructive",
          title: "Save Failed",
          description: "Failed to save nursing summary",
        });
      }
    };

    const fieldLabels = {
      cc: "Chief Complaint",
      hpi: "History of Present Illness",
      pmh: "Past Medical History",
      meds: "Medications",
      allergies: "Allergies",
      famHx: "Family History",
      soHx: "Social History",
      psh: "Past Surgical History",
      ros: "Review of Systems",
      vitals: "Vital Signs",
    };

    return (
      <Card className="p-6 border-blue-200 bg-blue-50">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Activity className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold text-blue-900">
              Nursing Assessment Template
            </h3>
          </div>
          <div className="flex items-center space-x-2">
            {isConnected && (
              <Badge
                variant="outline"
                className="text-green-600 border-green-600"
              >
                <div className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse"></div>
                Live
              </Badge>
            )}
            <Button
              onClick={
                isActive ? stopTemplateAssessment : startTemplateAssessment
              }
              size="sm"
              variant={isActive ? "destructive" : "default"}
              className="h-8"
            >
              {isActive ? (
                <>
                  <Square className="h-3 w-3 mr-1" />
                  Stop
                </>
              ) : (
                <>
                  <Play className="h-3 w-3 mr-1" />
                  Start
                </>
              )}
            </Button>
            <Button
              onClick={saveTemplate}
              size="sm"
              variant="outline"
              className="h-8"
            >
              <Save className="h-3 w-3 mr-1" />
              Save
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="text-xs text-blue-600 p-2 bg-blue-100 rounded">
            Template fields will be automatically filled as information is
            discussed during the patient encounter.
          </div>

          <div className="grid grid-cols-1 gap-4">
            {Object.entries(fieldLabels).map(([field, label]) => (
              <div key={field} className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">
                    {label}:
                  </label>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0"
                    onClick={() =>
                      setEditingField(editingField === field ? null : field)
                    }
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                </div>

                {editingField === field ? (
                  <Textarea
                    value={templateData[field as keyof NursingTemplateData]}
                    onChange={(e) =>
                      handleFieldEdit(
                        field as keyof NursingTemplateData,
                        e.target.value,
                      )
                    }
                    onBlur={() => setEditingField(null)}
                    className="min-h-[60px] text-sm"
                    placeholder={`Enter ${label.toLowerCase()}...`}
                    autoFocus
                  />
                ) : (
                  <div
                    className="min-h-[60px] p-3 bg-white border rounded-md text-sm cursor-pointer hover:bg-gray-50"
                    onClick={() => setEditingField(field)}
                  >
                    {templateData[field as keyof NursingTemplateData] || (
                      <span className="text-gray-400 italic">
                        {`${label} will be filled automatically...`}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          <Separator />

          {/* Nursing Summary Section */}
          <div className="space-y-4 mt-6">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-blue-900">Nursing Summary</h4>
              <div className="flex items-center space-x-2">
                <Button
                  onClick={generateSummary}
                  size="sm"
                  variant="default"
                  disabled={isGeneratingSummary || Object.values(templateData).filter(v => v.trim()).length === 0}
                  className="h-8"
                >
                  {isGeneratingSummary ? (
                    <>
                      <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <FileText className="h-3 w-3 mr-1" />
                      Generate Summary
                    </>
                  )}
                </Button>
                {nursingSummary && (
                  <Button
                    onClick={() => setIsEditingSummary(!isEditingSummary)}
                    size="sm"
                    variant="outline"
                    className="h-8"
                  >
                    <Edit2 className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                )}
              </div>
            </div>

            {nursingSummary ? (
              <div className="space-y-2">
                {isEditingSummary ? (
                  <div className="space-y-2">
                    <Textarea
                      value={nursingSummary}
                      onChange={(e) => setNursingSummary(e.target.value)}
                      className="min-h-[200px] text-sm font-mono"
                      placeholder="Edit nursing summary..."
                    />
                    <div className="flex justify-end space-x-2">
                      <Button
                        onClick={() => setIsEditingSummary(false)}
                        size="sm"
                        variant="outline"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={saveSummary}
                        size="sm"
                        variant="default"
                      >
                        <Save className="h-3 w-3 mr-1" />
                        Save Changes
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-white border rounded-md">
                    <div 
                      className="text-sm text-gray-800 font-sans leading-relaxed"
                      dangerouslySetInnerHTML={{ 
                        __html: formatNursingSummary(nursingSummary) 
                      }}
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 bg-gray-50 border rounded-md text-center">
                <p className="text-sm text-gray-600">
                  Complete template fields and click "Generate Summary" to create a structured nursing assessment summary
                </p>
              </div>
            )}
          </div>

          <Separator />

          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>
              Status:{" "}
              {isActive
                ? isConnected
                  ? "Active"
                  : "Connecting..."
                : "Inactive"}
            </span>
            <span>
              {Object.values(templateData).filter((v) => v.trim()).length}/10
              fields completed
            </span>
          </div>
        </div>
      </Card>
    );
  },
);

NursingTemplateAssessment.displayName = "NursingTemplateAssessment";
