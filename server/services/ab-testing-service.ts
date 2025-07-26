import { storage } from '../storage';
import * as crypto from 'crypto';

interface ABTest {
  id: number;
  name: string;
  variants: ABVariant[];
  status: 'draft' | 'active' | 'paused' | 'completed';
  startDate: Date;
  endDate?: Date;
  trafficAllocation: number;
}

interface ABVariant {
  id: string;
  name: string;
  trafficPercentage: number;
  conversions: number;
  visitors: number;
}

interface TestAssignment {
  testId: number;
  variantId: string;
  userId: number;
  assignedAt: Date;
}

export class ABTestingService {
  private testAssignments: Map<string, TestAssignment> = new Map();
  private activeTests: Map<number, ABTest> = new Map();
  
  constructor() {
    this.loadActiveTests();
  }
  
  // Load active tests from storage
  private async loadActiveTests() {
    try {
      const tests = await storage.getABTests(undefined, 'active');
      tests.forEach(test => {
        this.activeTests.set(test.id, test as any);
      });
      console.log(`📊 Loaded ${tests.length} active A/B tests`);
    } catch (error) {
      console.error('Error loading A/B tests:', error);
    }
  }
  
  // Create a new A/B test
  async createTest(healthSystemId: number, testData: {
    name: string;
    description?: string;
    hypothesis?: string;
    primaryMetric: string;
    variants: Array<{ name: string; trafficPercentage: number }>;
    trafficAllocation?: number;
  }): Promise<ABTest> {
    // Validate traffic percentages
    const totalTraffic = testData.variants.reduce((sum, v) => sum + v.trafficPercentage, 0);
    if (Math.abs(totalTraffic - 100) > 0.01) {
      throw new Error('Variant traffic percentages must sum to 100%');
    }
    
    // Create test in storage
    const test = await storage.createABTest({
      healthSystemId,
      name: testData.name,
      description: testData.description,
      hypothesis: testData.hypothesis,
      primaryMetric: testData.primaryMetric,
      variants: testData.variants.map((v, index) => ({
        id: `variant-${index}`,
        name: v.name,
        trafficPercentage: v.trafficPercentage,
        configuration: {}
      })),
      trafficAllocation: testData.trafficAllocation || 100,
      status: 'active',
      startDate: new Date()
    });
    
    // Cache the active test
    const abTest: ABTest = {
      id: test.id,
      name: test.name,
      variants: test.variants.map((v: any) => ({
        ...v,
        conversions: 0,
        visitors: 0
      })),
      status: test.status as any,
      startDate: test.startDate,
      endDate: test.endDate || undefined,
      trafficAllocation: test.trafficAllocation
    };
    
    this.activeTests.set(test.id, abTest);
    
    return abTest;
  }
  
  // Get variant assignment for a user
  async getVariantAssignment(testId: number, userId: number): Promise<string | null> {
    const assignmentKey = `${testId}-${userId}`;
    
    // Check if user already has assignment
    const existing = this.testAssignments.get(assignmentKey);
    if (existing) {
      return existing.variantId;
    }
    
    // Get test details
    const test = this.activeTests.get(testId);
    if (!test || test.status !== 'active') {
      return null;
    }
    
    // Check if user should be in test based on traffic allocation
    const userHash = this.hashUserId(userId, testId);
    const inTest = userHash <= test.trafficAllocation;
    
    if (!inTest) {
      return null;
    }
    
    // Assign variant based on traffic percentages
    const variantHash = this.hashUserId(userId, testId + 1000) % 100;
    let cumulativePercentage = 0;
    let assignedVariant: string | null = null;
    
    for (const variant of test.variants) {
      cumulativePercentage += variant.trafficPercentage;
      if (variantHash < cumulativePercentage) {
        assignedVariant = variant.id;
        break;
      }
    }
    
    if (assignedVariant) {
      // Store assignment
      const assignment: TestAssignment = {
        testId,
        variantId: assignedVariant,
        userId,
        assignedAt: new Date()
      };
      
      this.testAssignments.set(assignmentKey, assignment);
      
      // Update visitor count
      const variant = test.variants.find(v => v.id === assignedVariant);
      if (variant) {
        variant.visitors++;
      }
      
      // Log assignment in analytics
      await storage.createAnalyticsEvent({
        healthSystemId: 1, // Would need to get from user context
        userId,
        eventType: 'ab_test_assignment',
        eventData: {
          testId,
          testName: test.name,
          variantId: assignedVariant,
          variantName: variant?.name
        }
      });
    }
    
    return assignedVariant;
  }
  
  // Track conversion for a test
  async trackConversion(testId: number, userId: number, conversionValue?: number): Promise<void> {
    const assignmentKey = `${testId}-${userId}`;
    const assignment = this.testAssignments.get(assignmentKey);
    
    if (!assignment) {
      return; // User not in test
    }
    
    const test = this.activeTests.get(testId);
    if (!test) {
      return;
    }
    
    // Update conversion count
    const variant = test.variants.find(v => v.id === assignment.variantId);
    if (variant) {
      variant.conversions++;
    }
    
    // Log conversion event
    await storage.createAnalyticsEvent({
      healthSystemId: 1, // Would need to get from user context
      userId,
      eventType: 'ab_test_conversion',
      eventData: {
        testId,
        testName: test.name,
        variantId: assignment.variantId,
        variantName: variant?.name,
        conversionValue
      }
    });
    
    // Update test results in storage
    await this.updateTestResults(testId);
  }
  
