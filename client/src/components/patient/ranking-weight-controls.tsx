import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Settings, RotateCcw, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface RankingWeights {
  clinical_severity: number;
  treatment_complexity: number;
  patient_frequency: number;
  clinical_relevance: number;
}

interface RankingWeightControlsProps {
  patientId: number;
  onWeightsChange?: (weights: RankingWeights) => void;
}

export function RankingWeightControls({ patientId, onWeightsChange }: RankingWeightControlsProps) {
  const [weights, setWeights] = useState<RankingWeights>({
    clinical_severity: 40,
    treatment_complexity: 30,
    patient_frequency: 20,
    clinical_relevance: 10
  });
  
  const [isExpanded, setIsExpanded] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Load user preferences including ranking weights
  const { data: userPreferences } = useQuery<{ rankingWeights?: RankingWeights }>({
    queryKey: ["/api/user/preferences"],
    staleTime: 5 * 60 * 1000 // Cache for 5 minutes
  });

  // Initialize weights from user preferences
  useEffect(() => {
    if (userPreferences?.rankingWeights) {
      setWeights(userPreferences.rankingWeights);
    }
  }, [userPreferences]);

  // Mutation to update ranking weights
  const updateWeightsMutation = useMutation({
    mutationFn: async (newWeights: RankingWeights) => {
      const response = await fetch('/api/user/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rankingWeights: newWeights })
      });
      if (!response.ok) throw new Error('Failed to update ranking weights');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/preferences"] });
      toast({
        title: "Ranking Weights Updated",
        description: "Your ranking preferences have been saved.",
      });
    },
    onError: () => {
      toast({
        title: "Update Failed", 
        description: "Failed to save ranking preferences.",
        variant: "destructive",
      });
    }
  });

  // Mutation to refresh rankings for current patient
  const refreshRankingsMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/medical-problems/refresh-rankings/${patientId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('Failed to refresh rankings');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/medical-problems', patientId] });
      toast({
        title: "Rankings Refreshed",
        description: "Medical problem rankings have been updated with your preferences.",
      });
    },
    onError: () => {
      toast({
        title: "Refresh Failed",
        description: "Failed to refresh medical problem rankings.",
        variant: "destructive",
      });
    }
  });

  // Normalize weights to ensure they sum to 100
  const normalizeWeights = (newWeights: Partial<RankingWeights>, changedField: keyof RankingWeights) => {
    const currentWeights = { ...weights, ...newWeights };
    const total = Object.values(currentWeights).reduce((sum, val) => sum + val, 0);
    
    if (total === 100) return currentWeights;
    
    // Adjust other weights proportionally to maintain 100% total
    const otherFields = (Object.keys(currentWeights) as Array<keyof RankingWeights>)
      .filter(field => field !== changedField);
    
    const changedValue = currentWeights[changedField];
    const remainingTotal = 100 - changedValue;
    const otherTotal = otherFields.reduce((sum, field) => sum + weights[field], 0);
    
    if (otherTotal === 0) {
      // If other weights are zero, distribute evenly
      const evenDistribution = Math.floor(remainingTotal / otherFields.length);
      const remainder = remainingTotal % otherFields.length;
      
      otherFields.forEach((field, index) => {
        currentWeights[field] = evenDistribution + (index < remainder ? 1 : 0);
      });
    } else {
      // Proportionally adjust other weights
      otherFields.forEach(field => {
        const proportion = weights[field] / otherTotal;
        currentWeights[field] = Math.round(remainingTotal * proportion);
      });
    }
    
    return currentWeights;
  };

  const handleWeightChange = (field: keyof RankingWeights, value: number[]) => {
    const newValue = value[0];
    const normalized = normalizeWeights({ [field]: newValue }, field);
    setWeights(normalized);
    
    // Trigger immediate frontend recalculation via callback
    onWeightsChange?.(normalized);
    
    // Invalidate user preferences cache to trigger re-fetch with new weights
    queryClient.invalidateQueries({ queryKey: ['/api/user/preferences'] });
  };

  const resetToDefaults = () => {
    const defaults = {
      clinical_severity: 40,
      treatment_complexity: 30,
      patient_frequency: 20,
      clinical_relevance: 10
    };
    setWeights(defaults);
    onWeightsChange?.(defaults);
  };

  const saveWeights = () => {
    updateWeightsMutation.mutate(weights);
  };

  const refreshRankings = () => {
    refreshRankingsMutation.mutate();
  };

  if (!isExpanded) {
    return (
      <Card className="border-purple-200 bg-purple-50/50 dark:bg-purple-950/20 dark:border-purple-800">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              <CardTitle className="text-sm font-medium text-purple-900 dark:text-purple-100">
                Ranking Weights
              </CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(true)}
              className="text-purple-700 hover:text-purple-900 hover:bg-purple-100 dark:text-purple-300 dark:hover:text-purple-100 dark:hover:bg-purple-900/50"
            >
              Customize
            </Button>
          </div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="border-purple-200 bg-purple-50/50 dark:bg-purple-950/20 dark:border-purple-800">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            <CardTitle className="text-sm font-medium text-purple-900 dark:text-purple-100">
              Ranking Weights
            </CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(false)}
            className="text-purple-700 hover:text-purple-900 hover:bg-purple-100 dark:text-purple-300 dark:hover:text-purple-100 dark:hover:bg-purple-900/50"
          >
            Collapse
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-xs text-purple-700 dark:text-purple-300 mb-4">
          Adjust how medical problems are ranked. Weights automatically sum to 100%.
        </div>
        
        {/* Clinical Severity Weight */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <label className="font-medium text-purple-900 dark:text-purple-100">
              Clinical Severity & Acuity
            </label>
            <span className="font-mono text-purple-700 dark:text-purple-300">
              {weights.clinical_severity}%
            </span>
          </div>
          <Slider
            value={[weights.clinical_severity]}
            onValueChange={(value) => handleWeightChange('clinical_severity', value)}
            max={80}
            min={10}
            step={1}
            className="w-full"
          />
          <div className="text-xs text-purple-600 dark:text-purple-400">
            Life-threatening conditions vs stable chronic conditions
          </div>
        </div>

        {/* Treatment Complexity Weight */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <label className="font-medium text-purple-900 dark:text-purple-100">
              Treatment Complexity
            </label>
            <span className="font-mono text-purple-700 dark:text-purple-300">
              {weights.treatment_complexity}%
            </span>
          </div>
          <Slider
            value={[weights.treatment_complexity]}
            onValueChange={(value) => handleWeightChange('treatment_complexity', value)}
            max={60}
            min={5}
            step={1}
            className="w-full"
          />
          <div className="text-xs text-purple-600 dark:text-purple-400">
            Multiple medications vs simple management
          </div>
        </div>

        {/* Patient Frequency Weight */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <label className="font-medium text-purple-900 dark:text-purple-100">
              Patient Frequency & Impact
            </label>
            <span className="font-mono text-purple-700 dark:text-purple-300">
              {weights.patient_frequency}%
            </span>
          </div>
          <Slider
            value={[weights.patient_frequency]}
            onValueChange={(value) => handleWeightChange('patient_frequency', value)}
            max={40}
            min={0}
            step={1}
            className="w-full"
          />
          <div className="text-xs text-purple-600 dark:text-purple-400">
            Recently mentioned vs long-term stable conditions
          </div>
        </div>

        {/* Clinical Relevance Weight */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <label className="font-medium text-purple-900 dark:text-purple-100">
              Current Clinical Relevance
            </label>
            <span className="font-mono text-purple-700 dark:text-purple-300">
              {weights.clinical_relevance}%
            </span>
          </div>
          <Slider
            value={[weights.clinical_relevance]}
            onValueChange={(value) => handleWeightChange('clinical_relevance', value)}
            max={25}
            min={0}
            step={1}
            className="w-full"
          />
          <div className="text-xs text-purple-600 dark:text-purple-400">
            Active treatment today vs historical reference
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4 border-t border-purple-200 dark:border-purple-800">
          <Button
            variant="outline"
            size="sm"
            onClick={resetToDefaults}
            className="flex items-center gap-1 text-purple-700 border-purple-300 hover:bg-purple-100 dark:text-purple-300 dark:border-purple-700 dark:hover:bg-purple-900/50"
          >
            <RotateCcw className="h-3 w-3" />
            Reset
          </Button>
          <Button
            size="sm"
            onClick={saveWeights}
            disabled={updateWeightsMutation.isPending}
            className="flex items-center gap-1 bg-purple-600 hover:bg-purple-700 text-white"
          >
            Save Weights
          </Button>
          <Button
            size="sm"
            onClick={refreshRankings}
            disabled={refreshRankingsMutation.isPending}
            className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white"
          >
            <RefreshCw className={`h-3 w-3 ${refreshRankingsMutation.isPending ? 'animate-spin' : ''}`} />
            Refresh Rankings
          </Button>
        </div>

        <div className="text-xs text-purple-600 dark:text-purple-400 pt-2">
          <div className="font-medium mb-1">Total: {Object.values(weights).reduce((sum, val) => sum + val, 0)}%</div>
          <div>Changes are saved to your user preferences and apply to all patients.</div>
        </div>
      </CardContent>
    </Card>
  );
}