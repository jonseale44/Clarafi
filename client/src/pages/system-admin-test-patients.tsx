import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UserPlus, Trash2, RefreshCw, ArrowLeft, LogOut } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";

interface TestPatientConfig {
  healthSystemId: number;
  providerId: number;
  locationId: number;
  patientComplexity: "low" | "medium" | "high" | "extreme";
  numberOfMedicalProblems: number;
  numberOfMedications: number;
  numberOfAllergies: number;
  numberOfPriorEncounters: number;
  numberOfFutureAppointments: number;
  includeLabResults: boolean;
  includeImagingResults: boolean;
  includeVitals: boolean;
  includeFamilyHistory: boolean;
  includeSocialHistory: boolean;
  includeSurgicalHistory: boolean;
  noShowRate: number;
  avgArrivalDelta: number;
  avgVisitDuration: number;
  customFirstName?: string;
  customLastName?: string;
}

export default function SystemAdminTestPatients() {
  const { toast } = useToast();
  const { user, logoutMutation } = useAuth();
  const [location, setLocation] = useLocation();
  const [selectedHealthSystem, setSelectedHealthSystem] = useState<number | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<number | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<number | null>(null);
  
  // Form state
  const [config, setConfig] = useState<TestPatientConfig>({
    healthSystemId: 0,
    providerId: 0,
    locationId: 0,
    patientComplexity: "medium",
    numberOfMedicalProblems: 5,
    numberOfMedications: 7,
    numberOfAllergies: 2,
    numberOfPriorEncounters: 12,
    numberOfFutureAppointments: 3,
    includeLabResults: true,
    includeImagingResults: true,
    includeVitals: true,
    includeFamilyHistory: true,
    includeSocialHistory: true,
    includeSurgicalHistory: true,
    noShowRate: 10,
    avgArrivalDelta: -5,
    avgVisitDuration: 25,
    customFirstName: "",
    customLastName: "",
  });

  // Fetch health systems
  const { data: healthSystems, isLoading: loadingHealthSystems } = useQuery({
    queryKey: ["/api/test-patients/health-systems"],
    enabled: true,
  });

  // Fetch providers for selected health system
  const { data: providers, isLoading: loadingProviders } = useQuery({
    queryKey: ["/api/test-patients/providers", selectedHealthSystem],
    enabled: !!selectedHealthSystem,
  });

  // Fetch locations for selected health system
  const { data: locations, isLoading: loadingLocations } = useQuery({
    queryKey: ["/api/test-patients/locations", selectedHealthSystem],
    enabled: !!selectedHealthSystem,
  });

  // Fetch test patients for selected health system
  const { data: testPatients, isLoading: loadingTestPatients, refetch: refetchTestPatients } = useQuery({
    queryKey: ["/api/test-patients", selectedHealthSystem],
    enabled: !!selectedHealthSystem,
  });

  // Generate test patient mutation
  const generatePatientMutation = useMutation({
    mutationFn: async (data: TestPatientConfig) => {
      const response = await apiRequest("POST", "/api/test-patients/generate", data);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Test Patient Generated",
        description: data.summary,
      });
      refetchTestPatients();
    },
    onError: (error: any) => {
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate test patient",
        variant: "destructive",
      });
    },
  });

  // Delete test patient mutation
  const deletePatientMutation = useMutation({
    mutationFn: async (patientId: number) => {
      const response = await apiRequest("DELETE", `/api/test-patients/${patientId}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Test Patient Deleted",
        description: "Test patient and all associated data removed",
      });
      refetchTestPatients();
    },
    onError: (error: any) => {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete test patient",
        variant: "destructive",
      });
    },
  });

  // Update config when selections change
  useEffect(() => {
    if (selectedHealthSystem && selectedProvider && selectedLocation) {
      setConfig(prev => ({
        ...prev,
        healthSystemId: selectedHealthSystem,
        providerId: selectedProvider,
        locationId: selectedLocation,
      }));
    }
  }, [selectedHealthSystem, selectedProvider, selectedLocation]);

  const handleGenerate = () => {
    if (!selectedHealthSystem || !selectedProvider || !selectedLocation) {
      toast({
        title: "Missing Selection",
        description: "Please select health system, provider, and location",
        variant: "destructive",
      });
      return;
    }

    generatePatientMutation.mutate(config);
  };

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case "low": return "bg-green-500";
      case "medium": return "bg-yellow-500";
      case "high": return "bg-orange-500";
      case "extreme": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <div className="bg-white border-b border-gray-200 mb-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Link href="/admin">
                <Button variant="ghost" size="sm" className="mr-4">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Admin Dashboard
                </Button>
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">Test Patient Generator</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">
                {user?.firstName} {user?.lastName} • {user?.role}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  logoutMutation.mutate(undefined, {
                    onSuccess: () => {
                      setLocation("/auth");
                    }
                  });
                }}
                className="flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="mb-8">
          <p className="text-muted-foreground">
            Generate comprehensive test patients with realistic medical data for system testing
          </p>
        </div>

      <Tabs defaultValue="generate" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="generate">Generate Patients</TabsTrigger>
          <TabsTrigger value="manage">Manage Test Patients</TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="space-y-6">
          {/* Health System Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Select Target System</CardTitle>
              <CardDescription>Choose where to create the test patient</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Health System</Label>
                <Select
                  value={selectedHealthSystem?.toString() || ""}
                  onValueChange={(value) => {
                    setSelectedHealthSystem(Number(value));
                    setSelectedProvider(null);
                    setSelectedLocation(null);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select health system" />
                  </SelectTrigger>
                  <SelectContent>
                    {healthSystems?.map((hs: any) => (
                      <SelectItem key={hs.id} value={hs.id.toString()}>
                        {hs.name} (Tier {hs.subscriptionTier})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Provider</Label>
                <Select
                  value={selectedProvider?.toString() || ""}
                  onValueChange={(value) => setSelectedProvider(Number(value))}
                  disabled={!selectedHealthSystem || loadingProviders}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select provider" />
                  </SelectTrigger>
                  <SelectContent>
                    {providers?.map((provider: any) => (
                      <SelectItem key={provider.id} value={provider.id.toString()}>
                        {provider.firstName} {provider.lastName}, {provider.credentials || "MD"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Location</Label>
                <Select
                  value={selectedLocation?.toString() || ""}
                  onValueChange={(value) => setSelectedLocation(Number(value))}
                  disabled={!selectedHealthSystem || loadingLocations}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations?.map((location: any) => (
                      <SelectItem key={location.id} value={location.id.toString()}>
                        {location.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Patient Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>Patient Configuration</CardTitle>
              <CardDescription>Customize the test patient's medical profile</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Custom First Name (Optional)</Label>
                  <Input
                    value={config.customFirstName}
                    onChange={(e) => setConfig(prev => ({ ...prev, customFirstName: e.target.value }))}
                    placeholder="Leave empty for auto-generated"
                  />
                </div>
                <div>
                  <Label>Custom Last Name (Optional)</Label>
                  <Input
                    value={config.customLastName}
                    onChange={(e) => setConfig(prev => ({ ...prev, customLastName: e.target.value }))}
                    placeholder="Leave empty for auto-generated"
                  />
                </div>
                <div>
                  <Label>Patient Complexity</Label>
                  <Select
                    value={config.patientComplexity}
                    onValueChange={(value: any) => setConfig(prev => ({ ...prev, patientComplexity: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low (Young, Healthy)</SelectItem>
                      <SelectItem value="medium">Medium (Middle-aged, Some Conditions)</SelectItem>
                      <SelectItem value="high">High (Elderly, Multiple Conditions)</SelectItem>
                      <SelectItem value="extreme">Extreme (Very Complex, Multiple Comorbidities)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Medical Data Quantities */}
              <div className="space-y-4">
                <div>
                  <Label>Medical Problems: {config.numberOfMedicalProblems}</Label>
                  <Slider
                    value={[config.numberOfMedicalProblems]}
                    onValueChange={([value]) => setConfig(prev => ({ ...prev, numberOfMedicalProblems: value }))}
                    min={0}
                    max={20}
                    step={1}
                  />
                </div>
                <div>
                  <Label>Medications: {config.numberOfMedications}</Label>
                  <Slider
                    value={[config.numberOfMedications]}
                    onValueChange={([value]) => setConfig(prev => ({ ...prev, numberOfMedications: value }))}
                    min={0}
                    max={30}
                    step={1}
                  />
                </div>
                <div>
                  <Label>Allergies: {config.numberOfAllergies}</Label>
                  <Slider
                    value={[config.numberOfAllergies]}
                    onValueChange={([value]) => setConfig(prev => ({ ...prev, numberOfAllergies: value }))}
                    min={0}
                    max={10}
                    step={1}
                  />
                </div>
                <div>
                  <Label>Prior Encounters: {config.numberOfPriorEncounters}</Label>
                  <Slider
                    value={[config.numberOfPriorEncounters]}
                    onValueChange={([value]) => setConfig(prev => ({ ...prev, numberOfPriorEncounters: value }))}
                    min={0}
                    max={50}
                    step={1}
                  />
                </div>
                <div>
                  <Label>Future Appointments: {config.numberOfFutureAppointments}</Label>
                  <Slider
                    value={[config.numberOfFutureAppointments]}
                    onValueChange={([value]) => setConfig(prev => ({ ...prev, numberOfFutureAppointments: value }))}
                    min={0}
                    max={10}
                    step={1}
                  />
                </div>
              </div>

              {/* Data Inclusion Options */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="vitals"
                    checked={config.includeVitals}
                    onCheckedChange={(checked) => setConfig(prev => ({ ...prev, includeVitals: checked }))}
                  />
                  <Label htmlFor="vitals">Include Vitals</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="labs"
                    checked={config.includeLabResults}
                    onCheckedChange={(checked) => setConfig(prev => ({ ...prev, includeLabResults: checked }))}
                  />
                  <Label htmlFor="labs">Include Lab Results</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="imaging"
                    checked={config.includeImagingResults}
                    onCheckedChange={(checked) => setConfig(prev => ({ ...prev, includeImagingResults: checked }))}
                  />
                  <Label htmlFor="imaging">Include Imaging</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="family"
                    checked={config.includeFamilyHistory}
                    onCheckedChange={(checked) => setConfig(prev => ({ ...prev, includeFamilyHistory: checked }))}
                  />
                  <Label htmlFor="family">Include Family History</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="social"
                    checked={config.includeSocialHistory}
                    onCheckedChange={(checked) => setConfig(prev => ({ ...prev, includeSocialHistory: checked }))}
                  />
                  <Label htmlFor="social">Include Social History</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="surgical"
                    checked={config.includeSurgicalHistory}
                    onCheckedChange={(checked) => setConfig(prev => ({ ...prev, includeSurgicalHistory: checked }))}
                  />
                  <Label htmlFor="surgical">Include Surgical History</Label>
                </div>
              </div>

              {/* AI Scheduling Parameters */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">AI Scheduling Parameters</h3>
                <div>
                  <Label>Historical Visit Average: {config.avgVisitDuration} minutes</Label>
                  <Slider
                    value={[config.avgVisitDuration]}
                    onValueChange={([value]) => setConfig(prev => ({ ...prev, avgVisitDuration: value }))}
                    min={10}
                    max={60}
                    step={5}
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Patient's average appointment duration across all visit types
                  </p>
                </div>
                <div>
                  <Label>No-Show Rate: {config.noShowRate}%</Label>
                  <Slider
                    value={[config.noShowRate]}
                    onValueChange={([value]) => setConfig(prev => ({ ...prev, noShowRate: value }))}
                    min={0}
                    max={100}
                    step={5}
                  />
                </div>
                <div>
                  <Label>Average Arrival Time: {config.avgArrivalDelta > 0 ? `+${config.avgArrivalDelta}` : config.avgArrivalDelta} minutes</Label>
                  <Slider
                    value={[config.avgArrivalDelta]}
                    onValueChange={([value]) => setConfig(prev => ({ ...prev, avgArrivalDelta: value }))}
                    min={-30}
                    max={60}
                    step={5}
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Negative = Early arrival, Positive = Late arrival
                  </p>
                </div>
              </div>

              {/* Generate Button */}
              <Button
                onClick={handleGenerate}
                disabled={!selectedHealthSystem || !selectedProvider || !selectedLocation || generatePatientMutation.isPending}
                size="lg"
                className="w-full"
              >
                {generatePatientMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating Test Patient...
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Generate Test Patient
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manage" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Test Patients</CardTitle>
              <CardDescription>
                Manage generated test patients (MRN starts with ZTEST)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!selectedHealthSystem ? (
                <p className="text-center text-muted-foreground py-8">
                  Select a health system above to view test patients
                </p>
              ) : loadingTestPatients ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : testPatients?.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No test patients found for this health system
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>MRN</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Date of Birth</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {testPatients?.map((patient: any) => (
                      <TableRow key={patient.id}>
                        <TableCell>
                          <Badge variant="secondary">{patient.mrn}</Badge>
                        </TableCell>
                        <TableCell>
                          {patient.firstName} {patient.lastName}
                        </TableCell>
                        <TableCell>{patient.dateOfBirth}</TableCell>
                        <TableCell>
                          {new Date(patient.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              if (confirm(`Delete test patient ${patient.firstName} ${patient.lastName}? This will remove all associated data.`)) {
                                deletePatientMutation.mutate(patient.id);
                              }
                            }}
                            disabled={deletePatientMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </div>
  );
}