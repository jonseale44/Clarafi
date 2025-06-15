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
    console.log(`📋 [TemplateNursing] Analyzing via Realtime API (no separate API calls)`);

    try {
      // Use existing realtime WebSocket connection instead of separate API calls
      const realtimeWs = (window as any).currentRealtimeWs;
      
      if (realtimeWs && realtimeWs.readyState === WebSocket.OPEN) {
        console.log(`⚡ [TemplateNursing] Using existing Realtime connection - MUCH FASTER!`);
        
        const templateAnalysisPrompt = `
Update nursing assessment template from this transcription. Only include fields with new information.

Current Template:
- CC: ${template.cc || 'empty'}
- HPI: ${template.hpi || 'empty'}  
- PMH: ${template.pmh || 'empty'}
- Meds: ${template.meds || 'empty'}
- Allergies: ${template.allergies || 'empty'}
- Family Hx: ${template.famHx || 'empty'}
- Social Hx: ${template.soHx || 'empty'}
- Past Surgical Hx: ${template.psh || 'empty'}
- ROS: ${template.ros || 'empty'}
- Vitals: ${template.vitals || 'empty'}

New transcription: "${currentTranscription.slice(-400)}"

Return ONLY JSON with updates, example: {"cc":"New complaint","hpi":"Additional history"}`;

        // Create a temporary listener for the response
        const responseListener = (event: MessageEvent) => {
          try {
            const data = JSON.parse(event.data);
            
            if (data.type === 'response.text.delta' && data.delta) {
              // Accumulate response text
              if (!realtimeWs._templateResponseBuffer) {
                realtimeWs._templateResponseBuffer = '';
              }
              realtimeWs._templateResponseBuffer += data.delta;
            }
            
            if (data.type === 'response.text.done') {
              const responseText = realtimeWs._templateResponseBuffer || '';
              realtimeWs._templateResponseBuffer = '';
              
              console.log(`📋 [TemplateNursing] Realtime response received:`, responseText.substring(0, 200));
              
              // Parse JSON response
              try {
                let jsonStr = responseText.trim();
                
                // Handle markdown code blocks
                if (jsonStr.includes('```json')) {
                  jsonStr = jsonStr.split('```json')[1].split('```')[0].trim();
                } else if (jsonStr.includes('```')) {
                  jsonStr = jsonStr.split('```')[1].split('```')[0].trim();
                }
                
                const updates = JSON.parse(jsonStr);
                
                if (updates && Object.keys(updates).length > 0) {
                  const updatedTemplate = { ...template, ...updates, lastUpdate: new Date() };
                  setTemplate(updatedTemplate);
                  onTemplateUpdate(updatedTemplate);

                  // Track newly completed fields
                  const newCompletedFields = new Set(completedFields);
                  Object.keys(updates).forEach(key => {
                    if (updates[key] && updates[key].trim() && !completedFields.has(key)) {
                      newCompletedFields.add(key);
                    }
                  });
                  setCompletedFields(newCompletedFields);

                  console.log(`⚡ [TemplateNursing] REALTIME Updated fields: ${Object.keys(updates).join(', ')}`);
                }
              } catch (parseError) {
                console.warn(`📋 [TemplateNursing] Failed to parse realtime response:`, parseError);
              }
              
              // Remove listener
              realtimeWs.removeEventListener('message', responseListener);
              setIsAnalyzing(false);
            }
          } catch (error) {
            console.error(`📋 [TemplateNursing] Error processing realtime response:`, error);
          }
        };

        // Add temporary listener
        realtimeWs.addEventListener('message', responseListener);

        // Send the request with correct OpenAI Realtime API format
        realtimeWs.send(JSON.stringify({
          type: "conversation.item.create",
          item: {
            type: "message",
            role: "user",
            content: [{ type: "input_text", text: templateAnalysisPrompt }],
          },
        }));

        realtimeWs.send(JSON.stringify({
          type: "response.create",
          response: { modalities: ["text"], temperature: 0.6 },
        }));

      } else {
        console.warn(`📋 [TemplateNursing] No realtime connection, using fallback API`);
        
        // Fallback to REST API only if realtime is unavailable
        const response = await fetch('/api/nursing/analyze-template', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            patientId, encounterId, transcription: currentTranscription, currentTemplate: template,
          }),
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        
        const result = await response.json();
        
        if (result.updates && Object.keys(result.updates).length > 0) {
          const updatedTemplate = { ...template, ...result.updates, lastUpdate: new Date() };
          setTemplate(updatedTemplate);
          onTemplateUpdate(updatedTemplate);

          const newCompletedFields = new Set(completedFields);
          Object.keys(result.updates).forEach(key => {
            if (result.updates[key] && result.updates[key].trim() && !completedFields.has(key)) {
              newCompletedFields.add(key);
            }
          });
          setCompletedFields(newCompletedFields);

          console.log(`✅ [TemplateNursing] Fallback updated fields: ${Object.keys(result.updates).join(', ')}`);
        }
        
        setIsAnalyzing(false);
      }

    } catch (error) {
      console.error("❌ [TemplateNursing] Error analyzing transcription:", error);
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