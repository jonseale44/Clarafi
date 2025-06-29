import { Express, Request, Response } from 'express';
import { APIResponseHandler } from './api-response-handler';
import { storage } from './storage';
import { insertUserPreferencesSchema, UserPreferences } from '@shared/schema';
import { z } from 'zod';

export function registerUserPreferencesRoutes(app: Express) {
  // Get user preferences
  app.get('/api/user/preferences', 
    APIResponseHandler.asyncHandler(async (req: Request, res: Response) => {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const preferences = await storage.getUserPreferences(userId);
      
      // Return default preferences if none exist
      const defaultPreferences = {
        chartPanelWidth: 400
      };

      res.json(preferences || defaultPreferences);
    })
  );

  // Update user preferences
  app.put('/api/user/preferences', 
    APIResponseHandler.asyncHandler(async (req: Request, res: Response) => {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const updateData = {
        userId,
        ...req.body
      };

      // Validate the request body
      const validatedData = insertUserPreferencesSchema.parse(updateData);
      
      const preferences = await storage.upsertUserPreferences(validatedData);
      res.json(preferences);
    })
  );
}