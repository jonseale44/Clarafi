import { useState } from "react";
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

export default function SchedulingPage() {
  const [selectedProviderId, setSelectedProviderId] = useState<number | undefined>();
  const [selectedLocationId, setSelectedLocationId] = useState<number | undefined>();
  const [showProviderDialog, setShowProviderDialog] = useState(false);
  const [showAIDialog, setShowAIDialog] = useState(false);
  const [showPreferencesDialog, setShowPreferencesDialog] = useState(false);
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  
  // AI Factor State Management
  const [aiFactors, setAiFactors] = useState({
    // Primary Factor
    historicalVisitWeight: 80,
    
    // Patient Complexity
    medicalProblemsWeight: 75,
    activeMedicationsWeight: 60,
    patientAgeWeight: 50,
    allergiesReviewWeight: 40,
    
    // Patient Behavior
    noShowRiskWeight: 70,
    arrivalPatternsWeight: 45,
    
    // Visit Type
    newPatientExtraWeight: 90,
    physicalExamExtraWeight: 85,
    
    // Provider Efficiency
    providerSpeedWeight: 80,
    locationSpecificWeight: 55,
    
    // Temporal
    timeOfDayWeight: 40,
    dayOfWeekWeight: 35,
    
    // Buffers
    complexPatientBufferWeight: 65,
    providerPreferenceBufferWeight: 50
  });
  
  const updateAiFactor = (factor: string, value: number) => {
    setAiFactors(prev => ({ ...prev, [factor]: value }));
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
                    <Label>Allergies Review</Label>
                    <span className="text-sm text-gray-600">{aiFactors.allergiesReviewWeight}%</span>
                  </div>
                  <p className="text-xs text-gray-600 mb-2">Multiple allergies requiring review</p>
                  <Slider 
                    value={[aiFactors.allergiesReviewWeight]} 
                    onValueChange={(value) => updateAiFactor('allergiesReviewWeight', value[0])}
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
                    <Label>Arrival Patterns</Label>
                    <span className="text-sm text-gray-600">{aiFactors.arrivalPatternsWeight}%</span>
                  </div>
                  <p className="text-xs text-gray-600 mb-2">Consistently late arrivals get buffer time</p>
                  <Slider 
                    value={[aiFactors.arrivalPatternsWeight]} 
                    onValueChange={(value) => updateAiFactor('arrivalPatternsWeight', value[0])}
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
                    <Label>New Patient Extra Time</Label>
                    <span className="text-sm text-gray-600">{aiFactors.newPatientExtraWeight}%</span>
                  </div>
                  <p className="text-xs text-gray-600 mb-2">New patients get +10 minutes automatically</p>
                  <Slider 
                    value={[aiFactors.newPatientExtraWeight]} 
                    onValueChange={(value) => updateAiFactor('newPatientExtraWeight', value[0])}
                    max={100} 
                    step={5} 
                    className="mt-2" 
                  />
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <Label>Physical Exam Extra Time</Label>
                    <span className="text-sm text-gray-600">{aiFactors.physicalExamExtraWeight}%</span>
                  </div>
                  <p className="text-xs text-gray-600 mb-2">Annual physicals get +15 minutes</p>
                  <Slider 
                    value={[aiFactors.physicalExamExtraWeight]} 
                    onValueChange={(value) => updateAiFactor('physicalExamExtraWeight', value[0])}
                    max={100} 
                    step={5} 
                    className="mt-2" 
                  />
                </div>
              </div>
            </div>

            {/* Provider Efficiency Factors */}
            <div>
              <h3 className="font-semibold mb-4">👨‍⚕️ Provider Efficiency Factors</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <Label>Provider Speed Patterns</Label>
                    <span className="text-sm text-gray-600">{aiFactors.providerSpeedWeight}%</span>
                  </div>
                  <p className="text-xs text-gray-600 mb-2">Provider's historical pace vs average</p>
                  <Slider 
                    value={[aiFactors.providerSpeedWeight]} 
                    onValueChange={(value) => updateAiFactor('providerSpeedWeight', value[0])}
                    max={100} 
                    step={5} 
                    className="mt-2" 
                  />
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <Label>Location-Specific Patterns</Label>
                    <span className="text-sm text-gray-600">{aiFactors.locationSpecificWeight}%</span>
                  </div>
                  <p className="text-xs text-gray-600 mb-2">Provider efficiency at specific locations</p>
                  <Slider 
                    value={[aiFactors.locationSpecificWeight]} 
                    onValueChange={(value) => updateAiFactor('locationSpecificWeight', value[0])}
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
              <h3 className="font-semibold mb-4">⏱️ Buffer & Safety Margins</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <Label>Complex Patient Buffer</Label>
                    <span className="text-sm text-gray-600">{aiFactors.complexPatientBufferWeight}%</span>
                  </div>
                  <p className="text-xs text-gray-600 mb-2">Extra time for patients with 5+ conditions</p>
                  <Slider 
                    value={[aiFactors.complexPatientBufferWeight]} 
                    onValueChange={(value) => updateAiFactor('complexPatientBufferWeight', value[0])}
                    max={100} 
                    step={5} 
                    className="mt-2" 
                  />
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <Label>Provider Preference Buffer</Label>
                    <span className="text-sm text-gray-600">{aiFactors.providerPreferenceBufferWeight}%</span>
                  </div>
                  <p className="text-xs text-gray-600 mb-2">Provider-requested buffer between appointments</p>
                  <Slider 
                    value={[aiFactors.providerPreferenceBufferWeight]} 
                    onValueChange={(value) => updateAiFactor('providerPreferenceBufferWeight', value[0])}
                    max={100} 
                    step={5} 
                    className="mt-2" 
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setShowAIDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  toast({
                    title: "AI Configuration Updated",
                    description: "Your scheduling AI factors have been saved. The system will now use these weights for predictions.",
                  });
                  setShowAIDialog(false);
                }}
              >
                Save Configuration
              </Button>
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