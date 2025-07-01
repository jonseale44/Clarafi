/**
 * Unified Allergy API
 * RESTful endpoints for allergy management with visit history tracking
 */

import { Request, Response } from 'express';
import { db } from './db.js';
import { allergies } from '../shared/schema.js';
import { eq, and } from 'drizzle-orm';
import { UnifiedAllergyParser } from './unified-allergy-parser.js';

const allergyParser = new UnifiedAllergyParser();

/**
 * GET /api/allergies/:patientId
 * Get all allergies for a patient
 */
export async function getAllergies(req: Request, res: Response) {
  try {
    const patientId = parseInt(req.params.patientId);
    
    if (isNaN(patientId)) {
      return res.status(400).json({ error: 'Invalid patient ID' });
    }

    console.log(`🚨 [AllergyAPI] Fetching allergies for patient ${patientId}`);

    const patientAllergies = await db.select()
      .from(allergies)
      .where(eq(allergies.patientId, patientId));

    console.log(`🚨 [AllergyAPI] Found ${patientAllergies.length} allergies for patient ${patientId}`);

    res.json(patientAllergies);
  } catch (error) {
    console.error('🚨 [AllergyAPI] Error fetching allergies:', error);
    res.status(500).json({ error: 'Failed to fetch allergies' });
  }
}

/**
 * POST /api/allergies
 * Create a new allergy
 */
export async function createAllergy(req: Request, res: Response) {
  try {
    const {
      patientId,
      allergen,
      reaction,
      severity,
      allergyType,
      status = 'active',
      verificationStatus = 'unconfirmed',
      onsetDate,
      lastReactionDate,
      drugClass,
      crossReactivity,
      sourceNotes
    } = req.body;

    console.log(`🚨 [AllergyAPI] Creating new allergy for patient ${patientId}: ${allergen}`);

    const visitEntry = {
      date: new Date().toLocaleDateString('en-CA'),
      notes: `Manually added allergy: ${allergen} - ${reaction || 'reaction not specified'}`,
      source: 'manual' as const,
      changesMade: ['allergy_created'],
      confidence: 1.0,
    };

    const [newAllergy] = await db.insert(allergies).values({
      patientId,
      allergen,
      reaction: reaction || null,
      severity: severity || null,
      allergyType: allergyType || null,
      status,
      verificationStatus,
      onsetDate: onsetDate ? new Date(onsetDate) : null,
      lastReactionDate: lastReactionDate ? new Date(lastReactionDate) : null,
      drugClass: drugClass || null,
      crossReactivity: crossReactivity || null,
      sourceType: 'manual_entry',
      sourceConfidence: '1.00',
      sourceNotes: sourceNotes || null,
      enteredBy: 1, // Default user ID
      visitHistory: [visitEntry],
    }).returning();

    console.log(`🚨 [AllergyAPI] Created allergy with ID: ${newAllergy.id}`);

    res.status(201).json(newAllergy);
  } catch (error) {
    console.error('🚨 [AllergyAPI] Error creating allergy:', error);
    res.status(500).json({ error: 'Failed to create allergy' });
  }
}

/**
 * PUT /api/allergies/:allergyId
 * Update an existing allergy
 */
export async function updateAllergy(req: Request, res: Response) {
  try {
    const allergyId = parseInt(req.params.allergyId);
    
    if (isNaN(allergyId)) {
      return res.status(400).json({ error: 'Invalid allergy ID' });
    }

    const {
      allergen,
      reaction,
      severity,
      allergyType,
      status,
      verificationStatus,
      onsetDate,
      lastReactionDate,
      drugClass,
      crossReactivity,
      sourceNotes
    } = req.body;

    console.log(`🚨 [AllergyAPI] Updating allergy ${allergyId}`);

    // Get current record for visit history
    const [existingRecord] = await db.select()
      .from(allergies)
      .where(eq(allergies.id, allergyId));

    if (!existingRecord) {
      return res.status(404).json({ error: 'Allergy not found' });
    }

    const currentVisitHistory = Array.isArray(existingRecord.visitHistory) 
      ? existingRecord.visitHistory 
      : [];

    const changesMade = [];
    if (allergen !== existingRecord.allergen) changesMade.push('allergen_updated');
    if (reaction !== existingRecord.reaction) changesMade.push('reaction_updated');
    if (severity !== existingRecord.severity) changesMade.push('severity_updated');
    if (status !== existingRecord.status) changesMade.push('status_updated');

    const visitEntry = {
      date: new Date().toLocaleDateString('en-CA'),
      notes: `Manually updated allergy: ${changesMade.join(', ')}`,
      source: 'manual' as const,
      changesMade,
      confidence: 1.0,
    };

    const updatedVisitHistory = [...currentVisitHistory, visitEntry];

    const [updatedAllergy] = await db.update(allergies)
      .set({
        allergen: allergen || existingRecord.allergen,
        reaction: reaction !== undefined ? reaction : existingRecord.reaction,
        severity: severity || existingRecord.severity,
        allergyType: allergyType || existingRecord.allergyType,
        status: status || existingRecord.status,
        verificationStatus: verificationStatus || existingRecord.verificationStatus,
        onsetDate: onsetDate ? new Date(onsetDate) : existingRecord.onsetDate,
        lastReactionDate: lastReactionDate ? new Date(lastReactionDate) : existingRecord.lastReactionDate,
        drugClass: drugClass !== undefined ? drugClass : existingRecord.drugClass,
        crossReactivity: crossReactivity !== undefined ? crossReactivity : existingRecord.crossReactivity,
        sourceNotes: sourceNotes !== undefined ? sourceNotes : existingRecord.sourceNotes,
        visitHistory: updatedVisitHistory,
        updatedAt: new Date(),
      })
      .where(eq(allergies.id, allergyId))
      .returning();

    console.log(`🚨 [AllergyAPI] Updated allergy ${allergyId}`);

    res.json(updatedAllergy);
  } catch (error) {
    console.error('🚨 [AllergyAPI] Error updating allergy:', error);
    res.status(500).json({ error: 'Failed to update allergy' });
  }
}

