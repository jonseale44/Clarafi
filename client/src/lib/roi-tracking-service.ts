/**
 * Real-time ROI Tracking Service
 * Tracks revenue attribution, physician productivity, and practice ROI
 */

import { apiRequest } from './queryClient';
import { analytics } from './analytics';

export interface PhysicianROI {
  physicianId: number;
  periodStart: Date;
  periodEnd: Date;
  metrics: {
    // Time savings
    timeSavedHours: number;
    timeSavedValue: number; // $ value of time saved
    
    // Productivity gains
    patientsSeenIncrease: number;
    additionalRevenue: number;
    
    // Cost reductions
    documentationCostSaved: number;
    scribeCostSaved: number;
    
    // Clinical outcomes
    documentationQualityScore: number;
    patientSatisfactionScore: number;
    
    // Total ROI
    totalCostSavings: number;
    totalRevenueGains: number;
    netROI: number;
    roiPercentage: number;
  };
}

export interface PracticeROI {
  healthSystemId: number;
  physicians: PhysicianROI[];
  aggregateMetrics: {
    totalPhysicians: number;
    totalTimeSaved: number;
    totalRevenuIncrease: number;
    totalCostSavings: number;
    averageROIPerPhysician: number;
    paybackPeriodDays: number;
  };
}

export class ROITrackingService {
  private static instance: ROITrackingService;
  private readonly PHYSICIAN_HOURLY_RATE = 200; // Average physician hourly rate
  private readonly SCRIBE_HOURLY_COST = 25; // Human scribe cost
  private readonly AVG_DOCUMENTATION_TIME = 2; // Hours per day
  
  static getInstance(): ROITrackingService {
    if (!this.instance) {
      this.instance = new ROITrackingService();
    }
    return this.instance;
  }

  /**
   * Calculate real-time ROI for a physician
   */
  async calculatePhysicianROI(physicianId: number, period: 'week' | 'month' | 'quarter' = 'month'): Promise<PhysicianROI> {
    try {
      // Fetch physician activity data
      const activityData = await apiRequest('GET', `/api/analytics/physician-activity/${physicianId}?period=${period}`);
      
      // Calculate time savings
      const timeSavedHours = this.calculateTimeSaved(activityData);
      const timeSavedValue = timeSavedHours * this.PHYSICIAN_HOURLY_RATE;
      
      // Calculate productivity gains
      const productivityGains = this.calculateProductivityGains(activityData);
      
      // Calculate cost reductions
      const costSavings = this.calculateCostSavings(activityData);
      
      // Calculate total ROI
      const totalRevenuGains = productivityGains.additionalRevenue + timeSavedValue;
      const totalCostSavings = costSavings.documentationCost + costSavings.scribeCost;
      const netROI = totalRevenuGains + totalCostSavings - (149 * (period === 'month' ? 1 : period === 'quarter' ? 3 : 0.25)); // Subtract CLARAFI cost
      const roiPercentage = (netROI / (149 * (period === 'month' ? 1 : period === 'quarter' ? 3 : 0.25))) * 100;
      
      const roi: PhysicianROI = {
        physicianId,
        periodStart: new Date(activityData.periodStart),
        periodEnd: new Date(activityData.periodEnd),
        metrics: {
          timeSavedHours,
          timeSavedValue,
          patientsSeenIncrease: productivityGains.additionalPatients,
          additionalRevenue: productivityGains.additionalRevenue,
          documentationCostSaved: costSavings.documentationCost,
          scribeCostSaved: costSavings.scribeCost,
          documentationQualityScore: activityData.qualityScore || 0,
          patientSatisfactionScore: activityData.satisfactionScore || 0,
          totalCostSavings,
          totalRevenueGains,
          netROI,
          roiPercentage
        }
      };
      
      // Track ROI calculation event
      analytics.trackEvent('roi_calculated', {
        physicianId,
        period,
        roiPercentage: Math.round(roiPercentage),
        netROI: Math.round(netROI)
      });
      
      return roi;
    } catch (error) {
      console.error('Error calculating physician ROI:', error);
      throw error;
    }
  }

