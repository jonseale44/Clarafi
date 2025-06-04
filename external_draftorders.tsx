//===============================================
// DRAFT ORDERS COMPONENT - Main Section Headers
//===============================================

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, X, Plus, Printer, RotateCcw } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { DraftOrdersModule } from "@/utils/modules/DraftOrdersModule";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface Order {
  id: number;
  order_type: string;
  order_status: string;
  reference_id: number | null;
  provider_notes: string | null;

  // Medication specific fields
  medication_name?: string;
  dosage?: string;
  quantity?: number;
  sig?: string;
  refills?: number;
  form?: string;
  route_of_administration?: string;
  days_supply?: number;
  diagnosis_code?: string;
  requires_prior_auth?: boolean;
  prior_auth_number?: string;

  // Lab specific fields
  lab_name?: string;
  test_name?: string;
  priority?: string;

  // Imaging specific fields
  study_type?: string;
  region?: string;
  amount?: string | number;

  // Required for API calls
  patient_id?: number;
}

interface DraftOrdersProps {
  patientId: number;
  draftOrdersModule: DraftOrdersModule | null;
  isRecordingStarted: Boolean;
}

export function DraftOrders({
  patientId,
  isRecordingStarted,
  draftOrdersModule,
}: DraftOrdersProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [pendingOrders, setPendingOrders] = useState<Set<number>>(new Set());
  const [hasPendingOrders, setHasPendingOrders] = useState<boolean>(false);
  const [labTemplates, setLabTemplates] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [moduleInitialized, setModuleInitialized] = useState<boolean>(false);
  const [parsedMedications, setParsedMedications] = useState<any[]>([]);
  const [parsedLabs, setParsedLabs] = useState<any[]>([]);
  const [parsedImaging, setParsedImaging] = useState<any[]>([]);
  const [isProcessingMedications, setIsProcessingMedications] = useState(false);
  const [showMedicationsError, setShowMedicationsError] = useState(false);
  const [showLabsError, setShowLabsError] = useState(false);
  const [showImagingError, setShowImagingError] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);

  // Improved initialization of the module with patient data - using direct fetch for reliability
  useEffect(() => {
    // Early initialization of the module when component mounts
    const initializeModule = async () => {
      if (patientId && draftOrdersModule && !moduleInitialized) {
        console.log("[DraftOrders] Directly initializing module on component mount");
        try {
          const chartResponse = await fetch(`/api/patients/${patientId}/chart`);
          if (chartResponse.ok) {
            const chartData = await chartResponse.json();

            // Make sure patient ID is available in the chart data
            if (!chartData.patient_id && patientId) {
              chartData.patient_id = patientId;
            }

            console.log("[DraftOrders] Setting patient chart with ID:", chartData.patient_id || patientId);
            draftOrdersModule.setPatientChart(chartData);
            setModuleInitialized(true);

            // Force an immediate refresh of orders
            directFetchDraftOrders();

            console.log("[DraftOrders] Successfully initialized module on component mount");
          } else {
            // Even if chart fetch fails, still initialize with basic patient ID
            console.log("[DraftOrders] Chart fetch failed, using basic initialization with ID:", patientId);
            draftOrdersModule.setPatientChart({ patient_id: patientId });
            setModuleInitialized(true);
          }
        } catch (error) {
          console.error("[DraftOrders] Error in direct initialization:", error);
          // Fallback to minimum initialization
          if (patientId && draftOrdersModule) {
            draftOrdersModule.setPatientChart({ patient_id: patientId });
            setModuleInitialized(true);
          }
        }
      }
    };

    initializeModule();
  }, [patientId, draftOrdersModule]);

  // This will be defined after the useQuery hook to fix TypeScript errors

  // CRITICAL FIX: Listen for the refreshed orders event from the DraftOrdersModule
  // This ensures orders appear immediately after first creation with both Method A and Method B
  useEffect(() => {
    const handleDraftOrdersRefreshed = (event: any) => {
      const { orders, patientId: updatedPatientId } = event.detail;

      // Only process events for the current patient
      if (updatedPatientId === patientId) {
        console.log("[DraftOrders] Received draft-orders-refreshed event with", orders.length, "orders");

        // Update the cache with the refreshed data
        queryClient.setQueryData(
          [`/api/patients/${patientId}/orders/draft`], 
          orders
        );

        // Also invalidate the query to ensure components refresh
        queryClient.invalidateQueries({
          queryKey: [`/api/patients/${patientId}/orders/draft`],
        });
      }
    };

    // Add event listener for draft order refreshes
    window.addEventListener('draft-orders-refreshed', handleDraftOrdersRefreshed);

    // Cleanup function
    return () => {
      window.removeEventListener('draft-orders-refreshed', handleDraftOrdersRefreshed);
    };
  }, [patientId, queryClient]);

  const refreshLabTemplates = async () => {
    console.log("[LabOrders] Starting lab templates refresh");
    try {
      const response = await fetch("/api/lab-order-templates", {
        headers: {
          Accept: "application/json",
        },
      });
      console.log("[LabOrders] Template fetch response:", {
        status: response.status,
        ok: response.ok,
        statusText: response.statusText,
      });

      if (response.ok) {
        const templates = await response.json();
        console.log("[LabOrders] Received templates:", {
          count: templates.length,
          templates: templates.map((t: any) => ({
            code: t.code,
            name: t.name,
          })),
        });
        if (Array.isArray(templates)) {
          setLabTemplates(templates);
        } else {
          console.error("[LabOrders] Invalid template data format:", templates);
          setLabTemplates([]);
        }
      } else {
        const errorText = await response.text();
        console.error("[LabOrders] Failed to fetch templates:", errorText);
        setLabTemplates([]);
      }
    } catch (error) {
      console.error(
        "[LabOrders] Template fetch error:",
        error instanceof Error ? error.message : error,
      );
      setLabTemplates([]);
    }
  };

  // Call refreshLabTemplates when component mounts
  useEffect(() => {
    refreshLabTemplates();
  }, []);

  // CORE FIX: Reliable direct API fetch function as a fallback 
  // This ensures orders always appear in the UI even when module initialization fails
  const directFetchDraftOrders = async () => {
    console.log("[DraftOrders] Performing direct fetch for draft orders");
    try {
      const response = await fetch(`/api/patients/${patientId}/orders/draft`, {
        method: "GET",
        headers: { 
          "Content-Type": "application/json",
          "Cache-Control": "no-cache, no-store" 
        },
        // Force fresh fetch every time
        cache: "no-store"
      });

      if (response.ok) {
        const orders = await response.json();
        console.log("[DraftOrders] Direct fetch successful, found orders:", orders.length);

        // Directly update query cache with the fetched data
        queryClient.setQueryData([`/api/patients/${patientId}/orders/draft`], orders);

        // Also invalidate the query to trigger a refetch
        queryClient.invalidateQueries({
          queryKey: [`/api/patients/${patientId}/orders/draft`],
        });

        // Update pending orders state
        const pendingCount = orders.filter((order: Order) => order.order_status === "pending").length;
        setHasPendingOrders(pendingCount > 0);

        return orders;
      } else {
        console.error("[DraftOrders] Direct fetch failed with status:", response.status);
        return null;
      }
    } catch (error) {
      console.error("[DraftOrders] Error in direct fetch:", error);
      return null;
    }
  };

  // Add logging in the useQuery hook - enhanced polling and cache handling
  const {
    data: draftOrders = [] as Order[],
    isPending,
    refetch,
    error
  } = useQuery<Order[], Error>({
    queryKey: [`/api/patients/${patientId}/orders/draft`],
    enabled: !!patientId,
    refetchInterval: 1000, // Poll every second for faster updates
    staleTime: 0, // Always consider data stale to force refresh
    gcTime: 0, // Don't cache between renders to always fetch fresh data (gcTime replaces cacheTime in newer versions)
    retry: 3, // Retry failed requests up to 3 times
    refetchOnMount: true, // Always refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when window regains focus
    onSuccess: (data) => {
      console.log("[DraftOrders] Successfully fetched draft orders:", data.length);
      if (data.length > 0) {
        console.log("[DraftOrders] First few orders:", data.slice(0, 3));
      }

      // Update hasPendingOrders flag based on the data
      const pendingCount = data.filter(order => order.order_status === "pending").length;
      console.log("[DraftOrders] Pending orders count:", pendingCount);
      setHasPendingOrders(pendingCount > 0);
    },
    onError: (err) => {
      console.error("[DraftOrders] Error fetching draft orders:", err);
      // On error, try direct API fetch as fallback
      directFetchDraftOrders();
    }
  });

  useEffect(() => {
    if (patientId && draftOrders && draftOrders.length === 0) {
      const timeoutId = setTimeout(() => {
        console.log("Stopping polling after 30 seconds due to no orders.");
      }, 30000);
      return () => clearTimeout(timeoutId);
    }
  }, [patientId, draftOrders]);

  // CRITICAL FIX: Add event listener for both draft-orders-updated and draft-orders-refreshed events
  // This ensures orders appear immediately on the first attempt for both Method A and Method B encounters
  useEffect(() => {
    const handleOrdersUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<{orders: any[], patientId: number}>;
      const { orders, patientId: updatedPatientId } = customEvent.detail;

      // Only process events for the current patient
      if (updatedPatientId === patientId) {
        console.log(`[DraftOrders] Received ${event.type} event with ${orders.length} orders`);

        // Update the cache directly to ensure UI reflects latest orders
        queryClient.setQueryData(
          [`/api/patients/${patientId}/orders/draft`], 
          orders
        );

        // Trigger a query invalidation to ensure components refresh
        queryClient.invalidateQueries({
          queryKey: [`/api/patients/${patientId}/orders/draft`],
        });

        // Force a refetch after a short delay to ensure consistent state
        setTimeout(() => {
          refetch();
        }, 100);
      }
    };

    // Add event listeners for both order update event types
    window.addEventListener('draft-orders-updated', handleOrdersUpdate);
    window.addEventListener('draft-orders-refreshed', handleOrdersUpdate);

    // Cleanup function to remove event listeners
    return () => {
      window.removeEventListener('draft-orders-updated', handleOrdersUpdate);
      window.removeEventListener('draft-orders-refreshed', handleOrdersUpdate);
    };
  }, [patientId, queryClient, refetch]);

  // Call refetch when recording starts
  useEffect(() => {
    if (isRecordingStarted) {
      console.log("[DraftOrders] Recording started, refreshing data");
      refetch(); // Refetch the data when recording starts
    }
  }, [isRecordingStarted, refetch]);

  const handleSave = async (order: Order) => {
    const startTime = Date.now();
    try {
      console.log("[DraftOrders] Starting save operation:", {
        orderId: order.id,
        orderType: order.order_type,
        orderData: order,
        timestamp: new Date().toISOString(),
      });
      // Ensure required fields for lab order are included
      const orderToSave = {
        ...order,
        lab_name: order.lab_name || null,
      };

      // Send update request to API
      const response = await fetch(`/api/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderToSave),
      });

      if (!response.ok) {
        throw new Error(`Server Error: ${response.status}`);
      }

      // Ensure the response is valid JSON
      const updatedOrder = await response.json();
      const duration = Date.now() - startTime;
      console.log("[DraftOrders] Update successful:", {
        orderId: order.id,
        responseData: updatedOrder,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString(),
      });

      // Keep original order while updating
      const originalOrders = queryClient.getQueryData<Order[]>([
        `/api/patients/${patientId}/orders/draft`,
      ]) || [];
      const orderIndex = originalOrders.findIndex((o) => o.id === order.id);

      if (orderIndex !== -1) {
        const newOrders = [...originalOrders];
        newOrders[orderIndex] = updatedOrder;
        queryClient.setQueryData<Order[]>(
          [`/api/patients/${patientId}/orders/draft`],
          newOrders,
        );
      }

      // Reset editing mode and notify user
      setEditingOrder(null);
      toast({ description: "Order saved successfully!" });
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error("[DraftOrders] Update failed:", {
        orderId: order.id,
        error: error instanceof Error ? error.message : "Unknown error",
        duration: `${duration}ms`,
        timestamp: new Date().toISOString(),
      });
      toast({
        variant: "destructive",
        description: "Failed to save order.",
      });

      // Force refresh if saving fails
      queryClient.invalidateQueries({
        queryKey: [`/api/patients/${patientId}/orders/draft`],
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateOrder = async (data: any) => {
    console.log("[DraftOrders] Starting handleCreateOrder with data:", JSON.stringify(data, null, 2));
    try {
      if (!draftOrdersModule) {
        console.error("[DraftOrders] DraftOrdersModule is not initialized");
        toast({
          variant: "destructive",
          description: "Cannot create order: system not initialized. Please try again.",
        });
        return;
      }

      // Always ensure the module is properly initialized with patient chart before creating orders
      // Check module initialization state - use a safe check in case the method doesn't exist yet
      const isModuleReady = moduleInitialized && 
                          typeof draftOrdersModule.isInitialized === 'function' && 
                          draftOrdersModule.isInitialized();

      if (!isModuleReady && patientId) {
        console.log("[DraftOrders] Module not fully initialized, fetching patient chart first");

        try {
          // Try to fetch patient chart directly and initialize module
          const chartResponse = await fetch(`/api/patients/${patientId}/chart`);
          if (chartResponse.ok) {
            const chartData = await chartResponse.json();
            draftOrdersModule.setPatientChart(chartData);
            setModuleInitialized(true);
            console.log("[DraftOrders] Successfully initialized module with patient chart");
          } else {
            console.error("[DraftOrders] Failed to fetch patient chart:", await chartResponse.text());
            // Still try to continue since we at least have the patient ID
          }
        } catch (chartError) {
          console.error("[DraftOrders] Error fetching patient chart:", chartError);
          // Continue anyway with just the patient ID
        }
      }

      console.log("[DraftOrders] Creating order with patient ID:", patientId);

      // Call the module's createManualOrder method with the data and patient ID
      const result = await draftOrdersModule.createManualOrder(data, patientId);
      console.log("[DraftOrders] Order created successfully:", result);

      // Show success message
      toast({
        description: `${data.order_type === 'medication' ? 'Medication' : 'Order'} saved successfully!`,
      });

      // Force refresh the orders list - first invalidate the cache
      await queryClient.invalidateQueries({
        queryKey: [`/api/patients/${patientId}/orders/draft`],
      });

      // Explicitly refetch to ensure UI updates
      await refetch();

      // Schedule additional delayed refreshes to ensure orders appear
      setTimeout(async () => {
        console.log("[DraftOrders] Running additional refresh after order creation");
        await refetchDraftOrders();
      }, 500);

      return result;
    } catch (error) {
      console.error("[DraftOrders] Failed to create order:", error);
      toast({
        variant: "destructive",
        description: error instanceof Error ? error.message : "Failed to create order",
      });
    }
  };

  const handleEdit = (order: Order) => {
    setEditingOrder(order);
  };

  const printOrder = async (orderId: number) => {
    try {
      const response = await fetch(`/api/orders/${orderId}/print`);
      if (!response.ok) {
        throw new Error("Failed to generate print version");
      }
      const data = await response.json();
      if (data.pdfUrl) {
        const newWindow = window.open(data.pdfUrl, "_blank");
        if (!newWindow) {
          toast({
            description: "Please allow popups to view the printed order",
            variant: "destructive",
          });
        }
      } else {
        throw new Error("No PDF URL returned");
      }
    } catch (error) {
      toast({
        description: "Failed to print order",
        variant: "destructive",
      });
    }
  };

  const getOrderTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      lab: "Laboratory",
      imaging: "Imaging",
      medication: "Medication",
    };
    return labels[type] || type;
  };

  function NewOrderDialog() {
    const [orderType, setOrderType] = useState<string>("medication");
    const [medicationEntryType, setMedicationEntryType] = useState<string>("ai");
    const [medicationText, setMedicationText] = useState<string>("");
    const [parsedMedications, setParsedMedications] = useState<any[]>([]);
    const [parsedLabs, setParsedLabs] = useState<any[]>([]);
    const [parsedImaging, setParsedImaging] = useState<any[]>([]);
    const [isProcessingMedications, setIsProcessingMedications] = useState<boolean>(false);
    const [isSaving, setIsSaving] = useState<boolean>(false);
    const [showSuccess, setShowSuccess] = useState<boolean>(false);
    const [showError, setShowError] = useState<boolean>(false);
    const [showLabsError, setShowLabsError] = useState<boolean>(false);
    const [showImagingError, setShowImagingError] = useState<boolean>(false);
    const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
    const [processingTimeout, setProcessingTimeout] = useState<NodeJS.Timeout | null>(null);

    // Function to refresh draft orders
    const refetchDraftOrders = async () => {
      try {
        console.log("[DraftOrders] Manually refreshing draft orders");
        await refetch();
        // Additionally invalidate cache to ensure fresh data
        queryClient.invalidateQueries({
          queryKey: [`/api/patients/${patientId}/orders/draft`],
        });
      } catch (error) {
        console.error("[DraftOrders] Error refreshing draft orders:", error);
      }
    };

    const { register, handleSubmit, reset, watch, setValue } = useForm({
      defaultValues: {
        order_type: "medication",
        provider_notes: "",
        dose: "",
        amount: "",
        medication_name: "",
        dosage: "",
        form: "tablet",
        sig: "",
        quantity: 0,
        refills: 0,
        route_of_administration: "",
        days_supply: 0,
        diagnosis_code: "",
        requires_prior_auth: false,
        prior_auth_number: "",
        lab_name: "",
        study_type: "",
        priority: "routine",
        region: "",
      },
    });

    const requiresPriorAuth = watch("requires_prior_auth");

    const handleProcessMedications = async () => {
      if (!medicationText.trim()) {
        toast({
          description: "Please enter medication text to process",
        });
        return;
      }

      // Pre-initialize by forcing a refresh of orders before processing
      await refetchDraftOrders();

      setIsProcessingMedications(true);

      try {
        console.log("[NewOrderDialog] Starting medication parsing process");

        // Process medications using our server-side GPT API with patient context
        const response = await fetch("/api/orders/parse-medications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            medicationText,
            patientId, // Include patient ID for context-aware medication parsing
          }),
        });

        if (!response.ok) {
          throw new Error(
            `Failed to parse medications: ${response.statusText}`,
          );
        }

        const parsedData = await response.json();
        console.log("[NewOrderDialog] GPT parsed response:", parsedData);

        // Extract all order types from the structured response
        const medications = parsedData.medications || [];
        const labs = parsedData.labs || [];
        const imaging = parsedData.imaging || [];

        console.log("[NewOrderDialog] Extracted medications:", medications);
        console.log("[NewOrderDialog] Extracted labs:", labs);
        console.log("[NewOrderDialog] Extracted imaging:", imaging);

        // Update state with parsed orders
        setParsedMedications(medications);
        setParsedLabs(labs);
        setParsedImaging(imaging);

        // Set form values if there's a single medication (for backward compatibility)
        if (medications.length === 1) {
          console.log("[NewOrderDialog] Using AI-parsed medication:", medications[0]);
          setValue("order_type", "medication");
          const parsedMed = medications[0];

          // Set medication form values
          setValue("medication_name", parsedMed.medication_name || "");
          setValue("dosage", parsedMed.dosage || "");
          setValue("form", parsedMed.form || "tablet");
          setValue("sig", parsedMed.sig || "");
          setValue("quantity", parsedMed.quantity || 30);
          setValue("refills", parsedMed.refills || 0);
          setValue("provider_notes", medicationText);
        }

        setShowSuccess(true);

        // Hide success message after a delay
        setTimeout(() => {
          setShowSuccess(false);
        }, 5000);
      } catch (error) {
        console.error("[NewOrderDialog] Error parsing medications:", error);
        setShowError(true);

        // Hide error message after a delay
        setTimeout(() => {
          setShowError(false);
        }, 5000);
      } finally {
        setIsProcessingMedications(false);
      }
    };

    // Function to save all parsed orders at once
    const handleSaveAllOrders = async () => {
      try {
        // Reset UI state
        setShowSuccess(false);
        setShowError(false);
        setShowLabsError(false);
        setShowImagingError(false);

        // Show the loading indicator
        setIsSaving(true);
        console.log("[DraftOrders] Starting unified save operation for all order types");

        // ALWAYS force module initialization before saving
        // This ensures the module always has the latest patient data
        console.log("[DraftOrders] Force-initializing module before saving ANY orders");

        try {
          // Force module initialization before saving - ALWAYS
          const chartResponse = await fetch(`/api/patients/${patientId}/chart`);
          if (chartResponse.ok) {
            const chartData = await chartResponse.json();
            // Add the patientId directly to ensure it's always available
            if (!chartData.patient_id && patientId) {
              chartData.patient_id = patientId;
            }
            console.log("[DraftOrders] Setting patient chart with ID:", chartData.patient_id || patientId);
            if (draftOrdersModule) {
              draftOrdersModule.setPatientChart(chartData);
              setModuleInitialized(true);
              console.log("[DraftOrders] Successfully initialized module with patient chart before batch save");
            } else {
              console.error("[DraftOrders] Cannot initialize null module");
            }
          } else {
            console.error("[DraftOrders] Failed to fetch patient chart:", chartResponse.status);
            // Even if the chart fetch fails, still try to initialize with just the ID
            if (patientId && draftOrdersModule) {
              console.log("[DraftOrders] Fallback: Initializing module with just patient ID:", patientId);
              draftOrdersModule.setPatientChart({ patient_id: patientId });
              setModuleInitialized(true);
            }
          }
        } catch (chartError) {
          console.error("[DraftOrders] Error initializing module before batch save:", chartError);
          // Fallback to basic initialization
          if (patientId && draftOrdersModule) {
            console.log("[DraftOrders] Error recovery: Setting basic patient data");
            draftOrdersModule.setPatientChart({ patient_id: patientId });
            setModuleInitialized(true);
          }
        }

        // Force draft orders to be refreshed before we start
        // This ensures we have the latest state
        try {
          console.log("[DraftOrders] Refreshing draft orders pre-save");
          await directFetchDraftOrders();
          await refetch();
        } catch (refreshError) {
          console.error("[DraftOrders] Error refreshing before save:", refreshError);
        }

        // Add a small delay to ensure any pending state changes are applied
        await new Promise(resolve => setTimeout(resolve, 300));

        const allSavePromises = [];
        let successCount = 0;

        // Process medications
        if (parsedMedications.length > 0) {
          console.log("[DraftOrders] Medications to save:", parsedMedications);

          const medPromises = parsedMedications.map((med) => {
            // Make sure patient ID is included and is a number
            const patientIdNum = Number(patientId);

            // Process medication data
            const processedMed = {
              order_type: "medication",
              order_status: "draft",
              medication_name: med.medication_name || "Unknown Medication",
              dosage: med.dosage || "",
              quantity: typeof med.quantity === 'string' ? parseInt(med.quantity) || 30 : (med.quantity || 30),
              refills: typeof med.refills === 'string' ? parseInt(med.refills) || 0 : (med.refills || 0),
              sig: med.sig || "Take as directed",
              form: med.form || "tablet",
              provider_notes: med.provider_notes || "",
              patient_id: patientIdNum
            };

            // CRITICAL FIX: ALWAYS use direct API method for medication orders
            // This completely bypasses module initialization issues on first save attempt
            console.log(`[DraftOrders] ALWAYS using direct API to create ${processedMed.medication_name} for first-time reliability`);
            return fetch("/api/orders", {
              method: "POST",
              headers: { 
                "Content-Type": "application/json",
                "Cache-Control": "no-cache, no-store" 
              },
              body: JSON.stringify(processedMed)
            })
            .then(response => {
              if (!response.ok) {
                throw new Error(`Server error: ${response.status}`);
              }
              return response.json();
            })
            .then(data => {
              console.log(`[DraftOrders] Successfully created ${processedMed.medication_name} via direct API`, data);
              successCount++;
              return true;
            })
            .catch(err => {
              console.error(`[DraftOrders] Error saving medication ${processedMed.medication_name}:`, err);

              // Last resort fallback - try one more time with simplified payload
              console.log(`[DraftOrders] Final retry for ${processedMed.medication_name} with simplified payload`);

              // Simplified payload with only essential fields
              const simplifiedMed = {
                order_type: "medication",
                order_status: "draft",
                medication_name: processedMed.medication_name,
                dosage: processedMed.dosage,
                quantity: processedMed.quantity,
                sig: processedMed.sig,
                patient_id: patientIdNum
              };

              return fetch("/api/orders", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(simplifiedMed)
              })
              .then(response => {
                if (!response.ok) {
                  throw new Error(`Server error on retry: ${response.status}`);
                }
                return response.json();
              })
              .then(data => {
                console.log(`[DraftOrders] Successfully created ${processedMed.medication_name} on final retry`);
                successCount++;
                return true;
              })
              .catch(finalError => {
                console.error(`[DraftOrders] Final error saving medication ${processedMed.medication_name}:`, finalError);
                // Update the parent component state for proper error handling
                setShowError(true);
                setIsSaving(false);
                return false;
              });
            });
          });

          allSavePromises.push(...medPromises);
        }

        // Process lab orders
        if (parsedLabs.length > 0) {
          console.log("[DraftOrders] Labs to save:", parsedLabs);

          const labPromises = parsedLabs.map((lab) => {
            // Make sure patient ID is included and is a number
            const patientIdNum = Number(patientId);

            // Process lab data
            const processedLab = {
              order_type: "lab",
              order_status: "draft",
              lab_name: lab.lab_name || lab.test_name || "Unknown Lab Test",
              test_name: lab.test_name || lab.lab_name || "Unknown Lab Test",
              priority: lab.priority || "routine",
              provider_notes: lab.provider_notes || "",
              patient_id: patientIdNum
            };

            // CORE FIX: Create lab order directly if module not available
            if (!draftOrdersModule) {
              console.log(`[DraftOrders] Module not available, creating lab ${processedLab.lab_name} directly via API`);
              return fetch("/api/orders", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(processedLab)
              })
              .then(response => {
                if (!response.ok) {
                  throw new Error(`Server error: ${response.status}`);
                }
                return response.json();
              })
              .then(data => {
                console.log(`[DraftOrders] Successfully created lab ${processedLab.lab_name} via direct API`);
                successCount++;
                return true;
              })
              .catch(err => {
                console.error(`[DraftOrders] Error saving lab ${processedLab.lab_name}:`, err);
                setShowLabsError(true);
                return false;
              });
            }

            // Use module if available
            return handleCreateOrder(processedLab)
              .then(() => {
                successCount++;
                return true;
              })
              .catch(err => {
                console.error(`[DraftOrders] Error saving lab ${processedLab.lab_name}:`, err);

                // FALLBACK: If module fails, try direct API as backup
                console.log(`[DraftOrders] Retrying lab ${processedLab.lab_name} via direct API after module failure`);
                return fetch("/api/orders", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(processedLab)
                })
                .then(response => {
                  if (!response.ok) {
                    throw new Error(`Server error: ${response.status}`);
                  }
                  return response.json();
                })
                .then(data => {
                  console.log(`[DraftOrders] Successfully created lab ${processedLab.lab_name} via direct API fallback`);
                  successCount++;
                  return true;
                })
                .catch(fallbackErr => {
                  console.error(`[DraftOrders] Fallback also failed for lab ${processedLab.lab_name}:`, fallbackErr);
                  setShowLabsError(true);
                  return false;
                });
              });
          });

          allSavePromises.push(...labPromises);
        }

        // Process imaging orders
        if (parsedImaging.length > 0) {
          console.log("[DraftOrders] Imaging studies to save:", parsedImaging);

          const imagingPromises = parsedImaging.map((imaging) => {
            // Make sure patient ID is included and is a number
            const patientIdNum = Number(patientId);

            // Process imaging data
            const processedImaging = {
              order_type: "imaging",
              order_status: "draft",
              study_type: imaging.study_type || "Unspecified Imaging",
              region: imaging.region || "",
              provider_notes: imaging.provider_notes || "",
              patient_id: patientIdNum
            };

            // CORE FIX: Create imaging order directly if module not available
            if (!draftOrdersModule) {
              console.log(`[DraftOrders] Module not available, creating imaging ${processedImaging.study_type} directly via API`);
              return fetch("/api/orders", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(processedImaging)
              })
              .then(response => {
                if (!response.ok) {
                  throw new Error(`Server error: ${response.status}`);
                }
                return response.json();
              })
              .then(data => {
                console.log(`[DraftOrders] Successfully created imaging ${processedImaging.study_type} via direct API`);
                successCount++;
                return true;
              })
              .catch(err => {
                console.error(`[DraftOrders] Error saving imaging ${processedImaging.study_type}:`, err);
                setShowImagingError(true);
                return false;
              });
            }

            // Use module if available
            return handleCreateOrder(processedImaging)
              .then(() => {
                successCount++;
                return true;
              })
              .catch(err => {
                console.error(`[DraftOrders] Error saving imaging ${processedImaging.study_type}:`, err);

                // FALLBACK: If module fails, try direct API as backup
                console.log(`[DraftOrders] Retrying imaging ${processedImaging.study_type} via direct API after module failure`);
                return fetch("/api/orders", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(processedImaging)
                })
                .then(response => {
                  if (!response.ok) {
                    throw new Error(`Server error: ${response.status}`);
                  }
                  return response.json();
                })
                .then(data => {
                  console.log(`[DraftOrders] Successfully created imaging ${processedImaging.study_type} via direct API fallback`);
                  successCount++;
                  return true;
                })
                .catch(fallbackErr => {
                  console.error(`[DraftOrders] Fallback also failed for imaging ${processedImaging.study_type}:`, fallbackErr);
                  setShowImagingError(true);
                  return false;
                });
              });
          });

          allSavePromises.push(...imagingPromises);
        }

        // Wait for all promises to complete
        const results = await Promise.all(allSavePromises);

        // CRITICAL FIX: Count actual successes from promise results
        const actualSuccessCount = results.filter(result => result === true).length;
        console.log(`[DraftOrders] Actual success count from promises: ${actualSuccessCount}`);

        // Show appropriate message based on success count
        if (actualSuccessCount === 0) {
          toast({
            variant: "destructive",
            description: "Failed to save any orders"
          });
        } else if (actualSuccessCount < (parsedMedications.length + parsedLabs.length + parsedImaging.length)) {
          toast({
            description: `Saved ${actualSuccessCount} orders with some errors`,
          });

          // Partial success - still clear the successful ones
          setParsedMedications([]);
          setParsedLabs([]);
          setParsedImaging([]);
          setMedicationText("");

          // CRITICAL FIX: Force direct API fetch after partial success
          await directFetchDraftOrders();
        } else {
          toast({
            description: `Successfully saved all ${actualSuccessCount} orders!`,
          });

          // Clear the parsed data after successful save
          setParsedMedications([]);
          setParsedLabs([]);
          setParsedImaging([]);
          setMedicationText("");
        }

        // CRITICAL FIX: Always force UI update regardless of success count
        // This ensures orders appear in the UI even if the toast shows errors
        try {
          console.log("[DraftOrders] Force refreshing UI after save operation");
          await directFetchDraftOrders();
          queryClient.invalidateQueries({
            queryKey: [`/api/patients/${patientId}/orders/draft`],
          });
        } catch (refreshError) {
          console.error("[DraftOrders] Error in final refresh:", refreshError);
        }

        // FINAL FIX: Replace multiple refetch attempts with a reliable direct API fetch
        console.log("[DraftOrders] Running single reliable refresh using direct API fetch");
        await directFetchDraftOrders();

        // Also manually refetch through React Query for UI updates
        console.log("[DraftOrders] Running additional refresh after order creation");
        try {
          if (refetch) {
            await refetch();
          }
        } catch (refetchError) {
          console.error("[DraftOrders] Error in React Query refetch:", refetchError);
        }

        // Force direct API fetch to ensure we have the latest data - don't rely on cache
        try {
          console.log("[DraftOrders] Forcing direct API fetch to get latest orders");
          const directApiResponse = await fetch(`/api/patients/${patientId}/orders/draft`);
          if (directApiResponse.ok) {
            const freshOrders = await directApiResponse.json();
            console.log("[DraftOrders] Got fresh orders directly from API:", freshOrders.length);

            // Force update the query cache with the fresh data
            queryClient.setQueryData([`/api/patients/${patientId}/orders/draft`], freshOrders);
          }
        } catch (directFetchError) {
          console.error("[DraftOrders] Error in direct API fetch:", directFetchError);
        }

        // Schedule multiple delayed refreshes to ensure the database has completed any transactions
        // These multiple refreshes help ensure we catch the orders after they're fully processed
        setTimeout(async () => {
          console.log("[DraftOrders] Running second delayed refresh to ensure orders appear");
          await refetchDraftOrders();

          // Final refresh after another delay for race condition safety
          setTimeout(async () => {
            console.log("[DraftOrders] Running final refresh to ensure orders appear");
            await refetchDraftOrders();

            // One last direct API fetch as an absolute fallback
            try {
              const finalDirectFetch = await fetch(`/api/patients/${patientId}/orders/draft`);
              if (finalDirectFetch.ok) {
                const finalOrders = await finalDirectFetch.json();
                if (finalOrders.length > 0) {
                  console.log("[DraftOrders] Final direct fetch found orders:", finalOrders.length);
                  queryClient.setQueryData([`/api/patients/${patientId}/orders/draft`], finalOrders);
                }
              }
            } catch (finalFetchError) {
              console.error("[DraftOrders] Error in final direct fetch:", finalFetchError);
            }
          }, 1000);
        }, 500);

      } catch (error) {
        console.error("[DraftOrders] Save all orders error:", error);
        toast({
          variant: "destructive",
          description: "Error saving orders: " + (error instanceof Error ? error.message : "Unknown error")
        });
      } finally {
        setIsSaving(false);
      }
    };

    const handleCreateManualOrder = handleSubmit(async (data) => {
      try {
        // Add order type and status
        const orderData = {
          ...data,
          order_status: "draft",
        };

        // Order-type-specific data
        if (data.order_type === "medication") {
          orderData.medication_name = data.medication_name;
          orderData.dosage = data.dosage;
          orderData.form = data.form;
          orderData.sig = data.sig;
          orderData.quantity = parseInt(data.quantity?.toString() || "30");
          orderData.refills = parseInt(data.refills?.toString() || "0");
        } else if (data.order_type === "lab") {
          orderData.lab_name = data.lab_name;
          orderData.priority = data.priority;
        } else if (data.order_type === "imaging") {
          orderData.study_type = data.study_type;
          orderData.region = data.region;
        }

        console.log("[NewOrderDialog] Creating order with data:", JSON.stringify(orderData, null, 2));

        // Create the order
        const result = await handleCreateOrder(orderData);
        if (result) {
          // Close dialog and reset after successful creation
          reset();
          setIsDialogOpen(false);
        }
      } catch (error) {
        console.error("Error creating order:", error);
        toast({
          description: "Failed to create order",
          variant: "destructive",
        });
      }
    });

    return (
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button
            variant="default"
            size="sm"
            className="flex items-center space-x-1 ml-2 bg-blue-600 hover:bg-blue-700"
            onClick={() => {
              // Force a refresh of draft orders before opening dialog
              refetchDraftOrders().then(() => {
                console.log("[NewOrderDialog] Refreshed draft orders before opening dialog");
                setIsDialogOpen(true);
                setOrderType("medication");
              });
            }}
          >
            <Plus className="h-4 w-4 mr-1" />
            New Order
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Order</DialogTitle>
            <DialogDescription>
              Add a new order for this patient
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateManualOrder} className="space-y-4 mt-2">
            <div className="flex flex-col space-y-3">
              {/* AI Medication Entry Section */}
              <div className="border rounded-md p-3 bg-blue-50">
                <Label className="font-semibold text-blue-800">
                  Quick Order Entry (AI-Powered)
                </Label>
                <p className="text-xs text-blue-600 mt-1 mb-3">
                  Enter free text medication orders, lab requests, or imaging studies. Our AI will process and format them.
                </p>

                <div className="relative">
                  <Textarea
                    className="h-24 bg-white"
                    placeholder="Example: Atorvastatin 40mg daily, CBC with differential, Chest X-ray PA and lateral"
                    value={medicationText}
                    onChange={(e) => setMedicationText(e.target.value)}
                  />
                </div>

                <div className="flex justify-end mt-2">
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700"
                    onClick={handleProcessMedications}
                    disabled={isProcessingMedications || !medicationText.trim()}
                  >
                    {isProcessingMedications ? (
                      <div className="flex items-center">
                        <svg
                          className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        Processing...
                      </div>
                    ) : (
                      "Process Orders"
                    )}
                  </Button>
                </div>
              </div>

              {/* Success Message */}
              {showSuccess && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                  <div className="flex items-center text-green-700">
                    <Check className="h-5 w-5 mr-2" />
                    <div>
                      <p className="font-medium">Orders processed successfully!</p>
                      <p className="text-sm">
                        Review the orders below and click "Save All Orders" to create them.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {showError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                  <div className="flex items-center text-red-700">
                    <X className="h-5 w-5 mr-2" />
                    <div>
                      <p className="font-medium">Failed to process orders</p>
                      <p className="text-sm">
                        Please try again or use the manual entry option below.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* AI Processing Indicator */}
              {isProcessingMedications && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <div className="flex items-center">
                    <svg
                      className="animate-spin h-5 w-5 mr-3 text-blue-600"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-blue-800">
                        GPT is analyzing your medication text
                      </p>
                      <p className="text-xs text-blue-600">
                        Processing patient context and assigning
                        appropriate ICD-10 codes...
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Unified Save All Orders Button */}
              {(parsedMedications.length > 0 || parsedLabs.length > 0 || parsedImaging.length > 0) && (
                <div className="mt-5 mb-4 bg-blue-50 border border-blue-100 rounded-md p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <Label className="font-semibold text-blue-800 text-sm">
                        Orders Ready: {parsedMedications.length} Medications, {parsedLabs.length} Labs, {parsedImaging.length} Imaging Studies
                      </Label>
                      <p className="text-xs text-blue-600 mt-1">
                        Review the orders below and click "Save All Orders" to create them as draft orders
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="default"
                      size="default"
                      className="font-medium"
                      onClick={handleSaveAllOrders}
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <div className="flex items-center space-x-2">
                          <svg
                            className="animate-spin h-4 w-4 text-white"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            ></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                          </svg>
                          <span>Saving...</span>
                        </div>
                      ) : (
                        "Save All Orders"
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* Parsed Medications Section */}
              {parsedMedications.length > 0 && (
                <div className="mt-4 border rounded-md p-3 bg-white">
                  <div className="flex justify-between items-center mb-2">
                    <Label className="font-semibold text-lg">
                      Parsed Medications
                    </Label>
                  </div>
                  <div className="mt-2 space-y-2">
                    {parsedMedications.map((med, index) => (
                      <div key={`med-${index}`} className="p-2 border rounded-md bg-gray-50">
                        <div className="font-medium">{med.medication_name}</div>
                        <div className="text-sm text-gray-500">
                          {med.dosage}, {med.form || 'tablet'} - {med.sig}
                        </div>
                        <div className="text-xs mt-1">
                          Quantity: {med.quantity || 30}, Refills: {med.refills || 0}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Parsed Labs Section */}
              {parsedLabs.length > 0 && (
                <div className="mt-4 border rounded-md p-3 bg-white">
                  <div className="flex justify-between items-center mb-2">
                    <Label className="font-semibold text-lg">
                      Parsed Lab Orders
                    </Label>
                  </div>
                  <div className="mt-2 space-y-2">
                    {parsedLabs.map((lab, index) => (
                      <div key={`lab-${index}`} className="p-2 border rounded-md bg-gray-50">
                        <div className="font-medium">{lab.lab_test_name || lab.lab_name || lab.test_name || "Lab Test"}</div>
                        <div className="text-sm text-gray-500">
                          Priority: {lab.priority || 'routine'}
                        </div>
                        {lab.provider_notes && (
                          <div className="text-xs mt-1">
                            Notes: {lab.provider_notes}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Parsed Imaging Section */}
              {parsedImaging.length > 0 && (
                <div className="mt-4 border rounded-md p-3 bg-white">
                  <div className="flex justify-between items-center mb-2">
                    <Label className="font-semibold text-lg">
                      Parsed Imaging Orders
                    </Label>
                  </div>
                  <div className="mt-2 space-y-2">
                    {parsedImaging.map((img, index) => (
                      <div key={`img-${index}`} className="p-2 border rounded-md bg-gray-50">
                        <div className="font-medium">{img.imaging_test_name || img.study_type || "Imaging Study"}</div>
                        {(img.body_part || img.region) && (
                          <div className="text-sm text-gray-500">
                            Region: {img.body_part || img.region || "Unspecified"}
                          </div>
                        )}
                        {img.provider_notes && (
                          <div className="text-xs mt-1">
                            Notes: {img.provider_notes}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Lab Errors */}
              {showLabsError && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <div className="flex items-center text-yellow-700">
                    <div>
                      <p className="font-medium">Issue with lab orders</p>
                      <p className="text-sm">
                        Some lab orders could not be processed. Please check the format or try again.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Imaging Errors */}
              {showImagingError && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <div className="flex items-center text-yellow-700">
                    <div>
                      <p className="font-medium">Issue with imaging orders</p>
                      <p className="text-sm">
                        Some imaging orders could not be processed. Please check the format or try again.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Manual Entry Section */}
              <div className="border rounded-md p-3 mt-4">
                <Label className="font-semibold mb-2">Manual Order Entry</Label>
                <div className="grid grid-cols-2 gap-4 mt-3">
                  <div className="flex flex-col space-y-2">
                    <Label htmlFor="order_type">Order Type</Label>
                    <Select
                      defaultValue="medication"
                      onValueChange={(value) => {
                        setOrderType(value);
                        setValue("order_type", value);
                      }}
                    >
                      <SelectTrigger id="order_type" className="w-full">
                        <SelectValue placeholder="Select order type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="medication">Medication</SelectItem>
                        <SelectItem value="lab">Laboratory</SelectItem>
                        <SelectItem value="imaging">Imaging</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Order Type Specific Fields */}
                {orderType === "medication" && (
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="flex flex-col space-y-2">
                      <Label htmlFor="medication_name">Medication Name</Label>
                      <Input
                        id="medication_name"
                        placeholder="Enter medication name"
                        {...register("medication_name")}
                      />
                    </div>
                    <div className="flex flex-col space-y-2">
                      <Label htmlFor="dosage">Dosage</Label>
                      <Input
                        id="dosage"
                        placeholder="e.g., 50mg"
                        {...register("dosage")}
                      />
                    </div>
                    <div className="flex flex-col space-y-2">
                      <Label htmlFor="form">Form</Label>
                      <Select
                        defaultValue="tablet"
                        onValueChange={(value) => setValue("form", value)}
                      >
                        <SelectTrigger id="form" className="w-full">
                          <SelectValue placeholder="Select form" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="tablet">Tablet</SelectItem>
                          <SelectItem value="capsule">Capsule</SelectItem>
                          <SelectItem value="solution">Solution</SelectItem>
                          <SelectItem value="suspension">Suspension</SelectItem>
                          <SelectItem value="injection">Injection</SelectItem>
                          <SelectItem value="patch">Patch</SelectItem>
                          <SelectItem value="cream">Cream</SelectItem>
                          <SelectItem value="ointment">Ointment</SelectItem>
                          <SelectItem value="gel">Gel</SelectItem>
                          <SelectItem value="spray">Spray</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-col space-y-2">
                      <Label htmlFor="sig">Sig/Instructions</Label>
                      <Input
                        id="sig"
                        placeholder="e.g., Take 1 tablet daily"
                        {...register("sig")}
                      />
                    </div>
                    <div className="flex flex-col space-y-2">
                      <Label htmlFor="quantity">Quantity</Label>
                      <Input
                        id="quantity"
                        type="number"
                        defaultValue={30}
                        {...register("quantity")}
                      />
                    </div>
                    <div className="flex flex-col space-y-2">
                      <Label htmlFor="refills">Refills</Label>
                      <Input
                        id="refills"
                        type="number"
                        defaultValue={0}
                        {...register("refills")}
                      />
                    </div>
                    <div className="flex items-center space-x-2 mt-4">
                      <Checkbox
                        id="requires_prior_auth"
                        {...register("requires_prior_auth")}
                      />
                      <Label
                        htmlFor="requires_prior_auth"
                        className="text-sm font-normal"
                      >
                        Requires Prior Authorization
                      </Label>
                    </div>
                    {requiresPriorAuth && (
                      <div className="flex flex-col space-y-2">
                        <Label htmlFor="prior_auth_number">
                          Authorization Number
                        </Label>
                        <Input
                          id="prior_auth_number"
                          placeholder="Enter auth number"
                          {...register("prior_auth_number")}
                        />
                      </div>
                    )}
                  </div>
                )}

                {orderType === "lab" && (
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="flex flex-col space-y-2">
                      <Label htmlFor="lab_name">Test Name</Label>
                      <Input
                        id="lab_name"
                        placeholder="Enter lab test name"
                        {...register("lab_name")}
                      />
                    </div>
                    <div className="flex flex-col space-y-2">
                      <Label htmlFor="priority">Priority</Label>
                      <Select
                        defaultValue="routine"
                        onValueChange={(value) => setValue("priority", value)}
                      >
                        <SelectTrigger id="priority" className="w-full">
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="routine">Routine</SelectItem>
                          <SelectItem value="stat">STAT</SelectItem>
                          <SelectItem value="asap">ASAP</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {orderType === "imaging" && (
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="flex flex-col space-y-2">
                      <Label htmlFor="study_type">Study Type</Label>
                      <Select
                        defaultValue=""
                        onValueChange={(value) => setValue("study_type", value)}
                      >
                        <SelectTrigger id="study_type" className="w-full">
                          <SelectValue placeholder="Select study type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="X-RAY">X-Ray</SelectItem>
                          <SelectItem value="CT">CT Scan</SelectItem>
                          <SelectItem value="MRI">MRI</SelectItem>
                          <SelectItem value="ULTRASOUND">Ultrasound</SelectItem>
                          <SelectItem value="DEXA">DEXA Scan</SelectItem>
                          <SelectItem value="PET">PET Scan</SelectItem>
                          <SelectItem value="MAMMOGRAM">Mammogram</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-col space-y-2">
                      <Label htmlFor="region">Body Region</Label>
                      <Input
                        id="region"
                        placeholder="e.g., Chest, Abdomen"
                        {...register("region")}
                      />
                    </div>
                  </div>
                )}

                <div className="flex flex-col space-y-2 mt-4">
                  <Label htmlFor="provider_notes">Provider Notes</Label>
                  <Textarea
                    id="provider_notes"
                    placeholder="Enter any additional notes"
                    className="h-20"
                    {...register("provider_notes")}
                  />
                </div>

                <div className="flex justify-end mt-4">
                  <Button
                    type="submit"
                    variant="default"
                    className="font-medium"
                  >
                    Create Order
                  </Button>
                </div>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    );
  }

  function EditOrderDialog() {
    if (!editingOrder) return null;

    const { register, handleSubmit, reset, setValue, watch } = useForm({
      defaultValues: {
        ...editingOrder,
      },
    });

    const requiresPriorAuth = watch("requires_prior_auth");

    const orderType = editingOrder.order_type;

    // Close the dialog and reset form
    const handleClose = () => {
      setEditingOrder(null);
      reset();
    };

    // Handle form submission
    const onSubmit = async (data: any) => {
      const updatedOrder = {
        ...editingOrder,
        ...data,
      };

      // Convert number fields from string to number
      if (updatedOrder.order_type === "medication") {
        updatedOrder.quantity = parseInt(updatedOrder.quantity?.toString() || "0");
        updatedOrder.refills = parseInt(updatedOrder.refills?.toString() || "0");
        updatedOrder.days_supply = parseInt(updatedOrder.days_supply?.toString() || "0");
      }

      try {
        await handleSave(updatedOrder);
        handleClose();
      } catch (error) {
        console.error("Error updating order:", error);
        toast({
          description: "Failed to update order",
          variant: "destructive",
        });
      }
    };

    return (
      <Dialog open={!!editingOrder} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Edit {getOrderTypeLabel(orderType)} Order</DialogTitle>
            <DialogDescription>
              Update the {orderType} order details
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              {orderType === "medication" && (
                <>
                  <div className="flex flex-col space-y-2">
                    <Label htmlFor="medication_name">Medication Name</Label>
                    <Input
                      id="medication_name"
                      {...register("medication_name")}
                    />
                  </div>
                  <div className="flex flex-col space-y-2">
                    <Label htmlFor="dosage">Dosage</Label>
                    <Input id="dosage" {...register("dosage")} />
                  </div>
                  <div className="flex flex-col space-y-2">
                    <Label htmlFor="form">Form</Label>
                    <Select
                      defaultValue={editingOrder.form || "tablet"}
                      onValueChange={(value) => setValue("form", value)}
                    >
                      <SelectTrigger id="form" className="w-full">
                        <SelectValue placeholder="Select form" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="tablet">Tablet</SelectItem>
                        <SelectItem value="capsule">Capsule</SelectItem>
                        <SelectItem value="solution">Solution</SelectItem>
                        <SelectItem value="suspension">Suspension</SelectItem>
                        <SelectItem value="injection">Injection</SelectItem>
                        <SelectItem value="patch">Patch</SelectItem>
                        <SelectItem value="cream">Cream</SelectItem>
                        <SelectItem value="ointment">Ointment</SelectItem>
                        <SelectItem value="gel">Gel</SelectItem>
                        <SelectItem value="spray">Spray</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col space-y-2">
                    <Label htmlFor="sig">Sig/Instructions</Label>
                    <Input id="sig" {...register("sig")} />
                  </div>
                  <div className="flex flex-col space-y-2">
                    <Label htmlFor="quantity">Quantity</Label>
                    <Input id="quantity" type="number" {...register("quantity")} />
                  </div>
                  <div className="flex flex-col space-y-2">
                    <Label htmlFor="refills">Refills</Label>
                    <Input id="refills" type="number" {...register("refills")} />
                  </div>
                  <div className="flex items-center space-x-2 mt-4">
                    <Checkbox
                      id="requires_prior_auth"
                      {...register("requires_prior_auth")}
                    />
                    <Label
                      htmlFor="requires_prior_auth"
                      className="text-sm font-normal"
                    >
                      Requires Prior Authorization
                    </Label>
                  </div>
                  {requiresPriorAuth && (
                    <div className="flex flex-col space-y-2">
                      <Label htmlFor="prior_auth_number">Auth Number</Label>
                      <Input
                        id="prior_auth_number"
                        {...register("prior_auth_number")}
                      />
                    </div>
                  )}
                </>
              )}

              {orderType === "lab" && (
                <>
                  <div className="flex flex-col space-y-2">
                    <Label htmlFor="lab_name">Test Name</Label>
                    <Input id="lab_name" {...register("lab_name")} />
                  </div>
                  <div className="flex flex-col space-y-2">
                    <Label htmlFor="priority">Priority</Label>
                    <Select
                      defaultValue={editingOrder.priority || "routine"}
                      onValueChange={(value) => setValue("priority", value)}
                    >
                      <SelectTrigger id="priority" className="w-full">
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="routine">Routine</SelectItem>
                        <SelectItem value="stat">STAT</SelectItem>
                        <SelectItem value="asap">ASAP</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {orderType === "imaging" && (
                <>
                  <div className="flex flex-col space-y-2">
                    <Label htmlFor="study_type">Study Type</Label>
                    <Input id="study_type" {...register("study_type")} />
                  </div>
                  <div className="flex flex-col space-y-2">
                    <Label htmlFor="region">Body Region</Label>
                    <Input id="region" {...register("region")} />
                  </div>
                </>
              )}
            </div>
            <div className="flex flex-col space-y-2">
              <Label htmlFor="provider_notes">Provider Notes</Label>
              <Textarea
                id="provider_notes"
                className="min-h-[100px]"
                {...register("provider_notes")}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit">Save Changes</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    );
  }

  const handleApproveOrder = async (orderId: number) => {
    try {
      // Check if the order is already being processed
      if (pendingOrders.has(orderId)) {
        console.log(`[DraftOrders] Order ${orderId} is already being approved`);
        return;
      }

      // Add the order to the pending set
      const newPendingOrders = new Set(pendingOrders);
      newPendingOrders.add(orderId);
      setPendingOrders(newPendingOrders);

      console.log(`[DraftOrders] Approving order ${orderId}`);
      const response = await fetch(`/api/orders/${orderId}/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new Error(`Failed to update order signing status: ${response.status}`);
      }

      const result = await response.json();
      console.log(`[DraftOrders] Order ${orderId} signed successfully:`, result);

      // Update the UI by modifying the local query data
      const existingOrders = queryClient.getQueryData<Order[]>([
        `/api/patients/${patientId}/orders/draft`,
      ]) || [];

      const updatedOrders = existingOrders.map((order) =>
        order.id === orderId ? { ...order, order_status: "approved" } : order
      );

      queryClient.setQueryData<Order[]>(
        [`/api/patients/${patientId}/orders/draft`],
        updatedOrders
      );

      toast({ description: "Order signed successfully" });
    } catch (error) {
      console.error(`[DraftOrders] Error signing order ${orderId}:`, error);
      toast({
        variant: "destructive",
        description: "Failed to sign order. Please try again.",
      });
    } finally {
      // Remove the order from the pending set
      const newPendingOrders = new Set(pendingOrders);
      newPendingOrders.delete(orderId);
      setPendingOrders(newPendingOrders);
    }
  };

  // State for medication preference dialog
  const [showPreferenceDialog, setShowPreferenceDialog] = useState(false);
  const [medicationPreference, setMedicationPreference] = useState<string>("print");
  const [savePreference, setSavePreference] = useState(true);

  // Fetch patient's medication preference
  const { data: preferenceData } = useQuery({
    queryKey: [`/api/patients/${patientId}/medication-preference`],
    enabled: !!patientId,
    onSuccess: (data) => {
      if (data && data.preference) {
        setMedicationPreference(data.preference);
        console.log(`[DraftOrders] Loaded patient medication preference: ${data.preference}`);
      }
    },
    onError: (error) => {
      console.error("[DraftOrders] Error fetching medication preference:", error);
      // Default to "print" if we can't get the preference
      setMedicationPreference("print");
    }
  });

  // Check if we have any medication orders
  const hasMedicationOrders = draftOrders.some(order => 
    order.order_status === "draft" && order.order_type === "medication"
  );

  const handleApproveAll = async () => {
    // If there are medication orders, show the preference dialog
    if (hasMedicationOrders) {
      setShowPreferenceDialog(true);
      return;
    }

    // Otherwise, just sign all orders directly
    await signAllOrders();
  };

  const signAllOrders = async (preference?: string) => {
    try {
      console.log("[DraftOrders] Signing all draft orders");

      // If preference is provided, save it if requested
      if (preference && savePreference) {
        try {
          await fetch(`/api/patients/${patientId}/medication-preference`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ preference }),
          });
          console.log(`[DraftOrders] Patient medication preference saved: ${preference}`);
        } catch (prefError) {
          console.error("[DraftOrders] Error saving preference:", prefError);
          // Continue with signing even if preference save fails
        }
      }

      const response = await fetch(`/api/orders/patients/${patientId}/sign-all`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ medicationPreference: preference || medicationPreference }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[DraftOrders] Error response: ${errorText}`);
        throw new Error(`Failed to sign all orders: ${response.status}`);
      }

      const result = await response.json();
      console.log("[DraftOrders] All orders signed successfully:", result);

      // Handle prescription display for medications if preference is "print"
      if ((preference || medicationPreference) === "print") {
        console.log("[DraftOrders] Print preference selected");

        // First check if we got PDF URLs back from the server
        if (result.pdfUrls && Array.isArray(result.pdfUrls) && result.pdfUrls.length > 0) {
          console.log(`[DraftOrders] Opening server-generated PDF: ${result.pdfUrls[0]}`);

          // Open the PDF in a new window
          const pdfUrl = result.pdfUrls[0];
          const fullUrl = pdfUrl.startsWith('/') && !pdfUrl.startsWith('/api') 
            ? `/api${pdfUrl}` 
            : pdfUrl;

          window.open(fullUrl, '_blank');
          return;
        }

        // Also check for a single PDF URL
        if (result.pdfUrl) {
          console.log(`[DraftOrders] Opening server-generated PDF: ${result.pdfUrl}`);

          const fullUrl = result.pdfUrl.startsWith('/') && !result.pdfUrl.startsWith('/api') 
            ? `/api${result.pdfUrl}` 
            : result.pdfUrl;

          window.open(fullUrl, '_blank');
          return;
        }

        console.log("[DraftOrders] No PDF URLs found in response, falling back to HTML generation");

        // Fallback to HTML prescription if no PDFs were generated
        console.log(`[DraftOrders] Creating fallback HTML prescription for patient ${patientId}`);

        // Create a popup window with our prescription
        const prescriptionWindow = window.open('', '_blank');
        if (!prescriptionWindow) {
          console.error("[DraftOrders] Failed to open new window. Popup may be blocked.");
          toast({
            variant: "destructive",
            description: "Failed to open prescription. Please allow popups for this site."
          });
          return;
        }

        // Get medication orders from the result
        const medicationOrders = result.orders && Array.isArray(result.orders) 
          ? result.orders.filter((order: any) => 
              order.order_type === 'medication' && order.order_status === 'approved')
          : [];

        // Make a direct call to get patient info
        fetch(`/api/patients/${patientId}?t=${Date.now()}`)
          .then(response => response.json())
          .then(patient => {
            // Update patient info in the window
            const patientInfoDiv = prescriptionWindow.document.getElementById('patient-info');
            if (patientInfoDiv) {
              patientInfoDiv.innerHTML = `
                <div><strong>Patient:</strong> ${patient.first_name} ${patient.last_name}</div>
                <div><strong>DOB:</strong> ${new Date(patient.date_of_birth).toLocaleDateString()}</div>
                <div><strong>Date:</strong> ${new Date().toLocaleDateString()}</div>
                ${patient.contact_number ? `<div><strong>Phone:</strong> ${patient.contact_number}</div>` : ''}
                ${patient.address ? `<div><strong>Address:</strong> ${patient.address}</div>` : ''}
              `;
            }
          })
          .catch(error => {
            console.error('[DraftOrders] Error fetching patient data:', error);
          });

        // Write the HTML content directly to the new window
        prescriptionWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Medical Prescription</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                margin: 40px;
                line-height: 1.5;
                color: #333;
              }
              .header {
                text-align: center;
                margin-bottom: 30px;
                padding-bottom: 20px;
                border-bottom: 2px solid #0066cc;
              }
              .clinic-name {
                font-size: 24px;
                font-weight: bold;
                color: #0066cc;
                margin-bottom: 5px;
              }
              .clinic-info {
                font-size: 14px;
              }
              .rx-symbol {
                float: left;
                border: 2px solid #0066cc;
                width: 50px;
                height: 50px;
                text-align: center;
                font-size: 32px;
                font-weight: bold;
                color: #0066cc;
                border-radius: 5px;
                margin-right: 15px;
                margin-top: 5px;
              }
              .rx-symbol span {
                position: relative;
                top: 5px;
              }
              .patient-info {
                margin: 20px 0;
                padding: 20px;
                border: 1px solid #ddd;
                border-radius: 5px;
                background-color: #f9f9f9;
              }
              .medication {
                margin: 20px 0;
                padding: 15px;
                border-bottom: 1px solid #ddd;
              }
              .medication-name {
                font-size: 18px;
                font-weight: bold;
                color: #0066cc;
                margin-bottom: 10px;
              }
              .medication-details {
                margin-left: 20px;
              }
              .signature {
                margin-top: 50px;
                border-top: 1px solid #ddd;
                padding-top: 20px;
                width: 300px;
              }
              h2 {
                text-align: center;
                color: #0066cc;
                margin: 30px 0;
              }
              .print-button {
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 10px 20px;
                background: #0066cc;
                color: white;
                border: none;
                border-radius: 5px;
                cursor: pointer;
                font-weight: bold;
                box-shadow: 0 2px 4px rgba(0,0,0,0.2);
              }
              .print-button:hover {
                background: #0055aa;
              }
              @media print {
                .print-button {
                  display: none;
                }
                body {
                  margin: 0;
                  padding: 20px;
                }
                .header {
                  margin-bottom: 20px;
                }
              }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="clinic-name">Mission Hillsboro Medical Clinic</div>
              <div class="clinic-info">123 Health Avenue, Hillsboro, OR 97123</div>
              <div class="clinic-info">Phone: (503) 555-1234 | Fax: (503) 555-5678</div>
            </div>

            <div class="rx-symbol">
              <span>Rx</span>
            </div>

            <h2>Prescription</h2>

            <div id="patient-info" class="patient-info">
              <div><strong>Patient ID:</strong> ${patientId}</div>
              <div><strong>Date:</strong> ${new Date().toLocaleDateString()}</div>
            </div>

            <h3>Medications:</h3>
            <div id="medications-list">
              ${medicationOrders.map((order: any) => `
                <div class="medication">
                  <div class="medication-name">${order.medication_name || 'Unnamed Medication'}</div>
                  <div class="medication-details">
                    ${order.dosage ? `<div><strong>Dosage:</strong> ${order.dosage}</div>` : ''}
                    ${order.frequency ? `<div><strong>Frequency:</strong> ${order.frequency}</div>` : ''}
                    ${order.quantity ? `<div><strong>Quantity:</strong> ${order.quantity}</div>` : ''}
                    ${order.refills ? `<div><strong>Refills:</strong> ${order.refills}</div>` : ''}
                    ${order.provider_notes ? `<div><strong>Instructions:</strong> ${order.provider_notes}</div>` : ''}
                  </div>
                </div>
              `).join('')}
            </div>

            <div class="signature">
              <div>Provider Signature</div>
              <div>License: #12345</div>
              <div>NPI: 1234567890</div>
            </div>

            <button class="print-button" onclick="window.print()">Print Prescription</button>
          </body>
          </html>
        `);

        // Close the document to finish loading
        prescriptionWindow.document.close();

        // The code below is kept as a fallback but won't be reached in normal operation
        if (false && result.pdfUrls && Array.isArray(result.pdfUrls) && result.pdfUrls.length > 0) {
          console.log(`[DraftOrders] Opening combined PDF in new tab`);

          // Open the combined PDF in a new tab - there should be just one URL containing all medications
          const pdfUrl = result.pdfUrls[0];
          if (pdfUrl) {
            const fullUrl = pdfUrl.startsWith('/') && !pdfUrl.startsWith('/api') 
              ? `/api${pdfUrl}` 
              : pdfUrl;
            console.log(`[DraftOrders] Opening combined PDF: ${fullUrl}`);
            window.open(fullUrl, "_blank");
          }
        } else if (false && result.pdfUrl) {
          // For a single order, open it directly
          const fullUrl = result.pdfUrl.startsWith('/') && !result.pdfUrl.startsWith('/api') 
            ? result.pdfUrl 
            : result.pdfUrl;
          console.log(`[DraftOrders] Opening single PDF: ${fullUrl}`);
          window.open(fullUrl, "_blank");
        } else {
          console.log("[DraftOrders] Using new HTML viewer instead of PDF generation");

          // Fallback if no PDF URLs are returned: print each medication individually
          if (result.orders && Array.isArray(result.orders) && result.orders.length > 0) {
            // Create a combined print request with all medication order IDs
            const approvedMedications = result.orders.filter((order: any) => 
              order.order_type === 'medication' && order.order_status === 'approved'
            );

            // If there's only one medication, use the existing printOrder function
            if (approvedMedications.length === 1) {
              printOrder(approvedMedications[0].id);
            } 
            // For multiple medications, create a combined print request
            else if (approvedMedications.length > 1) {
              // Just print the first one as a fallback in case combined printing isn't working
              printOrder(approvedMedications[0].id);
            }
            const medicationOrders = result.orders.filter((order: any) => 
              order.order_type === 'medication' && order.order_status === 'approved'
            );

            console.log(`[DraftOrders] Found ${medicationOrders.length} approved medication orders to print`);

            // Print each medication order
            medicationOrders.forEach((order: any) => {
              printOrder(order.id);
            });
          } else {
            console.warn("[DraftOrders] No orders returned from server for print option");
          }
        }
      }

      // Force refresh to get the latest order status
      queryClient.invalidateQueries({
        queryKey: [`/api/patients/${patientId}/orders/draft`],
      });

      // Close dialog if it was open
      setShowPreferenceDialog(false);

      toast({ 
        description: `Successfully signed ${result.count || 0} orders` + 
                     ((preference || medicationPreference) === "pharmacy" && result.sentToPharmacy ? 
                     ` (${result.sentToPharmacy} sent to pharmacy)` : "")
      });
    } catch (error) {
      console.error("[DraftOrders] Error signing all orders:", error);
      toast({
        variant: "destructive",
        description: "Failed to sign all orders. Please try again.",
      });
      // Close dialog if it was open
      setShowPreferenceDialog(false);
    }
  };

  const handleDeleteOrder = async (orderId: number) => {
    try {
      // Check if the order is already being processed
      if (pendingOrders.has(orderId)) {
        console.log(`[DraftOrders] Order ${orderId} is already being processed, cannot delete`);
        return;
      }

      // Add the order to the pending set
      const newPendingOrders = new Set(pendingOrders);
      newPendingOrders.add(orderId);
      setPendingOrders(newPendingOrders);

      console.log(`[DraftOrders] Deleting order ${orderId}`);
      const response = await fetch(`/api/orders/${orderId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new Error(`Failed to delete order: ${response.status}`);
      }

      const result = await response.json();
      console.log(`[DraftOrders] Order ${orderId} deleted successfully:`, result);

      // Update the UI by modifying the local query data
      const existingOrders = queryClient.getQueryData<Order[]>([
        `/api/patients/${patientId}/orders/draft`,
      ]) || [];

      // Remove the deleted order from the local cache
      const updatedOrders = existingOrders.filter(order => order.id !== orderId);
      queryClient.setQueryData<Order[]>(
        [`/api/patients/${patientId}/orders/draft`],
        updatedOrders
      );

      toast({ description: "Order deleted successfully" });
    } catch (error) {
      console.error(`[DraftOrders] Error deleting order ${orderId}:`, error);
      toast({
        variant: "destructive",
        description: "Failed to delete order. Please try again.",
      });
    } finally {
      // Remove the order from the pending set
      const newPendingOrders = new Set(pendingOrders);
      newPendingOrders.delete(orderId);
      setPendingOrders(newPendingOrders);
    }
  };

  function getOrderContent(order: Order) {
    const isPending = pendingOrders.has(order.id);
    const statusLabel =
      order.order_status === "draft"
        ? "Draft"
        : order.order_status === "pending"
        ? "Pending"
        : order.order_status === "approved"
        ? "Signed"
        : order.order_status === "completed"
        ? "Completed"
        : "Unknown";

    const statusColor =
      order.order_status === "draft"
        ? "bg-gray-200 text-gray-800"
        : order.order_status === "pending"
        ? "bg-yellow-200 text-yellow-800"
        : order.order_status === "approved"
        ? "bg-green-200 text-green-800"
        : order.order_status === "completed"
        ? "bg-blue-200 text-blue-800"
        : "bg-gray-200 text-gray-800";

    return (
      <div className="flex flex-col">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center">
              <h3 className="text-base font-medium mb-1 flex items-center">
                {order.order_type === "medication" && order.medication_name}
                {order.order_type === "lab" && order.lab_name}
                {order.order_type === "imaging" && order.study_type}
                {order.order_type === "referral" && "Referral"}
                {order.order_type === "other" && "Other Order"}
              </h3>
              <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${statusColor}`}>
                {statusLabel}
              </span>
            </div>
            <div className="text-sm text-gray-600">
              {order.order_type === "medication" && (
                <div>
                  <span className="text-gray-700 font-medium">Dosage: </span>
                  {order.dosage || "Not specified"}
                  <br />
                  <span className="text-gray-700 font-medium">Instructions: </span>
                  {order.sig || "Not specified"}
                  <br />
                  <span className="text-gray-700 font-medium">Quantity: </span>
                  {order.quantity || 0} {order.form || "tabs"}, {order.refills || 0} refills
                  {order.diagnosis_code && (
                    <>
                      <br />
                      <span className="text-gray-700 font-medium">Diagnosis: </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                        {order.diagnosis_code}
                      </span>
                    </>
                  )}
                </div>
              )}
              {order.order_type === "lab" && (
                <div>
                  <span className="text-gray-700 font-medium">Test: </span>
                  {order.lab_name || "Not specified"}
                  <br />
                  <span className="text-gray-700 font-medium">Priority: </span>
                  {order.priority || "Routine"}
                  {order.diagnosis_code && (
                    <>
                      <br />
                      <span className="text-gray-700 font-medium">Diagnosis: </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                        {order.diagnosis_code}
                      </span>
                    </>
                  )}
                </div>
              )}
              {order.order_type === "imaging" && (
                <div>
                  <span className="text-gray-700 font-medium">Study: </span>
                  {order.study_type || "Not specified"}
                  <br />
                  <span className="text-gray-700 font-medium">Region: </span>
                  {order.region || "Not specified"}
                  {order.diagnosis_code && (
                    <>
                      <br />
                      <span className="text-gray-700 font-medium">Diagnosis: </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                        {order.diagnosis_code}
                      </span>
                    </>
                  )}
                </div>
              )}
              {(order.order_type === "referral" || order.order_type === "other") && (
                <div>{order.provider_notes || "No details provided"}</div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  function getActionButtons(order: Order) {
    const isPending = pendingOrders.has(order.id);
    const isApproved = order.order_status === "approved";
    const isCompleted = order.order_status === "completed";

    return (
      <div className="flex space-x-1">
        {!isApproved && !isCompleted && (
          <>
            <Button
              variant="outline"
              size="icon"
              onClick={() => handleApproveOrder(order.id)}
              title="Sign Order"
              className="h-7 w-7 p-0"
              disabled={isPending}
            >
              {isPending ? (
                <svg
                  className="animate-spin h-4 w-4 text-green-600"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              ) : (
                <Check className="h-4 w-4" />
              )}
            </Button>

            <Button
              variant="outline"
              size="icon"
              onClick={() => handleDeleteOrder(order.id)}
              title="Delete Order"
              className="h-7 w-7 p-0 text-red-600 hover:bg-red-50"
              disabled={isPending}
            >
              {isPending ? (
                <svg
                  className="animate-spin h-4 w-4 text-red-600"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              ) : (
                <X className="h-4 w-4" />
              )}
            </Button>
          </>
        )}
        <Button
          variant="outline"
          size="icon"
          onClick={() => handleEdit(order)}
          title="Edit"
          className="h-7 w-7 p-0"
          disabled={isApproved || isCompleted}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
          >
            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
            <path d="m15 5 4 4" />
          </svg>
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => printOrder(order.id)}
          title="Print"
          className="h-7 w-7 p-0"
        >
          <Printer className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <Card className="h-full border-0 bg-white">
      <CardHeader className="pb-3 border-b bg-gray-50">
        <div className="flex flex-col space-y-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg font-semibold text-gray-900">
              Draft Orders
            </CardTitle>
            <div className="flex items-center">
              {hasMedicationOrders && (
                <div className="mr-4 flex items-center">
                  <span className="text-sm text-gray-600 mr-2">Rx:</span>
                  <RadioGroup 
                    value={medicationPreference} 
                    onValueChange={(value) => {
                      setMedicationPreference(value);
                      // Save preference if user changes it
                      if (savePreference) {
                        fetch(`/api/patients/${patientId}/medication-preference`, {
                          method: "PUT",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ preference: value }),
                        }).catch(err => console.error("Error saving preference:", err));
                      }
                    }}
                    className="flex items-center space-x-4"
                  >
                    <div className="flex items-center space-x-1">
                      <RadioGroupItem value="print" id="print_inline" />
                      <Label htmlFor="print_inline" className="text-sm cursor-pointer">Print</Label>
                    </div>
                    <div className="flex items-center space-x-1">
                      <RadioGroupItem value="pharmacy" id="pharmacy_inline" />
                      <Label htmlFor="pharmacy_inline" className="text-sm cursor-pointer">Pharmacy</Label>
                    </div>
                  </RadioGroup>
                </div>
              )}
              {/* Sign All button - only show if there are any draft orders */}
              {draftOrders.some((order) => order.order_status === "draft") && (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center space-x-1 mr-2 text-green-600 border-green-600 hover:bg-green-50"
                  onClick={() => signAllOrders(medicationPreference)}
                >
                  <Check className="h-4 w-4 mr-1" />
                  Sign All
                </Button>
              )}

            <NewOrderDialog />
          </div>
        </div>
      </div>
      </CardHeader>
      <CardContent className="p-0 h-full overflow-y-auto">
        <div className="w-full h-full min-h-[200px]">
          <ScrollArea className="h-full" type="auto">
            {isPending ? (
              <div className="flex justify-center items-center h-32">
                <div className="flex flex-col items-center">
                  <svg
                    className="animate-spin h-6 w-6 text-blue-600 mb-2"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  <p className="text-sm text-gray-600">Loading orders...</p>
                </div>
              </div>
            ) : draftOrders.length === 0 ? (
              <div className="flex justify-center items-center h-32">
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-2">No draft orders</p>
                  <p className="text-xs text-gray-500">
                    Create a new order using the button above
                  </p>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {draftOrders.map((order) => (
                  <div
                    key={order.id}
                    className="p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">{getOrderContent(order)}</div>
                      <div className="ml-4 flex-shrink-0">
                        {getActionButtons(order)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </CardContent>
      <EditOrderDialog />
    </Card>
  );
}