/**
 * DELETE /api/allergies/:allergyId
 * Delete an allergy
 */
export async function deleteAllergy(req: Request, res: Response) {
  try {
    const allergyId = parseInt(req.params.allergyId);
    
    if (isNaN(allergyId)) {
      return res.status(400).json({ error: 'Invalid allergy ID' });
    }

    console.log(`🚨 [AllergyAPI] Deleting allergy ${allergyId}`);

    const [deletedAllergy] = await db.delete(allergies)
      .where(eq(allergies.id, allergyId))
      .returning();

    if (!deletedAllergy) {
      return res.status(404).json({ error: 'Allergy not found' });
    }

    console.log(`🚨 [AllergyAPI] Deleted allergy: ${deletedAllergy.allergen}`);

    res.json({ message: 'Allergy deleted successfully', deletedAllergy });
  } catch (error) {
    console.error('🚨 [AllergyAPI] Error deleting allergy:', error);
    res.status(500).json({ error: 'Failed to delete allergy' });
  }
}

/**
 * POST /api/allergies/process-unified
 * Process allergies from SOAP notes and attachments using unified parser
 */
export async function processUnifiedAllergies(req: Request, res: Response) {
  try {
    const {
      patientId,
      soapNote,
      attachmentContent,
      encounterId,
      attachmentId,
      triggerType = 'manual_save'
    } = req.body;

    if (!patientId) {
      return res.status(400).json({ error: 'Patient ID is required' });
    }

    console.log(`🚨 [AllergyAPI] Processing unified allergies for patient ${patientId}`);

    const result = await allergyParser.processUnifiedAllergies(patientId, {
      soapNote,
      attachmentContent,
      encounterId,
      attachmentId,
      triggerType,
    });

    console.log(`🚨 [AllergyAPI] Unified processing complete: ${result.allergiesAffected} allergies affected`);

    res.json(result);
  } catch (error) {
    console.error('🚨 [AllergyAPI] Error in unified allergy processing:', error);
    res.status(500).json({ 
      error: 'Failed to process allergies',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * POST /api/allergies/:allergyId/visit-history
 * Add visit history entry to existing allergy
 */
export async function addAllergyVisitHistory(req: Request, res: Response) {
  try {
    const allergyId = parseInt(req.params.allergyId);
    
    if (isNaN(allergyId)) {
      return res.status(400).json({ error: 'Invalid allergy ID' });
    }

    const { date, notes, source, encounterId, changesMade } = req.body;

    console.log(`🚨 [AllergyAPI] Adding visit history to allergy ${allergyId}`);

    // Get current record
    const [existingRecord] = await db.select()
      .from(allergies)
      .where(eq(allergies.id, allergyId));

    if (!existingRecord) {
      return res.status(404).json({ error: 'Allergy not found' });
    }

    const currentVisitHistory = Array.isArray(existingRecord.visitHistory) 
      ? existingRecord.visitHistory 
      : [];

    const newVisitEntry = {
      date: date || new Date().toLocaleDateString('en-CA'),
      notes: notes || 'Visit history entry added',
      source: source || 'manual',
      encounterId: encounterId || undefined,
      changesMade: changesMade || ['visit_documented'],
      confidence: 1.0,
    };

    const updatedVisitHistory = [...currentVisitHistory, newVisitEntry];

    const [updatedAllergy] = await db.update(allergies)
      .set({
        visitHistory: updatedVisitHistory,
        updatedAt: new Date(),
      })
      .where(eq(allergies.id, allergyId))
      .returning();

    console.log(`🚨 [AllergyAPI] Added visit history to allergy ${allergyId}`);

    res.json(updatedAllergy);
  } catch (error) {
    console.error('🚨 [AllergyAPI] Error adding visit history:', error);
    res.status(500).json({ error: 'Failed to add visit history' });
  }
}