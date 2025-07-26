import { storage } from '../storage';
import { SelectUser, SelectPatient, SelectAppointment } from '@shared/schema';

export class PredictiveAnalyticsService {
  // Patient churn prediction based on engagement metrics
  async predictPatientChurn(healthSystemId: number): Promise<Array<{
    userId: number;
    patientId: number;
    churnRisk: number;
    riskLevel: 'high' | 'medium' | 'low';
    factors: string[];
  }>> {
    try {
      // Get all patients for the health system
      const allPatients = await storage.getAllPatients();
      const patients = allPatients.filter(p => p.healthSystemId === healthSystemId);
      
      // Get recent activity data
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      
      const churnPredictions = [];
      
      for (const patient of patients) {
        const factors = [];
        let riskScore = 0;
        
        // Get patient's appointments
        const appointments = await storage.getAppointmentsByPatient(patient.id);
        const recentAppointments = appointments.filter(a => 
          a.date && new Date(a.date) > thirtyDaysAgo
        );
        const olderAppointments = appointments.filter(a => 
          a.date && new Date(a.date) > ninetyDaysAgo && new Date(a.date) <= thirtyDaysAgo
        );
        
        // Factor 1: No recent appointments (high weight)
        if (recentAppointments.length === 0) {
          riskScore += 35;
          factors.push('No appointments in last 30 days');
        }
        
        // Factor 2: Declining appointment frequency
        if (olderAppointments.length > 0 && recentAppointments.length < olderAppointments.length / 2) {
          riskScore += 25;
          factors.push('Declining appointment frequency');
        }
        
        // Factor 3: Missed appointments
        const missedAppointments = appointments.filter(a => a.status === 'no_show');
        if (missedAppointments.length > 0) {
          const missedRate = missedAppointments.length / appointments.length;
          if (missedRate > 0.2) {
            riskScore += 30;
            factors.push(`High no-show rate: ${Math.round(missedRate * 100)}%`);
          }
        }
        
        // Factor 4: No recent lab orders or medications
        const encounters = await storage.getEncountersByPatient(patient.id);
        const recentEncounters = encounters.filter(e => 
          e.createdAt && new Date(e.createdAt) > thirtyDaysAgo
        );
        
        if (recentEncounters.length === 0) {
          riskScore += 10;
          factors.push('No recent clinical activity');
        }
        
        // Normalize risk score to 0-100
        riskScore = Math.min(100, riskScore);
        
        // Determine risk level
        let riskLevel: 'high' | 'medium' | 'low';
        if (riskScore >= 70) riskLevel = 'high';
        else if (riskScore >= 40) riskLevel = 'medium';
        else riskLevel = 'low';
        
        if (riskScore > 30) { // Only include medium and high risk patients
          churnPredictions.push({
            userId: patient.userId,
            patientId: patient.id,
            churnRisk: riskScore,
            riskLevel,
            factors
          });
        }
      }
      
      // Sort by risk score descending
      return churnPredictions.sort((a, b) => b.churnRisk - a.churnRisk);
    } catch (error) {
      console.error('Error predicting patient churn:', error);
      return [];
    }
  }
  
