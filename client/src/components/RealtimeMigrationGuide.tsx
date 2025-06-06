import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, Zap, MessageSquare } from "lucide-react";

export const RealtimeMigrationGuide = () => {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Zap className="h-5 w-5 mr-2 text-blue-600" />
          Real-time API Migration Complete
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Features */}
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center">
              <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
              New Features
            </h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center">
                <Badge variant="secondary" className="mr-2">Real-time</Badge>
                Streaming SOAP note generation
              </li>
              <li className="flex items-center">
                <Badge variant="secondary" className="mr-2">Audio</Badge>
                Live transcription with Whisper
              </li>
              <li className="flex items-center">
                <Badge variant="secondary" className="mr-2">Orders</Badge>
                Automatic draft order extraction
              </li>
              <li className="flex items-center">
                <Badge variant="secondary" className="mr-2">Context</Badge>
                Patient chart integration
              </li>
            </ul>
          </div>

          {/* Performance */}
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center">
              <Clock className="h-4 w-4 mr-2 text-blue-600" />
              Performance Benefits
            </h3>
            <ul className="space-y-2 text-sm">
              <li>• Immediate streaming feedback</li>
              <li>• Parallel processing capabilities</li>
              <li>• Real-time voice activity detection</li>
              <li>• Reduced latency for SOAP generation</li>
            </ul>
          </div>
        </div>

        {/* Usage Instructions */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-semibold flex items-center mb-2">
            <MessageSquare className="h-4 w-4 mr-2 text-blue-600" />
            How to Use Real-time API
          </h3>
          <ol className="text-sm space-y-1 list-decimal list-inside">
            <li>Configure your OpenAI API key in the settings above</li>
            <li>Toggle Real-time API to enabled</li>
            <li>Start recording your patient encounter</li>
            <li>Watch as SOAP notes are generated in real-time</li>
            <li>Review and save the completed documentation</li>
          </ol>
        </div>

        {/* Migration Status */}
        <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
          <div className="flex items-center">
            <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
            <span className="font-medium text-green-800">Migration Complete</span>
          </div>
          <Badge variant="outline" className="text-green-700 border-green-300">
            v2.0 Real-time API
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
};