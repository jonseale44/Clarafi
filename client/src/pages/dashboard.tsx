import { useState, useEffect } from "react";
import { PatientHeader } from "@/components/patient/patient-header";
import { QuickStats } from "@/components/patient/quick-stats";
import { EncountersTab } from "@/components/patient/encounters-tab";
import { PatientChartView } from "@/components/patient/patient-chart-view";
import { ProviderDashboard } from "@/components/dashboard/provider-dashboard";
import { UserProfileMenu } from "@/components/user-profile-menu";
import { PatientTable } from "@/components/dashboard/patient-table";
// Legacy PDFViewer import removed - PDFs are now in patient charts only

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Patient, Vitals } from "@shared/schema";
import { Link, useLocation } from "wouter";
import { UserPlus, Trash2, MessageSquare } from "lucide-react";
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
  const [, setLocation] = useLocation();

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch current user data
  const { data: currentUser } = useQuery({
    queryKey: ["/api/user"],
  });

  // Fetch all patients to select the first one
  const { data: allPatients = [] } = useQuery({
    queryKey: ["/api/patients"],
  });

  // Auto-select first patient when patients are loaded
  useEffect(() => {
    if (Array.isArray(allPatients) && allPatients.length > 0 && !selectedPatientId) {
      setSelectedPatientId(allPatients[0].id);
    }
  }, [allPatients, selectedPatientId]);

  // Fetch patient data
  const { data: patient, isLoading: patientLoading } = useQuery<Patient>({
    queryKey: ["/api/patients", selectedPatientId],
    enabled: !!selectedPatientId,
    queryFn: () => {
      console.log('Fetching patient with ID:', selectedPatientId);
      return fetch(`/api/patients/${selectedPatientId}`)
        .then(res => {
          if (!res.ok) throw new Error('Failed to fetch patient');
          return res.json();
        });
    }
  });

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

  // Mutation to create new encounter
  const createEncounterMutation = useMutation({
    mutationFn: async (encounterData: any) => {
      const response = await fetch('/api/encounters', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(encounterData),
      });
      if (!response.ok) throw new Error('Failed to create encounter');
      return response.json();
    },
    onSuccess: () => {
      // Refresh encounters data
      queryClient.invalidateQueries({ queryKey: ["/api/patients", selectedPatientId, "encounters"] });
      toast({
        title: "Success",
        description: "New encounter created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deletePatientMutation = useMutation({
    mutationFn: async (patientId: number) => {
      const response = await apiRequest("DELETE", `/api/patients/${patientId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      if (selectedPatientId && allPatients.length > 1) {
        const remainingPatients = allPatients.filter((p: any) => p.id !== selectedPatientId);
        setSelectedPatientId(remainingPatients[0]?.id || null);
      } else {
        setSelectedPatientId(null);
      }
      toast({
        title: "Patient Deleted",
        description: "Patient has been successfully removed from the system",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Delete Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDeletePatient = (patientId: number) => {
    deletePatientMutation.mutate(patientId);
  };

  const handleStartNewEncounter = async () => {
    if (!selectedPatientId) return;
    
    const encounterData = {
      patientId: selectedPatientId,
      providerId: 1, // Assuming current user is provider
      encounterType: "Office Visit",
      encounterSubtype: "Routine",
      startTime: new Date().toISOString(),
      status: "In Progress",
      chiefComplaint: "",
      presentIllness: "",
      assessmentPlan: "",
      providerNotes: "",
    };

    createEncounterMutation.mutate(encounterData);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <ProviderDashboard />;
      
      case "patients":
        return (
          <Card className="p-6">
            <h2 className="text-2xl font-bold mb-4">Patient Directory</h2>
            <PatientTable patients={allPatients} />
          </Card>
        );
      
      case "encounters":
        if (patientLoading) {
          return (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-gray-600">Loading patient information...</p>
            </div>
          );
        }
        if (!patient) return <div className="text-center py-8">Select a patient to view encounters</div>;
        return <PatientChartView patient={patient} patientId={selectedPatientId!} />;
      

      


      
      default:
        return <div>Content not found</div>;
    }
  };

  if (patientLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading patient data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background flex flex-col">
      {/* Top Navigation Bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="flex items-center justify-between">
          {/* Left side - Brand and Navigation */}
          <div className="flex items-center space-x-8">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-navy-blue rounded-lg flex items-center justify-center">
                <span className="text-gold font-bold text-sm">C</span>
              </div>
              <span className="font-bold text-xl">
                <span className="text-navy-blue">CLAR</span><span className="text-gold">A</span><span className="text-navy-blue">F</span><span className="text-gold">I</span>
              </span>
            </div>
            
            {/* Main Navigation */}
            <nav className="flex items-center space-x-6">
              <button
                onClick={() => setActiveTab("dashboard")}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === "dashboard" 
                    ? "bg-primary text-white" 
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                }`}
              >
                Dashboard
              </button>
              <button
                onClick={() => setActiveTab("patients")}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === "patients" 
                    ? "bg-primary text-white" 
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                }`}
              >
                Patients
              </button>
              <button
                onClick={() => setActiveTab("encounters")}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === "encounters" 
                    ? "bg-primary text-white" 
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                }`}
              >
                Encounters
              </button>
              {/* Admin-only navigation items */}
              {currentUser?.role === 'admin' && (
                <>
                  <Link href="/admin/prompts">
                    <button className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      false // Admin pages don't have active state in dashboard
                        ? "bg-primary text-white" 
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                    }`}>
                      Admin Prompts
                    </button>
                  </Link>
                  <Link href="/admin/users">
                    <button className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      false // Admin pages don't have active state in dashboard
                        ? "bg-primary text-white" 
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                    }`}>
                      Admin Users
                    </button>
                  </Link>
                  <Link href="/admin/subscription-config">
                    <button className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      false // Admin pages don't have active state in dashboard
                        ? "bg-primary text-white" 
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                    }`}>
                      Subscription Config
                    </button>
                  </Link>
                  <Link href="/admin/health-system-upgrade">
                    <button className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      false // Admin pages don't have active state in dashboard
                        ? "bg-primary text-white" 
                        : "text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50"
                    }`}>
                      🚀 Test Upgrade
                    </button>
                  </Link>
                  <Link href="/admin/subscription-keys">
                    <button className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      false // Admin pages don't have active state in dashboard
                        ? "bg-primary text-white" 
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                    }`}>
                      Subscription Keys
                    </button>
                  </Link>
                  <Link href="/admin/clinic-import">
                    <button className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      false // Admin pages don't have active state in dashboard
                        ? "bg-primary text-white" 
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                    }`}>
                      Clinic Import
                    </button>
                  </Link>
                  <Link href="/practice-migration">
                    <button className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      false // Admin pages don't have active state in dashboard
                        ? "bg-primary text-white" 
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                    }`}>
                      Practice Migration
                    </button>
                  </Link>
                </>
              )}
              
              {/* Practice Migration for providers */}
              {currentUser?.role === 'provider' && (
                <Link href="/practice-migration">
                  <button className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    false
                      ? "bg-primary text-white" 
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  }`}>
                    Practice Migration
                  </button>
                </Link>
              )}
              

            </nav>
          </div>
          
          {/* Right side - User info and actions */}
          <div className="flex items-center space-x-4">
            <Link href="/patients/create">
              <Button className="flex items-center gap-2" size="sm">
                <UserPlus className="h-4 w-4" />
                Create Patient
              </Button>
            </Link>
            <UserProfileMenu />
          </div>
        </div>
      </div>
      
      <main className="flex-1 overflow-auto p-6">
        {renderTabContent()}
      </main>
    </div>
  );
}