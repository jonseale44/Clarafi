import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface UserPreferences {
  enableDenseView: boolean;
  chartPanelWidth: number;
  medicalProblemsDisplayThreshold: number;
  rankingWeights: {
    clinical_severity: number;
    treatment_complexity: number;
    patient_frequency: number;
    clinical_relevance: number;
  };
}

export function useDenseView() {
  const queryClient = useQueryClient();

  // Fetch user preferences
  const { data: preferences, isLoading } = useQuery<UserPreferences>({
    queryKey: ['/api/user/preferences'],
    retry: false,
  });

  // Toggle dense view mutation
  const toggleDenseViewMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      return apiRequest('PUT', '/api/user/preferences', { enableDenseView: enabled });
    },
    onSuccess: () => {
      // Invalidate preferences to refetch
      queryClient.invalidateQueries({ queryKey: ['/api/user/preferences'] });
    },
  });

  return {
    isDenseView: preferences?.enableDenseView ?? false,
    isLoading,
    toggleDenseView: (enabled: boolean) => toggleDenseViewMutation.mutate(enabled),
    isToggling: toggleDenseViewMutation.isPending,
  };
}