  // Calculate test statistics
  async calculateTestStatistics(testId: number): Promise<{
    variants: Array<{
      id: string;
      name: string;
      visitors: number;
      conversions: number;
      conversionRate: number;
      confidence?: number;
      isWinner?: boolean;
    }>;
    significanceLevel: number;
    sampleSize: number;
    duration: number;
  }> {
    const test = this.activeTests.get(testId);
    if (!test) {
      throw new Error('Test not found');
    }
    
    // Calculate conversion rates
    const variantStats = test.variants.map(variant => ({
      id: variant.id,
      name: variant.name,
      visitors: variant.visitors,
      conversions: variant.conversions,
      conversionRate: variant.visitors > 0 ? (variant.conversions / variant.visitors) * 100 : 0
    }));
    
    // Find control (first variant)
    const control = variantStats[0];
    
    // Calculate statistical significance for each variant vs control
    variantStats.forEach((variant, index) => {
      if (index === 0) return; // Skip control
      
      const confidence = this.calculateConfidence(
        control.conversions,
        control.visitors,
        variant.conversions,
        variant.visitors
      );
      
      variant.confidence = confidence;
      variant.isWinner = confidence >= 95 && variant.conversionRate > control.conversionRate;
    });
    
    // Calculate test duration
    const duration = Math.floor((Date.now() - test.startDate.getTime()) / (1000 * 60 * 60 * 24)); // Days
    
    return {
      variants: variantStats,
      significanceLevel: 95, // 95% confidence level
      sampleSize: variantStats.reduce((sum, v) => sum + v.visitors, 0),
      duration
    };
  }
  
  // Calculate statistical confidence using Z-test
  private calculateConfidence(
    controlConversions: number,
    controlVisitors: number,
    variantConversions: number,
    variantVisitors: number
  ): number {
    if (controlVisitors === 0 || variantVisitors === 0) {
      return 0;
    }
    
    const controlRate = controlConversions / controlVisitors;
    const variantRate = variantConversions / variantVisitors;
    
    const pooledRate = (controlConversions + variantConversions) / (controlVisitors + variantVisitors);
    const standardError = Math.sqrt(
      pooledRate * (1 - pooledRate) * (1 / controlVisitors + 1 / variantVisitors)
    );
    
    if (standardError === 0) {
      return 0;
    }
    
    const zScore = Math.abs(variantRate - controlRate) / standardError;
    
    // Convert z-score to confidence percentage
    // Using normal distribution approximation
    const confidence = this.zScoreToConfidence(zScore);
    
    return Math.round(confidence * 100);
  }
  
  // Convert z-score to confidence level
  private zScoreToConfidence(z: number): number {
    // Simplified normal CDF approximation
    if (z >= 2.58) return 0.99;
    if (z >= 1.96) return 0.95;
    if (z >= 1.64) return 0.90;
    if (z >= 1.28) return 0.80;
    if (z >= 0.84) return 0.70;
    return 0.50;
  }
  
  // Hash user ID for consistent assignment
  private hashUserId(userId: number, salt: number): number {
    const hash = crypto.createHash('md5');
    hash.update(`${userId}-${salt}`);
    const hex = hash.digest('hex');
    return parseInt(hex.substring(0, 8), 16) % 100;
  }
  
  // Update test results in storage
  private async updateTestResults(testId: number) {
    const test = this.activeTests.get(testId);
    if (!test) return;
    
    const stats = await this.calculateTestStatistics(testId);
    
    await storage.updateABTest(testId, {
      results: {
        variants: stats.variants,
        lastUpdated: new Date()
      }
    });
  }
  
  // End a test and declare winner
  async endTest(testId: number): Promise<void> {
    const test = this.activeTests.get(testId);
    if (!test) {
      throw new Error('Test not found');
    }
    
    // Calculate final statistics
    const stats = await this.calculateTestStatistics(testId);
    
    // Find winner
    const winner = stats.variants.find(v => v.isWinner) || 
                  stats.variants.reduce((best, current) => 
                    current.conversionRate > best.conversionRate ? current : best
                  );
    
    // Update test status
    await storage.updateABTest(testId, {
      status: 'completed',
      endDate: new Date(),
      results: {
        variants: stats.variants,
        winner: winner.id,
        finalStats: stats
      }
    });
    
    // Remove from active tests
    this.activeTests.delete(testId);
    
    console.log(`🏁 A/B test ${test.name} completed. Winner: ${winner.name}`);
  }
  
  // Get all tests for a health system
  async getTests(healthSystemId: number, status?: string): Promise<any[]> {
    return storage.getABTests(healthSystemId, status);
  }
}

// Export singleton instance
export const abTesting = new ABTestingService();