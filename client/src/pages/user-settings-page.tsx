import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Save, Plus, Eye, Settings2, FileText } from "lucide-react";

// Form validation schema
const templateFormSchema = z.object({
  templateName: z.string().min(1, "Template name is required"),
  isDefault: z.boolean().default(false),
  subjectiveTemplate: z.string().min(10, "Subjective template must be at least 10 characters"),
  objectiveTemplate: z.string().min(10, "Objective template must be at least 10 characters"),
  assessmentTemplate: z.string().min(10, "Assessment template must be at least 10 characters"),
  planTemplate: z.string().min(10, "Plan template must be at least 10 characters"),
  formatPreferences: z.object({
    useBulletPoints: z.boolean(),
    boldDiagnoses: z.boolean(),
    separateAssessmentPlan: z.boolean(),
    vitalSignsFormat: z.enum(['inline', 'list', 'table']),
    physicalExamFormat: z.enum(['paragraph', 'bullets', 'structured']),
    abbreviationStyle: z.enum(['minimal', 'standard', 'extensive']),
    sectionSpacing: z.number().min(0).max(10),
  }),
  enableAiLearning: z.boolean(),
  learningConfidence: z.number().min(0).max(1),
});

type TemplateFormData = z.infer<typeof templateFormSchema>;

export default function UserSettingsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [previewMode, setPreviewMode] = useState(false);

  // Get user's SOAP templates
  const { data: templates, isLoading } = useQuery({
    queryKey: ['/api/user/soap-templates'],
  });

  // Get current user
  const { data: user } = useQuery({
    queryKey: ['/api/user'],
  });

  const form = useForm<TemplateFormData>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      templateName: "My SOAP Template",
      isDefault: false,
      subjectiveTemplate: "Patient presents with [chief complaint].\n\n[History of present illness including onset, duration, character, precipitating factors, alleviating factors, and associated symptoms]\n\n[Review of systems as relevant]",
      objectiveTemplate: "Vitals: BP: [value] | HR: [value] | Temp: [value] | RR: [value] | SpO2: [value]\n\nPhysical Exam:\nGen: [general appearance]\nHEENT: [head, eyes, ears, nose, throat]\nCV: [cardiovascular]\nLungs: [pulmonary]\nAbd: [abdominal]\nExt: [extremities]\nSkin: [skin]\nNeuro: [neurological if relevant]\n\nLabs: [laboratory results if available]",
      assessmentTemplate: "1. [Primary diagnosis] - [clinical reasoning]\n2. [Secondary diagnosis] - [clinical reasoning]\n3. [Additional diagnoses as applicable]",
      planTemplate: "1. [Primary diagnosis management]\n   - [Medications with dosing]\n   - [Procedures/interventions]\n   - [Monitoring]\n\n2. [Secondary diagnosis management]\n   - [Specific treatments]\n\n3. Follow-up:\n   - [Timeline and instructions]\n   - [Patient education]\n   - [Return precautions]",
      formatPreferences: {
        useBulletPoints: true,
        boldDiagnoses: true,
        separateAssessmentPlan: true,
        vitalSignsFormat: 'inline',
        physicalExamFormat: 'structured',
        abbreviationStyle: 'standard',
        sectionSpacing: 4,
      },
      enableAiLearning: true,
      learningConfidence: 0.75,
    },
  });

  // Save template mutation
  const saveTemplateMutation = useMutation({
    mutationFn: async (data: TemplateFormData) => {
      const response = await fetch('/api/user/soap-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to save template');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Template Saved",
        description: "Your SOAP note template has been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/user/soap-templates'] });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Save Failed",
        description: "Failed to save template. Please try again.",
      });
    },
  });

  const onSubmit = (data: TemplateFormData) => {
    saveTemplateMutation.mutate(data);
  };

  // Load selected template into form
  useEffect(() => {
    if (selectedTemplate) {
      form.reset({
        templateName: selectedTemplate.templateName,
        isDefault: selectedTemplate.isDefault,
        subjectiveTemplate: selectedTemplate.subjectiveTemplate,
        objectiveTemplate: selectedTemplate.objectiveTemplate,
        assessmentTemplate: selectedTemplate.assessmentTemplate,
        planTemplate: selectedTemplate.planTemplate,
        formatPreferences: selectedTemplate.formatPreferences,
        enableAiLearning: selectedTemplate.enableAiLearning,
        learningConfidence: selectedTemplate.learningConfidence,
      });
    }
  }, [selectedTemplate, form]);

  const generatePreview = () => {
    const formData = form.getValues();
    const { formatPreferences } = formData;
    
    let preview = "";
    
    // Add section spacing
    const spacing = "\n".repeat(formatPreferences.sectionSpacing);
    
    preview += "**SUBJECTIVE:**" + spacing;
    preview += formData.subjectiveTemplate + spacing;
    
    preview += "**OBJECTIVE:**" + spacing;
    preview += formData.objectiveTemplate + spacing;
    
    if (formatPreferences.separateAssessmentPlan) {
      preview += "**ASSESSMENT:**" + spacing;
      preview += formData.assessmentTemplate + spacing;
      preview += "**PLAN:**" + spacing;
      preview += formData.planTemplate;
    } else {
      preview += "**ASSESSMENT/PLAN:**" + spacing;
      preview += formData.assessmentTemplate + "\n\n" + formData.planTemplate;
    }
    
    return preview;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Loading user settings...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">SOAP Template Settings</h1>
        <p className="text-gray-600">
          Customize your SOAP note templates and enable AI learning to adapt to your documentation style.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Template List */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              My Templates
            </h2>
            <Button 
              size="sm" 
              onClick={() => {
                setSelectedTemplate(null);
                form.reset();
              }}
            >
              <Plus className="h-4 w-4 mr-1" />
              New
            </Button>
          </div>
          
          <div className="space-y-2">
            {(templates || []).map((template: any) => (
              <div
                key={template.id}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedTemplate?.id === template.id
                    ? 'border-navy-blue-500 bg-navy-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setSelectedTemplate(template)}
              >
                <div className="font-medium">{template.templateName}</div>
                <div className="text-sm text-gray-500">
                  {template.isDefault && (
                    <span className="text-navy-blue-600 font-medium">Default • </span>
                  )}
                  AI Learning: {template.enableAiLearning ? 'On' : 'Off'}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Template Editor */}
        <Card className="p-6 lg:col-span-2">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center">
                <Settings2 className="h-5 w-5 mr-2" />
                Template Editor
              </h2>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPreviewMode(!previewMode)}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  {previewMode ? 'Edit' : 'Preview'}
                </Button>
                <Button type="submit" size="sm" disabled={saveTemplateMutation.isPending}>
                  <Save className="h-4 w-4 mr-1" />
                  {saveTemplateMutation.isPending ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </div>

            {previewMode ? (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium mb-2">Template Preview</h3>
                <pre className="whitespace-pre-wrap text-sm">{generatePreview()}</pre>
              </div>
            ) : (
              <Tabs defaultValue="template" className="w-full">
                <TabsList>
                  <TabsTrigger value="template">Template Content</TabsTrigger>
                  <TabsTrigger value="formatting">Formatting</TabsTrigger>
                  <TabsTrigger value="ai">AI Learning</TabsTrigger>
                </TabsList>

                <TabsContent value="template" className="space-y-4">
                  <div>
                    <Label htmlFor="templateName">Template Name</Label>
                    <Input
                      id="templateName"
                      {...form.register('templateName')}
                      placeholder="e.g., Primary Care Template"
                    />
                    {form.formState.errors.templateName && (
                      <p className="text-sm text-red-600 mt-1">
                        {form.formState.errors.templateName.message}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isDefault"
                      checked={form.watch('isDefault')}
                      onCheckedChange={(checked) => form.setValue('isDefault', checked)}
                    />
                    <Label htmlFor="isDefault">Set as default template</Label>
                  </div>

                  <div>
                    <Label htmlFor="subjectiveTemplate">Subjective Template</Label>
                    <Textarea
                      id="subjectiveTemplate"
                      {...form.register('subjectiveTemplate')}
                      rows={4}
                      placeholder="Template for subjective section..."
                    />
                  </div>

                  <div>
                    <Label htmlFor="objectiveTemplate">Objective Template</Label>
                    <Textarea
                      id="objectiveTemplate"
                      {...form.register('objectiveTemplate')}
                      rows={6}
                      placeholder="Template for objective section..."
                    />
                  </div>

                  <div>
                    <Label htmlFor="assessmentTemplate">Assessment Template</Label>
                    <Textarea
                      id="assessmentTemplate"
                      {...form.register('assessmentTemplate')}
                      rows={4}
                      placeholder="Template for assessment section..."
                    />
                  </div>

                  <div>
                    <Label htmlFor="planTemplate">Plan Template</Label>
                    <Textarea
                      id="planTemplate"
                      {...form.register('planTemplate')}
                      rows={6}
                      placeholder="Template for plan section..."
                    />
                  </div>
                </TabsContent>

                <TabsContent value="formatting" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="useBulletPoints"
                        checked={form.watch('formatPreferences.useBulletPoints')}
                        onCheckedChange={(checked) => 
                          form.setValue('formatPreferences.useBulletPoints', checked)
                        }
                      />
                      <Label htmlFor="useBulletPoints">Use bullet points</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="boldDiagnoses"
                        checked={form.watch('formatPreferences.boldDiagnoses')}
                        onCheckedChange={(checked) => 
                          form.setValue('formatPreferences.boldDiagnoses', checked)
                        }
                      />
                      <Label htmlFor="boldDiagnoses">Bold diagnoses</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="separateAssessmentPlan"
                        checked={form.watch('formatPreferences.separateAssessmentPlan')}
                        onCheckedChange={(checked) => 
                          form.setValue('formatPreferences.separateAssessmentPlan', checked)
                        }
                      />
                      <Label htmlFor="separateAssessmentPlan">Separate Assessment/Plan</Label>
                    </div>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="vitalSignsFormat">Vital Signs Format</Label>
                      <Select
                        value={form.watch('formatPreferences.vitalSignsFormat')}
                        onValueChange={(value: 'inline' | 'list' | 'table') =>
                          form.setValue('formatPreferences.vitalSignsFormat', value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="inline">Inline (BP: 120/80 | HR: 72)</SelectItem>
                          <SelectItem value="list">List format</SelectItem>
                          <SelectItem value="table">Table format</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="physicalExamFormat">Physical Exam Format</Label>
                      <Select
                        value={form.watch('formatPreferences.physicalExamFormat')}
                        onValueChange={(value: 'paragraph' | 'bullets' | 'structured') =>
                          form.setValue('formatPreferences.physicalExamFormat', value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="paragraph">Paragraph</SelectItem>
                          <SelectItem value="bullets">Bullet points</SelectItem>
                          <SelectItem value="structured">Structured format</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="abbreviationStyle">Abbreviation Style</Label>
                      <Select
                        value={form.watch('formatPreferences.abbreviationStyle')}
                        onValueChange={(value: 'minimal' | 'standard' | 'extensive') =>
                          form.setValue('formatPreferences.abbreviationStyle', value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="minimal">Minimal abbreviations</SelectItem>
                          <SelectItem value="standard">Standard medical</SelectItem>
                          <SelectItem value="extensive">Extensive abbreviations</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="sectionSpacing">Section Spacing (blank lines)</Label>
                      <Input
                        id="sectionSpacing"
                        type="number"
                        min="0"
                        max="10"
                        {...form.register('formatPreferences.sectionSpacing', { valueAsNumber: true })}
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="ai" className="space-y-4">
                  <div className="flex items-start space-x-2">
                    <span className="text-xl text-blue-600">✨</span>
                    <div>
                      <h3 className="font-medium">AI Learning System</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Enable AI to learn from your edits and automatically improve future SOAP notes.
                        The system distinguishes between your personal style preferences and patient-specific medical content.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="enableAiLearning"
                      checked={form.watch('enableAiLearning')}
                      onCheckedChange={(checked) => form.setValue('enableAiLearning', checked)}
                    />
                    <Label htmlFor="enableAiLearning">Enable AI learning from my edits</Label>
                  </div>

                  {form.watch('enableAiLearning') && (
                    <div>
                      <Label htmlFor="learningConfidence">
                        Learning Confidence Threshold: {(form.watch('learningConfidence') * 100).toFixed(0)}%
                      </Label>
                      <input
                        type="range"
                        id="learningConfidence"
                        min="0.5"
                        max="1"
                        step="0.05"
                        value={form.watch('learningConfidence')}
                        onChange={(e) => form.setValue('learningConfidence', parseFloat(e.target.value))}
                        className="w-full mt-2"
                      />
                      <div className="text-sm text-gray-600 mt-1">
                        Higher values require more confidence before applying learned patterns.
                      </div>
                    </div>
                  )}

                  <div className="bg-navy-blue-50 p-4 rounded-lg">
                    <h4 className="font-medium text-navy-blue-900 mb-2">What the AI Learns</h4>
                    <ul className="text-sm text-navy-blue-800 space-y-1">
                      <li>• Formatting preferences (bullets, spacing, organization)</li>
                      <li>• Documentation style (abbreviations, terminology)</li>
                      <li>• Section structure and content patterns</li>
                      <li>• Your clinical reasoning approach</li>
                    </ul>
                    <p className="text-sm text-navy-blue-700 mt-2">
                      The AI will NOT learn patient-specific medical information - only your documentation preferences.
                    </p>
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </form>
        </Card>
      </div>
    </div>
  );
}