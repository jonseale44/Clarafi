/**
 * Template Manager Component
 * Handles creation, editing, and management of custom note templates
 */

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Plus, Edit, Trash2, Star, Eye, Share, Copy, MessageSquare } from "lucide-react";
import { TwoPhaseTemplateEditor } from './TwoPhaseTemplateEditor';

interface Template {
  id: number | string;
  templateName: string;
  displayName: string;
  baseNoteType: string;
  isDefault: boolean;
  isPersonal: boolean;
  isBaseTemplate?: boolean;
  exampleNote?: string;
  baseNoteText?: string;
  inlineComments?: any[];
  hasComments?: boolean;
  usageCount?: number;
  lastUsed?: string;
}

interface TemplateManagerProps {
  onTemplateSelect?: (template: Template) => void;
  selectedNoteType?: string;
}

export const TemplateManager: React.FC<TemplateManagerProps> = ({ 
  onTemplateSelect, 
  selectedNoteType = "soap" 
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [showTwoPhaseEditor, setShowTwoPhaseEditor] = useState(false);
  const [twoPhaseMode, setTwoPhaseMode] = useState<'create' | 'edit'>('create');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateDisplayName, setNewTemplateDisplayName] = useState("");
  const [newTemplateNoteType, setNewTemplateNoteType] = useState(selectedNoteType);
  const [exampleNote, setExampleNote] = useState("");

  // Get user's templates
  const { data: userTemplates = [], isLoading } = useQuery({
    queryKey: ['/api/templates/user'],
  });

  // Get templates for current note type
  const { data: noteTypeTemplates = [] } = useQuery({
    queryKey: ['/api/templates/by-type', selectedNoteType],
  });

  console.log('🔍 [TemplateManager] Selected note type:', selectedNoteType);
  console.log('🔍 [TemplateManager] Fetched templates:', noteTypeTemplates);

  // Get example note for new template creation
  const generateExampleMutation = useMutation({
    mutationFn: async (noteType: string) => {
      const response = await apiRequest('POST', `/api/templates/generate-example`, { noteType });
      return await response.json();
    }
  });

  // Delete template mutation
  const deleteTemplateMutation = useMutation({
    mutationFn: async (templateId: number) => {
      const response = await apiRequest('DELETE', `/api/templates/${templateId}`, {});
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/templates/by-type', selectedNoteType] });
      toast({
        title: "Template deleted",
        description: "Template has been deleted successfully."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Delete failed",
        description: error.message || "Failed to delete template",
        variant: "destructive"
      });
    }
  });

  const handleDeleteTemplate = (template: Template) => {
    if (template.isBaseTemplate) {
      toast({
        title: "Cannot Delete",
        description: "System templates cannot be deleted.",
        variant: "destructive"
      });
      return;
    }

    // Show confirmation dialog
    if (window.confirm(`Delete "${template.displayName}"?\n\nThis action cannot be undone.`)) {
      deleteTemplateMutation.mutate(template.id as number);
    }
  };

  // Create new template
  const createTemplateMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log('📋 [TemplateManager] Creating template with data:', data);
      
      try {
        const response = await apiRequest('POST', '/api/templates/create-from-example', data);
        const result = await response.json();
        console.log('✅ [TemplateManager] Template created successfully:', result);
        return result;
      } catch (error) {
        console.error('❌ [TemplateManager] Template creation failed:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/templates/user'] });
      queryClient.invalidateQueries({ queryKey: ['/api/templates/by-type'] });
      setIsCreateDialogOpen(false);
      setNewTemplateName("");
      setNewTemplateDisplayName("");
      setNewTemplateNoteType(selectedNoteType);
      setExampleNote("");
      toast({
        title: "Template Created",
        description: "Your custom template has been created successfully."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create template",
        variant: "destructive"
      });
    }
  });

  // Update template
  const updateTemplateMutation = useMutation({
    mutationFn: async ({ templateId, data }: { templateId: number; data: any }) => {
      const response = await apiRequest('PUT', `/api/templates/${templateId}`, data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/templates/user'] });
      queryClient.invalidateQueries({ queryKey: ['/api/templates/by-type'] });
      setIsEditDialogOpen(false);
      setSelectedTemplate(null);
      toast({
        title: "Template Updated",
        description: "Your template has been updated successfully."
      });
    }
  });

  // Set default template
  const setDefaultMutation = useMutation({
    mutationFn: async (templateId: number) => {
      const response = await apiRequest('POST', `/api/templates/${templateId}/set-default`, {});
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/templates/by-type'] });
      toast({
        title: "Default Set",
        description: "Template set as your default for this note type."
      });
    }
  });

  // Duplicate template
  const duplicateTemplateMutation = useMutation({
    mutationFn: async (templateId: number) => {
      const response = await apiRequest('POST', `/api/templates/${templateId}/duplicate`, {});
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/templates/user'] });
      queryClient.invalidateQueries({ queryKey: ['/api/templates/by-type'] });
      toast({
        title: "Template Duplicated",
        description: "Template has been duplicated successfully."
      });
    }
  });

  const handleCreateTemplate = async () => {
    if (!newTemplateName || !newTemplateDisplayName || !newTemplateNoteType || !exampleNote) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    createTemplateMutation.mutate({
      templateName: newTemplateName,
      displayName: newTemplateDisplayName,
      baseNoteType: newTemplateNoteType,
      exampleNote
    });
  };

  const handleGenerateExample = async () => {
    const noteTypeToUse = newTemplateNoteType || selectedNoteType;
    if (!noteTypeToUse) {
      toast({
        title: "Selection required",
        description: "Please select a base note type first",
        variant: "destructive"
      });
      return;
    }
    
    try {
      const result = await generateExampleMutation.mutateAsync(noteTypeToUse);
      setExampleNote(result.exampleNote);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to generate example note",
        variant: "destructive"
      });
    }
  };

  const handleEditTemplate = (template: Template) => {
    setSelectedTemplate(template);
    setExampleNote(template.exampleNote || "");
    setIsEditDialogOpen(true);
  };

  // Two-phase template editor handlers
  const handleCreateWithTwoPhase = () => {
    setTwoPhaseMode('create');
    setShowTwoPhaseEditor(true);
    setIsCreateDialogOpen(false);
  };

  const handleEditWithTwoPhase = (template: Template) => {
    setSelectedTemplate(template);
    setTwoPhaseMode('edit');
    setShowTwoPhaseEditor(true);
    setIsEditDialogOpen(false);
  };

  const handleTwoPhaseSave = async (templateData: any) => {
    try {
      if (twoPhaseMode === 'create') {
        await createTemplateMutation.mutateAsync(templateData);
      } else if (selectedTemplate) {
        await updateTemplateMutation.mutateAsync({
          id: selectedTemplate.id,
          updates: templateData
        });
      }
      setShowTwoPhaseEditor(false);
      setSelectedTemplate(null);
    } catch (error: any) {
      toast({
        title: "Save failed",
        description: error.message || "Failed to save template",
        variant: "destructive"
      });
    }
  };

  const handleUpdateTemplate = () => {
    if (!selectedTemplate) return;
    
    updateTemplateMutation.mutate({
      templateId: selectedTemplate.id as number,
      data: {
        exampleNote,
        displayName: selectedTemplate.displayName
      }
    });
  };

  if (isLoading) {
    return <div className="p-4">Loading templates...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Template Manager</h3>
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={handleCreateWithTwoPhase}
            className="flex items-center gap-2"
          >
            <MessageSquare className="h-4 w-4" />
            Advanced Template
          </Button>
          
          <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
            setIsCreateDialogOpen(open);
            if (open) {
              // Reset form and set default note type to current context
              setNewTemplateName("");
              setNewTemplateDisplayName("");
              setNewTemplateNoteType(selectedNoteType);
              setExampleNote("");
            }
          }}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-1" />
                Basic Template
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Custom Template</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="template-name">Template Name</Label>
                  <Input
                    id="template-name"
                    placeholder="e.g., SOAP-DrSmith"
                    value={newTemplateName}
                    onChange={(e) => setNewTemplateName(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="display-name">Display Name</Label>
                  <Input
                    id="display-name"
                    placeholder="e.g., Dr. Smith's SOAP Template"
                    value={newTemplateDisplayName}
                    onChange={(e) => setNewTemplateDisplayName(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="base-note-type">Base Note Type</Label>
                  <Select value={newTemplateNoteType} onValueChange={setNewTemplateNoteType}>
                    <SelectTrigger>
                      <SelectValue placeholder={`Default: ${selectedNoteType === 'hAndP' ? 'H&P' : selectedNoteType.toUpperCase()} Note`} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="soap">SOAP Note</SelectItem>
                      <SelectItem value="progress">Progress Note</SelectItem>
                      <SelectItem value="hAndP">H&P (History & Physical)</SelectItem>
                      <SelectItem value="apso">APSO Note</SelectItem>
                      <SelectItem value="discharge">Discharge Summary</SelectItem>
                      <SelectItem value="procedure">Procedure Note</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label htmlFor="example-note">Example Note (Edit to your preference)</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateExample}
                    disabled={generateExampleMutation.isPending}
                  >
                    {generateExampleMutation.isPending ? "Generating..." : "Generate Example"}
                  </Button>
                </div>
                <Textarea
                  id="example-note"
                  className="h-96 font-mono"
                  placeholder="Paste or edit an example note in your preferred style..."
                  value={exampleNote}
                  onChange={(e) => setExampleNote(e.target.value)}
                />
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateTemplate}
                  disabled={createTemplateMutation.isPending}
                >
                  {createTemplateMutation.isPending ? "Creating..." : "Create Template"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Available Templates for Current Note Type */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Templates for {selectedNoteType === 'hAndP' ? 'H&P' : selectedNoteType.toUpperCase()}
          </CardTitle>
          <p className="text-sm text-gray-600">
            Custom templates can be edited or deleted. System templates are read-only.
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {noteTypeTemplates.map((template: Template) => (
              <div
                key={template.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
              >
                <div className="flex items-center space-x-3">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">{template.displayName}</span>
                      {template.isDefault && (
                        <Badge variant="default">
                          <Star className="h-3 w-3 mr-1" />
                          Default
                        </Badge>
                      )}
                      {template.isBaseTemplate && (
                        <Badge variant="secondary">System Template</Badge>
                      )}
                      {!template.isBaseTemplate && (
                        <Badge variant="outline" className="text-navy-blue-600 border-navy-blue-200">Custom</Badge>
                      )}
                    </div>
                    {template.usageCount && (
                      <div className="text-xs text-gray-500">
                        Used {template.usageCount} times
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-1">
                  {onTemplateSelect && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onTemplateSelect(template)}
                    >
                      Select
                    </Button>
                  )}
                  
                  {!template.isBaseTemplate && (
                    <>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDefaultMutation.mutate(template.id as number)}
                        disabled={template.isDefault}
                      >
                        <Star className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEditTemplate(template)}
                        title="Edit template (basic)"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEditWithTwoPhase(template)}
                        title="Advanced editor with AI instructions"
                      >
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => duplicateTemplateMutation.mutate(template.id as number)}
                        disabled={duplicateTemplateMutation.isPending}
                        title="Duplicate template"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      {!template.isBaseTemplate && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteTemplate(template)}
                          disabled={deleteTemplateMutation.isPending}
                          title="Delete custom template"
                          className="ml-1"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          {deleteTemplateMutation.isPending ? "Deleting..." : "Delete"}
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Edit Template Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Template: {selectedTemplate?.displayName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-example-note">Example Note</Label>
              <Textarea
                id="edit-example-note"
                className="h-96 font-mono"
                value={exampleNote}
                onChange={(e) => setExampleNote(e.target.value)}
              />
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdateTemplate}
                disabled={updateTemplateMutation.isPending}
              >
                {updateTemplateMutation.isPending ? "Updating..." : "Update Template"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>

    {/* Two-Phase Template Editor */}
    <TwoPhaseTemplateEditor
      isOpen={showTwoPhaseEditor}
      onClose={() => setShowTwoPhaseEditor(false)}
      mode={twoPhaseMode}
      initialData={selectedTemplate ? {
        templateName: selectedTemplate.templateName,
        displayName: selectedTemplate.displayName,
        baseNoteType: selectedTemplate.baseNoteType,
        baseNoteText: selectedTemplate.exampleNote,
        inlineComments: (selectedTemplate as any).inlineComments || []
      } : undefined}
      onSave={handleTwoPhaseSave}
    />
  </div>
  );
};