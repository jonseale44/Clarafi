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
import {
  Play,
  Square,
  Activity,
  Edit2,
  Save,
  FileText,
  RefreshCw,
} from "lucide-react";

// Standardized nursing assessment prompt for consistent AI responses
const NURSING_ASSESSMENT_INSTRUCTIONS = `You are an expert registered nurse with 15+ years of clinical experience extracting structured information from patient conversations. Your documentation must meet professional nursing standards and use proper medical abbreviations and formatting.

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
- Use bullet points with hyphens (-) for each condition
- Include relationship and condition with abbreviations
- Example: "- Father: MI at age 65\n- Mother: HTN, DM2"

soHx: Social History
- Include relevant social factors affecting health
- Use bullet points for multiple items
- Example: "- Tobacco: 1 PPD x 20 years\n- Alcohol: Social use\n- Exercise: Sedentary"

psh: Past Surgical History
- List surgeries chronologically with dates/years
- Use bullet points with hyphens (-)
- Example: "- 2019: Cholecystectomy\n- 2015: Appendectomy"

ros: Review of Systems
- Organize by system with pertinent positives and negatives
- Use abbreviations and bullet points
- Example: "CV: Denies CP, palpitations\nResp: Admits to SOB on exertion\nGI: Denies N/V, abdominal pain"

vitals: Current Vital Signs
- Format as single line with standard abbreviations
- Example: "BP: 140/90 | HR: 88 | T: 98.6°F | RR: 18 | O2 Sat: 98% on RA"

Return ONLY a JSON object with these exact field names containing the extracted and properly formatted information. If a field has no information, return an empty string.

Example output format:
{
  "cc": "SOB and fatigue x 3 days",
  "hpi": "- SOB onset 3 days ago, progressive\\n- Worsens with exertion\\n- Associated with fatigue",
  "pmh": "- HTN\\n- DM2\\n- CAD",
  "meds": "- Lisinopril 10mg QD PO\\n- Metformin 1000mg BID PO",
  "allergies": "- NKDA",
  "famHx": "- Father: CAD\\n- Mother: DM2",
  "soHx": "- Tobacco: Former smoker, quit 5 years ago\\n- Alcohol: Social use",
  "psh": "- 2018: CABG",
  "ros": "CV: Admits to chest tightness\\nResp: Admits to SOB\\nGI: Denies N/V",
  "vitals": "BP: 150/95 | HR: 92 | T: 98.4°F | RR: 20 | O2 Sat: 96% on RA"
}`;

export interface NursingTemplateData {
  cc: string;
  hpi: string;
  pmh: string;
  meds: string;
  allergies: string;
  famHx: string;
  soHx: string;
  psh: string;
  ros: string;
  vitals: string;
}

interface NursingTemplateAssessmentProps {
  patientId: string;
  encounterId: string;
  isRecording?: boolean;
  transcription: string;
  onTemplateUpdate?: (data: NursingTemplateData) => void;
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
    const [isProcessing, setIsProcessing] = useState(false);
    const [editingField, setEditingField] = useState<string | null>(null);
    const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
    const [nursingSummary, setNursingSummary] = useState<string>("");
    const [isEditingSummary, setIsEditingSummary] = useState(false);

