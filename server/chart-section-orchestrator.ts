/**
 * CHART SECTION ORCHESTRATOR - SCALABLE PARALLEL PROCESSING ARCHITECTURE
 * 
 * ⚠️  IMPORTANT: DO NOT REMOVE OR REFACTOR WITHOUT UNDERSTANDING THE VISION ⚠️
 * 
 * PURPOSE: Coordinates parallel processing of 10+ chart sections simultaneously
 * GOAL: Prevent 30+ second delays when processing comprehensive medical documents
 * 
 * CURRENT STATUS: 2 of 10+ processors implemented (vitals, medical-problems)
 * FUTURE EXPANSION: Will add medications, allergies, labs, social-history, etc.
 * 
 * ARCHITECTURE NOTES:
 * - Each processor runs independently in parallel
 * - Priority-based processing (medical-problems=1, vitals=2, etc.)
 * - Graceful failure handling per section
 * - Designed for horizontal scaling across multiple chart sections
 * 
 * DO NOT DELETE: This is intentional architecture, not technical debt
 * DO NOT DUPLICATE: Check if processor already exists before creating new ones
 */

import { chartSectionQueue } from "./chart-section-queue.js";
import { unifiedMedicalProblemsParser } from "./unified-medical-problems-parser.js";
import { VitalsParserService } from "./vitals-parser-service.js";

interface ChartSectionProcessor {
  name: string;
  processor: (content: string, context: any) => Promise<any>;
  priority: number;
  enabled: boolean;
}

export class ChartSectionOrchestrator {
  private processors: Map<string, ChartSectionProcessor> = new Map();
  private vitalsParser: VitalsParserService;

  constructor() {
    this.vitalsParser = new VitalsParserService();
    this.initializeProcessors();
  }

  /**
   * Initialize available chart section processors
   */
  private initializeProcessors(): void {
    // Current implemented processors
    this.processors.set("vitals", {
      name: "vitals",
      processor: this.processVitals.bind(this),
      priority: 2,
      enabled: true
    });

    this.processors.set("medical-problems", {
      name: "medical-problems", 
      processor: this.processMedicalProblems.bind(this),
      priority: 1,
      enabled: true
    });

    // Future processors (placeholders for architecture planning)
    this.processors.set("social-history", {
      name: "social-history",
      processor: this.processSocialHistory.bind(this),
      priority: 3,
      enabled: false // Will be implemented later
    });

    this.processors.set("family-history", {
      name: "family-history",
      processor: this.processFamilyHistory.bind(this),
      priority: 3,
      enabled: false // Will be implemented later
    });

    this.processors.set("allergies", {
      name: "allergies",
      processor: this.processAllergies.bind(this),
      priority: 2,
      enabled: false // Will be implemented later
    });

    this.processors.set("medications", {
      name: "medications",
      processor: this.processMedications.bind(this),
      priority: 1,
      enabled: false // Will be implemented later
    });

    this.processors.set("surgical-history", {
      name: "surgical-history",
      processor: this.processSurgicalHistory.bind(this),
      priority: 3,
      enabled: false // Will be implemented later
    });

    console.log(`🎛️ [ChartOrchestrator] Initialized ${this.processors.size} chart section processors`);
    console.log(`🎛️ [ChartOrchestrator] Currently enabled: ${Array.from(this.processors.values()).filter(p => p.enabled).map(p => p.name).join(", ")}`);
  }

  /**
   * Process all enabled chart sections for given content
   */
  async processAllSections(
    patientId: number,
    content: string,
    options: {
      encounterId?: number;
      attachmentId?: number;
      providerId: number;
      contentType: "soap" | "attachment";
      sections?: string[]; // Specific sections to process, or all if not provided
    }
  ): Promise<{
    taskIds: string[];
    results: any[];
    totalProcessingTime: number;
    sectionsProcessed: number;
  }> {
    
    const startTime = Date.now();
    
    // Filter processors based on enabled status and optional section filter
    const enabledProcessors = Array.from(this.processors.values())
      .filter(p => p.enabled)
      .filter(p => !options.sections || options.sections.includes(p.name));

    console.log(`🎛️ [ChartOrchestrator] Processing ${enabledProcessors.length} chart sections for patient ${patientId}`);
    console.log(`🎛️ [ChartOrchestrator] Content type: ${options.contentType}, Length: ${content.length} characters`);
    console.log(`🎛️ [ChartOrchestrator] Sections: ${enabledProcessors.map(p => p.name).join(", ")}`);

    if (enabledProcessors.length === 0) {
      console.log(`⚠️ [ChartOrchestrator] No enabled processors found`);
      return {
        taskIds: [],
        results: [],
        totalProcessingTime: 0,
        sectionsProcessed: 0
      };
    }

    // Create processing context
    const context = {
      patientId,
      encounterId: options.encounterId,
      attachmentId: options.attachmentId,
      providerId: options.providerId,
      contentType: options.contentType
    };

    // Queue all sections for parallel processing
    const taskIds = await chartSectionQueue.processMultipleSections(
      patientId,
      content,
      enabledProcessors.map(processor => ({
        name: processor.name,
        processor: () => processor.processor(content, context),
        priority: processor.priority
      })),
      {
        encounterId: options.encounterId,
        attachmentId: options.attachmentId,
        providerId: options.providerId
      }
    );

    console.log(`🎛️ [ChartOrchestrator] Queued ${taskIds.length} processing tasks`);

    // Wait for all tasks to complete
    const results = await chartSectionQueue.waitForTasks(taskIds);

    const totalProcessingTime = Date.now() - startTime;
    const successfulResults = results.filter(r => r.success);
    const failedResults = results.filter(r => !r.success);

    console.log(`✅ [ChartOrchestrator] Processing complete in ${totalProcessingTime}ms`);
    console.log(`✅ [ChartOrchestrator] Successful: ${successfulResults.length}, Failed: ${failedResults.length}`);

    if (failedResults.length > 0) {
      console.log(`❌ [ChartOrchestrator] Failed sections:`, failedResults.map(r => `${r.section}: ${r.error}`).join(", "));
    }

    return {
      taskIds,
      results,
      totalProcessingTime,
      sectionsProcessed: successfulResults.length
    };
  }

