import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mic, MicOff, Square, Activity, Brain } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight } from "lucide-react";

interface NursingRecordingPanelProps {
  isRecording: boolean;
  transcription: string;
  aiSuggestions: string;
  wsConnected: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onGenerateInsights?: () => void;
  isGeneratingInsights?: boolean;
}

export function NursingRecordingPanel({
  isRecording,
  transcription,
  aiSuggestions,
  wsConnected,
  onStartRecording,
  onStopRecording,
  onGenerateInsights,
  isGeneratingInsights = false,
}: NursingRecordingPanelProps) {
  const [isTranscriptionExpanded, setIsTranscriptionExpanded] = useState(true);
  const [isAISuggestionsExpanded, setIsAISuggestionsExpanded] = useState(true);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Voice Recording</CardTitle>
          {wsConnected && (
            <Badge variant="outline" className="text-green-600 border-green-600">
              <Activity className="w-3 h-3 mr-1" />
              Connected
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col space-y-4 overflow-hidden">
        {/* Recording Controls */}
        <div className="flex justify-center">
          {!isRecording ? (
            <Button
              onClick={onStartRecording}
              size="lg"
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Mic className="mr-2 h-5 w-5" />
              Start Recording
            </Button>
          ) : (
            <Button
              onClick={onStopRecording}
              size="lg"
              variant="destructive"
              className="animate-pulse"
            >
              <Square className="mr-2 h-5 w-5" />
              Stop Recording
            </Button>
          )}
        </div>

        {/* Transcription Section */}
        <Collapsible 
          open={isTranscriptionExpanded} 
          onOpenChange={setIsTranscriptionExpanded}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-between p-2 h-auto"
            >
              <div className="flex items-center gap-2">
                {isTranscriptionExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                <span className="font-medium">Live Transcription</span>
              </div>
              {isRecording && (
                <Badge variant="destructive" className="animate-pulse">
                  Recording
                </Badge>
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="flex-1 overflow-hidden">
            <ScrollArea className="h-48 border rounded-md p-3 bg-gray-50">
              {transcription ? (
                <p className="text-sm whitespace-pre-wrap">{transcription}</p>
              ) : (
                <p className="text-sm text-gray-500 italic">
                  {isRecording ? "Listening..." : "Start recording to see transcription"}
                </p>
              )}
            </ScrollArea>
          </CollapsibleContent>
        </Collapsible>

        {/* AI Suggestions Section */}
        <Collapsible 
          open={isAISuggestionsExpanded} 
          onOpenChange={setIsAISuggestionsExpanded}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-between p-2 h-auto"
            >
              <div className="flex items-center gap-2">
                {isAISuggestionsExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                <span className="font-medium">AI Clinical Insights</span>
              </div>
              {aiSuggestions && (
                <Badge variant="secondary">Active</Badge>
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="flex-1 overflow-hidden">
            <div className="space-y-3">
              {onGenerateInsights && transcription && (
                <Button 
                  onClick={onGenerateInsights} 
                  disabled={isGeneratingInsights || !transcription}
                  size="sm"
                  className="w-full"
                >
                  <Brain className="mr-2 h-4 w-4" />
                  {isGeneratingInsights ? "Generating..." : "Generate AI Clinical Insights"}
                </Button>
              )}
              <ScrollArea className="h-48 border rounded-md p-3 bg-blue-50">
                {aiSuggestions ? (
                  <p className="text-sm whitespace-pre-wrap">{aiSuggestions}</p>
                ) : (
                  <p className="text-sm text-gray-500 italic">
                    {transcription ? "Click button above to generate nursing insights" : "Start recording first to generate insights"}
                  </p>
                )}
              </ScrollArea>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}