/**
 * DraftOrdersModule handles the creation, parsing, and management of medical orders
 * including medications, lab tests, and imaging orders generated from SOAP notes
 */
export class DraftOrdersModule {
  // Store patient chart data for reference during order generation
  private patientChart: any = null;

  /**
   * Initialize module with WebSocket connection for real-time GPT interactions
   * @param ws WebSocket connection instance
   */
  constructor(private ws: WebSocket | null) {
    console.log("[DraftOrdersModule] Initialized");
  }

  updateWebSocket(newWs: WebSocket | null) {
    this.ws = newWs;
    console.log("[DraftOrdersModule] WebSocket connection updated");
  }

  handleGptResponse(data: any, onMessage: (event: any) => void) {
    if (!data?.response?.output?.[0]?.content?.[0]?.text) {
      console.warn("[DraftOrdersModule] Invalid GPT response format");
      return;
    }

    const orderText = data.response.output[0].content[0].text;
    const orders = this.parseDraftOrders(orderText);

    if (orders?.length) {
      console.log("[DraftOrdersModule] Final orders to save:", orders);
      this.saveDraftOrders(orders, onMessage);
    }
  }

  parseDraftOrders(text: string): any[] {
    console.log("[DraftOrdersModule] Starting to parse orders:", text);
    const orders: any[] = [];
    // Split by double newlines and clean each block
    const orderBlocks = text
      .split("\n\n")
      .map((block) => block.trim())
      .filter((block) => block.length > 0);

    orderBlocks.forEach((block, index) => {
      const blockLower = block.toLowerCase().trim();

      // Identify order type by keywords in the block
      if (
        blockLower.includes("medication") ||
        blockLower.includes("prescribe") ||
        blockLower.includes("mg") ||
        blockLower.includes("tablet") ||
        blockLower.includes("capsule")
      ) {
        try {
          const medication = this.parseMedication(block);
          if (medication) {
            orders.push({
              order_type: "medication",
              order_status: "draft",
              ...medication,
            });
          }
        } catch (err) {
          console.error("[DraftOrdersModule] Error parsing medication:", err);
        }
      } else if (
        blockLower.includes("lab") ||
        blockLower.includes("test") ||
        blockLower.includes("panel") ||
        blockLower.includes("level") ||
        blockLower.includes("count")
      ) {
        try {
          const labMatch = block.match(/Lab:\s*(.+?)(?:\n|$)/i);
          const labName = labMatch ? labMatch[1].trim() : "";
          console.log("[DEBUG] Extracted Lab Name:", labName);
          console.log("[DEBUG] Original Block:", block);

          if (!labName) {
            console.warn(
              "[Warning] labName is EMPTY. Order will show 'Unknown Lab Test'. Block content:",
              block,
            );
          }

          if (labName) {
            const labOrder = {
              order_type: "lab",
              order_status: "draft",
              lab_name: labName,
              test_name: labName,
              provider_notes: block,
              priority: "routine",
              generated_from_conversation: true,
              patient_id: this.patientChart?.patient_id,
            };
            console.log("[DEBUG] Creating Lab Order:", labOrder);
            orders.push(labOrder);
          }
        } catch (err) {
          console.error("[DraftOrdersModule] Error parsing lab:", err);
        }
      } else if (
        blockLower.includes("imaging") ||
        blockLower.includes("x-ray") ||
        blockLower.includes("mri") ||
        blockLower.includes("ct") ||
        blockLower.includes("scan") ||
        blockLower.includes("ultrasound")
      ) {
        try {
          const imaging = this.parseImaging(block);
          if (imaging) {
            orders.push({
              order_type: "imaging",
              order_status: "draft",
              ...imaging,
            });
          }
        } catch (err) {
          console.error("[DraftOrdersModule] Error parsing imaging:", err);
        }
      } else if (
        blockLower.includes("referral") ||
        blockLower.includes("consult") ||
        blockLower.includes("specialist")
      ) {
        try {
          const referral = this.parseReferral(block);
          if (referral) {
            orders.push({
              order_type: "referral",
              order_status: "draft",
              ...referral,
            });
          }
        } catch (err) {
          console.error("[DraftOrdersModule] Error parsing referral:", err);
        }
      } else {
        // Generic order type
        orders.push({
          order_type: "other",
          order_status: "draft",
          provider_notes: block,
        });
      }
    });

    return orders;
  }

