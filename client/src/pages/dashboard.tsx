import { useState, useEffect } from "react";
import { PatientHeader } from "@/components/patient/patient-header";
import { QuickStats } from "@/components/patient/quick-stats";
import { EncountersTab } from "@/components/patient/encounters-tab";
import { PatientChartView } from "@/components/patient/patient-chart-view";
import { ProviderDashboard } from "@/components/dashboard/provider-dashboard";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Patient, Vitals } from "@shared/schema";
import { Link } from "wouter";
import { UserPlus, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { apiRequest } from "@/lib/queryClient";

export default function Dashboard() {
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("dashboard");

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all patients to select the first one
  const { data: allPatients = [], error: patientsError } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
    retry: false,
    refetchOnWindowFocus: false,
  });

  // Auto-select first patient when patients are loaded
  useEffect(() => {
    if (Array.isArray(allPatients) && allPatients.length > 0 && !selectedPatientId) {
      setSelectedPatientId(allPatients[0].id);
    }
  }, [allPatients, selectedPatientId]);

  // Fetch patient data
  const { data: patient, isLoading: patientLoading, error: patientError } = useQuery<Patient>({
    queryKey: ["/api/patients", selectedPatientId],
    enabled: !!selectedPatientId,
    retry: false,
    refetchOnWindowFocus: false,
  });

  // Handle authentication errors properly
  useEffect(() => {
    if (patientsError || patientError) {
      const error = patientsError || patientError;
      if (error?.message.includes('401')) {
        // Authentication error - user needs to log in
        return;
      }
      console.error('API Error:', error);
    }
  }, [patientsError, patientError]);

  // Fetch latest vitals
  const { data: latestVitals } = useQuery<Vitals>({
    queryKey: ["/api/patients", selectedPatientId, "vitals", "latest"],
    enabled: !!selectedPatientId,
  });

  // Fetch encounters
  const { data: encounters = [] } = useQuery({
    queryKey: ["/api/patients", selectedPatientId, "encounters"],
    enabled: !!selectedPatientId,
  });

  // Fetch allergies for critical alerts
  const { data: allergies = [] } = useQuery({
    queryKey: ["/api/patients", selectedPatientId, "allergies"],
    enabled: !!selectedPatientId,
  });

  // Delete patient mutation
  const deletePatientMutation = useMutation({
    mutationFn: async (patientId: number) => {
      await apiRequest("DELETE", `/api/patients/${patientId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      toast({
        title: "Patient deleted",
        description: "Patient has been successfully deleted.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDeletePatient = async (patientId: number) => {
    // Find next patient to select
    const patientIndex = Array.isArray(allPatients) ? 
      allPatients.findIndex((p: any) => p.id === patientId) : -1;
    const nextPatient = Array.isArray(allPatients) && allPatients.length > 1 ? 
      allPatients[patientIndex === 0 ? 1 : 0] : null;
    
    if (nextPatient) {
      setSelectedPatientId(nextPatient.id);
    } else {
      setSelectedPatientId(null);
    }

    await deletePatientMutation.mutateAsync(patientId);
  };

  if (!selectedPatientId) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Patient Dashboard</h1>
          <Button asChild>
            <Link href="/patients/new">
              <UserPlus className="mr-2 h-4 w-4" />
              Add Patient
            </Link>
          </Button>
        </div>

        {Array.isArray(allPatients) && allPatients.length === 0 ? (
          <Card className="p-12 text-center">
            <h2 className="text-xl font-semibold mb-2">No Patients Found</h2>
            <p className="text-muted-foreground mb-4">
              Start by adding your first patient to the system.
            </p>
            <Button asChild>
              <Link href="/patients/new">
                <UserPlus className="mr-2 h-4 w-4" />
                Add Patient
              </Link>
            </Button>
          </Card>
        ) : (
          <div className="text-center">
            <p>Loading patients...</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Patient Dashboard</h1>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/patients/new">
              <UserPlus className="mr-2 h-4 w-4" />
              Add Patient
            </Link>
          </Button>
          {patient && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Patient
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete{" "}
                    {patient.firstName} {patient.lastName} and all associated medical records.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => handleDeletePatient(selectedPatientId)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete Patient
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {patientLoading ? (
        <div className="text-center">Loading patient data...</div>
      ) : (
        <>
          {patient && (
            <PatientHeader
              patient={patient}
              selectedPatientId={selectedPatientId}
            />
          )}

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mt-6">
            <div className="lg:col-span-1">
              <Card className="p-4">
                <h3 className="font-semibold mb-3">All Patients</h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {Array.isArray(allPatients) && allPatients.map((p: any) => (
                    <div
                      key={p.id}
                      className={`p-2 rounded cursor-pointer transition-colors ${
                        p.id === selectedPatientId
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted"
                      }`}
                      onClick={() => {
                        setSelectedPatientId(p.id);
                        setActiveTab("dashboard");
                      }}
                    >
                      <div className="font-medium text-sm">
                        {p.firstName} {p.lastName}
                      </div>
                      <div className="text-xs opacity-75">MRN: {p.mrn}</div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            <div className="lg:col-span-3">
              {selectedPatientId && (
                <ProviderDashboard selectedPatientId={selectedPatientId} />
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}