    // Format nursing summary text with proper HTML formatting
    const formatNursingSummary = (text: string): string => {
      if (!text) return "";

      return (
        text
          // Convert **text** to <strong>text</strong>
          .replace(
            /\*\*(.*?)\*\*/g,
            '<strong class="font-semibold text-gray-900">$1</strong>',
          )
          // Convert bullet points to proper list items with spacing
          .replace(/^- (.*?)$/gm, '<div class="ml-4 mb-1">• $1</div>')
          // Add spacing between sections (double line breaks)
          .replace(/\n\n/g, '<div class="mb-4"></div>')
          // Convert single line breaks to <br>
          .replace(/\n/g, "<br>")
      );
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

    const lastTranscriptionRef = useRef<string>("");
    const { toast } = useToast();

    // Expose methods to parent component
    useImperativeHandle(ref, () => ({
      startTemplateAssessment,
      stopTemplateAssessment,
      getCurrentTemplate: () => templateData,
      saveTemplate: saveTemplateData,
      generateSummary,
    }));

    // Helper to format field display values with consistent spacing
    const formatFieldForDisplay = (value: string): string => {
      if (!value.trim()) return "";
      
      // Split into lines and clean them up
      const lines = value.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      
      // Return with normal line breaks (no extra spacing)
      return lines.join('\n');
    };

    // Auto-generate summary when template has substantial content
    useEffect(() => {
      const completedFields = Object.values(templateData).filter(
        (value) => value.trim().length > 0,
      ).length;

      const shouldAutoGenerate =
        completedFields >= 5 && !nursingSummary && !isGeneratingSummary;

      if (shouldAutoGenerate) {
        console.log(
          "🏥 [NursingTemplate] Auto-generating summary (5+ fields completed)",
        );
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

    // Generate nursing template using REST API (replaces realtime WebSocket)
    const generateNursingTemplate = async (forceGeneration = false) => {
      console.log("🏥 [NursingTemplate] generateNursingTemplate called with:", {
        forceGeneration,
        transcriptionLength: transcription?.length || 0,
        transcriptionPreview: transcription?.substring(0, 100) || 'empty'
      });

      if (!transcription?.trim()) {
        console.log("🏥 [NursingTemplate] No transcription available");
        toast({
          variant: "destructive",
          title: "No Transcription",
          description: "Please record some audio first before generating template fields.",
        });
        return;
      }

      if (isProcessing && !forceGeneration) {
        console.log("🏥 [NursingTemplate] Already processing, skipping");
        return;
      }

      console.log("🏥 [NursingTemplate] Starting REST API template generation");
      setIsProcessing(true);
      
      // Only show toast for manual generation
      if (forceGeneration) {
        toast({
          title: "Generating Template",
          description: "Extracting nursing assessment data...",
        });
      }

      try {
        console.log("🏥 [NursingTemplate] Making API request with data:", {
          patientId,
          encounterId,
          transcriptionLength: transcription.trim().length,
          currentTemplateDataKeys: Object.keys(templateData)
        });

        const response = await fetch('/api/nursing-template/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            patientId,
            encounterId,
            transcription: transcription.trim(),
            currentTemplateData: templateData
          })
        });

        console.log("🏥 [NursingTemplate] Response status:", response.status);
        console.log("🏥 [NursingTemplate] Response headers:", Object.fromEntries(response.headers.entries()));

        if (!response.ok) {
          const errorText = await response.text();
          console.error("❌ [NursingTemplate] HTTP Error Response:", errorText);
          throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
        }

        const responseData = await response.json();
        console.log("🏥 [NursingTemplate] Complete response received:", responseData);
        
        if (responseData.templateData) {
          const newTemplateData = responseData.templateData;
          console.log("🏥 [NursingTemplate] Template data fields:", Object.keys(newTemplateData));
          console.log("🏥 [NursingTemplate] Template data values:", newTemplateData);
          
          // Update template fields intelligently
          updateTemplateFields(newTemplateData);
          
          if (forceGeneration) {
            toast({
              title: "Template Generated",
              description: "Nursing assessment fields updated successfully",
            });
          }
        } else {
          console.error("❌ [NursingTemplate] No templateData in response:", responseData);
          throw new Error("No template data received in response");
        }
        
      } catch (error: any) {
        console.error("❌ [NursingTemplate] Complete error details:");
        console.error("❌ [NursingTemplate] Error name:", error?.name);
        console.error("❌ [NursingTemplate] Error message:", error?.message);
        console.error("❌ [NursingTemplate] Error stack:", error?.stack);
        
        toast({
          variant: "destructive",
          title: "Generation Failed",
          description: `Failed to generate nursing template: ${error?.message || 'Unknown error'}`,
        });
      } finally {
        setIsProcessing(false);
      }
    };

    const startTemplateAssessment = () => {
      if (isActive) return;

      console.log("🏥 [NursingTemplate] Starting template assessment");
      setIsActive(true);

      toast({
        title: "Template Assessment Started",
        description: "Nursing template will update automatically during conversation",
      });
    };

    const stopTemplateAssessment = () => {
      setIsActive(false);
      console.log("🛑 [NursingTemplate] Template assessment stopped");

      toast({
        title: "Template Assessment Stopped",
        description: "Nursing template assessment has been finalized",
      });
    };

    const processTranscriptionUpdate = (newTranscription: string) => {
      console.log("📝 [NursingTemplate] Processing transcription update");
      // Use REST API to generate template updates
      generateNursingTemplate(false);
    };

    // Update template fields intelligently with new data
    const updateTemplateFields = (updates: Partial<NursingTemplateData>) => {
      console.log("📝 [NursingTemplate] Updating template fields:", updates);

      setTemplateData((prev) => {
        const updatedData = { ...prev, ...updates };
        onTemplateUpdate?.(updatedData);
        return updatedData;
      });

      toast({
        title: "Template Updated",
        description: "Nursing assessment fields have been updated",
      });
    };

    const saveTemplateData = async () => {
      try {
        const response = await fetch(`/api/encounters/${encounterId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            nurseAssessment: JSON.stringify(templateData),
          }),
        });

        if (!response.ok) throw new Error("Failed to save template");

        toast({
          title: "Template Saved",
          description: "Nursing assessment template saved successfully",
        });
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Save Failed",
          description: "Failed to save nursing template",
        });
      }
    };

    const generateSummary = async () => {
      try {
        setIsGeneratingSummary(true);

        const response = await fetch(
          `/api/encounters/${encounterId}/generate-nursing-summary`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              templateData,
              transcription,
              patientId: parseInt(patientId),
            }),
          },
        );

        if (!response.ok) {
          throw new Error(
            `Failed to generate nursing summary: ${response.status}`,
          );
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
        const response = await fetch(
          `/api/encounters/${encounterId}/nursing-summary`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ nursingSummary }),
          },
        );

        if (!response.ok) throw new Error("Failed to save summary");

        toast({
          title: "Summary Saved",
          description: "Nursing summary saved successfully",
        });
        setIsEditingSummary(false);
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Save Failed",
          description: "Failed to save nursing summary",
        });
      }
    };

    // Template field definitions
    const templateFields = [
      { key: "cc", label: "Chief Complaint", placeholder: "Primary reason for visit" },
      { key: "hpi", label: "History of Present Illness", placeholder: "Detailed symptom description", multiline: true },
      { key: "pmh", label: "Past Medical History", placeholder: "Previous medical conditions", multiline: true },
      { key: "meds", label: "Current Medications", placeholder: "List all current medications", multiline: true },
      { key: "allergies", label: "Known Allergies", placeholder: "Drug and environmental allergies" },
      { key: "famHx", label: "Family History", placeholder: "Relevant family medical history", multiline: true },
      { key: "soHx", label: "Social History", placeholder: "Tobacco, alcohol, exercise habits", multiline: true },
      { key: "psh", label: "Past Surgical History", placeholder: "Previous surgeries and dates", multiline: true },
      { key: "ros", label: "Review of Systems", placeholder: "System-by-system review", multiline: true },
      { key: "vitals", label: "Current Vital Signs", placeholder: "BP, HR, Temp, RR, O2 Sat" },
    ];

    const updateField = (key: string, value: string) => {
      setTemplateData((prev) => {
        const updated = { ...prev, [key]: value };
        onTemplateUpdate?.(updated);
        return updated;
      });
    };

    return (
      <Card className="border-blue-200 bg-blue-50">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-blue-900">
                Nursing Assessment Template
              </h3>
              {isActive && (
                <Badge variant="default" className="bg-green-500">
                  <div className="w-2 h-2 bg-white rounded-full mr-1 animate-pulse"></div>
                  Active
                </Badge>
              )}
              {isProcessing && (
                <Badge variant="outline" className="text-blue-600 border-blue-600">
                  <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                  Processing
                </Badge>
              )}
            </div>
            <div className="flex items-center space-x-2">
              {!isActive ? (
                <Button onClick={startTemplateAssessment} size="sm" variant="default">
                  <Play className="h-3 w-3 mr-1" />
                  Start Assessment
                </Button>
              ) : (
                <Button onClick={stopTemplateAssessment} size="sm" variant="outline">
                  <Square className="h-3 w-3 mr-1" />
                  Stop Assessment
                </Button>
              )}
              <Button onClick={() => generateNursingTemplate(true)} size="sm" variant="outline" disabled={isProcessing}>
                <RefreshCw className={`h-3 w-3 mr-1 ${isProcessing ? 'animate-spin' : ''}`} />
                Generate Now
              </Button>
              <Button onClick={saveTemplateData} size="sm" variant="outline">
                <Save className="h-3 w-3 mr-1" />
                Save
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            {templateFields.map(({ key, label, placeholder, multiline }) => (
              <div key={key} className="space-y-2">
                <label className="text-sm font-medium text-blue-900">
                  {label}
                </label>
                {editingField === key ? (
                  <div className="space-y-2">
                    {multiline ? (
                      <Textarea
                        value={templateData[key as keyof NursingTemplateData]}
                        onChange={(e) => updateField(key, e.target.value)}
                        className="min-h-[100px] text-sm"
                        placeholder={placeholder}
                      />
                    ) : (
                      <Input
                        value={templateData[key as keyof NursingTemplateData]}
                        onChange={(e) => updateField(key, e.target.value)}
                        className="text-sm"
                        placeholder={placeholder}
                      />
                    )}
                    <div className="flex justify-end space-x-2">
                      <Button
                        onClick={() => setEditingField(null)}
                        size="sm"
                        variant="outline"
                      >
                        Done
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="relative group">
                    <div
                      className="p-3 bg-white border rounded-md cursor-pointer hover:border-blue-300 transition-colors min-h-[40px] text-sm"
                      onClick={() => setEditingField(key)}
                    >
                      {templateData[key as keyof NursingTemplateData] ? (
                        <div className="whitespace-pre-line leading-normal">
                          {formatFieldForDisplay(templateData[key as keyof NursingTemplateData])}
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">{placeholder}</span>
                      )}
                    </div>
                    {templateData[key as keyof NursingTemplateData] && (
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                          <Edit2 className="h-3 w-3" />
                        </Button>
                      </div>
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
                  disabled={
                    isGeneratingSummary ||
                    Object.values(templateData).filter((v) => v.trim())
                      .length === 0
                  }
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
                      <Button onClick={saveSummary} size="sm" variant="default">
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
                        __html: formatNursingSummary(nursingSummary),
                      }}
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <div className="text-sm">No nursing summary generated yet</div>
                <div className="text-xs mt-1">
                  Complete template fields to automatically generate summary
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>
    );
  },
);

NursingTemplateAssessment.displayName = "NursingTemplateAssessment";