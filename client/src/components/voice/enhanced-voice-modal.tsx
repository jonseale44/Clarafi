import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Mic, MicOff, Brain, FileText, Clipboard, Activity } from 'lucide-react';
import { RealtimeVoiceClient } from './realtime-voice-client';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';

interface EnhancedVoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: number;
  patientName: string;
  onComplete?: (data: any) => void;
}

interface AIResult {
  soapNote?: {
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
  };
  draftOrders?: Array<{
    type: string;
    details: string;
    indication: string;
  }>;
  cptCodes?: Array<{
    code: string;
    description: string;
    units: number;
  }>;
  suggestions?: string[];
  clinicalFlags?: string[];
  historicalContext?: string;
  encounterId?: number;
  transcription?: string;
}

export function EnhancedVoiceModal({
  isOpen,
  onClose,
  patientId,
  patientName,
  onComplete
}: EnhancedVoiceModalProps) {
  const [currentTranscription, setCurrentTranscription] = useState('');
  const [realtimeSuggestions, setRealtimeSuggestions] = useState<string[]>([]);
  const [clinicalFlags, setClinicalFlags] = useState<string[]>([]);
  const [historicalContext, setHistoricalContext] = useState('');
  const [finalResult, setFinalResult] = useState<AIResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<'transcription' | 'suggestions' | 'results'>('transcription');
  
  const { user } = useAuth();
  const { toast } = useToast();

  const handleTranscriptionUpdate = (text: string) => {
    setCurrentTranscription(text);
    setActiveTab('transcription');
  };

  const handleSuggestionsUpdate = (suggestions: any) => {
    if (suggestions.suggestions) {
      setRealtimeSuggestions(suggestions.suggestions);
    }
    if (suggestions.clinicalFlags) {
      setClinicalFlags(suggestions.clinicalFlags);
    }
    if (suggestions.historicalContext) {
      setHistoricalContext(suggestions.historicalContext);
    }
    setActiveTab('suggestions');
  };

  const handleComplete = (data: AIResult) => {
    setFinalResult(data);
    setActiveTab('results');
    setIsProcessing(false);
    
    toast({
      title: "Voice Processing Complete",
      description: "SOAP note and clinical insights have been generated"
    });

    if (onComplete) {
      onComplete(data);
    }
  };

  const handleModalClose = () => {
    // Reset all state when modal closes
    setCurrentTranscription('');
    setRealtimeSuggestions([]);
    setClinicalFlags([]);
    setHistoricalContext('');
    setFinalResult(null);
    setIsProcessing(false);
    setActiveTab('transcription');
    onClose();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: "Content has been copied to your clipboard"
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleModalClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Real-time Voice Documentation - {patientName}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left Panel - Voice Client */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Mic className="h-4 w-4" />
                  Voice Recording
                </CardTitle>
              </CardHeader>
              <CardContent>
                <RealtimeVoiceClient
                  patientId={patientId}
                  userRole={user?.role || 'provider'}
                  onTranscriptionUpdate={handleTranscriptionUpdate}
                  onSuggestionsUpdate={handleSuggestionsUpdate}
                  onComplete={handleComplete}
                />
              </CardContent>
            </Card>

            {/* Live Transcription */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Live Transcription
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-32">
                  <div className="text-sm">
                    {currentTranscription || (
                      <span className="text-gray-500 italic">
                        Start speaking to see real-time transcription...
                      </span>
                    )}
                  </div>
                </ScrollArea>
                {currentTranscription && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2 w-full"
                    onClick={() => copyToClipboard(currentTranscription)}
                  >
                    <Clipboard className="h-3 w-3 mr-1" />
                    Copy Transcription
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Panel - AI Insights */}
          <div className="space-y-4">
            {/* Tab Navigation */}
            <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              <Button
                variant={activeTab === 'transcription' ? 'default' : 'ghost'}
                size="sm"
                className="flex-1"
                onClick={() => setActiveTab('transcription')}
              >
                Transcription
              </Button>
              <Button
                variant={activeTab === 'suggestions' ? 'default' : 'ghost'}
                size="sm"
                className="flex-1"
                onClick={() => setActiveTab('suggestions')}
              >
                Suggestions
              </Button>
              <Button
                variant={activeTab === 'results' ? 'default' : 'ghost'}
                size="sm"
                className="flex-1"
                onClick={() => setActiveTab('results')}
              >
                Results
              </Button>
            </div>

            {/* Content based on active tab */}
            {activeTab === 'transcription' && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Current Session</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-64">
                    <div className="text-sm space-y-2">
                      <div>
                        <span className="font-medium">Words transcribed: </span>
                        {currentTranscription.split(' ').filter(w => w.length > 0).length}
                      </div>
                      <div>
                        <span className="font-medium">Characters: </span>
                        {currentTranscription.length}
                      </div>
                      <Separator className="my-2" />
                      <div className="whitespace-pre-wrap">
                        {currentTranscription || 'No transcription yet...'}
                      </div>
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}

            {activeTab === 'suggestions' && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Brain className="h-4 w-4" />
                    AI Clinical Suggestions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-64">
                    <div className="space-y-4">
                      {/* Clinical Flags */}
                      {clinicalFlags.length > 0 && (
                        <div>
                          <h4 className="font-medium text-sm mb-2 text-red-600">Clinical Flags</h4>
                          <div className="space-y-1">
                            {clinicalFlags.map((flag, index) => (
                              <Badge key={index} variant="destructive" className="text-xs">
                                {flag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Real-time Suggestions */}
                      {realtimeSuggestions.length > 0 && (
                        <div>
                          <h4 className="font-medium text-sm mb-2">Suggestions</h4>
                          <div className="space-y-2">
                            {realtimeSuggestions.map((suggestion, index) => (
                              <div key={index} className="text-xs bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
                                {suggestion}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Historical Context */}
                      {historicalContext && (
                        <div>
                          <h4 className="font-medium text-sm mb-2">Historical Context</h4>
                          <div className="text-xs bg-gray-50 dark:bg-gray-800 p-2 rounded">
                            {historicalContext}
                          </div>
                        </div>
                      )}

                      {realtimeSuggestions.length === 0 && clinicalFlags.length === 0 && !historicalContext && (
                        <div className="text-gray-500 italic text-sm">
                          AI suggestions will appear here as you speak...
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}

            {activeTab === 'results' && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Final Documentation</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-64">
                    {finalResult ? (
                      <div className="space-y-4">
                        {/* SOAP Note */}
                        {finalResult.soapNote && (
                          <div>
                            <h4 className="font-medium text-sm mb-2">SOAP Note</h4>
                            <div className="space-y-2 text-xs">
                              {finalResult.soapNote.subjective && (
                                <div>
                                  <span className="font-medium">S:</span> {finalResult.soapNote.subjective}
                                </div>
                              )}
                              {finalResult.soapNote.objective && (
                                <div>
                                  <span className="font-medium">O:</span> {finalResult.soapNote.objective}
                                </div>
                              )}
                              {finalResult.soapNote.assessment && (
                                <div>
                                  <span className="font-medium">A:</span> {finalResult.soapNote.assessment}
                                </div>
                              )}
                              {finalResult.soapNote.plan && (
                                <div>
                                  <span className="font-medium">P:</span> {finalResult.soapNote.plan}
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Draft Orders */}
                        {finalResult.draftOrders && finalResult.draftOrders.length > 0 && (
                          <div>
                            <h4 className="font-medium text-sm mb-2">Draft Orders</h4>
                            <div className="space-y-1">
                              {finalResult.draftOrders.map((order, index) => (
                                <div key={index} className="text-xs bg-green-50 dark:bg-green-900/20 p-2 rounded">
                                  <div className="font-medium">{order.type}: {order.details}</div>
                                  <div className="text-gray-600">{order.indication}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* CPT Codes */}
                        {finalResult.cptCodes && finalResult.cptCodes.length > 0 && (
                          <div>
                            <h4 className="font-medium text-sm mb-2">Billing Codes</h4>
                            <div className="space-y-1">
                              {finalResult.cptCodes.map((code, index) => (
                                <div key={index} className="text-xs bg-purple-50 dark:bg-purple-900/20 p-2 rounded">
                                  <span className="font-medium">{code.code}</span> - {code.description}
                                  {code.units > 1 && <span className="ml-2">({code.units} units)</span>}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full mt-2"
                          onClick={() => {
                            const fullText = `SOAP Note:\n${JSON.stringify(finalResult.soapNote, null, 2)}\n\nOrders:\n${JSON.stringify(finalResult.draftOrders, null, 2)}\n\nCPT Codes:\n${JSON.stringify(finalResult.cptCodes, null, 2)}`;
                            copyToClipboard(fullText);
                          }}
                        >
                          <Clipboard className="h-3 w-3 mr-1" />
                          Copy All Results
                        </Button>
                      </div>
                    ) : (
                      <div className="text-gray-500 italic text-sm">
                        Complete documentation will appear here after recording...
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-xs text-gray-500">
            {user?.role === 'provider' ? 'Provider Mode' : 'Nurse Mode'} • Patient ID: {patientId}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleModalClose}>
              Close
            </Button>
            {finalResult && (
              <Button 
                onClick={() => {
                  handleComplete(finalResult);
                  handleModalClose();
                }}
              >
                Apply to Chart
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}