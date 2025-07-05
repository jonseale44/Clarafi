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
  ChevronRight,
  Clock
} from "lucide-react";
import { useNavigationContext } from "@/hooks/use-navigation-context";
import { useDenseView } from "@/hooks/use-dense-view";
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
  sourceType: "pdf_extract" | "hl7_message" | "manual_entry" | "encounter_note";
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
  const { navigateWithContext } = useNavigationContext();
  const { isDenseView } = useDenseView();

  const formatDate = (dateString: string) => {
    try {
      if (!dateString) return 'Not specified';
      // Handle date string to avoid timezone conversion issues
      if (dateString.includes('-')) {
        const [year, month, day] = dateString.split('-').map(num => parseInt(num, 10));
        const localDate = new Date(year, month - 1, day); // month is 0-indexed
        // Use M/d/yy format to match family history section
        return `${month}/${day}/${String(year).slice(-2)}`;
      }
      // Fallback for other date formats
      const date = new Date(dateString);
      return `${date.getMonth() + 1}/${date.getDate()}/${String(date.getFullYear()).slice(-2)}`;
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
        return "bg-navy-blue-100 text-navy-blue-800 border-navy-blue-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getSourceBadge = (result: ImagingResult) => {
    // Document Extract badge with confidence score, tooltip, and click navigation
    // Backend stores as "pdf_extract" but this maps to attachment extraction
    if (result.sourceType === "pdf_extract" && result.sourceConfidence && result.extractedFromAttachmentId) {
      const confidencePercent = Math.round(result.sourceConfidence * 100);
      const handleDocumentClick = () => {
        console.log("🔗 [Imaging] Document badge clicked!");
        console.log("🔗 [Imaging] attachmentId:", result.extractedFromAttachmentId);
        console.log("🔗 [Imaging] patientId:", patientId);
        console.log("🔗 [Imaging] mode:", mode);
        
        if (result.extractedFromAttachmentId) {
          const targetUrl = `/patients/${patientId}/chart?section=attachments&highlight=${result.extractedFromAttachmentId.toString()}`;
          navigateWithContext(targetUrl, "imaging", mode);
        }
      };
      
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Badge 
                variant="secondary" 
                className="text-xs cursor-pointer hover:bg-amber-200 dark:hover:bg-amber-800 transition-colors bg-amber-100 text-amber-800 border-amber-200"
                onClick={handleDocumentClick}
                title={`Click to view source document (Attachment #${result.extractedFromAttachmentId})`}
              >
                MR {confidencePercent}%
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>Extracted from attachment #{result.extractedFromAttachmentId} with {confidencePercent}% confidence</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }
    
    // Clickable encounter badge that navigates to encounter detail
    if (result.sourceType === "encounter_note") {
      const handleEncounterClick = () => {
        // Find encounter ID from visit history or use current encounterId
        const encounterId = result.visitHistory?.find(visit => visit.sourceType === "encounter")?.encounterId;
        if (encounterId) {
          navigateWithContext(`/patients/${patientId}/encounters/${encounterId}`, "imaging", mode);
        }
      };
      return (
        <Badge 
          variant="default" 
          className="text-xs cursor-pointer hover:bg-navy-blue-600 dark:hover:bg-navy-blue-400 transition-colors bg-navy-blue-100 text-navy-blue-800 border-navy-blue-200"
          onClick={handleEncounterClick}
          title="Click to view encounter details"
        >
          Note
        </Badge>
      );
    }
    
    // Fallback for true manual entries
    return (
      <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-800 border-gray-200">
        Manual
      </Badge>
    );
  };

  // Get source badge for visit history entries
  const getVisitSourceBadge = (visit: any) => {
    if (visit.sourceType === "attachment") {
      const confidencePercent = visit.confidence ? Math.round(visit.confidence * 100) : 0;
      const handleDocumentClick = () => {
        if (visit.attachmentId) {
          const targetUrl = `/patients/${patientId}/chart?section=attachments&highlight=${visit.attachmentId}`;
          navigateWithContext(targetUrl, "imaging", mode);
        }
      };
      
      return (
        <Badge 
          variant="secondary" 
          className="text-xs cursor-pointer hover:bg-amber-200 dark:hover:bg-amber-800 transition-colors bg-amber-100 text-amber-800 border-amber-200"
          onClick={handleDocumentClick}
          title={`Click to view source document (Attachment #${visit.attachmentId})`}
        >
          MR {confidencePercent}%
        </Badge>
      );
    }
    
    if (visit.sourceType === "encounter") {
      const confidencePercent = visit.confidence ? Math.round(visit.confidence * 100) : 0;
      const handleEncounterClick = () => {
        if (visit.encounterId) {
          navigateWithContext(`/patients/${patientId}/encounters/${visit.encounterId}`, "imaging", mode);
        }
      };
      return (
        <Badge 
          variant="default" 
          className="text-xs cursor-pointer hover:bg-navy-blue-600 dark:hover:bg-navy-blue-400 transition-colors bg-navy-blue-100 text-navy-blue-800 border-navy-blue-200"
          onClick={handleEncounterClick}
          title={`Click to view encounter details (Encounter #${visit.encounterId})`}
        >
          Note {confidencePercent}%
        </Badge>
      );
    }
    
    if (visit.sourceType === "manual_entry") {
      return <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-800 border-gray-200">Manual</Badge>;
    }
    
    return null;
  };

  // Dense view render function
  const renderImagingDenseList = (result: ImagingResult) => {
    return (
      <div
        key={result.id}
        className="dense-list-item group"
        onClick={() => {
          const newExpanded = [...expandedItems];
          const itemId = result.id.toString();
          if (newExpanded.includes(itemId)) {
            setExpandedItems(newExpanded.filter(id => id !== itemId));
          } else {
            setExpandedItems([...newExpanded, itemId]);
          }
        }}
      >
        <div className="dense-list-content">
          {expandedItems.includes(result.id.toString()) ? (
            <ChevronDown className="h-3 w-3 text-gray-400 flex-shrink-0" />
          ) : (
            <ChevronRight className="h-3 w-3 text-gray-400 flex-shrink-0" />
          )}
          
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {getModalityIcon(result.modality)}
            <span className="dense-list-primary">
              {result.modality} - {result.bodyPart}
            </span>
            
            <Badge className={`dense-list-badge ${getStatusColor(result.resultStatus)}`}>
              {result.resultStatus}
            </Badge>
            
            {getSourceBadge(result)}
          </div>
          
          <div className="dense-list-secondary">
            <span>{formatDate(result.studyDate)}</span>
            {result.facilityName && (
              <span>• {result.facilityName}</span>
            )}
            {result.radiologistName && (
              <span>• Dr. {result.radiologistName}</span>
            )}
          </div>
        </div>
        
        {!isReadOnly && (
          <div className="dense-list-actions" onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
              <Eye className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
              <Edit className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-600 hover:text-red-700">
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        )}
        
        {/* Expanded content for dense view */}
        {expandedItems.includes(result.id.toString()) && (
          <div className="dense-list-expanded">
            <div className="space-y-3">
              {/* Clinical Summary */}
              <div>
                <h4 className="font-medium text-sm mb-1">Clinical Summary</h4>
                <p className="text-sm text-gray-700">{result.clinicalSummary}</p>
              </div>

              {/* Findings and Impression */}
              {(result.findings || result.impression) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {result.findings && (
                    <div>
                      <h4 className="font-medium text-sm mb-1">Findings</h4>
                      <p className="text-sm text-gray-700">{result.findings}</p>
                    </div>
                  )}
                  {result.impression && (
                    <div>
                      <h4 className="font-medium text-sm mb-1">Impression</h4>
                      <p className="text-sm text-gray-700">{result.impression}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Visit History */}
              {result.visitHistory && result.visitHistory.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm mb-1 text-gray-700 flex items-center gap-2">
                    <Clock className="h-3 w-3" />
                    Visit History
                  </h4>
                  <div className="emr-dense-list">
                    {result.visitHistory
                      .sort((a, b) => {
                        // Primary sort: Date descending (most recent first)
                        const dateComparison = new Date(b.date).getTime() - new Date(a.date).getTime();
                        if (dateComparison !== 0) return dateComparison;
                        
                        // Secondary sort: Encounter ID descending (higher encounter numbers first for same-date entries)
                        const aEncounterId = a.encounterId || 0;
                        const bEncounterId = b.encounterId || 0;
                        return bEncounterId - aEncounterId;
                      })
                      .map((visit, index) => (
                      <div key={index} className="flex items-start gap-3 py-1 border-b border-gray-100 dark:border-gray-700 last:border-0">
                        <span className="font-medium text-xs text-gray-600 dark:text-gray-400 flex-shrink-0">
                          {formatDate(visit.date)}
                        </span>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {getVisitSourceBadge(visit)}
                        </div>
                        <p className="text-xs text-gray-700 dark:text-gray-300 flex-1">{visit.notes}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="emr-tight-spacing">
        <Card>
          <CardContent className="pt-3 emr-card-content-tight">
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-navy-blue-600"></div>
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
      {isDenseView ? (
        <div className={isDenseView ? "dense-list-container" : "space-y-3"}>
          {imagingResults.map(renderImagingDenseList)}
        </div>
      ) : (
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
                        <h4 className="font-medium text-sm mb-2 text-gray-700 flex items-center gap-2">
                          <Clock className="h-3 w-3" />
                          Visit History
                        </h4>
                        <div className="emr-dense-list">
                          {result.visitHistory
                            .sort((a, b) => {
                              // Primary sort: Date descending (most recent first)
                              const dateComparison = new Date(b.date).getTime() - new Date(a.date).getTime();
                              if (dateComparison !== 0) return dateComparison;
                              
                              // Secondary sort: Encounter ID descending (higher encounter numbers first for same-date entries)
                              const aEncounterId = a.encounterId || 0;
                              const bEncounterId = b.encounterId || 0;
                              return bEncounterId - aEncounterId;
                            })
                            .map((visit, index) => (
                            <div key={index} className="flex items-start gap-3 py-1 border-b border-gray-100 dark:border-gray-700 last:border-0">
                              <span className="font-medium text-xs text-gray-600 dark:text-gray-400 flex-shrink-0">
                                {formatDate(visit.date)}
                              </span>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                {getVisitSourceBadge(visit)}
                              </div>
                              <p className="text-xs text-gray-700 dark:text-gray-300 flex-1">{visit.notes}</p>
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
      )}
    </div>
  );
}