import { Router } from 'express';
import { tenantIsolation } from './tenant-isolation';
import { storage } from './storage';
import { z } from 'zod';

const router = Router();

// Get providers for scheduling
router.get('/api/scheduling/providers', tenantIsolation, async (req, res) => {
  try {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const locationId = req.query.locationId ? parseInt(req.query.locationId as string) : undefined;
    
    // Get all providers for the health system
    const providers = await storage.getProvidersByHealthSystem(req.userHealthSystemId!, locationId);
    
    res.json(providers);
  } catch (error) {
    console.error('Error fetching providers:', error);
    res.status(500).json({ error: 'Failed to fetch providers' });
  }
});

// Get appointments
router.get('/api/scheduling/appointments', tenantIsolation, async (req, res) => {
  try {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const { startDate, endDate, providerId, locationId, patientId } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start date and end date are required' });
    }
    
    const appointments = await storage.getAppointments({
      healthSystemId: req.userHealthSystemId!,
      startDate: new Date(startDate as string),
      endDate: new Date(endDate as string),
      providerId: providerId ? parseInt(providerId as string) : undefined,
      locationId: locationId ? parseInt(locationId as string) : undefined,
      patientId: patientId ? parseInt(patientId as string) : undefined
    });
    
    res.json(appointments);
  } catch (error) {
    console.error('Error fetching appointments:', error);
    res.status(500).json({ error: 'Failed to fetch appointments' });
  }
});

// Get real-time schedule status
router.get('/api/scheduling/realtime-status', tenantIsolation, async (req, res) => {
  try {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const { providerId, date } = req.query;
    
    if (!providerId || !date) {
      return res.status(400).json({ error: 'Provider ID and date are required' });
    }
    
    const status = await storage.getRealtimeScheduleStatus(
      parseInt(providerId as string),
      new Date(date as string)
    );
    
    res.json(status);
  } catch (error) {
    console.error('Error fetching schedule status:', error);
    res.status(500).json({ error: 'Failed to fetch schedule status' });
  }
});

// Create appointment
const createAppointmentSchema = z.object({
  patientId: z.number(),
  providerId: z.number(),
  locationId: z.number(),
  appointmentDate: z.string(),
  appointmentTime: z.string(),
  appointmentType: z.string(),
  duration: z.number(),
  notes: z.string().optional(),
  useAiScheduling: z.boolean().default(true)
});

