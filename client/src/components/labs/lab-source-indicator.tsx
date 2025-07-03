/**
 * Lab Source Indicator Component
 * Shows confidence and source type for lab results with color coding
 */

import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { TestTube, User, Upload, FileText, Database } from "lucide-react";

interface LabSourceIndicatorProps {
  sourceType: string;
  sourceConfidence: number;
  sourceNotes?: string;
  className?: string;
}

export function LabSourceIndicator({ 
  sourceType, 
  sourceConfidence, 
  sourceNotes, 
  className = "" 
}: LabSourceIndicatorProps) {
  
  const getSourceConfig = (type: string) => {
    switch (type) {
      case 'lab_order':
        return {
          label: 'Lab Order',
          icon: TestTube,
          color: 'bg-green-100 text-green-800 border-green-200',
          description: 'Official laboratory result from ordered test'
        };
      case 'patient_reported':
        return {
          label: 'Patient Reported',
          icon: User,
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          description: 'Value reported by patient (verbal or written)'
        };
      case 'external_upload':
        return {
          label: 'External Upload',
          icon: Upload,
          color: 'bg-navy-blue-100 text-navy-blue-800 border-navy-blue-200',
          description: 'Lab report uploaded from external source'
        };
      case 'provider_entered':
        return {
          label: 'Provider Entered',
          icon: FileText,
          color: 'bg-purple-100 text-purple-800 border-purple-200',
          description: 'Manually entered by clinical staff'
        };
      case 'imported_records':
        return {
          label: 'Imported',
          icon: Database,
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          description: 'Imported from previous EMR system'
        };
      default:
        return {
          label: 'Unknown',
          icon: TestTube,
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          description: 'Source type not specified'
        };
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'text-green-600';
    if (confidence >= 0.7) return 'text-yellow-600';
    return 'text-red-600';
  };

  const config = getSourceConfig(sourceType);
  const Icon = config.icon;
  const confidencePercent = Math.round(sourceConfidence * 100);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`flex items-center space-x-1 ${className}`}>
            <Badge variant="outline" className={`${config.color} text-xs`}>
              <Icon className="h-3 w-3 mr-1" />
              {config.label}
            </Badge>
            <span className={`text-xs font-medium ${getConfidenceColor(sourceConfidence)}`}>
              {confidencePercent}%
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-1">
            <p className="font-medium">{config.description}</p>
            <p className="text-sm">Confidence: {confidencePercent}%</p>
            {sourceNotes && (
              <p className="text-sm text-gray-600">{sourceNotes}</p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}