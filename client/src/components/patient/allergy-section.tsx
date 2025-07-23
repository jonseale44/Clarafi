/**
 * Allergy Section Component
 * 
 * Comprehensive allergy management with visit history tracking and optimistic updates
 * Follows established patterns from family history and medical problems sections
 * Features: CRUD operations, temporal conflict resolution, drug safety alerts
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  AlertTriangle, 
  Plus, 
  Edit2, 
  Trash2, 
  ChevronDown, 
  ChevronRight,
  Shield,
  Clock,
  FileText,
  AlertCircle
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useDenseView } from '@/hooks/use-dense-view';
import { useLocation } from 'wouter';
import { useNavigationContext } from '@/hooks/use-navigation-context';

interface AllergyEntry {
  id: number;
  patientId: number;
  allergen: string;
  reaction?: string;
  severity?: string;
  allergyType?: string;
  status: string;
  verificationStatus: string;
  onsetDate?: string;
  lastReactionDate?: string;
  drugClass?: string;
  crossReactivity?: string[];
  visitHistory?: Array<{
    date: string;
    notes: string;
    source: "encounter" | "attachment" | "manual" | "imported_record";
    encounterId?: number;
    attachmentId?: number;
    providerName?: string;
    changesMade?: string[];
    confidence?: number;
    conflictResolution?: string;
  }>;
  sourceType: string;
  sourceConfidence: string;
  sourceNotes?: string;
  extractedFromAttachmentId?: number;
  createdAt: string;
  updatedAt: string;
}

interface AllergySectionProps {
  patientId: number;
  className?: string;
  mode?: string;
}

const ALLERGY_TYPES = [
  { value: "drug", label: "Drug/Medication" },
  { value: "food", label: "Food" },
  { value: "environmental", label: "Environmental" },
  { value: "contact", label: "Contact" },
  { value: "other", label: "Other" }
];

const SEVERITY_LEVELS = [
  { value: "mild", label: "Mild" },
  { value: "moderate", label: "Moderate" },
  { value: "severe", label: "Severe" },
  { value: "life-threatening", label: "Life-threatening" },
  { value: "unknown", label: "Unknown" }
];

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "resolved", label: "Resolved" },
  { value: "unconfirmed", label: "Unconfirmed" }
];

export function AllergySection({ patientId, className = "", mode }: AllergySectionProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isDenseView } = useDenseView();
  const [location, setLocation] = useLocation();
  const { navigateWithContext } = useNavigationContext();
  const [openCards, setOpenCards] = useState<Record<number, boolean>>({});
  const [editingAllergy, setEditingAllergy] = useState<AllergyEntry | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  console.log(`🚨 [AllergySection] Component rendered for patient ${patientId}`);

  // Fetch allergies
  const {
    data: allergies = [],
    isLoading,
    error
  } = useQuery<AllergyEntry[]>({
    queryKey: [`/api/allergies/${patientId}`],
    enabled: !!patientId
  });

  // Filter out resolved allergies
  const activeAllergies = allergies.filter((allergy: AllergyEntry) => 
    allergy.status !== 'resolved' && allergy.status !== 'inactive'
  );

  console.log(`🚨 [AllergySection] Query state:`, {
    isLoading,
    hasError: !!error,
    dataLength: allergies.length,
    activeCount: activeAllergies.length,
    enabled: !!patientId,
    queryKey: ['/api/allergies', patientId]
  });

  console.log(`🚨 [AllergySection] Allergy data:`, allergies);
  console.log(`🚨 [AllergySection] Active allergies:`, activeAllergies);

  // Create allergy mutation
  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest('POST', '/api/allergies', data),
    onMutate: async (newAllergy) => {
      await queryClient.cancelQueries({ queryKey: [`/api/allergies/${patientId}`] });
      const previousAllergies = queryClient.getQueryData([`/api/allergies/${patientId}`]);
      
      const tempAllergy = {
        id: Date.now(),
        ...newAllergy,
        visitHistory: [{
          date: new Date().toLocaleDateString('en-CA'),
          notes: `Created allergy: ${newAllergy.allergen}`,
          source: 'manual' as const,
          changesMade: ['allergy_created'],
          confidence: 1.0
        }],
        sourceType: 'manual_entry',
        sourceConfidence: '1.00',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      queryClient.setQueryData([`/api/allergies/${patientId}`], (old: any) => [...(old || []), tempAllergy]);
      return { previousAllergies };
    },
    onError: (err, newAllergy, context) => {
      queryClient.setQueryData([`/api/allergies/${patientId}`], context?.previousAllergies);
      toast({
        title: "Error",
        description: "Failed to create allergy. Please try again.",
        variant: "destructive",
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Allergy created successfully.",
      });
      setIsCreating(false);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/allergies/${patientId}`] });
    },
  });

  // Update allergy mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: any) => apiRequest('PUT', `/api/allergies/${id}`, data),
    onMutate: async (updatedAllergy) => {
      await queryClient.cancelQueries({ queryKey: [`/api/allergies/${patientId}`] });
      const previousAllergies = queryClient.getQueryData([`/api/allergies/${patientId}`]);
      
      queryClient.setQueryData([`/api/allergies/${patientId}`], (old: any) =>
        (old || []).map((allergy: any) =>
          allergy.id === updatedAllergy.id
            ? { ...allergy, ...updatedAllergy, updatedAt: new Date().toISOString() }
            : allergy
        )
      );
      return { previousAllergies };
    },
    onError: (err, updatedAllergy, context) => {
      queryClient.setQueryData([`/api/allergies/${patientId}`], context?.previousAllergies);
      toast({
        title: "Error",
        description: "Failed to update allergy. Please try again.",
        variant: "destructive",
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Allergy updated successfully.",
      });
      setEditingAllergy(null);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/allergies/${patientId}`] });
    },
  });

  // Delete allergy mutation
  const deleteMutation = useMutation({
    mutationFn: (allergyId: number) => apiRequest('DELETE', `/api/allergies/${allergyId}`),
    onMutate: async (allergyId) => {
      await queryClient.cancelQueries({ queryKey: [`/api/allergies/${patientId}`] });
      const previousAllergies = queryClient.getQueryData([`/api/allergies/${patientId}`]);
      
      queryClient.setQueryData([`/api/allergies/${patientId}`], (old: any) =>
        (old || []).filter((allergy: any) => allergy.id !== allergyId)
      );
      return { previousAllergies };
    },
    onError: (err, allergyId, context) => {
      queryClient.setQueryData([`/api/allergies/${patientId}`], context?.previousAllergies);
      toast({
        title: "Error",
        description: "Failed to delete allergy. Please try again.",
        variant: "destructive",
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Allergy deleted successfully.",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/allergies/${patientId}`] });
    },
  });

  const toggleCard = (allergyId: number) => {
    setOpenCards(prev => ({
      ...prev,
      [allergyId]: !prev[allergyId]
    }));
  };

  const getSeverityBadgeColor = (severity?: string) => {
    switch (severity?.toLowerCase()) {
      case 'life-threatening': return 'bg-red-600 text-white';
      case 'severe': return 'bg-red-500 text-white';
      case 'moderate': return 'bg-orange-500 text-white';
      case 'mild': return 'bg-yellow-500 text-black';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getSourceBadge = (allergy: AllergyEntry) => {
    const sourceType = allergy.sourceType;
    const confidence = allergy.sourceConfidence ? parseFloat(allergy.sourceConfidence) : 0;
    const confidencePercent = Math.round(confidence * 100);
    
    switch (sourceType) {
      case 'attachment_extracted': {
        // Check visit history for attachment ID if not directly available
        const attachmentId = allergy.extractedFromAttachmentId || 
          allergy.visitHistory?.find(visit => visit.source === 'attachment' && visit.attachmentId)?.attachmentId;
        
        const handleDocumentClick = () => {
          if (attachmentId) {
            console.log("Navigate to attachment:", attachmentId);
            // When in encounter mode, stay within the encounter context
            if (mode === 'encounter' && location.includes('/encounters/')) {
              // Extract encounter ID from current location
              const currentPath = location.split('?')[0];
              const encounterMatch = currentPath.match(/\/encounters\/(\d+)/);
              if (encounterMatch) {
                const currentEncounterId = encounterMatch[1];
                // Navigate within the encounter context
                setLocation(`/patients/${patientId}/encounters/${currentEncounterId}?section=attachments&highlight=${attachmentId}`);
              } else {
                // Fallback to regular navigation if we can't extract encounter ID
                navigateWithContext(`/patients/${patientId}/chart?section=attachments&highlight=${attachmentId}`, "allergies", mode || "patient-chart");
              }
            } else {
              // Regular navigation for patient chart mode
              navigateWithContext(`/patients/${patientId}/chart?section=attachments&highlight=${attachmentId}`, "allergies", mode || "patient-chart");
            }
          }
        };
        
        return (
          <Badge 
            variant="secondary" 
            className={`text-xs bg-amber-100 text-amber-800 border-amber-200 ${attachmentId ? 'cursor-pointer hover:bg-amber-200 dark:hover:bg-amber-800 transition-colors' : ''}`}
            onClick={attachmentId ? handleDocumentClick : undefined}
            title={attachmentId ? `Click to view source document (Attachment #${attachmentId})` : 'Source document not available'}
          >
            MR {confidencePercent}%
          </Badge>
        );
      }
      case 'soap_derived': {
        // Find encounter ID from visit history
        const encounterEntry = allergy.visitHistory?.find(visit => visit.source === 'encounter' && visit.encounterId);
        const encounterId = encounterEntry?.encounterId;
        
        const handleEncounterClick = () => {
          if (encounterId) {
            navigateWithContext(`/patients/${patientId}/encounters/${encounterId}`, "allergies", mode || "patient-chart");
          }
        };
        
        return (
          <Badge 
            variant="default" 
            className="text-xs cursor-pointer hover:bg-navy-blue-600 dark:hover:bg-navy-blue-400 transition-colors bg-navy-blue-100 text-navy-blue-800 border-navy-blue-200"
            onClick={handleEncounterClick}
            title="Click to view encounter details"
          >
            Note {confidencePercent}%
          </Badge>
        );
      }
      case 'manual_entry':
        return (
          <Badge 
            variant="secondary" 
            className="text-xs bg-gray-100 text-gray-800 border-gray-200"
            title="Manually entered"
          >
            Manual
          </Badge>
        );
      default:
        return (
          <Badge 
            variant="outline" 
            className="text-xs bg-gray-100 text-gray-800 border-gray-300"
          >
            Unknown
          </Badge>
        );
    }
  };

  const getAllergyTypeIcon = (allergyType?: string) => {
    switch (allergyType) {
      case 'drug': return <Shield className="h-4 w-4 text-red-500" />;
      case 'food': return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'environmental': return <AlertCircle className="h-4 w-4 text-green-500" />;
      default: return <AlertTriangle className="h-4 w-4 text-gray-500" />;
    }
  };

  // Dense list rendering for compact view
  const renderAllergyDenseList = (allergy: AllergyEntry) => {
    const severityColor = allergy.severity === 'life-threatening' ? 'border-l-red-600' :
                         allergy.severity === 'severe' ? 'border-l-red-500' :
                         allergy.severity === 'moderate' ? 'border-l-orange-500' :
                         allergy.severity === 'mild' ? 'border-l-yellow-500' : 'border-l-gray-300';
    
    return (
      <Collapsible
        key={allergy.id}
        open={openCards[allergy.id]}
        onOpenChange={() => toggleCard(allergy.id)}
      >
        <CollapsibleTrigger asChild>
          <div className={`dense-list-item group ${severityColor}`}>
            <div className="dense-list-content">
              {openCards[allergy.id] ? (
                <ChevronDown className="h-3 w-3 text-gray-400 flex-shrink-0" />
              ) : (
                <ChevronRight className="h-3 w-3 text-gray-400 flex-shrink-0" />
              )}
              
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {getAllergyTypeIcon(allergy.allergyType)}
                <span className="dense-list-primary">{allergy.allergen}</span>
                
                {allergy.severity && (
                  <Badge className={`dense-list-badge ${getSeverityBadgeColor(allergy.severity)}`}>
                    {allergy.severity}
                  </Badge>
                )}
                
                {allergy.reaction && (
                  <span className="dense-list-secondary">• {allergy.reaction}</span>
                )}
              </div>
              
              <div className="flex items-center gap-1">
                {getSourceBadge(allergy)}
                
                <div className="dense-list-actions">
                  <Dialog open={editingAllergy?.id === allergy.id} onOpenChange={(open) => !open && setEditingAllergy(null)}>
                    <DialogTrigger asChild>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-6 w-6 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingAllergy(allergy);
                        }}
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl" data-median="edit-allergy-dialog">
                      <DialogHeader>
                        <DialogTitle>Edit Allergy</DialogTitle>
                      </DialogHeader>
                      {editingAllergy && (
                        <AllergyForm
                          allergy={editingAllergy}
                          onSubmit={(data) => updateMutation.mutate({ id: editingAllergy.id, ...data })}
                          onCancel={() => setEditingAllergy(null)}
                          isLoading={updateMutation.isPending}
                        />
                      )}
                    </DialogContent>
                  </Dialog>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm(`Delete allergy to ${allergy.allergen}?`)) {
                        deleteMutation.mutate(allergy.id);
                      }
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="dense-list-expanded">
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="font-medium text-gray-700">Type:</span>{' '}
                <span className="text-gray-900">{allergy.allergyType || 'Not specified'}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Status:</span>{' '}
                <span className="text-gray-900">{allergy.status}</span>
              </div>
              {allergy.onsetDate && (
                <div>
                  <span className="font-medium text-gray-700">Onset:</span>{' '}
                  <span className="text-gray-900">{new Date(allergy.onsetDate).toLocaleDateString()}</span>
                </div>
              )}
              {allergy.lastReactionDate && (
                <div>
                  <span className="font-medium text-gray-700">Last Reaction:</span>{' '}
                  <span className="text-gray-900">{new Date(allergy.lastReactionDate).toLocaleDateString()}</span>
                </div>
              )}
            </div>
            
            {/* Source Information */}
            <div className="text-xs text-gray-500 pt-2 border-t mt-2">
              <div className="flex items-center gap-2">
                <FileText className="h-3 w-3" />
                <span>
                  Source: {allergy.sourceType.replace(/_/g, ' ')} 
                  ({Math.round(parseFloat(allergy.sourceConfidence) * 100)}% confidence)
                </span>
              </div>
              {allergy.sourceNotes && (
                <p className="mt-1 text-gray-600">{allergy.sourceNotes}</p>
              )}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  };

  if (isLoading) {
    return (
      <Card className={`emr-card ${className}`}>
        <CardHeader className="emr-card-header">
          <CardTitle className="emr-section-title">Allergies</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">Loading allergies...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={`emr-card ${className}`}>
        <CardHeader className="emr-card-header">
          <CardTitle className="emr-section-title">Allergies</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-500">Error loading allergies</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`emr-card ${className}`} data-median="allergy-section-card">
      <CardHeader className="emr-card-header" data-median="allergy-header">
        <div className="flex items-center justify-between">
          <Dialog open={isCreating} onOpenChange={setIsCreating}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="emr-button-compact" data-median="add-allergy-button">
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl" data-median="add-allergy-dialog">
              <DialogHeader>
                <DialogTitle>Add New Allergy</DialogTitle>
              </DialogHeader>
              <AllergyForm
                onSubmit={(data) => createMutation.mutate({ ...data, patientId })}
                onCancel={() => setIsCreating(false)}
                isLoading={createMutation.isPending}
              />
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className={isDenseView ? "emr-card-content" : "emr-card-content space-y-3"}>
        {activeAllergies.length === 0 ? (
          <div className="text-center py-6 text-gray-500">
            <Shield className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">No allergies documented</p>
            <p className="text-xs text-gray-400 mt-1">
              Add allergies manually or they will be extracted from clinical notes
            </p>
          </div>
        ) : (
          <div className={isDenseView ? "dense-list-container" : "space-y-3"}>
            {isDenseView ? (
              activeAllergies.map(renderAllergyDenseList)
            ) : (
              activeAllergies.map((allergy: AllergyEntry) => (
                <Collapsible
                  key={allergy.id}
                  open={openCards[allergy.id]}
                  onOpenChange={() => toggleCard(allergy.id)}
                >
                  <Card className="emr-nested-card group hover:shadow-sm transition-shadow">
                    <CollapsibleTrigger asChild>
                      <CardHeader className="emr-card-header-nested cursor-pointer">
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-3">
                            {openCards[allergy.id] ? (
                              <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                            )}
                            <div className="flex items-center gap-2">
                              {getAllergyTypeIcon(allergy.allergyType)}
                              <span className="font-medium text-sm">{allergy.allergen}</span>
                              {allergy.severity && (
                                <Badge className={`text-xs ${getSeverityBadgeColor(allergy.severity)}`}>
                                  {allergy.severity}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {getSourceBadge(allergy)}
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                              <Dialog open={editingAllergy?.id === allergy.id} onOpenChange={(open) => !open && setEditingAllergy(null)}>
                                <DialogTrigger asChild>
                                  <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    className="h-6 w-6 p-0"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingAllergy(allergy);
                                    }}
                                  >
                                    <Edit2 className="h-3 w-3" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl">
                                  <DialogHeader>
                                    <DialogTitle>Edit Allergy</DialogTitle>
                                  </DialogHeader>
                                  <AllergyForm
                                    allergy={allergy}
                                    onSubmit={(data) => updateMutation.mutate({ id: allergy.id, ...data })}
                                    onCancel={() => setEditingAllergy(null)}
                                    isLoading={updateMutation.isPending}
                                  />
                                </DialogContent>
                              </Dialog>
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (window.confirm(`Delete allergy to ${allergy.allergen}?`)) {
                                    deleteMutation.mutate(allergy.id);
                                  }
                                }}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                        {allergy.reaction && (
                          <div className="ml-7 text-xs text-gray-600 mt-1">
                            {allergy.reaction}
                          </div>
                        )}
                      </CardHeader>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent>
                      <CardContent className="emr-card-content-nested pt-0">
                        <div className="space-y-4">
                          {/* Allergy Details */}
                          <div className="grid grid-cols-2 gap-4 text-xs">
                            <div>
                              <span className="font-medium text-gray-700">Type:</span>{' '}
                              <span className="text-gray-900">{allergy.allergyType || 'Not specified'}</span>
                            </div>
                            <div>
                              <span className="font-medium text-gray-700">Status:</span>{' '}
                              <span className="text-gray-900">{allergy.status}</span>
                            </div>
                            {allergy.onsetDate && (
                              <div>
                                <span className="font-medium text-gray-700">Onset:</span>{' '}
                                <span className="text-gray-900">{new Date(allergy.onsetDate).toLocaleDateString()}</span>
                              </div>
                            )}
                            {allergy.lastReactionDate && (
                              <div>
                                <span className="font-medium text-gray-700">Last Reaction:</span>{' '}
                                <span className="text-gray-900">{new Date(allergy.lastReactionDate).toLocaleDateString()}</span>
                              </div>
                            )}
                          </div>

                          {/* Drug Class and Cross-Reactivity */}
                          {(allergy.drugClass || (allergy.crossReactivity && allergy.crossReactivity.length > 0)) && (
                            <div className="space-y-2">
                              {allergy.drugClass && (
                                <div className="text-xs">
                                  <span className="font-medium text-gray-700">Drug Class:</span>{' '}
                                  <Badge variant="outline" className="text-xs">{allergy.drugClass}</Badge>
                                </div>
                              )}
                              {allergy.crossReactivity && allergy.crossReactivity.length > 0 && (
                                <div className="text-xs">
                                  <span className="font-medium text-gray-700">Cross-Reactivity:</span>{' '}
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {allergy.crossReactivity.map((item, index) => (
                                      <Badge key={index} variant="secondary" className="text-xs">{item}</Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Visit History */}
                          {allergy.visitHistory && allergy.visitHistory.length > 0 && (
                            <div className="space-y-2">
                              <h4 className="text-xs font-medium text-gray-700 flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Visit History ({allergy.visitHistory.length})
                              </h4>
                              <div className="space-y-2 max-h-40 overflow-y-auto">
                                {allergy.visitHistory.map((visit, index) => (
                                  <div key={index} className="emr-nested-item text-xs border-l-2 border-gray-200 pl-3">
                                    <div className="flex items-center justify-between">
                                      <span className="font-medium">{visit.date}</span>
                                      <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="text-xs">
                                          {visit.source}
                                        </Badge>
                                        {visit.confidence && (
                                          <span className="text-gray-500">{Math.round(visit.confidence * 100)}%</span>
                                        )}
                                      </div>
                                    </div>
                                    <p className="text-gray-600 mt-1">{visit.notes}</p>
                                    {visit.changesMade && visit.changesMade.length > 0 && (
                                      <div className="flex flex-wrap gap-1 mt-1">
                                        {visit.changesMade.map((change, changeIndex) => (
                                          <Badge key={changeIndex} variant="secondary" className="text-xs">
                                            {change.replace(/_/g, ' ')}
                                          </Badge>
                                        ))}
                                      </div>
                                    )}
                                    {visit.conflictResolution && (
                                      <div className="mt-1 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                                        <strong>Conflict Resolution:</strong> {visit.conflictResolution}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Source Information */}
                          <div className="text-xs text-gray-500 pt-2 border-t">
                            <div className="flex items-center gap-2">
                              <FileText className="h-3 w-3" />
                              <span>
                                Source: {allergy.sourceType.replace(/_/g, ' ')} 
                                ({Math.round(parseFloat(allergy.sourceConfidence) * 100)}% confidence)
                              </span>
                            </div>
                            {allergy.sourceNotes && (
                              <p className="mt-1 text-gray-600">{allergy.sourceNotes}</p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              ))
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Allergy Form Component
interface AllergyFormProps {
  allergy?: AllergyEntry;
  onSubmit: (data: any) => void;
  onCancel: () => void;
  isLoading: boolean;
}

function AllergyForm({ allergy, onSubmit, onCancel, isLoading }: AllergyFormProps) {
  const [formData, setFormData] = useState({
    allergen: allergy?.allergen || '',
    reaction: allergy?.reaction || '',
    severity: allergy?.severity || '',
    allergyType: allergy?.allergyType || '',
    status: allergy?.status || 'active',
    verificationStatus: allergy?.verificationStatus || 'unconfirmed',
    onsetDate: allergy?.onsetDate || '',
    lastReactionDate: allergy?.lastReactionDate || '',
    drugClass: allergy?.drugClass || '',
    sourceNotes: allergy?.sourceNotes || ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.allergen.trim()) return;
    
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="allergen">Allergen *</Label>
          <Input
            id="allergen"
            value={formData.allergen}
            onChange={(e) => setFormData(prev => ({ ...prev, allergen: e.target.value }))}
            placeholder="e.g., Penicillin, Shellfish, Latex"
            required
          />
        </div>
        <div>
          <Label htmlFor="allergyType">Type</Label>
          <Select 
            value={formData.allergyType} 
            onValueChange={(value) => setFormData(prev => ({ ...prev, allergyType: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {ALLERGY_TYPES.map(type => (
                <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="reaction">Reaction</Label>
        <Textarea
          id="reaction"
          value={formData.reaction}
          onChange={(e) => setFormData(prev => ({ ...prev, reaction: e.target.value }))}
          placeholder="e.g., rash, hives, difficulty breathing"
          rows={2}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="severity">Severity</Label>
          <Select 
            value={formData.severity} 
            onValueChange={(value) => setFormData(prev => ({ ...prev, severity: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select severity" />
            </SelectTrigger>
            <SelectContent>
              {SEVERITY_LEVELS.map(level => (
                <SelectItem key={level.value} value={level.value}>{level.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="status">Status</Label>
          <Select 
            value={formData.status} 
            onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map(status => (
                <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="onsetDate">Onset Date</Label>
          <Input
            id="onsetDate"
            type="date"
            value={formData.onsetDate}
            onChange={(e) => setFormData(prev => ({ ...prev, onsetDate: e.target.value }))}
          />
        </div>
        <div>
          <Label htmlFor="lastReactionDate">Last Reaction Date</Label>
          <Input
            id="lastReactionDate"
            type="date"
            value={formData.lastReactionDate}
            onChange={(e) => setFormData(prev => ({ ...prev, lastReactionDate: e.target.value }))}
          />
        </div>
      </div>

      {formData.allergyType === 'drug' && (
        <div>
          <Label htmlFor="drugClass">Drug Class</Label>
          <Input
            id="drugClass"
            value={formData.drugClass}
            onChange={(e) => setFormData(prev => ({ ...prev, drugClass: e.target.value }))}
            placeholder="e.g., penicillins, sulfonamides, NSAIDs"
          />
        </div>
      )}

      <div>
        <Label htmlFor="sourceNotes">Notes</Label>
        <Textarea
          id="sourceNotes"
          value={formData.sourceNotes}
          onChange={(e) => setFormData(prev => ({ ...prev, sourceNotes: e.target.value }))}
          placeholder="Additional notes about this allergy"
          rows={2}
        />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading || !formData.allergen.trim()}>
          {isLoading ? 'Saving...' : (allergy ? 'Update' : 'Create')} Allergy
        </Button>
      </div>
    </form>
  );
}