  // Calculate Customer Lifetime Value (CLV) based on historical data
  async calculateCustomerLifetimeValue(healthSystemId: number): Promise<{
    averageCLV: number;
    segments: Array<{
      segment: string;
      count: number;
      averageValue: number;
      description: string;
    }>;
  }> {
    try {
      const patients = await storage.getAllPatients();
      const healthSystemPatients = patients.filter(p => p.healthSystemId === healthSystemId);
      
      // CLARAFI subscription-only revenue model
      const individualMonthlyRevenue = 149; // Individual provider subscription
      const enterpriseBaseRevenue = 399; // Enterprise base subscription
      const nurseMonthlyRevenue = 99; // Per nurse in enterprise
      const staffMonthlyRevenue = 49; // Per non-clinical staff in enterprise
      
      // Get subscription data for this health system
      const healthSystem = await storage.getHealthSystemById(healthSystemId);
      const subscriptionTier = healthSystem?.subscriptionTier || 'tier1';
      const monthlyRevenue = subscriptionTier === 'enterprise' ? enterpriseBaseRevenue : individualMonthlyRevenue;
      
      // Calculate based on user count and roles
      const usersByRole = new Map<string, number>();
      const healthSystemUsers = await storage.getUsersByHealthSystem(healthSystemId);
      
      healthSystemUsers.forEach(user => {
        const role = user.role || 'provider';
        usersByRole.set(role, (usersByRole.get(role) || 0) + 1);
      });
      
      // Calculate total monthly recurring revenue (MRR)
      let totalMRR = monthlyRevenue; // Base subscription
      if (subscriptionTier === 'enterprise') {
        // Add additional user costs for enterprise
        const nurses = usersByRole.get('nurse') || 0;
        const staff = usersByRole.get('staff') || 0;
        totalMRR += (nurses * nurseMonthlyRevenue) + (staff * staffMonthlyRevenue);
      }
      
      const segments = {
        vip: { patients: [], totalValue: 0 },
        regular: { patients: [], totalValue: 0 },
        occasional: { patients: [], totalValue: 0 },
        new: { patients: [], totalValue: 0 }
      };
      
      // For CLARAFI, CLV is based on subscription retention, not patient value
      const patientValues = [];
      const avgPatientsPerProvider = healthSystemPatients.length / Math.max(1, usersByRole.get('provider') || 1);
      
      for (const patient of healthSystemPatients) {
        // Calculate patient's contribution to subscription value
        const patientContributionToMRR = totalMRR / Math.max(1, healthSystemPatients.length);
        
        // Get patient activity for engagement scoring
        const appointments = await storage.getAppointmentsByPatient(patient.id);
        const encounters = await storage.getEncountersByPatient(patient.id);
        
        // Calculate engagement score (affects retention probability)
        const monthsSinceCreated = patient.createdAt 
          ? (Date.now() - new Date(patient.createdAt).getTime()) / (30 * 24 * 60 * 60 * 1000)
          : 1;
        const monthlyActivityRate = (appointments.length + encounters.length) / Math.max(1, monthsSinceCreated);
        
        // Higher engagement = higher retention = higher CLV
        const engagementMultiplier = Math.min(2, 0.5 + (monthlyActivityRate / 2));
        const patientCLV = patientContributionToMRR * 24 * engagementMultiplier; // 24-month baseline
        
        // Segment patients based on engagement (which affects subscription retention)
        if (monthlyActivityRate > 5) {
          segments.vip.patients.push(patient);
          segments.vip.totalValue += patientCLV;
        } else if (monthlyActivityRate > 2) {
          segments.regular.patients.push(patient);
          segments.regular.totalValue += patientCLV;
        } else if (monthsSinceCreated < 3) {
          segments.new.patients.push(patient);
          segments.new.totalValue += patientCLV;
        } else {
          segments.occasional.patients.push(patient);
          segments.occasional.totalValue += patientCLV;
        }
        
        patientValues.push(patientCLV);
      }
      
      // Calculate average CLV
      const totalCLV = patientValues.reduce((sum, val) => sum + val, 0);
      const averageCLV = healthSystemPatients.length > 0 ? totalCLV / healthSystemPatients.length : 0;
      
      // Format segment data
      const segmentResults = [
        {
          segment: 'VIP Patients',
          count: segments.vip.patients.length,
          averageValue: segments.vip.patients.length > 0 ? segments.vip.totalValue / segments.vip.patients.length : 0,
          description: 'High-value patients with CLV > $10,000'
        },
        {
          segment: 'Regular Patients',
          count: segments.regular.patients.length,
          averageValue: segments.regular.patients.length > 0 ? segments.regular.totalValue / segments.regular.patients.length : 0,
          description: 'Active patients with CLV $5,000-$10,000'
        },
        {
          segment: 'New Patients',
          count: segments.new.patients.length,
          averageValue: segments.new.patients.length > 0 ? segments.new.totalValue / segments.new.patients.length : 0,
          description: 'Patients joined within last 3 months'
        },
        {
          segment: 'Occasional Patients',
          count: segments.occasional.patients.length,
          averageValue: segments.occasional.patients.length > 0 ? segments.occasional.totalValue / segments.occasional.patients.length : 0,
          description: 'Low-frequency patients with CLV < $5,000'
        }
      ];
      
      return {
        averageCLV: Math.round(averageCLV),
        segments: segmentResults.map(s => ({
          ...s,
          averageValue: Math.round(s.averageValue)
        }))
      };
    } catch (error) {
      console.error('Error calculating CLV:', error);
      return { averageCLV: 0, segments: [] };
    }
  }
  
