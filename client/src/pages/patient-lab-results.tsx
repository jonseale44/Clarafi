import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LabResultsMatrix } from "@/components/labs/lab-results-matrix";
import { ComprehensiveLabTable } from "@/components/labs/comprehensive-lab-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function PatientLabResults() {
  const { patientId } = useParams<{ patientId: string }>();
  const [, setLocation] = useLocation();
  
  const { data: patient } = useQuery({
    queryKey: [`/api/patients/${patientId}`],
    enabled: !!patientId
  });

  const patientData = patient as any;

  if (!patientId) {
    return <div>Patient ID not found</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => setLocation(`/patients/${patientId}`)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Patient Chart
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">Lab Results</h1>
          {patientData && (
            <p className="text-muted-foreground">
              {patientData.firstName} {patientData.lastName} (MRN: {patientData.mrn})
            </p>
          )}
        </div>
      </div>

      {/* Lab Results Views */}
      <Tabs defaultValue="matrix" className="space-y-4">
        <TabsList>
          <TabsTrigger value="matrix">Matrix View</TabsTrigger>
          <TabsTrigger value="table">Detailed Table</TabsTrigger>
        </TabsList>
        
        <TabsContent value="matrix">
          <LabResultsMatrix 
            patientId={parseInt(patientId)} 
            mode="full"
            showTitle={false}
          />
        </TabsContent>
        
        <TabsContent value="table">
          <ComprehensiveLabTable 
            patientId={parseInt(patientId)} 
            patientName={patientData ? `${patientData.firstName} ${patientData.lastName}` : 'Patient'}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}