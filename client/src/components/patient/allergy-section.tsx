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

  console.log(`🚨 [AllergySection] Query state:`, {
    isLoading,
    hasError: !!error,
    dataLength: allergies.length,
    enabled: !!patientId,
    queryKey: ['/api/allergies', patientId]
  });

  console.log(`🚨 [AllergySection] Allergy data:`, allergies);

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

  const getSourceBadgeColor = (sourceType: string) => {
    switch (sourceType) {
      case 'attachment_extracted': return 'bg-blue-100 text-blue-800';
      case 'soap_derived': return 'bg-green-100 text-green-800';
      case 'manual_entry': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
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
    <Card className={`emr-card ${className}`}>
      <CardHeader className="emr-card-header">
        <div className="flex items-center justify-between">
          <Dialog open={isCreating} onOpenChange={setIsCreating}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="emr-button-compact">
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
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
      <CardContent className="emr-card-content space-y-3">
        {allergies.length === 0 ? (
          <div className="text-center py-6 text-gray-500">
            <Shield className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">No allergies documented</p>
            <p className="text-xs text-gray-400 mt-1">
              Add allergies manually or they will be extracted from clinical notes
            </p>
          </div>
        ) : (
          allergies.map((allergy: AllergyEntry) => (
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
                        <Badge 
                          variant="secondary" 
                          className={`text-xs ${getSourceBadgeColor(allergy.sourceType)}`}
                        >
                          {allergy.sourceConfidence && `${Math.round(parseFloat(allergy.sourceConfidence) * 100)}%`}
                        </Badge>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                          <Dialog>
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