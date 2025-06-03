import express from "express";
import { db } from "@db";
import { orders as orderTable, labOrderTemplates } from "@db/schema";
import { eq, and } from "drizzle-orm";
import { OrderPrintService } from "../services/orderPrintService";
import path from "path";
import fs from "fs";
import { parseMedicationsWithGPT } from "../services/medication-parser-service";

// Helper function to parse a single medication string
interface ParsedMedication {
  name: string;
  dosage: string;
  frequency: string;
  quantity: number;
  refills: number;
  sig: string;
}

function parseMedication(medicationText: string): ParsedMedication | null {
  if (!medicationText) return null;

  try {
    // Simple parsing logic - this would be enhanced with GPT in production
    const parts = medicationText.split(",").map((p) => p.trim());

    // Default values
    const result: ParsedMedication = {
      name: parts[0] || "Unknown Medication",
      dosage: "",
      frequency: "daily",
      quantity: 30,
      refills: 0,
      sig: "Take as directed",
    };

    // Try to extract dosage
    const dosageMatch = parts[0].match(/\d+\s*mg|\d+\s*mcg|\d+\s*ml/i);
    if (dosageMatch) {
      result.dosage = dosageMatch[0];
      result.name = parts[0].replace(dosageMatch[0], "").trim();
    }

    // Look for quantity
    if (parts.length > 1) {
      const quantityMatch = parts[1].match(/\d+/);
      if (quantityMatch) {
        result.quantity = parseInt(quantityMatch[0]);
      }
    }

    // Look for refills
    if (parts.length > 2) {
      const refillsMatch = parts[2].match(/refills?\s*[:=]?\s*(\d+)/i);
      if (refillsMatch && refillsMatch[1]) {
        result.refills = parseInt(refillsMatch[1]);
      }
    }

    // Generate sig if enough information
    if (result.dosage) {
      result.sig = `Take ${result.dosage} ${result.frequency}`;
    }

    console.log("[parseMedication] Parsed medication:", result);
    return result;
  } catch (error) {
    console.error("[parseMedication] Error parsing medication:", error);
    return null;
  }
}

const router = express.Router();

// Get all signatures
router.get("/signatures", async (req, res) => {
  try {
    const signatures = await OrderPrintService.getSignatures();
    res.json({ signatures });
  } catch (error) {
    console.error("Error fetching signatures:", error);
    res.status(500).json({ error: "Failed to fetch signatures" });
  }
});

