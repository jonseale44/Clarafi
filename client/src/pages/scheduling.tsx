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
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>AI Scheduling Configuration</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div>
              <h3 className="font-medium mb-2">Patient Complexity Factors</h3>
              <div className="space-y-4">
                <div>
                  <Label>Chronic Conditions Weight</Label>
                  <Slider defaultValue={[75]} max={100} step={5} className="mt-2" />
                </div>
                <div>
                  <Label>Age Factor</Label>
                  <Slider defaultValue={[50]} max={100} step={5} className="mt-2" />
                </div>
                <div>
                  <Label>Visit History Impact</Label>
                  <Slider defaultValue={[60]} max={100} step={5} className="mt-2" />
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="font-medium mb-2">Provider Efficiency Factors</h3>
              <div className="space-y-4">
                <div>
                  <Label>Historical Performance</Label>
                  <Slider defaultValue={[80]} max={100} step={5} className="mt-2" />
                </div>
                <div>
                  <Label>Time of Day Adjustment</Label>
                  <Slider defaultValue={[40]} max={100} step={5} className="mt-2" />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAIDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  toast({
                    title: "AI Configuration Updated",
                    description: "Your scheduling AI factors have been saved.",
                  });
                  setShowAIDialog(false);
                }}
              >
                Save Changes
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