import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { VitalsFlowsheet } from "@/components/vitals/vitals-flowsheet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity } from "lucide-react";

export function VitalsFlowsheetPage() {
  const { encounterId } = useParams<{ encounterId: string }>();
  const encounterIdNum = parseInt(encounterId);

  // Fetch encounter and patient data
  const { data: encounterData } = useQuery({
    queryKey: ['/api/encounters', encounterIdNum],
    enabled: !!encounterIdNum
  });

  if (!encounterIdNum || isNaN(encounterIdNum)) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-gray-500">Invalid encounter ID</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center space-x-2">
        <Activity className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Vitals Management</h1>
        {encounterData?.encounter && (
          <span className="text-gray-500">
            - {encounterData.encounter.encounterType} for {encounterData.patient?.firstName} {encounterData.patient?.lastName}
          </span>
        )}
      </div>

      <VitalsFlowsheet
        encounterId={encounterIdNum}
        patientId={encounterData?.encounter?.patientId}
        patient={encounterData?.patient}
      />
    </div>
  );
}