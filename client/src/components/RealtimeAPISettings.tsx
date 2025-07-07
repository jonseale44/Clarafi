import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface RealtimeAPISettingsProps {
  onApiKeyChange: (apiKey: string) => void;
  onRealtimeToggle: (enabled: boolean) => void;
  isRealtimeEnabled: boolean;
}

export const RealtimeAPISettings: React.FC<RealtimeAPISettingsProps> = ({
  onApiKeyChange,
  onRealtimeToggle,
  isRealtimeEnabled
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { toast } = useToast();

  const handleRealtimeToggle = (enabled: boolean) => {
    onRealtimeToggle(enabled);

    toast({
      title: enabled ? "Real-time API Enabled" : "Real-time API Disabled",
      description: enabled 
        ? "SOAP notes will be generated using Real-time API with streaming"
        : "SOAP notes will use standard API without streaming",
    });
  };

  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center">
            <Settings className="h-5 w-5 mr-2" />
            Real-time API Configuration
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? "Collapse" : "Configure"}
          </Button>
        </div>
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="space-y-4">
          {/* Real-time API Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="realtime-toggle">Enable Real-time API</Label>
              <p className="text-sm text-gray-600">
                Use OpenAI's Real-time API for streaming SOAP note generation
              </p>
            </div>
            <Switch
              id="realtime-toggle"
              checked={isRealtimeEnabled}
              onCheckedChange={handleRealtimeToggle}
            />
          </div>

          {/* Status Indicator */}
          <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
            <div className={`w-3 h-3 rounded-full ${
              isRealtimeEnabled
                ? "bg-green-500" 
                : "bg-yellow-500"
            }`} />
            <span className="text-sm">
              {isRealtimeEnabled
                ? "Real-time SOAP generation enabled (secure proxy)"
                : "Real-time API disabled (using standard API)"
              }
            </span>
          </div>

          {/* Security Information */}
          <div className="text-xs text-gray-500 border-t pt-3">
            <p>Connection secured through server-side proxy</p>
            <p>No API keys stored in browser</p>
          </div>
        </CardContent>
      )}
    </Card>
  );
};