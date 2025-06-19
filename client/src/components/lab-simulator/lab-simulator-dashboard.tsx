/**
 * Lab Simulator Dashboard
 * Comprehensive testing interface for the lab order lifecycle
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  FlaskConical, 
  Play, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  XCircle, 
  Activity,
  Building2,
  TestTube,
  Timer,
  Zap
} from "lucide-react";

interface SimulatedOrder {
  orderId: number;
  externalOrderId: string;
  targetLab: string;
  processingSteps: ProcessingStep[];
  estimatedCompletionTime: string;
  currentStatus: string;
}

interface ProcessingStep {
  stepName: string;
  description: string;
  estimatedDuration: number;
  completed: boolean;
  completedAt?: string;
}

interface TestDefinition {
  code: string;
  name: string;
  turnaround: string;
  fasting: boolean;
}

export function LabSimulatorDashboard() {
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [selectedEncounterId, setSelectedEncounterId] = useState<number | null>(null);
  const [selectedTestCode, setSelectedTestCode] = useState("");
  const [customTestName, setCustomTestName] = useState("");
  const [priority, setPriority] = useState("routine");
  const [clinicalIndication, setClinicalIndication] = useState("");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch available patients
  const { data: patients = [] } = useQuery({
    queryKey: ['/api/patients']
  });

  // Fetch test definitions
  const { data: testDefinitions } = useQuery({
    queryKey: ['/api/lab-simulator/test-definitions']
  });

  // Fetch active simulations
  const { data: activeSimulations, refetch: refetchSimulations } = useQuery({
    queryKey: ['/api/lab-simulator/all-active'],
    refetchInterval: 5000 // Poll every 5 seconds
  });

  // Fetch encounters for selected patient
  const { data: encounters = [] } = useQuery({
    queryKey: [`/api/patients/${selectedPatientId}/encounters`],
    enabled: !!selectedPatientId
  });

  // Create single order mutation
  const createOrderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      return apiRequest('/api/lab-simulator/place-order', {
        method: 'POST',
        body: JSON.stringify(orderData)
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Lab Order Created",
        description: `Order ${data.order.id} created and simulation started`
      });
      refetchSimulations();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create lab order",
        variant: "destructive"
      });
    }
  });

  // Create comprehensive order set mutation
  const createComprehensiveMutation = useMutation({
    mutationFn: async (data: { patientId: number; encounterId: number }) => {
      return apiRequest('/api/lab-simulator/create-comprehensive-order-set', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Comprehensive Order Set Created",
        description: `Created ${data.orderCount} lab orders with simulations`
      });
      refetchSimulations();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create comprehensive order set",
        variant: "destructive"
      });
    }
  });

  // Cancel simulation mutation
  const cancelSimulationMutation = useMutation({
    mutationFn: async (orderId: number) => {
      return apiRequest(`/api/lab-simulator/cancel/${orderId}`, {
        method: 'POST'
      });
    },
    onSuccess: () => {
      toast({
        title: "Simulation Cancelled",
        description: "Lab order simulation has been cancelled"
      });
      refetchSimulations();
    }
  });

  const handleCreateOrder = () => {
    if (!selectedPatientId || !selectedEncounterId || !selectedTestCode || !customTestName) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    createOrderMutation.mutate({
      patientId: selectedPatientId,
      encounterId: selectedEncounterId,
      testCode: selectedTestCode,
      testName: customTestName,
      priority,
      clinicalIndication
    });
  };

  const handleCreateComprehensive = () => {
    if (!selectedPatientId || !selectedEncounterId) {
      toast({
        title: "Missing Information",
        description: "Please select a patient and encounter",
        variant: "destructive"
      });
      return;
    }

    createComprehensiveMutation.mutate({
      patientId: selectedPatientId,
      encounterId: selectedEncounterId
    });
  };

  const getStatusColor = (status: string) => {
    const colors = {
      'draft': 'bg-gray-500',
      'transmitted': 'bg-blue-500',
      'acknowledged': 'bg-yellow-500',
      'collected': 'bg-orange-500',
      'completed': 'bg-green-500',
      'cancelled': 'bg-red-500'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-500';
  };

  const getLabIcon = (lab: string) => {
    const icons = {
      'labcorp': <Building2 className="h-4 w-4" />,
      'quest': <TestTube className="h-4 w-4" />,
      'hospital': <Activity className="h-4 w-4" />,
      'internal': <FlaskConical className="h-4 w-4" />
    };
    return icons[lab as keyof typeof icons] || <FlaskConical className="h-4 w-4" />;
  };

  const calculateProgress = (steps: ProcessingStep[]) => {
    const completed = steps.filter(step => step.completed).length;
    return (completed / steps.length) * 100;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2">
        <FlaskConical className="h-6 w-6 text-blue-600" />
        <h1 className="text-2xl font-bold">Lab Order Lifecycle Simulator</h1>
      </div>

      <Tabs defaultValue="create" className="space-y-6">
        <TabsList>
          <TabsTrigger value="create">Create Orders</TabsTrigger>
          <TabsTrigger value="monitor">Monitor Simulations</TabsTrigger>
          <TabsTrigger value="definitions">Test Definitions</TabsTrigger>
        </TabsList>

        <TabsContent value="create" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Single Order Creation */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TestTube className="h-5 w-5" />
                  Create Single Order
                </CardTitle>
                <CardDescription>
                  Create and simulate a single lab order
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="patient">Patient</Label>
                  <Select value={selectedPatientId?.toString() || ""} onValueChange={(value) => setSelectedPatientId(parseInt(value))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select patient" />
                    </SelectTrigger>
                    <SelectContent>
                      {patients.map((patient: any) => (
                        <SelectItem key={patient.id} value={patient.id.toString()}>
                          {patient.firstName} {patient.lastName} ({patient.mrn})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="encounter">Encounter</Label>
                  <Select 
                    value={selectedEncounterId?.toString() || ""} 
                    onValueChange={(value) => setSelectedEncounterId(parseInt(value))}
                    disabled={!selectedPatientId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select encounter" />
                    </SelectTrigger>
                    <SelectContent>
                      {encounters.map((encounter: any) => (
                        <SelectItem key={encounter.id} value={encounter.id.toString()}>
                          {encounter.encounterType} - {new Date(encounter.createdAt).toLocaleDateString()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="testCode">Test Code</Label>
                  <Select value={selectedTestCode} onValueChange={setSelectedTestCode}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select test code" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CBC">CBC - Complete Blood Count</SelectItem>
                      <SelectItem value="CMP">CMP - Comprehensive Metabolic Panel</SelectItem>
                      <SelectItem value="BMP">BMP - Basic Metabolic Panel</SelectItem>
                      <SelectItem value="LIPID">LIPID - Lipid Panel</SelectItem>
                      <SelectItem value="TSH">TSH - Thyroid Stimulating Hormone</SelectItem>
                      <SelectItem value="TROP">TROP - Troponin I</SelectItem>
                      <SelectItem value="CULTURE">CULTURE - Blood Culture</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="testName">Test Name</Label>
                  <Input
                    id="testName"
                    value={customTestName}
                    onChange={(e) => setCustomTestName(e.target.value)}
                    placeholder="Enter test name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="routine">Routine</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                      <SelectItem value="stat">STAT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="indication">Clinical Indication</Label>
                  <Textarea
                    id="indication"
                    value={clinicalIndication}
                    onChange={(e) => setClinicalIndication(e.target.value)}
                    placeholder="Enter clinical indication"
                    rows={3}
                  />
                </div>

                <Button 
                  onClick={handleCreateOrder}
                  disabled={createOrderMutation.isPending}
                  className="w-full"
                >
                  {createOrderMutation.isPending ? (
                    <>
                      <Timer className="h-4 w-4 mr-2 animate-spin" />
                      Creating Order...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Create & Simulate Order
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Comprehensive Order Set */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Comprehensive Test Panel
                </CardTitle>
                <CardDescription>
                  Create a complete set of lab orders for comprehensive testing
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Included Tests:</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>• Complete Blood Count</div>
                    <div>• Comprehensive Metabolic Panel</div>
                    <div>• Lipid Panel</div>
                    <div>• Thyroid Function</div>
                    <div>• Cardiac Markers</div>
                    <div>• Coagulation Studies</div>
                    <div>• Blood Culture</div>
                    <div>• Hemoglobin A1c</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Patient & Encounter Selection</Label>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Patient: {selectedPatientId ? patients.find((p: any) => p.id === selectedPatientId)?.firstName + ' ' + patients.find((p: any) => p.id === selectedPatientId)?.lastName : 'None selected'}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Encounter: {selectedEncounterId ? encounters.find((e: any) => e.id === selectedEncounterId)?.encounterType : 'None selected'}
                  </p>
                </div>

                <Button 
                  onClick={handleCreateComprehensive}
                  disabled={createComprehensiveMutation.isPending || !selectedPatientId || !selectedEncounterId}
                  className="w-full"
                  variant="default"
                >
                  {createComprehensiveMutation.isPending ? (
                    <>
                      <Timer className="h-4 w-4 mr-2 animate-spin" />
                      Creating Orders...
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4 mr-2" />
                      Create Comprehensive Panel
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="monitor" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Active Simulations
                {activeSimulations?.simulations && (
                  <Badge variant="secondary">
                    {activeSimulations.simulations.length} active
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Monitor real-time lab order processing simulations
              </CardDescription>
            </CardHeader>
            <CardContent>
              {activeSimulations?.simulations?.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FlaskConical className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No active simulations</p>
                  <p className="text-sm">Create some lab orders to see simulations here</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {activeSimulations?.simulations?.map((simulation: SimulatedOrder) => (
                    <Card key={simulation.orderId} className="border-l-4 border-l-blue-500">
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            {getLabIcon(simulation.targetLab)}
                            <div>
                              <h4 className="font-medium">Order #{simulation.orderId}</h4>
                              <p className="text-sm text-gray-600">
                                {simulation.targetLab.toUpperCase()} - {simulation.externalOrderId}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={getStatusColor(simulation.currentStatus)}>
                              {simulation.currentStatus}
                            </Badge>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => cancelSimulationMutation.mutate(simulation.orderId)}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm">Progress</span>
                            <span className="text-sm text-gray-600">
                              {simulation.processingSteps.filter(s => s.completed).length} / {simulation.processingSteps.length} steps
                            </span>
                          </div>
                          <Progress value={calculateProgress(simulation.processingSteps)} />
                        </div>

                        <div className="mt-4 space-y-2">
                          {simulation.processingSteps.map((step, index) => (
                            <div key={index} className="flex items-center gap-3 text-sm">
                              {step.completed ? (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              ) : (
                                <Clock className="h-4 w-4 text-gray-400" />
                              )}
                              <span className={step.completed ? "text-green-700 dark:text-green-400" : "text-gray-600"}>
                                {step.description}
                              </span>
                              {step.completed && step.completedAt && (
                                <span className="text-xs text-gray-500 ml-auto">
                                  {new Date(step.completedAt).toLocaleTimeString()}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="definitions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Available Test Definitions</CardTitle>
              <CardDescription>
                Lab tests available for simulation with expected turnaround times
              </CardDescription>
            </CardHeader>
            <CardContent>
              {testDefinitions?.data && Object.entries(testDefinitions.data).map(([category, tests]) => (
                <div key={category} className="mb-6">
                  <h3 className="text-lg font-medium mb-3 capitalize">{category}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array.isArray(tests) && (tests as TestDefinition[]).map((test) => (
                      <Card key={test.code} className="border-l-4 border-l-blue-200">
                        <CardContent className="pt-4">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Badge variant="outline">{test.code}</Badge>
                              {test.fasting && <Badge variant="secondary">Fasting</Badge>}
                            </div>
                            <h4 className="font-medium">{test.name}</h4>
                            <p className="text-sm text-gray-600 flex items-center gap-1">
                              <Timer className="h-3 w-3" />
                              {test.turnaround}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    )) || []}
                  </div>
                  <Separator className="mt-6" />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}