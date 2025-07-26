import { storage } from '../storage';
import { sendEmail } from '../email-service';
import { SelectPatient, SelectUser, InsertMarketingAutomation } from '@shared/schema';

interface AutomationTrigger {
  type: 'patient_inactive' | 'appointment_reminder' | 'follow_up' | 'birthday' | 'lab_results' | 'no_show_followup';
  conditions: Record<string, any>;
}

interface AutomationAction {
  type: 'send_email' | 'send_sms' | 'create_task' | 'tag_patient';
  config: Record<string, any>;
}

export class MarketingAutomationService {
  private automationInterval: NodeJS.Timeout | null = null;
  
  // Start the automation engine
  startAutomationEngine() {
    if (this.automationInterval) return;
    
    // Run automations every 5 minutes
    this.automationInterval = setInterval(() => {
      this.processAutomations();
    }, 5 * 60 * 1000);
    
    // Run immediately on start
    this.processAutomations();
    
    console.log('🤖 Marketing automation engine started');
  }
  
  // Stop the automation engine
  stopAutomationEngine() {
    if (this.automationInterval) {
      clearInterval(this.automationInterval);
      this.automationInterval = null;
      console.log('🤖 Marketing automation engine stopped');
    }
  }
  
  // Process all active automations
  private async processAutomations() {
    try {
      const healthSystems = await storage.getAllHealthSystems();
      
      for (const healthSystem of healthSystems) {
        // Get active automations for this health system
        const automations = await storage.getMarketingAutomations(healthSystem.id, true);
        
        for (const automation of automations) {
          await this.processAutomation(automation, healthSystem.id);
        }
      }
    } catch (error) {
      console.error('Error processing automations:', error);
    }
  }
  
  // Process a single automation
  private async processAutomation(automation: any, healthSystemId: number) {
    try {
      const trigger = automation.triggerType as AutomationTrigger['type'];
      const conditions = automation.triggerConditions || {};
      
      switch (trigger) {
        case 'patient_inactive':
          await this.processInactivePatients(automation, healthSystemId, conditions);
          break;
        case 'appointment_reminder':
          await this.processAppointmentReminders(automation, healthSystemId, conditions);
          break;
        case 'follow_up':
          await this.processFollowUps(automation, healthSystemId, conditions);
          break;
        case 'birthday':
          await this.processBirthdayGreetings(automation, healthSystemId);
          break;
        case 'lab_results':
          await this.processLabResultNotifications(automation, healthSystemId);
          break;
        case 'no_show_followup':
          await this.processNoShowFollowUps(automation, healthSystemId);
          break;
      }
      
      // Update last triggered timestamp
      await storage.updateMarketingAutomation(automation.id, {
        lastTriggered: new Date()
      });
    } catch (error) {
      console.error(`Error processing automation ${automation.id}:`, error);
    }
  }
  
  // Process inactive patient reactivation
  private async processInactivePatients(automation: any, healthSystemId: number, conditions: any) {
    const daysInactive = conditions.daysInactive || 180; // Default 6 months
    const cutoffDate = new Date(Date.now() - daysInactive * 24 * 60 * 60 * 1000);
    
    const patients = await storage.getAllPatients();
    const healthSystemPatients = patients.filter(p => p.healthSystemId === healthSystemId);
    
    for (const patient of healthSystemPatients) {
      // Check last appointment
      const appointments = await storage.getAppointmentsByPatient(patient.id);
      const lastAppointment = appointments
        .filter(a => a.date && a.status === 'completed')
        .sort((a, b) => new Date(b.date!).getTime() - new Date(a.date!).getTime())[0];
      
      if (!lastAppointment || new Date(lastAppointment.date!) < cutoffDate) {
        // Patient is inactive, trigger action
        await this.executeAutomationActions(automation, patient, {
          daysSinceLastVisit: Math.floor((Date.now() - new Date(lastAppointment?.date || patient.createdAt || Date.now()).getTime()) / (24 * 60 * 60 * 1000)),
          patientName: `${patient.firstName} ${patient.lastName}`,
          lastVisitDate: lastAppointment?.date || 'Never'
        });
      }
    }
  }
  