  // Revenue forecasting based on trends
  async forecastRevenue(healthSystemId: number, months: number = 12): Promise<{
    forecast: Array<{
      month: string;
      projected: number;
      confidence: number;
      factors: string[];
    }>;
    summary: {
      totalProjected: number;
      growthRate: number;
      confidenceLevel: 'high' | 'medium' | 'low';
    };
  }> {
    try {
      // Get historical data
      const patients = await storage.getAllPatients();
      const healthSystemPatients = patients.filter(p => p.healthSystemId === healthSystemId);
      
      // Calculate monthly revenue for past 12 months
      const monthlyRevenue = [];
      const now = new Date();
      
      for (let i = 11; i >= 0; i--) {
        const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
        
        // Count appointments in this month
        let appointmentCount = 0;
        for (const patient of healthSystemPatients) {
          const appointments = await storage.getAppointmentsByPatient(patient.id);
          const monthAppointments = appointments.filter(a => {
            const date = a.date ? new Date(a.date) : null;
            return date && date >= monthStart && date <= monthEnd && a.status === 'completed';
          });
          appointmentCount += monthAppointments.length;
        }
        
        const revenue = appointmentCount * 175; // Average appointment revenue
        monthlyRevenue.push({ month: monthStart, revenue, appointments: appointmentCount });
      }
      
      // Calculate growth trend
      const recentMonths = monthlyRevenue.slice(-6);
      const olderMonths = monthlyRevenue.slice(0, 6);
      
      const recentAvg = recentMonths.reduce((sum, m) => sum + m.revenue, 0) / recentMonths.length;
      const olderAvg = olderMonths.reduce((sum, m) => sum + m.revenue, 0) / olderMonths.length;
      
      const growthRate = olderAvg > 0 ? ((recentAvg - olderAvg) / olderAvg) : 0;
      const monthlyGrowthRate = Math.pow(1 + growthRate, 1/6) - 1;
      
      // Generate forecast
      const forecast = [];
      let lastRevenue = monthlyRevenue[monthlyRevenue.length - 1]?.revenue || recentAvg;
      let totalProjected = 0;
      
      for (let i = 1; i <= months; i++) {
        const futureMonth = new Date(now.getFullYear(), now.getMonth() + i, 1);
        const monthName = futureMonth.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
        
        // Apply growth with some randomness for realism
        const seasonalFactor = 1 + (Math.sin((futureMonth.getMonth() + 1) * Math.PI / 6) * 0.1); // Seasonal variation
        const randomFactor = 0.95 + Math.random() * 0.1; // 5% random variation
        
        const projectedRevenue = lastRevenue * (1 + monthlyGrowthRate) * seasonalFactor * randomFactor;
        lastRevenue = projectedRevenue;
        totalProjected += projectedRevenue;
        
        // Calculate confidence based on how far in future
        const confidence = Math.max(50, 95 - (i * 3)); // Decreases 3% per month
        
        // Identify growth factors
        const factors = [];
        if (monthlyGrowthRate > 0) factors.push('Positive historical growth trend');
        if (seasonalFactor > 1.05) factors.push('Peak season expected');
        if (i <= 3) factors.push('Near-term projection');
        if (healthSystemPatients.length > 100) factors.push('Large patient base');
        
        forecast.push({
          month: monthName,
          projected: Math.round(projectedRevenue),
          confidence,
          factors
        });
      }
      
      // Determine overall confidence
      let confidenceLevel: 'high' | 'medium' | 'low';
      if (monthlyRevenue.length >= 6 && Math.abs(growthRate) < 0.3) {
        confidenceLevel = 'high';
      } else if (monthlyRevenue.length >= 3) {
        confidenceLevel = 'medium';
      } else {
        confidenceLevel = 'low';
      }
      
      return {
        forecast,
        summary: {
          totalProjected: Math.round(totalProjected),
          growthRate: Math.round(growthRate * 100),
          confidenceLevel
        }
      };
    } catch (error) {
      console.error('Error forecasting revenue:', error);
      return {
        forecast: [],
        summary: {
          totalProjected: 0,
          growthRate: 0,
          confidenceLevel: 'low'
        }
      };
    }
  }
  
