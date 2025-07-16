import { useState, useEffect } from "react";
import { CalendarView } from "@/components/scheduling/calendar-view";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Settings, Users, ArrowLeft } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";

export default function SchedulingPage() {
  const [selectedProviderId, setSelectedProviderId] = useState<number | undefined>();
  const [selectedLocationId, setSelectedLocationId] = useState<number | undefined>();
  const [showProviderDialog, setShowProviderDialog] = useState(false);
  const [showAIDialog, setShowAIDialog] = useState(false);
  const [showPreferencesDialog, setShowPreferencesDialog] = useState(false);
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  
  // Default AI weights
  const defaultAiFactors = {
    historicalVisitWeight: 80,
    medicalProblemsWeight: 75,
    activeMedicationsWeight: 60,
    patientAgeWeight: 40,
    comorbidityIndexWeight: 50,
    appointmentTypeWeight: 85,
    timeOfDayWeight: 30,
    dayOfWeekWeight: 25,
    noShowRiskWeight: 70,
    averageArrivalTimeWeight: 35,
    providerEfficiencyWeight: 45,
    concurrentAppointmentsWeight: 20,
    bufferTimePreferenceWeight: 65,
    clinicVolumeWeight: 15,
    emergencyRateWeight: 55
  };
  
  // AI Factor State Management
  const [aiFactors, setAiFactors] = useState(defaultAiFactors);
  
  // Get user data to know current provider ID
  const { data: userData } = useQuery({ queryKey: ['/api/user'] });
  const currentProviderId = userData?.id;
  const currentHealthSystemId = userData?.healthSystemId;
  
  // Load provider AI weights
  const { data: savedWeights } = useQuery({
    queryKey: ['/api/scheduling/provider-ai-weights', currentProviderId],
    enabled: !!currentProviderId && !!currentHealthSystemId
  });
  
  // Apply saved weights when loaded
  useEffect(() => {
    if (savedWeights) {
      setAiFactors(savedWeights);
    }
  }, [savedWeights]);
  
  // Save AI weights mutation
  const saveWeightsMutation = useMutation({
    mutationFn: async (weights: typeof aiFactors) => {
      const response = await fetch('/api/scheduling/provider-ai-weights', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(weights)
      });
      if (!response.ok) throw new Error('Failed to save weights');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/scheduling/provider-ai-weights'] });
      toast({
        title: "AI Configuration Saved",
        description: "Your scheduling AI preferences have been saved and will persist between sessions.",
      });
      setShowAIDialog(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save AI configuration. Please try again.",
        variant: "destructive"
      });
    }
  });
  
  const updateAiFactor = (factor: string, value: number) => {
    setAiFactors(prev => ({ ...prev, [factor]: value }));
  };
  
  const resetToDefaults = () => {
    setAiFactors(defaultAiFactors);
    toast({
      title: "Reset to Defaults",
      description: "AI factors have been reset to default values. Click 'Save Configuration' to persist these changes.",
    });
  };
  
  return (
    <div className="p-4 max-w-[1600px] mx-auto">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Calendar className="h-8 w-8 text-blue-600" />
            Intelligent Scheduling System
          </h1>
          <Button 
            variant="outline" 
            onClick={() => setLocation("/dashboard")}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>
        <p className="text-gray-600">
          AI-powered appointment scheduling that learns and adapts to your practice patterns
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5" />
              Provider Schedules
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-3">
              View and manage provider availability across all locations
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full"
              onClick={() => setShowProviderDialog(true)}
            >
              Manage Providers
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <span className="text-xl text-blue-600">✨</span>
              AI Configuration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-3">
              Adjust AI prediction factors and scheduling intelligence
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full"
              onClick={() => setShowAIDialog(true)}
            >
              Configure AI
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Schedule Preferences
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-3">
              Set buffer times, appointment types, and scheduling rules
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full"
              onClick={() => setShowPreferencesDialog(true)}
            >
              Edit Preferences
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Main Calendar View */}
      <Card>
        <CardHeader>
          <CardTitle>Appointment Calendar</CardTitle>
        </CardHeader>
        <CardContent>
          <CalendarView 
            providerId={selectedProviderId}
            locationId={selectedLocationId}
          />
        </CardContent>
      </Card>

      {/* Provider Management Dialog */}
      <Dialog open={showProviderDialog} onOpenChange={setShowProviderDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manage Provider Schedules</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              View and manage provider availability across all locations. Set working hours, 
              block time off, and configure provider-specific scheduling rules.
            </p>
            <Button 
              onClick={() => {
                toast({
                  title: "Coming Soon",
                  description: "Provider schedule management will be available in the next update.",
                });
                setShowProviderDialog(false);
              }}
            >
              Got it
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Configuration Dialog */}
      <Dialog open={showAIDialog} onOpenChange={setShowAIDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>AI Scheduling Configuration</DialogTitle>
            <p className="text-sm text-gray-600 mt-2">
              Adjust how different factors influence AI appointment duration predictions. Higher values mean greater impact on scheduling decisions.
            </p>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Primary Factor - Visit History */}
            <div className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50">
              <h3 className="font-semibold mb-4 text-blue-900">📊 Primary Factor - Historical Visit Average</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <Label className="text-base">Historical Visit Duration Weight</Label>
                    <span className="text-sm font-medium text-blue-700">{aiFactors.historicalVisitWeight}%</span>
                  </div>
                  <p className="text-xs text-gray-600 mb-2">How much the patient's actual visit history influences predictions</p>
                  <Slider 
                    value={[aiFactors.historicalVisitWeight]} 
                    onValueChange={(value) => updateAiFactor('historicalVisitWeight', value[0])}
                    max={100} 
                    step={5} 
                    className="mt-2" 
                  />
                </div>
              </div>
            </div>

            {/* Patient Complexity Factors */}
            <div>
              <h3 className="font-semibold mb-4">🏥 Patient Complexity Factors</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <Label>Medical Problems Count</Label>
                    <span className="text-sm text-gray-600">{aiFactors.medicalProblemsWeight}%</span>
                  </div>
                  <p className="text-xs text-gray-600 mb-2">Each problem adds 1-2 minutes (capped at 15 min)</p>
                  <Slider 
                    value={[aiFactors.medicalProblemsWeight]} 
                    onValueChange={(value) => updateAiFactor('medicalProblemsWeight', value[0])}
                    max={100} 
                    step={5} 
                    className="mt-2" 
                  />
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <Label>Active Medications</Label>
                    <span className="text-sm text-gray-600">{aiFactors.activeMedicationsWeight}%</span>
                  </div>
                  <p className="text-xs text-gray-600 mb-2">Medication reconciliation time (5+ meds add 5 min)</p>
                  <Slider 
                    value={[aiFactors.activeMedicationsWeight]} 
                    onValueChange={(value) => updateAiFactor('activeMedicationsWeight', value[0])}
                    max={100} 
                    step={5} 
                    className="mt-2" 
                  />
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <Label>Patient Age</Label>
                    <span className="text-sm text-gray-600">{aiFactors.patientAgeWeight}%</span>
                  </div>
                  <p className="text-xs text-gray-600 mb-2">Elderly patients (65+) need extra time</p>
                  <Slider 
                    value={[aiFactors.patientAgeWeight]} 
                    onValueChange={(value) => updateAiFactor('patientAgeWeight', value[0])}
                    max={100} 
                    step={5} 
                    className="mt-2" 
                  />
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <Label>Comorbidity Index</Label>
                    <span className="text-sm text-gray-600">{aiFactors.comorbidityIndexWeight}%</span>
                  </div>
                  <p className="text-xs text-gray-600 mb-2">Overall patient complexity score</p>
                  <Slider 
                    value={[aiFactors.comorbidityIndexWeight]} 
                    onValueChange={(value) => updateAiFactor('comorbidityIndexWeight', value[0])}
                    max={100} 
                    step={5} 
                    className="mt-2" 
                  />
                </div>
              </div>
            </div>

            {/* Patient Behavior Patterns */}
            <div>
              <h3 className="font-semibold mb-4">📈 Patient Behavior Patterns</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <Label>No-Show Risk</Label>
                    <span className="text-sm text-gray-600">{aiFactors.noShowRiskWeight}%</span>
                  </div>
                  <p className="text-xs text-gray-600 mb-2">High-risk patients may get shorter slots</p>
                  <Slider 
                    value={[aiFactors.noShowRiskWeight]} 
                    onValueChange={(value) => updateAiFactor('noShowRiskWeight', value[0])}
                    max={100} 
                    step={5} 
                    className="mt-2" 
                  />
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <Label>Average Arrival Time</Label>
                    <span className="text-sm text-gray-600">{aiFactors.averageArrivalTimeWeight}%</span>
                  </div>
                  <p className="text-xs text-gray-600 mb-2">Consistently late arrivals get buffer time</p>
                  <Slider 
                    value={[aiFactors.averageArrivalTimeWeight]} 
                    onValueChange={(value) => updateAiFactor('averageArrivalTimeWeight', value[0])}
                    max={100} 
                    step={5} 
                    className="mt-2" 
                  />
                </div>
              </div>
            </div>

            {/* Visit Type Adjustments */}
            <div>
              <h3 className="font-semibold mb-4">📋 Visit Type Adjustments</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <Label>Appointment Type Weight</Label>
                    <span className="text-sm text-gray-600">{aiFactors.appointmentTypeWeight}%</span>
                  </div>
                  <p className="text-xs text-gray-600 mb-2">New patients (+10 min), physicals (+15 min), etc.</p>
                  <Slider 
                    value={[aiFactors.appointmentTypeWeight]} 
                    onValueChange={(value) => updateAiFactor('appointmentTypeWeight', value[0])}
                    max={100} 
                    step={5} 
                    className="mt-2" 
                  />
                </div>
              </div>
            </div>

            {/* Temporal Factors */}
            <div>
              <h3 className="font-semibold mb-4">🕐 Temporal Factors</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <Label>Time of Day</Label>
                    <span className="text-sm text-gray-600">{aiFactors.timeOfDayWeight}%</span>
                  </div>
                  <p className="text-xs text-gray-600 mb-2">Early morning and late afternoon may need extra time</p>
                  <Slider 
                    value={[aiFactors.timeOfDayWeight]} 
                    onValueChange={(value) => updateAiFactor('timeOfDayWeight', value[0])}
                    max={100} 
                    step={5} 
                    className="mt-2" 
                  />
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <Label>Day of Week</Label>
                    <span className="text-sm text-gray-600">{aiFactors.dayOfWeekWeight}%</span>
                  </div>
                  <p className="text-xs text-gray-600 mb-2">Mondays and Fridays typically busier</p>
                  <Slider 
                    value={[aiFactors.dayOfWeekWeight]} 
                    onValueChange={(value) => updateAiFactor('dayOfWeekWeight', value[0])}
                    max={100} 
                    step={5} 
                    className="mt-2" 
                  />
                </div>
              </div>
            </div>

            {/* Provider & Operational Factors */}
            <div>
              <h3 className="font-semibold mb-4">👨‍⚕️ Provider & Operational Factors</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <Label>Provider Efficiency</Label>
                    <span className="text-sm text-gray-600">{aiFactors.providerEfficiencyWeight}%</span>
                  </div>
                  <p className="text-xs text-gray-600 mb-2">Provider's historical pace vs average</p>
                  <Slider 
                    value={[aiFactors.providerEfficiencyWeight]} 
                    onValueChange={(value) => updateAiFactor('providerEfficiencyWeight', value[0])}
                    max={100} 
                    step={5} 
                    className="mt-2" 
                  />
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <Label>Concurrent Appointments</Label>
                    <span className="text-sm text-gray-600">{aiFactors.concurrentAppointmentsWeight}%</span>
                  </div>
                  <p className="text-xs text-gray-600 mb-2">Impact of double-booking or overlapping visits</p>
                  <Slider 
                    value={[aiFactors.concurrentAppointmentsWeight]} 
                    onValueChange={(value) => updateAiFactor('concurrentAppointmentsWeight', value[0])}
                    max={100} 
                    step={5} 
                    className="mt-2" 
                  />
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <Label>Clinic Volume</Label>
                    <span className="text-sm text-gray-600">{aiFactors.clinicVolumeWeight}%</span>
                  </div>
                  <p className="text-xs text-gray-600 mb-2">Busy days may require shorter slots</p>
                  <Slider 
                    value={[aiFactors.clinicVolumeWeight]} 
                    onValueChange={(value) => updateAiFactor('clinicVolumeWeight', value[0])}
                    max={100} 
                    step={5} 
                    className="mt-2" 
                  />
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <Label>Emergency Rate</Label>
                    <span className="text-sm text-gray-600">{aiFactors.emergencyRateWeight}%</span>
                  </div>
                  <p className="text-xs text-gray-600 mb-2">History of urgent walk-ins affecting schedule</p>
                  <Slider 
                    value={[aiFactors.emergencyRateWeight]} 
                    onValueChange={(value) => updateAiFactor('emergencyRateWeight', value[0])}
                    max={100} 
                    step={5} 
                    className="mt-2" 
                  />
                </div>
              </div>
            </div>

            {/* Temporal Factors */}
            <div>
              <h3 className="font-semibold mb-4">🕐 Temporal Factors</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <Label>Time of Day Impact</Label>
                    <span className="text-sm text-gray-600">{aiFactors.timeOfDayWeight}%</span>
                  </div>
                  <p className="text-xs text-gray-600 mb-2">Morning efficiency vs afternoon fatigue</p>
                  <Slider 
                    value={[aiFactors.timeOfDayWeight]} 
                    onValueChange={(value) => updateAiFactor('timeOfDayWeight', value[0])}
                    max={100} 
                    step={5} 
                    className="mt-2" 
                  />
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <Label>Day of Week Patterns</Label>
                    <span className="text-sm text-gray-600">{aiFactors.dayOfWeekWeight}%</span>
                  </div>
                  <p className="text-xs text-gray-600 mb-2">Monday/Friday vs mid-week efficiency</p>
                  <Slider 
                    value={[aiFactors.dayOfWeekWeight]} 
                    onValueChange={(value) => updateAiFactor('dayOfWeekWeight', value[0])}
                    max={100} 
                    step={5} 
                    className="mt-2" 
                  />
                </div>
              </div>
            </div>

            {/* Buffer Settings */}
            <div>
              <h3 className="font-semibold mb-4">⏱️ Buffer Time Preference</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <Label>Buffer Time Preference</Label>
                    <span className="text-sm text-gray-600">{aiFactors.bufferTimePreferenceWeight}%</span>
                  </div>
                  <p className="text-xs text-gray-600 mb-2">Provider-requested buffer between appointments</p>
                  <Slider 
                    value={[aiFactors.bufferTimePreferenceWeight]} 
                    onValueChange={(value) => updateAiFactor('bufferTimePreferenceWeight', value[0])}
                    max={100} 
                    step={5} 
                    className="mt-2" 
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t">
              <Button variant="ghost" onClick={resetToDefaults}>
                Reset to Default
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowAIDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={() => saveWeightsMutation.mutate(aiFactors)}
                  disabled={saveWeightsMutation.isPending}
                >
                  {saveWeightsMutation.isPending ? "Saving..." : "Save Configuration"}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Schedule Preferences Dialog */}
      <Dialog open={showPreferencesDialog} onOpenChange={setShowPreferencesDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Schedule Preferences</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Default Appointment Duration</Label>
              <Select defaultValue="20">
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="20">20 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="45">45 minutes</SelectItem>
                  <SelectItem value="60">60 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Buffer Time Between Appointments</Label>
              <Select defaultValue="5">
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">No buffer</SelectItem>
                  <SelectItem value="5">5 minutes</SelectItem>
                  <SelectItem value="10">10 minutes</SelectItem>
                  <SelectItem value="15">15 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Maximum Daily Appointments</Label>
              <Input type="number" defaultValue="24" className="mt-2" />
            </div>

            <div>
              <Label>New Patient Appointment Duration</Label>
              <Select defaultValue="45">
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="45">45 minutes</SelectItem>
                  <SelectItem value="60">60 minutes</SelectItem>
                  <SelectItem value="90">90 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowPreferencesDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  toast({
                    title: "Preferences Saved",
                    description: "Your scheduling preferences have been updated.",
                  });
                  setShowPreferencesDialog(false);
                }}
              >
                Save Preferences
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}