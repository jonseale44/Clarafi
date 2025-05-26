import { useState } from "react";
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
  const [selectedPatientId, setSelectedPatientId] = useState<number>(1); // Default to first patient
  const [activeTab, setActiveTab] = useState("encounters");
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);

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
      <Sidebar activeTab="dashboard" />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        <Header 
          onStartVoiceRecording={() => setIsVoiceModalOpen(true)}
          onPatientSearch={setSelectedPatientId}
        />
        
        <div className="flex-1 overflow-auto p-6">
          <PatientHeader patient={patient} allergies={allergies} />
          
          {latestVitals && <QuickStats vitals={latestVitals} />}
          
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