  /**
   * Process vitals from content
   */
  private async processVitals(content: string, context: any): Promise<any> {
    console.log(`🩺 [ChartOrchestrator] Processing vitals for patient ${context.patientId}`);
    
    const result = await this.vitalsParser.parseVitalsText(content, {
      age: context.patientAge,
      gender: context.patientGender
    }, context.patientId);

    console.log(`🩺 [ChartOrchestrator] Vitals processing complete: ${result.success ? 'Success' : 'Failed'}`);
    return result;
  }

  /**
   * Process medical problems from content
   */
  private async processMedicalProblems(content: string, context: any): Promise<any> {
    console.log(`🏥 [ChartOrchestrator] Processing medical problems for patient ${context.patientId}`);
    
    const result = await unifiedMedicalProblemsParser.processUnified(
      context.patientId,
      context.encounterId || null,
      context.contentType === "soap" ? content : null,
      context.contentType === "attachment" ? content : null,
      context.attachmentId || null,
      context.providerId,
      context.contentType === "soap" ? "manual_edit" : "attachment_processed"
    );

    console.log(`🏥 [ChartOrchestrator] Medical problems processing complete: ${result.total_problems_affected} problems affected`);
    return result;
  }

  /**
   * Future processor placeholders
   */
  private async processSocialHistory(content: string, context: any): Promise<any> {
    // TODO: Implement social history processor
    console.log(`📋 [ChartOrchestrator] Social history processing not yet implemented`);
    return { success: false, error: "Not implemented" };
  }

  private async processFamilyHistory(content: string, context: any): Promise<any> {
    // TODO: Implement family history processor
    console.log(`👨‍👩‍👧‍👦 [ChartOrchestrator] Family history processing not yet implemented`);
    return { success: false, error: "Not implemented" };
  }

  private async processAllergies(content: string, context: any): Promise<any> {
    // TODO: Implement allergies processor
    console.log(`🚨 [ChartOrchestrator] Allergies processing not yet implemented`);
    return { success: false, error: "Not implemented" };
  }

  private async processMedications(content: string, context: any): Promise<any> {
    // TODO: Implement medications processor
    console.log(`💊 [ChartOrchestrator] Medications processing not yet implemented`);
    return { success: false, error: "Not implemented" };
  }

  private async processSurgicalHistory(content: string, context: any): Promise<any> {
    // TODO: Implement surgical history processor
    console.log(`🔪 [ChartOrchestrator] Surgical history processing not yet implemented`);
    return { success: false, error: "Not implemented" };
  }

  /**
   * Enable or disable specific chart section processors
   */
  setProcessorEnabled(sectionName: string, enabled: boolean): void {
    const processor = this.processors.get(sectionName);
    if (processor) {
      processor.enabled = enabled;
      console.log(`🎛️ [ChartOrchestrator] ${enabled ? 'Enabled' : 'Disabled'} processor: ${sectionName}`);
    } else {
      console.warn(`⚠️ [ChartOrchestrator] Unknown processor: ${sectionName}`);
    }
  }

  /**
   * Get list of available processors and their status
   */
  getProcessorStatus(): Array<{name: string, enabled: boolean, priority: number}> {
    return Array.from(this.processors.values()).map(p => ({
      name: p.name,
      enabled: p.enabled,
      priority: p.priority
    }));
  }
}

// Export singleton instance
export const chartSectionOrchestrator = new ChartSectionOrchestrator();