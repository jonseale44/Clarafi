import { useState, useEffect } from "react";
import { PatientHeader } from "@/components/patient/patient-header";
import { QuickStats } from "@/components/patient/quick-stats";
import { EncountersTab } from "@/components/patient/encounters-tab";
import { PatientChartView } from "@/components/patient/patient-chart-view";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Patient, Vitals } from "@shared/schema";

export default function Dashboard() {
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("dashboard");

  const { toast } = useToast();
  const queryClient = useQueryClient();

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
        return (
          <div className="space-y-6">
            <Card className="p-6">
              <h2 className="text-2xl font-bold mb-4">Provider Dashboard</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-yellow-800">Pending Encounters</h3>
                  <p className="text-2xl font-bold text-yellow-600">3</p>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-blue-800">Lab Orders to Review</h3>
                  <p className="text-2xl font-bold text-blue-600">7</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-green-800">Completed Today</h3>
                  <p className="text-2xl font-bold text-green-600">12</p>
                </div>
              </div>
            </Card>
          </div>
        );
      
      case "patients":
        return (
          <Card className="p-6">
            <h2 className="text-2xl font-bold mb-4">Patient Directory</h2>
            <div className="space-y-4">
              {Array.isArray(allPatients) && allPatients.map((p: any) => (
                <div key={p.id} className="border p-4 rounded-lg cursor-pointer hover:bg-gray-50" onClick={() => {
                  setSelectedPatientId(p.id);
                  setActiveTab("encounters");
                }}>
                  <h3 className="font-semibold">{p.firstName} {p.lastName}</h3>
                  <p className="text-gray-600">MRN: {p.mrn} | DOB: {new Date(p.dateOfBirth).toLocaleDateString()}</p>
                  <div className="mt-2">
                    <span className={`px-2 py-1 text-xs rounded ${selectedPatientId === p.id ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'}`}>
                      {selectedPatientId === p.id ? 'Currently Selected' : 'Click to Select'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
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
      
      case "voice-recording":
        return (
          <Card className="p-6">
            <h2 className="text-2xl font-bold mb-4">AI Voice Recording</h2>
            <p className="text-gray-600 mb-4">Voice recording functionality has been removed.</p>
          </Card>
        );
      
      case "lab-orders":
        return (
          <Card className="p-6">
            <h2 className="text-2xl font-bold mb-4">Laboratory Orders</h2>
            <p className="text-gray-600">Lab order management and results tracking.</p>
          </Card>
        );
      
      case "imaging":
        return (
          <Card className="p-6">
            <h2 className="text-2xl font-bold mb-4">Imaging Orders</h2>
            <p className="text-gray-600">Radiology and imaging order management.</p>
          </Card>
        );
      
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
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">M</span>
              </div>
              <span className="font-bold text-xl text-primary">MediFlow</span>
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
              <button
                onClick={() => setActiveTab("voice-recording")}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === "voice-recording" 
                    ? "bg-primary text-white" 
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                }`}
              >
                Voice Recording
              </button>
              <button
                onClick={() => setActiveTab("lab-orders")}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === "lab-orders" 
                    ? "bg-primary text-white" 
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                }`}
              >
                Lab Orders
              </button>
              <button
                onClick={() => setActiveTab("imaging")}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === "imaging" 
                    ? "bg-primary text-white" 
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                }`}
              >
                Imaging
              </button>
            </nav>
          </div>
          
          {/* Right side - User info and actions */}
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-600">
              Jonathan Seale
            </div>
          </div>
        </div>
      </div>
      
      <main className="flex-1 overflow-auto p-6">
        {renderTabContent()}
      </main>
    </div>
  );
}