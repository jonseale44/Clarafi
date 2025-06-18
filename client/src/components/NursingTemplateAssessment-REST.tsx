import { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, FileText, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Same interfaces as the original component
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
>(({ patientId, encounterId, isRecording, transcription, onTemplateUpdate, autoStart }, ref) => {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
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

  // Generate template using REST API
  const generateTemplate = useCallback(async () => {
    if (!transcription.trim() || isGenerating) return;

    setIsGenerating(true);
    console.log("🏥 [NursingTemplateREST] Starting generation with REST API");

    try {
      const response = await fetch("/api/nursing-template/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          patientId,
          encounterId,
          transcription,
          currentTemplateData: templateData,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("✅ [NursingTemplateREST] Generation successful:", data);

      if (data.templateData) {
        const newTemplateData = { ...templateData, ...data.templateData };
        setTemplateData(newTemplateData);
        onTemplateUpdate?.(newTemplateData);

        toast({
          title: "Template Updated",
          description: "Nursing template has been updated with new information.",
        });
      }
    } catch (error: any) {
      console.error("❌ [NursingTemplateREST] Generation failed:", error);
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate nursing template",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  }, [patientId, encounterId, transcription, templateData, onTemplateUpdate, isGenerating, toast]);

  // Auto-generate when transcription changes and auto-start is enabled
  useEffect(() => {
    if (autoStart && transcription.trim() && !isGenerating) {
      const timeoutId = setTimeout(() => {
        generateTemplate();
      }, 1000); // Debounce by 1 second
      
      return () => clearTimeout(timeoutId);
    }
  }, [transcription, autoStart, generateTemplate, isGenerating]);

  // Update template field
  const updateField = (field: keyof NursingTemplateData, value: string) => {
    const newTemplateData = { ...templateData, [field]: value };
    setTemplateData(newTemplateData);
    onTemplateUpdate?.(newTemplateData);
  };

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    startTemplateAssessment: () => {
      generateTemplate();
    },
    stopTemplateAssessment: () => {
      // No-op for REST API (no continuous connection to stop)
    },
    getCurrentTemplate: () => templateData,
    saveTemplate: () => {
      // Could implement saving to database here if needed
      console.log("Saving template:", templateData);
    },
    generateSummary: () => {
      generateTemplate();
    },
  }));

  const templateFields = [
    { key: "cc" as keyof NursingTemplateData, label: "Chief Complaint", placeholder: "Main reason for visit..." },
    { key: "hpi" as keyof NursingTemplateData, label: "History of Present Illness", placeholder: "Current symptoms and timeline..." },
    { key: "pmh" as keyof NursingTemplateData, label: "Past Medical History", placeholder: "Previous medical conditions..." },
    { key: "meds" as keyof NursingTemplateData, label: "Medications", placeholder: "Current medications and dosages..." },
    { key: "allergies" as keyof NursingTemplateData, label: "Allergies", placeholder: "Known allergies and reactions..." },
    { key: "famHx" as keyof NursingTemplateData, label: "Family History", placeholder: "Relevant family medical history..." },
    { key: "soHx" as keyof NursingTemplateData, label: "Social History", placeholder: "Lifestyle factors, habits..." },
    { key: "psh" as keyof NursingTemplateData, label: "Past Surgical History", placeholder: "Previous surgeries and procedures..." },
    { key: "ros" as keyof NursingTemplateData, label: "Review of Systems", placeholder: "Systematic review of body systems..." },
    { key: "vitals" as keyof NursingTemplateData, label: "Vital Signs", placeholder: "Current vital signs and measurements..." },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg font-medium">Nursing Template Assessment</CardTitle>
          <div className="flex items-center space-x-2">
            {isRecording && (
              <Badge variant="destructive" className="animate-pulse">
                Recording
              </Badge>
            )}
            {isGenerating && (
              <Badge variant="secondary">
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                Generating
              </Badge>
            )}
            <Button
              onClick={generateTemplate}
              disabled={isGenerating || !transcription.trim()}
              size="sm"
              variant="outline"
            >
              {isGenerating ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Generate Template
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {templateFields.map(({ key, label, placeholder }) => (
              <div key={key} className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {label}
                </label>
                <Textarea
                  placeholder={placeholder}
                  value={templateData[key]}
                  onChange={(e) => updateField(key, e.target.value)}
                  className="min-h-[100px] resize-y"
                />
              </div>
            ))}
          </div>
          
          {transcription && (
            <div className="mt-6 pt-4 border-t">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Current Transcription
              </label>
              <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-md max-h-32 overflow-y-auto">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {transcription}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
});

NursingTemplateAssessment.displayName = "NursingTemplateAssessment";