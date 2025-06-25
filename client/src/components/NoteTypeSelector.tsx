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
  showTemplateManager?: boolean;
}

import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Settings } from "lucide-react";
import { TemplateManager } from "./templates/TemplateManager";
import { useState } from "react";

export const NoteTypeSelector: React.FC<NoteTypeSelectorProps> = ({
  noteType,
  onNoteTypeChange,
  selectedTemplate,
  onTemplateChange,
  disabled = false,
  showTemplateManager = false
}) => {
  const [isTemplateManagerOpen, setIsTemplateManagerOpen] = useState(false);

  // Get available templates for current note type
  const { data: availableTemplates = [] } = useQuery({
    queryKey: ['/api/templates/by-type', noteType],
    enabled: showTemplateManager
  });
  const noteTypes = [
    { value: 'soap', label: 'SOAP Note', category: 'Progress Notes' },
    { value: 'apso', label: 'APSO Note', category: 'Progress Notes' },
    { value: 'progress', label: 'Hospital Progress Note', category: 'Progress Notes' },
    { value: 'hAndP', label: 'History & Physical', category: 'Initial Evaluation' },
    { value: 'discharge', label: 'Discharge Summary', category: 'Discharge Documentation' },
    { value: 'procedure', label: 'Procedure Note', category: 'Procedural Documentation' },
  ];

  const groupedNotes = noteTypes.reduce((acc, note) => {
    if (!acc[note.category]) {
      acc[note.category] = [];
    }
    acc[note.category].push(note);
    return acc;
  }, {} as Record<string, typeof noteTypes>);

  const handleTemplateSelect = (template: Template) => {
    if (template.isBaseTemplate) {
      // Base template selected - just change note type
      onNoteTypeChange(template.baseNoteType);
      if (onTemplateChange) {
        onTemplateChange(template);
      }
    } else {
      // Custom template selected
      onNoteTypeChange(template.baseNoteType);
      if (onTemplateChange) {
        onTemplateChange(template);
      }
    }
    setIsTemplateManagerOpen(false);
  };

  return (
    <div className="flex items-center space-x-2">
      {showTemplateManager ? (
        // Enhanced template selector with custom templates
        <div className="flex items-center space-x-2">
          <Label className="text-sm font-medium whitespace-nowrap">
            Template:
          </Label>
          <Select
            value={selectedTemplate?.id?.toString() || `base-${noteType}`}
            onValueChange={(value) => {
              const template = availableTemplates.find((t: Template) => t.id.toString() === value);
              if (template) {
                handleTemplateSelect(template);
              }
            }}
            disabled={disabled}
          >
            <SelectTrigger className="w-64">
              <SelectValue>
                {selectedTemplate?.displayName || `${noteType.toUpperCase()} (Standard)`}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {availableTemplates.map((template: Template) => (
                <SelectItem key={template.id} value={template.id.toString()}>
                  <div className="flex items-center justify-between w-full">
                    <span>{template.displayName}</span>
                    {template.isDefault && (
                      <span className="text-xs text-blue-600 ml-2">Default</span>
                    )}
                  </div>
                </SelectItem>
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
                onTemplateSelect={handleTemplateSelect}
              />
            </DialogContent>
          </Dialog>
        </div>
      ) : (
        // Simple note type selector (legacy mode)
        <div className="flex items-center space-x-2">
          <Label htmlFor="note-type-select" className="text-sm font-medium whitespace-nowrap">
            Note Type:
          </Label>
          <Select
            value={noteType}
            onValueChange={onNoteTypeChange}
            disabled={disabled}
          >
            <SelectTrigger id="note-type-select" className="w-48">
              <SelectValue placeholder="Select note type" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(groupedNotes).map(([category, notes]) => (
                <div key={category}>
                  <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {category}
                  </div>
                  {notes.map((note) => (
                    <SelectItem key={note.value} value={note.value}>
                      {note.label}
                    </SelectItem>
                  ))}
                </div>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
};