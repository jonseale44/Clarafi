import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Activity, CheckCircle, Clock } from "lucide-react";

interface TemplateNursingAssessmentProps {
  patientId: string;
  encounterId: string;
  isRecording: boolean;
  transcription: string;
  onTemplateUpdate: (template: NursingTemplate) => void;
}

export interface TemplateNursingRef {
  getTemplate: () => NursingTemplate;
  resetTemplate: () => void;
}

interface NursingTemplate {
  cc: string;           // Chief Complaint
  hpi: string;          // History of Present Illness
  pmh: string;          // Past Medical History
  meds: string;         // Medications
  allergies: string;    // Allergies
  famHx: string;        // Family History
  soHx: string;         // Social History
  psh: string;          // Past Surgical History
  ros: string;          // Review of Systems
  vitals: string;       // Vital Signs
  lastUpdate: Date | null;
}

const TEMPLATE_FIELDS = [
  { key: 'cc', label: 'CC:', description: 'Chief Complaint' },
  { key: 'hpi', label: 'HPI:', description: 'History of Present Illness' },
  { key: 'pmh', label: 'PMH:', description: 'Past Medical History' },
  { key: 'meds', label: 'Meds:', description: 'Current Medications' },
  { key: 'allergies', label: 'Allergies:', description: 'Known Allergies' },
  { key: 'famHx', label: 'FamHx:', description: 'Family History' },
  { key: 'soHx', label: 'SoHx:', description: 'Social History' },
  { key: 'psh', label: 'PSH:', description: 'Past Surgical History' },
  { key: 'ros', label: 'ROS:', description: 'Review of Systems' },
  { key: 'vitals', label: 'Vitals:', description: 'Vital Signs' },
];

export const TemplateNursingAssessment = forwardRef<TemplateNursingRef, TemplateNursingAssessmentProps>(({
  patientId,
  encounterId,
  isRecording,
  transcription,
  onTemplateUpdate
}, ref) => {
  const [template, setTemplate] = useState<NursingTemplate>({
    cc: '',
    hpi: '',
    pmh: '',
    meds: '',
    allergies: '',
    famHx: '',
    soHx: '',
    psh: '',
    ros: '',
    vitals: '',
    lastUpdate: null,
  });

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [completedFields, setCompletedFields] = useState<Set<string>>(new Set());
  const lastTranscriptionRef = useRef("");
  const analysisTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    getTemplate: () => template,
    resetTemplate: () => {
      setTemplate({
        cc: '',
        hpi: '',
        pmh: '',
        meds: '',
        allergies: '',
        famHx: '',
        soHx: '',
        psh: '',
        ros: '',
        vitals: '',
        lastUpdate: null,
      });
      setCompletedFields(new Set());
    },
  }));

  // Analyze transcription for template updates
  useEffect(() => {
    if (!isRecording || !transcription || transcription === lastTranscriptionRef.current) {
      return;
    }

    // Debounce analysis - only analyze after transcription stops changing for 8 seconds
    // AND only if there's substantial new content (50+ characters)
    const newContentLength = transcription.length - lastTranscriptionRef.current.length;
    
    if (analysisTimeoutRef.current) {
      clearTimeout(analysisTimeoutRef.current);
    }

    // Only analyze if there's meaningful new content
    if (newContentLength > 50) {
      analysisTimeoutRef.current = setTimeout(() => {
        analyzeTranscriptionForTemplate(transcription);
        lastTranscriptionRef.current = transcription;
      }, 8000); // Increased to 8 seconds to reduce API calls
    }

  }, [transcription, isRecording]);

  const analyzeTranscriptionForTemplate = async (currentTranscription: string) => {
    if (!currentTranscription.trim()) return;

    setIsAnalyzing(true);
    console.log(`📋 [TemplateNursing] Analyzing transcription for template updates`);

    try {
      const response = await fetch('/api/nursing/analyze-template', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patientId,
          encounterId,
          transcription: currentTranscription,
          currentTemplate: template,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.updates && Object.keys(result.updates).length > 0) {
        const updatedTemplate = { ...template, ...result.updates, lastUpdate: new Date() };
        setTemplate(updatedTemplate);
        onTemplateUpdate(updatedTemplate);

        // Track newly completed fields
        const newCompletedFields = new Set(completedFields);
        Object.keys(result.updates).forEach(key => {
          if (result.updates[key] && result.updates[key].trim() && !completedFields.has(key)) {
            newCompletedFields.add(key);
          }
        });
        setCompletedFields(newCompletedFields);

        console.log(`✅ [TemplateNursing] Updated fields: ${Object.keys(result.updates).join(', ')}`);
      }

    } catch (error) {
      console.error("❌ [TemplateNursing] Error analyzing transcription:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getFieldStatus = (fieldKey: string, value: string) => {
    if (value && value.trim()) {
      return completedFields.has(fieldKey) ? 'new' : 'filled';
    }
    return 'empty';
  };

  const getFieldBadge = (status: string) => {
    switch (status) {
      case 'new':
        return <Badge variant="default" className="ml-2 bg-green-100 text-green-800">New</Badge>;
      case 'filled':
        return <CheckCircle className="ml-2 h-4 w-4 text-green-600" />;
      case 'empty':
      default:
        return null;
    }
  };

  const completionPercentage = Math.round(
    (Object.values(template).filter(value => value && typeof value === 'string' && value.trim()).length / TEMPLATE_FIELDS.length) * 100
  );

  return (
    <Card className="p-4 border-purple-200 bg-purple-50">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Activity className="h-5 w-5 text-purple-600" />
          <h3 className="font-semibold text-purple-900">Nursing Assessment Template</h3>
        </div>
        <div className="flex items-center space-x-2">
          <div className="text-sm text-purple-700">
            {completionPercentage}% Complete ({Object.values(template).filter(v => v && typeof v === 'string' && v.trim()).length}/{TEMPLATE_FIELDS.length})
          </div>
          {isAnalyzing && (
            <Badge variant="outline" className="text-purple-600 border-purple-600">
              <Clock className="h-3 w-3 mr-1 animate-spin" />
              Analyzing
            </Badge>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {TEMPLATE_FIELDS.map((field) => {
          const value = template[field.key as keyof NursingTemplate] as string;
          const status = getFieldStatus(field.key, value);
          
          return (
            <div key={field.key} className="flex items-start space-x-2">
              <div className="font-mono text-sm font-semibold text-gray-700 w-16 flex-shrink-0 pt-1">
                {field.label}
              </div>
              <div className="flex-1 min-h-[24px]">
                {value ? (
                  <div className="text-sm text-gray-900 p-2 bg-white rounded border">
                    {value}
                  </div>
                ) : (
                  <div className="text-sm text-gray-400 italic p-2 border border-dashed border-gray-300 rounded">
                    {field.description}
                  </div>
                )}
              </div>
              <div className="flex-shrink-0">
                {getFieldBadge(status)}
              </div>
            </div>
          );
        })}
      </div>

      {template.lastUpdate && (
        <div className="mt-4 text-xs text-purple-600 text-center">
          Last updated: {template.lastUpdate.toLocaleTimeString()}
        </div>
      )}

      <div className="mt-3 text-xs text-purple-600 bg-purple-100 rounded p-2">
        💡 Ask questions about the areas that are still empty to help complete the assessment
      </div>
    </Card>
  );
});

TemplateNursingAssessment.displayName = "TemplateNursingAssessment";