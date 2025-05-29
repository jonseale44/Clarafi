import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

export default function AssistantConfigPage() {
  const [patientId, setPatientId] = useState("1");

  const { data: assistantConfig, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/patients', patientId, 'assistant'],
    enabled: !!patientId
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (patientId) {
      refetch();
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Assistant Configuration</h1>
        <p className="text-muted-foreground">View OpenAI assistant configurations for patients</p>
      </div>

      <form onSubmit={handleSubmit} className="mb-6">
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <Label htmlFor="patientId">Patient ID</Label>
            <Input
              id="patientId"
              type="number"
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              placeholder="Enter patient ID"
            />
          </div>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Loading..." : "View Assistant"}
          </Button>
        </div>
      </form>

      {error && (
        <Card className="mb-6 border-red-200">
          <CardContent className="pt-6">
            <p className="text-red-600">Error: {(error as any)?.message || 'Failed to load assistant configuration'}</p>
          </CardContent>
        </Card>
      )}

      {assistantConfig && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Assistant Overview</span>
                <Badge variant="secondary">{assistantConfig.model}</Badge>
              </CardTitle>
              <CardDescription>Basic information about the assistant</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Assistant ID</Label>
                <Input value={assistantConfig.id} readOnly className="font-mono text-sm" />
              </div>
              <div>
                <Label>Thread ID</Label>
                <Input value={assistantConfig.thread_id || 'Not assigned'} readOnly className="font-mono text-sm" />
              </div>
              <div>
                <Label>Name</Label>
                <Input value={assistantConfig.name || 'Unnamed Assistant'} readOnly />
              </div>
              <div>
                <Label>Description</Label>
                <Input value={assistantConfig.description || 'No description'} readOnly />
              </div>
              <div>
                <Label>Created At</Label>
                <Input 
                  value={assistantConfig.created_at ? new Date(assistantConfig.created_at * 1000).toLocaleString() : 'Unknown'} 
                  readOnly 
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Assistant Instructions</CardTitle>
              <CardDescription>The medical context and instructions given to this assistant</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={assistantConfig.instructions || 'No instructions provided'}
                readOnly
                className="min-h-[300px] font-mono text-sm"
              />
            </CardContent>
          </Card>

          {assistantConfig.tools && assistantConfig.tools.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Available Tools</CardTitle>
                <CardDescription>Tools and capabilities enabled for this assistant</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 flex-wrap">
                  {assistantConfig.tools.map((tool: any, index: number) => (
                    <Badge key={index} variant="outline">
                      {tool.type}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {assistantConfig.metadata && Object.keys(assistantConfig.metadata).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Metadata</CardTitle>
                <CardDescription>Additional information about this assistant</CardDescription>
              </CardHeader>
              <CardContent>
                <pre className="text-sm bg-muted p-4 rounded overflow-auto">
                  {JSON.stringify(assistantConfig.metadata, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}