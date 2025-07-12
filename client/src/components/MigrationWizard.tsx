import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Users, Building2, Hospital, UserCheck, AlertCircle, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface MigrationAnalysis {
  targetHealthSystem: {
    id: number;
    name: string;
  };
  categories: {
    clinicPatients: PatientCategory[];
    hospitalPatients: PatientCategory[];
    privatePatients: PatientCategory[];
    unknownPatients: PatientCategory[];
  };
  summary: {
    total: number;
    canAutoMigrate: number;
    requiresConsent: number;
  };
}

interface PatientCategory {
  patient: {
    id: number;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    mrn: string;
  };
  category: 'clinic_patient' | 'hospital_patient' | 'private_patient' | 'unknown';
  canAutoMigrate: boolean;
  requiresConsent: boolean;
  originalFacility?: string;
  derivativeWorkSummary?: string;
}

interface MigrationWizardProps {
  targetHealthSystemId: number;
  onComplete: () => void;
  onCancel: () => void;
}

export function MigrationWizard({ targetHealthSystemId, onComplete, onCancel }: MigrationWizardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPatients, setSelectedPatients] = useState<Set<number>>(new Set());
  const [activeTab, setActiveTab] = useState('clinic');

  // Fetch migration analysis
  const { data: analysis, isLoading } = useQuery<MigrationAnalysis>({
    queryKey: ['/api/migration/analyze', targetHealthSystemId],
    queryFn: async () => {
      const response = await fetch(`/api/migration/analyze/${targetHealthSystemId}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to analyze migration');
      return response.json();
    }
  });

  // Execute migration mutation
  const migrateMutation = useMutation({
    mutationFn: async (patientIds: number[]) => {
      return apiRequest('/api/migration/execute', 'POST', {
        targetHealthSystemId,
        patientIds,
        consentData: {}
      });
    },
    onSuccess: () => {
      toast({
        title: 'Migration Successful',
        description: 'Selected patients have been migrated to the new health system.'
      });
      queryClient.invalidateQueries({ queryKey: ['/api/patients'] });
      onComplete();
    },
    onError: (error: any) => {
      toast({
        title: 'Migration Failed',
        description: error.message || 'Failed to migrate patients',
        variant: 'destructive'
      });
    }
  });

  // Send consent requests mutation
  const consentMutation = useMutation({
    mutationFn: async (patientIds: number[]) => {
      return apiRequest('/api/migration/request-consent', 'POST', {
        patientIds,
        targetHealthSystemName: analysis?.targetHealthSystem.name
      });
    },
    onSuccess: () => {
      toast({
        title: 'Consent Requests Sent',
        description: 'Patients will be notified via email to authorize the data transfer.'
      });
    }
  });

  const handleSelectAll = (category: keyof MigrationAnalysis['categories']) => {
    const patients = analysis?.categories[category] || [];
    const newSelected = new Set(selectedPatients);
    
    const allSelected = patients.every(p => selectedPatients.has(p.patient.id));
    
    if (allSelected) {
      patients.forEach(p => newSelected.delete(p.patient.id));
    } else {
      patients.forEach(p => newSelected.add(p.patient.id));
    }
    
    setSelectedPatients(newSelected);
  };

  const handlePatientToggle = (patientId: number) => {
    const newSelected = new Set(selectedPatients);
    if (newSelected.has(patientId)) {
      newSelected.delete(patientId);
    } else {
      newSelected.add(patientId);
    }
    setSelectedPatients(newSelected);
  };

  const handleMigrate = () => {
    const selectedIds = Array.from(selectedPatients);
    if (selectedIds.length === 0) {
      toast({
        title: 'No Patients Selected',
        description: 'Please select at least one patient to migrate.',
        variant: 'destructive'
      });
      return;
    }
    
    migrateMutation.mutate(selectedIds);
  };

  const handleRequestConsent = () => {
    const consentRequired = analysis?.categories.hospitalPatients
      .filter(p => selectedPatients.has(p.patient.id))
      .map(p => p.patient.id) || [];
    
    if (consentRequired.length === 0) {
      toast({
        title: 'No Hospital Patients Selected',
        description: 'Only hospital patients require consent requests.',
        variant: 'destructive'
      });
      return;
    }
    
    consentMutation.mutate(consentRequired);
  };

  const PatientList = ({ patients, showFacility = false }: { patients: PatientCategory[], showFacility?: boolean }) => (
    <ScrollArea className="h-[400px]">
      <div className="space-y-2 p-1">
        {patients.map((category) => (
          <Card key={category.patient.id} className="p-3">
            <div className="flex items-start space-x-3">
              <Checkbox
                checked={selectedPatients.has(category.patient.id)}
                onCheckedChange={() => handlePatientToggle(category.patient.id)}
              />
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">
                      {category.patient.firstName} {category.patient.lastName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      MRN: {category.patient.mrn} • DOB: {new Date(category.patient.dateOfBirth).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {category.canAutoMigrate ? (
                      <Badge variant="default" className="bg-green-500">
                        <UserCheck className="w-3 h-3 mr-1" />
                        Auto-migrate
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        Consent Required
                      </Badge>
                    )}
                  </div>
                </div>
                {showFacility && category.originalFacility && (
                  <p className="text-sm text-muted-foreground">
                    Original Facility: {category.originalFacility}
                  </p>
                )}
                {category.derivativeWorkSummary && (
                  <p className="text-xs text-muted-foreground">
                    Derivative Work: {category.derivativeWorkSummary}
                  </p>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </ScrollArea>
  );

  if (isLoading) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (!analysis) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          Failed to load migration analysis. Please try again.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="w-full max-w-5xl mx-auto">
      <CardHeader>
        <CardTitle>Patient Migration Wizard</CardTitle>
        <CardDescription>
          Migrating to: <span className="font-semibold">{analysis.targetHealthSystem.name}</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Patients</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analysis.summary.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Auto-Migrate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {analysis.summary.canAutoMigrate}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Consent Required</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {analysis.summary.requiresConsent}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Patient Categories */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="clinic" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Clinic ({analysis.categories.clinicPatients.length})
            </TabsTrigger>
            <TabsTrigger value="hospital" className="flex items-center gap-2">
              <Hospital className="h-4 w-4" />
              Hospital ({analysis.categories.hospitalPatients.length})
            </TabsTrigger>
            <TabsTrigger value="private" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Private ({analysis.categories.privatePatients.length})
            </TabsTrigger>
            <TabsTrigger value="unknown" className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Unknown ({analysis.categories.unknownPatients.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="clinic" className="space-y-4">
            <Alert>
              <Building2 className="h-4 w-4" />
              <AlertTitle>Clinic Patients</AlertTitle>
              <AlertDescription>
                These patients were seen at {analysis.targetHealthSystem.name}. They can be automatically migrated.
              </AlertDescription>
            </Alert>
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-medium">Select patients to migrate:</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSelectAll('clinicPatients')}
              >
                Select All
              </Button>
            </div>
            <PatientList patients={analysis.categories.clinicPatients} />
          </TabsContent>

          <TabsContent value="hospital" className="space-y-4">
            <Alert variant="destructive">
              <Hospital className="h-4 w-4" />
              <AlertTitle>Hospital Patients</AlertTitle>
              <AlertDescription>
                These patients require explicit consent before migration. Email notifications will be sent.
              </AlertDescription>
            </Alert>
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-medium">Select patients for consent requests:</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSelectAll('hospitalPatients')}
              >
                Select All
              </Button>
            </div>
            <PatientList patients={analysis.categories.hospitalPatients} showFacility />
          </TabsContent>

          <TabsContent value="private" className="space-y-4">
            <Alert>
              <Users className="h-4 w-4" />
              <AlertTitle>Private Practice Patients</AlertTitle>
              <AlertDescription>
                These are your individual practice patients. You maintain ownership of this derivative work.
              </AlertDescription>
            </Alert>
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-medium">Select patients to migrate:</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSelectAll('privatePatients')}
              >
                Select All
              </Button>
            </div>
            <PatientList patients={analysis.categories.privatePatients} />
          </TabsContent>

          <TabsContent value="unknown" className="space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Unknown Origin</AlertTitle>
              <AlertDescription>
                These patients require manual review to determine migration eligibility.
              </AlertDescription>
            </Alert>
            <PatientList patients={analysis.categories.unknownPatients} />
          </TabsContent>
        </Tabs>

        {/* Actions */}
        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            {selectedPatients.size} patients selected
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            {analysis.summary.requiresConsent > 0 && (
              <Button
                variant="secondary"
                onClick={handleRequestConsent}
                disabled={consentMutation.isPending}
              >
                {consentMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Request Consent
              </Button>
            )}
            <Button
              onClick={handleMigrate}
              disabled={migrateMutation.isPending || selectedPatients.size === 0}
            >
              {migrateMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Migrate Selected
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}