  /**
   * Parse medication orders from text
   * Handles various formats of medication information
   */
  private parseMedication(block: string): any {
    console.log("[DraftOrdersModule] Parsing medication from:", block);

    // More flexible regex pattern that can handle variations in order
    const medInfo: any = {};

    // Extract medication name (typically appears first)
    const nameMatch = block.match(/^(.*?)(?:\s+\d|\s+tablet|\s+capsule|$)/i);
    if (nameMatch) {
      medInfo.medication_name = nameMatch[1].trim();
    }

    // Extract dosage (look for numeric values with units)
    const dosageMatch = block.match(/\b(\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|mEq))/i);
    if (dosageMatch) {
      medInfo.dosage = dosageMatch[1];
    }

    // Extract form
    const formMatch = block.match(
      /\b(tablet|capsule|solution|suspension|injection|patch|cream|ointment|gel|spray)\b/i,
    );
    if (formMatch) {
      medInfo.form = formMatch[1].toLowerCase();
    } else {
      medInfo.form = "tablet"; // Default form
    }

    // Extract sig/instructions (after "sig:" or "take" or similar keywords)
    const sigMatch = block.match(
      /(?:sig:?|take|use|instructions:?)\s*(.*?)(?:\s*(?:dispense|quantity|for|refills|$))/i,
    );
    if (sigMatch) {
      medInfo.sig = sigMatch[1].trim();
    }

    // Extract quantity
    const quantityMatch =
      block.match(/(?:dispense|quantity):?\s*(\d+)/i) ||
      block.match(/\b(\d+)\s*(?:tablet|capsule|ml|pill|dose)/i);
    if (quantityMatch) {
      medInfo.quantity = parseInt(quantityMatch[1], 10);
    } else {
      medInfo.quantity = 30; // Default quantity
    }

    // Extract refills
    const refillsMatch =
      block.match(/refills:?\s*(\d+)/i) || block.match(/\b(\d+)\s*refills?\b/i);
    if (refillsMatch) {
      medInfo.refills = parseInt(refillsMatch[1], 10);
    } else {
      medInfo.refills = 0; // Default refills
    }

    // Fallback to assign the whole block as notes if parsing fails
    if (!medInfo.medication_name) {
      medInfo.medication_name = "Unspecified Medication";
      medInfo.provider_notes = block;
    }

