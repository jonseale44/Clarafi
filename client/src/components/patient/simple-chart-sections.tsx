import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, AlertCircle } from "lucide-react";

interface SimpleChartSectionsProps {
  patientId: number;
}

export function SimpleChartSections({ patientId }: SimpleChartSectionsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Medical Problems Section
  const { data: medicalHistory = [], isLoading: loadingMedical } = useQuery({
    queryKey: ['/api/patients', patientId, 'medical-history'],
  });

  const { data: diagnoses = [], isLoading: loadingDiagnoses } = useQuery({
    queryKey: ['/api/patients', patientId, 'diagnoses'],
  });

  // Medications Section
  const { data: medications = [], isLoading: loadingMeds } = useQuery({
    queryKey: ['/api/patients', patientId, 'medications'],
  });

  // Allergies Section
  const { data: allergies = [], isLoading: loadingAllergies } = useQuery({
    queryKey: ['/api/patients', patientId, 'allergies'],
  });

  // Labs Section
  const { data: labOrders = [], isLoading: loadingLabs } = useQuery({
    queryKey: ['/api/patients', patientId, 'lab-orders'],
  });

  // Vitals Section
  const { data: vitals = [], isLoading: loadingVitals } = useQuery({
    queryKey: ['/api/patients', patientId, 'vitals'],
  });

  // Family History Section
  const { data: familyHistory = [], isLoading: loadingFamily } = useQuery({
    queryKey: ['/api/patients', patientId, 'family-history'],
  });

  // Social History Section
  const { data: socialHistory = [], isLoading: loadingSocial } = useQuery({
    queryKey: ['/api/patients', patientId, 'social-history'],
  });

  if (loadingMedical || loadingDiagnoses || loadingMeds || loadingAllergies || loadingLabs || loadingVitals || loadingFamily || loadingSocial) {
    return <div className="text-center p-8">Loading chart sections...</div>;
  }

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
          />
        </TabsContent>

        <TabsContent value="medications">
          <MedicationsSection 
            patientId={patientId} 
            medications={medications}
          />
        </TabsContent>

        <TabsContent value="allergies">
          <AllergiesSection 
            patientId={patientId} 
            allergies={allergies}
          />
        </TabsContent>

        <TabsContent value="labs">
          <LabsSection 
            patientId={patientId} 
            labOrders={labOrders}
          />
        </TabsContent>

        <TabsContent value="vitals">
          <VitalsSection 
            patientId={patientId} 
            vitals={vitals}
          />
        </TabsContent>

        <TabsContent value="imaging">
          <Card>
            <CardHeader>
              <CardTitle>Imaging Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-center py-4">Imaging management interface will be added here</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="family">
          <FamilyHistorySection 
            patientId={patientId} 
            familyHistory={familyHistory}
          />
        </TabsContent>

        <TabsContent value="social">
          <SocialHistorySection 
            patientId={patientId} 
            socialHistory={socialHistory}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Simplified Medical Problems Section
function MedicalProblemsSection({ 
  patientId, 
  medicalHistory, 
  diagnoses 
}: { 
  patientId: number; 
  medicalHistory: any[]; 
  diagnoses: any[];
}) {
  const [isAddingHistory, setIsAddingHistory] = useState(false);
  const [isAddingDiagnosis, setIsAddingDiagnosis] = useState(false);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Active Diagnoses</CardTitle>
          <Button size="sm" onClick={() => setIsAddingDiagnosis(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Diagnosis
          </Button>
        </CardHeader>
        <CardContent>
          {diagnoses.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No active diagnoses</p>
          ) : (
            <div className="space-y-3">
              {diagnoses.map((diagnosis: any) => (
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
          <Button size="sm" onClick={() => setIsAddingHistory(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add History
          </Button>
        </CardHeader>
        <CardContent>
          {medicalHistory.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No medical history recorded</p>
          ) : (
            <div className="space-y-3">
              {medicalHistory.map((history: any) => (
                <div key={history.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{history.conditionCategory}</Badge>
                    </div>
                    <p className="mt-2">{history.historyText}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Simplified Medications Section
function MedicationsSection({ 
  patientId, 
  medications 
}: { 
  patientId: number; 
  medications: any[]; 
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>Medications</CardTitle>
        <Button size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Add Medication
        </Button>
      </CardHeader>
      <CardContent>
        {medications.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">No medications recorded</p>
        ) : (
          <div className="space-y-3">
            {medications.map((med: any) => (
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
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Simplified Allergies Section
function AllergiesSection({ 
  patientId, 
  allergies 
}: { 
  patientId: number; 
  allergies: any[]; 
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-500" />
          Allergies
        </CardTitle>
        <Button size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Add Allergy
        </Button>
      </CardHeader>
      <CardContent>
        {allergies.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">No known allergies</p>
        ) : (
          <div className="space-y-3">
            {allergies.map((allergy: any) => (
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
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Simplified Labs Section
function LabsSection({ patientId, labOrders }: { patientId: number; labOrders: any[] }) {
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
            {labOrders.map((lab: any) => (
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

// Simplified Vitals Section
function VitalsSection({ patientId, vitals }: { patientId: number; vitals: any[] }) {
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
            {vitals.slice(0, 5).map((vital: any) => (
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

// Simplified Family History Section
function FamilyHistorySection({ patientId, familyHistory }: { patientId: number; familyHistory: any[] }) {
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
            {familyHistory.map((family: any) => (
              <div key={family.id} className="p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="font-medium capitalize">{family.familyMember}</span>
                </div>
                <p className="text-sm mt-1">{family.medicalHistory}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Simplified Social History Section
function SocialHistorySection({ patientId, socialHistory }: { patientId: number; socialHistory: any[] }) {
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
            {socialHistory.map((social: any) => (
              <div key={social.id} className="p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="font-medium capitalize">{social.category}</span>
                  <Badge variant="outline">{social.currentStatus}</Badge>
                </div>
                {social.historyNotes && (
                  <p className="text-sm mt-1">{social.historyNotes}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}