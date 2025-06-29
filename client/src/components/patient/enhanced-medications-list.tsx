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
  Zap
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { FastMedicationIntelligence } from './fast-medication-intelligence';

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
    <Card className="border-blue-200 dark:border-blue-800">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Zap className="h-4 w-4 text-blue-600" />
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
            <div className="border border-blue-200 rounded-lg p-4 bg-blue-50/50">
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
              className="bg-blue-600 hover:bg-blue-700"
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
          description: `${data.orderDetails.medicationName} refill has been added to draft orders.`,
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
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Pill className="h-5 w-5" />
            Medications
          </CardTitle>
        </CardHeader>
        <CardContent>
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
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Pill className="h-5 w-5" />
            Medications
          </CardTitle>
        </CardHeader>
        <CardContent>
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
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Pill className="h-5 w-5" />
            Medications
            <Badge variant="outline" className="ml-2">
              {(medicationData as MedicationResponse)?.summary.total || 0}
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={groupingMode} onValueChange={(value: any) => setGroupingMode(value)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="medical_problem">By Medical Problem</SelectItem>
                <SelectItem value="alphabetical">Alphabetical</SelectItem>
              </SelectContent>
            </Select>
            {!readOnly && (
              <Button 
                onClick={() => setIsAddingMedication(true)}
                size="sm"
                className="flex items-center gap-1"
              >
                <Plus className="h-4 w-4" />
                Add Medication
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Status Tabs */}
        <Tabs value={activeStatusTab} onValueChange={(value: any) => setActiveStatusTab(value)}>
          <TabsList className="grid w-full grid-cols-4 h-auto">
            <TabsTrigger value="current" className="flex flex-col items-center gap-1 p-2 text-xs">
              <Activity className="h-3 w-3" />
              <span>Current</span>
              <span className="text-xs opacity-70">({((medicationData as MedicationResponse)?.summary.active || 0) + ((medicationData as MedicationResponse)?.summary.pending || 0)})</span>
            </TabsTrigger>
            <TabsTrigger value="discontinued" className="flex flex-col items-center gap-1 p-2 text-xs">
              <Clock className="h-3 w-3" />
              <span>Discontinued</span>
              <span className="text-xs opacity-70">({(medicationData as MedicationResponse)?.summary.discontinued || 0})</span>
            </TabsTrigger>
            <TabsTrigger value="held" className="flex flex-col items-center gap-1 p-2 text-xs">
              <AlertTriangle className="h-3 w-3" />
              <span>Held</span>
              <span className="text-xs opacity-70">({(medicationData as MedicationResponse)?.summary.held || 0})</span>
            </TabsTrigger>
            <TabsTrigger value="historical" className="flex flex-col items-center gap-1 p-2 text-xs">
              <FileText className="h-3 w-3" />
              <span>Historical</span>
              <span className="text-xs opacity-70">({(medicationData as MedicationResponse)?.summary.historical || 0})</span>
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
              <div className="space-y-4">
                {Object.entries(groupedMedications).map(([groupName, medications]) => (
                  <div key={groupName}>
                    {groupingMode === 'medical_problem' && (
                      <h3 className="font-medium text-sm text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1">
                        <Zap className="h-3 w-3" />
                        {groupName}
                      </h3>
                    )}
                    <div className="space-y-2">
                      {medications.map((medication: Medication) => (
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
                        />
                      ))}
                    </div>
                    {groupingMode === 'medical_problem' && Object.keys(groupedMedications).length > 1 && (
                      <Separator className="mt-4" />
                    )}
                  </div>
                ))}
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
}

function MedicationCard({ medication, isExpanded, onToggleExpanded, onDiscontinue, onEdit }: MedicationCardProps) {
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
          <CardHeader className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors pb-3">
            <div className="space-y-2">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="font-medium text-base">
                      {medication.medicationName}
                      {medication.dosage && ` ${medication.dosage}`}
                      {medication.strength && medication.strength !== medication.dosage && ` ${medication.strength}`}
                    </h3>
                    {medication.brandName && medication.brandName !== medication.medicationName && (
                      <span className="text-sm text-gray-500">({medication.brandName})</span>
                    )}
                    <Badge variant={getStatusBadgeVariant(medication.status)} className="flex items-center gap-1">
                      {getStatusIcon(medication.status)}
                      {medication.status}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {medication.drugInteractions?.length > 0 && (
                    <Badge variant="destructive" className="flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      {medication.drugInteractions.length} interaction{medication.drugInteractions.length !== 1 ? 's' : ''}
                    </Badge>
                  )}
                  {medication.priorAuthRequired && (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Shield className="h-3 w-3" />
                      Prior Auth
                    </Badge>
                  )}
                  <Button variant="ghost" size="sm">
                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-300">
                <span className="font-medium">
                  {medication.sig || `${medication.dosage} ${medication.frequency}`}
                </span>
                {medication.clinicalIndication && (
                  <span className="text-gray-500">for {medication.clinicalIndication}</span>
                )}
                {medication.startDate && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Started {new Date(medication.startDate).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
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

            {/* Edit Form */}
            {isEditMode && (
              <div className="mt-4 p-4 border border-blue-200 rounded-lg bg-blue-50/50">
                <h4 className="font-medium mb-3 text-blue-800">Edit Medication</h4>
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
              <div className="flex items-center gap-2">
                {!showDiscontinueForm && !isEditMode ? (
                  <div className="flex items-center gap-2">
                    {onEdit && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setIsEditMode(true)}
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
                      >
                        Discontinue
                      </Button>
                    )}
                  </div>
                ) : showDiscontinueForm ? (
                  <div className="flex items-center gap-2 w-full">
                    <Input
                      placeholder="Reason for discontinuation"
                      value={discontinueReason}
                      onChange={(e) => setDiscontinueReason(e.target.value)}
                      className="flex-1"
                    />
                    <Button 
                      size="sm" 
                      onClick={handleDiscontinue}
                      disabled={!discontinueReason.trim()}
                    >
                      Confirm
                    </Button>
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
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
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