import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Eye, EyeOff, Settings } from "lucide-react";
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
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const { toast } = useToast();

  // Load API key from environment or localStorage on component mount
  useEffect(() => {
    const envKey = import.meta.env.VITE_OPENAI_API_KEY;
    const storedKey = localStorage.getItem("openai_api_key");
    
    if (envKey) {
      setApiKey(envKey);
      onApiKeyChange(envKey);
    } else if (storedKey) {
      setApiKey(storedKey);
      onApiKeyChange(storedKey);
    }
  }, [onApiKeyChange]);

  const handleApiKeySubmit = () => {
    if (!apiKey.trim()) {
      toast({
        variant: "destructive",
        title: "API Key Required",
        description: "Please enter your OpenAI API key to use Real-time features.",
      });
      return;
    }

    if (!apiKey.startsWith('sk-')) {
      toast({
        variant: "destructive",
        title: "Invalid API Key",
        description: "OpenAI API keys should start with 'sk-'",
      });
      return;
    }

    // Store API key in localStorage for persistence
    localStorage.setItem("openai_api_key", apiKey);
    onApiKeyChange(apiKey);
    
    toast({
      title: "API Key Saved",
      description: "OpenAI API key has been configured for Real-time features.",
    });
  };

  const clearApiKey = () => {
    setApiKey("");
    localStorage.removeItem("openai_api_key");
    onApiKeyChange("");
    
    toast({
      title: "API Key Cleared",
      description: "OpenAI API key has been removed.",
    });
  };

  const handleRealtimeToggle = (enabled: boolean) => {
    onRealtimeToggle(enabled);
    
    if (enabled && !apiKey) {
      toast({
        variant: "destructive",
        title: "API Key Required",
        description: "Please configure your OpenAI API key first.",
      });
      return;
    }

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

          {/* API Key Configuration */}
          <div className="space-y-2">
            <Label htmlFor="api-key">OpenAI API Key</Label>
            <div className="flex space-x-2">
              <div className="relative flex-1">
                <Input
                  id="api-key"
                  type={showApiKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowApiKey(!showApiKey)}
                >
                  {showApiKey ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <Button onClick={handleApiKeySubmit} size="sm">
                Save
              </Button>
              {apiKey && (
                <Button onClick={clearApiKey} variant="outline" size="sm">
                  Clear
                </Button>
              )}
            </div>
            <p className="text-xs text-gray-500">
              Your API key is stored locally and used for Real-time SOAP generation
            </p>
          </div>

          {/* Status Indicator */}
          <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
            <div className={`w-3 h-3 rounded-full ${
              isRealtimeEnabled && apiKey 
                ? "bg-green-500" 
                : "bg-yellow-500"
            }`} />
            <span className="text-sm">
              {isRealtimeEnabled && apiKey 
                ? "Ready for Real-time SOAP generation"
                : apiKey 
                  ? "Real-time API disabled (using standard API)"
                  : "API key required for Real-time features"
              }
            </span>
          </div>
        </CardContent>
      )}
    </Card>
  );
};