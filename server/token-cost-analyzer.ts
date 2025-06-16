/**
 * Token Cost Analyzer
 * 
 * Provides accurate token counting and cost analysis for OpenAI API calls
 * Based on current OpenAI pricing as of June 2025
 */

// Current OpenAI pricing per 1M tokens (June 2025)
export const OPENAI_PRICING = {
  'gpt-4.1': {
    input: 2.00,      // $2.00 per 1M input tokens
    output: 8.00,     // $8.00 per 1M output tokens
    cached: 0.50,     // $0.50 per 1M cached input tokens
    contextWindow: 1047576,
    maxOutput: 32768
  },
  'gpt-4.1-mini': {
    input: 0.40,      // $0.40 per 1M input tokens
    output: 1.60,     // $1.60 per 1M output tokens
    cached: 0.10,     // $0.10 per 1M cached input tokens
    contextWindow: 1047576,
    maxOutput: 32768
  },
  'gpt-4o-mini-realtime': {
    input: 0.60,      // $0.60 per 1M input tokens
    output: 2.40,     // $2.40 per 1M output tokens
    cached: 0.30,     // $0.30 per 1M cached input tokens
    contextWindow: 128000,
    maxOutput: 4096
  }
} as const;

// OpenAI CompletionUsage interface compatibility
export interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cached_tokens?: number;
}

export interface CostAnalysis {
  inputCost: number;
  outputCost: number;
  cachedCost: number;
  totalCost: number;
  model: string;
  costBreakdown: {
    inputTokens: number;
    outputTokens: number;
    cachedTokens: number;
    inputCostPerToken: number;
    outputCostPerToken: number;
    cachedCostPerToken: number;
  };
}

export class TokenCostAnalyzer {
  /**
   * Calculate precise cost from OpenAI response usage
   */
  static calculateCost(usage: TokenUsage, model: keyof typeof OPENAI_PRICING): CostAnalysis {
    const pricing = OPENAI_PRICING[model];
    if (!pricing) {
      throw new Error(`Unknown model: ${model}`);
    }

    const inputTokens = usage.prompt_tokens;
    const outputTokens = usage.completion_tokens;
    const cachedTokens = usage.cached_tokens || 0;

    // Calculate costs (pricing is per 1M tokens)
    const inputCost = (inputTokens / 1_000_000) * pricing.input;
    const outputCost = (outputTokens / 1_000_000) * pricing.output;
    const cachedCost = (cachedTokens / 1_000_000) * pricing.cached;
    const totalCost = inputCost + outputCost + cachedCost;

    return {
      inputCost,
      outputCost,
      cachedCost,
      totalCost,
      model,
      costBreakdown: {
        inputTokens,
        outputTokens,
        cachedTokens,
        inputCostPerToken: pricing.input / 1_000_000,
        outputCostPerToken: pricing.output / 1_000_000,
        cachedCostPerToken: pricing.cached / 1_000_000,
      }
    };
  }

  /**
   * Estimate tokens in text (rough approximation)
   * More accurate: use tiktoken library, but this provides good estimates
   */
  static estimateTokens(text: string): number {
    // Rough approximation: 1 token ≈ 4 characters for English text
    // This is conservative and tends to overestimate
    return Math.ceil(text.length / 4);
  }

  /**
   * Log comprehensive cost analysis
   */
  static logCostAnalysis(
    service: string,
    usage: TokenUsage, 
    model: keyof typeof OPENAI_PRICING,
    additionalContext?: any
  ): CostAnalysis {
    const analysis = this.calculateCost(usage, model);
    
    console.log(`💰 [${service}] TOKEN COST ANALYSIS`);
    console.log(`💰 [${service}] Model: ${model}`);
    console.log(`💰 [${service}] Input tokens: ${analysis.costBreakdown.inputTokens.toLocaleString()}`);
    console.log(`💰 [${service}] Output tokens: ${analysis.costBreakdown.outputTokens.toLocaleString()}`);
    if (analysis.costBreakdown.cachedTokens > 0) {
      console.log(`💰 [${service}] Cached tokens: ${analysis.costBreakdown.cachedTokens.toLocaleString()}`);
    }
    console.log(`💰 [${service}] Total tokens: ${usage.total_tokens.toLocaleString()}`);
    console.log(`💰 [${service}] Input cost: $${analysis.inputCost.toFixed(6)}`);
    console.log(`💰 [${service}] Output cost: $${analysis.outputCost.toFixed(6)}`);
    if (analysis.cachedCost > 0) {
      console.log(`💰 [${service}] Cached cost: $${analysis.cachedCost.toFixed(6)}`);
    }
    console.log(`💰 [${service}] TOTAL COST: $${analysis.totalCost.toFixed(6)}`);
    
    if (additionalContext) {
      console.log(`💰 [${service}] Context:`, additionalContext);
    }

    // Warning for high-cost operations
    if (analysis.totalCost > 0.01) { // More than 1 cent
      console.warn(`⚠️  [${service}] HIGH COST OPERATION: $${analysis.totalCost.toFixed(6)}`);
    }

    // Record usage in dashboard for tracking
    try {
      const { TokenUsageDashboard } = require('./token-usage-dashboard.js');
      TokenUsageDashboard.recordUsage(service, usage.prompt_tokens, usage.completion_tokens, analysis.totalCost);
    } catch (error) {
      // Dashboard integration is optional - don't fail if it's not available
    }

    return analysis;
  }

  /**
   * Format cost for display
   */
  static formatCost(cost: number): string {
    if (cost < 0.001) {
      return `$${(cost * 1000).toFixed(3)}‰`; // Show in per-mille for very small costs
    }
    return `$${cost.toFixed(6)}`;
  }

  /**
   * Calculate daily/monthly cost projections
   */
  static calculateProjections(costPerOperation: number, operationsPerDay: number) {
    const dailyCost = costPerOperation * operationsPerDay;
    const monthlyCost = dailyCost * 30;
    const yearlyCost = dailyCost * 365;

    return {
      daily: dailyCost,
      monthly: monthlyCost,
      yearly: yearlyCost,
      formatted: {
        daily: this.formatCost(dailyCost),
        monthly: this.formatCost(monthlyCost),
        yearly: this.formatCost(yearlyCost)
      }
    };
  }
}