/**
 * TypeScript declarations for token-cost-analyzer.js
 */

export interface TokenUsage {
  prompt: number;
  completion: number;
  total: number;
}

export interface TokenCost {
  input: number;
  output: number;
  total: number;
}

export interface TokenAnalysis {
  tokens: TokenUsage;
  cost: TokenCost;
  model: string;
  timestamp: string;
  error?: string;
}

export interface UsageSummary {
  totalTokens: number;
  totalCost: number;
  averageCostPerCall: number;
  callCount: number;
}

export interface ModelPricing {
  input: number;
  output: number;
}

export declare class TokenCostAnalyzer {
  totalTokens: number;
  totalCost: number;
  callCount: number;
  modelPricing: Record<string, ModelPricing>;

  constructor();
  
  analyzeUsage(response: any, model?: string): TokenAnalysis;
  getSummary(): UsageSummary;
  reset(): void;
  logUsage(analysis: TokenAnalysis, operation?: string): void;
  
  static logCostAnalysis(analysis: TokenAnalysis, operation?: string): void;
  static calculateProjections(): { dailyProjection: number; monthlyProjection: number; note: string };
}

export declare const tokenAnalyzer: TokenCostAnalyzer;