/**
 * Enhanced Medications List Component
 * Mirrors the medical problems list architecture for consistency
 */

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Plus, 
  Pill, 
  Calendar, 
  User, 
  AlertTriangle, 
  ChevronDown, 
  ChevronRight,
  Clock,
  Shield,
  Activity,
  FileText,
  Edit,
  Zap,
  ArrowRight,
  Layers,
  FolderOpen
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { FastMedicationIntelligence } from './fast-medication-intelligence';
import { useDenseView } from '@/hooks/use-dense-view';
import { useLocation } from 'wouter';
import { useNavigationContext } from '@/hooks/use-navigation-context';

// Helper function to format dates without timezone issues
const formatDate = (dateString?: string | null) => {
  if (!dateString) return 'N/A';
  
  // Handle YYYY-MM-DD format dates to avoid timezone conversion
  if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [year, month, day] = dateString.split('-').map(Number);
    const localDate = new Date(year, month - 1, day);
    return localDate.toLocaleDateString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: '2-digit'
    });
  }
  
  // For other date formats, use regular parsing
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: '2-digit'
  });
};

interface Medication {
  id: number;
  medicationName: string;
  genericName?: string;
  brandName?: string;
  dosage: string;
  strength?: string;
  dosageForm?: string;
  route?: string;
  frequency: string;
  quantity?: number;
  daysSupply?: number;
  refillsRemaining?: number;
  sig?: string;
  clinicalIndication?: string;
  problemMappings: any[];
  startDate: string;
  endDate?: string;
  discontinuedDate?: string;
  status: 'active' | 'discontinued' | 'held' | 'historical' | 'pending';
  prescriber?: string;
  rxNormCode?: string;
  ndcCode?: string;
  medicationHistory: any[];
  changeLog: any[];
  groupingStrategy?: string;
  relatedMedications: any[];
  drugInteractions: any[];
  priorAuthRequired?: boolean;
  insuranceAuthStatus?: string;
  // Source tracking fields
  sourceType?: string;
  sourceConfidence?: string;
  visitHistory?: any[];
  extractedFromAttachmentId?: number;
  createdAt: string;
  updatedAt: string;
}

interface MedicationResponse {
  medications: Medication[];
  groupedByStatus: {
    active: Medication[];
    pending: Medication[];
    discontinued: Medication[];
    held: Medication[];
    historical: Medication[];
  };
  summary: {
    total: number;
    active: number;
    pending: number;
    discontinued: number;
    held: number;
    historical: number;
  };
}

interface EnhancedMedicationsListProps {
  patientId: number;
  encounterId?: number;
  readOnly?: boolean;
}

// Intelligent Add Medication Form Component (defined first for proper scope)
interface IntelligentAddMedicationFormProps {
  onSubmit: (data: any) => void;
  onCancel: () => void;
  isLoading: boolean;
}