  // Process appointment reminders
  private async processAppointmentReminders(automation: any, healthSystemId: number, conditions: any) {
    const reminderDays = conditions.daysBefore || 1;
    const reminderDate = new Date(Date.now() + reminderDays * 24 * 60 * 60 * 1000);
    const startOfDay = new Date(reminderDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(reminderDate.setHours(23, 59, 59, 999));
    
    // Get all appointments for the reminder date
    const appointments = await storage.getAllAppointments();
    const upcomingAppointments = appointments.filter(a => {
      if (!a.date || a.status === 'cancelled') return false;
      const apptDate = new Date(a.date);
      return apptDate >= startOfDay && apptDate <= endOfDay;
    });
    
    for (const appointment of upcomingAppointments) {
      const patient = await storage.getPatient(appointment.patientId);
      if (patient && patient.healthSystemId === healthSystemId) {
        await this.executeAutomationActions(automation, patient, {
          appointmentDate: appointment.date,
          appointmentTime: new Date(appointment.date!).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
          appointmentType: appointment.appointmentType || 'Follow-up',
          providerName: appointment.providerName || 'your provider',
          patientName: `${patient.firstName} ${patient.lastName}`
        });
      }
    }
  }
  
  // Process follow-up communications
  private async processFollowUps(automation: any, healthSystemId: number, conditions: any) {
    const daysAfterVisit = conditions.daysAfterVisit || 3;
    const followUpDate = new Date(Date.now() - daysAfterVisit * 24 * 60 * 60 * 1000);
    const startOfDay = new Date(followUpDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(followUpDate.setHours(23, 59, 59, 999));
    
    // Get completed appointments from the follow-up date
    const appointments = await storage.getAllAppointments();
    const completedAppointments = appointments.filter(a => {
      if (!a.date || a.status !== 'completed') return false;
      const apptDate = new Date(a.date);
      return apptDate >= startOfDay && apptDate <= endOfDay;
    });
    
    for (const appointment of completedAppointments) {
      const patient = await storage.getPatient(appointment.patientId);
      if (patient && patient.healthSystemId === healthSystemId) {
        await this.executeAutomationActions(automation, patient, {
          visitDate: appointment.date,
          patientName: `${patient.firstName} ${patient.lastName}`,
          providerName: appointment.providerName || 'your provider'
        });
      }
    }
  }
  
  // Process birthday greetings
  private async processBirthdayGreetings(automation: any, healthSystemId: number) {
    const today = new Date();
    const todayMonth = today.getMonth() + 1;
    const todayDay = today.getDate();
    
    const patients = await storage.getAllPatients();
    const healthSystemPatients = patients.filter(p => p.healthSystemId === healthSystemId);
    
    for (const patient of healthSystemPatients) {
      if (!patient.dateOfBirth) continue;
      
      const dob = new Date(patient.dateOfBirth);
      if (dob.getMonth() + 1 === todayMonth && dob.getDate() === todayDay) {
        const age = today.getFullYear() - dob.getFullYear();
        await this.executeAutomationActions(automation, patient, {
          patientName: `${patient.firstName} ${patient.lastName}`,
          age: age
        });
      }
    }
  }
  
  // Process lab result notifications
  private async processLabResultNotifications(automation: any, healthSystemId: number) {
    // Get lab results from the last 24 hours
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const labOrders = await storage.getAllLabOrders();
    const recentResults = labOrders.filter(order => {
      return order.status === 'completed' && 
             order.resultDate && 
             new Date(order.resultDate) > yesterday;
    });
    
    for (const labOrder of recentResults) {
      const encounter = await storage.getEncounter(labOrder.encounterId);
      if (!encounter) continue;
      
      const patient = await storage.getPatient(encounter.patientId);
      if (patient && patient.healthSystemId === healthSystemId) {
        await this.executeAutomationActions(automation, patient, {
          patientName: `${patient.firstName} ${patient.lastName}`,
          labType: labOrder.orderName,
          resultDate: labOrder.resultDate
        });
      }
    }
  }
  
  // Process no-show follow-ups
  private async processNoShowFollowUps(automation: any, healthSystemId: number) {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const startOfYesterday = new Date(yesterday.setHours(0, 0, 0, 0));
    const endOfYesterday = new Date(yesterday.setHours(23, 59, 59, 999));
    
    const appointments = await storage.getAllAppointments();
    const noShowAppointments = appointments.filter(a => {
      if (!a.date || a.status !== 'no_show') return false;
      const apptDate = new Date(a.date);
      return apptDate >= startOfYesterday && apptDate <= endOfYesterday;
    });
    
    for (const appointment of noShowAppointments) {
      const patient = await storage.getPatient(appointment.patientId);
      if (patient && patient.healthSystemId === healthSystemId) {
        await this.executeAutomationActions(automation, patient, {
          patientName: `${patient.firstName} ${patient.lastName}`,
          missedDate: appointment.date,
          appointmentType: appointment.appointmentType || 'appointment'
        });
      }
    }
  }
  
  // Execute automation actions
  private async executeAutomationActions(automation: any, patient: SelectPatient, variables: Record<string, any>) {
    const actions = automation.actions || [];
    
    for (const action of actions) {
      switch (action.type) {
        case 'send_email':
          await this.sendAutomatedEmail(patient, action.config, variables);
          break;
        case 'send_sms':
          await this.sendAutomatedSMS(patient, action.config, variables);
          break;
        case 'create_task':
          await this.createAutomatedTask(patient, action.config, variables);
          break;
        case 'tag_patient':
          await this.tagPatient(patient, action.config);
          break;
      }
    }
    
    // Update execution count
    await storage.updateMarketingAutomation(automation.id, {
      lastExecuted: new Date(),
      executionCount: (automation.executionCount || 0) + 1
    });
    
    // Log the automation execution
    await storage.createAnalyticsEvent({
      healthSystemId: patient.healthSystemId,
      userId: patient.userId,
      eventType: 'automation_executed',
      eventData: {
        automationId: automation.id,
        automationName: automation.name,
        patientId: patient.id,
        triggerType: automation.triggerType
      }
    });
  }
  
  // Send automated email
  private async sendAutomatedEmail(patient: SelectPatient, config: any, variables: Record<string, any>) {
    if (!patient.email) return;
    
    const { subject, template } = config;
    
    // Replace variables in template
    let processedSubject = subject;
    let processedTemplate = template;
    
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      processedSubject = processedSubject.replace(new RegExp(placeholder, 'g'), value);
      processedTemplate = processedTemplate.replace(new RegExp(placeholder, 'g'), value);
    }
    
    try {
      await sendEmail({
        to: patient.email,
        subject: processedSubject,
        html: processedTemplate
      });
      
      console.log(`📧 Automated email sent to ${patient.email}`);
    } catch (error) {
      console.error(`Failed to send automated email to ${patient.email}:`, error);
    }
  }
  
  // Send automated SMS (placeholder - would integrate with Twilio)
  private async sendAutomatedSMS(patient: SelectPatient, config: any, variables: Record<string, any>) {
    if (!patient.phone) return;
    
    const { message } = config;
    
    // Replace variables in message
    let processedMessage = message;
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      processedMessage = processedMessage.replace(new RegExp(placeholder, 'g'), value);
    }
    
    // TODO: Integrate with Twilio
    console.log(`📱 SMS would be sent to ${patient.phone}: ${processedMessage}`);
  }
  
