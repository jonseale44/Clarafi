import { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { PatientHeader } from "@/components/patient/patient-header";
import { QuickStats } from "@/components/patient/quick-stats";
import { EncountersTab } from "@/components/patient/encounters-tab";
import { VoiceRecordingModal } from "@/components/voice/voice-recording-modal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Patient, Vitals } from "@shared/schema";

export default function Dashboard() {
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);

  // Fetch all patients to select the first one
  const { data: allPatients = [] } = useQuery({
    queryKey: ["/api/patients"],
  });

  // Auto-select first patient when patients are loaded
  useEffect(() => {
    if (allPatients.length > 0 && !selectedPatientId) {
      setSelectedPatientId(allPatients[0].id);
    }
  }, [allPatients, selectedPatientId]);

  const renderTabContent = () => {
    switch (activeTab) {
      case "dashboard":
        if (!patient) return <div className="text-center py-8">Select a patient to view dashboard</div>;
        return (
          <>
            <PatientHeader patient={patient} allergies={allergies} />
            {latestVitals && <QuickStats vitals={latestVitals} />}
          </>
        );
      
      case "patients":
        return (
          <Card className="p-6">
            <h2 className="text-2xl font-bold mb-4">Patient Directory</h2>
            <div className="space-y-4">
              {(allPatients as any[]).map((p: any) => (
                <div key={p.id} className="border p-4 rounded-lg cursor-pointer hover:bg-gray-50" onClick={() => {
                  setSelectedPatientId(p.id);
                  setActiveTab("dashboard");
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
        if (!patient) return <div className="text-center py-8">Select a patient to view encounters</div>;
        return (
          <>
            <PatientHeader patient={patient} allergies={allergies} />
            <EncountersTab encounters={encounters} patientId={selectedPatientId!} onStartVoiceNote={() => setIsVoiceModalOpen(true)} />
          </>
        );
      
      case "voice-recording":
        return (
          <Card className="p-6">
            <h2 className="text-2xl font-bold mb-4">AI Voice Recording</h2>
            <p className="text-gray-600 mb-4">Start voice recording to generate clinical notes with AI assistance.</p>
            <Button onClick={() => setIsVoiceModalOpen(true)} className="bg-primary">
              Start Voice Recording
            </Button>
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
        return <div>Select a tab to view content</div>;
    }
  };

  // Fetch patient data
  const { data: patient, isLoading: patientLoading } = useQuery<Patient>({
    queryKey: ["/api/patients", selectedPatientId],
    enabled: !!selectedPatientId,
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

  if (!patient) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">No patient selected</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        <Header 
          onStartVoiceRecording={() => setIsVoiceModalOpen(true)}
          onPatientSearch={setSelectedPatientId}
        />
        
        <div className="flex-1 overflow-auto p-6">
          {renderTabContent()}
          
          <Card className="mt-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <div className="border-b border-gray-200">
                <TabsList className="h-auto p-0 bg-transparent">
                  <div className="flex space-x-8 px-6">
                    <TabsTrigger 
                      value="encounters" 
                      className="border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary py-4 px-1 rounded-none bg-transparent"
                    >
                      Encounters
                    </TabsTrigger>
                    <TabsTrigger 
                      value="medical-history" 
                      className="border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary py-4 px-1 rounded-none bg-transparent"
                    >
                      Medical History
                    </TabsTrigger>
                    <TabsTrigger 
                      value="medications" 
                      className="border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary py-4 px-1 rounded-none bg-transparent"
                    >
                      Medications
                    </TabsTrigger>
                    <TabsTrigger 
                      value="lab-results" 
                      className="border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary py-4 px-1 rounded-none bg-transparent"
                    >
                      Lab Results
                    </TabsTrigger>
                    <TabsTrigger 
                      value="imaging" 
                      className="border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary py-4 px-1 rounded-none bg-transparent"
                    >
                      Imaging
                    </TabsTrigger>
                    <TabsTrigger 
                      value="family-history" 
                      className="border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary py-4 px-1 rounded-none bg-transparent"
                    >
                      Family History
                    </TabsTrigger>
                  </div>
                </TabsList>
              </div>
              
              <TabsContent value="encounters" className="p-6">
                <EncountersTab 
                  encounters={encounters} 
                  patientId={selectedPatientId}
                  onStartVoiceNote={() => setIsVoiceModalOpen(true)}
                />
              </TabsContent>
              
              <TabsContent value="medical-history" className="p-6">
                <div className="text-center py-8">
                  <p className="text-gray-500">Medical history management coming soon</p>
                </div>
              </TabsContent>
              
              <TabsContent value="medications" className="p-6">
                <div className="text-center py-8">
                  <p className="text-gray-500">Medication management coming soon</p>
                </div>
              </TabsContent>
              
              <TabsContent value="lab-results" className="p-6">
                <div className="text-center py-8">
                  <p className="text-gray-500">Lab results management coming soon</p>
                </div>
              </TabsContent>
              
              <TabsContent value="imaging" className="p-6">
                <div className="text-center py-8">
                  <p className="text-gray-500">Imaging management coming soon</p>
                </div>
              </TabsContent>
              
              <TabsContent value="family-history" className="p-6">
                <div className="text-center py-8">
                  <p className="text-gray-500">Family history management coming soon</p>
                </div>
              </TabsContent>
            </Tabs>
          </Card>
        </div>
      </main>
      
      <VoiceRecordingModal 
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        patientId={selectedPatientId}
      />
    </div>
  );
}
