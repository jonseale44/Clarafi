import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Filter, Settings, RotateCcw, RefreshCw, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RANKING_CONFIG, type RankingWeights } from '@shared/ranking-calculation-service';
import { DualHandleSlider } from '@/components/ui/dual-handle-slider';
import { useDenseView } from '@/hooks/use-dense-view';

interface CompactRankingControlsProps {
  patientId: number;
  activeProblemsCount: number;
  filteredProblemsCount: number;
  largeHandleValue: number;
  smallHandleValue: number;
  onLargeHandleChange: (value: number) => void;
  onSmallHandleChange: (value: number) => void;
  onWeightsChange?: (weights: RankingWeights) => void;
}

export function CompactRankingControls({
  patientId,
  activeProblemsCount,
  filteredProblemsCount,
  largeHandleValue,
  smallHandleValue,
  onLargeHandleChange,
  onSmallHandleChange,
  onWeightsChange
}: CompactRankingControlsProps) {
  const [weights, setWeights] = useState<RankingWeights>(RANKING_CONFIG.DEFAULT_WEIGHTS);
  const [filterOpen, setFilterOpen] = useState(false);
  const [weightsOpen, setWeightsOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isDenseView } = useDenseView();

  // Load user preferences including ranking weights
  const { data: userPreferences } = useQuery<{ rankingWeights?: RankingWeights }>({
    queryKey: ["/api/user/preferences"],
    staleTime: 5 * 60 * 1000
  });

  useEffect(() => {
    if (userPreferences?.rankingWeights) {
      setWeights(userPreferences.rankingWeights);
    }
  }, [userPreferences]);

  // Mutations
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
        title: "Weights Updated",
        description: "Ranking preferences saved.",
      });
      setWeightsOpen(false);
    }
  });

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
        description: "Medical problems re-ranked.",
      });
    }
  });

  // Normalize weights helper
  const normalizeWeights = (newWeights: Partial<RankingWeights>, changedField: keyof RankingWeights) => {
    const currentWeights = { ...weights, ...newWeights };
    const total = Object.values(currentWeights).reduce((sum, val) => sum + val, 0);
    
    if (total === 100) return currentWeights;
    
    const otherFields = (Object.keys(currentWeights) as Array<keyof RankingWeights>)
      .filter(field => field !== changedField);
    
    const changedValue = currentWeights[changedField];
    const remainingTotal = 100 - changedValue;
    const otherTotal = otherFields.reduce((sum, field) => sum + weights[field], 0);
    
    if (otherTotal === 0) {
      const evenDistribution = Math.floor(remainingTotal / otherFields.length);
      const remainder = remainingTotal % otherFields.length;
      
      otherFields.forEach((field, index) => {
        currentWeights[field] = evenDistribution + (index < remainder ? 1 : 0);
      });
    } else {
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
    onWeightsChange?.(normalized);
    queryClient.invalidateQueries({ queryKey: ['/api/user/preferences'] });
  };

  // Ultra-compact horizontal bar for dense mode
  if (isDenseView) {
    return (
      <div className="flex items-center gap-2 h-7 bg-gray-50 dark:bg-gray-900/50 rounded-md px-2 py-1 border border-gray-200 dark:border-gray-700">
        {/* Priority Filter - Ultra Compact */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1">
                <Filter className="h-3 w-3 text-navy-blue-600 dark:text-navy-blue-400" />
                <span className="text-[10px] font-medium text-navy-blue-700 dark:text-navy-blue-300">
                  {filteredProblemsCount}/{activeProblemsCount}
                </span>
                <Popover open={filterOpen} onOpenChange={setFilterOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-5 px-1">
                      <ChevronRight className="h-3 w-3" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80" align="start">
                    <div className="space-y-4">
                      <div className="text-sm font-medium">Priority Filter</div>
                      <DualHandleSlider
                        min={1}
                        max={100}
                        largeHandleValue={largeHandleValue}
                        smallHandleValue={smallHandleValue}
                        onLargeHandleChange={onLargeHandleChange}
                        onSmallHandleChange={onSmallHandleChange}
                        label="Problems Display"
                        formatValue={(value) => `${value}%`}
                        className="mb-2"
                      />
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        Showing {filteredProblemsCount} of {activeProblemsCount} problems
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Priority Filter: {smallHandleValue}% ({filteredProblemsCount}/{activeProblemsCount} problems)</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <div className="w-px h-4 bg-gray-300 dark:bg-gray-600" />

        {/* Ranking Weights - Ultra Compact */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1">
                <Settings className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                <span className="text-[10px] font-medium text-purple-700 dark:text-purple-300">
                  {weights.clinical_severity}/{weights.treatment_complexity}/{weights.patient_frequency}/{weights.clinical_relevance}
                </span>
                <Popover open={weightsOpen} onOpenChange={setWeightsOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-5 px-1">
                      <ChevronRight className="h-3 w-3" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-96" align="start">
                    <CompactWeightsPopover 
                      weights={weights}
                      onWeightChange={handleWeightChange}
                      onSave={() => updateWeightsMutation.mutate(weights)}
                      onReset={() => {
                        setWeights(RANKING_CONFIG.DEFAULT_WEIGHTS);
                        onWeightsChange?.(RANKING_CONFIG.DEFAULT_WEIGHTS);
                      }}
                      onRefresh={() => refreshRankingsMutation.mutate()}
                      isSaving={updateWeightsMutation.isPending}
                      isRefreshing={refreshRankingsMutation.isPending}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Ranking Weights (Clinical/Treatment/Frequency/Relevance)</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    );
  }

  // Regular mode - still more compact than before
  return (
    <div className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
      {/* Priority Filter */}
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-navy-blue-600 dark:text-navy-blue-400" />
        <span className="text-sm font-medium text-navy-blue-700 dark:text-navy-blue-300">
          Filter: {filteredProblemsCount}/{activeProblemsCount}
        </span>
        <Popover open={filterOpen} onOpenChange={setFilterOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 px-2">
              Adjust
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="start">
            <div className="space-y-4">
              <div className="text-sm font-medium">Priority Filter</div>
              <DualHandleSlider
                min={1}
                max={100}
                largeHandleValue={largeHandleValue}
                smallHandleValue={smallHandleValue}
                onLargeHandleChange={onLargeHandleChange}
                onSmallHandleChange={onSmallHandleChange}
                label="Medical Problems Display"
                formatValue={(value) => `${value}% (${Math.max(1, Math.ceil((value / 100) * activeProblemsCount))} problems)`}
                className="mb-2"
              />
              <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                <div>• Large handle: Permanent preference ({largeHandleValue}%)</div>
                <div>• Small handle: Session filter ({smallHandleValue}%)</div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <div className="w-px h-6 bg-gray-300 dark:bg-gray-600" />

      {/* Ranking Weights */}
      <div className="flex items-center gap-2">
        <Settings className="h-4 w-4 text-purple-600 dark:text-purple-400" />
        <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
          Weights: {weights.clinical_severity}/{weights.treatment_complexity}/{weights.patient_frequency}/{weights.clinical_relevance}
        </span>
        <Popover open={weightsOpen} onOpenChange={setWeightsOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 px-2">
              Customize
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-96" align="start">
            <CompactWeightsPopover 
              weights={weights}
              onWeightChange={handleWeightChange}
              onSave={() => updateWeightsMutation.mutate(weights)}
              onReset={() => {
                setWeights(RANKING_CONFIG.DEFAULT_WEIGHTS);
                onWeightsChange?.(RANKING_CONFIG.DEFAULT_WEIGHTS);
              }}
              onRefresh={() => refreshRankingsMutation.mutate()}
              isSaving={updateWeightsMutation.isPending}
              isRefreshing={refreshRankingsMutation.isPending}
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}

// Separate component for the weights popover content
function CompactWeightsPopover({
  weights,
  onWeightChange,
  onSave,
  onReset,
  onRefresh,
  isSaving,
  isRefreshing
}: {
  weights: RankingWeights;
  onWeightChange: (field: keyof RankingWeights, value: number[]) => void;
  onSave: () => void;
  onReset: () => void;
  onRefresh: () => void;
  isSaving: boolean;
  isRefreshing: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="text-sm font-medium">Ranking Weight Preferences</div>
      
      {/* Clinical Severity */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <label>Clinical Severity</label>
          <span className="font-mono">{weights.clinical_severity}%</span>
        </div>
        <Slider
          value={[weights.clinical_severity]}
          onValueChange={(value) => onWeightChange('clinical_severity', value)}
          max={80}
          min={10}
          step={1}
          className="h-4"
        />
      </div>

      {/* Treatment Complexity */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <label>Treatment Complexity</label>
          <span className="font-mono">{weights.treatment_complexity}%</span>
        </div>
        <Slider
          value={[weights.treatment_complexity]}
          onValueChange={(value) => onWeightChange('treatment_complexity', value)}
          max={60}
          min={5}
          step={1}
          className="h-4"
        />
      </div>

      {/* Patient Frequency */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <label>Patient Frequency</label>
          <span className="font-mono">{weights.patient_frequency}%</span>
        </div>
        <Slider
          value={[weights.patient_frequency]}
          onValueChange={(value) => onWeightChange('patient_frequency', value)}
          max={40}
          min={0}
          step={1}
          className="h-4"
        />
      </div>

      {/* Clinical Relevance */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <label>Clinical Relevance</label>
          <span className="font-mono">{weights.clinical_relevance}%</span>
        </div>
        <Slider
          value={[weights.clinical_relevance]}
          onValueChange={(value) => onWeightChange('clinical_relevance', value)}
          max={25}
          min={0}
          step={1}
          className="h-4"
        />
      </div>

      <div className="flex gap-1 pt-2 border-t">
        <Button
          variant="outline"
          size="sm"
          onClick={onReset}
          className="h-7 text-xs"
        >
          <RotateCcw className="h-3 w-3 mr-1" />
          Reset
        </Button>
        <Button
          size="sm"
          onClick={onSave}
          disabled={isSaving}
          className="h-7 text-xs bg-purple-600 hover:bg-purple-700"
        >
          Save
        </Button>
        <Button
          size="sm"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="h-7 text-xs bg-green-600 hover:bg-green-700"
        >
          <RefreshCw className={`h-3 w-3 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="text-[10px] text-gray-500 dark:text-gray-400">
        Total: {Object.values(weights).reduce((sum, val) => sum + val, 0)}% • Weights sum to 100%
      </div>
    </div>
  );
}