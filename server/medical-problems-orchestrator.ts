/**
 * Medical Problems Orchestrator
 * 
 * Manages the two-tier processing system for medical problems:
 * - Tier 1: Immediate processing after recording completion
 * - Tier 3: Processing after manual SOAP note edits (only if content changed)
 */

import crypto from "crypto";
import { medicalProblemsDelta } from "./medical-problems-delta-service.js";

interface EncounterProcessingState {
  encounterId: number;
  hasCompletedInitialProcessing: boolean;
  lastProcessedSOAPHash: string;
  recordingEndTime?: Date;
  initialProcessingResults?: any;
}

class MedicalProblemsOrchestrator {
  private encounterStates = new Map<number, EncounterProcessingState>();

  /**
   * Generate hash for SOAP content to detect changes
   */
  private generateSOAPHash(soapNote: string): string {
    return crypto.createHash('sha256').update(soapNote.trim()).digest('hex');
  }

  /**
   * Get or create encounter state
   */
  private getOrCreateEncounterState(encounterId: number): EncounterProcessingState {
    if (!this.encounterStates.has(encounterId)) {
      this.encounterStates.set(encounterId, {
        encounterId,
        hasCompletedInitialProcessing: false,
        lastProcessedSOAPHash: "",
      });
    }
    return this.encounterStates.get(encounterId)!;
  }

  /**
   * Tier 1: Process medical problems immediately after recording completion
   * Always processes - this gives users fast feedback on problem list updates
   */
  async processRecordingCompletion(
    patientId: number,
    encounterId: number,
    soapNote: string,
    providerId: number
  ) {
    console.log(`🎯 [MedicalOrchestrator] === TIER 1 PROCESSING START ===`);
    console.log(`🎯 [MedicalOrchestrator] Patient: ${patientId}, Encounter: ${encounterId}`);
    console.log(`🎯 [MedicalOrchestrator] SOAP length: ${soapNote.length} chars`);

    const state = this.getOrCreateEncounterState(encounterId);
    const soapHash = this.generateSOAPHash(soapNote);

    try {
      // Process with initial tier context
      const result = await medicalProblemsDelta.processSOAPDelta(
        patientId,
        encounterId,
        soapNote,
        providerId,
        "initial", // Processing tier
        undefined // No previous results for initial processing
      );

      // Update state
      state.hasCompletedInitialProcessing = true;
      state.lastProcessedSOAPHash = soapHash;
      state.recordingEndTime = new Date();
      state.initialProcessingResults = result;

      console.log(`✅ [MedicalOrchestrator] Tier 1 completed: ${result.total_problems_affected} problems affected`);
      return result;

    } catch (error) {
      console.error(`❌ [MedicalOrchestrator] Tier 1 failed:`, error);
      throw error;
    }
  }

  /**
   * Tier 3: Process medical problems after manual SOAP edits
   * Only processes if SOAP content has actually changed since Tier 1
   */
  async processManualSOAPEdit(
    patientId: number,
    encounterId: number,
    soapNote: string,
    providerId: number
  ) {
    console.log(`🎯 [MedicalOrchestrator] === TIER 3 PROCESSING CHECK ===`);
    console.log(`🎯 [MedicalOrchestrator] Patient: ${patientId}, Encounter: ${encounterId}`);

    const state = this.getOrCreateEncounterState(encounterId);
    const soapHash = this.generateSOAPHash(soapNote);

    // Check if we should process
    if (!state.hasCompletedInitialProcessing) {
      console.log(`🎯 [MedicalOrchestrator] No initial processing completed - skipping Tier 3`);
      return { 
        changes: [], 
        processing_time_ms: 0, 
        total_problems_affected: 0,
        reason: "No initial processing completed"
      } as any;
    }

    if (state.lastProcessedSOAPHash === soapHash) {
      console.log(`🎯 [MedicalOrchestrator] SOAP content unchanged - skipping Tier 3`);
      return { 
        changes: [], 
        processing_time_ms: 0, 
        total_problems_affected: 0,
        reason: "No content changes detected"
      } as any;
    }

    console.log(`🎯 [MedicalOrchestrator] === TIER 3 PROCESSING START ===`);
    console.log(`🎯 [MedicalOrchestrator] SOAP content changed - processing revision`);

    try {
      // Process with revision tier context
      const result = await medicalProblemsDelta.processSOAPDelta(
        patientId,
        encounterId,
        soapNote,
        providerId,
        "revision", // Processing tier
        state.initialProcessingResults // Previous results for context
      );

      // Update state
      state.lastProcessedSOAPHash = soapHash;

      console.log(`✅ [MedicalOrchestrator] Tier 3 completed: ${result.total_problems_affected} problems affected`);
      return result;

    } catch (error) {
      console.error(`❌ [MedicalOrchestrator] Tier 3 failed:`, error);
      throw error;
    }
  }

  /**
   * Clear encounter state (called when encounter is signed/finalized)
   */
  clearEncounterState(encounterId: number) {
    console.log(`🧹 [MedicalOrchestrator] Clearing state for encounter ${encounterId}`);
    this.encounterStates.delete(encounterId);
  }

  /**
   * Get encounter processing status for debugging
   */
  getEncounterStatus(encounterId: number) {
    const state = this.encounterStates.get(encounterId);
    return {
      exists: !!state,
      hasInitialProcessing: state?.hasCompletedInitialProcessing || false,
      lastProcessedTime: state?.recordingEndTime,
      lastSOAPHash: state?.lastProcessedSOAPHash?.substring(0, 8) + "..." || "none"
    };
  }
}

// Export singleton instance
export const medicalProblemsOrchestrator = new MedicalProblemsOrchestrator();