import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Calendar, AlertCircle } from "lucide-react";
import type { 
  MedicalHistory, 
  Medication, 
  Allergy, 
  LabOrder, 
  Vitals, 
  ImagingOrder, 
  FamilyHistory, 
  SocialHistory, 
  Diagnosis 
} from "@shared/schema";

interface PatientChartSectionsProps {
  patientId: number;
}

export function PatientChartSections({ patientId }: PatientChartSectionsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Medical Problems Section
  const { data: medicalHistory = [], isLoading: loadingMedical } = useQuery<MedicalHistory[]>({
    queryKey: ['/api/patients', patientId, 'medical-history'],
  });

  const { data: diagnoses = [], isLoading: loadingDiagnoses } = useQuery<Diagnosis[]>({
    queryKey: ['/api/patients', patientId, 'diagnoses'],
  });

  // Medications Section
  const { data: medications = [], isLoading: loadingMeds } = useQuery<Medication[]>({
    queryKey: ['/api/patients', patientId, 'medications'],
  });

  // Allergies Section
  const { data: allergies = [], isLoading: loadingAllergies } = useQuery<Allergy[]>({
    queryKey: ['/api/patients', patientId, 'allergies'],
  });

  // Labs Section
  const { data: labOrders = [], isLoading: loadingLabs } = useQuery<LabOrder[]>({
    queryKey: ['/api/patients', patientId, 'lab-orders'],
  });

  // Vitals Section
  const { data: vitals = [], isLoading: loadingVitals } = useQuery<Vitals[]>({
    queryKey: ['/api/patients', patientId, 'vitals'],
  });

  // Imaging Section
  const { data: imagingOrders = [], isLoading: loadingImaging } = useQuery<ImagingOrder[]>({
    queryKey: ['/api/patients', patientId, 'imaging-orders'],
  });

  // Family History Section
  const { data: familyHistory = [], isLoading: loadingFamily } = useQuery<FamilyHistory[]>({
    queryKey: ['/api/patients', patientId, 'family-history'],
  });

  // Social History Section
  const { data: socialHistory = [], isLoading: loadingSocial } = useQuery<SocialHistory[]>({
    queryKey: ['/api/patients', patientId, 'social-history'],
  });

  return (
    <div className="space-y-6">
      <Tabs defaultValue="problems" className="w-full">
        <TabsList className="grid w-full grid-cols-8">
          <TabsTrigger value="problems">Medical Problems</TabsTrigger>
          <TabsTrigger value="medications">Medications</TabsTrigger>
          <TabsTrigger value="allergies">Allergies</TabsTrigger>
          <TabsTrigger value="labs">Labs</TabsTrigger>
          <TabsTrigger value="vitals">Vitals</TabsTrigger>
          <TabsTrigger value="imaging">Imaging</TabsTrigger>
          <TabsTrigger value="family">Family History</TabsTrigger>
          <TabsTrigger value="social">Social History</TabsTrigger>
        </TabsList>

        <TabsContent value="problems">
          <MedicalProblemsSection 
            patientId={patientId} 
            medicalHistory={medicalHistory}
            diagnoses={diagnoses}
            loading={loadingMedical || loadingDiagnoses}
          />
        </TabsContent>

        <TabsContent value="medications">
          <MedicationsSection 
            patientId={patientId} 
            medications={medications}
            loading={loadingMeds}
          />
        </TabsContent>

        <TabsContent value="allergies">
          <AllergiesSection 
            patientId={patientId} 
            allergies={allergies}
            loading={loadingAllergies}
          />
        </TabsContent>

        <TabsContent value="labs">
          <LabsSection 
            patientId={patientId} 
            labOrders={labOrders}
            loading={loadingLabs}
          />
        </TabsContent>

        <TabsContent value="vitals">
          <VitalsSection 
            patientId={patientId} 
            vitals={vitals}
            loading={loadingVitals}
          />
        </TabsContent>

        <TabsContent value="imaging">
          <ImagingSection 
            patientId={patientId} 
            imagingOrders={imagingOrders}
            loading={loadingImaging}
          />
        </TabsContent>

        <TabsContent value="family">
          <FamilyHistorySection 
            patientId={patientId} 
            familyHistory={familyHistory}
            loading={loadingFamily}
          />
        </TabsContent>

        <TabsContent value="social">
          <SocialHistorySection 
            patientId={patientId} 
            socialHistory={socialHistory}
            loading={loadingSocial}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Medical Problems Section Component
function MedicalProblemsSection({ 
  patientId, 
  medicalHistory, 
  diagnoses, 
  loading 
}: { 
  patientId: number; 
  medicalHistory: MedicalHistory[]; 
  diagnoses: Diagnosis[];
  loading: boolean;
}) {
  const [isAddingHistory, setIsAddingHistory] = useState(false);
  const [isAddingDiagnosis, setIsAddingDiagnosis] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const addHistoryMutation = useMutation({
    mutationFn: (data: any) => apiRequest(`/api/patients/${patientId}/medical-history`, 'POST', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/patients', patientId, 'medical-history'] });
      setIsAddingHistory(false);
      toast({ title: "Medical history added successfully" });
    },
  });

  const addDiagnosisMutation = useMutation({
    mutationFn: (data: any) => apiRequest(`/api/patients/${patientId}/diagnoses`, 'POST', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/patients', patientId, 'diagnoses'] });
      setIsAddingDiagnosis(false);
      toast({ title: "Diagnosis added successfully" });
    },
  });

  const deleteHistoryMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/medical-history/${id}`, 'DELETE'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/patients', patientId, 'medical-history'] });
      toast({ title: "Medical history deleted" });
    },
  });

  if (loading) {
    return <div className="text-center p-8">Loading medical problems...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Active Diagnoses</CardTitle>
          <Dialog open={isAddingDiagnosis} onOpenChange={setIsAddingDiagnosis}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Diagnosis
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Diagnosis</DialogTitle>
              </DialogHeader>
              <AddDiagnosisForm 
                onSubmit={(data) => addDiagnosisMutation.mutate({ ...data, encounterId: null })}
                isLoading={addDiagnosisMutation.isPending}
              />
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {diagnoses.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No active diagnoses</p>
          ) : (
            <div className="space-y-3">
              {diagnoses.map((diagnosis) => (
                <div key={diagnosis.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{diagnosis.diagnosis}</span>
                      {diagnosis.icd10Code && (
                        <Badge variant="outline">{diagnosis.icd10Code}</Badge>
                      )}
                      <Badge variant={diagnosis.status === 'active' ? 'default' : 'secondary'}>
                        {diagnosis.status}
                      </Badge>
                    </div>
                    {diagnosis.notes && (
                      <p className="text-sm text-muted-foreground mt-1">{diagnosis.notes}</p>
                    )}
                    {diagnosis.diagnosisDate && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Diagnosed: {new Date(diagnosis.diagnosisDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Medical History</CardTitle>
          <Dialog open={isAddingHistory} onOpenChange={setIsAddingHistory}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add History
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Medical History</DialogTitle>
              </DialogHeader>
              <AddMedicalHistoryForm 
                onSubmit={(data) => addHistoryMutation.mutate(data)}
                isLoading={addHistoryMutation.isPending}
              />
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {medicalHistory.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No medical history recorded</p>
          ) : (
            <div className="space-y-3">
              {medicalHistory.map((history) => (
                <div key={history.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{history.conditionCategory}</Badge>
                    </div>
                    <p className="mt-2">{history.historyText}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Updated: {new Date(history.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteHistoryMutation.mutate(history.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Add Diagnosis Form
function AddDiagnosisForm({ onSubmit, isLoading }: { onSubmit: (data: any) => void; isLoading: boolean }) {
  const [formData, setFormData] = useState({
    diagnosis: '',
    icd10Code: '',
    status: 'active',
    notes: '',
    diagnosisDate: new Date().toISOString().split('T')[0]
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="diagnosis">Diagnosis</Label>
        <Input
          id="diagnosis"
          value={formData.diagnosis}
          onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
          required
        />
      </div>
      <div>
        <Label htmlFor="icd10Code">ICD-10 Code</Label>
        <Input
          id="icd10Code"
          value={formData.icd10Code}
          onChange={(e) => setFormData({ ...formData, icd10Code: e.target.value })}
        />
      </div>
      <div>
        <Label htmlFor="status">Status</Label>
        <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="chronic">Chronic</SelectItem>
            <SelectItem value="rule_out">Rule Out</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="diagnosisDate">Diagnosis Date</Label>
        <Input
          id="diagnosisDate"
          type="date"
          value={formData.diagnosisDate}
          onChange={(e) => setFormData({ ...formData, diagnosisDate: e.target.value })}
        />
      </div>
      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
        />
      </div>
      <Button type="submit" disabled={isLoading}>
        {isLoading ? 'Adding...' : 'Add Diagnosis'}
      </Button>
    </form>
  );
}

// Add Medical History Form
function AddMedicalHistoryForm({ onSubmit, isLoading }: { onSubmit: (data: any) => void; isLoading: boolean }) {
  const [formData, setFormData] = useState({
    conditionCategory: '',
    historyText: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="conditionCategory">Category</Label>
        <Select value={formData.conditionCategory} onValueChange={(value) => setFormData({ ...formData, conditionCategory: value })}>
          <SelectTrigger>
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="cardiac">Cardiac</SelectItem>
            <SelectItem value="pulmonary">Pulmonary</SelectItem>
            <SelectItem value="endocrine">Endocrine</SelectItem>
            <SelectItem value="neurological">Neurological</SelectItem>
            <SelectItem value="gastrointestinal">Gastrointestinal</SelectItem>
            <SelectItem value="musculoskeletal">Musculoskeletal</SelectItem>
            <SelectItem value="dermatological">Dermatological</SelectItem>
            <SelectItem value="psychiatric">Psychiatric</SelectItem>
            <SelectItem value="surgical">Surgical</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="historyText">History Details</Label>
        <Textarea
          id="historyText"
          value={formData.historyText}
          onChange={(e) => setFormData({ ...formData, historyText: e.target.value })}
          required
        />
      </div>
      <Button type="submit" disabled={isLoading}>
        {isLoading ? 'Adding...' : 'Add History'}
      </Button>
    </form>
  );
}

// Medications Section Component
function MedicationsSection({ 
  patientId, 
  medications, 
  loading 
}: { 
  patientId: number; 
  medications: Medication[]; 
  loading: boolean;
}) {
  const [isAdding, setIsAdding] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const addMutation = useMutation({
    mutationFn: (data: any) => apiRequest(`/api/patients/${patientId}/medications`, {
      method: 'POST',
      body: data,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/patients', patientId, 'medications'] });
      setIsAdding(false);
      toast({ title: "Medication added successfully" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/medications/${id}`, {
      method: 'DELETE',
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/patients', patientId, 'medications'] });
      toast({ title: "Medication deleted" });
    },
  });

  if (loading) {
    return <div className="text-center p-8">Loading medications...</div>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>Medications</CardTitle>
        <Dialog open={isAdding} onOpenChange={setIsAdding}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Medication
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Medication</DialogTitle>
            </DialogHeader>
            <AddMedicationForm 
              onSubmit={(data) => addMutation.mutate({ ...data, encounterId: null })}
              isLoading={addMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {medications.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">No medications recorded</p>
        ) : (
          <div className="space-y-3">
            {medications.map((med) => (
              <div key={med.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{med.medicationName}</span>
                    <Badge variant={med.status === 'active' ? 'default' : 'secondary'}>
                      {med.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {med.dosage} {med.frequency} {med.route && `via ${med.route}`}
                  </p>
                  {med.medicalProblem && (
                    <p className="text-sm text-muted-foreground">For: {med.medicalProblem}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Started: {new Date(med.startDate).toLocaleDateString()}
                    {med.endDate && ` - Ended: ${new Date(med.endDate).toLocaleDateString()}`}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteMutation.mutate(med.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Add Medication Form
function AddMedicationForm({ onSubmit, isLoading }: { onSubmit: (data: any) => void; isLoading: boolean }) {
  const [formData, setFormData] = useState({
    medicationName: '',
    dosage: '',
    frequency: '',
    route: 'oral',
    status: 'active',
    medicalProblem: '',
    prescriber: '',
    startDate: new Date().toISOString().split('T')[0]
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="medicationName">Medication Name</Label>
        <Input
          id="medicationName"
          value={formData.medicationName}
          onChange={(e) => setFormData({ ...formData, medicationName: e.target.value })}
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="dosage">Dosage</Label>
          <Input
            id="dosage"
            value={formData.dosage}
            onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
            required
          />
        </div>
        <div>
          <Label htmlFor="frequency">Frequency</Label>
          <Input
            id="frequency"
            value={formData.frequency}
            onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
            required
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="route">Route</Label>
          <Select value={formData.route} onValueChange={(value) => setFormData({ ...formData, route: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="oral">Oral</SelectItem>
              <SelectItem value="IV">IV</SelectItem>
              <SelectItem value="IM">IM</SelectItem>
              <SelectItem value="topical">Topical</SelectItem>
              <SelectItem value="inhaled">Inhaled</SelectItem>
              <SelectItem value="sublingual">Sublingual</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="status">Status</Label>
          <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="discontinued">Discontinued</SelectItem>
              <SelectItem value="hold">Hold</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label htmlFor="medicalProblem">Medical Problem</Label>
        <Input
          id="medicalProblem"
          value={formData.medicalProblem}
          onChange={(e) => setFormData({ ...formData, medicalProblem: e.target.value })}
        />
      </div>
      <div>
        <Label htmlFor="prescriber">Prescriber</Label>
        <Input
          id="prescriber"
          value={formData.prescriber}
          onChange={(e) => setFormData({ ...formData, prescriber: e.target.value })}
        />
      </div>
      <div>
        <Label htmlFor="startDate">Start Date</Label>
        <Input
          id="startDate"
          type="date"
          value={formData.startDate}
          onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
          required
        />
      </div>
      <Button type="submit" disabled={isLoading}>
        {isLoading ? 'Adding...' : 'Add Medication'}
      </Button>
    </form>
  );
}

// Allergies Section Component
function AllergiesSection({ 
  patientId, 
  allergies, 
  loading 
}: { 
  patientId: number; 
  allergies: Allergy[]; 
  loading: boolean;
}) {
  const [isAdding, setIsAdding] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const addMutation = useMutation({
    mutationFn: (data: any) => apiRequest(`/api/patients/${patientId}/allergies`, {
      method: 'POST',
      body: data,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/patients', patientId, 'allergies'] });
      setIsAdding(false);
      toast({ title: "Allergy added successfully" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/allergies/${id}`, {
      method: 'DELETE',
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/patients', patientId, 'allergies'] });
      toast({ title: "Allergy deleted" });
    },
  });

  if (loading) {
    return <div className="text-center p-8">Loading allergies...</div>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-500" />
          Allergies
        </CardTitle>
        <Dialog open={isAdding} onOpenChange={setIsAdding}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Allergy
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Allergy</DialogTitle>
            </DialogHeader>
            <AddAllergyForm 
              onSubmit={(data) => addMutation.mutate(data)}
              isLoading={addMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {allergies.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">No known allergies</p>
        ) : (
          <div className="space-y-3">
            {allergies.map((allergy) => (
              <div key={allergy.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{allergy.allergen}</span>
                    {allergy.severity && (
                      <Badge variant={allergy.severity === 'severe' ? 'destructive' : 'secondary'}>
                        {allergy.severity}
                      </Badge>
                    )}
                  </div>
                  {allergy.reaction && (
                    <p className="text-sm text-muted-foreground">Reaction: {allergy.reaction}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Updated: {new Date(allergy.updatedAt).toLocaleDateString()}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteMutation.mutate(allergy.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Add Allergy Form
function AddAllergyForm({ onSubmit, isLoading }: { onSubmit: (data: any) => void; isLoading: boolean }) {
  const [formData, setFormData] = useState({
    allergen: '',
    reaction: '',
    severity: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="allergen">Allergen</Label>
        <Input
          id="allergen"
          value={formData.allergen}
          onChange={(e) => setFormData({ ...formData, allergen: e.target.value })}
          required
        />
      </div>
      <div>
        <Label htmlFor="reaction">Reaction</Label>
        <Input
          id="reaction"
          value={formData.reaction}
          onChange={(e) => setFormData({ ...formData, reaction: e.target.value })}
        />
      </div>
      <div>
        <Label htmlFor="severity">Severity</Label>
        <Select value={formData.severity} onValueChange={(value) => setFormData({ ...formData, severity: value })}>
          <SelectTrigger>
            <SelectValue placeholder="Select severity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="mild">Mild</SelectItem>
            <SelectItem value="moderate">Moderate</SelectItem>
            <SelectItem value="severe">Severe</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" disabled={isLoading}>
        {isLoading ? 'Adding...' : 'Add Allergy'}
      </Button>
    </form>
  );
}

// Placeholder sections for Labs, Vitals, Imaging, Family History, and Social History
function LabsSection({ patientId, labOrders, loading }: { patientId: number; labOrders: LabOrder[]; loading: boolean }) {
  if (loading) return <div className="text-center p-8">Loading lab orders...</div>;
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Lab Orders</CardTitle>
      </CardHeader>
      <CardContent>
        {labOrders.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">No lab orders found</p>
        ) : (
          <div className="space-y-3">
            {labOrders.map((lab) => (
              <div key={lab.id} className="p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{lab.testName}</span>
                  <Badge variant="outline">{lab.orderStatus}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Ordered: {new Date(lab.orderedAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function VitalsSection({ patientId, vitals, loading }: { patientId: number; vitals: Vitals[]; loading: boolean }) {
  if (loading) return <div className="text-center p-8">Loading vitals...</div>;
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Vital Signs</CardTitle>
      </CardHeader>
      <CardContent>
        {vitals.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">No vitals recorded</p>
        ) : (
          <div className="space-y-3">
            {vitals.slice(0, 5).map((vital) => (
              <div key={vital.id} className="p-3 border rounded-lg">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                  {vital.systolicBp && vital.diastolicBp && (
                    <div>BP: {vital.systolicBp}/{vital.diastolicBp}</div>
                  )}
                  {vital.heartRate && <div>HR: {vital.heartRate}</div>}
                  {vital.temperature && <div>Temp: {vital.temperature}°F</div>}
                  {vital.weight && <div>Weight: {vital.weight} lbs</div>}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {new Date(vital.measuredAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ImagingSection({ patientId, imagingOrders, loading }: { patientId: number; imagingOrders: ImagingOrder[]; loading: boolean }) {
  if (loading) return <div className="text-center p-8">Loading imaging orders...</div>;
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Imaging Orders</CardTitle>
      </CardHeader>
      <CardContent>
        {imagingOrders.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">No imaging orders found</p>
        ) : (
          <div className="space-y-3">
            {imagingOrders.map((imaging) => (
              <div key={imaging.id} className="p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{imaging.studyType} - {imaging.bodyPart}</span>
                  <Badge variant="outline">{imaging.orderStatus}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{imaging.clinicalIndication}</p>
                <p className="text-xs text-muted-foreground">
                  Ordered: {new Date(imaging.orderedAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function FamilyHistorySection({ patientId, familyHistory, loading }: { patientId: number; familyHistory: FamilyHistory[]; loading: boolean }) {
  if (loading) return <div className="text-center p-8">Loading family history...</div>;
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Family History</CardTitle>
      </CardHeader>
      <CardContent>
        {familyHistory.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">No family history recorded</p>
        ) : (
          <div className="space-y-3">
            {familyHistory.map((family) => (
              <div key={family.id} className="p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="font-medium capitalize">{family.familyMember}</span>
                </div>
                <p className="text-sm mt-1">{family.medicalHistory}</p>
                <p className="text-xs text-muted-foreground">
                  Updated: {new Date(family.updatedAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SocialHistorySection({ patientId, socialHistory, loading }: { patientId: number; socialHistory: SocialHistory[]; loading: boolean }) {
  if (loading) return <div className="text-center p-8">Loading social history...</div>;
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Social History</CardTitle>
      </CardHeader>
      <CardContent>
        {socialHistory.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">No social history recorded</p>
        ) : (
          <div className="space-y-3">
            {socialHistory.map((social) => (
              <div key={social.id} className="p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="font-medium capitalize">{social.category}</span>
                  <Badge variant="outline">{social.currentStatus}</Badge>
                </div>
                {social.historyNotes && (
                  <p className="text-sm mt-1">{social.historyNotes}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Updated: {new Date(social.updatedAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}