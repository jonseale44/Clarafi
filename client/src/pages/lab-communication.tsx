/**
 * Lab Communication Management Page
 * Phase 2: GPT Message Generation UI
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LabMessageGenerator } from '@/components/labs/lab-message-generator';
import { MessageApprovalQueue } from '@/components/labs/message-approval-queue';
import { MessageSquare, Clock, Send, Brain } from 'lucide-react';

export function LabCommunicationPage() {
  const [activeTab, setActiveTab] = useState('generator');

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <MessageSquare className="h-8 w-8 text-blue-600" />
        <div>
          <h1 className="text-3xl font-bold">Lab Communication Management</h1>
          <p className="text-muted-foreground">
            AI-powered patient communications for lab results
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="generator" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            Message Generator
          </TabsTrigger>
          <TabsTrigger value="approval" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Approval Queue
          </TabsTrigger>
        </TabsList>

        <TabsContent value="generator" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                AI Message Generator
              </CardTitle>
              <CardDescription>
                Generate personalized patient communications for lab results using AI
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LabMessageGenerator
                patientId={110} // Demo patient ID
                encounterId={305} // Demo encounter ID
                resultIds={[1, 2]} // Demo result IDs
                onMessageGenerated={(message) => {
                  console.log('Generated message:', message);
                  // Switch to approval queue when message is generated
                  setActiveTab('approval');
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="approval" className="space-y-6">
          <MessageApprovalQueue />
        </TabsContent>
      </Tabs>

      {/* Quick Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">24</p>
                <p className="text-sm text-muted-foreground">Messages Generated Today</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-500" />
              <div>
                <p className="text-2xl font-bold">3</p>
                <p className="text-sm text-muted-foreground">Pending Approval</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Send className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">18</p>
                <p className="text-sm text-muted-foreground">Sent Today</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">92%</p>
                <p className="text-sm text-muted-foreground">Approval Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}