// Add a signature
router.post("/signature", async (req, res) => {
  try {
    const { signature } = req.body;
    if (!signature) {
      return res.status(400).json({ error: "Signature data is required" });
    }
    const id = await OrderPrintService.addSignature(signature);
    res.json({ message: "Signature saved successfully", id });
  } catch (error) {
    console.error("Error saving signature:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to save signature";
    res.status(500).json({ error: errorMessage });
  }
});

// Delete a signature
router.delete("/signature/:id", async (req, res) => {
  try {
    await OrderPrintService.deleteSignature(req.params.id);
    res.json({ message: "Signature deleted successfully" });
  } catch (error) {
    console.error("Error deleting signature:", error);
    res.status(500).json({ error: "Failed to delete signature" });
  }
});

// Sign a group of orders and generate combined PDF
router.post("/sign-group", async (req, res) => {
  try {
    console.log(
      "[OrdersRoute] Signing group of orders:",
      JSON.stringify(req.body, null, 2),
    );
    const { orders: orderList, patientId } = req.body;

    if (!orderList || !Array.isArray(orderList) || orderList.length === 0) {
      return res.status(400).json({ error: "Invalid orders list" });
    }

    console.log(
      `[OrdersRoute] Processing ${orderList.length} orders for final signature`,
    );

    // Get all orders that are in pending status
    let ordersToSign = orderList;

    // If no orders were explicitly provided, find all pending orders for this patient
    if (orderList.length === 0 && patientId) {
      const pendingOrders = await db
        .select()
        .from(orderTable)
        .where(
          and(
            eq(orderTable.patient_id, parseInt(patientId)),
            eq(orderTable.order_status, "pending"),
          ),
        );

      console.log(
        `[OrdersRoute] Found ${pendingOrders.length} pending orders for patient ${patientId}`,
      );
      ordersToSign = pendingOrders;
    }

    if (ordersToSign.length === 0) {
      return res.status(400).json({ error: "No orders to sign" });
    }

    // Update all orders to approved status
    for (const order of ordersToSign) {
      if (order.order_type === "lab") {
        // Get lab template info if needed
        const template = await db
          .select({
            loinc_code: labOrderTemplates.loinc_code,
            collection_instructions: labOrderTemplates.collection_instructions,
            specimen_type: labOrderTemplates.specimen_type,
            test_name: labOrderTemplates.test_name,
          })
          .from(labOrderTemplates)
          .where(eq(labOrderTemplates.lab_name, order.lab_name))
          .limit(1);

        console.log(`[OrdersRoute] Signing lab order ${order.id}`);

        await db
          .update(orderTable)
          .set({
            order_status: "approved",
            prescription_date: new Date(),
            test_name: template[0]?.test_name || order.lab_name,
            provider_notes:
              template[0]?.collection_instructions || order.provider_notes,
          })
          .where(eq(orderTable.id, order.id));
      } else {
        console.log(
          `[OrdersRoute] Signing ${order.order_type} order ${order.id}`,
        );

        await db
          .update(orderTable)
          .set({
            order_status: "approved",
            prescription_date: new Date(),
          })
          .where(eq(orderTable.id, order.id));
      }
    }

    // Generate PDFs for each order type
    const pdfFileNames =
      await OrderPrintService.generateAllOrdersPDF(ordersToSign);

    // Create URLs for generated PDFs
    const pdfUrls = pdfFileNames.map((fileName) => `/orders/${fileName}`);

    // If we have a single PDF, set it as pdfUrl for backward compatibility
    const response = {
      success: true,
      pdfUrls: pdfUrls,
      signedOrders: ordersToSign.length,
    };

    if (pdfUrls.length === 1) {
      response.pdfUrl = pdfUrls[0];
    }

    console.log(
      `[OrdersRoute] Successfully signed ${ordersToSign.length} orders`,
    );
    res.json(response);
  } catch (error) {
    console.error("Error signing group orders:", error);
    res.status(500).json({ error: "Failed to sign orders" });
  }
});

// Update order status and create prescription details
router.post("/:id/approve", async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    const order = await db.query.orders.findFirst({
      where: eq(orderTable.id, orderId),
    });

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    if (order.order_type === "medication") {
      console.log("[OrdersRoute] Processing medication order:", order);

      if (!order.medication_name && order.provider_notes) {
        console.log(
          "[OrdersRoute] Attempting to parse provider notes:",
          order.provider_notes,
        );
        const parsedMed = parseMedication(order.provider_notes);

        if (!parsedMed) {
          console.error("[OrdersRoute] Failed to parse medication string");
          throw new Error("Unable to parse medication string");
        }

        console.log("[OrdersRoute] Successfully parsed medication:", parsedMed);

        await db
          .update(orderTable)
          .set({
            order_status: "approved",
            medication_name: parsedMed.name,
            dosage: parsedMed.dosage,
            frequency: parsedMed.frequency,
            quantity: parsedMed.quantity,
            refills: parsedMed.refills,
            sig: parsedMed.sig,
            prescription_date: new Date(),
          })
          .where(eq(orderTable.id, orderId));
      } else {
        await db
          .update(orderTable)
          .set({
            order_status: "approved",
            prescription_date: new Date(),
          })
          .where(eq(orderTable.id, orderId));
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error approving order:", error);
    res.status(500).json({ error: "Failed to approve order" });
  }
});

// Route for combined prescription PDFs - MUST BE BEFORE THE /:id/print ROUTE FOR PROPER PATH MATCHING
router.get("/combined/:fileName", async (req, res) => {
  try {
    const { fileName } = req.params;

    if (!fileName) {
      return res.status(400).json({ error: "Invalid filename" });
    }

    console.log(`[OrdersRoute] Serving combined prescription for ${fileName}`);

    // Get the order IDs from the global storage
    if (!global.combinedPrescriptionOrders) {
      global.combinedPrescriptionOrders = {};
    }

    const orderIds = global.combinedPrescriptionOrders[fileName];

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(404).json({ error: "Combined prescription not found" });
    }

    console.log(
      `[OrdersRoute] Found order IDs for combined prescription: ${orderIds.join(", ")}`,
    );

    // Get all orders directly from the database
    const ordersData = await Promise.all(
      orderIds.map(async (id) => {
        return await db.query.orders.findFirst({
          where: eq(orderTable.id, id),
        });
      }),
    );

    // Get patient data
    const patientId = ordersData[0]?.patient_id;
    if (!patientId) {
      return res
        .status(404)
        .json({ error: "Could not determine patient ID from orders" });
    }

    // Convert order IDs to numbers if they're strings
    const numericOrderIds = orderIds.map((id) =>
      typeof id === "string" ? parseInt(id) : id,
    );

    console.log(
      `[OrdersRoute] Converting to numeric IDs for PDF generation: ${numericOrderIds.join(", ")}`,
    );

    // Generate PDF using the OrderPrintService's multiple prescription function
    try {
      // Generate the PDF with the OrderPrintService
      const pdfBuffer =
        await OrderPrintService.generateMultiplePrescriptionPDF(
          numericOrderIds,
        );

      // Set the response headers for PDF
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `inline; filename="prescription_${fileName}.pdf"`,
      );

      // Send the PDF to the client
      res.send(pdfBuffer);
      console.log(
        `[OrdersRoute] Successfully sent PDF prescription for ${fileName}`,
      );
    } catch (pdfError) {
      console.error("[OrdersRoute] PDF generation error:", pdfError);
      res.status(500).json({
        error: "Failed to generate PDF prescription",
        details: pdfError instanceof Error ? pdfError.message : "Unknown error",
      });
    }
  } catch (error) {
    console.error("[OrdersRoute] Error generating combined PDF:", error);
    res.status(500).json({
      error: "Failed to generate combined prescription PDF",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

router.get("/:id/print", async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);

    if (isNaN(orderId)) {
      return res.status(400).json({ error: "Invalid order ID" });
    }

    console.log("[OrdersRoute] Generating print PDF for order:", orderId);

    const order = await db.query.orders.findFirst({
      where: eq(orderTable.id, orderId),
    });

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    if (order.order_type !== "medication") {
      return res
        .status(400)
        .json({ error: "Only medication orders can be printed" });
    }

    // Import the OrderPrintService
    const { OrderPrintService } = await import("../services/orderPrintService");

    // Generate PDF using the OrderPrintService
    const pdfBuffer = await OrderPrintService.generatePrescriptionPDF(orderId);

    // Set the response headers for PDF
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="prescription_${orderId}.pdf"`,
    );

    // Stream the PDF to the client
    res.send(pdfBuffer);
  } catch (error) {
    console.error("[OrdersRoute] Error generating print PDF:", error);
    res.status(500).json({
      error: "Failed to generate prescription PDF",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Direct order creation endpoint - handles both individual and batch orders
router.post("/", async (req, res) => {
  try {
    console.log(
      "[OrdersRoute] Direct order creation request:",
      JSON.stringify(req.body, null, 2),
    );

    // Check if this is a single order or batch
    const isBatch = Array.isArray(req.body.orders);

    if (isBatch) {
      // Handle batch orders by delegating to the batch endpoint
      return router.handle(req, res, () => {
        req.url = "/draft/batch";
        router.handle(req, res);
      });
    }

    // Process single order
    const order = req.body;

    if (!order.order_type || !order.patient_id) {
      console.error("[OrdersRoute] Invalid order data:", order);
      return res
        .status(400)
        .json({ error: "Missing required fields: order_type and patient_id" });
    }

    // Format the order to match the database schema
    const formattedOrder = {
      order_type: order.order_type,
      order_status: order.order_status || "draft",
      patient_id: parseInt(order.patient_id),
      provider_notes: order.provider_notes || "",
      created_at: new Date(),
      updated_at: new Date(),
      generated_from_conversation: order.generated_from_conversation || false,
    };

    // Add type-specific fields based on order type
    if (order.order_type === "medication") {
      // For medications, ensure quantity and refills are numbers
      let quantity = order.quantity;
      let refills = order.refills;

      if (typeof quantity === "string") {
        quantity = parseInt(quantity) || 30;
      }

      if (typeof refills === "string") {
        refills = parseInt(refills) || 0;
      }

      Object.assign(formattedOrder, {
        medication_name: order.medication_name || "Unknown Medication",
        dosage: order.dosage || "",
        form: order.form || "tablet",
        route_of_administration: order.route_of_administration || "oral",
        quantity: quantity || 30,
        refills: refills || 0,
        sig: order.sig || "Take as directed",
        days_supply: order.days_supply || 30,
        diagnosis_code: order.diagnosis_code || null,
      });
    } else if (order.order_type === "lab") {
      Object.assign(formattedOrder, {
        lab_name: order.lab_name || "Unknown Lab",
        test_name: order.test_name || order.lab_name,
        priority: order.priority || "routine",
      });
    } else if (order.order_type === "imaging") {
      Object.assign(formattedOrder, {
        study_type: order.study_type || "Unknown Study",
        region: order.region || "",
        priority: order.priority || "routine",
      });
    }

    console.log(
      "[OrdersRoute] Inserting formatted order:",
      JSON.stringify(formattedOrder, null, 2),
    );

    // Insert the order into the database
    const result = await db
      .insert(orderTable)
      .values(formattedOrder)
      .returning();

    console.log("[OrdersRoute] Successfully created order:", result[0]);

    // Return the created order
    res.status(201).json(result[0]);
  } catch (error) {
    console.error("[OrdersRoute] Error creating order:", error);
    res.status(500).json({
      error: "Failed to create order",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Create batch draft orders
router.post("/draft/batch", async (req, res) => {
  try {
    console.log("[DraftOrdersRoute] Starting batch order creation");
    console.log(
      "[DraftOrdersRoute] Request body:",
      JSON.stringify(req.body, null, 2),
    );

    const { orders: orderList, patient_id } = req.body;

    console.log("[DraftOrdersRoute] Patient ID:", patient_id);
    console.log(
      "[DraftOrdersRoute] Order list length:",
      orderList?.length || 0,
    );

    if (!Array.isArray(orderList) || orderList.length === 0) {
      console.error(
        "[DraftOrdersRoute] Received invalid order list:",
        req.body,
      );
      return res.status(400).json({ error: "Invalid or empty order list" });
    }

    // Map each order to match the database schema
    // First fetch all lab templates
    console.log("[DraftOrdersRoute] Fetching lab templates");
    const labTemplates = await db.select().from(labOrderTemplates).execute();
    console.log("[DraftOrdersRoute] Found lab templates:", labTemplates.length);

    console.log("[DraftOrdersRoute] Formatting orders for database insertion");
    const formattedOrders = orderList.map((order, index) => {
      console.log(
        `[DraftOrdersRoute] Processing order ${index + 1}:`,
        JSON.stringify(order, null, 2),
      );

      const baseOrder = {
        order_type: order.order_type,
        order_status: "draft",
        patient_id: order.patient_id || patient_id,
        provider_notes: order.provider_notes || null,
        created_at: new Date(),
        updated_at: new Date(),
        generated_from_conversation: order.generated_from_conversation || false,
      };

      console.log(
        `[DraftOrdersRoute] Base order ${index + 1}:`,
        JSON.stringify(baseOrder, null, 2),
      );

      // Add type-specific fields based on order type
      if (order.order_type === "lab") {
        // Look up template details
        const template = labTemplates.find(
          (t) => t.lab_name?.toLowerCase() === order.lab_name?.toLowerCase(),
        );

        console.log(
          `[DraftOrdersRoute] Lab order ${index + 1}, found template:`,
          !!template,
        );

        return {
          ...baseOrder,
          lab_name: order.lab_name,
          test_name: template?.test_name || order.lab_name,
          loinc_code: template?.loinc_code,
          provider_notes:
            template?.collection_instructions || order.provider_notes,
        };
      }

      if (order.order_type === "medication") {
        console.log(
          `[DraftOrdersRoute] Medication order ${index + 1}, name:`,
          order.medication_name,
        );

        // For medications, ensure quantity and refills are numbers
        let quantity = order.quantity;
        let refills = order.refills;

        if (typeof quantity === "string") {
          quantity = parseInt(quantity) || 0;
        }

        if (typeof refills === "string") {
          refills = parseInt(refills) || 0;
        }

        return {
          ...baseOrder,
          medication_name: order.medication_name,
          dosage: order.dosage,
          form: order.form || "tablet",
          quantity: quantity || 0,
          refills: refills || 0,
          sig: order.sig,
        };
      } else if (order.order_type === "imaging") {
        console.log(
          `[DraftOrdersRoute] Imaging order ${index + 1}, type:`,
          order.study_type,
        );

        return {
          ...baseOrder,
          study_type: order.study_type,
          priority: order.priority || "routine",
        };
      }

      console.log(`[DraftOrdersRoute] Generic order ${index + 1}`);
      return baseOrder;
    });

    // Log the complete order data for debugging
    console.log(
      "[DraftOrdersRoute] Inserting formatted orders:",
      JSON.stringify(formattedOrders, null, 2),
    );

    // Verify that all orders have a valid patient ID
    const invalidOrders = formattedOrders.filter((order) => !order.patient_id);
    if (invalidOrders.length > 0) {
      console.error(
        "[DraftOrdersRoute] Orders missing patient ID:",
        invalidOrders,
      );
      return res
        .status(400)
        .json({ error: "Some orders are missing patient ID" });
    }

    console.log("[DraftOrdersRoute] Starting database insertion");
    // Insert orders in batches to avoid stack overflow
    try {
      // CRITICAL FIX: We were using 'orders' (the raw variable) instead of the actual orders table
      console.log("[DraftOrdersRoute] Database operation:", {
        operation: "insert",
        table: "orderTable",
        tableRef: orderTable ? "valid" : "undefined/null",
      });

      // Generate the SQL query for logging purposes
      const query = db.insert(orderTable).values(formattedOrders).toSQL();

      console.log("[DraftOrdersRoute] SQL query:", query.sql);
      console.log("[DraftOrdersRoute] SQL parameters:", query.params);

      const insertedOrders = await db
        .insert(orderTable) // Use the imported table from schema
        .values(formattedOrders)
        .returning();

      console.log(
        "[DraftOrdersRoute] Successfully inserted orders:",
        insertedOrders.length,
      );
      console.log(
        "[DraftOrdersRoute] Inserted order IDs:",
        insertedOrders.map((o) => o.id),
      );

      return res.json({
        message: "Orders created successfully",
        orders: insertedOrders,
      });
    } catch (dbError) {
      console.error("[DraftOrdersRoute] Database insertion error:", dbError);
      console.error("[DraftOrdersRoute] Error details:", dbError.stack);
      throw dbError;
    }
  } catch (error) {
    console.error("[DraftOrdersRoute] Error creating draft orders:", error);
    console.error("[DraftOrdersRoute] Error stack:", error.stack);
    res
      .status(500)
      .json({ error: "Failed to create draft orders", details: error.message });
  }
});

// Delete all draft orders for a patient
router.delete("/draft/:patientId", async (req, res) => {
  try {
    await db
      .delete(orderTable)
      .where(
        and(
          eq(orderTable.patient_id, parseInt(req.params.patientId)),
          eq(orderTable.order_status, "draft"),
        ),
      );
    res.json({ message: "All draft orders deleted" });
  } catch (error) {
    console.error("Error deleting draft orders:", error);
    res.status(500).json({ error: "Failed to delete draft orders" });
  }
});

// Update order status
router.patch("/:id/status", async (req, res) => {
  try {
    console.log("[OrdersRoute] Updating order status:", {
      orderId: req.params.id,
      status: req.body.status,
    });

    const orderId = parseInt(req.params.id);
    const { status } = req.body;

    if (!status || typeof status !== "string") {
      return res.status(400).json({ error: "Valid status required" });
    }

    // Validate status value
    const validStatuses = [
      "draft",
      "pending",
      "approved",
      "completed",
      "cancelled",
    ];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
      });
    }

    // Find the order first to verify it exists using direct query instead of db.query.orders
    const orders = await db
      .select()
      .from(orderTable)
      .where(eq(orderTable.id, orderId));

    const order = orders[0];

    if (!order) {
      console.log("[OrdersRoute] Order not found with ID:", orderId);
      return res.status(404).json({ error: "Order not found" });
    }

    // Update the order status
    const updatedOrder = await db
      .update(orderTable)
      .set({
        order_status: status,
        updated_at: new Date(),
      })
      .where(eq(orderTable.id, orderId))
      .returning();

    console.log("[OrdersRoute] Status updated successfully:", {
      orderId,
      oldStatus: order.order_status,
      newStatus: status,
    });

    res.json(updatedOrder[0]);
  } catch (error) {
    console.error("[OrdersRoute] Error updating order status:", error);
    res.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : "Failed to update order status",
    });
  }
});

// Delete a single order by ID
router.delete("/:id", async (req, res) => {
  try {
    console.log("[OrdersRoute] Deleting order with ID:", req.params.id);
    const orderId = parseInt(req.params.id);

    if (isNaN(orderId)) {
      return res.status(400).json({ error: "Invalid order ID" });
    }

    // Find the order first to verify it exists
    const order = await db.query.orders.findFirst({
      where: eq(orderTable.id, orderId),
    });

    if (!order) {
      console.log("[OrdersRoute] Order not found with ID:", orderId);
      return res.status(404).json({ error: "Order not found" });
    }

    console.log("[OrdersRoute] Deleting order:", order);

    // Delete the order
    const result = await db
      .delete(orderTable)
      .where(eq(orderTable.id, orderId))
      .returning();

    console.log("[OrdersRoute] Delete result:", result);

    res.json({
      message: "Order deleted successfully",
      deletedOrder: order,
    });
  } catch (error) {
    console.error("[OrdersRoute] Error deleting order:", error);
    res.status(500).json({ error: "Failed to delete order" });
  }
});

// Add PATCH endpoint for updating orders
router.patch("/:id", async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    const updateData = req.body;

    console.log("[OrdersRoute] Starting order update request:", {
      orderId,
      requestBody: req.body,
      orderType: updateData.order_type,
      timestamp: new Date().toISOString(),
    });

    // Log original order state
    const originalOrder = await db.query.orders.findFirst({
      where: eq(orderTable.id, orderId),
    });

    console.log("[OrdersRoute] Original order state:", {
      orderId,
      originalOrder,
      timestamp: new Date().toISOString(),
    });

    // Validate required fields based on order type
    if (updateData.order_type === "medication") {
      if (!updateData.medication_name) {
        return res.status(400).json({ error: "Medication name is required" });
      }
      // Add medication name validation here.  Example:
      // Clean medication name by removing "Medication:" prefix if present
      updateData.medication_name = updateData.medication_name.replace(
        /^Medication:\s*/,
        "",
      );
      if (!/^[a-zA-Z0-9\s]+$/.test(updateData.medication_name)) {
        return res
          .status(400)
          .json({
            error:
              "Medication name must contain only letters, numbers and spaces.",
          });
      }
    }

    // Clean up timestamp fields
    const cleanedData = {
      ...updateData,
      created_at: updateData.created_at
        ? new Date(updateData.created_at)
        : undefined,
      updated_at: new Date(),
      prescription_date: updateData.prescription_date
        ? new Date(updateData.prescription_date)
        : null,
    };

    // Remove undefined values to prevent database errors
    Object.keys(cleanedData).forEach((key) => {
      if (cleanedData[key] === undefined) {
        delete cleanedData[key];
      }
    });

    console.log("[OrdersRoute] Cleaned update data:", cleanedData);

    console.log("[OrdersRoute] Attempting database update with cleaned data:", {
      orderId,
      cleanedData,
      timestamp: new Date().toISOString(),
    });

    // Update the order in the database
    const updatedOrder = await db
      .update(orderTable)
      .set(cleanedData)
      .where(eq(orderTable.id, orderId))
      .returning();

    if (!updatedOrder || updatedOrder.length === 0) {
      console.error("[OrdersRoute] Order update failed - Order not found:", {
        orderId,
        timestamp: new Date().toISOString(),
      });
      return res.status(404).json({ error: "Order not found" });
    }

    console.log("[OrdersRoute] Order update successful:", {
      orderId,
      updatedOrder: updatedOrder[0],
      changes: Object.keys(cleanedData).reduce((acc, key) => {
        if (originalOrder && originalOrder[key] !== cleanedData[key]) {
          acc[key] = {
            from: originalOrder[key],
            to: cleanedData[key],
          };
        }
        return acc;
      }, {}),
      timestamp: new Date().toISOString(),
    });

    res.json(updatedOrder[0]);
  } catch (error) {
    console.error("[OrdersRoute] Error updating order:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to update order",
    });
  }
});

// API endpoint for GPT-powered medication parsing
router.post("/parse-medications", async (req, res) => {
  try {
    const { medicationText, patientId } = req.body;

    if (!medicationText) {
      return res.status(400).json({ error: "Medication text is required" });
    }

    console.log(
      `[Medication Parser] Processing medication text for patient ${patientId || "unknown"}`,
    );

    // Use our GPT-powered medication parser service
    const parsedMedications = await parseMedicationsWithGPT(
      medicationText,
      patientId,
    );

    return res.json(parsedMedications);
  } catch (error) {
    console.error("[Medication Parser API] Error:", error);
    return res.status(500).json({ error: "Failed to parse medications" });
  }
});

// Sign all draft orders for a patient
router.post("/patients/:patientId/sign-all", async (req, res) => {
  try {
    const patientId = parseInt(req.params.patientId);
    const { medicationPreference = "print" } = req.body;

    if (isNaN(patientId)) {
      return res.status(400).json({ error: "Invalid patient ID" });
    }

    if (!["print", "pharmacy"].includes(medicationPreference)) {
      console.warn(
        `[OrdersRoute] Invalid medication preference: ${medicationPreference}, defaulting to 'print'`,
      );
    }

    console.log(
      "[OrdersRoute] Signing all draft orders for patient:",
      patientId,
      `with medication preference: ${medicationPreference}`,
    );

    // Find all draft orders for this patient
    const draftOrders = await db.query.orders.findMany({
      where: and(
        eq(orderTable.patient_id, patientId),
        eq(orderTable.order_status, "draft"),
      ),
    });

    console.log(
      `[OrdersRoute] Found ${draftOrders.length} draft orders to sign`,
    );

    if (draftOrders.length === 0) {
      return res.status(200).json({
        message: "No draft orders to sign",
        count: 0,
        orders: [],
      });
    }

    // Separate medication orders from other orders
    const medicationOrders = draftOrders.filter(
      (order) => order.order_type === "medication",
    );
    const otherOrders = draftOrders.filter(
      (order) => order.order_type !== "medication",
    );

    console.log(
      `[OrdersRoute] Found ${medicationOrders.length} medication orders and ${otherOrders.length} other orders`,
    );

    // Update all orders to approved status
    const updatedOrders = [];
    let pdfUrls = [];
    let sentToPharmacy = 0;

    // Process medication orders based on preference
    if (medicationOrders.length > 0) {
      if (medicationPreference === "print") {
        try {
          // First update all medication orders to approved status
          for (const order of medicationOrders) {
            const result = await db
              .update(orderTable)
              .set({
                order_status: "approved",
                updated_at: new Date(),
              })
              .where(eq(orderTable.id, order.id))
              .returning();

            if (result.length > 0) {
              updatedOrders.push(result[0]);
            }
          }

          // Get all medication order IDs
          const medicationOrderIds = medicationOrders.map((order) => order.id);

          // Import the OrderPrintService
          const { OrderPrintService } = await import(
            "../services/orderPrintService"
          );

          // Generate a single combined prescription for all medication orders
          if (medicationOrderIds.length > 0) {
            try {
              // Create a timestamp to make filename unique
              const timestamp = Date.now();
              const fileName = `combined_rx_${patientId}_${timestamp}.html`;

              // Generate combined prescription using new service
              console.log(
                `[OrdersRoute] Generating combined prescription for orders: ${medicationOrderIds.join(", ")}`,
              );

              // Create a single file path for the combined prescription
              const pdfUrl = `/api/orders/combined/${fileName}`;
              pdfUrls = [pdfUrl];

              // Store the order IDs for later retrieval when the prescription is requested
              // This could be stored in a database or cache in a production environment
              if (!global.combinedPrescriptionOrders) {
                global.combinedPrescriptionOrders = {};
              }
              global.combinedPrescriptionOrders[fileName] = medicationOrderIds;

              console.log(
                `[OrdersRoute] Created combined prescription URL: ${pdfUrl}`,
              );
            } catch (pdfError) {
              console.error(
                "[OrdersRoute] Error generating combined PDF:",
                pdfError,
              );
            }
          }
        } catch (error) {
          console.error(
            "[OrdersRoute] Error processing medication orders:",
            error,
          );
        }
      } else if (medicationPreference === "pharmacy") {
        // Send to pharmacy API
        for (const order of medicationOrders) {
          try {
            // Set the order to approved status
            const result = await db
              .update(orderTable)
              .set({
                order_status: "approved",
                updated_at: new Date(),
              })
              .where(eq(orderTable.id, order.id))
              .returning();

            if (result.length > 0) {
              updatedOrders.push(result[0]);
            }

            // Here you would call your pharmacy e-prescribing API
            // For now, we'll just log that it was sent to the pharmacy
            console.log(
              `[OrdersRoute] Sending prescription to pharmacy for order ${order.id}`,
            );
            sentToPharmacy++;
          } catch (error) {
            console.error(
              `[OrdersRoute] Error sending order ${order.id} to pharmacy:`,
              error,
            );
          }
        }
      }
    }

    // Process other types of orders (labs, imaging, etc.)
    for (const order of otherOrders) {
      const result = await db
        .update(orderTable)
        .set({
          order_status: "approved",
          updated_at: new Date(),
        })
        .where(eq(orderTable.id, order.id))
        .returning();

      if (result.length > 0) {
        updatedOrders.push(result[0]);
      }
    }

    console.log(
      `[OrdersRoute] Successfully signed ${updatedOrders.length} orders`,
    );

    // Format response to be consistent with single order printing
    const response = {
      success: true,
      message: `Successfully signed ${updatedOrders.length} orders`,
      count: updatedOrders.length,
      orders: updatedOrders,
      pdfUrls: pdfUrls, // Don't modify the URLs - they're already properly formatted
      sentToPharmacy: sentToPharmacy,
    };

    // Add pdfUrl property for single PDF compatibility with client code
    const responseWithPdfUrl: any = response;
    if (pdfUrls.length === 1) {
      // Make sure to use the correct URL format without changing it
      responseWithPdfUrl.pdfUrl = pdfUrls[0];
    }

    console.log(
      "[OrdersRoute] Sending PDF response to client:",
      responseWithPdfUrl,
    );
    return res.status(200).json(responseWithPdfUrl);
  } catch (error) {
    console.error("[OrdersRoute] Error signing all orders:", error);
    return res.status(500).json({
      error: "Failed to sign all orders",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Helper function to generate a prescription PDF
async function generatePrescriptionPDF(orderId: number) {
  try {
    // Call the existing print endpoint logic
    const order = await db.query.orders.findFirst({
      where: eq(orderTable.id, orderId),
    });

    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

    // Generate a PDF URL (simplified version - in production this would create a real PDF)
    // This simulates what your existing /orders/:id/print endpoint does
    const pdfUrl = `/api/orders/${orderId}/print-output.pdf`;

    // Return a properly formed URL that matches what the client expects
    return {
      success: true,
      pdfUrl: `/api/orders/${orderId}/print`,
    };
  } catch (error) {
    console.error(`[OrdersRoute] PDF generation error:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export default router;