const IntelligentAddMedicationForm: React.FC<IntelligentAddMedicationFormProps> = ({ onSubmit, onCancel, isLoading }) => {
  const [medicationName, setMedicationName] = useState('');
  const [clinicalIndication, setClinicalIndication] = useState('');
  const [formData, setFormData] = useState({
    dosage: '',
    form: '',
    routeOfAdministration: '',
    sig: '',
    quantity: 30,
    refills: 2,
    daysSupply: 90,
  });

  const handleIntelligentUpdate = (updates: any) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!medicationName.trim()) return;

    // Submit with enhanced medication format
    onSubmit({
      medicationName: medicationName.trim(),
      dosage: formData.dosage,
      frequency: extractFrequencyFromSig(formData.sig),
      route: formData.routeOfAdministration,
      dosageForm: formData.form,
      quantity: formData.quantity,
      daysSupply: formData.daysSupply,
      refills: formData.refills,
      sig: formData.sig,
      clinicalIndication: clinicalIndication.trim() || null,
      startDate: new Date().toISOString().split('T')[0],
      status: 'active',
    });
  };

  // Extract frequency from sig for backwards compatibility
  const extractFrequencyFromSig = (sig: string): string => {
    if (sig.includes('once daily') || sig.includes('daily')) return 'once daily';
    if (sig.includes('twice daily') || sig.includes('twice a day')) return 'twice daily';
    if (sig.includes('three times daily') || sig.includes('three times a day')) return 'three times daily';
    if (sig.includes('four times daily') || sig.includes('four times a day')) return 'four times daily';
    if (sig.includes('every 6 hours')) return 'every 6 hours';
    if (sig.includes('every 8 hours')) return 'every 8 hours';
    if (sig.includes('every 12 hours')) return 'every 12 hours';
    if (sig.includes('as needed')) return 'as needed';
    return 'once daily'; // default
  };

  return (
    <Card className="border-navy-blue-200 dark:border-navy-blue-800">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Zap className="h-4 w-4 text-navy-blue-600" />
          Add New Medication (AI-Powered)
        </CardTitle>
        <p className="text-sm text-gray-600">
          Enter medication name to activate intelligent dosing with preloaded data and auto-generated instructions
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Medication Name Input */}
          <div>
            <Label htmlFor="medicationName">Medication Name *</Label>
            <Input
              id="medicationName"
              value={medicationName}
              onChange={(e) => setMedicationName(e.target.value)}
              placeholder="e.g., Lisinopril, Hydrochlorothiazide, Metformin"
              required
            />
            <div className="text-xs text-gray-500 mt-1">
              Enter generic name only - intelligent dosing will activate automatically
            </div>
          </div>

          {/* Fast Medication Intelligence - Only shows when medication name is entered */}
          {medicationName.trim() && (
            <div className="border border-navy-blue-200 rounded-lg p-4 bg-navy-blue-50/50">
              <FastMedicationIntelligence
                medicationName={medicationName}
                initialStrength={formData.dosage}
                initialForm={formData.form}
                initialRoute={formData.routeOfAdministration}
                initialSig={formData.sig}
                initialQuantity={formData.quantity}
                initialRefills={formData.refills}
                initialDaysSupply={formData.daysSupply}
                onChange={handleIntelligentUpdate}
              />
            </div>
          )}

          {/* Clinical Indication */}
          <div>
            <Label htmlFor="clinicalIndication">Clinical Indication</Label>
            <Input
              id="clinicalIndication"
              value={clinicalIndication}
              onChange={(e) => setClinicalIndication(e.target.value)}
              placeholder="e.g., Hypertension, Type 2 Diabetes"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading || !medicationName.trim() || !formData.dosage}
              className="bg-navy-blue-600 hover:bg-navy-blue-700"
            >
              {isLoading ? 'Adding...' : 'Add Medication'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export function EnhancedMedicationsList({ patientId, encounterId, readOnly = false }: EnhancedMedicationsListProps) {
  const [isAddingMedication, setIsAddingMedication] = useState(false);
  const [expandedMedications, setExpandedMedications] = useState<Set<number>>(new Set());
  const [activeStatusTab, setActiveStatusTab] = useState<'current' | 'discontinued' | 'held' | 'historical'>('current');
  const [groupingMode, setGroupingMode] = useState<'medical_problem' | 'alphabetical'>('medical_problem');
  const { toast } = useToast();
  const { isDenseView } = useDenseView();
  
  // Navigation context for source badge navigation
  const [location] = useLocation();
  const { navigateWithContext } = useNavigationContext();
  const mode = location.includes('/nurses/chart') ? 'nursing-chart' : 'patient-chart';

  // Standardized source badge function matching other chart sections
  const getSourceBadge = (sourceType?: string, sourceConfidence?: string, attachmentId?: number, encounterId?: number) => {
    if (!sourceType) return null;
    
    switch (sourceType) {
      case "encounter":
      case "soap_derived": {
        const confidencePercent = sourceConfidence ? Math.round(parseFloat(sourceConfidence) * 100) : 0;
        const handleEncounterClick = () => {
          if (encounterId) {
            navigateWithContext(`/patients/${patientId}/encounters/${encounterId}`, "medications", mode);
          }
        };
        return (
          <Badge 
            variant="default" 
            className="text-xs cursor-pointer hover:bg-navy-blue-600 dark:hover:bg-navy-blue-400 transition-colors bg-navy-blue-100 text-navy-blue-800 border-navy-blue-200"
            onClick={handleEncounterClick}
            title={`Click to view encounter details (Encounter #${encounterId})`}
          >
            Note {confidencePercent}%
          </Badge>
        );
      }
      case "attachment":
      case "attachment_extracted":
      case "pdf_extract": {
        const confidencePercent = sourceConfidence ? Math.round(parseFloat(sourceConfidence) * 100) : 0;
        const handleAttachmentClick = () => {
          if (attachmentId) {
            navigateWithContext(`/patients/${patientId}/chart?section=attachments&highlight=${attachmentId}`, "medications", mode);
          }
        };
        return (
          <Badge 
            variant="secondary" 
            className="text-xs cursor-pointer hover:bg-amber-600 dark:hover:bg-amber-400 transition-colors bg-amber-100 text-amber-800 border-amber-200"
            onClick={handleAttachmentClick}
            title={`Click to view source document (${confidencePercent}% confidence)`}
          >
            MR {confidencePercent}%
          </Badge>
        );
      }
      case "manual":
      case "manual_entry": {
        return (
          <Badge 
            variant="outline" 
            className="text-xs bg-gray-50 text-gray-700 border-gray-300"
            title="Manually entered"
          >
            Manual
          </Badge>
        );
      }
      default:
        return null;
    }
  };

  // Fetch medications with enhanced data - with aggressive refetching for real-time updates
  const { data: medicationData, isLoading, error } = useQuery({
    queryKey: ['enhanced-medications', patientId],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/patients/${patientId}/medications-enhanced`);
      return await response.json();
    },
    refetchInterval: 2000, // Poll every 2 seconds for order changes
    refetchIntervalInBackground: true,
    staleTime: 0 // Always consider data stale for fresh updates
  });

  // Create medication mutation (updated to use new chart medication endpoint)
  const createMedication = useMutation({
    mutationFn: async (data: any) => {
      console.log('💊 [Frontend] Creating chart medication with data:', data);
      const response = await apiRequest('POST', `/api/patients/${patientId}/chart-medications`, data);
      const result = await response.json();
      console.log('💊 [Frontend] Chart medication response:', result);
      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['enhanced-medications', patientId] });
      setIsAddingMedication(false);
      
      if (data.success) {
        toast({
          title: "Medication Added",
          description: `${data.medication.medicationName} has been added to the patient's medication list.`,
        });
      } else if (data.duplicateDetected) {
        toast({
          title: "Duplicate Detected",
          description: data.reasoning,
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      console.error('💊 [Frontend] Error creating medication:', error);
      toast({
        title: "Error",
        description: "Failed to add medication. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update medication mutation
  const updateMedication = useMutation({
    mutationFn: async (medicationData: any) => {
      const response = await apiRequest('PUT', `/api/medications/${medicationData.id}`, medicationData);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enhanced-medications', patientId] });
      toast({
        title: "Medication Updated",
        description: "Medication has been successfully updated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update medication. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Discontinue medication mutation
  const discontinueMedication = useMutation({
    mutationFn: async ({ medicationId, reason }: { medicationId: number; reason: string }) => {
      const response = await apiRequest('PUT', `/api/medications/${medicationId}`, { 
        status: 'discontinued',
        discontinuedDate: new Date().toISOString().split('T')[0],
        discontinueReason: reason
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enhanced-medications', patientId] });
      toast({
        title: "Medication Discontinued",
        description: "Medication has been discontinued.",
      });
    },
    onError: () => {
      toast({
        title: "Error", 
        description: "Failed to discontinue medication. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Move to Orders mutation
  const moveToOrders = useMutation({
    mutationFn: async ({ medicationId, encounterId }: { medicationId: number; encounterId: number }) => {
      console.log('📋 [Frontend] Moving medication to orders:', { medicationId, encounterId });
      const response = await apiRequest('POST', `/api/medications/${medicationId}/move-to-orders`, { encounterId });
      const result = await response.json();
      console.log('📋 [Frontend] Move to orders response:', result);
      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['enhanced-medications', patientId] });
      queryClient.invalidateQueries({ queryKey: ['draft-orders', patientId] });
      
      if (data.success) {
        toast({
          title: "Added to Orders",
          description: `${data.draftOrder.medicationName} refill has been added to draft orders.`,
        });
      }
    },
    onError: (error: any) => {
      console.error('📋 [Frontend] Error moving medication to orders:', error);
      toast({
        title: "Error",
        description: "Failed to move medication to orders. Please try again.",
        variant: "destructive",
      });
    },
  });

  const toggleMedicationExpanded = (medicationId: number) => {
    setExpandedMedications(prev => {
      const newSet = new Set(prev);
      if (newSet.has(medicationId)) {
        newSet.delete(medicationId);
      } else {
        newSet.add(medicationId);
      }
      return newSet;
    });
  };

  // Convert medical conditions to physician-friendly abbreviations
  const getPhysicianAbbreviation = (condition: string): string => {
    const abbreviations: Record<string, string> = {
      'hypertension': 'HTN',
      'diabetes': 'DM2',
      'type 2 diabetes': 'DM2',
      'type 2 diabetes mellitus': 'DM2',
      'type 2 diabetes mellitus, poorly controlled': 'DM2',
      'diabetes mellitus type 2': 'DM2',
      'type 1 diabetes': 'DM1',
      'hyperlipidemia': 'HLD',
      'dyslipidemia': 'HLD',
      'coronary artery disease': 'CAD',
      'coronary artery disease with prior myocardial infarction': 'CAD',
      'congestive heart failure': 'CHF',
      'congestive heart failure with reduced ejection fraction': 'CHF',
      'heart failure': 'CHF',
      'atrial fibrillation': 'AFib',
      'atrial fibrillation on chronic anticoagulation': 'AFib',
      'chronic kidney disease': 'CKD',
      'chronic kidney disease stage 3': 'CKD3',
      'chronic obstructive pulmonary disease': 'COPD',
      'gastroesophageal reflux disease': 'GERD',
      'deep vein thrombosis': 'DVT',
      'history of deep vein thrombosis': 'h/o DVT',
      'history of deep vein thrombosis (2006)': 'h/o DVT',
      'pulmonary embolism': 'PE',
      'myocardial infarction': 'MI',
      'stroke': 'CVA',
      'transient ischemic attack': 'TIA',
      'peripheral artery disease': 'PAD',
      'secondary prevention': 'prev',
      'anticoagulation': 'AC',
      'history of': 'h/o'
    };
    
    const lowerCondition = condition.toLowerCase();
    
    // Check for exact matches first
    if (abbreviations[lowerCondition]) {
      return abbreviations[lowerCondition];
    }
    
    // Handle complex conditions with multiple parts
    if (lowerCondition.includes('atrial fibrillation')) {
      return 'AFib';
    }
    
    if (lowerCondition.includes('coronary artery disease')) {
      return 'CAD';
    }
    
    if (lowerCondition.includes('congestive heart failure')) {
      return 'CHF';
    }
    
    // Check for partial matches with "history of"
    if (lowerCondition.includes('history of')) {
      const baseCondition = lowerCondition.replace(/history of\s*/, '').replace(/\s*\(\d{4}\)/, '').trim();
      if (abbreviations[baseCondition]) {
        return `h/o ${abbreviations[baseCondition]}`;
      }
      return 'h/o';
    }
    
    // Check for stage indicators
    if (lowerCondition.includes('stage 3') && (lowerCondition.includes('kidney') || lowerCondition.includes('ckd'))) {
      return 'CKD3';
    }
    
    // Check for poorly controlled diabetes
    if (lowerCondition.includes('diabetes') && lowerCondition.includes('poorly controlled')) {
      return 'DM2';
    }
    
    // Check for anticoagulation mentions
    if (lowerCondition.includes('anticoagulation')) {
      return 'AC';
    }
    
    // Fallback to original condition if no abbreviation found
    return condition;
  };

  // Dense list rendering for compact view with side category
  const renderMedicationDenseList = (medication: Medication, categoryAbbr: string, isFirstInGroup: boolean, isLastInGroup: boolean) => {
    const statusColor = medication.status === 'active' ? 'border-green-300' : 
                       medication.status === 'pending' ? 'border-navy-blue-300' :
                       medication.status === 'held' ? 'border-amber-300' :
                       medication.status === 'discontinued' ? 'border-gray-300' : 'border-gray-300';
    
    return (
      <div className="flex items-start gap-2">
        <div className="flex-1">
          <Collapsible
            key={medication.id}
            open={expandedMedications.has(medication.id)}
            onOpenChange={() => toggleMedicationExpanded(medication.id)}
          >
            <CollapsibleTrigger asChild>
              <div className={`dense-list-item group ${statusColor} dense-view-transition flex`}>
                {/* Grouping indicator with tooltip */}
                <div className={`w-6 flex-shrink-0 flex items-center justify-center ${
                  groupingMode === 'medical_problem' && !isFirstInGroup && !isLastInGroup ? 'medication-group-line' : 
                  groupingMode === 'medical_problem' && isFirstInGroup ? 'medication-group-line first-in-group' :
                  groupingMode === 'medical_problem' && isLastInGroup ? 'medication-group-line last-in-group' : ''
                }`}>
                  {isFirstInGroup && groupingMode === 'medical_problem' && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="cursor-help text-gray-400 hover:text-gray-600 transition-colors z-10 relative">
                            <Layers className="h-3 w-3" />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-xs">
                          <p className="text-xs font-medium">{medication.clinicalIndication || 'No indication specified'}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
                
                <div className="dense-list-content flex-1">
                  {expandedMedications.has(medication.id) ? (
                    <ChevronDown className="h-3 w-3 text-gray-400 flex-shrink-0" />
                  ) : (
                    <ChevronRight className="h-3 w-3 text-gray-400 flex-shrink-0" />
                  )}
                  
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Pill className="h-3 w-3 text-navy-blue-500 flex-shrink-0" />
                    <span className="dense-list-primary">{medication.medicationName}</span>
                    <span className="dense-list-secondary">{medication.dosage}</span>
                    
                    <Badge variant="outline" className={`dense-list-badge ${
                      medication.status === 'active' ? 'text-green-700 bg-green-50' :
                      medication.status === 'pending' ? 'text-navy-blue-700 bg-navy-blue-50' :
                      medication.status === 'held' ? 'text-amber-700 bg-amber-50' :
                      'text-gray-700 bg-gray-50'
                    }`}>
                      {medication.status}
                    </Badge>
                    
                    {/* Source badge for dense view */}
                    {getSourceBadge(
                      medication.sourceType, 
                      medication.sourceConfidence, 
                      medication.extractedFromAttachmentId,
                      medication.visitHistory && medication.visitHistory[0]?.encounterId
                    )}
                  </div>

                  {!readOnly && (
                    <div className="dense-list-actions">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          // Add edit functionality here
                        }}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </CollapsibleTrigger>
            
            <CollapsibleContent>
              <div className="dense-list-expanded ml-12">
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <strong>Frequency:</strong> {medication.frequency}
                  </div>
                  {medication.strength && (
                    <div>
                      <strong>Strength:</strong> {medication.strength}
                    </div>
                  )}
                  {medication.prescriber && (
                    <div>
                      <strong>Prescriber:</strong> {medication.prescriber}
                    </div>
                  )}
                  {medication.startDate && (
                    <div>
                      <strong>Start Date:</strong> {formatDate(medication.startDate)}
                    </div>
                  )}
                  {medication.sig && (
                    <div className="col-span-2">
                      <strong>Instructions:</strong> {medication.sig}
                    </div>
                  )}
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        {/* Move to Orders button outside accordion */}
        {!readOnly && !!encounterId && (
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0 bg-navy-blue-50 border-navy-blue-200 hover:bg-navy-blue-100 flex-shrink-0"
            onClick={() => moveToOrders.mutate({ medicationId: medication.id, encounterId })}
            title="Move to Orders"
          >
            <ArrowRight className="h-3 w-3 text-navy-blue-600" />
          </Button>
        )}
      </div>
    );
  };

  // Filter medications by active status tab
  const currentMedications = activeStatusTab === 'current' 
    ? [
        ...((medicationData as MedicationResponse)?.groupedByStatus?.active || []),
        ...((medicationData as MedicationResponse)?.groupedByStatus?.pending || [])
      ]
    : ((medicationData as MedicationResponse)?.groupedByStatus?.[activeStatusTab] || []);

  // Group medications based on grouping mode
  const groupedMedications = currentMedications.reduce((groups: Record<string, Medication[]>, medication: Medication) => {
    let groupKey = 'Ungrouped';
    
    if (groupingMode === 'medical_problem') {
      groupKey = medication.clinicalIndication || 'No indication specified';
    } else if (groupingMode === 'alphabetical') {
      groupKey = medication.medicationName.charAt(0).toUpperCase();
    }
    
    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(medication);
    return groups;
  }, {});

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <div className="text-gray-500">Loading medications...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Failed to load medications. Please try again.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-1 emr-compact-header">
        <div className="emr-tight-spacing">
          {/* Controls Row - Guaranteed to stay within card bounds */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2 min-w-0 flex-1">
              <Select value={groupingMode} onValueChange={(value: any) => setGroupingMode(value)}>
                <SelectTrigger className="w-full sm:w-40 min-w-[140px] max-w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="medical_problem">By Medical Problem</SelectItem>
                  <SelectItem value="alphabetical">Alphabetical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {!readOnly && (
              <div className="flex-shrink-0">
                <Button 
                  onClick={() => setIsAddingMedication(true)}
                  size="sm"
                  className="flex items-center gap-1 w-full sm:w-auto min-w-[100px]"
                >
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Add Medication</span>
                  <span className="sm:hidden">Add</span>
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="emr-card-content-proportional emr-space-y-tight">
        {/* Status Tabs */}
        <Tabs value={activeStatusTab} onValueChange={(value: any) => setActiveStatusTab(value)}>
          <TabsList className="grid w-full grid-cols-4 h-auto medication-tabs emr-element-gap-tight">
            <TabsTrigger value="current" className="medication-tab-trigger flex flex-col items-center gap-0.5 text-xs leading-tight">
              <Activity className="h-3 w-3 flex-shrink-0" />
              <span className="medication-tab-text">Current</span>
              <span className="text-[10px] opacity-70 leading-none">({((medicationData as MedicationResponse)?.summary.active || 0) + ((medicationData as MedicationResponse)?.summary.pending || 0)})</span>
            </TabsTrigger>
            <TabsTrigger value="discontinued" className="medication-tab-trigger flex flex-col items-center gap-0.5 text-xs leading-tight">
              <Clock className="h-3 w-3 flex-shrink-0" />
              <span className="medication-tab-text">Disc.</span>
              <span className="text-[10px] opacity-70 leading-none">({(medicationData as MedicationResponse)?.summary.discontinued || 0})</span>
            </TabsTrigger>
            <TabsTrigger value="held" className="flex flex-col items-center gap-0.5 p-1.5 text-xs leading-tight">
              <AlertTriangle className="h-3 w-3 flex-shrink-0" />
              <span className="truncate max-w-full">Held</span>
              <span className="text-[10px] opacity-70 leading-none">({(medicationData as MedicationResponse)?.summary.held || 0})</span>
            </TabsTrigger>
            <TabsTrigger value="historical" className="flex flex-col items-center gap-0.5 p-1.5 text-xs leading-tight">
              <FileText className="h-3 w-3 flex-shrink-0" />
              <span className="truncate max-w-full">History</span>
              <span className="text-[10px] opacity-70 leading-none">({(medicationData as MedicationResponse)?.summary.historical || 0})</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeStatusTab} className="mt-4">
            {currentMedications.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Pill className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No {activeStatusTab} medications found</p>
                {activeStatusTab === 'current' && !readOnly && (
                  <Button 
                    onClick={() => setIsAddingMedication(true)}
                    variant="outline" 
                    className="mt-2"
                  >
                    Add First Medication
                  </Button>
                )}
              </div>
            ) : (
              <div className={isDenseView ? "space-y-1" : "emr-ultra-tight-spacing"}>
                {Object.entries(groupedMedications).map(([groupName, medications]) => {
                  const categoryAbbr = getPhysicianAbbreviation(groupName);
                  
                  return (
                    <div key={groupName}>
                      {/* Only show traditional header for non-medical problem grouping or when not using side labels */}
                      {groupingMode !== 'medical_problem' && (
                        <h3 className="font-medium text-sm text-gray-700 dark:text-gray-300 emr-ultra-tight-spacing flex items-center emr-ultra-tight-gap">
                          <Zap className="h-3 w-3" />
                          {groupName}
                        </h3>
                      )}
                      
                      <div className={isDenseView ? "dense-list-container" : "emr-ultra-tight-spacing"}>
                        {medications.map((medication: Medication, index: number) => 
                          isDenseView ? 
                            renderMedicationDenseList(medication, categoryAbbr, index === 0, index === medications.length - 1) :
                            <div key={medication.id} className="flex items-start gap-2">
                              {/* Grouping indicator for regular view */}
                              {groupingMode === 'medical_problem' && (
                                <div className="w-6 flex-shrink-0 flex items-center justify-center">
                                  {index === 0 && (
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <div className="cursor-help text-gray-400 hover:text-gray-600 transition-colors">
                                            <Layers className="h-3 w-3" />
                                          </div>
                                        </TooltipTrigger>
                                        <TooltipContent side="right" className="max-w-xs">
                                          <p className="text-xs font-medium">{medication.clinicalIndication || 'No indication specified'}</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  )}
                                </div>
                              )}
                              
                              <div className="flex-1">
                                <MedicationCard
                                  key={medication.id}
                                  medication={medication}
                                  isExpanded={expandedMedications.has(medication.id)}
                                  onToggleExpanded={() => toggleMedicationExpanded(medication.id)}
                                  onDiscontinue={readOnly ? undefined : (reason: string) => 
                                    discontinueMedication.mutate({ medicationId: medication.id, reason })
                                  }
                                  onEdit={readOnly ? undefined : (medicationData) => 
                                    updateMedication.mutate(medicationData)
                                  }
                                  onMoveToOrders={undefined}
                                  canMoveToOrders={false}
                                  getSourceBadge={getSourceBadge}
                                />
                              </div>

                              {/* Move to Orders button outside accordion for regular view */}
                              {!readOnly && !!encounterId && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 w-8 p-0 bg-navy-blue-50 border-navy-blue-200 hover:bg-navy-blue-100 flex-shrink-0"
                                  onClick={() => moveToOrders.mutate({ medicationId: medication.id, encounterId })}
                                  title="Move to Orders"
                                >
                                  <ArrowRight className="h-3 w-3 text-navy-blue-600" />
                                </Button>
                              )}
                            </div>
                        )}
                      </div>
                      
                      {groupingMode === 'medical_problem' && Object.keys(groupedMedications).length > 1 && (
                        <Separator className={isDenseView ? "my-2" : "emr-ultra-tight-spacing"} />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Add Medication Form */}
        {isAddingMedication && (
          <IntelligentAddMedicationForm
            onSubmit={(medicationData) => createMedication.mutate(medicationData)}
            onCancel={() => setIsAddingMedication(false)}
            isLoading={createMedication.isPending}
          />
        )}
      </CardContent>
    </Card>
  );
}

interface MedicationCardProps {
  medication: Medication;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  onDiscontinue?: (reason: string) => void;
  onEdit?: (medicationData: any) => void;
  onMoveToOrders?: (medicationId: number) => void;
  canMoveToOrders?: boolean;
  getSourceBadge: (sourceType?: string, sourceConfidence?: string, attachmentId?: number, encounterId?: number) => JSX.Element | null;
}

function MedicationCard({ medication, isExpanded, onToggleExpanded, onDiscontinue, onEdit, onMoveToOrders, canMoveToOrders, getSourceBadge }: MedicationCardProps) {
  const [discontinueReason, setDiscontinueReason] = useState('');
  const [showDiscontinueForm, setShowDiscontinueForm] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editFormData, setEditFormData] = useState<any>(null);

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'pending': return 'outline';
      case 'discontinued': return 'secondary';
      case 'held': return 'outline';
      case 'historical': return 'secondary';
      default: return 'secondary';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <Activity className="h-3 w-3" />;
      case 'pending': return <Clock className="h-3 w-3 text-amber-500" />;
      case 'discontinued': return <Clock className="h-3 w-3" />;
      case 'held': return <AlertTriangle className="h-3 w-3" />;
      case 'historical': return <FileText className="h-3 w-3" />;
      default: return <Pill className="h-3 w-3" />;
    }
  };

  const getCardBorderColor = (status: string) => {
    switch (status) {
      case 'active': return 'border-l-green-500';
      case 'pending': return 'border-l-amber-500';
      case 'discontinued': return 'border-l-gray-400';
      case 'held': return 'border-l-red-500';
      case 'historical': return 'border-l-gray-300';
      default: return 'border-l-blue-500';
    }
  };

  const handleDiscontinue = () => {
    if (discontinueReason.trim() && onDiscontinue) {
      onDiscontinue(discontinueReason);
      setShowDiscontinueForm(false);
      setDiscontinueReason('');
    }
  };

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggleExpanded}>
      <Card className={`border-l-4 ${getCardBorderColor(medication.status)}`}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors emr-card-header-proportional">
            <div className="emr-ultra-tight-spacing">
              <div className="flex items-start justify-between emr-ultra-tight-gap">
                <div className="flex-1 min-w-0 pr-1">
                  <div className="emr-ultra-tight-spacing">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-medium leading-tight flex-1">
                        {medication.medicationName}
                        {medication.dosage && ` ${medication.dosage}`}
                        {medication.strength && medication.strength !== medication.dosage && ` ${medication.strength}`}
                      </h3>
                      {getSourceBadge(
                        medication.sourceType, 
                        medication.sourceConfidence, 
                        medication.extractedFromAttachmentId,
                        medication.visitHistory && medication.visitHistory[0]?.encounterId
                      )}
                    </div>
                    <div className="flex items-center emr-ultra-tight-gap flex-wrap">
                      {medication.brandName && medication.brandName !== medication.medicationName && (
                        <span className="text-sm text-gray-500">({medication.brandName})</span>
                      )}
                      <Badge variant={getStatusBadgeVariant(medication.status)} className="flex items-center gap-1 text-xs">
                        {getStatusIcon(medication.status)}
                        {medication.status}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-1 flex-shrink-0 flex-wrap max-w-[40%]">
                  {medication.drugInteractions?.length > 0 && (
                    <Badge variant="destructive" className="flex items-center gap-1 text-xs">
                      <AlertTriangle className="h-3 w-3" />
                      {medication.drugInteractions.length}
                    </Badge>
                  )}
                  {medication.priorAuthRequired && (
                    <Badge variant="outline" className="flex items-center gap-1 text-xs">
                      <Shield className="h-3 w-3" />
                      PA
                    </Badge>
                  )}
                  <Button variant="ghost" size="sm" className="ml-1">
                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="flex flex-wrap items-center emr-element-gap-normal emr-ultra-compact-content text-gray-600 dark:text-gray-300">
                <span className="font-medium">
                  {medication.sig || `${medication.dosage} ${medication.frequency}`}
                </span>
                {medication.startDate && (
                  <span className="flex items-center emr-element-gap-tight">
                    <Calendar className="h-3 w-3" />
                    Started {formatDate(medication.startDate)}
                  </span>
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="emr-card-content-proportional">
            <div className="grid grid-cols-1 md:grid-cols-2 emr-element-gap-normal emr-space-y-proportional">
              <div>
                <h4 className="font-medium mb-2">Prescription Details</h4>
                <div className="space-y-1 text-sm">
                  {medication.genericName && (
                    <div><span className="font-medium">Generic:</span> {medication.genericName}</div>
                  )}
                  {medication.strength && (
                    <div><span className="font-medium">Strength:</span> {medication.strength}</div>
                  )}
                  {medication.dosageForm && (
                    <div><span className="font-medium">Form:</span> {medication.dosageForm}</div>
                  )}
                  {medication.route && (
                    <div><span className="font-medium">Route:</span> {medication.route}</div>
                  )}
                  {medication.quantity && (
                    <div><span className="font-medium">Quantity:</span> {medication.quantity}</div>
                  )}
                  {medication.daysSupply && (
                    <div><span className="font-medium">Days Supply:</span> {medication.daysSupply}</div>
                  )}
                  {medication.refillsRemaining !== undefined && (
                    <div><span className="font-medium">Refills Remaining:</span> {medication.refillsRemaining}</div>
                  )}
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Clinical Information</h4>
                <div className="space-y-1 text-sm">
                  {medication.prescriber && (
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      <span className="font-medium">Prescriber:</span> {medication.prescriber}
                    </div>
                  )}
                  {medication.sig && (
                    <div><span className="font-medium">Instructions:</span> {medication.sig}</div>
                  )}
                  {medication.rxNormCode && (
                    <div><span className="font-medium">RxNorm:</span> {medication.rxNormCode}</div>
                  )}
                  {medication.ndcCode && (
                    <div><span className="font-medium">NDC:</span> {medication.ndcCode}</div>
                  )}
                </div>
              </div>
            </div>

            {/* Drug Interactions */}
            {medication.drugInteractions?.length > 0 && (
              <div className="mb-4">
                <h4 className="font-medium mb-2 text-red-600 dark:text-red-400">Drug Interactions</h4>
                <div className="space-y-2">
                  {medication.drugInteractions.map((interaction: any, index: number) => (
                    <Alert key={index} variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <div className="font-medium">{interaction.interactionType} interaction</div>
                        <div>{interaction.clinicalSignificance}</div>
                        {interaction.recommendation && (
                          <div className="mt-1 text-sm">{interaction.recommendation}</div>
                        )}
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              </div>
            )}

            {/* Visit History */}
            {medication.visitHistory && medication.visitHistory.length > 0 && (
              <div className="mb-4">
                <h4 className="font-medium mb-2">Visit History</h4>
                <div className="space-y-2 text-sm">
                  {medication.visitHistory.map((visit: any, index: number) => (
                    <div key={index} className="flex items-start gap-2">
                      <div className="flex-shrink-0 w-2 h-2 bg-navy-blue-500 rounded-full mt-1.5"></div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{formatDate(visit.encounterDate)}</span>
                          {visit.confidence && (
                            <Badge variant="outline" className="text-xs">
                              {Math.round(visit.confidence * 100)}%
                            </Badge>
                          )}
                        </div>
                        <div className="text-gray-600 dark:text-gray-400">
                          {visit.notes}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Edit Form */}
            {isEditMode && (
              <div className="mt-4 p-4 border border-navy-blue-200 rounded-lg bg-navy-blue-50/50">
                <h4 className="font-medium mb-3 text-navy-blue-800">Edit Medication</h4>
                <FastMedicationIntelligence
                  medicationName={medication.medicationName}
                  initialStrength={medication.strength || medication.dosage || ''}
                  initialForm={medication.dosageForm || ''}
                  initialRoute={medication.route || ''}
                  initialSig={medication.sig || ''}
                  initialQuantity={medication.quantity || 30}
                  initialRefills={medication.refillsRemaining || 2}
                  initialDaysSupply={medication.daysSupply || 90}
                  onChange={(updates) => {
                    // Store updates for saving
                    setEditFormData(updates);
                  }}
                />
                <div className="flex justify-end gap-2 mt-4">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setIsEditMode(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    size="sm"
                    onClick={() => {
                      if (onEdit && editFormData) {
                        onEdit({
                          id: medication.id,
                          ...editFormData
                        });
                      }
                      setIsEditMode(false);
                      setEditFormData(null);
                    }}
                  >
                    Save Changes
                  </Button>
                </div>
              </div>
            )}

            {/* Actions */}
            {(onEdit || onDiscontinue) && (medication.status === 'active' || medication.status === 'pending') && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                {!showDiscontinueForm && !isEditMode ? (
                  <div className="flex flex-wrap items-center gap-2">
                    {onEdit && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setIsEditMode(true)}
                        className="flex-shrink-0"
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                    )}
                    {onDiscontinue && medication.status === 'active' && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setShowDiscontinueForm(true)}
                        className="flex-shrink-0"
                      >
                        Discontinue
                      </Button>
                    )}
                    {onMoveToOrders && canMoveToOrders && medication.status === 'active' && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => onMoveToOrders(medication.id)}
                        className="text-navy-blue-600 hover:text-navy-blue-700 hover:bg-navy-blue-50 border-navy-blue-200 flex-shrink-0"
                      >
                        <ArrowRight className="h-3 w-3 mr-1" />
                        <span className="hidden sm:inline">Move to Orders</span>
                        <span className="sm:hidden">Move</span>
                      </Button>
                    )}
                  </div>
                ) : showDiscontinueForm ? (
                  <div className="space-y-3">
                    <Input
                      placeholder="Reason for discontinuation"
                      value={discontinueReason}
                      onChange={(e) => setDiscontinueReason(e.target.value)}
                      className="w-full"
                    />
                    <div className="flex items-center gap-2 justify-end">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setShowDiscontinueForm(false);
                          setDiscontinueReason('');
                        }}
                      >
                        Cancel
                      </Button>
                      <Button 
                        size="sm" 
                        onClick={handleDiscontinue}
                        disabled={!discontinueReason.trim()}
                      >
                        Confirm
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-end">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setIsEditMode(false)}
                    >
                      Cancel Edit
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}