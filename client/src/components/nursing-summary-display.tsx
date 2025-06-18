import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Stethoscope, AlertCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface NursingSummaryDisplayProps {
  encounterId: number;
  patientId: number;
}

export function NursingSummaryDisplay({ encounterId, patientId }: NursingSummaryDisplayProps) {
  const { data: nursingSummaryData, isLoading, error } = useQuery({
    queryKey: [`/api/encounters/${encounterId}/nursing-summary`],
    enabled: !!encounterId,
  });

  const nursingSummary = (nursingSummaryData as any)?.data?.nursingSummary;

  // Local function to format nursing summary text with proper HTML formatting
  // Matches the SOAP note formatting approach for consistency
  const formatNursingSummary = (text: string): string => {
    if (!text) return '';
    
    return text
      // Convert markdown bold to HTML (same as SOAP note)
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      // Convert bullet points to compact format without line breaks
      .replace(/^- (.*?)$/gm, '<div class="ml-4 leading-tight">• $1</div>')
      // Replace single line breaks with minimal spacing only for section breaks
      .replace(/\n\n/g, '<div class="h-2"></div>')
      // Remove remaining single line breaks to eliminate extra spacing
      .replace(/\n/g, '')
      // Ensure section headers have minimal spacing before them
      .replace(/(<strong>.*?:<\/strong>)/g, '<div class="h-2"></div>$1')
      // Remove leading spacing
      .replace(/^(<div class="h-2"><\/div>)+/, '');
  };

  if (isLoading) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-green-800">
            <Stethoscope className="h-5 w-5" />
            <span>Nursing Assessment Summary</span>
            <Badge variant="outline" className="text-green-600 border-green-600">
              Loading...
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-4 bg-green-200 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-green-200 rounded w-1/2 mb-2"></div>
            <div className="h-4 bg-green-200 rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-yellow-200 bg-yellow-50">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-yellow-800">
            <AlertCircle className="h-5 w-5" />
            <span>Nursing Assessment Summary</span>
            <Badge variant="outline" className="text-yellow-600 border-yellow-600">
              Error Loading
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-yellow-700">
            Unable to load nursing summary. The nurse may not have completed the assessment yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!nursingSummary || !nursingSummary.trim()) {
    return (
      <Card className="border-gray-200 bg-gray-50">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-gray-600">
            <Stethoscope className="h-5 w-5" />
            <span>Nursing Assessment Summary</span>
            <Badge variant="outline" className="text-gray-500 border-gray-500">
              Not Available
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">
            No nursing summary available. The nurse will complete the assessment template to generate this summary.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-green-200 bg-green-50">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-green-800">
          <Stethoscope className="h-5 w-5" />
          <span>Nursing Assessment Summary</span>
          <Badge variant="outline" className="text-green-600 border-green-600">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
            Completed by Nursing
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="p-4 bg-white border rounded-md">
          <div 
            className="text-sm text-gray-800 font-sans leading-tight space-y-0"
            dangerouslySetInnerHTML={{ 
              __html: formatNursingSummary(nursingSummary) 
            }}
          />
        </div>
        <div className="mt-2 text-xs text-green-600">
          This summary was generated from the nursing template assessment and is read-only for providers.
          Only nursing staff can edit this content.
        </div>
      </CardContent>
    </Card>
  );
}