router.post('/api/scheduling/appointments', tenantIsolation, async (req, res) => {
  try {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    // Check if user has scheduling privileges
    const canSchedule = ['admin', 'nurse', 'ma', 'front_desk'].includes(req.user!.role);
    const isProvider = req.user!.role === 'provider';
    
    if (!canSchedule && !isProvider) {
      return res.status(403).json({ error: 'You do not have permission to schedule appointments' });
    }
    
    const validatedData = createAppointmentSchema.parse(req.body);
    
    // If provider is scheduling for themselves, verify it's their ID
    if (isProvider && validatedData.providerId !== req.user!.id) {
      return res.status(403).json({ error: 'Providers can only schedule appointments for themselves' });
    }
    
    // Parse the date as local time, not UTC
    const [year, month, day] = validatedData.appointmentDate.split('-').map(Number);
    const appointmentDateLocal = new Date(year, month - 1, day); // month is 0-indexed
    
    // Get AI-predicted duration if enabled
    let aiPredictedDuration: number | undefined;
    let patientVisibleDuration: number | undefined;
    let providerScheduledDuration: number | undefined;
    
    if (validatedData.useAiScheduling) {
      const prediction = await storage.predictAppointmentDuration({
        patientId: validatedData.patientId,
        providerId: validatedData.providerId,
        appointmentType: validatedData.appointmentType,
        appointmentDate: appointmentDateLocal,
        appointmentTime: validatedData.appointmentTime
      });
      
      aiPredictedDuration = prediction.aiPredictedDuration;
      patientVisibleDuration = prediction.patientVisibleDuration;
      providerScheduledDuration = prediction.providerScheduledDuration;
    } else {
      // Use standard durations
      patientVisibleDuration = Math.max(validatedData.duration, 20); // Minimum 20 minutes for patients
      providerScheduledDuration = validatedData.duration;
    }
    
    // Check for conflicts before creating appointment
    const conflicts = await storage.checkAppointmentConflicts({
      providerId: validatedData.providerId,
      appointmentDate: validatedData.appointmentDate,
      startTime: validatedData.appointmentTime,
      duration: providerScheduledDuration || validatedData.duration
    });
    
    if (conflicts.length > 0) {
      // Build a user-friendly error message
      const conflictDetails = conflicts.map(c => 
        `${c.startTime} - ${c.endTime} (${c.patientName}, ${c.appointmentType})`
      ).join(', ');
      
      return res.status(409).json({ 
        error: 'Appointment time conflicts with existing appointments',
        conflicts: conflicts,
        message: `This time slot conflicts with: ${conflictDetails}`
      });
    }
    

    
    const appointment = await storage.createAppointment({
      ...validatedData,
      appointmentDate: validatedData.appointmentDate, // Keep the original YYYY-MM-DD string
      status: 'scheduled',
      aiPredictedDuration,
      patientVisibleDuration,
      providerScheduledDuration,
      createdBy: req.user!.id
    });
    
    res.json(appointment);
  } catch (error) {
    console.error('Error creating appointment:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid appointment data', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to create appointment' });
  }
});

// Preview AI duration prediction
router.post('/api/scheduling/appointments/preview-duration', tenantIsolation, async (req, res) => {
  try {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const { patientId, providerId, appointmentType, appointmentDate, appointmentTime } = req.body;
    
    // Parse the date as local time
    const [year, month, day] = appointmentDate.split('-').map(Number);
    const appointmentDateLocal = new Date(year, month - 1, day);
    
    const prediction = await storage.predictAppointmentDuration({
      patientId,
      providerId,
      appointmentType,
      appointmentDate: appointmentDateLocal,
      appointmentTime
    });
    
    res.json(prediction);
  } catch (error) {
    console.error('Error getting AI prediction:', error);
    res.status(500).json({ error: 'Failed to get AI prediction' });
  }
});

// Check for conflicts without creating appointment
router.post('/api/scheduling/appointments/check-conflicts', tenantIsolation, async (req, res) => {
  try {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const { providerId, appointmentDate, appointmentTime, duration, excludeAppointmentId } = req.body;
    
    if (!providerId || !appointmentDate || !appointmentTime || !duration) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const conflicts = await storage.checkAppointmentConflicts({
      providerId,
      appointmentDate,
      startTime: appointmentTime,
      duration: parseInt(duration),
      excludeAppointmentId
    });
    
    return res.json({ 
      hasConflicts: conflicts.length > 0,
      conflicts: conflicts.map(c => ({
        id: c.id,
        startTime: c.startTime,
        endTime: c.endTime,
        patientName: c.patientName,
        appointmentType: c.appointmentType,
        status: c.status
      }))
    });
  } catch (error) {
    console.error('Error checking conflicts:', error);
    res.status(500).json({ error: 'Failed to check conflicts' });
  }
});

// Update appointment
router.put('/api/scheduling/appointments/:id',  tenantIsolation, async (req, res) => {
  try {
    const appointmentId = parseInt(req.params.id);
    
    // Check permissions - providers can update appointments too
    const canSchedule = ['admin', 'provider', 'nurse', 'ma', 'front_desk'].includes(req.user!.role);
    if (!canSchedule) {
      return res.status(403).json({ error: 'You do not have permission to update appointments' });
    }
    
    // If updating date, time, or duration, check for conflicts
    if (req.body.appointmentDate || req.body.appointmentTime || req.body.duration) {
      // Get existing appointment details
      const existing = await storage.getAppointmentById(appointmentId, req.userHealthSystemId!);
      if (!existing) {
        return res.status(404).json({ error: 'Appointment not found' });
      }
      
      const conflicts = await storage.checkAppointmentConflicts({
        providerId: req.body.providerId || existing.providerId,
        appointmentDate: req.body.appointmentDate || existing.appointmentDate,
        startTime: req.body.appointmentTime || existing.startTime,
        duration: req.body.duration || existing.duration,
        excludeAppointmentId: appointmentId
      });
      
      if (conflicts.length > 0) {
        const conflictDetails = conflicts.map(c => 
          `${c.startTime} - ${c.endTime} (${c.patientName}, ${c.appointmentType})`
        ).join(', ');
        
        return res.status(409).json({ 
          error: 'Appointment time conflicts with existing appointments',
          conflicts: conflicts,
          message: `This time slot conflicts with: ${conflictDetails}`
        });
      }
    }
    
    const updated = await storage.updateAppointment(appointmentId, req.body, req.userHealthSystemId!);
    
    if (!updated) {
      return res.status(404).json({ error: 'Appointment not found' });
    }
    
    res.json(updated);
  } catch (error) {
    console.error('Error updating appointment:', error);
    res.status(500).json({ error: 'Failed to update appointment' });
  }
});

// Delete appointment
router.delete('/api/scheduling/appointments/:id', tenantIsolation, async (req, res) => {
  try {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const appointmentId = parseInt(req.params.id);
    
    // Check permissions - providers can delete appointments too
    const canSchedule = ['admin', 'provider', 'nurse', 'ma', 'front_desk'].includes(req.user!.role);
    if (!canSchedule) {
      return res.status(403).json({ error: 'You do not have permission to delete appointments' });
    }
    
    await storage.deleteAppointment(appointmentId, req.userHealthSystemId!);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting appointment:', error);
    res.status(500).json({ error: 'Failed to delete appointment' });
  }
});

// Check in appointment and create encounter
router.post('/api/scheduling/appointments/:id/check-in', tenantIsolation, async (req, res) => {
  try {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const appointmentId = parseInt(req.params.id);
    const { roomAssignment } = req.body;
    
    // Check permissions
    const canCheckIn = ['admin', 'nurse', 'ma', 'front_desk'].includes(req.user!.role);
    if (!canCheckIn) {
      return res.status(403).json({ error: 'You do not have permission to check in appointments' });
    }
    
    // Get appointment details
    const appointment = await storage.getAppointmentById(appointmentId, req.userHealthSystemId!);
    
    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }
    
    if (appointment.status === 'checked_in') {
      return res.status(400).json({ error: 'Appointment already checked in' });
    }
    
    if (appointment.status === 'cancelled' || appointment.status === 'no_show') {
      return res.status(400).json({ error: `Cannot check in ${appointment.status} appointment` });
    }
    
    console.log('🚪 [APPOINTMENT CHECK-IN] Found appointment:', {
      id: appointment.id,
      patientId: appointment.patientId,
      providerId: appointment.providerId,
      locationId: appointment.locationId,
      chiefComplaint: appointment.chiefComplaint,
      appointmentType: appointment.appointmentType
    });
    
    // Begin transaction for atomic operation
    const { db } = await import('./db.js');
    const { appointments, encounters } = await import('../shared/schema.js');
    const { eq } = await import('drizzle-orm');
    
    // Update appointment status to checked_in
    const checkedInAt = new Date();
    await db.update(appointments)
      .set({
        status: 'checked_in',
        checkedInAt: checkedInAt,
        checkedInBy: req.user!.id,
        roomAssignment: roomAssignment || null
      })
      .where(eq(appointments.id, appointmentId));
    
    console.log('🚪 [APPOINTMENT CHECK-IN] Updated appointment status to checked_in');
    
    // Create encounter from appointment
    const encounterData = {
      patientId: appointment.patientId,
      providerId: appointment.providerId,
      locationId: appointment.locationId,
      appointmentId: appointmentId,
      visitType: appointment.appointmentType || 'office_visit',
      chiefComplaint: appointment.chiefComplaint || appointment.visitReason || '',
      encounterStatus: 'in_progress' as const,
      checkedInAt: checkedInAt,
      checkedInBy: req.user!.id,
      startTime: checkedInAt,
      createdBy: req.user!.id
    };
    
    const [newEncounter] = await db.insert(encounters)
      .values(encounterData)
      .returning();
    
    res.json({
      success: true,
      encounterId: newEncounter.id,
      appointment: {
        ...appointment,
        status: 'checked_in',
        checkedInAt: checkedInAt,
        checkedInBy: req.user!.id,
        roomAssignment: roomAssignment || null
      }
    });
    
  } catch (error) {
    res.status(500).json({ error: 'Failed to check in appointment' });
  }
});

