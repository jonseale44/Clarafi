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
      if (complexityFactors.noShowRate && complexityFactors.noShowRate > 30) {
        reasons.push(`High no-show rate: ${Math.round(complexityFactors.noShowRate)}%`);
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
              <TooltipContent className="max-w-md">
                <div className="space-y-3">
                  <p className="font-semibold text-lg">AI Scheduling Factors</p>
                  
                  {/* Primary Factor */}
                  {complexityFactors?.historicalAvg && complexityFactors.historicalAvg > 0 && (
                    <div className="border-b pb-2">
                      <p className="font-medium text-green-600">Primary Factor (80% weight when available)</p>
                      <div className="text-sm mt-1">
                        <div className="flex justify-between">
                          <span>Historical visit average:</span>
                          <span className="font-semibold">{complexityFactors.historicalAvg} min</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Includes recording duration from voice sessions</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Secondary Factors */}
                  <div className="space-y-2">
                    <p className="font-medium">Secondary Adjustments</p>
                    
                    {/* Patient Complexity */}
                    <div className="text-sm space-y-1">
                      <p className="font-medium text-gray-700">Patient Complexity:</p>
                      <div className="ml-2 space-y-0.5">
                        <div className="flex justify-between">
                          <span>• Medical problems ({complexityFactors?.problemCount || 0}):</span>
                          <span>+{Math.min((complexityFactors?.problemCount || 0) * 1.5, 15).toFixed(0)} min</span>
                        </div>
                        <div className="flex justify-between">
                          <span>• Medications ({complexityFactors?.medicationCount || 0}):</span>
                          <span>+{(complexityFactors?.medicationCount || 0) > 10 ? 10 : (complexityFactors?.medicationCount || 0) > 5 ? 5 : 0} min</span>
                        </div>
                        <div className="flex justify-between">
                          <span>• Age ({complexityFactors?.age || 0} years):</span>
                          <span>+{(complexityFactors?.age || 0) > 80 ? 10 : (complexityFactors?.age || 0) > 65 ? 5 : 0} min</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Patient Behavior */}
                    <div className="text-sm space-y-1">
                      <p className="font-medium text-gray-700">Patient Behavior:</p>
                      <div className="ml-2 space-y-0.5">
                        <div className="flex justify-between">
                          <span>• No-show rate ({(complexityFactors?.noShowRate || 0).toFixed(0)}%):</span>
                          <span>{(complexityFactors?.noShowRate || 0) > 30 ? '-5' : '0'} min</span>
                        </div>
                        <div className="flex justify-between">
                          <span>• Avg arrival ({(complexityFactors?.avgArrivalDelta || 0) > 0 ? '+' : ''}{complexityFactors?.avgArrivalDelta || 0} min):</span>
                          <span>{(complexityFactors?.avgArrivalDelta || 0) > 10 ? '+5' : '0'} min</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Provider & Time Factors */}
                    <div className="text-sm space-y-1">
                      <p className="font-medium text-gray-700">Other Factors:</p>
                      <div className="ml-2 space-y-0.5">
                        <div>• Provider efficiency (±5 min based on history)</div>
                        <div>• Time of day (after 3pm: +5 min)</div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Summary */}
                  <div className="border-t pt-2 text-sm">
                    <div className="flex justify-between font-semibold">
                      <span>Total adjustment:</span>
                      <span className={complexityFactors?.durationAdjustment && complexityFactors.durationAdjustment > 0 ? 'text-red-600' : 'text-green-600'}>
                        {complexityFactors?.durationAdjustment && complexityFactors.durationAdjustment > 0 ? '+' : ''}{complexityFactors?.durationAdjustment || 0} min
                      </span>
                    </div>
                  </div>
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