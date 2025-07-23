import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface Template {
  id: number | string;
  templateName: string;
  displayName: string;
  baseNoteType: string;
  isDefault: boolean;
  isBaseTemplate?: boolean;
}

interface NoteTypeSelectorProps {
  noteType: string;
  onNoteTypeChange: (noteType: string) => void;
  selectedTemplate?: Template | null;
  onTemplateChange?: (template: Template) => void;
  disabled?: boolean;
}

import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Settings } from "lucide-react";
import { TemplateManager } from "./templates/TemplateManager";
import { useState, useEffect } from "react";

export const NoteTypeSelector: React.FC<NoteTypeSelectorProps> = ({
  noteType,
  onNoteTypeChange,
  selectedTemplate,
  onTemplateChange,
  disabled = false
}) => {
  const [isTemplateManagerOpen, setIsTemplateManagerOpen] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);

  // Get user preferences
  const { data: userPreferences } = useQuery<any>({
    queryKey: ['/api/user/preferences']
  });

  // Mutation to update user preferences
  const updatePreferencesMutation = useMutation({
    mutationFn: async (updates: any) => {
      return await apiRequest('PUT', '/api/user/preferences', updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/preferences'] });
    }
  });

  // Get all user templates
  const { data: userTemplates = [] } = useQuery<Template[]>({
    queryKey: ['/api/templates/user']
  });

  // Initialize with user's last selected note type
  useEffect(() => {
    if (!hasInitialized && userPreferences?.lastSelectedNoteType && noteType === 'soap') {
      // Only set default if current noteType is still the default 'soap'
      onNoteTypeChange(userPreferences.lastSelectedNoteType);
      setHasInitialized(true);
    }
  }, [userPreferences, hasInitialized, noteType, onNoteTypeChange]);

  const noteTypes = [
    { value: 'soap', label: 'SOAP Note', category: 'Progress Notes' },
    { value: 'soapNarrative', label: 'SOAP (Narrative)', category: 'Progress Notes' },
    { value: 'soapPsychiatric', label: 'SOAP (Psychiatric)', category: 'Progress Notes' },
    { value: 'soapObGyn', label: 'SOAP (OB/GYN)', category: 'Progress Notes' },
    { value: 'soapPediatric', label: 'SOAP (Peds)', category: 'Progress Notes' },
    { value: 'apso', label: 'APSO Note', category: 'Progress Notes' },
    { value: 'progress', label: 'Hospital Progress Note', category: 'Progress Notes' },
    { value: 'hAndP', label: 'H&P (History & Physical)', category: 'Initial Evaluation' },
    { value: 'discharge', label: 'Discharge Summary', category: 'Discharge Documentation' },
    { value: 'procedure', label: 'Procedure Note', category: 'Procedural Documentation' },
  ];

  // Create flattened options: base note types + custom templates
  const allOptions = [
    // Base note types
    ...noteTypes.map(note => ({
      id: `base-${note.value}`,
      value: note.value,
      label: note.label,
      category: note.category,
      isBaseTemplate: true,
      baseNoteType: note.value
    })),
    // Custom templates
    ...userTemplates.map((template) => ({
      id: template.id,
      value: `template-${template.id}`,
      label: template.displayName,
      category: noteTypes.find(nt => nt.value === template.baseNoteType)?.category || 'Custom Templates',
      isBaseTemplate: false,
      baseNoteType: template.baseNoteType,
      template: template
    }))
  ];

  const groupedOptions = allOptions.reduce((acc, option) => {
    if (!acc[option.category]) {
      acc[option.category] = [];
    }
    acc[option.category].push(option);
    return acc;
  }, {} as Record<string, typeof allOptions>);

  const handleSelectionChange = (value: string) => {
    let selectedNoteType: string;
    
    if (value.startsWith('template-')) {
      // Custom template selected
      const templateId = value.replace('template-', '');
      const template = userTemplates.find((t: Template) => t.id.toString() === templateId);
      if (template) {
        selectedNoteType = template.baseNoteType;
        onNoteTypeChange(template.baseNoteType);
        if (onTemplateChange) {
          onTemplateChange(template);
        }
      }
    } else {
      // Base note type selected
      selectedNoteType = value;
      onNoteTypeChange(value);
      if (onTemplateChange) {
        onTemplateChange(null as any);
      }
    }
    
    // Save the user's preference
    if (selectedNoteType!) {
      updatePreferencesMutation.mutate({ lastSelectedNoteType: selectedNoteType });
    }
  };

  const getCurrentValue = () => {
    if (selectedTemplate && selectedTemplate.id) {
      return `template-${selectedTemplate.id}`;
    }
    return noteType || "soap"; // Provide fallback to prevent undefined
  };

  return (
    <div className="flex items-center space-x-2">
      <Label htmlFor="note-type-select" className="text-sm font-medium whitespace-nowrap">
        Note Type:
      </Label>
      <Select
        value={getCurrentValue()}
        onValueChange={handleSelectionChange}
        disabled={disabled}
      >
        <SelectTrigger id="note-type-select" className="w-64">
          <SelectValue placeholder="Select note type" />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(groupedOptions).map(([category, options]) => (
            <div key={category}>
              <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {category}
              </div>
              {options.map((option) => (
                <SelectItem key={option.id} value={option.value}>
                  <div className="flex items-center justify-between w-full">
                    <span>{option.label}</span>
                    {!option.isBaseTemplate && (option as any).template?.isDefault && (
                      <span className="text-xs text-navy-blue-600 ml-2">Default</span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </div>
          ))}
        </SelectContent>
      </Select>
      
      <Dialog open={isTemplateManagerOpen} onOpenChange={setIsTemplateManagerOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" disabled={disabled}>
            <Settings className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Templates</DialogTitle>
          </DialogHeader>
          <TemplateManager 
            selectedNoteType={noteType}
            onTemplateSelect={(template) => {
              onNoteTypeChange(template.baseNoteType);
              if (onTemplateChange) {
                onTemplateChange(template);
              }
              setIsTemplateManagerOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};