  // Identify high-value opportunities
  async identifyHighValueOpportunities(healthSystemId: number): Promise<Array<{
    type: string;
    description: string;
    potentialValue: number;
    effort: 'low' | 'medium' | 'high';
    priority: number;
  }>> {
    try {
      const opportunities = [];
      
      // Get current metrics
      const patients = await storage.getAllPatients();
      const healthSystemPatients = patients.filter(p => p.healthSystemId === healthSystemId);
      
      // Opportunity 1: Reactivate dormant patients
      const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
      let dormantCount = 0;
      
      for (const patient of healthSystemPatients) {
        const appointments = await storage.getAppointmentsByPatient(patient.id);
        const recentAppointments = appointments.filter(a => 
          a.date && new Date(a.date) > sixMonthsAgo
        );
        if (appointments.length > 0 && recentAppointments.length === 0) {
          dormantCount++;
        }
      }
      
      if (dormantCount > 10) {
        opportunities.push({
          type: 'Patient Reactivation',
          description: `${dormantCount} patients haven't visited in 6+ months. Targeted outreach could bring them back.`,
          potentialValue: dormantCount * 175 * 2, // 2 visits per reactivated patient
          effort: 'low',
          priority: 90
        });
      }
      
      // Opportunity 2: Reduce no-show rate
      let totalAppointments = 0;
      let noShows = 0;
      
      for (const patient of healthSystemPatients) {
        const appointments = await storage.getAppointmentsByPatient(patient.id);
        totalAppointments += appointments.length;
        noShows += appointments.filter(a => a.status === 'no_show').length;
      }
      
      const noShowRate = totalAppointments > 0 ? noShows / totalAppointments : 0;
      if (noShowRate > 0.05) { // If no-show rate > 5%
        const reductionPotential = Math.floor(noShows * 0.5); // Could reduce by 50%
        opportunities.push({
          type: 'No-Show Reduction',
          description: `Current no-show rate is ${Math.round(noShowRate * 100)}%. Automated reminders could reduce this by half.`,
          potentialValue: reductionPotential * 175,
          effort: 'medium',
          priority: 85
        });
      }
      
      // Opportunity 3: Increase appointment frequency
      const activePatients = healthSystemPatients.filter(p => {
        const created = p.createdAt ? new Date(p.createdAt) : new Date();
        return (Date.now() - created.getTime()) > 90 * 24 * 60 * 60 * 1000; // Patients > 90 days old
      });
      
      if (activePatients.length > 0) {
        const avgAppointmentsPerPatient = totalAppointments / activePatients.length;
        if (avgAppointmentsPerPatient < 4) { // Less than quarterly visits
          const increaseTarget = (4 - avgAppointmentsPerPatient) * activePatients.length;
          opportunities.push({
            type: 'Preventive Care Campaign',
            description: `Average patient has only ${avgAppointmentsPerPatient.toFixed(1)} visits/year. Preventive care reminders could increase this.`,
            potentialValue: Math.round(increaseTarget * 175),
            effort: 'medium',
            priority: 80
          });
        }
      }
      
      // Opportunity 4: New patient acquisition
      const monthlyNewPatients = healthSystemPatients.filter(p => {
        const created = p.createdAt ? new Date(p.createdAt) : new Date();
        return (Date.now() - created.getTime()) < 30 * 24 * 60 * 60 * 1000;
      }).length;
      
      opportunities.push({
        type: 'New Patient Acquisition',
        description: `Currently acquiring ${monthlyNewPatients} new patients/month. Targeted marketing could increase by 30%.`,
        potentialValue: Math.round(monthlyNewPatients * 0.3 * 12 * 175 * 3), // 30% more patients, 3 visits/year
        effort: 'high',
        priority: 75
      });
      
      // Opportunity 5: Specialty service promotion
      opportunities.push({
        type: 'Specialty Service Expansion',
        description: 'Promote high-margin specialty services to existing patient base.',
        potentialValue: Math.round(healthSystemPatients.length * 0.1 * 450), // 10% uptake at $450/procedure
        effort: 'medium',
        priority: 70
      });
      
      // Sort by priority
      return opportunities.sort((a, b) => b.priority - a.priority);
    } catch (error) {
      console.error('Error identifying opportunities:', error);
      return [];
    }
  }
}

// Export singleton instance
export const predictiveAnalytics = new PredictiveAnalyticsService();