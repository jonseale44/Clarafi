import { useState, useEffect } from "react";
import { PatientHeader } from "@/components/patient/patient-header";
import { QuickStats } from "@/components/patient/quick-stats";
import { EncountersTab } from "@/components/patient/encounters-tab";
import { PatientChartView } from "@/components/patient/patient-chart-view";
import { ProviderDashboard } from "@/components/dashboard/provider-dashboard";
import { PatientTable } from "@/components/dashboard/patient-table";
import { PasskeySetupPrompt } from "@/components/passkey-setup-prompt";
import { AppLayout } from "@/components/layout/app-layout";
// Legacy PDFViewer import removed - PDFs are now in patient charts only

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Patient, Vitals, User } from "@shared/schema";
import { Link, useLocation } from "wouter";
import { TrialStatusBanner } from "@/components/trial-status-banner";
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
import { analytics } from "@/lib/analytics";

export default function Dashboard() {
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [location, setLocation] = useLocation();

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch current user data
  const { data: currentUser } = useQuery<User>({
    queryKey: ["/api/user"],
  });

  // Redirect admin users to the appropriate admin dashboard
  useEffect(() => {
    console.log('Dashboard redirect check:', {
      currentUser,
      role: currentUser?.role,
      healthSystemId: currentUser?.healthSystemId,
      location,
      shouldRedirect: currentUser?.role === 'admin' && (location === '/dashboard' || location === '/')
    });
    
    if (currentUser?.role === 'admin' && (location === '/dashboard' || location === '/')) {
      // System admin has username 'admin' - this is the Clarafi system administrator
      // Clinic admins are regular admin users of specific health systems
      if (currentUser.username === 'admin') {
        console.log('Redirecting system admin to /admin');
        setLocation('/admin');
      } else {
        console.log('Redirecting clinic admin to /clinic-admin');
        setLocation('/clinic-admin');
      }
    }
  }, [currentUser, location, setLocation]);

  // Fetch all patients to select the first one
  const { data: allPatients = [] } = useQuery<Patient[]>({
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
    onSuccess: (encounter) => {
      // Refresh encounters data
      queryClient.invalidateQueries({ queryKey: ["/api/patients", selectedPatientId, "encounters"] });
      
      // Track encounter creation
      analytics.trackFeatureUsage('encounter_creation', 'created', {
        encounterType: encounter.encounterType,
        encounterSubtype: encounter.encounterSubtype,
        patientId: encounter.patientId,
        providerId: encounter.providerId,
        source: 'dashboard'
      });
      
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
    <AppLayout showBreadcrumb={false}>
      <div className="flex-1 flex flex-col">
        {/* Page Header with Tabs */}
        <div className="bg-white border-b border-gray-200">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between py-4">
              {/* Left side - Tab Navigation */}
              <nav className="flex items-center space-x-1" data-median="mobile-dashboard-tabs mobile-scrollable-nav">
                <button
                  onClick={() => setActiveTab("dashboard")}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === "dashboard" 
                      ? "bg-primary text-white" 
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  }`}
                >
                  Dashboard
                </button>
                <button
                  onClick={() => setActiveTab("patients")}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === "patients" 
                      ? "bg-primary text-white" 
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  }`}
                >
                  Patients
                </button>
                <button
                  onClick={() => setActiveTab("encounters")}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === "encounters" 
                      ? "bg-primary text-white" 
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  }`}
                >
                  Encounters
                </button>
              </nav>
              
              {/* Right side - Actions */}
              <div className="flex items-center space-x-4">
                <Link href="/patients/create">
                  <Button className="flex items-center gap-2" size="sm" data-median="mobile-compact-button">
                    <UserPlus className="h-4 w-4" />
                    <span data-median="hide-on-mobile-app">Create Patient</span>
                  </Button>
                </Link>
              </div>
            </div>
            
            {/* Secondary Navigation - External Links */}
            <div className="flex items-center space-x-6 pb-2 text-sm">
              <Link href="/scheduling" data-median="hide-on-mobile-app" className="text-gray-600 hover:text-gray-900">
                Scheduling
              </Link>
              <Link href="/blog" data-median="hide-on-mobile-app" className="text-gray-600 hover:text-gray-900">
                Blog
              </Link>
              {currentUser?.role === 'provider' && (
                <Link href="/practice-migration" data-median="hide-on-mobile-app" className="text-gray-600 hover:text-gray-900">
                  Practice Migration
                </Link>
              )}
            </div>
          </div>
        </div>
        
        {/* Main Content Area */}
        <main className="flex-1 overflow-auto p-6">
          {/* Trial Status Banner - only show for non-admin users */}
          {currentUser?.role !== 'admin' && <TrialStatusBanner />}
          
          {renderTabContent()}
        </main>
        
        {/* Passkey Setup Prompt - shown automatically for users without passkeys */}
        {currentUser?.id && <PasskeySetupPrompt userId={currentUser.id} />}
      </div>
    </AppLayout>
  );
}