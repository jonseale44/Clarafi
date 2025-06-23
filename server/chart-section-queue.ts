/**
 * Chart Section Processing Queue
 * 
 * Manages parallel processing of multiple chart sections (vitals, medical problems, etc.)
 * to prevent performance degradation when 10+ parsers process the same content
 */

interface QueuedTask {
  id: string;
  section: string;
  patientId: number;
  encounterId?: number;
  attachmentId?: number;
  content: string;
  providerId: number;
  priority: number;
  createdAt: Date;
  processor: () => Promise<any>;
}

interface ProcessingResult {
  taskId: string;
  section: string;
  success: boolean;
  result?: any;
  error?: string;
  processingTimeMs: number;
}

export class ChartSectionQueue {
  private queue: QueuedTask[] = [];
  private processing: Map<string, Promise<ProcessingResult>> = new Map();
  private maxConcurrent: number = 5; // Process up to 5 sections in parallel
  private currentlyProcessing: number = 0;

  /**
   * Add a chart section processing task to the queue
   */
  async addTask(
    section: string,
    patientId: number,
    content: string,
    processor: () => Promise<any>,
    options: {
      encounterId?: number;
      attachmentId?: number;
      providerId: number;
      priority?: number;
    }
  ): Promise<string> {
    
    const taskId = `${section}_${patientId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const task: QueuedTask = {
      id: taskId,
      section,
      patientId,
      encounterId: options.encounterId,
      attachmentId: options.attachmentId,
      content,
      providerId: options.providerId,
      priority: options.priority || 1,
      createdAt: new Date(),
      processor
    };

    this.queue.push(task);
    this.sortQueueByPriority();
    
    console.log(`📋 [ChartSectionQueue] Added ${section} task for patient ${patientId} (Queue size: ${this.queue.length})`);
    
    // Start processing if we have capacity
    this.processNext();
    
    return taskId;
  }

  /**
   * Process the next tasks in the queue up to maxConcurrent limit
   */
  private async processNext(): Promise<void> {
    while (this.currentlyProcessing < this.maxConcurrent && this.queue.length > 0) {
      const task = this.queue.shift();
      if (!task) break;

      this.currentlyProcessing++;
      
      const processingPromise = this.processTask(task);
      this.processing.set(task.id, processingPromise);
      
      // Don't await here - let it process in parallel
      processingPromise.finally(() => {
        this.currentlyProcessing--;
        this.processing.delete(task.id);
        
        // Try to process more tasks
        this.processNext();
      });
    }
  }

  /**
   * Process a single task
   */
  private async processTask(task: QueuedTask): Promise<ProcessingResult> {
    const startTime = Date.now();
    
    console.log(`🔄 [ChartSectionQueue] Processing ${task.section} for patient ${task.patientId}`);
    
    try {
      const result = await task.processor();
      const processingTime = Date.now() - startTime;
      
      console.log(`✅ [ChartSectionQueue] Completed ${task.section} for patient ${task.patientId} in ${processingTime}ms`);
      
      return {
        taskId: task.id,
        section: task.section,
        success: true,
        result,
        processingTimeMs: processingTime
      };
      
    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      console.error(`❌ [ChartSectionQueue] Failed ${task.section} for patient ${task.patientId}:`, error);
      
      return {
        taskId: task.id,
        section: task.section,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        processingTimeMs: processingTime
      };
    }
  }

  /**
   * Sort queue by priority (higher priority first)
   */
  private sortQueueByPriority(): void {
    this.queue.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Get processing status for a specific task
   */
  async getTaskStatus(taskId: string): Promise<ProcessingResult | null> {
    // Check if currently processing
    const processingPromise = this.processing.get(taskId);
    if (processingPromise) {
      return await processingPromise;
    }

    // Check if in queue
    const queuedTask = this.queue.find(t => t.id === taskId);
    if (queuedTask) {
      return {
        taskId,
        section: queuedTask.section,
        success: false,
        error: "Task is queued for processing",
        processingTimeMs: 0
      };
    }

    return null;
  }

  /**
   * Process multiple chart sections for the same content in parallel
   */
  async processMultipleSections(
    patientId: number,
    content: string,
    sections: Array<{
      name: string;
      processor: () => Promise<any>;
      priority?: number;
    }>,
    options: {
      encounterId?: number;
      attachmentId?: number;
      providerId: number;
    }
  ): Promise<string[]> {
    
    console.log(`📋 [ChartSectionQueue] Processing ${sections.length} sections for patient ${patientId}`);
    
    const taskIds: string[] = [];
    
    for (const section of sections) {
      const taskId = await this.addTask(
        section.name,
        patientId,
        content,
        section.processor,
        {
          ...options,
          priority: section.priority || 1
        }
      );
      taskIds.push(taskId);
    }
    
    return taskIds;
  }

  /**
   * Wait for all tasks to complete and return results
   */
  async waitForTasks(taskIds: string[]): Promise<ProcessingResult[]> {
    const results: ProcessingResult[] = [];
    
    for (const taskId of taskIds) {
      let result = await this.getTaskStatus(taskId);
      
      // Poll until task completes
      while (!result || (result && result.error === "Task is queued for processing")) {
        await new Promise(resolve => setTimeout(resolve, 100)); // Wait 100ms
        result = await this.getTaskStatus(taskId);
      }
      
      if (result) {
        results.push(result);
      }
    }
    
    return results;
  }

  /**
   * Get queue statistics
   */
  getQueueStats(): {
    queueLength: number;
    processing: number;
    maxConcurrent: number;
  } {
    return {
      queueLength: this.queue.length,
      processing: this.currentlyProcessing,
      maxConcurrent: this.maxConcurrent
    };
  }
}

// Export singleton instance
export const chartSectionQueue = new ChartSectionQueue();