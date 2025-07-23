import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Settings, Clock, Calendar, RefreshCw, AlertCircle, CheckCircle, Info, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface UpdateSettings {
  enableAutoUpdates: boolean;
  updateFrequency: 'weekly' | 'biweekly' | 'monthly';
  updateDay: 'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday';
  updateHour: number;
  maxRetries: number;
}

interface UpdateStatus {
  isRunning: boolean;
  autoUpdatesEnabled: boolean;
  frequency: string;
  nextScheduled: string;
  systemRecommendation: {
    frequency: string;
    day: string;
    hour: number;
    reasoning: string;
  };
}

export function HealthcareUpdateSettings() {
  const [localSettings, setLocalSettings] = useState<UpdateSettings | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch current settings
  const { data: settingsData, isLoading } = useQuery({
    queryKey: ['/api/admin/healthcare-update-settings'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/healthcare-update-settings');
      return response.json();
    }
  });

  // Fetch current status
  const { data: statusData } = useQuery({
    queryKey: ['/api/admin/healthcare-data/update-status'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/healthcare-data/update-status');
      return response.json();
    },
    refetchInterval: 5000 // Update every 5 seconds
  });

  // Save settings mutation
  const saveSettingsMutation = useMutation({
    mutationFn: async (settings: UpdateSettings) => {
      const response = await apiRequest('POST', '/api/admin/healthcare-update-settings', settings);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Settings Saved",
        description: "Healthcare update settings have been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/healthcare-update-settings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/healthcare-data/update-status'] });
    },
    onError: (error: any) => {
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save settings",
        variant: "destructive"
      });
    }
  });

  // Toggle auto updates mutation
  const toggleAutoUpdatesMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const response = await apiRequest('POST', '/api/admin/healthcare-auto-updates/toggle', { enabled });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: data.enabled ? "Auto-Updates Enabled" : "Auto-Updates Disabled",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/healthcare-update-settings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/healthcare-data/update-status'] });
    }
  });

  // Manual update mutation
  const manualUpdateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/admin/healthcare-data/update-now');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Update Started",
        description: "Manual healthcare data update has been triggered.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/healthcare-data/update-status'] });
    }
  });

  const currentSettings = localSettings || settingsData?.settings;
  const status: UpdateStatus = statusData?.status;

  const handleSettingChange = (key: keyof UpdateSettings, value: any) => {
    if (!currentSettings) return;
    
    const updatedSettings = { ...currentSettings, [key]: value };
    setLocalSettings(updatedSettings);
  };

  const handleSaveSettings = () => {
    if (localSettings) {
      saveSettingsMutation.mutate(localSettings);
    }
  };

  const formatHour = (hour: number) => {
    if (hour === 0) return '12:00 AM';
    if (hour < 12) return `${hour}:00 AM`;
    if (hour === 12) return '12:00 PM';
    return `${hour - 12}:00 PM`;
  };

  if (isLoading) {
    return <div className="space-y-4">Loading settings...</div>;
  }

  return (
    <div className="space-y-6" data-median="healthcare-update-settings-container">
      {/* Current Status */}
      <Card data-median="update-status-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2" data-median="update-status-header">
            <RefreshCw className={`w-5 h-5 ${status?.isRunning ? 'animate-spin text-blue-500' : ''}`} />
            Update Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Current Status</Label>
              <Badge variant={status?.isRunning ? 'default' : 'secondary'} className="w-fit">
                {status?.isRunning ? (
                  <><RefreshCw className="w-3 h-3 mr-1 animate-spin" /> Updating</>
                ) : (
                  <><CheckCircle className="w-3 h-3 mr-1" /> Ready</>
                )}
              </Badge>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Auto Updates</Label>
              <Badge variant={status?.autoUpdatesEnabled ? 'default' : 'outline'}>
                {status?.autoUpdatesEnabled ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>
          </div>
          
          {status?.autoUpdatesEnabled && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Next Scheduled Update</Label>
              <p className="text-sm text-muted-foreground">{status.nextScheduled}</p>
            </div>
          )}

          <div className="flex gap-2">
            <Button 
              onClick={() => toggleAutoUpdatesMutation.mutate(!status?.autoUpdatesEnabled)}
              disabled={toggleAutoUpdatesMutation.isPending}
              variant={status?.autoUpdatesEnabled ? "outline" : "default"}
              size="sm"
            >
              {status?.autoUpdatesEnabled ? 'Disable Auto-Updates' : 'Enable Auto-Updates'}
            </Button>
            
            <Button 
              onClick={() => manualUpdateMutation.mutate()}
              disabled={status?.isRunning || manualUpdateMutation.isPending}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Zap className="w-4 h-4" />
              Update Now
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Configuration Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Update Schedule Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* System Recommendation */}
          {status?.systemRecommendation && (
            <Alert>
              <Info className="w-4 h-4" />
              <AlertDescription>
                <strong>System Recommendation:</strong> {status.systemRecommendation.reasoning}
                <br />
                <strong>Suggested:</strong> {status.systemRecommendation.frequency} updates on {status.systemRecommendation.day}s at {formatHour(status.systemRecommendation.hour)}
              </AlertDescription>
            </Alert>
          )}

          {/* Settings Form */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Update Frequency
              </Label>
              <Select
                value={currentSettings?.updateFrequency}
                onValueChange={(value: 'weekly' | 'biweekly' | 'monthly') => 
                  handleSettingChange('updateFrequency', value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly (Recommended)</SelectItem>
                  <SelectItem value="biweekly">Every 2 Weeks</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Update Day</Label>
              <Select
                value={currentSettings?.updateDay}
                onValueChange={(value: any) => handleSettingChange('updateDay', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sunday">Sunday</SelectItem>
                  <SelectItem value="monday">Monday (Recommended)</SelectItem>
                  <SelectItem value="tuesday">Tuesday</SelectItem>
                  <SelectItem value="wednesday">Wednesday</SelectItem>
                  <SelectItem value="thursday">Thursday</SelectItem>
                  <SelectItem value="friday">Friday</SelectItem>
                  <SelectItem value="saturday">Saturday</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Update Time
              </Label>
              <Select
                value={currentSettings?.updateHour?.toString()}
                onValueChange={(value) => handleSettingChange('updateHour', parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({length: 24}, (_, i) => (
                    <SelectItem key={i} value={i.toString()}>
                      {formatHour(i)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Max Retries</Label>
              <Select
                value={currentSettings?.maxRetries?.toString()}
                onValueChange={(value) => handleSettingChange('maxRetries', parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 Retry</SelectItem>
                  <SelectItem value="2">2 Retries</SelectItem>
                  <SelectItem value="3">3 Retries (Recommended)</SelectItem>
                  <SelectItem value="5">5 Retries</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button 
              onClick={handleSaveSettings}
              disabled={!localSettings || saveSettingsMutation.isPending}
            >
              {saveSettingsMutation.isPending ? (
                <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
              ) : (
                'Save Settings'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Information Card */}
      <Card className="bg-blue-50 dark:bg-blue-950/20">
        <CardContent className="pt-6">
          <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Automatic Update Benefits</h4>
          <ul className="text-sm space-y-1 text-blue-800 dark:text-blue-200">
            <li>• <strong>Fresh Data:</strong> Always have the latest healthcare provider information</li>
            <li>• <strong>New Providers:</strong> Automatically discover newly registered practices</li>
            <li>• <strong>Updated Addresses:</strong> Keep clinic locations and contact info current</li>
            <li>• <strong>Low Impact:</strong> Updates run during low-usage hours with retry logic</li>
            <li>• <strong>Reliable:</strong> Built-in error handling and progressive backoff</li>
            <li>• <strong>Configurable:</strong> Adjust frequency based on your needs</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}