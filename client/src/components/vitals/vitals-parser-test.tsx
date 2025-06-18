import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Activity, Heart, Thermometer, Weight, Wind, AlertTriangle, CheckCircle } from "lucide-react";

interface ParsedVitalsData {
  systolicBp?: number;
  diastolicBp?: number;
  heartRate?: number;
  temperature?: string;
  weight?: string;
  height?: string;
  bmi?: string;
  oxygenSaturation?: string;
  respiratoryRate?: number;
  painScale?: number;
  parsedText?: string;
  confidence?: number;
  warnings?: string[];
}

interface VitalsParsingResult {
  success: boolean;
  data?: ParsedVitalsData;
  confidence: number;
  originalText: string;
  warnings: string[];
}

export function VitalsParserTest() {
  const [vitalsText, setVitalsText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [parseResult, setParseResult] = useState<VitalsParsingResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const testCases = [
    "120/80, P 80, RR 23, 98% on room air",
    "BP 160/90, HR 95, T 101.2F, O2 95%, pain 7/10",
    "Blood pressure 140 over 85, pulse 72, temp 38.5 celsius, weight 70 kg",
    "vitals stable: 118/76, HR 68, RR 16, afebrile, sat 99% RA",
    "Hypertensive: 185/95, tachycardic 110, febrile 102.1F",
    "Wt 165 lbs, Ht 68 inches, T 98.6F, BP 125/82, HR 78"
  ];

  const handleParse = async () => {
    if (!vitalsText.trim()) return;

    setIsLoading(true);
    setError(null);
    setParseResult(null);

    try {
      const response = await fetch("/api/vitals/parse", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          vitalsText: vitalsText.trim(),
          patientId: 98
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        setParseResult({
          success: true,
          data: result.parsedData,
          confidence: result.confidence,
          originalText: result.originalText,
          warnings: result.warnings || []
        });
      } else {
        setError("Parsing failed: " + (result.error || "Unknown error"));
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse vitals");
    } finally {
      setIsLoading(false);
    }
  };

  const getVitalStatus = (value: number | string | null, type: string) => {
    if (!value) return { status: "unknown", color: "text-gray-600" };
    
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    
    switch (type) {
      case "systolic":
        if (numValue > 180) return { status: "Critical High", color: "text-red-600" };
        if (numValue > 140) return { status: "High", color: "text-orange-600" };
        if (numValue > 120) return { status: "Elevated", color: "text-yellow-600" };
        return { status: "Normal", color: "text-green-600" };
      case "diastolic":
        if (numValue > 110) return { status: "Critical High", color: "text-red-600" };
        if (numValue > 90) return { status: "High", color: "text-orange-600" };
        if (numValue > 80) return { status: "Elevated", color: "text-yellow-600" };
        return { status: "Normal", color: "text-green-600" };
      case "hr":
        if (numValue > 120 || numValue < 50) return { status: "Critical", color: "text-red-600" };
        if (numValue > 100 || numValue < 60) return { status: "Abnormal", color: "text-orange-600" };
        return { status: "Normal", color: "text-green-600" };
      case "temp":
        if (numValue > 101) return { status: "Fever", color: "text-red-600" };
        if (numValue < 97) return { status: "Low", color: "text-blue-600" };
        return { status: "Normal", color: "text-green-600" };
      case "o2sat":
        if (numValue < 95) return { status: "Low", color: "text-red-600" };
        return { status: "Normal", color: "text-green-600" };
      case "pain":
        if (numValue > 7) return { status: "Severe", color: "text-red-600" };
        if (numValue > 4) return { status: "Moderate", color: "text-orange-600" };
        if (numValue > 0) return { status: "Mild", color: "text-yellow-600" };
        return { status: "None", color: "text-green-600" };
      default:
        return { status: "Normal", color: "text-green-600" };
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="h-5 w-5" />
            <span>GPT Vitals Parser - Phase 1 Testing</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">
              Enter vitals text to parse:
            </label>
            <Textarea
              value={vitalsText}
              onChange={(e) => setVitalsText(e.target.value)}
              placeholder="Example: 120/80, P 80, RR 23, 98% on room air"
              className="min-h-[100px]"
            />
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={handleParse} 
              disabled={!vitalsText.trim() || isLoading}
              className="flex-1"
            >
              {isLoading ? "Parsing..." : "Parse Vitals"}
            </Button>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Quick test examples:</label>
            <div className="grid grid-cols-1 gap-2">
              {testCases.map((testCase, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => setVitalsText(testCase)}
                  className="text-left justify-start"
                >
                  {testCase}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-red-800">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {parseResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Parsing Results</span>
              <div className="flex items-center space-x-2">
                <Badge variant={parseResult.confidence > 80 ? "default" : "secondary"}>
                  {parseResult.confidence}% confidence
                </Badge>
                {parseResult.success && (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {parseResult.warnings.length > 0 && (
              <Alert className="border-orange-200 bg-orange-50">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-medium text-orange-800">Critical Values Detected:</div>
                  <ul className="mt-1 list-disc list-inside text-orange-700">
                    {parseResult.warnings.map((warning, index) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            <div>
              <h4 className="font-medium mb-2">Parsed Text Summary:</h4>
              <p className="text-sm bg-gray-50 p-2 rounded border">
                {parseResult.data?.parsedText || "No summary available"}
              </p>
            </div>

            <Separator />

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Blood Pressure */}
              {(parseResult.data?.systolicBp || parseResult.data?.diastolicBp) && (
                <Card className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Blood Pressure</p>
                      <p className="text-lg font-semibold">
                        {parseResult.data.systolicBp && parseResult.data.diastolicBp 
                          ? `${parseResult.data.systolicBp}/${parseResult.data.diastolicBp}`
                          : `${parseResult.data.systolicBp || '?'}/${parseResult.data.diastolicBp || '?'}`
                        }
                      </p>
                      {parseResult.data.systolicBp && (
                        <p className={`text-xs ${getVitalStatus(parseResult.data.systolicBp, "systolic").color}`}>
                          {getVitalStatus(parseResult.data.systolicBp, "systolic").status}
                        </p>
                      )}
                    </div>
                    <Heart className="h-5 w-5 text-red-500" />
                  </div>
                </Card>
              )}

              {/* Heart Rate */}
              {parseResult.data?.heartRate && (
                <Card className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Heart Rate</p>
                      <p className="text-lg font-semibold">{parseResult.data.heartRate} bpm</p>
                      <p className={`text-xs ${getVitalStatus(parseResult.data.heartRate, "hr").color}`}>
                        {getVitalStatus(parseResult.data.heartRate, "hr").status}
                      </p>
                    </div>
                    <Activity className="h-5 w-5 text-blue-500" />
                  </div>
                </Card>
              )}

              {/* Temperature */}
              {parseResult.data?.temperature && (
                <Card className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Temperature</p>
                      <p className="text-lg font-semibold">{parseResult.data.temperature}°F</p>
                      <p className={`text-xs ${getVitalStatus(parseResult.data.temperature, "temp").color}`}>
                        {getVitalStatus(parseResult.data.temperature, "temp").status}
                      </p>
                    </div>
                    <Thermometer className="h-5 w-5 text-orange-500" />
                  </div>
                </Card>
              )}

              {/* Weight */}
              {parseResult.data?.weight && (
                <Card className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Weight</p>
                      <p className="text-lg font-semibold">{parseResult.data.weight} lbs</p>
                      {parseResult.data.height && parseResult.data.bmi && (
                        <p className="text-xs text-gray-600">
                          BMI {parseResult.data.bmi}
                        </p>
                      )}
                    </div>
                    <Weight className="h-5 w-5 text-purple-500" />
                  </div>
                </Card>
              )}

              {/* Oxygen Saturation */}
              {parseResult.data?.oxygenSaturation && (
                <Card className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">O2 Saturation</p>
                      <p className="text-lg font-semibold">{parseResult.data.oxygenSaturation}%</p>
                      <p className={`text-xs ${getVitalStatus(parseResult.data.oxygenSaturation, "o2sat").color}`}>
                        {getVitalStatus(parseResult.data.oxygenSaturation, "o2sat").status}
                      </p>
                    </div>
                    <Wind className="h-5 w-5 text-cyan-500" />
                  </div>
                </Card>
              )}

              {/* Pain Scale */}
              {parseResult.data?.painScale !== null && parseResult.data?.painScale !== undefined && (
                <Card className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Pain Scale</p>
                      <p className="text-lg font-semibold">{parseResult.data.painScale}/10</p>
                      <p className={`text-xs ${getVitalStatus(parseResult.data.painScale, "pain").color}`}>
                        {getVitalStatus(parseResult.data.painScale, "pain").status}
                      </p>
                    </div>
                    <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  </div>
                </Card>
              )}
            </div>

            <Separator />

            <div className="text-xs text-gray-500 space-y-1">
              <p><strong>Original Input:</strong> {parseResult.originalText}</p>
              <p><strong>US Standard Units:</strong> Temperature in °F, Weight in lbs, Height in inches, BP in mmHg</p>
              <p><strong>Auto Conversion:</strong> Celsius to Fahrenheit, kg to lbs, cm to inches</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}