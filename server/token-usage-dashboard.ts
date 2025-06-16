/**
 * Token Usage Dashboard Service
 * Provides comprehensive analytics and cost monitoring for all AI-powered medical processing
 */

import { TokenCostAnalyzer } from "./token-cost-analyzer.js";

interface TokenUsageMetrics {
  service: string;
  totalCalls: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCost: number;
  averageCostPerCall: number;
}

interface DashboardData {
  systemOverview: {
    totalCosts: number;
    totalTokens: number;
    totalCalls: number;
    averageCostPerEncounter: number;
  };
  serviceBreakdown: TokenUsageMetrics[];
  costProjections: {
    daily: string;
    monthly: string;
    yearly: string;
  };
  recommendations: string[];
}

export class TokenUsageDashboard {
  private static metrics: Map<string, TokenUsageMetrics> = new Map();

  /**
   * Record token usage for a service
   */
  static recordUsage(service: string, inputTokens: number, outputTokens: number, cost: number): void {
    const existing = this.metrics.get(service) || {
      service,
      totalCalls: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalCost: 0,
      averageCostPerCall: 0
    };

    existing.totalCalls += 1;
    existing.totalInputTokens += inputTokens;
    existing.totalOutputTokens += outputTokens;
    existing.totalCost += cost;
    existing.averageCostPerCall = existing.totalCost / existing.totalCalls;

    this.metrics.set(service, existing);
  }

  /**
   * Generate comprehensive dashboard data
   */
  static generateDashboard(): DashboardData {
    const services = Array.from(this.metrics.values());
    
    const totalCosts = services.reduce((sum, s) => sum + s.totalCost, 0);
    const totalTokens = services.reduce((sum, s) => sum + s.totalInputTokens + s.totalOutputTokens, 0);
    const totalCalls = services.reduce((sum, s) => sum + s.totalCalls, 0);
    const averageCostPerEncounter = totalCalls > 0 ? totalCosts / totalCalls : 0;

    // Calculate projections based on current usage
    const projections = TokenCostAnalyzer.calculateProjections(averageCostPerEncounter, 50);

    // Generate cost optimization recommendations
    const recommendations = this.generateRecommendations(services, totalCosts);

    return {
      systemOverview: {
        totalCosts,
        totalTokens,
        totalCalls,
        averageCostPerEncounter
      },
      serviceBreakdown: services.sort((a, b) => b.totalCost - a.totalCost),
      costProjections: projections.formatted,
      recommendations
    };
  }

  /**
   * Generate cost optimization recommendations
   */
  private static generateRecommendations(services: TokenUsageMetrics[], totalCosts: number): string[] {
    const recommendations: string[] = [];

    // Identify highest cost services
    const sortedByCost = services.sort((a, b) => b.totalCost - a.totalCost);
    if (sortedByCost.length > 0) {
      const highestCost = sortedByCost[0];
      recommendations.push(`${highestCost.service} accounts for ${((highestCost.totalCost / totalCosts) * 100).toFixed(1)}% of total costs - consider optimization`);
    }

    // Model optimization recommendations
    if (totalCosts > 50) {
      recommendations.push("Consider switching to GPT-4o-mini for less complex tasks to reduce costs by ~90%");
    }

    // Token efficiency recommendations
    const avgTokensPerCall = services.reduce((sum, s) => sum + s.totalInputTokens + s.totalOutputTokens, 0) / services.reduce((sum, s) => sum + s.totalCalls, 0);
    if (avgTokensPerCall > 2000) {
      recommendations.push("Average token usage is high - consider prompt optimization and context reduction");
    }

    // Deduplication recommendations
    const medicationService = services.find(s => s.service.includes('Medication'));
    const ordersService = services.find(s => s.service.includes('Orders'));
    if (medicationService && ordersService) {
      recommendations.push("Implement cross-system deduplication between Medications and Orders processing");
    }

    return recommendations;
  }

  /**
   * Log dashboard summary to console
   */
  static logDashboardSummary(): void {
    const dashboard = this.generateDashboard();
    
    console.log('\n🏥 ===== AI TOKEN USAGE DASHBOARD =====');
    console.log(`💰 Total System Cost: ${TokenCostAnalyzer.formatCost(dashboard.systemOverview.totalCosts)}`);
    console.log(`🎯 Total Tokens Used: ${dashboard.systemOverview.totalTokens.toLocaleString()}`);
    console.log(`📊 Total API Calls: ${dashboard.systemOverview.totalCalls}`);
    console.log(`📈 Average Cost/Encounter: ${TokenCostAnalyzer.formatCost(dashboard.systemOverview.averageCostPerEncounter)}`);
    
    console.log('\n📋 SERVICE BREAKDOWN:');
    dashboard.serviceBreakdown.forEach(service => {
      console.log(`  ${service.service}: ${TokenCostAnalyzer.formatCost(service.totalCost)} (${service.totalCalls} calls)`);
    });
    
    console.log('\n💡 COST PROJECTIONS:');
    console.log(`  Daily (50 encounters): ${dashboard.costProjections.daily}`);
    console.log(`  Monthly: ${dashboard.costProjections.monthly}`);
    console.log(`  Yearly: ${dashboard.costProjections.yearly}`);
    
    if (dashboard.recommendations.length > 0) {
      console.log('\n⚡ OPTIMIZATION RECOMMENDATIONS:');
      dashboard.recommendations.forEach((rec, i) => {
        console.log(`  ${i + 1}. ${rec}`);
      });
    }
    
    console.log('🏥 ===================================\n');
  }

  /**
   * Reset all metrics (useful for testing)
   */
  static resetMetrics(): void {
    this.metrics.clear();
  }

  /**
   * Export metrics for external analysis
   */
  static exportMetrics(): TokenUsageMetrics[] {
    return Array.from(this.metrics.values());
  }
}