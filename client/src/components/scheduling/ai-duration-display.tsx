import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Card } from "@/components/ui/card";

interface AIDurationDisplayProps {
  baseDuration: number;
  patientVisibleDuration: number;
  providerScheduledDuration: number;
  aiPredictedDuration: number;
  complexityFactors?: {
    problemCount?: number;
    medicationCount?: number;
    age?: number;
    noShowRate?: number;
    avgArrivalDelta?: number;
    historicalAvg?: number;
  };
}

export function AIDurationDisplay({
  baseDuration,
  patientVisibleDuration,
  providerScheduledDuration,
  aiPredictedDuration,
  complexityFactors
}: AIDurationDisplayProps) {
  const durationDifference = aiPredictedDuration - baseDuration;
  const hasAdjustment = Math.abs(durationDifference) > 0;
  
  const getAdjustmentReasons = () => {
    const reasons = [];
    
    if (complexityFactors) {
      if (complexityFactors.problemCount && complexityFactors.problemCount > 5) {
        reasons.push(`${complexityFactors.problemCount} active medical problems`);
      }
      if (complexityFactors.medicationCount && complexityFactors.medicationCount > 5) {
        reasons.push(`${complexityFactors.medicationCount} active medications`);
      }
      if (complexityFactors.age && complexityFactors.age > 65) {
        reasons.push(`Patient age: ${complexityFactors.age} years`);
      }
      if (complexityFactors.noShowRate && complexityFactors.noShowRate > 0.3) {
        reasons.push(`High no-show rate: ${Math.round(complexityFactors.noShowRate * 100)}%`);
      }
      if (complexityFactors.avgArrivalDelta && complexityFactors.avgArrivalDelta > 10) {
        reasons.push(`Typically arrives ${Math.round(complexityFactors.avgArrivalDelta)} min late`);
      }
    }
    
    return reasons;
  };
  
  const reasons = getAdjustmentReasons();
  
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">AI Scheduling</span>
        {hasAdjustment && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-blue-500" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <div className="space-y-2">
                  <p className="font-medium">AI Duration Adjustment</p>
                  {reasons.length > 0 ? (
                    <ul className="list-disc list-inside text-sm">
                      {reasons.map((reason, idx) => (
                        <li key={idx}>{reason}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm">Based on historical patterns and provider efficiency</p>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      
      <Card className="p-3 bg-blue-50 border-blue-200">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-gray-600">Standard:</span>
            <span className="ml-2 font-medium">{baseDuration} min</span>
          </div>
          <div>
            <span className="text-gray-600">AI Predicted:</span>
            <span className="ml-2 font-medium text-blue-600">
              {aiPredictedDuration} min
              {durationDifference > 0 && ` (+${durationDifference})`}
              {durationDifference < 0 && ` (${durationDifference})`}
            </span>
          </div>
          <div>
            <span className="text-gray-600">Patient Sees:</span>
            <span className="ml-2 font-medium">{patientVisibleDuration} min</span>
          </div>
          <div>
            <span className="text-gray-600">Provider Scheduled:</span>
            <span className="ml-2 font-medium text-green-600">{providerScheduledDuration} min</span>
          </div>
        </div>
      </Card>
    </div>
  );
}