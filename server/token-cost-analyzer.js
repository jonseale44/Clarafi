/**
 * Token Cost Analysis for OpenAI API calls
 * Tracks and analyzes token usage and costs across the application
 */

export class TokenCostAnalyzer {
  constructor() {
    this.totalTokens = 0;
    this.totalCost = 0;
    this.callCount = 0;
    this.modelPricing = {
      'gpt-4': { input: 0.03, output: 0.06 }, // per 1K tokens
      'gpt-4-turbo': { input: 0.01, output: 0.03 },
      'gpt-3.5-turbo': { input: 0.001, output: 0.002 },
      'gpt-4o': { input: 0.005, output: 0.015 },
      'gpt-4o-mini': { input: 0.000150, output: 0.000600 }
    };
  }

  /**
   * Analyze token usage from an OpenAI API response
   * @param {Object} response - OpenAI API response
   * @param {string} model - Model used for the request
   * @returns {Object} Analysis results
   */
  analyzeUsage(response, model = 'gpt-4') {
    if (!response?.usage) {
      return { tokens: 0, cost: 0, error: 'No usage data available' };
    }

    const { prompt_tokens, completion_tokens, total_tokens } = response.usage;
    const pricing = this.modelPricing[model] || this.modelPricing['gpt-4'];
    
    const inputCost = (prompt_tokens / 1000) * pricing.input;
    const outputCost = (completion_tokens / 1000) * pricing.output;
    const totalCost = inputCost + outputCost;

    // Update running totals
    this.totalTokens += total_tokens;
    this.totalCost += totalCost;
    this.callCount++;

    return {
      tokens: {
        prompt: prompt_tokens,
        completion: completion_tokens,
        total: total_tokens
      },
      cost: {
        input: inputCost,
        output: outputCost,
        total: totalCost
      },
      model,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get summary of all token usage
   * @returns {Object} Usage summary
   */
  getSummary() {
    return {
      totalTokens: this.totalTokens,
      totalCost: this.totalCost,
      averageCostPerCall: this.callCount > 0 ? this.totalCost / this.callCount : 0,
      callCount: this.callCount
    };
  }

  /**
   * Reset tracking counters
   */
  reset() {
    this.totalTokens = 0;
    this.totalCost = 0;
    this.callCount = 0;
  }

  /**
   * Log usage analysis to console
   * @param {Object} analysis - Analysis from analyzeUsage()
   * @param {string} operation - Description of the operation
   */
  logUsage(analysis, operation = 'API Call') {
    if (analysis.error) {
      console.warn(`[TokenCostAnalyzer] ${operation}: ${analysis.error}`);
      return;
    }

    console.log(`[TokenCostAnalyzer] ${operation}:`, {
      tokens: analysis.tokens.total,
      cost: `$${analysis.cost.total.toFixed(4)}`,
      model: analysis.model
    });
  }

  /**
   * Log cost analysis for debugging purposes
   * @param {Object} analysis - Analysis from analyzeUsage()
   * @param {string} operation - Description of the operation
   */
  static logCostAnalysis(analysis, operation = 'API Call') {
    if (analysis && analysis.cost) {
      console.log(`[TokenCostAnalyzer] ${operation} Cost: $${analysis.cost.total.toFixed(4)}, Tokens: ${analysis.tokens?.total || 0}`);
    }
  }

  /**
   * Calculate cost projections based on current usage
   * @returns {Object} Projection calculations
   */
  static calculateProjections() {
    // This is a static method for backward compatibility
    return {
      dailyProjection: 0,
      monthlyProjection: 0,
      note: 'Use instance methods for accurate projections'
    };
  }
}

// Create a singleton instance for shared usage
export const tokenAnalyzer = new TokenCostAnalyzer();