/**
 * Message Approval Queue - Provider workflow for reviewing AI-generated messages
 */

import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, Clock, AlertTriangle, MessageSquare, Send, Eye } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface PendingMessage {
  id: number;
  patientName: string;
  messageType: string;
  urgencyLevel: string;
  generatedAt: string;
  previewText: string;
  fullContent?: string;
}

export function MessageApprovalQueue() {
  const queryClient = useQueryClient();

  // Fetch pending messages
  const { data: pendingData, isLoading } = useQuery({
    queryKey: ['/api/lab-communication/pending-approval'],
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Approve single message
  const approveMutation = useMutation({
    mutationFn: async (messageId: number) => {
      return apiRequest(`/api/lab-communication/approve-message/${messageId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/lab-communication/pending-approval'] });
    }
  });

  // Bulk approve messages
  const bulkApproveMutation = useMutation({
    mutationFn: async (messageIds: number[]) => {
      return apiRequest('/api/lab-communication/bulk-approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageIds }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/lab-communication/pending-approval'] });
    }
  });

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical': return 'destructive';
      case 'urgent': return 'default';
      case 'routine': return 'secondary';
      default: return 'secondary';
    }
  };

  const pendingMessages = (pendingData as any)?.pendingMessages || [];

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center">
            <Clock className="h-6 w-6 animate-spin mr-2" />
            Loading pending messages...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Message Approval Queue
              </CardTitle>
              <CardDescription>
                Review AI-generated patient communications before sending
              </CardDescription>
            </div>
            {pendingMessages.length > 0 && (
              <Button
                onClick={() => bulkApproveMutation.mutate(pendingMessages.map((m: any) => m.id))}
                disabled={bulkApproveMutation.isPending}
                variant="default"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve All ({pendingMessages.length})
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {pendingMessages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No messages pending approval</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingMessages.map((message: any) => (
                <Card key={message.id} className="border-l-4 border-l-amber-500">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <AlertTriangle className="h-5 w-5 text-amber-500" />
                        <div>
                          <h4 className="font-medium">{message.patientName}</h4>
                          <p className="text-sm text-muted-foreground">
                            Generated {new Date(message.generatedAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant={getUrgencyColor(message.urgencyLevel)}>
                          {message.urgencyLevel}
                        </Badge>
                        <Badge variant="outline">
                          {message.messageType.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded border">
                      <p className="text-sm">{message.previewText}</p>
                      {message.previewText.length > 150 && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Preview truncated - full message will be shown to patient
                        </p>
                      )}
                    </div>

                    <Separator />

                    <div className="flex gap-2">
                      <Button
                        onClick={() => approveMutation.mutate(message.id)}
                        disabled={approveMutation.isPending}
                        size="sm"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        {approveMutation.isPending ? 'Approving...' : 'Approve & Send'}
                      </Button>
                      
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-2" />
                        Full Preview
                      </Button>
                      
                      <Button variant="outline" size="sm">
                        Edit Message
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-500" />
              <div>
                <p className="text-2xl font-bold">{pendingMessages.length}</p>
                <p className="text-sm text-muted-foreground">Pending Approval</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-2xl font-bold">
                  {pendingMessages.filter(m => m.urgencyLevel === 'critical').length}
                </p>
                <p className="text-sm text-muted-foreground">Critical Messages</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Send className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">0</p>
                <p className="text-sm text-muted-foreground">Sent Today</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}