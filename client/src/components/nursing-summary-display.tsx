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
  const formatNursingSummary = (text: string): string => {
    if (!text) return '';
    
    return text
      // Convert **text** to <strong>text</strong>
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>')
      // Convert bullet points to proper list items with spacing
      .replace(/^- (.*?)$/gm, '<div class="ml-4 mb-1">• $1</div>')
      // Add spacing between sections (double line breaks)
      .replace(/\n\n/g, '<div class="mb-4"></div>')
      // Convert single line breaks to <br>
      .replace(/\n/g, '<br>');
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
            className="text-sm text-gray-800 font-sans leading-relaxed"
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