import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, DollarSign, Activity, TrendingUp, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface TokenAnalysis {
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  totalCost: number;
  model: string;
  projections: {
    daily: number;
    monthly: number;
    yearly: number;
  };
}

interface TokenAnalysisBannerProps {
  tokenAnalysis?: TokenAnalysis;
  serviceName: string;
  className?: string;
  variant?: "default" | "compact";
}

export function TokenAnalysisBanner({ 
  tokenAnalysis, 
  serviceName, 
  className,
  variant = "default" 
}: TokenAnalysisBannerProps) {
  if (!tokenAnalysis) {
    return null;
  }

  const formatCost = (cost: number) => {
    if (cost < 0.01) {
      return `$${(cost * 1000).toFixed(2)}k`; // Show in thousandths for very small amounts
    }
    return `$${cost.toFixed(4)}`;
  };

  const formatTokens = (tokens: number) => {
    if (tokens >= 1000) {
      return `${(tokens / 1000).toFixed(1)}k`;
    }
    return tokens.toString();
  };

  if (variant === "compact") {
    return (
      <div className={cn(
        "flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md text-xs",
        className
      )}>
        <Activity className="h-3 w-3 text-blue-600 dark:text-blue-400" />
        <span className="text-blue-700 dark:text-blue-300 font-medium">
          {serviceName} AI: {formatTokens(tokenAnalysis.totalTokens)} tokens, {formatCost(tokenAnalysis.totalCost)}
        </span>
        <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
          {tokenAnalysis.model}
        </Badge>
      </div>
    );
  }

  return (
    <Card className={cn("border-blue-200 dark:border-blue-800 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20", className)}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <h4 className="font-semibold text-blue-900 dark:text-blue-100 text-sm">
              {serviceName} AI Analysis
            </h4>
            <Badge variant="outline" className="text-xs border-blue-300 text-blue-700 dark:border-blue-600 dark:text-blue-300">
              {tokenAnalysis.model}
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            <DollarSign className="h-3 w-3 text-green-600 dark:text-green-400" />
            <span className="text-sm font-semibold text-green-700 dark:text-green-300">
              {formatCost(tokenAnalysis.totalCost)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 text-xs">
          {/* Token Usage */}
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
              <Clock className="h-3 w-3" />
              <span>Usage</span>
            </div>
            <div className="font-mono">
              <div className="text-blue-700 dark:text-blue-300">
                Total: {formatTokens(tokenAnalysis.totalTokens)}
              </div>
              <div className="text-gray-600 dark:text-gray-400">
                In: {formatTokens(tokenAnalysis.inputTokens)}
              </div>
              <div className="text-gray-600 dark:text-gray-400">
                Out: {formatTokens(tokenAnalysis.outputTokens)}
              </div>
            </div>
          </div>

          {/* Cost Breakdown */}
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
              <DollarSign className="h-3 w-3" />
              <span>Cost</span>
            </div>
            <div className="font-mono">
              <div className="text-green-700 dark:text-green-300 font-semibold">
                {formatCost(tokenAnalysis.totalCost)}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-500">
                per analysis
              </div>
            </div>
          </div>

          {/* Daily Projection */}
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
              <TrendingUp className="h-3 w-3" />
              <span>Daily</span>
            </div>
            <div className="font-mono">
              <div className="text-orange-700 dark:text-orange-300">
                {formatCost(tokenAnalysis.projections.daily)}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-500">
                50 encounters
              </div>
            </div>
          </div>

          {/* Monthly Projection */}
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
              <AlertCircle className="h-3 w-3" />
              <span>Monthly</span>
            </div>
            <div className="font-mono">
              <div className="text-red-700 dark:text-red-300 font-semibold">
                {formatCost(tokenAnalysis.projections.monthly)}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-500">
                estimate
              </div>
            </div>
          </div>
        </div>

        {/* Warning for high costs */}
        {tokenAnalysis.projections.monthly > 100 && (
          <div className="mt-3 flex items-center gap-2 p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md">
            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <span className="text-xs text-amber-700 dark:text-amber-300">
              High monthly cost projection - consider optimization
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}