import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Activity, TrendingUp, Calendar, Filter } from "lucide-react";
import { format, parseISO } from "date-fns";

interface VitalsTrendingGraphProps {
  vitalsEntries: any[];
  patientId: number;
}

export function VitalsTrendingGraph({ vitalsEntries, patientId }: VitalsTrendingGraphProps) {
  const [selectedTimeRange, setSelectedTimeRange] = useState("all");
  const [selectedVitals, setSelectedVitals] = useState<string[]>([
    "systolicBp", "diastolicBp", "heartRate", "temperature"
  ]);

  // Debug vitals entries
  console.log("🔍 [VitalsTrending] Component received vitals entries:", vitalsEntries?.length || 0);
  console.log("🔍 [VitalsTrending] First few entries:", vitalsEntries?.slice(0, 2));

  // Filter data based on time range
  const getFilteredData = () => {
    if (!vitalsEntries || vitalsEntries.length === 0) {
      console.log("🔍 [VitalsTrending] No vitals entries available");
      return [];
    }

    console.log("🔍 [VitalsTrending] Processing vitals entries:", vitalsEntries.length);
    
    let filteredEntries = vitalsEntries;
    
    // Apply time range filter
    if (selectedTimeRange !== "all") {
      const days = parseInt(selectedTimeRange);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      
      filteredEntries = vitalsEntries.filter(entry => {
        const entryDate = new Date(entry.recordedAt);
        return entryDate >= cutoffDate;
      });
    }
    
    const processedData = filteredEntries
      .sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime())
      .map(entry => {
        try {
          const dateObj = new Date(entry.recordedAt);
          return {
            date: entry.recordedAt,
            dateFormatted: format(dateObj, "MMM dd"),
            dateDisplay: format(dateObj, "MMM dd, yyyy"),
            systolicBp: entry.systolicBp || null,
            diastolicBp: entry.diastolicBp || null,
            heartRate: entry.heartRate || null,
            temperature: entry.temperature ? parseFloat(entry.temperature) : null,
            weight: entry.weight ? parseFloat(entry.weight) : null,
            oxygenSaturation: entry.oxygenSaturation || null,
            respiratoryRate: entry.respiratoryRate || null,
            painScale: entry.painScale || null,
            recordedBy: entry.recordedBy || "Unknown",
            encounterContext: entry.encounterContext
          };
        } catch (error) {
          console.error("🔍 [VitalsTrending] Error processing entry:", entry, error);
          return null;
        }
      })
      .filter(entry => entry !== null);
    
    console.log("🔍 [VitalsTrending] Processed data points:", processedData.length);
    return processedData;
  };

  const chartData = getFilteredData();

  // Vital sign configurations
  const vitalConfigs = {
    systolicBp: { 
      color: "#dc2626", 
      name: "Systolic BP", 
      unit: "mmHg",
      normalRange: { min: 90, max: 120 }
    },
    diastolicBp: { 
      color: "#ea580c", 
      name: "Diastolic BP", 
      unit: "mmHg",
      normalRange: { min: 60, max: 80 }
    },
    heartRate: { 
      color: "#2563eb", 
      name: "Heart Rate", 
      unit: "bpm",
      normalRange: { min: 60, max: 100 }
    },
    temperature: { 
      color: "#16a34a", 
      name: "Temperature", 
      unit: "°F",
      normalRange: { min: 97.0, max: 99.5 }
    },
    weight: { 
      color: "#7c3aed", 
      name: "Weight", 
      unit: "lbs",
      normalRange: null
    },
    oxygenSaturation: { 
      color: "#0891b2", 
      name: "O2 Sat", 
      unit: "%",
      normalRange: { min: 95, max: 100 }
    },
    respiratoryRate: { 
      color: "#be185d", 
      name: "Resp Rate", 
      unit: "/min",
      normalRange: { min: 12, max: 20 }
    },
    painScale: { 
      color: "#ca8a04", 
      name: "Pain Scale", 
      unit: "/10",
      normalRange: { min: 0, max: 3 }
    }
  };

  const toggleVital = (vitalKey: string) => {
    setSelectedVitals(prev => 
      prev.includes(vitalKey) 
        ? prev.filter(v => v !== vitalKey)
        : [...prev, vitalKey]
    );
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 mb-2">
            {data.dateDisplay || format(new Date(data.date), "MMM dd, yyyy 'at' h:mm a")}
          </p>
          <div className="space-y-1">
            {payload.map((entry: any, index: number) => (
              <p key={index} className="text-sm" style={{ color: entry.color }}>
                <span className="font-medium">{entry.name}:</span> {entry.value}
                {vitalConfigs[entry.dataKey as keyof typeof vitalConfigs]?.unit}
              </p>
            ))}
          </div>
          <div className="mt-2 pt-2 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              Recorded by: {data.recordedBy}
            </p>
            {data.encounterContext && (
              <p className="text-xs text-gray-500">
                Context: {data.encounterContext}
              </p>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-navy-blue-600" />
            Vitals Trending
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            No vitals data available for trending analysis
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-navy-blue-600" />
            <CardTitle>Vitals Trending</CardTitle>
            <Badge variant="secondary" className="text-xs">
              {chartData.length} entries
            </Badge>
          </div>
          
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All time</SelectItem>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
                <SelectItem value="365">Last year</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {/* Vital Sign Toggles */}
        <div className="flex flex-wrap gap-2 mt-4">
          {Object.entries(vitalConfigs).map(([key, config]) => (
            <Button
              key={key}
              variant={selectedVitals.includes(key) ? "default" : "outline"}
              size="sm"
              onClick={() => toggleVital(key)}
              className="text-xs h-7"
              style={{
                backgroundColor: selectedVitals.includes(key) ? config.color : undefined,
                borderColor: config.color,
                color: selectedVitals.includes(key) ? "white" : config.color
              }}
            >
              {config.name}
            </Button>
          ))}
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="dateFormatted" 
                tick={{ fontSize: 12 }}
                stroke="#666"
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                stroke="#666"
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              
              {selectedVitals.map(vitalKey => {
                const config = vitalConfigs[vitalKey as keyof typeof vitalConfigs];
                return (
                  <Line
                    key={vitalKey}
                    type="monotone"
                    dataKey={vitalKey}
                    stroke={config.color}
                    strokeWidth={2}
                    dot={{ fill: config.color, strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: config.color, strokeWidth: 2 }}
                    name={config.name}
                    connectNulls={false}
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        {/* Summary Stats */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          {selectedVitals.slice(0, 4).map(vitalKey => {
            const config = vitalConfigs[vitalKey as keyof typeof vitalConfigs];
            const values = chartData
              .map(d => d[vitalKey as keyof typeof d])
              .filter(v => v !== null && v !== undefined) as number[];
            
            if (values.length === 0) return null;
            
            const latest = values[values.length - 1];
            const trend = values.length > 1 ? latest - values[values.length - 2] : 0;
            const average = values.reduce((a, b) => a + b, 0) / values.length;
            
            return (
              <div key={vitalKey} className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-sm font-medium text-gray-600 mb-1">
                  {config.name}
                </div>
                <div className="text-lg font-semibold" style={{ color: config.color }}>
                  {latest.toFixed(1)}{config.unit}
                </div>
                <div className="text-xs text-gray-500">
                  Avg: {average.toFixed(1)}{config.unit}
                </div>
                {trend !== 0 && (
                  <div className={`text-xs flex items-center justify-center gap-1 ${
                    trend > 0 ? 'text-red-600' : 'text-green-600'
                  }`}>
                    <TrendingUp className={`h-3 w-3 ${trend < 0 ? 'rotate-180' : ''}`} />
                    {Math.abs(trend).toFixed(1)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}