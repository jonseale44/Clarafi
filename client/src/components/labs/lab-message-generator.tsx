/**
 * Lab Message Generator - Phase 2: GPT Message Generation
 * Frontend component for AI-powered patient communication
 */

import React, { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, Clock, Send, Eye, AlertTriangle, MessageSquare } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface LabMessageGeneratorProps {
  patientId: number;
  encounterId: number;
  resultIds: number[];
  onMessageGenerated?: (message: any) => void;
}

interface GeneratedMessage {
  id?: number;
  messageType: 'normal_results' | 'abnormal_results' | 'critical_results' | 'follow_up_required';
  content: string;
  channel: 'portal' | 'sms' | 'email' | 'postal';
  status: 'draft' | 'pending_approval' | 'approved' | 'sent';
  urgencyLevel: 'routine' | 'urgent' | 'critical';
  requiresApproval: boolean;
}

export function LabMessageGenerator({ 
  patientId, 
  encounterId, 
  resultIds, 
  onMessageGenerated 
}: LabMessageGeneratorProps) {
  const [generatedMessage, setGeneratedMessage] = useState<GeneratedMessage | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<string>('portal');
  const [messageType, setMessageType] = useState<string>('auto');

  // Preview message generation
  const previewMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(
        `/api/lab-communication/preview/${patientId}/${encounterId}?resultIds=${resultIds.join(',')}`
      );
      if (!response.ok) throw new Error('Failed to generate preview');
      return response.json();
    },
    onSuccess: (data) => {
      console.log('Message preview generated:', data);
    }
  });

  // Generate actual message
  const generateMutation = useMutation({
    mutationFn: async (params: {
      messageType?: string;
      preferredChannel?: string;
    }) => {
      return apiRequest('/api/lab-communication/generate-message', {
        method: 'POST',
        body: JSON.stringify({
          patientId,
          encounterId,
          resultIds,
          messageType: params.messageType !== 'auto' ? params.messageType : undefined,
          preferredChannel: params.preferredChannel,
        }),
      });
    },
    onSuccess: (data) => {
      setGeneratedMessage(data.message);
      onMessageGenerated?.(data.message);
    }
  });

  // Approve message
  const approveMutation = useMutation({
    mutationFn: async (messageId: number) => {
      return apiRequest(`/api/lab-communication/approve-message/${messageId}`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      if (generatedMessage) {
        setGeneratedMessage({
          ...generatedMessage,
          status: 'approved'
        });
      }
    }
  });

  // Send message
  const sendMutation = useMutation({
    mutationFn: async (messageId: number) => {
      return apiRequest(`/api/lab-communication/send-message/${messageId}`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      if (generatedMessage) {
        setGeneratedMessage({
          ...generatedMessage,
          status: 'sent'
        });
      }
    }
  });

  const handleGenerateMessage = () => {
    generateMutation.mutate({
      messageType,
      preferredChannel: selectedChannel
    });
  };

  const handlePreview = () => {
    previewMutation.mutate();
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical': return 'destructive';
      case 'urgent': return 'default';
      case 'routine': return 'secondary';
      default: return 'secondary';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft': return <Clock className="h-4 w-4" />;
      case 'pending_approval': return <AlertTriangle className="h-4 w-4" />;
      case 'approved': return <CheckCircle className="h-4 w-4" />;
      case 'sent': return <Send className="h-4 w-4" />;
      default: return <MessageSquare className="h-4 w-4" />;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          AI Patient Communication
        </CardTitle>
        <CardDescription>
          Generate personalized messages for lab results using AI
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Generation Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Message Type</label>
            <Select value={messageType} onValueChange={setMessageType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto-detect</SelectItem>
                <SelectItem value="normal_results">Normal Results</SelectItem>
                <SelectItem value="abnormal_results">Abnormal Results</SelectItem>
                <SelectItem value="critical_results">Critical Results</SelectItem>
                <SelectItem value="follow_up_required">Follow-up Required</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Delivery Channel</label>
            <Select value={selectedChannel} onValueChange={setSelectedChannel}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="portal">Patient Portal</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="sms">SMS</SelectItem>
                <SelectItem value="postal">Postal Mail</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button 
            onClick={handlePreview}
            variant="outline"
            disabled={previewMutation.isPending}
          >
            <Eye className="h-4 w-4 mr-2" />
            {previewMutation.isPending ? 'Generating Preview...' : 'Preview'}
          </Button>
          
          <Button 
            onClick={handleGenerateMessage}
            disabled={generateMutation.isPending}
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            {generateMutation.isPending ? 'Generating...' : 'Generate Message'}
          </Button>
        </div>

        {/* Preview Results */}
        {previewMutation.data && (
          <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Message Preview</CardTitle>
              <div className="flex gap-2">
                <Badge variant={getUrgencyColor(previewMutation.data.preview.urgencyLevel)}>
                  {previewMutation.data.preview.urgencyLevel}
                </Badge>
                <Badge variant="outline">
                  {previewMutation.data.preview.messageType.replace('_', ' ')}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="bg-white dark:bg-slate-900 p-4 rounded border">
                <p className="whitespace-pre-wrap">{previewMutation.data.preview.content}</p>
              </div>
              {previewMutation.data.preview.requiresApproval && (
                <p className="text-sm text-amber-600 dark:text-amber-400 mt-2">
                  ⚠️ This message will require provider approval before sending
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Generated Message */}
        {generatedMessage && (
          <Card className="border-2 border-green-200 dark:border-green-800">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  {getStatusIcon(generatedMessage.status)}
                  Generated Message
                </CardTitle>
                <div className="flex gap-2">
                  <Badge variant={getUrgencyColor(generatedMessage.urgencyLevel)}>
                    {generatedMessage.urgencyLevel}
                  </Badge>
                  <Badge variant="outline">
                    {generatedMessage.status.replace('_', ' ')}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-white dark:bg-slate-900 p-4 rounded border">
                <Textarea
                  value={generatedMessage.content}
                  readOnly
                  rows={8}
                  className="resize-none border-0 p-0 bg-transparent"
                />
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>Channel:</strong> {generatedMessage.channel}
                </div>
                <div>
                  <strong>Type:</strong> {generatedMessage.messageType.replace('_', ' ')}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                {generatedMessage.status === 'pending_approval' && (
                  <Button
                    onClick={() => generatedMessage.id && approveMutation.mutate(generatedMessage.id)}
                    disabled={approveMutation.isPending}
                    variant="default"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    {approveMutation.isPending ? 'Approving...' : 'Approve'}
                  </Button>
                )}

                {generatedMessage.status === 'approved' && (
                  <Button
                    onClick={() => generatedMessage.id && sendMutation.mutate(generatedMessage.id)}
                    disabled={sendMutation.isPending}
                    variant="default"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {sendMutation.isPending ? 'Sending...' : 'Send Message'}
                  </Button>
                )}

                {generatedMessage.status === 'sent' && (
                  <Badge variant="default" className="px-3 py-1">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Message Sent Successfully
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error States */}
        {generateMutation.error && (
          <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20">
            <CardContent className="pt-6">
              <p className="text-red-600 dark:text-red-400">
                Error generating message: {generateMutation.error.message}
              </p>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
}