// Get schedule preferences
router.get('/api/scheduling/preferences/:providerId', tenantIsolation, async (req, res) => {
  try {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const providerId = parseInt(req.params.providerId);
    
    // Only providers can view their own preferences, or admin can view any
    if (req.user!.role !== 'admin' && req.user!.id !== providerId) {
      return res.status(403).json({ error: 'You can only view your own schedule preferences' });
    }
    
    const preferences = await storage.getSchedulePreferences(providerId);
    
    res.json(preferences || {});
  } catch (error) {
    console.error('Error fetching schedule preferences:', error);
    res.status(500).json({ error: 'Failed to fetch schedule preferences' });
  }
});

// Update schedule preferences
router.put('/api/scheduling/preferences/:providerId', tenantIsolation, async (req, res) => {
  try {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const providerId = parseInt(req.params.providerId);
    
    // Only providers can update their own preferences, or admin can update any
    if (req.user!.role !== 'admin' && req.user!.id !== providerId) {
      return res.status(403).json({ error: 'You can only update your own schedule preferences' });
    }
    
    const preferences = await storage.updateSchedulePreferences(providerId, req.body);
    
    res.json(preferences);
  } catch (error) {
    console.error('Error updating schedule preferences:', error);
    res.status(500).json({ error: 'Failed to update schedule preferences' });
  }
});