  // Create automated task
  private async createAutomatedTask(patient: SelectPatient, config: any, variables: Record<string, any>) {
    const { taskTitle, taskDescription, assignTo } = config;
    
    // Replace variables
    let processedTitle = taskTitle;
    let processedDescription = taskDescription;
    
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      processedTitle = processedTitle.replace(new RegExp(placeholder, 'g'), value);
      processedDescription = processedDescription.replace(new RegExp(placeholder, 'g'), value);
    }
    
    // Create task in system (would need task management integration)
    console.log(`📋 Task created: ${processedTitle} for patient ${patient.firstName} ${patient.lastName}`);
  }
  
  // Tag patient for segmentation
  private async tagPatient(patient: SelectPatient, config: any) {
    const { tags } = config;
    
    // Update patient tags (would need to add tags field to patient schema)
    console.log(`🏷️ Patient ${patient.firstName} ${patient.lastName} tagged with: ${tags.join(', ')}`);
  }
  
  // Create predefined automation templates
  static getAutomationTemplates(): Array<Partial<InsertMarketingAutomation>> {
    return [
      {
        name: 'Patient Reactivation Campaign',
        triggerType: 'patient_inactive',
        triggerConditions: { daysInactive: 180 },
        actions: [{
          type: 'send_email',
          config: {
            subject: 'We miss you, {{patientName}}!',
            template: `
              <p>Dear {{patientName}},</p>
              <p>It's been {{daysSinceLastVisit}} days since your last visit. We wanted to check in and remind you that regular check-ups are important for your health.</p>
              <p>Schedule your next appointment today and receive 10% off your visit.</p>
              <p>Best regards,<br>Your Healthcare Team</p>
            `
          }
        }],
        enabled: true
      },
      {
        name: 'Appointment Reminder',
        triggerType: 'appointment_reminder',
        triggerConditions: { daysBefore: 1 },
        actions: [{
          type: 'send_email',
          config: {
            subject: 'Reminder: Appointment Tomorrow at {{appointmentTime}}',
            template: `
              <p>Hi {{patientName}},</p>
              <p>This is a friendly reminder about your {{appointmentType}} appointment tomorrow at {{appointmentTime}} with {{providerName}}.</p>
              <p>Please arrive 10 minutes early to complete any necessary paperwork.</p>
              <p>If you need to reschedule, please call us at (555) 123-4567.</p>
              <p>See you tomorrow!</p>
            `
          }
        }],
        enabled: true
      },
      {
        name: 'Post-Visit Follow-Up',
        triggerType: 'follow_up',
        triggerConditions: { daysAfterVisit: 3 },
        actions: [{
          type: 'send_email',
          config: {
            subject: 'How are you feeling, {{patientName}}?',
            template: `
              <p>Dear {{patientName}},</p>
              <p>We hope you're feeling better after your recent visit on {{visitDate}}.</p>
              <p>If you have any questions about your treatment or if you're experiencing any concerns, please don't hesitate to contact us.</p>
              <p>Your health is our priority!</p>
              <p>Best wishes,<br>{{providerName}} and Team</p>
            `
          }
        }],
        enabled: true
      },
      {
        name: 'Birthday Greetings',
        triggerType: 'birthday',
        triggerConditions: {},
        actions: [{
          type: 'send_email',
          config: {
            subject: 'Happy Birthday, {{patientName}}! 🎉',
            template: `
              <p>Dear {{patientName}},</p>
              <p>Wishing you a very happy {{age}}th birthday!</p>
              <p>As a birthday gift, we're offering you a complimentary wellness check-up. Schedule your appointment this month to redeem.</p>
              <p>May your special day be filled with joy and good health!</p>
              <p>Warm regards,<br>Your Healthcare Team</p>
            `
          }
        }],
        enabled: true
      },
      {
        name: 'Lab Results Ready',
        triggerType: 'lab_results',
        triggerConditions: {},
        actions: [{
          type: 'send_email',
          config: {
            subject: 'Your Lab Results Are Ready',
            template: `
              <p>Hi {{patientName}},</p>
              <p>Your {{labType}} results from {{resultDate}} are now available.</p>
              <p>You can view your results by logging into your patient portal or calling our office.</p>
              <p>If you have any questions about your results, please don't hesitate to contact us.</p>
              <p>Best regards,<br>Your Healthcare Team</p>
            `
          }
        }],
        enabled: true
      },
      {
        name: 'No-Show Follow-Up',
        triggerType: 'no_show_followup',
        triggerConditions: {},
        actions: [{
          type: 'send_email',
          config: {
            subject: 'We Missed You Yesterday',
            template: `
              <p>Hi {{patientName}},</p>
              <p>We noticed you weren't able to make your {{appointmentType}} appointment on {{missedDate}}.</p>
              <p>We understand that life gets busy! Please call us at (555) 123-4567 to reschedule at your earliest convenience.</p>
              <p>Your health is important to us, and we want to make sure you get the care you need.</p>
              <p>Looking forward to seeing you soon,<br>Your Healthcare Team</p>
            `
          }
        }],
        enabled: true
      }
    ];
  }
}

// Export singleton instance
export const marketingAutomation = new MarketingAutomationService();