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
  Zap
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';

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
  status: 'active' | 'discontinued' | 'held' | 'historical';
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
    discontinued: Medication[];
    held: Medication[];
    historical: Medication[];
  };
  summary: {
    total: number;
    active: number;
    discontinued: number;
    held: number;
    historical: number;
  };
}

interface EnhancedMedicationsListProps {
  patientId: number;
  readOnly?: boolean;
}

export function EnhancedMedicationsList({ patientId, readOnly = false }: EnhancedMedicationsListProps) {
  const [isAddingMedication, setIsAddingMedication] = useState(false);
  const [expandedMedications, setExpandedMedications] = useState<Set<number>>(new Set());
  const [activeStatusTab, setActiveStatusTab] = useState<'active' | 'discontinued' | 'held' | 'historical'>('active');
  const [groupingMode, setGroupingMode] = useState<'medical_problem' | 'alphabetical'>('medical_problem');
  const { toast } = useToast();

  // Fetch enhanced medications
  const { data: medicationData, isLoading, error } = useQuery<MedicationResponse>({
    queryKey: [`/api/patients/${patientId}/medications-enhanced`],
    enabled: !!patientId,
  });

  const createMedication = useMutation({
    mutationFn: async (medicationData: any) => {
      return await apiRequest(`/api/patients/${patientId}/medications-enhanced`, {
        method: 'POST',
        body: medicationData,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/patients/${patientId}/medications-enhanced`] });
      setIsAddingMedication(false);
      toast({
        title: "Medication added",
        description: "The medication has been added successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error adding medication",
        description: error.message || "Failed to add medication",
        variant: "destructive",
      });
    },
  });

  const discontinueMedication = useMutation({
    mutationFn: async ({ medicationId, reason }: { medicationId: number; reason: string }) => {
      return await apiRequest(`/api/medications/${medicationId}`, {
        method: 'DELETE',
        body: { reasonForDiscontinuation: reason },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/patients/${patientId}/medications-enhanced`] });
      toast({
        title: "Medication discontinued",
        description: "The medication has been discontinued successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error discontinuing medication",
        description: error.message || "Failed to discontinue medication",
        variant: "destructive",
      });
    },
  });

  const toggleMedicationExpanded = (medicationId: number) => {
    const newExpanded = new Set(expandedMedications);
    if (newExpanded.has(medicationId)) {
      newExpanded.delete(medicationId);
    } else {
      newExpanded.add(medicationId);
    }
    setExpandedMedications(newExpanded);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'discontinued': return 'secondary';
      case 'held': return 'outline';
      case 'historical': return 'secondary';
      default: return 'secondary';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <Activity className="h-3 w-3" />;
      case 'discontinued': return <Clock className="h-3 w-3" />;
      case 'held': return <AlertTriangle className="h-3 w-3" />;
      case 'historical': return <FileText className="h-3 w-3" />;
      default: return <Pill className="h-3 w-3" />;
    }
  };

  const groupMedicationsByProblem = (medications: Medication[]) => {
    if (groupingMode === 'alphabetical') {
      return { 'All Medications': medications.sort((a, b) => a.medicationName.localeCompare(b.medicationName)) };
    }

    const grouped = medications.reduce((acc, medication) => {
      const problem = medication.problemMappings?.[0]?.indication || medication.clinicalIndication || 'General Medications';
      if (!acc[problem]) {
        acc[problem] = [];
      }
      acc[problem].push(medication);
      return acc;
    }, {} as Record<string, Medication[]>);

    return grouped;
  };

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
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
            ))}
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

  const currentMedications = medicationData?.groupedByStatus[activeStatusTab] || [];
  const groupedMedications = groupMedicationsByProblem(currentMedications);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Pill className="h-5 w-5" />
            Medications
            {medicationData?.summary && (
              <Badge variant="outline" className="ml-2">
                {medicationData.summary.active} active
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={groupingMode} onValueChange={(value: any) => setGroupingMode(value)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="medical_problem">By Problem</SelectItem>
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
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="active" className="flex items-center gap-1">
              <Activity className="h-3 w-3" />
              Active ({medicationData?.summary.active || 0})
            </TabsTrigger>
            <TabsTrigger value="discontinued" className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Discontinued ({medicationData?.summary.discontinued || 0})
            </TabsTrigger>
            <TabsTrigger value="held" className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Held ({medicationData?.summary.held || 0})
            </TabsTrigger>
            <TabsTrigger value="historical" className="flex items-center gap-1">
              <FileText className="h-3 w-3" />
              Historical ({medicationData?.summary.historical || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeStatusTab} className="mt-4">
            {currentMedications.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Pill className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No {activeStatusTab} medications found</p>
                {activeStatusTab === 'active' && !readOnly && (
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
                      {medications.map((medication) => (
                        <MedicationCard
                          key={medication.id}
                          medication={medication}
                          isExpanded={expandedMedications.has(medication.id)}
                          onToggleExpanded={() => toggleMedicationExpanded(medication.id)}
                          onDiscontinue={readOnly ? undefined : (reason: string) => 
                            discontinueMedication.mutate({ medicationId: medication.id, reason })
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
          <AddMedicationForm
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
}

function MedicationCard({ medication, isExpanded, onToggleExpanded, onDiscontinue }: MedicationCardProps) {
  const [discontinueReason, setDiscontinueReason] = useState('');
  const [showDiscontinueForm, setShowDiscontinueForm] = useState(false);

  const handleDiscontinue = () => {
    if (discontinueReason.trim() && onDiscontinue) {
      onDiscontinue(discontinueReason);
      setShowDiscontinueForm(false);
      setDiscontinueReason('');
    }
  };

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggleExpanded}>
      <Card className="border-l-4 border-l-blue-500">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors pb-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-medium text-base">{medication.medicationName}</h3>
                  {medication.brandName && medication.brandName !== medication.medicationName && (
                    <span className="text-sm text-gray-500">({medication.brandName})</span>
                  )}
                  <Badge variant={getStatusBadgeVariant(medication.status)} className="flex items-center gap-1">
                    {getStatusIcon(medication.status)}
                    {medication.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-300">
                  <span className="font-medium">{medication.dosage} {medication.frequency}</span>
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
              <div className="flex items-center gap-2">
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

            {/* Actions */}
            {onDiscontinue && medication.status === 'active' && (
              <div className="flex items-center gap-2">
                {!showDiscontinueForm ? (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowDiscontinueForm(true)}
                  >
                    Discontinue
                  </Button>
                ) : (
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
                )}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

interface AddMedicationFormProps {
  onSubmit: (data: any) => void;
  onCancel: () => void;
  isLoading: boolean;
}

function AddMedicationForm({ onSubmit, onCancel, isLoading }: AddMedicationFormProps) {
  const [formData, setFormData] = useState({
    medicationName: '',
    genericName: '',
    brandName: '',
    dosage: '',
    frequency: '',
    route: 'oral',
    quantity: '',
    daysSupply: '',
    refills: '',
    sig: '',
    clinicalIndication: '',
    startDate: new Date().toISOString().split('T')[0],
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      quantity: formData.quantity ? parseInt(formData.quantity) : null,
      daysSupply: formData.daysSupply ? parseInt(formData.daysSupply) : null,
      refills: formData.refills ? parseInt(formData.refills) : 0,
    });
  };

  return (
    <Card className="border-blue-200 dark:border-blue-800">
      <CardHeader>
        <CardTitle className="text-base">Add New Medication</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="medicationName">Medication Name *</Label>
              <Input
                id="medicationName"
                value={formData.medicationName}
                onChange={(e) => setFormData({ ...formData, medicationName: e.target.value })}
                placeholder="e.g., Lisinopril"
                required
              />
            </div>
            <div>
              <Label htmlFor="dosage">Dosage/Strength *</Label>
              <Input
                id="dosage"
                value={formData.dosage}
                onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
                placeholder="e.g., 10mg"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="frequency">Frequency *</Label>
              <Input
                id="frequency"
                value={formData.frequency}
                onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                placeholder="e.g., once daily"
                required
              />
            </div>
            <div>
              <Label htmlFor="route">Route</Label>
              <Select value={formData.route} onValueChange={(value) => setFormData({ ...formData, route: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="oral">Oral</SelectItem>
                  <SelectItem value="topical">Topical</SelectItem>
                  <SelectItem value="injection">Injection</SelectItem>
                  <SelectItem value="inhalation">Inhalation</SelectItem>
                  <SelectItem value="ophthalmic">Ophthalmic</SelectItem>
                  <SelectItem value="otic">Otic</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                placeholder="30"
              />
            </div>
            <div>
              <Label htmlFor="daysSupply">Days Supply</Label>
              <Input
                id="daysSupply"
                type="number"
                value={formData.daysSupply}
                onChange={(e) => setFormData({ ...formData, daysSupply: e.target.value })}
                placeholder="30"
              />
            </div>
            <div>
              <Label htmlFor="refills">Refills</Label>
              <Input
                id="refills"
                type="number"
                value={formData.refills}
                onChange={(e) => setFormData({ ...formData, refills: e.target.value })}
                placeholder="2"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="sig">Patient Instructions</Label>
            <Textarea
              id="sig"
              value={formData.sig}
              onChange={(e) => setFormData({ ...formData, sig: e.target.value })}
              placeholder="Take one tablet by mouth once daily"
              rows={2}
            />
          </div>

          <div>
            <Label htmlFor="clinicalIndication">Clinical Indication</Label>
            <Input
              id="clinicalIndication"
              value={formData.clinicalIndication}
              onChange={(e) => setFormData({ ...formData, clinicalIndication: e.target.value })}
              placeholder="e.g., Hypertension"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Adding...' : 'Add Medication'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}