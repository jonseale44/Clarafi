import { Card } from "@/components/ui/card";
import { Vitals } from "@shared/schema";
import { Heart, Thermometer, Weight, Wind, Activity, Frown } from "lucide-react";

interface QuickStatsProps {
  vitals: Vitals;
}

export function QuickStats({ vitals }: QuickStatsProps) {
  const getVitalStatus = (value: number | null, type: string) => {
    if (!value) return { status: "unknown", color: "text-gray-600" };
    
    switch (type) {
      case "bp":
        if (value > 140) return { status: "Elevated", color: "text-orange-600" };
        if (value > 120) return { status: "High Normal", color: "text-yellow-600" };
        return { status: "Normal", color: "text-green-600" };
      case "hr":
        if (value > 100 || value < 60) return { status: "Abnormal", color: "text-orange-600" };
        return { status: "Normal", color: "text-green-600" };
      case "temp":
        if (value > 100.4) return { status: "Fever", color: "text-red-600" };
        if (value < 97) return { status: "Low", color: "text-navy-blue-600" };
        return { status: "Normal", color: "text-green-600" };
      case "o2sat":
        if (value < 95) return { status: "Low", color: "text-red-600" };
        return { status: "Normal", color: "text-green-600" };
      case "pain":
        if (value > 7) return { status: "Severe", color: "text-red-600" };
        if (value > 4) return { status: "Moderate", color: "text-orange-600" };
        if (value > 0) return { status: "Mild", color: "text-yellow-600" };
        return { status: "None", color: "text-green-600" };
      default:
        return { status: "Normal", color: "text-green-600" };
    }
  };

  const bpStatus = getVitalStatus(vitals.systolicBp, "bp");
  const hrStatus = getVitalStatus(vitals.heartRate, "hr");
  const tempStatus = getVitalStatus(Number(vitals.temperature), "temp");
  const o2Status = getVitalStatus(Number(vitals.oxygenSaturation), "o2sat");
  const painStatus = getVitalStatus(vitals.painScale, "pain");

  const calculateBMI = (weight: number | null, height: number | null) => {
    if (!weight || !height) return null;
    // Assuming weight in lbs and height in inches
    const weightKg = Number(weight) * 0.453592;
    const heightM = Number(height) * 0.0254;
    return (weightKg / (heightM * heightM)).toFixed(1);
  };

  const bmi = calculateBMI(Number(vitals.weight), Number(vitals.height));

  return (
    <div className="grid grid-cols-6 gap-4 mb-6">
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Blood Pressure</p>
            <p className="text-lg font-semibold text-gray-900">
              {vitals.systolicBp && vitals.diastolicBp 
                ? `${vitals.systolicBp}/${vitals.diastolicBp}`
                : "No data"
              }
            </p>
            <p className={`text-xs ${bpStatus.color}`}>{bpStatus.status}</p>
          </div>
          <Heart className={`h-5 w-5 ${bpStatus.color.replace('text-', 'text-')}`} />
        </div>
      </Card>
      
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Heart Rate</p>
            <p className="text-lg font-semibold text-gray-900">
              {vitals.heartRate ? `${vitals.heartRate} bpm` : "No data"}
            </p>
            <p className={`text-xs ${hrStatus.color}`}>{hrStatus.status}</p>
          </div>
          <Activity className={`h-5 w-5 ${hrStatus.color.replace('text-', 'text-')}`} />
        </div>
      </Card>
      
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Temperature</p>
            <p className="text-lg font-semibold text-gray-900">
              {vitals.temperature ? `${vitals.temperature}°F` : "No data"}
            </p>
            <p className={`text-xs ${tempStatus.color}`}>{tempStatus.status}</p>
          </div>
          <Thermometer className={`h-5 w-5 ${tempStatus.color.replace('text-', 'text-')}`} />
        </div>
      </Card>
      
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Weight</p>
            <p className="text-lg font-semibold text-gray-900">
              {vitals.weight ? `${vitals.weight} lbs` : "No data"}
            </p>
            <p className="text-xs text-gray-600">
              {bmi ? `BMI ${bmi}` : "BMI N/A"}
            </p>
          </div>
          <Weight className="h-5 w-5 text-gray-500" />
        </div>
      </Card>
      
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">O2 Saturation</p>
            <p className="text-lg font-semibold text-gray-900">
              {vitals.oxygenSaturation ? `${vitals.oxygenSaturation}%` : "No data"}
            </p>
            <p className={`text-xs ${o2Status.color}`}>{o2Status.status}</p>
          </div>
          <Wind className={`h-5 w-5 ${o2Status.color.replace('text-', 'text-')}`} />
        </div>
      </Card>
      
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Pain Scale</p>
            <p className="text-lg font-semibold text-gray-900">
              {vitals.painScale !== null ? `${vitals.painScale}/10` : "No data"}
            </p>
            <p className={`text-xs ${painStatus.color}`}>{painStatus.status}</p>
          </div>
          <Frown className={`h-5 w-5 ${painStatus.color.replace('text-', 'text-')}`} />
        </div>
      </Card>
    </div>
  );
}
