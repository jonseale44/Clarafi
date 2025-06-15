import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Clock, Zap, AlertTriangle, CheckCircle } from "lucide-react";

interface PerformanceMetrics {
  templateAnalysisTimes: number[];
  voiceSuggestionTimes: number[];
  cacheHitRate: number;
  totalApiCalls: number;
  avgResponseTime: number;
  bottlenecks: string[];
}

interface NursingPerformanceMonitorProps {
  isVisible?: boolean;
  encounterId: string;
}

export function NursingPerformanceMonitor({ isVisible = false, encounterId }: NursingPerformanceMonitorProps) {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    templateAnalysisTimes: [],
    voiceSuggestionTimes: [],
    cacheHitRate: 0,
    totalApiCalls: 0,
    avgResponseTime: 0,
    bottlenecks: [],
  });

  const [isCollapsed, setIsCollapsed] = useState(!isVisible);

  useEffect(() => {
    // Monitor network requests for performance analysis
    const originalFetch = window.fetch;
    
    window.fetch = async function(...args) {
      const startTime = Date.now();
      const url = args[0] as string;
      
      try {
        const response = await originalFetch.apply(this, args);
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        // Track specific API calls
        if (url.includes('/api/nursing/analyze-template')) {
          setMetrics(prev => ({
            ...prev,
            templateAnalysisTimes: [...prev.templateAnalysisTimes.slice(-9), duration],
            totalApiCalls: prev.totalApiCalls + 1,
            avgResponseTime: (prev.avgResponseTime * prev.totalApiCalls + duration) / (prev.totalApiCalls + 1),
          }));
        }
        
        if (url.includes('/api/voice/live-suggestions')) {
          setMetrics(prev => ({
            ...prev,
            voiceSuggestionTimes: [...prev.voiceSuggestionTimes.slice(-9), duration],
          }));
        }
        
        return response;
      } catch (error) {
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        setMetrics(prev => ({
          ...prev,
          bottlenecks: [...prev.bottlenecks.slice(-4), `API Error: ${url} (${duration}ms)`],
        }));
        
        throw error;
      }
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  // Calculate performance insights
  const avgTemplateTime = metrics.templateAnalysisTimes.length > 0 
    ? Math.round(metrics.templateAnalysisTimes.reduce((a, b) => a + b, 0) / metrics.templateAnalysisTimes.length)
    : 0;

  const avgVoiceTime = metrics.voiceSuggestionTimes.length > 0 
    ? Math.round(metrics.voiceSuggestionTimes.reduce((a, b) => a + b, 0) / metrics.voiceSuggestionTimes.length)
    : 0;

  const getPerformanceStatus = (time: number) => {
    if (time < 500) return { status: 'excellent', color: 'green' };
    if (time < 1000) return { status: 'good', color: 'blue' };
    if (time < 2000) return { status: 'slow', color: 'yellow' };
    return { status: 'critical', color: 'red' };
  };

  const templateStatus = getPerformanceStatus(avgTemplateTime);
  const voiceStatus = getPerformanceStatus(avgVoiceTime);

  if (!isVisible && isCollapsed) return null;

  return (
    <Card className="p-4 border-yellow-200 bg-yellow-50 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <Clock className="h-4 w-4 text-yellow-600" />
          <h3 className="font-semibold text-yellow-900 text-sm">Performance Monitor</h3>
        </div>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="text-yellow-600 hover:text-yellow-800 text-xs"
        >
          {isCollapsed ? 'Show' : 'Hide'}
        </button>
      </div>

      {!isCollapsed && (
        <div className="space-y-3 text-xs">
          {/* Template Analysis Performance */}
          <div className="flex items-center justify-between">
            <span className="text-gray-700">Template Analysis:</span>
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className={`text-${templateStatus.color}-700 border-${templateStatus.color}-200`}>
                {avgTemplateTime}ms avg
              </Badge>
              {templateStatus.status === 'excellent' && <CheckCircle className="h-3 w-3 text-green-600" />}
              {templateStatus.status === 'critical' && <AlertTriangle className="h-3 w-3 text-red-600" />}
            </div>
          </div>

          {/* Voice Suggestions Performance */}
          <div className="flex items-center justify-between">
            <span className="text-gray-700">Voice Suggestions:</span>
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className={`text-${voiceStatus.color}-700 border-${voiceStatus.color}-200`}>
                {avgVoiceTime}ms avg
              </Badge>
              {voiceStatus.status === 'excellent' && <Zap className="h-3 w-3 text-green-600" />}
            </div>
          </div>

          {/* API Call Efficiency */}
          <div className="flex items-center justify-between">
            <span className="text-gray-700">Total API Calls:</span>
            <Badge variant="outline" className="text-blue-700 border-blue-200">
              {metrics.totalApiCalls}
            </Badge>
          </div>

          {/* Performance Recommendations */}
          {avgTemplateTime > 1500 && (
            <div className="p-2 bg-orange-100 rounded border border-orange-200">
              <div className="text-orange-800 font-medium">Optimization Suggestion:</div>
              <div className="text-orange-700">Template analysis is slow (&gt;1.5s). Consider reducing analysis frequency.</div>
            </div>
          )}

          {metrics.templateAnalysisTimes.length > 5 && avgTemplateTime < 800 && (
            <div className="p-2 bg-green-100 rounded border border-green-200">
              <div className="text-green-800 font-medium">Performance Optimized:</div>
              <div className="text-green-700">Template analysis running efficiently with caching.</div>
            </div>
          )}

          {/* Recent Response Times */}
          {metrics.templateAnalysisTimes.length > 0 && (
            <div>
              <div className="text-gray-700 mb-1">Template Analysis Trend:</div>
              <div className="flex space-x-1">
                {metrics.templateAnalysisTimes.slice(-8).map((time, index) => (
                  <div
                    key={index}
                    className={`h-2 w-3 rounded-sm ${
                      time < 800 ? 'bg-green-400' : 
                      time < 1500 ? 'bg-yellow-400' : 'bg-red-400'
                    }`}
                    title={`${time}ms`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}