// Get appointment types
router.get('/api/scheduling/appointment-types',  tenantIsolation, async (req, res) => {
  try {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const locationId = req.query.locationId ? parseInt(req.query.locationId as string) : undefined;
    
    const types = await storage.getAppointmentTypes(req.userHealthSystemId!, locationId);
    
    res.json(types);
  } catch (error) {
    console.error('Error fetching appointment types:', error);
    res.status(500).json({ error: 'Failed to fetch appointment types' });
  }
});

// AI factor configuration endpoints (admin only)
router.get('/api/scheduling/ai-factors',  tenantIsolation, async (req, res) => {
  try {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'Only administrators can view AI factor configuration' });
    }
    
    const factors = await storage.getSchedulingAiFactors();
    
    res.json(factors);
  } catch (error) {
    console.error('Error fetching AI factors:', error);
    res.status(500).json({ error: 'Failed to fetch AI factors' });
  }
});

router.put('/api/scheduling/ai-factors/:id/weight',  tenantIsolation, async (req, res) => {
  try {
    if (req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'Only administrators can update AI factor weights' });
    }
    
    const factorId = parseInt(req.params.id);
    const { weight, providerId, locationId } = req.body;
    
    const updated = await storage.updateAiFactorWeight({
      factorId,
      weight,
      providerId,
      locationId,
      healthSystemId: req.userHealthSystemId!,
      updatedBy: req.user!.id
    });
    
    res.json(updated);
  } catch (error) {
    console.error('Error updating AI factor weight:', error);
    res.status(500).json({ error: 'Failed to update AI factor weight' });
  }
});

// Complete appointment and record actual duration
router.post('/api/scheduling/appointments/:id/complete', tenantIsolation, async (req, res) => {
  try {
    const appointmentId = parseInt(req.params.id);
    const userId = req.user!.id;
    
    // Use the appointment completion service
    const { AppointmentCompletionService } = await import('./appointment-completion-service.js');
    const result = await AppointmentCompletionService.completeAppointment(appointmentId, userId);
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to complete appointment' });
  }
});

// Get provider-specific AI weight preferences
router.get('/api/scheduling/provider-ai-weights/:providerId', tenantIsolation, async (req, res) => {
  try {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const providerId = parseInt(req.params.providerId);
    
    // Only providers can view their own weights, or admin can view any
    if (req.user!.role !== 'admin' && req.user!.id !== providerId) {
      return res.status(403).json({ error: 'You can only view your own AI weight preferences' });
    }
    
    const weights = await storage.getProviderAiWeights(providerId, req.userHealthSystemId!);
    
    res.json(weights || {});
  } catch (error) {
    console.error('Error fetching AI weights:', error);
    res.status(500).json({ error: 'Failed to fetch AI weight preferences' });
  }
});

// Update provider-specific AI weight preferences
router.put('/api/scheduling/ai-weights/:providerId', tenantIsolation, async (req, res) => {
  try {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const providerId = parseInt(req.params.providerId);
    
    // Only providers can update their own weights, or admin can update any
    if (req.user!.role !== 'admin' && req.user!.id !== providerId) {
      return res.status(403).json({ error: 'You can only update your own AI weight preferences' });
    }
    
    const weights = await storage.updateProviderAiWeights(providerId, req.userHealthSystemId!, req.body, req.user!.id);
    
    res.json(weights);
  } catch (error) {
    console.error('Error updating AI weights:', error);
    res.status(500).json({ error: 'Failed to update AI weight preferences' });
  }
});

export default router;