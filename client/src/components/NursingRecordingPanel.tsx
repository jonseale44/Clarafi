import { useState, useEffect, useRef } from "react";
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
  const transcriptionRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when transcription updates
  useEffect(() => {
    if (transcription && transcriptionRef.current) {
      transcriptionRef.current.scrollTop = transcriptionRef.current.scrollHeight;
    }
  }, [transcription]);

  return (
    <div className="space-y-4">
      {/* Recording Controls Card */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <CardTitle className="text-xl font-semibold">Voice Recording</CardTitle>
          {wsConnected && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-green-600">● Connected</span>
            </div>
          )}
        </div>

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

        {/* Transcription Section - Inside Recording Card */}
        <Collapsible 
          open={isTranscriptionExpanded} 
          onOpenChange={setIsTranscriptionExpanded}
          className="mt-4"
        >
          <CollapsibleTrigger className="flex items-center space-x-2 hover:text-gray-700 cursor-pointer group mb-2">
            <ChevronRight className={`h-4 w-4 text-gray-500 transition-transform duration-200 ${isTranscriptionExpanded ? 'rotate-90' : ''}`} />
            <span className="text-sm font-medium text-gray-700">Live Transcription</span>
            {isRecording && (
              <Badge variant="destructive" className="animate-pulse ml-2">
                Recording
              </Badge>
            )}
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            <div className="space-y-2">
              <div 
                ref={transcriptionRef}
                className="border border-gray-200 rounded-lg p-4 min-h-[200px] bg-gray-50 max-h-[400px] overflow-y-auto scroll-smooth"
              >
                <div className="whitespace-pre-line text-sm leading-relaxed">
                  {transcription ? (
                    transcription
                  ) : (
                    <span className="text-gray-500 italic">
                      {isRecording ? "Listening..." : "Start recording to see transcription"}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* AI Clinical Insights - Separate Card */}
      <Card className="p-6">
        <Collapsible 
          open={isAISuggestionsExpanded} 
          onOpenChange={setIsAISuggestionsExpanded}
        >
          <div className="flex items-center justify-between mb-4">
            <CollapsibleTrigger className="flex items-center space-x-2 hover:text-gray-700 cursor-pointer group">
              <ChevronRight className={`h-4 w-4 text-gray-500 transition-transform duration-200 ${isAISuggestionsExpanded ? 'rotate-90' : ''}`} />
              <h2 className="text-xl font-semibold">AI Clinical Insights</h2>
            </CollapsibleTrigger>
            {aiSuggestions && (
              <Badge variant="secondary">Active</Badge>
            )}
          </div>
          
          <CollapsibleContent>
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
              <div className="border border-gray-200 rounded-lg p-4 min-h-[150px] bg-blue-50 max-h-[300px] overflow-y-auto">
                <div className="text-sm whitespace-pre-line">
                  {aiSuggestions ? (
                    aiSuggestions
                  ) : (
                    <span className="text-gray-500 italic">
                      {transcription ? "Click button above to generate nursing insights" : "Start recording first to generate insights"}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    </div>
  );
}