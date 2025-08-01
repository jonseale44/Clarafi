import { Router } from 'express';
import { requireAuth } from './auth.js';
import { db } from './db.js';
import { locations, users } from '../shared/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

const router = Router();

// Validation schema
const locationSchema = z.object({
  name: z.string().min(1),
  shortName: z.string().optional(),
  locationType: z.enum(['clinic', 'hospital', 'urgent_care', 'specialty_center', 'outpatient_center']),
  address: z.string().min(1),
  city: z.string().min(1),
  state: z.string().min(2).max(2),
  zipCode: z.string().min(5),
  phone: z.string().optional(),
  fax: z.string().optional(),
  npi: z.string().optional(),
  facilityCode: z.string().optional(),
});

// Middleware to check if user is admin of their health system
const requireClinicAdmin = async (req: any, res: any, next: any) => {
  try {
    const user = req.user;
    
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized: Admin access required' });
    }
    
    // Ensure admin can only manage their own health system
    if (!user.healthSystemId) {
      return res.status(403).json({ error: 'No health system associated with user' });
    }
    
    next();
  } catch (error) {
    console.error('Admin check error:', error);
    res.status(500).json({ error: 'Authorization check failed' });
  }
};

// Get all locations for the clinic admin's health system
router.get('/api/clinic-admin/locations', requireAuth, requireClinicAdmin, async (req, res) => {
  try {
    const user = req.user;
    
    const healthSystemLocations = await db.select()
      .from(locations)
      .where(eq(locations.healthSystemId, user.healthSystemId))
      .orderBy(locations.id);
    
    res.json(healthSystemLocations);
  } catch (error) {
    console.error('Error fetching locations:', error);
    res.status(500).json({ error: 'Failed to fetch locations' });
  }
});

// Create a new location
router.post('/api/clinic-admin/locations', requireAuth, requireClinicAdmin, async (req, res) => {
  try {
    const user = req.user;
    const validatedData = locationSchema.parse(req.body);
    
    const [newLocation] = await db.insert(locations).values({
      ...validatedData,
      healthSystemId: user.healthSystemId,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    
    console.log(`✅ [ClinicAdmin] Location created: ${newLocation.name} for health system ${user.healthSystemId}`);
    res.json(newLocation);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid location data', details: error.errors });
    }
    console.error('Error creating location:', error);
    res.status(500).json({ error: 'Failed to create location' });
  }
});

// Update a location
router.put('/api/clinic-admin/locations/:id', requireAuth, requireClinicAdmin, async (req, res) => {
  try {
    const user = req.user;
    const locationId = parseInt(req.params.id);
    const validatedData = locationSchema.parse(req.body);
    
    // Check if location belongs to the admin's health system
    const [existingLocation] = await db.select()
      .from(locations)
      .where(and(
        eq(locations.id, locationId),
        eq(locations.healthSystemId, user.healthSystemId)
      ))
      .limit(1);
    
    if (!existingLocation) {
      return res.status(404).json({ error: 'Location not found' });
    }
    
    const [updatedLocation] = await db.update(locations)
      .set({
        ...validatedData,
        updatedAt: new Date(),
      })
      .where(eq(locations.id, locationId))
      .returning();
    
    console.log(`✅ [ClinicAdmin] Location updated: ${updatedLocation.name}`);
    res.json(updatedLocation);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid location data', details: error.errors });
    }
    console.error('Error updating location:', error);
    res.status(500).json({ error: 'Failed to update location' });
  }
});

// Delete a location
router.delete('/api/clinic-admin/locations/:id', requireAuth, requireClinicAdmin, async (req, res) => {
  try {
    const user = req.user;
    const locationId = parseInt(req.params.id);
    
    // Check if location belongs to the admin's health system
    const [existingLocation] = await db.select()
      .from(locations)
      .where(and(
        eq(locations.id, locationId),
        eq(locations.healthSystemId, user.healthSystemId)
      ))
      .limit(1);
    
    if (!existingLocation) {
      return res.status(404).json({ error: 'Location not found' });
    }
    
    // Soft delete by setting isActive to false
    await db.update(locations)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(locations.id, locationId));
    
    console.log(`✅ [ClinicAdmin] Location deactivated: ${existingLocation.name}`);
    res.json({ message: 'Location deleted successfully' });
  } catch (error) {
    console.error('Error deleting location:', error);
    res.status(500).json({ error: 'Failed to delete location' });
  }
});

export default router;