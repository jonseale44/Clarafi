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
    
    // Get AI-predicted duration if enabled
    let aiPredictedDuration: number | undefined;
    let patientVisibleDuration: number | undefined;
    let providerScheduledDuration: number | undefined;
    
    if (validatedData.useAiScheduling) {
      const prediction = await storage.predictAppointmentDuration({
        patientId: validatedData.patientId,
        providerId: validatedData.providerId,
        appointmentType: validatedData.appointmentType,
        appointmentDate: new Date(validatedData.appointmentDate),
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
    
    console.log('📅 [CREATE_APPOINTMENT] Creating appointment with data:', {
      ...validatedData,
      status: 'scheduled',
      aiPredictedDuration,
      patientVisibleDuration,
      providerScheduledDuration,
      createdBy: req.user!.id
    });
    
    const appointment = await storage.createAppointment({
      ...validatedData,
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

// Update appointment
router.put('/api/scheduling/appointments/:id',  tenantIsolation, async (req, res) => {
  try {
    const appointmentId = parseInt(req.params.id);
    
    // Check permissions
    const canSchedule = ['admin', 'nurse', 'ma', 'front_desk'].includes(req.user!.role);
    if (!canSchedule) {
      return res.status(403).json({ error: 'You do not have permission to update appointments' });
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
    
    // Check permissions
    const canSchedule = ['admin', 'nurse', 'ma', 'front_desk'].includes(req.user!.role);
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
    if (!req.isAuthenticated()) return res.sendStatus(401);
});

// Get appointment types
router.get('/api/scheduling/appointment-types',  tenantIsolation, async (req, res) => {
  try {
    const locationId = req.query.locationId ? parseInt(req.query.locationId as string) : undefined;
    
    const types = await storage.getAppointmentTypes(req.userHealthSystemId!, locationId);
    
    res.json(types);
  } catch (error) {
    console.error('Error fetching appointment types:', error);
    res.status(500).json({ error: 'Failed to fetch appointment types' });
  }
    if (!req.isAuthenticated()) return res.sendStatus(401);
});

// AI factor configuration endpoints (admin only)
router.get('/api/scheduling/ai-factors',  tenantIsolation, async (req, res) => {
  try {
    if (req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'Only administrators can view AI factor configuration' });
    }
    
    const factors = await storage.getSchedulingAiFactors();
    
    res.json(factors);
  } catch (error) {
    console.error('Error fetching AI factors:', error);
    res.status(500).json({ error: 'Failed to fetch AI factors' });
    if (!req.isAuthenticated()) return res.sendStatus(401);
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

export default router;