    console.log("[DraftOrdersModule] Parsed medication:", medInfo);
    return medInfo;
  }

  /**
   * Parse lab test orders from text
   */
  private parseLab(block: string): any {
    console.log("[DraftOrdersModule] Parsing lab from:", block);
    const labInfo: any = {};

    // Extract test name
    const testMatch = block.match(
      /(?:Lab:|Test:)?\s*([^()\n]+?)(?:\s*\(|\s*-|\s*:|\s*for|\s*to|\s*$)/i,
    );
    if (testMatch) {
      labInfo.test_name = testMatch[1].trim();
      labInfo.lab_name = testMatch[1].trim(); // Keep both for compatibility
    }

    // Extract priority
    labInfo.priority = block.toLowerCase().includes("stat")
      ? "stat"
      : "routine";

    // Extract provider notes - only include collection instructions or additional notes
    const notesMatch = block.match(/\(([^)]+)\)/);
    if (notesMatch) {
      labInfo.provider_notes = notesMatch[1].trim();
    }

    // If no test name was found, use provider notes
    if (!labInfo.test_name) {
      console.warn("[Warning] No test name found in parseLab. Block:", block);
      labInfo.test_name = "Unspecified Lab Test";
      labInfo.lab_name = "Unspecified Lab Test";
    }

    console.log("[DEBUG] Final Lab Info:", {
      ...labInfo,
      originalBlock: block,
      testMatch: block.match(
        /(?:Lab:|Test:)?\s*([^()\n]+?)(?:\s*\(|\s*-|\s*:|\s*for|\s*to|\s*$)/i,
      ),
    });
    return labInfo;
  }

  /**
   * Parse imaging study orders from text
   */
  private parseImaging(block: string): any {
    console.log("[DraftOrdersModule] Parsing imaging from:", block);
    const imagingInfo: any = {};

    // Extract imaging type
    const imagingTypeMatch = block.match(
      /\b(x-ray|mri|ct scan|ultrasound|pet scan|mammogram|dexa|bone scan|echocardiogram)\b/i,
    );
    if (imagingTypeMatch) {
      imagingInfo.study_type = imagingTypeMatch[1].toUpperCase();
    } else {
      imagingInfo.study_type = "Unspecified Imaging";
    }

    // Extract body part/region
    const bodyPartMatch = block.match(
      /\b(?:of|for)\s+(?:the\s+)?(.*?)(?:\s+to|\s+with|\s+without|\s+for|\s*$)/i,
    );
    if (bodyPartMatch) {
      imagingInfo.region = bodyPartMatch[1].trim();
    }

    // Extract reason/indication
    const reasonMatch = block.match(
      /\b(?:to|for|evaluate|assess)\s+(.*?)(?:\s*$)/i,
    );
    if (reasonMatch) {
      imagingInfo.indication = reasonMatch[1].trim();
    }

    // Store full text as provider notes
    imagingInfo.provider_notes = block.trim();

    console.log("[DraftOrdersModule] Parsed imaging:", imagingInfo);
    return imagingInfo;
  }

  /**
   * Parse referral orders from text
   */
  private parseReferral(block: string): any {
    console.log("[DraftOrdersModule] Parsing referral from:", block);
    const referralInfo: any = {};

    // Extract specialty
    const specialtyMatch = block.match(
      /\b(?:to|for|with)\s+(?:a\s+)?(\w+(?:\s+\w+)?\s+(?:specialist|doctor|physician|surgeon|clinic|consultation))/i,
    );
    if (specialtyMatch) {
      referralInfo.specialty = specialtyMatch[1].trim();
    } else {
      referralInfo.specialty = "Specialist";
    }

    // Extract reason/indication
    const reasonMatch = block.match(
      /\b(?:for|to|regarding|due to|because of)\s+(.*?)(?:\s*$)/i,
    );
    if (reasonMatch) {
      referralInfo.reason = reasonMatch[1].trim();
    }

    // Store full text as provider notes
    referralInfo.provider_notes = block.trim();

    console.log("[DraftOrdersModule] Parsed referral:", referralInfo);
    return referralInfo;
  }

  /**
   * Save draft orders to the database
   * Enhanced to fix first-time display issues and ensure immediate visibility
   * The key issue is that draft orders don't appear after first creation
   */
  async saveDraftOrders(orders: any[], onMessage: (event: any) => void) {
    try {
      console.log(
        "[DraftOrdersModule] Saving draft orders - Full payload data:",
      );
      console.log("Orders:", JSON.stringify(orders, null, 2));
      console.log("Patient ID:", this.patientChart?.patient_id);

      // CRITICAL FIX: Ensure we ALWAYS have a patient ID before proceeding
      // This is the key fix for orders not appearing on first attempt
      if (!this.patientChart?.patient_id) {
        console.error(
          "[DraftOrdersModule] ERROR: Missing patient ID during save operation",
        );
        console.error(
          "[DraftOrdersModule] Module not properly initialized before saving orders",
        );

        // Comprehensive auto-recovery - Check multiple sources
        // 1. First check if any order has a patient_id
        const patientIdFromOrder = orders.find(
          (order) => order.patient_id,
        )?.patient_id;

        // 2. Fall back to window.patientId if available (from React context)
        //@ts-ignore - Accessing global variable that might be set in browser
        const patientIdFromWindow =
          typeof window !== "undefined" ? window.patientId : null;

        // 3. Parse from URL as last resort
        let patientIdFromUrl = null;
        if (typeof window !== "undefined") {
          const urlMatch = window.location.pathname.match(/\/patients\/(\d+)/);
          if (urlMatch && urlMatch[1]) {
            patientIdFromUrl = parseInt(urlMatch[1], 10);
          }
        }

        // Use the first available source
        const effectivePatientId =
          patientIdFromOrder || patientIdFromWindow || patientIdFromUrl;

        if (effectivePatientId) {
          console.log(
            "[DraftOrdersModule] Auto-recovery: Found patient ID:",
            effectivePatientId,
          );
          this.patientChart = { patient_id: effectivePatientId };
        } else {
          console.error(
            "[DraftOrdersModule] Auto-recovery failed, creating direct orders instead",
          );
          // Instead of failing, we'll use the direct API approach
          // Create each order via direct API
          const results = [];
          for (const order of orders) {
            try {
              const response = await fetch("/api/orders", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(order),
              });

              if (response.ok) {
                const result = await response.json();
                results.push(result);
              }
            } catch (directApiError) {
              console.error(
                "[DraftOrdersModule] Direct API error:",
                directApiError,
              );
            }
          }

          if (results.length > 0) {
            console.log(
              "[DraftOrdersModule] Created orders via direct API:",
              results.length,
            );
            onMessage({
              type: "draft_orders.saved",
              payload: { orders: results, refresh: true },
            });

            // Dispatch event to notify UI
            if (typeof window !== "undefined") {
              window.dispatchEvent(
                new CustomEvent("draft-orders-refreshed", {
                  detail: { orders: results, patientId: results[0].patient_id },
                }),
              );
            }

            return results;
          }

          throw new Error(
            "Module not initialized with patient data. Cannot save orders.",
          );
        }
      }

      // Mark each order with the patient ID explicitly to ensure proper database storage
      const ordersWithPatientId = orders.map((order) => ({
        ...order,
        patient_id: this.patientChart.patient_id,
      }));

      const payload = {
        orders: ordersWithPatientId,
        patient_id: this.patientChart.patient_id,
      };

      console.log(
        "[DraftOrdersModule] Final API payload:",
        JSON.stringify(payload, null, 2),
      );

      // CRITICAL FIX: Save orders and ensure immediate UI refresh
      const response = await fetch("/api/orders/draft/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // Include credentials for session cookie
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to save draft orders: ${errorText}`);
      }

      const data = await response.json();
      console.log("[DraftOrdersModule] Draft orders saved:", data);

      // CRITICAL FIX PART 1: Get all current draft orders directly to ensure a complete set is available
      let allOrders = [];
      try {
        const patientId = this.patientChart.patient_id;
        const fetchResponse = await fetch(
          `/api/patients/${patientId}/orders/draft`,
          {
            method: "GET",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
          },
        );

        if (fetchResponse.ok) {
          allOrders = await fetchResponse.json();
          console.log(
            `[DraftOrdersModule] Successfully retrieved all draft orders for complete refresh:`,
            allOrders.length,
          );

          // Broadcast to all listeners that orders have been updated
          if (typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent("draft-orders-refreshed", {
                detail: { orders: allOrders, patientId },
              }),
            );
          }
        }
      } catch (fetchError) {
        console.error(
          "[DraftOrdersModule] Error fetching all orders after save:",
          fetchError,
        );
      }

      // CRITICAL FIX PART 2: Schedule a follow-up refresh to ensure UI consistency
      setTimeout(async () => {
        try {
          const patientId = this.patientChart.patient_id;
          const delayedResponse = await fetch(
            `/api/patients/${patientId}/orders/draft`,
          );

          if (delayedResponse.ok) {
            const delayedOrders = await delayedResponse.json();
            console.log(
              `[DraftOrdersModule] Delayed refresh found ${delayedOrders.length} orders`,
            );

            // Broadcast again to ensure UI is in sync
            if (typeof window !== "undefined") {
              window.dispatchEvent(
                new CustomEvent("draft-orders-refreshed", {
                  detail: { orders: delayedOrders, patientId },
                }),
              );
            }
          }
        } catch (delayedError) {
          console.error(
            "[DraftOrdersModule] Error in delayed refresh:",
            delayedError,
          );
        }
      }, 500);

      // Original callback with the saved data
      onMessage({
        type: "draft_orders.saved",
        payload: {
          orders: allOrders.length > 0 ? allOrders : data,
          refresh: true,
        },
      });

      return data;
    } catch (error) {
      console.error("[DraftOrdersModule] Error saving draft orders:", error);
      throw error;
    }
  }

  /**
   * Force fetch draft orders directly from the API to ensure latest data
   * This is crucial for first-time display of orders
   */
  private async forceFetchDraftOrders() {
    if (!this.patientChart?.patient_id) {
      console.error(
        "[DraftOrdersModule] Cannot fetch orders without patient ID",
      );
      return;
    }

    try {
      console.log(
        "[DraftOrdersModule] Performing direct fetch of draft orders",
      );
      const patientId = this.patientChart.patient_id;

      const response = await fetch(`/api/patients/${patientId}/orders/draft`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      if (!response.ok) {
        console.warn(
          "[DraftOrdersModule] Direct order fetch failed:",
          response.status,
        );
        return;
      }

      const data = await response.json();
      console.log(
        `[DraftOrdersModule] Direct fetch found ${data.length || 0} orders`,
      );

      // Dispatch an event that the component can listen for
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("draft-orders-updated", {
            detail: { orders: data, patientId },
          }),
        );
      }

      return data;
    } catch (error) {
      console.error(
        "[DraftOrdersModule] Error in force-fetch of draft orders:",
        error,
      );
    }
  }

  /**
   * Set the patient chart data for reference during order processing
   * Enhanced to specifically handle Method B encounters (opened directly from chart)
   */
  setPatientChart(chart: any) {
    // Deep clone to avoid reference issues
    this.patientChart = JSON.parse(JSON.stringify(chart));

    // Check if this is a Method B encounter by inspecting metadata
    const isMethodB =
      chart?.metadata?.from_chart === true ||
      chart?.metadata?.source === "method_b_from_chart" ||
      chart?.metadata?.isMethodB === true;

    // For Method B encounters, we need extra initialization steps
    if (isMethodB) {
      console.log(
        "[DraftOrdersModule] Detected Method B encounter (from chart), performing enhanced initialization",
      );

      // Ensure patient_id is available - this is the key issue with Method B
      if (!this.patientChart.patient_id && chart.id) {
        // Get patient ID from any available source
        this.patientChart.patient_id =
          chart.patient_id ||
          chart.visit?.patient_id ||
          chart.metadata?.patient_id;

        console.log(
          "[DraftOrdersModule] Added missing patient_id for Method B:",
          this.patientChart.patient_id,
        );
      }

      // Force an early refresh of draft orders via the API
      this.refreshDraftOrders(this.patientChart.patient_id);
    } else {
      console.log("[DraftOrdersModule] Standard patient chart set (Method A)");
    }
  }

  /**
   * Force a refresh of draft orders directly from the API
   * This helps ensure consistency with Method B encounters
   */
  private async refreshDraftOrders(patientId: number) {
    if (!patientId) {
      console.error(
        "[DraftOrdersModule] Cannot refresh draft orders without patient ID",
      );
      return;
    }

    try {
      console.log(
        "[DraftOrdersModule] Forcing direct refresh of draft orders for patient:",
        patientId,
      );

      // Make direct API call to get latest orders
      const response = await fetch(`/api/patients/${patientId}/orders/draft`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      if (!response.ok) {
        console.warn(
          "[DraftOrdersModule] Draft orders refresh failed:",
          response.status,
        );
        return;
      }

      const data = await response.json();
      console.log(
        "[DraftOrdersModule] Refreshed draft orders:",
        data.length || 0,
        "orders found",
      );
    } catch (error) {
      console.error(
        "[DraftOrdersModule] Error refreshing draft orders:",
        error,
      );
    }
  }

  /**
   * Check if the module is properly initialized with patient data
   * @returns {boolean} Whether the module is initialized
   */
  isInitialized(): boolean {
    const isInitialized = !!this.patientChart && !!this.patientChart.patient_id;
    console.log("[DraftOrdersModule] Initialization check:", {
      isInitialized,
      hasPatientChart: !!this.patientChart,
      patientId: this.patientChart?.patient_id,
    });
    return isInitialized;
  }

  /**
   * Format provider notes based on order type
   * Medications get special formatting with dosage and frequency
   */
  private formatProviderNotes(order: any) {
    if (order.order_type === "medication") {
      return `${order.medication_name || ""} ${order.dosage || ""}\nSig: ${order.sig || ""}\nDispense: ${order.quantity || 0} tablets\nRefills: ${order.refills || 0}`;
    }
    return order.provider_notes;
  }

  /**
   * Update an existing order
   * Handles timestamp normalization and API communication
   */
  private updateQueue = new Map<number, Promise<any>>();

  async updateOrder(orderId: number, orderData: any) {
    console.log("[DraftOrdersModule] === Lab Order Update Start ===");
    console.log("[DraftOrdersModule] Order ID:", orderId);
    console.log(
      "[DraftOrdersModule] Pre-update Data:",
      JSON.stringify(orderData, null, 2),
    );
    console.log(
      "[DraftOrdersModule] Queue status:",
      this.updateQueue.has(orderId)
        ? "Update in progress"
        : "No pending updates",
    );
    console.log("[DraftOrdersModule] Lab fields before update:", {
      lab_name: orderData.lab_name,
      test_name: orderData.test_name,
    });

    if (this.updateQueue.has(orderId)) {
      try {
        await this.updateQueue.get(orderId);
      } catch (error) {
        console.warn("[DraftOrdersModule] Previous update failed:", error);
      }
    }

    // Create a new update promise
    const updatePromise = (async () => {
      try {
        console.log("[DraftOrdersModule] === Update Order Start ===");
        console.log("Order ID:", orderId);
        console.log("Order Data:", orderData);

        // Debounce the update by waiting briefly
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Ensure lab fields are preserved
        const cleanedData = {
          ...orderData,
          created_at: orderData.created_at
            ? new Date(orderData.created_at).toISOString()
            : null,
          updated_at: new Date().toISOString(),
          prescription_date: orderData.prescription_date
            ? new Date(orderData.prescription_date).toISOString()
            : null,
        };

        // Preserve lab fields without modification for lab orders
        if (orderData.order_type === "lab") {
          cleanedData.lab_name = orderData.lab_name;
          cleanedData.test_name = orderData.test_name;
        }

        console.log(
          "[DraftOrdersModule] Cleaned data for update:",
          cleanedData,
        );

        console.log(
          "[DraftOrdersModule] Sending update request:",
          JSON.stringify(cleanedData, null, 2),
        );

        const response = await fetch(`/api/orders/${orderId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(cleanedData),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `Order update failed: ${response.status} - ${errorText}`,
          );
        }

        const data = await response.json();
        console.log(
          "[DraftOrdersModule] API Response:",
          JSON.stringify(data, null, 2),
        );
        console.log("[DraftOrdersModule] Lab fields after update:", {
          lab_name: data.lab_name,
          test_name: data.test_name,
        });
        return data;
      } catch (error) {
        console.error("[DraftOrdersModule] Order update failed:", error);
        throw error;
      } finally {
        // Remove this update from the queue when done
        this.updateQueue.delete(orderId);
      }
    })();

    // Add the promise to the queue
    this.updateQueue.set(orderId, updatePromise);

    // Return the update promise
    return updatePromise;
  }

  /**
   * Process a batch of medication orders and save them to the database
   */
  /**
   * Create a manual order directly from the UI
   * Handles different order types and returns the created order
   */
  async createManualOrder(orderData: any, patientId?: number) {
    try {
      console.log(
        "[DraftOrdersModule] Creating manual order:",
        JSON.stringify(orderData, null, 2),
      );

      // Use the provided patientId parameter if available, otherwise fall back to the chart
      const effectivePatientId = patientId || this.patientChart?.patient_id;

      console.log(
        "[DraftOrdersModule] Using patient ID:",
        effectivePatientId,
        "Chart patient ID:",
        this.patientChart?.patient_id,
      );

      if (!effectivePatientId) {
        throw new Error(
          "Patient ID not provided and patient chart not set. Cannot create order without patient ID.",
        );
      }

      // Convert patient ID to number to ensure consistent type
      const patientIdNumber =
        typeof effectivePatientId === "string"
          ? parseInt(effectivePatientId, 10)
          : effectivePatientId;

      if (isNaN(patientIdNumber)) {
        throw new Error(`Invalid patient ID: ${effectivePatientId}`);
      }

      console.log(
        "[DraftOrdersModule] Using parsed patient ID:",
        patientIdNumber,
      );

      // Verify order has required fields based on type
      if (orderData.order_type === "medication" && !orderData.medication_name) {
        console.warn(
          "[DraftOrdersModule] Warning: Order missing medication name, setting default",
        );
        orderData.medication_name = "Unknown Medication";
      }

      // Prepare order with patient ID and ensure all required fields
      const orderWithPatientId = {
        ...orderData,
        patient_id: patientIdNumber,
        order_status: orderData.order_status || "draft",
        order_type: orderData.order_type || "medication",
        created_at: new Date(),
        updated_at: new Date(),
      };

      // Add default values based on order type
      if (
        orderWithPatientId.order_type === "medication" &&
        !orderWithPatientId.medication_name
      ) {
        orderWithPatientId.medication_name = "Unknown Medication";
      } else if (
        orderWithPatientId.order_type === "lab" &&
        !orderWithPatientId.test_name
      ) {
        orderWithPatientId.test_name = "CBC";
        orderWithPatientId.lab_name = "Laboratory";
      } else if (
        orderWithPatientId.order_type === "imaging" &&
        !orderWithPatientId.test_name
      ) {
        orderWithPatientId.test_name = "CXR";
        orderWithPatientId.study_type = "CXR";
      }

      // Ensure nullable fields are explicitly null rather than undefined for DB compatibility
      const nullableFields = [
        "dosage",
        "form",
        "frequency",
        "duration",
        "quantity",
        "refills",
        "sig",
        "pharmacy_notes",
        "prescription_date",
        "test_name",
        "lab_name",
        "region",
        "study_type",
        "provider_notes",
      ];

      nullableFields.forEach((field) => {
        if (orderWithPatientId[field] === undefined) {
          orderWithPatientId[field] = null;
        }
      });

      // Set default values for important medication fields if needed
      if (orderWithPatientId.order_type === "medication") {
        if (
          orderWithPatientId.quantity === undefined ||
          orderWithPatientId.quantity === null
        ) {
          orderWithPatientId.quantity = 30; // Default quantity
        }
        if (
          orderWithPatientId.refills === undefined ||
          orderWithPatientId.refills === null
        ) {
          orderWithPatientId.refills = 0; // Default refills
        }
        if (!orderWithPatientId.form) {
          orderWithPatientId.form = "tablet"; // Default form
        }
      }

      // Format numeric fields properly
      if (orderWithPatientId.order_type === "medication") {
        // Ensure quantity and refills are numbers, not strings
        if (typeof orderWithPatientId.quantity === "string") {
          orderWithPatientId.quantity =
            parseInt(orderWithPatientId.quantity) || 30;
        }

        if (typeof orderWithPatientId.refills === "string") {
          orderWithPatientId.refills =
            parseInt(orderWithPatientId.refills) || 0;
        }

        // Make sure quantity and refills are explicitly numbers (not null or undefined)
        orderWithPatientId.quantity = orderWithPatientId.quantity || 30;
        orderWithPatientId.refills = orderWithPatientId.refills || 0;
      }

      console.log(
        "[DraftOrdersModule] Final order payload:",
        JSON.stringify(orderWithPatientId, null, 2),
      );

      // Send to batch endpoint as a single item array
      const payload = {
        orders: [orderWithPatientId],
        patient_id: patientIdNumber,
      };

      console.log(
        "[DraftOrdersModule] Sending batch payload to /api/orders/draft/batch:",
        JSON.stringify(payload, null, 2),
      );

      // Try direct API route without using the router
      const directEndpoint = "/api/orders/draft/batch";
      console.log(
        `[DraftOrdersModule] Using direct endpoint: ${directEndpoint}`,
      );

      const response = await fetch(directEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        credentials: "include", // Include credentials for session cookie
        body: JSON.stringify(payload),
      });

      // Log response status
      console.log(
        "[DraftOrdersModule] API response status:",
        response.status,
        response.statusText,
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[DraftOrdersModule] API error response:", errorText);

        try {
          // Try to parse error as JSON for more details
          const errorJson = JSON.parse(errorText);
          console.error("[DraftOrdersModule] Structured error:", errorJson);
          throw new Error(
            `Failed to create order: ${errorJson.error || errorJson.message || "Unknown error"}`,
          );
        } catch (e) {
          // If not JSON, use text as is
          throw new Error(`Failed to create order: ${errorText}`);
        }
      }

      let data;
      try {
        // First try to get response as JSON directly
        data = await response.json();
      } catch (e) {
        console.warn(
          "[DraftOrdersModule] Could not parse response as JSON directly, trying text then parse",
        );

        // Fallback to getting as text then parsing
        const responseText = await response.text();
        console.log("[DraftOrdersModule] API response text:", responseText);

        try {
          data = JSON.parse(responseText);
        } catch (parseError) {
          console.error(
            "[DraftOrdersModule] Error parsing API response as JSON:",
            parseError,
          );
          throw new Error("Invalid JSON response from server");
        }
      }

      console.log("[DraftOrdersModule] Order created successfully:", data);

      // Verify the response contains something usable
      if (!data) {
        throw new Error("Server returned empty response");
      }

      // Perform a verification query to confirm the order was saved
      try {
        console.log(
          "[DraftOrdersModule] Verifying order was saved in database",
        );
        const verifyResponse = await fetch(
          `/api/patients/${patientIdNumber}/orders/draft`,
        );
        if (verifyResponse.ok) {
          const orders = await verifyResponse.json();
          console.log(
            `[DraftOrdersModule] Verification found ${orders.length} orders for patient`,
          );
        }
      } catch (verifyError) {
        console.warn(
          "[DraftOrdersModule] Order verification failed, but continuing:",
          verifyError,
        );
      }

      return Array.isArray(data) ? data[0] : data;
    } catch (error) {
      console.error("[DraftOrdersModule] Error creating manual order:", error);
      throw error;
    }
  }

  async processAndSaveMedicationList(
    medicationText: string,
    onMessage: (event: any) => void,
  ) {
    try {
      console.log(
        "[DraftOrdersModule] Processing medication list with GPT:",
        medicationText,
      );

      // Skip processing if no text is provided
      if (!medicationText || medicationText.trim().length === 0) {
        console.warn("[DraftOrdersModule] No medication text provided");
        return [];
      }

      // Use GPT-powered medication parsing API
      const apiStartTime = Date.now();
      const response = await fetch("/api/parse-medications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ medicationText }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          "[DraftOrdersModule] Error from medication parsing API:",
          errorText,
        );
        throw new Error(`Failed to parse medications with GPT: ${errorText}`);
      }

      const parsedMedications = await response.json();
      const apiEndTime = Date.now();

      console.log(
        "[DraftOrdersModule] GPT parsed medications:",
        parsedMedications,
      );
      console.log(
        `[DraftOrdersModule] Medication parsing took ${apiEndTime - apiStartTime}ms`,
      );

      // If no medications were parsed successfully, fall back to regex parsing
      if (!parsedMedications || parsedMedications.length === 0) {
        console.warn(
          "[DraftOrdersModule] GPT parsing returned no results, falling back to regex parsing",
        );

        // Split text into medication blocks (one medication per paragraph)
        const medicationBlocks = medicationText
          .split("\n\n")
          .filter((block) => block.trim().length > 0);

        // Parse each medication block using regex
        const orders = medicationBlocks
          .map((block) => {
            const medication = this.parseMedication(block);
            return {
              order_type: "medication",
              order_status: "draft",
              ...medication,
            };
          })
          .filter(Boolean);

        if (orders.length > 0) {
          // Save the parsed medications
          return await this.saveDraftOrders(orders, onMessage);
        }

        return [];
      }

      // Add patient_id to each medication order
      const ordersWithPatientId = parsedMedications.map((med: any) => ({
        ...med,
        patient_id: this.patientChart?.patient_id,
        provider_notes: this.formatMedicationNote(med),
      }));

      if (ordersWithPatientId.length > 0) {
        // Save the parsed medications
        return await this.saveDraftOrders(ordersWithPatientId, onMessage);
      }

      return [];
    } catch (error) {
      console.error(
        "[DraftOrdersModule] Error processing medication list:",
        error,
      );
      throw error;
    }
  }

  /**
   * Format a medication order into a standardized provider note
   * @param medication The parsed medication object
   * @returns Formatted provider note text
   */
  private formatMedicationNote(medication: any): string {
    const parts = [
      `${medication.medication_name} ${medication.dosage}`,
      `Sig: ${medication.sig}`,
      `Dispense: ${medication.quantity} ${medication.form}s`,
      `Refills: ${medication.refills}`,
    ];

    // Add optional fields if present
    if (medication.route_of_administration) {
      parts.push(`Route: ${medication.route_of_administration}`);
    }

    if (medication.days_supply) {
      parts.push(`Days Supply: ${medication.days_supply}`);
    }

    if (medication.diagnosis_code) {
      parts.push(`Diagnosis: ${medication.diagnosis_code}`);
    }

    if (medication.requires_prior_auth) {
      parts.push(`Requires Prior Authorization: Yes`);
      if (medication.prior_auth_number) {
        parts.push(`Prior Auth #: ${medication.prior_auth_number}`);
      }
    }

    return parts.join("\n");
  }
}
