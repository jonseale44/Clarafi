import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Brain, MessageSquare, TrendingUp, AlertCircle, Calendar, FileText, Search, Sparkles } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export function GPTLabDemo() {
  const { toast } = useToast();
  const [selectedPatientId] = useState(4); // Demo patient ID
  const [labQuery, setLabQuery] = useState("");
  const [rawMessage, setRawMessage] = useState("");
  const [messageFormat, setMessageFormat] = useState("unknown");

  // Natural Language Query Demo
  const queryLabsMutation = useMutation({
    mutationFn: (query: string) =>
      apiRequest(`/api/gpt-lab/query-labs`, {
        method: "POST",
        body: JSON.stringify({ patientId: selectedPatientId, query }),
      }),
    onSuccess: (data) => {
      toast({
        title: "Query Successful",
        description: "GPT has analyzed the lab results",
      });
    },
  });

  // Message Parsing Demo
  const parseMessageMutation = useMutation({
    mutationFn: (message: string) =>
      apiRequest(`/api/gpt-lab/parse-message`, {
        method: "POST",
        body: JSON.stringify({
          rawMessage: message,
          sourceSystem: "Demo Lab",
          messageTypeHint: messageFormat as any,
        }),
      }),
    onSuccess: (data) => {
      toast({
        title: "Message Parsed Successfully",
        description: `Confidence: ${data.confidence}%`,
      });
    },
  });

  const sampleQueries = [
    "Show me all abnormal liver function tests from the past 6 months",
    "What's the trend for glucose levels over the last year?",
    "Are there any concerning kidney function patterns?",
    "Compare current CBC to baseline from 3 months ago",
  ];

  const sampleMessages = {
    hl7: `MSH|^~\\&|LAB|HOSPITAL|EMR|HOSPITAL|20250126140000||ORU^R01|123456|P|2.5
PID|1||12345^^^MRN||DOE^JOHN^A||19800101|M
OBR|1|123456|LAB123456|80048^BASIC METABOLIC PANEL|||20250126130000
OBX|1|NM|2160-0^CREATININE^LN||1.2|mg/dL|0.7-1.3|N|||F|||20250126135500`,
    csv: `Test Name,Result,Units,Reference Range,Flag
Glucose,145,mg/dL,70-100,H
Creatinine,1.2,mg/dL,0.7-1.3,N
Sodium,138,mEq/L,136-145,N
Potassium,4.1,mEq/L,3.5-5.1,N`,
    narrative: "Patient's glucose is elevated at 145 mg/dL (normal 70-100). Kidney function appears normal with creatinine at 1.2. Electrolytes are within normal limits.",
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">GPT Lab Intelligence Demo</h1>
          <p className="text-muted-foreground mt-2">
            Experience the power of AI-enhanced lab workflows
          </p>
        </div>
        <Badge variant="secondary" className="gap-2">
          <Brain className="h-4 w-4" />
          Powered by GPT-4
        </Badge>
      </div>

      <Alert>
        <Sparkles className="h-4 w-4" />
        <AlertDescription>
          Our GPT-powered lab system can replace traditional interface engines while providing
          intelligent clinical insights that go far beyond simple data extraction.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="query" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="query">
            <MessageSquare className="h-4 w-4 mr-2" />
            Natural Language
          </TabsTrigger>
          <TabsTrigger value="parse">
            <FileText className="h-4 w-4 mr-2" />
            Message Parser
          </TabsTrigger>
          <TabsTrigger value="insights">
            <TrendingUp className="h-4 w-4 mr-2" />
            Clinical Insights
          </TabsTrigger>
          <TabsTrigger value="planning">
            <Calendar className="h-4 w-4 mr-2" />
            Pre-Visit Planning
          </TabsTrigger>
        </TabsList>

        <TabsContent value="query" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Natural Language Lab Queries</CardTitle>
              <CardDescription>
                Ask questions about lab results in plain English
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Ask any question about the patient's lab results..."
                value={labQuery}
                onChange={(e) => setLabQuery(e.target.value)}
                className="min-h-24"
              />
              
              <div className="flex flex-wrap gap-2">
                <p className="text-sm text-muted-foreground w-full">Try these examples:</p>
                {sampleQueries.map((query, idx) => (
                  <Button
                    key={idx}
                    variant="outline"
                    size="sm"
                    onClick={() => setLabQuery(query)}
                    className="text-xs"
                  >
                    {query}
                  </Button>
                ))}
              </div>

              <Button
                onClick={() => queryLabsMutation.mutate(labQuery)}
                disabled={!labQuery || queryLabsMutation.isPending}
                className="w-full"
              >
                <Search className="h-4 w-4 mr-2" />
                {queryLabsMutation.isPending ? "Analyzing..." : "Query Labs"}
              </Button>

              {queryLabsMutation.data && (
                <Card className="mt-4 border-primary/20">
                  <CardHeader>
                    <CardTitle className="text-lg">GPT Response</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-sm">{queryLabsMutation.data.answer}</p>
                    {queryLabsMutation.data.suggestedActions?.length > 0 && (
                      <div className="mt-4">
                        <p className="text-sm font-medium mb-2">Suggested Actions:</p>
                        <ul className="list-disc list-inside space-y-1">
                          {queryLabsMutation.data.suggestedActions.map((action: string, idx: number) => (
                            <li key={idx} className="text-sm text-muted-foreground">{action}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="parse" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Universal Message Parser</CardTitle>
              <CardDescription>
                Parse any lab format - HL7, CSV, JSON, or even plain text
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select value={messageFormat} onValueChange={setMessageFormat}>
                <SelectTrigger>
                  <SelectValue placeholder="Select format hint (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unknown">Auto-detect</SelectItem>
                  <SelectItem value="lab_result">Lab Result</SelectItem>
                  <SelectItem value="lab_order">Lab Order</SelectItem>
                  <SelectItem value="status_update">Status Update</SelectItem>
                </SelectContent>
              </Select>

              <Textarea
                placeholder="Paste any lab message here..."
                value={rawMessage}
                onChange={(e) => setRawMessage(e.target.value)}
                className="min-h-32 font-mono text-xs"
              />

              <div className="flex flex-wrap gap-2">
                <p className="text-sm text-muted-foreground w-full">Load sample:</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRawMessage(sampleMessages.hl7)}
                >
                  HL7 Message
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRawMessage(sampleMessages.csv)}
                >
                  CSV Format
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRawMessage(sampleMessages.narrative)}
                >
                  Plain Text
                </Button>
              </div>

              <Button
                onClick={() => parseMessageMutation.mutate(rawMessage)}
                disabled={!rawMessage || parseMessageMutation.isPending}
                className="w-full"
              >
                <Brain className="h-4 w-4 mr-2" />
                {parseMessageMutation.isPending ? "Parsing..." : "Parse with GPT"}
              </Button>

              {parseMessageMutation.data && (
                <Card className="mt-4 border-primary/20">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center justify-between">
                      Parse Results
                      <Badge variant={parseMessageMutation.data.confidence > 80 ? "default" : "secondary"}>
                        {parseMessageMutation.data.confidence}% Confidence
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="font-medium">Message Type:</span>
                        <Badge variant="outline" className="ml-2">
                          {parseMessageMutation.data.messageType}
                        </Badge>
                      </div>
                      <div>
                        <span className="font-medium">Format Detected:</span>
                        <span className="ml-2">{parseMessageMutation.data.detectedFormat}</span>
                      </div>
                    </div>
                    
                    {parseMessageMutation.data.parsedData && (
                      <div className="mt-4">
                        <p className="text-sm font-medium mb-2">Extracted Data:</p>
                        <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-48">
                          {JSON.stringify(parseMessageMutation.data.parsedData, null, 2)}
                        </pre>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Trend Analysis
                </CardTitle>
                <CardDescription>
                  GPT analyzes patterns across multiple lab results
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm">
                  • Identifies subtle clinical patterns<br/>
                  • Considers medication effects<br/>
                  • Predicts future trends<br/>
                  • Suggests monitoring intervals
                </p>
                <Button variant="outline" size="sm" className="w-full mt-4">
                  View Trend Analysis Demo
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-destructive" />
                  Critical Value Assessment
                </CardTitle>
                <CardDescription>
                  Context-aware critical value interpretation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm">
                  • Considers patient conditions<br/>
                  • Accounts for medications<br/>
                  • Personalized thresholds<br/>
                  • Urgency prioritization
                </p>
                <Button variant="outline" size="sm" className="w-full mt-4">
                  Test Critical Assessment
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="planning" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Intelligent Pre-Visit Lab Planning</CardTitle>
              <CardDescription>
                GPT suggests appropriate labs before appointments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <h3 className="font-medium text-sm">Annual Physical</h3>
                  <ul className="text-xs space-y-1 text-muted-foreground">
                    <li>• Age-appropriate screening</li>
                    <li>• Preventive health labs</li>
                    <li>• Risk-based testing</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h3 className="font-medium text-sm">Diabetes Follow-up</h3>
                  <ul className="text-xs space-y-1 text-muted-foreground">
                    <li>• HbA1c if due</li>
                    <li>• Kidney function</li>
                    <li>• Lipid monitoring</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h3 className="font-medium text-sm">Cardiology Visit</h3>
                  <ul className="text-xs space-y-1 text-muted-foreground">
                    <li>• Cardiac biomarkers</li>
                    <li>• Lipid panel</li>
                    <li>• Metabolic assessment</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}