import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  FileText, 
  User, 
  Upload, 
  Database, 
  TestTube, 
  Stethoscope, 
  ClipboardList,
  UserCheck,
  Family,
  Eye,
  Building
} from "lucide-react";

interface SourceIndicatorProps {
  sourceType: string;
  sourceConfidence?: number;
  sourceNotes?: string;
  extractedFromAttachmentId?: number;
  enteredBy?: number;
  className?: string;
}

export function SourceIndicator({ 
  sourceType, 
  sourceConfidence, 
  sourceNotes, 
  extractedFromAttachmentId,
  enteredBy,
  className = "" 
}: SourceIndicatorProps) {
  
  const getSourceConfig = (type: string) => {
    switch (type) {
      case 'manual_entry':
        return {
          label: 'Manual Entry',
          icon: FileText,
          color: 'bg-blue-100 text-blue-800 border-blue-200',
          description: 'Manually entered by clinical staff'
        };
      case 'attachment_extracted':
        return {
          label: 'From Document',
          icon: Upload,
          color: 'bg-purple-100 text-purple-800 border-purple-200',
          description: 'Extracted from uploaded medical document'
        };
      case 'soap_derived':
        return {
          label: 'From SOAP Note',
          icon: ClipboardList,
          color: 'bg-green-100 text-green-800 border-green-200',
          description: 'Parsed from encounter SOAP note'
        };
      case 'patient_reported':
        return {
          label: 'Patient Reported',
          icon: User,
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          description: 'Reported by patient during encounter'
        };
      case 'family_reported':
        return {
          label: 'Family Reported',
          icon: Family,
          color: 'bg-orange-100 text-orange-800 border-orange-200',
          description: 'Reported by family member or caregiver'
        };
      case 'provider_verified':
      case 'provider_observed':
        return {
          label: 'Provider Verified',
          icon: UserCheck,
          color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          description: 'Verified or observed by healthcare provider'
        };
      case 'device_imported':
        return {
          label: 'Device Import',
          icon: TestTube,
          color: 'bg-cyan-100 text-cyan-800 border-cyan-200',
          description: 'Imported from medical device'
        };
      case 'lab_order':
        return {
          label: 'Lab Order',
          icon: TestTube,
          color: 'bg-green-100 text-green-800 border-green-200',
          description: 'Official laboratory result'
        };
      case 'imported_records':
        return {
          label: 'Imported',
          icon: Database,
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          description: 'Imported from previous EMR system'
        };
      case 'order_derived':
        return {
          label: 'From Order',
          icon: ClipboardList,
          color: 'bg-indigo-100 text-indigo-800 border-indigo-200',
          description: 'Generated from medication order'
        };
      case 'nurse_manual':
        return {
          label: 'Nurse Entry',
          icon: Stethoscope,
          color: 'bg-pink-100 text-pink-800 border-pink-200',
          description: 'Manually entered by nursing staff'
        };
      case 'provider_manual':
        return {
          label: 'Provider Entry',
          icon: UserCheck,
          color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          description: 'Manually entered by provider'
        };
      case 'pharmacy_reconciliation':
        return {
          label: 'Pharmacy',
          icon: Building,
          color: 'bg-violet-100 text-violet-800 border-violet-200',
          description: 'From pharmacy medication history'
        };
      default:
        return {
          label: 'Unknown Source',
          icon: FileText,
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          description: 'Source type not specified'
        };
    }
  };

  const config = getSourceConfig(sourceType);
  const IconComponent = config.icon;
  
  const getConfidenceColor = (confidence?: number) => {
    if (!confidence) return '';
    if (confidence >= 0.9) return 'text-green-600';
    if (confidence >= 0.7) return 'text-yellow-600';
    return 'text-red-600';
  };

  const formatConfidence = (confidence?: number) => {
    if (!confidence) return null;
    return `${Math.round(confidence * 100)}%`;
  };

  const tooltipContent = (
    <div className="space-y-2">
      <div className="font-medium">{config.label}</div>
      <div className="text-sm text-gray-600">{config.description}</div>
      {sourceConfidence && (
        <div className="text-sm">
          <span className="text-gray-500">Confidence: </span>
          <span className={getConfidenceColor(sourceConfidence)}>
            {formatConfidence(sourceConfidence)}
          </span>
        </div>
      )}
      {extractedFromAttachmentId && (
        <div className="text-sm text-gray-500">
          From attachment #{extractedFromAttachmentId}
        </div>
      )}
      {sourceNotes && (
        <div className="text-sm text-gray-500 border-t pt-2">
          {sourceNotes}
        </div>
      )}
    </div>
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="outline" 
            className={`inline-flex items-center gap-1 text-xs ${config.color} ${className}`}
          >
            <IconComponent className="h-3 w-3" />
            {config.label}
            {sourceConfidence && (
              <span className={`ml-1 ${getConfidenceColor(sourceConfidence)}`}>
                {formatConfidence(sourceConfidence)}
              </span>
            )}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}