  /**
   * Calculate practice-wide ROI
   */
  async calculatePracticeROI(healthSystemId: number, period: 'month' | 'quarter' | 'year' = 'quarter'): Promise<PracticeROI> {
    try {
      const practiceData = await apiRequest('GET', `/api/analytics/practice-roi/${healthSystemId}?period=${period}`);
      
      // Calculate ROI for each physician
      const physicianROIs = await Promise.all(
        practiceData.physicians.map((physician: any) => 
          this.calculatePhysicianROI(physician.id, period === 'year' ? 'quarter' : period)
        )
      );
      
      // Calculate aggregate metrics
      const aggregateMetrics = {
        totalPhysicians: physicianROIs.length,
        totalTimeSaved: physicianROIs.reduce((sum, roi) => sum + roi.metrics.timeSavedHours, 0),
        totalRevenuIncrease: physicianROIs.reduce((sum, roi) => sum + roi.metrics.totalRevenueGains, 0),
        totalCostSavings: physicianROIs.reduce((sum, roi) => sum + roi.metrics.totalCostSavings, 0),
        averageROIPerPhysician: physicianROIs.reduce((sum, roi) => sum + roi.metrics.netROI, 0) / physicianROIs.length,
        paybackPeriodDays: this.calculatePaybackPeriod(physicianROIs)
      };
      
      return {
        healthSystemId,
        physicians: physicianROIs,
        aggregateMetrics
      };
    } catch (error) {
      console.error('Error calculating practice ROI:', error);
      throw error;
    }
  }

  /**
   * Track revenue attribution by source
   */
  async trackRevenueAttribution(data: {
    source: 'time_savings' | 'increased_patients' | 'reduced_costs' | 'quality_improvement';
    amount: number;
    physicianId: number;
    description: string;
  }): Promise<void> {
    try {
      await apiRequest('POST', '/api/analytics/revenue-attribution', data);
      
      analytics.trackEvent('revenue_attributed', {
        source: data.source,
        amount: data.amount,
        physicianId: data.physicianId
      });
    } catch (error) {
      console.error('Error tracking revenue attribution:', error);
    }
  }

  /**
   * Generate ROI report
   */
  async generateROIReport(healthSystemId: number, format: 'pdf' | 'excel' = 'pdf'): Promise<Blob> {
    try {
      const response = await fetch(`/api/analytics/roi-report/${healthSystemId}?format=${format}`, {
        method: 'GET',
        credentials: 'include'
      });
      
      if (!response.ok) throw new Error('Failed to generate ROI report');
      
      return await response.blob();
    } catch (error) {
      console.error('Error generating ROI report:', error);
      throw error;
    }
  }

  // Private helper methods
  private calculateTimeSaved(activityData: any): number {
    const avgNotesPerDay = activityData.totalNotes / activityData.workDays;
    const timePerNoteWithoutAI = 15; // minutes
    const timePerNoteWithAI = 1.5; // 90 seconds
    const minutesSaved = avgNotesPerDay * (timePerNoteWithoutAI - timePerNoteWithAI);
    return (minutesSaved * activityData.workDays) / 60; // Convert to hours
  }

  private calculateProductivityGains(activityData: any): { additionalPatients: number; additionalRevenue: number } {
    const timeSavedPerDay = (activityData.totalNotes * 13.5) / 60 / activityData.workDays; // 13.5 minutes saved per note
    const additionalPatientsPerDay = Math.floor(timeSavedPerDay / 0.25); // 15 min per patient
    const additionalPatients = additionalPatientsPerDay * activityData.workDays;
    const avgRevenuePerPatient = 150; // Average reimbursement
    
    return {
      additionalPatients,
      additionalRevenue: additionalPatients * avgRevenuePerPatient
    };
  }

  private calculateCostSavings(activityData: any): { documentationCost: number; scribeCost: number } {
    const documentationHoursSaved = (activityData.totalNotes * 13.5) / 60; // 13.5 minutes saved per note
    const documentationCost = documentationHoursSaved * (this.PHYSICIAN_HOURLY_RATE * 0.5); // Opportunity cost
    const scribeCost = activityData.workDays * 8 * this.SCRIBE_HOURLY_COST; // Full-time scribe cost
    
    return {
      documentationCost,
      scribeCost
    };
  }

  private calculatePaybackPeriod(physicianROIs: PhysicianROI[]): number {
    const avgDailyROI = physicianROIs.reduce((sum, roi) => sum + roi.metrics.netROI, 0) / 
                        physicianROIs.length / 30; // Assuming monthly period
    const monthlySubscriptionCost = 149;
    return Math.ceil(monthlySubscriptionCost / avgDailyROI);
  }

  /**
   * Set up automated ROI tracking
   */
  setupAutomatedTracking(healthSystemId: number): void {
    // Track ROI weekly
    setInterval(async () => {
      try {
        const practiceROI = await this.calculatePracticeROI(healthSystemId, 'month');
        console.log('Weekly ROI update:', practiceROI.aggregateMetrics);
      } catch (error) {
        console.error('Automated ROI tracking error:', error);
      }
    }, 7 * 24 * 60 * 60 * 1000); // Weekly
  }
}

export const roiTracker = ROITrackingService.getInstance();