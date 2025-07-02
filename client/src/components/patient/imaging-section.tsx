import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { 
  FileImage, 
  Calendar, 
  Building2, 
  User, 
  AlertCircle, 
  ExternalLink,
  Edit,
  Trash2,
  Eye,
  ChevronDown,
  ChevronRight
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface ImagingResult {
  id: number;
  patientId: number;
  studyDate: string;
  modality: string;
  bodyPart: string;
  clinicalSummary: string;
  findings?: string;
  impression?: string;
  radiologistName?: string;
  facilityName?: string;
  resultStatus: string;
  sourceType: "encounter" | "attachment" | "manual_entry";
  sourceConfidence?: number;
  visitHistory?: Array<{
    date: string;
    notes: string;
    sourceType: "encounter" | "attachment" | "manual_entry";
    confidence?: number;
    encounterId?: number;
    attachmentId?: number;
  }>;
  extractedFromAttachmentId?: number;
  createdAt: string;
  updatedAt: string;
}

interface ImagingSectionProps {
  patientId: number;
  encounterId?: number;
  mode: "patient-chart" | "encounter" | "chart";
  isReadOnly?: boolean;
}

export default function ImagingSection({ patientId, encounterId, mode, isReadOnly }: ImagingSectionProps) {
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const queryClient = useQueryClient();

  const formatDate = (dateString: string) => {
    try {
      if (!dateString) return 'Not specified';
      // Handle date string to avoid timezone conversion issues
      if (dateString.includes('-')) {
        const [year, month, day] = dateString.split('-').map(num => parseInt(num, 10));
        const localDate = new Date(year, month - 1, day); // month is 0-indexed
        return localDate.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
      }
      // Fallback for other date formats
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'Invalid Date';
    }
  };

  // Fetch imaging results
  const { data: imagingResults = [], isLoading } = useQuery<ImagingResult[]>({
    queryKey: ["/api/patients", patientId, "imaging-results"],
    enabled: !!patientId,
  });

  const getModalityIcon = (modality: string) => {
    return <FileImage className="h-4 w-4" />;
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "final":
        return "bg-green-100 text-green-800 border-green-200";
      case "preliminary":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "addendum":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getSourceBadge = (result: ImagingResult) => {
    // Check for PDF attachment extraction (backend stores as "pdf_extract")
    if (result.sourceType === "pdf_extract" && result.sourceConfidence) {
      const confidencePercent = Math.round(parseFloat(result.sourceConfidence) * 100);
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Badge 
                variant="outline" 
                className="text-xs bg-blue-50 border-blue-200 text-blue-700 cursor-pointer hover:bg-blue-100 transition-colors"
                onClick={() => {
                  if (result.extractedFromAttachmentId) {
                    // Navigate to attachment
                    console.log("🔗 [Imaging] Navigating to attachment:", result.extractedFromAttachmentId);
                  }
                }}
                title={`Click to view source document (Attachment #${result.extractedFromAttachmentId})`}
              >
                Doc Extract {confidencePercent}%
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>Extracted from attachment #{result.extractedFromAttachmentId} with {confidencePercent}% confidence</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }
    
    // Check for encounter note extraction
    if (result.sourceType === "encounter_note") {
      return (
        <Badge variant="outline" className="text-xs bg-green-50 border-green-200 text-green-700">
          Note Entry
        </Badge>
      );
    }
    
    // Fallback for true manual entries
    return (
      <Badge variant="outline" className="text-xs bg-gray-50 border-gray-200 text-gray-700">
        Manual Entry
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="emr-tight-spacing">
        <Card>
          <CardContent className="pt-3 emr-card-content-tight">
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (imagingResults.length === 0) {
    return (
      <div className="emr-tight-spacing">
        <Card>
          <CardContent className="pt-3 emr-card-content-tight">
            <div className="text-center py-4 text-gray-500">
              <FileImage className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-medium">No imaging results found</p>
              <p className="text-sm">Imaging results will appear here when available.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="emr-tight-spacing">
      <Card>
        <CardContent className="pt-3 emr-card-content-tight">
          <Accordion 
            type="multiple" 
            value={expandedItems} 
            onValueChange={setExpandedItems}
            className="space-y-2"
          >
            {imagingResults.map((result: ImagingResult) => (
              <AccordionItem 
                key={result.id} 
                value={result.id.toString()}
                className="border border-gray-200 rounded-lg"
              >
                <AccordionTrigger className="px-4 py-3 hover:no-underline group">
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center space-x-3">
                      {getModalityIcon(result.modality)}
                      <div className="text-left">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-sm">
                            {result.modality} - {result.bodyPart}
                          </span>
                          <Badge className={`text-xs ${getStatusColor(result.resultStatus)}`}>
                            {result.resultStatus}
                          </Badge>
                          {getSourceBadge(result)}
                        </div>
                        <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
                          <span className="flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            {formatDate(result.studyDate)}
                          </span>
                          {result.facilityName && (
                            <span className="flex items-center">
                              <Building2 className="h-3 w-3 mr-1" />
                              {result.facilityName}
                            </span>
                          )}
                          {result.radiologistName && (
                            <span className="flex items-center">
                              <User className="h-3 w-3 mr-1" />
                              Dr. {result.radiologistName}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {!isReadOnly && (
                        <div className="opacity-0 group-hover:opacity-100 flex space-x-1">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <Eye className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-600 hover:text-red-700">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="space-y-4">
                    {/* Clinical Summary */}
                    <div>
                      <h4 className="font-medium text-sm mb-2">Clinical Summary</h4>
                      <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">
                        {result.clinicalSummary}
                      </p>
                    </div>

                    {/* Detailed Findings and Impression */}
                    {(result.findings || result.impression) && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {result.findings && (
                          <div>
                            <h4 className="font-medium text-sm mb-2">Findings</h4>
                            <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">
                              {result.findings}
                            </p>
                          </div>
                        )}
                        {result.impression && (
                          <div>
                            <h4 className="font-medium text-sm mb-2">Impression</h4>
                            <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">
                              {result.impression}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Visit History */}
                    {result.visitHistory && result.visitHistory.length > 0 && (
                      <div>
                        <h4 className="font-medium text-sm mb-2">Visit History</h4>
                        <div className="space-y-2">
                          {result.visitHistory.map((visit, index) => (
                            <div key={index} className="flex items-start space-x-3 text-sm">
                              <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-1">
                                  <span className="text-gray-600">{formatDate(visit.date)}</span>
                                  {visit.confidence && (
                                    <Badge variant="outline" className="text-xs">
                                      {Math.round(visit.confidence * 100)}% confidence
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-gray-700">{visit.notes}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Source Information */}
                    {result.extractedFromAttachmentId && (
                      <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                        <span className="text-xs text-gray-500">
                          Extracted from attachment #{result.extractedFromAttachmentId}
                        </span>
                        <Button variant="ghost" size="sm" className="text-xs">
                          <ExternalLink className="h-3 w-3 mr-1" />
                          View Document
                        </Button>
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}