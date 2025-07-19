import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Pill, FlaskConical, Scan, UserCheck, Edit, Trash2, Plus, Save, X, RefreshCw, PenTool, Settings, Maximize2, Minimize2, Send } from "lucide-react";
import { MedicationInputHelper } from "./medication-input-helper";
import { FastMedicationIntelligence } from "./fast-medication-intelligence";
import { OrderPreferencesDialog } from "./order-preferences-dialog";
import { OrderPreferencesIndicator } from "./order-preferences-indicator";
import { PrescriptionTransmissionDialog } from "@/components/eprescribing/prescription-transmission-dialog";

interface Order {
  id: number;
  patientId: number;
  encounterId?: number;
  orderType: string;
  orderStatus: string;
  referenceId?: number;
  providerNotes?: string;
  priority?: string;
  clinicalIndication?: string;

  // Medication fields
  medicationName?: string;
  dosage?: string;
  quantity?: number;
  quantityUnit?: string;
  sig?: string;
  refills?: number;
  form?: string;
  routeOfAdministration?: string;
  daysSupply?: number;
  diagnosisCode?: string;
  requiresPriorAuth?: boolean;
  priorAuthNumber?: string;

  // Lab fields
  labName?: string;
  testName?: string;
  testCode?: string;
  specimenType?: string;
  fastingRequired?: boolean;

  // Imaging fields
  studyType?: string;
  region?: string;
  laterality?: string;
  contrastNeeded?: boolean;

  // Referral fields
  specialtyType?: string;
  providerName?: string;
  urgency?: string;

  orderedBy?: number;
  createdAt?: string;
  updatedAt?: string;
}

interface DraftOrdersProps {
  patientId: number;
  encounterId?: number;
  isAutoGenerating?: boolean;
  ordersProgress?: number;
}

export function DraftOrders({ patientId, encounterId, isAutoGenerating = false, ordersProgress = 0 }: DraftOrdersProps) {
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [showNewOrderDialog, setShowNewOrderDialog] = useState(false);
  const [isDialogExpanded, setIsDialogExpanded] = useState(false);
  const [showEprescribingDialog, setShowEprescribingDialog] = useState(false);
  const [selectedMedicationOrder, setSelectedMedicationOrder] = useState<Order | null>(null);
  const [pendingSignOrder, setPendingSignOrder] = useState<Order | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch draft orders
  const { data: orders = [], isLoading, refetch } = useQuery({
    queryKey: ["/api/patients", patientId, "draft-orders"],
    queryFn: async () => {
      const response = await fetch(`/api/patients/${patientId}/draft-orders`);
      if (!response.ok) throw new Error("Failed to fetch draft orders");
      return response.json();
    },
    refetchInterval: 2000, // Auto-refresh every 2 seconds for immediate draft orders
  });

  // Fetch order preferences
  const { data: orderPreferencesResponse } = useQuery({
    queryKey: [`/api/patients/${patientId}/order-preferences`],
  });
  const orderPreferencesData = orderPreferencesResponse?.data;

  // Update order mutation
  const updateOrderMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<Order> }) => {
      const response = await fetch(`/api/orders/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!response.ok) {
        const errorData = await response.json();
        // If there are validation errors, throw them
        if (errorData.errors && Array.isArray(errorData.errors)) {
          throw new Error(errorData.errors.join('\n'));
        }
        throw new Error(errorData.message || "Failed to update order");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/patients/${patientId}/draft-orders`] });
      queryClient.invalidateQueries({ queryKey: [`/api/patients/${patientId}/medications-enhanced`] });
      setEditingOrder(null);
      toast({ title: "Order updated successfully" });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to update order",
        description: error.message,
      });
    },
  });

  // Delete order mutation
  const deleteOrderMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/orders/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete order");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/patients/${patientId}/draft-orders`] });
      queryClient.invalidateQueries({ queryKey: [`/api/patients/${patientId}/medications-enhanced`] });
      toast({ title: "Order deleted successfully" });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to delete order",
        description: error.message,
      });
    },
  });

  // Delete all orders mutation
  const deleteAllOrdersMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/patients/${patientId}/draft-orders`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete all orders");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/patients/${patientId}/draft-orders`] });
      queryClient.invalidateQueries({ queryKey: [`/api/patients/${patientId}/medications-enhanced`] });
      toast({ title: "All orders deleted successfully" });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to delete all orders",
        description: error.message,
      });
    },
  });

  // Create order mutation
  const createOrderMutation = useMutation({
    mutationFn: async (orderData: Partial<Order>) => {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...orderData,
          patientId,
          encounterId,
          orderStatus: "draft",
        }),
      });
      if (!response.ok) throw new Error("Failed to create order");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/patients/${patientId}/draft-orders`] });
      queryClient.invalidateQueries({ queryKey: [`/api/patients/${patientId}/medications-enhanced`] });
      setShowNewOrderDialog(false);
      toast({ title: "Order created successfully" });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to create order",
        description: error.message,
      });
    },
  });

  // Sign individual order mutation
  const signOrderMutation = useMutation({
    mutationFn: async (orderId: number) => {
      const response = await fetch(`/api/orders/${orderId}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to sign order');
      }
      return response.json();
    },
    onSuccess: (data) => {
      // Invalidate multiple related queries to ensure UI consistency
      queryClient.invalidateQueries({ queryKey: [`/api/patients/${patientId}/draft-orders`] });
      queryClient.invalidateQueries({ queryKey: [`/api/patients/${patientId}/medications-enhanced`] });
      queryClient.invalidateQueries({ queryKey: [`/api/encounters/${encounterId}/validation`] });
      queryClient.invalidateQueries({ queryKey: [`/api/encounters/${encounterId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/patients/${patientId}/encounters`] });
      
      // Dispatch custom event to trigger immediate validation refresh
      window.dispatchEvent(new CustomEvent('orderSigned'));
      
      toast({ title: "Order signed successfully" });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to sign order",
        description: error.message,
      });
    },
  });

  // Bulk sign orders by type mutation
  const bulkSignMutation = useMutation({
    mutationFn: async (orderType?: string) => {
      const ordersToSign = orderType 
        ? orders.filter((order: Order) => order.orderType === orderType && order.orderStatus === 'draft')
        : orders.filter((order: Order) => order.orderStatus === 'draft');
      
      const orderIds = ordersToSign.map((order: Order) => order.id);
      
      const response = await fetch('/api/orders/bulk-sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderIds })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to bulk sign orders');
      }
      
      return response.json();
    },
    onSuccess: (data, orderType) => {
      // Invalidate multiple related queries to ensure UI consistency
      queryClient.invalidateQueries({ queryKey: [`/api/patients/${patientId}/draft-orders`] });
      queryClient.invalidateQueries({ queryKey: [`/api/patients/${patientId}/medications-enhanced`] });
      queryClient.invalidateQueries({ queryKey: [`/api/encounters/${encounterId}/validation`] });
      queryClient.invalidateQueries({ queryKey: [`/api/encounters/${encounterId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/patients/${patientId}/encounters`] });
      
      // Dispatch custom event to trigger immediate validation refresh
      window.dispatchEvent(new CustomEvent('orderSigned'));
      
      toast({ 
        title: "Orders signed successfully",
        description: orderType ? `All ${orderType} orders signed` : "All orders signed"
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to bulk sign orders",
        description: error.message,
      });
    },
  });

  // Update from SOAP mutation
  const updateFromSOAPMutation = useMutation({
    mutationFn: async () => {
      if (!encounterId) {
        throw new Error("No encounter ID available");
      }
      
      const response = await fetch(`/api/encounters/${encounterId}/extract-orders-from-soap`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Failed to extract orders from SOAP note: ${errorData}`);
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/patients/${patientId}/draft-orders`] });
      queryClient.invalidateQueries({ queryKey: [`/api/patients/${patientId}/medications-enhanced`] });
      toast({ 
        title: "Orders Updated from SOAP", 
        description: `Successfully extracted ${data.ordersCount || 0} orders from the SOAP note.` 
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to update from SOAP",
        description: error.message,
      });
    },
  });

  const handleSaveOrder = (order: Order) => {
    updateOrderMutation.mutate({ id: order.id, updates: order });
  };

  const handleDeleteOrder = (id: number) => {
    if (confirm("Are you sure you want to delete this order?")) {
      deleteOrderMutation.mutate(id);
    }
  };

  const handleDeleteAll = () => {
    if (confirm(`Are you sure you want to delete all ${orders.length} orders? This action cannot be undone.`)) {
      deleteAllOrdersMutation.mutate();
    }
  };

  // One-click prescribing workflow
  const handleSignOrder = (order: Order) => {
    if (order.orderType === 'medication') {
      // For medications, open pharmacy dialog first
      setPendingSignOrder(order);
      setSelectedMedicationOrder(order);
      setShowEprescribingDialog(true);
    } else {
      // For non-medication orders, just sign directly
      signOrderMutation.mutate(order.id);
    }
  };

  const getOrderIcon = (orderType: string) => {
    switch (orderType) {
      case "medication": return <Pill className="h-4 w-4" />;
      case "lab": return <FlaskConical className="h-4 w-4" />;
      case "imaging": return <Scan className="h-4 w-4" />;
      case "referral": return <UserCheck className="h-4 w-4" />;
      default: return null;
    }
  };

  const getOrdersByType = (type: string) => orders.filter((order: Order) => order.orderType === type);

  // Sort and group orders for the "All" tab
  const getSortedAndGroupedOrders = () => {
    const orderTypeOrder = ['lab', 'imaging', 'medication', 'referral'];
    
    return orders
      .slice() // Create a copy to avoid mutating original array
      .sort((a: Order, b: Order) => {
        // First, sort by order type according to our preferred order
        const aTypeIndex = orderTypeOrder.indexOf(a.orderType);
        const bTypeIndex = orderTypeOrder.indexOf(b.orderType);
        
        if (aTypeIndex !== bTypeIndex) {
          return aTypeIndex - bTypeIndex;
        }
        
        // Then sort alphabetically within each type
        const getOrderName = (order: Order) => {
          switch (order.orderType) {
            case 'medication':
              return order.medicationName || '';
            case 'lab':
              return order.testName || order.labName || '';
            case 'imaging':
              return order.studyType || '';
            case 'referral':
              return order.specialtyType || '';
            default:
              return '';
          }
        };
        
        const aName = getOrderName(a).toLowerCase();
        const bName = getOrderName(b).toLowerCase();
        return aName.localeCompare(bName);
      });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold">Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-xl font-semibold">
          Orders
          {orders.length > 0 && (
            <Badge variant="secondary">{orders.length}</Badge>
          )}
        </CardTitle>
        <div className="flex gap-2">
          {encounterId && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => updateFromSOAPMutation.mutate()}
              disabled={updateFromSOAPMutation.isPending || isAutoGenerating}
              className={`relative overflow-hidden transition-all duration-300 ${
                isAutoGenerating 
                  ? 'bg-gray-100 text-gray-500 border-gray-300 cursor-not-allowed' 
                  : 'bg-navy-blue-50 hover:bg-navy-blue-100 text-navy-blue-700 border-navy-blue-200 hover:border-navy-blue-300'
              }`}
              title={isAutoGenerating ? `Processing orders... ${Math.round(ordersProgress)}% complete` : "Generate draft orders from SOAP note content"}
            >
              {/* Progress bar background */}
              {isAutoGenerating && (
                <div 
                  className="absolute inset-0 bg-gradient-to-r from-blue-200 to-blue-300 transition-all duration-100 ease-linear"
                  style={{ 
                    width: `${ordersProgress}%`,
                    opacity: 0.3
                  }}
                />
              )}
              
              <RefreshCw className={`h-4 w-4 mr-2 relative z-10 ${
                (updateFromSOAPMutation.isPending || isAutoGenerating) ? 'animate-spin' : ''
              }`} />
              
              <span className="relative z-10">
                {isAutoGenerating 
                  ? `Processing... ${Math.round(ordersProgress)}%`
                  : updateFromSOAPMutation.isPending 
                  ? "Generating..." 
                  : "Update from SOAP"
                }
              </span>
            </Button>
          )}
          {orders.some((order: Order) => order.orderStatus === 'draft') && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => bulkSignMutation.mutate(undefined)}
              disabled={bulkSignMutation.isPending}
              className="text-navy-blue-600 border-navy-blue-200 hover:bg-navy-blue-50"
            >
              <PenTool className="h-4 w-4 mr-2" />
              {bulkSignMutation.isPending ? "Signing..." : "Sign All"}
            </Button>
          )}
          {orders.length > 0 && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleDeleteAll}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
              disabled={deleteAllOrdersMutation.isPending}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {deleteAllOrdersMutation.isPending ? "Deleting..." : "Delete All"}
            </Button>
          )}
          <Dialog open={showNewOrderDialog} onOpenChange={setShowNewOrderDialog}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Order
              </Button>
            </DialogTrigger>
            <DialogContent className={`transition-all duration-300 ${isDialogExpanded ? "max-w-7xl h-[90vh]" : "max-w-4xl h-auto"}`}>
            <DialogHeader className="space-y-3">
              <div className="flex items-center justify-between">
                <DialogTitle className="text-xl">Add New Orders</DialogTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsDialogExpanded(!isDialogExpanded)}
                  className="hover:bg-gray-100"
                >
                  {isDialogExpanded ? (
                    <>
                      <Minimize2 className="h-4 w-4 mr-1" />
                      Collapse
                    </>
                  ) : (
                    <>
                      <Maximize2 className="h-4 w-4 mr-1" />
                      Expand
                    </>
                  )}
                </Button>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                Type multiple orders in natural language. The AI will parse medications, labs, imaging, and referrals automatically.
              </p>
            </DialogHeader>
            <div className={`mt-4 ${isDialogExpanded ? "overflow-y-auto max-h-[calc(90vh-180px)]" : ""}`}>
              <NewOrderForm
                onSubmit={(orderData) => createOrderMutation.mutate(orderData)}
                isSubmitting={createOrderMutation.isPending}
                isExpanded={isDialogExpanded}
              />
            </div>
          </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {orders.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="text-sm">No orders yet</div>
            <div className="text-xs mt-1">
              Orders will appear here automatically after recording clinical notes
            </div>
          </div>
        ) : (
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="all">All ({orders.length})</TabsTrigger>
              <TabsTrigger value="medication" className="relative">
                <div className="flex items-center gap-1">
                  Meds ({getOrdersByType("medication").length})
                  <OrderPreferencesIndicator patientId={patientId} orderType="medication" />
                  <OrderPreferencesDialog patientId={patientId} orderType="medication">
                    <Button variant="ghost" size="sm" className="h-4 w-4 p-0 ml-1">
                      <Settings className="h-3 w-3" />
                    </Button>
                  </OrderPreferencesDialog>
                </div>
              </TabsTrigger>
              <TabsTrigger value="lab" className="relative">
                <div className="flex items-center gap-1">
                  Labs ({getOrdersByType("lab").length})
                  <OrderPreferencesIndicator patientId={patientId} orderType="lab" />
                  <OrderPreferencesDialog patientId={patientId} orderType="lab">
                    <Button variant="ghost" size="sm" className="h-4 w-4 p-0 ml-1">
                      <Settings className="h-3 w-3" />
                    </Button>
                  </OrderPreferencesDialog>
                </div>
              </TabsTrigger>
              <TabsTrigger value="imaging" className="relative">
                <div className="flex items-center gap-1">
                  Imaging ({getOrdersByType("imaging").length})
                  <OrderPreferencesIndicator patientId={patientId} orderType="imaging" />
                  <OrderPreferencesDialog patientId={patientId} orderType="imaging">
                    <Button variant="ghost" size="sm" className="h-4 w-4 p-0 ml-1">
                      <Settings className="h-3 w-3" />
                    </Button>
                  </OrderPreferencesDialog>
                </div>
              </TabsTrigger>
              <TabsTrigger value="referral">
                Referrals ({getOrdersByType("referral").length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-2">
              {getSortedAndGroupedOrders().map((order: Order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onEdit={setEditingOrder}
                  onDelete={handleDeleteOrder}
                  onSign={() => handleSignOrder(order)}
                  onSendToPharmacy={order.orderType === 'medication' && order.orderStatus === 'signed' ? () => {
                    setSelectedMedicationOrder(order);
                    setShowEprescribingDialog(true);
                  } : undefined}
                  isEditing={editingOrder?.id === order.id}
                  onSave={handleSaveOrder}
                  onCancelEdit={() => setEditingOrder(null)}
                />
              ))}
            </TabsContent>

            {["medication", "lab", "imaging", "referral"].map((type) => (
              <TabsContent key={type} value={type} className="space-y-2">
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-2">
                    <div className="text-sm text-gray-600">
                      {getOrdersByType(type).length} {type} orders
                    </div>
                    {(type === "medication" || type === "lab" || type === "imaging") && (
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        Delivery:
                        <OrderPreferencesIndicator 
                          patientId={patientId} 
                          orderType={type as "medication" | "lab" | "imaging"} 
                        />
                      </div>
                    )}
                  </div>
                  {getOrdersByType(type).some((order: Order) => order.orderStatus === 'draft') && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        // For medications, ensure pharmacy is selected first
                        if (type === 'medication' && !orderPreferencesData?.medicationDeliveryMethod) {
                          toast.error("Please select pharmacy preferences before signing medications", {
                            description: "Click on the delivery indicator to set up pharmacy preferences"
                          });
                        } else {
                          bulkSignMutation.mutate(type);
                        }
                      }}
                      disabled={bulkSignMutation.isPending}
                      className="text-navy-blue-600 border-navy-blue-200 hover:bg-navy-blue-50"
                    >
                      <PenTool className="h-4 w-4 mr-2" />
                      Sign All {type}
                    </Button>
                  )}
                </div>
                {getOrdersByType(type).map((order: Order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onEdit={setEditingOrder}
                    onDelete={handleDeleteOrder}
                    onSign={() => handleSignOrder(order)}
                    onSendToPharmacy={order.orderType === 'medication' && order.orderStatus === 'signed' ? () => {
                      setSelectedMedicationOrder(order);
                      setShowEprescribingDialog(true);
                    } : undefined}
                    isEditing={editingOrder?.id === order.id}
                    onSave={handleSaveOrder}
                    onCancelEdit={() => setEditingOrder(null)}
                  />
                ))}
                {getOrdersByType(type).length === 0 && (
                  <div className="text-center py-4 text-gray-500 text-sm">
                    No {type} orders
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        )}
      </CardContent>
    </Card>

    {showEprescribingDialog && selectedMedicationOrder && (
      <PrescriptionTransmissionDialog
        open={showEprescribingDialog}
        onOpenChange={(open) => {
          setShowEprescribingDialog(open);
          if (!open && pendingSignOrder) {
            // If dialog is closed and we have a pending order, sign it
            signOrderMutation.mutate(pendingSignOrder.id);
            setPendingSignOrder(null);
          }
        }}
        patientId={patientId}
        medications={[{
          id: selectedMedicationOrder.id,
          orderId: selectedMedicationOrder.id,
          name: selectedMedicationOrder.medicationName || '',
          strength: selectedMedicationOrder.dosage || '',
          dosageForm: selectedMedicationOrder.form || '',
          quantity: selectedMedicationOrder.quantity || 0,
          quantityUnit: selectedMedicationOrder.quantityUnit || '',
          sig: selectedMedicationOrder.sig || '',
          refills: selectedMedicationOrder.refills || 0,
          deaSchedule: selectedMedicationOrder.deaSchedule
        }]}
        onTransmissionComplete={() => {
          toast({ title: "Prescription sent successfully" });
          setShowEprescribingDialog(false);
          if (pendingSignOrder) {
            // Sign the order after successful transmission
            signOrderMutation.mutate(pendingSignOrder.id);
            setPendingSignOrder(null);
          }
        }}
      />
    )}
    </>
  );
}

interface OrderCardProps {
  order: Order;
  onEdit: (order: Order) => void;
  onDelete: (id: number) => void;
  onSign: (id: number) => void;
  onSendToPharmacy?: () => void;
  isEditing: boolean;
  onSave: (order: Order) => void;
  onCancelEdit: () => void;
}

function OrderCard({ order, onEdit, onDelete, onSign, onSendToPharmacy, isEditing, onSave, onCancelEdit }: OrderCardProps) {
  const [editedOrder, setEditedOrder] = useState<Order>(order);

  useEffect(() => {
    setEditedOrder(order);
  }, [order]);

  if (isEditing) {
    return (
      <Card className="border-navy-blue-200">
        <CardContent className="p-4">
          <OrderEditForm
            order={editedOrder}
            onChange={setEditedOrder}
            onSave={() => onSave(editedOrder)}
            onCancel={onCancelEdit}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="mt-1">
              {order.orderType && getOrderIcon(order.orderType)}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="text-xs">
                  {order.orderType}
                </Badge>
                <Badge variant={order.priority === "urgent" ? "destructive" : "secondary"} className="text-xs">
                  {order.priority || "routine"}
                </Badge>
                {order.orderStatus === 'signed' && (
                  <Badge className="text-xs bg-green-100 text-green-800 border-green-200">
                    Signed
                  </Badge>
                )}
                {order.orderStatus === 'draft' && (
                  <Badge variant="outline" className="text-xs border-orange-200 text-orange-700">
                    Requires Signature
                  </Badge>
                )}
              </div>
              <OrderContent order={order} />
              {order.clinicalIndication && (
                <div className="text-sm text-gray-600 mt-2">
                  <strong>Indication:</strong> {order.clinicalIndication}
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-1">
            {order.orderStatus === 'draft' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onSign(order.id)}
                className="text-navy-blue-600 border-navy-blue-200 hover:bg-navy-blue-50"
              >
                <PenTool className="h-4 w-4" />
              </Button>
            )}
            {order.orderStatus === 'signed' && order.orderType === 'medication' && onSendToPharmacy && (
              <Button
                size="sm"
                variant="outline"
                onClick={onSendToPharmacy}
                className="text-blue-600 border-blue-200 hover:bg-blue-50"
                title="Send to Pharmacy"
              >
                <Send className="h-4 w-4" />
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onEdit(order)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onDelete(order.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function OrderContent({ order }: { order: Order }) {
  switch (order.orderType) {
    case "medication":
      return (
        <div>
          <div className="font-medium text-gray-900">{order.medicationName}</div>
          <div className="text-sm text-gray-700 font-medium">
            {order.dosage} {order.form ? `${order.form}` : 'tablet'} {order.routeOfAdministration && order.routeOfAdministration !== 'oral' ? `- ${order.routeOfAdministration}` : ''}
          </div>
          <div className="text-sm text-gray-600 mb-2 italic">{order.sig}</div>
          <div className="text-xs text-gray-500 grid grid-cols-3 gap-2">
            <span><strong>Qty:</strong> {order.quantity}{order.quantityUnit ? ` ${order.quantityUnit}` : ''}</span>
            <span><strong>Refills:</strong> {order.refills}</span>
            {order.daysSupply && <span><strong>Days:</strong> {order.daysSupply}</span>}
          </div>
          {order.diagnosisCode && (
            <div className="text-xs text-navy-blue-600 mt-1 font-medium">ICD-10: {order.diagnosisCode}</div>
          )}
          {order.requiresPriorAuth && (
            <div className="text-xs text-orange-600 mt-1 font-medium bg-orange-50 px-2 py-1 rounded">Prior Authorization Required</div>
          )}
        </div>
      );
    case "lab":
      return (
        <div>
          <div className="font-medium">{order.testName}</div>
          {order.labName && (
            <div className="text-sm text-gray-600">{order.labName}</div>
          )}
          <div className="text-xs text-gray-500 space-x-4 mt-1">
            <span>Specimen: {order.specimenType || 'blood'}</span>
            {order.testCode && <span>Code: {order.testCode}</span>}
          </div>
          {order.fastingRequired && (
            <div className="text-xs text-navy-blue-600 mt-1 font-medium">Fasting Required</div>
          )}
          {order.providerNotes && (
            <div className="text-xs text-gray-600 mt-1">Notes: {order.providerNotes}</div>
          )}
        </div>
      );
    case "imaging":
      return (
        <div>
          <div className="font-medium">{order.studyType}</div>
          <div className="text-sm text-gray-600">{order.region}</div>
          <div className="text-xs text-gray-500 space-x-4 mt-1">
            {order.laterality && <span>Laterality: {order.laterality}</span>}
            {order.contrastNeeded && <span className="text-purple-600 font-medium">Contrast Required</span>}
          </div>
          {order.urgency && order.urgency !== 'routine' && (
            <div className="text-xs text-red-600 mt-1 font-medium">Urgency: {order.urgency.toUpperCase()}</div>
          )}
          {order.providerNotes && (
            <div className="text-xs text-gray-600 mt-1">Notes: {order.providerNotes}</div>
          )}
        </div>
      );
    case "referral":
      return (
        <div>
          <div className="font-medium">{order.specialtyType}</div>
          {order.providerName && (
            <div className="text-sm text-gray-600">{order.providerName}</div>
          )}
          {order.urgency && order.urgency !== 'routine' && (
            <div className="text-xs text-red-600 mt-1 font-medium">Urgency: {order.urgency.toUpperCase()}</div>
          )}
          {order.providerNotes && (
            <div className="text-xs text-gray-600 mt-1">Notes: {order.providerNotes}</div>
          )}
        </div>
      );
    default:
      return <div className="font-medium">Unknown order type</div>;
  }
}

function OrderEditForm({ order, onChange, onSave, onCancel }: {
  order: Order;
  onChange: (order: Order) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const handleInputChange = (field: string, value: any) => {
    onChange({ ...order, [field]: value });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium">Edit {order.orderType} Order</h4>
        <div className="flex gap-2">
          <Button size="sm" onClick={onSave}>
            <Save className="h-4 w-4 mr-1" />
            Save
          </Button>
          <Button size="sm" variant="outline" onClick={onCancel}>
            <X className="h-4 w-4 mr-1" />
            Cancel
          </Button>
        </div>
      </div>

      {order.orderType === "medication" && (
        <MedicationEditFields order={order} onChange={handleInputChange} />
      )}
      {order.orderType === "lab" && (
        <LabEditFields order={order} onChange={handleInputChange} />
      )}
      {order.orderType === "imaging" && (
        <ImagingEditFields order={order} onChange={handleInputChange} />
      )}
      {order.orderType === "referral" && (
        <ReferralEditFields order={order} onChange={handleInputChange} />
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="priority">Priority</Label>
          <Select value={order.priority || "routine"} onValueChange={(value) => handleInputChange("priority", value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="routine">Routine</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
              <SelectItem value="stat">STAT</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="clinicalIndication">Clinical Indication</Label>
        <Textarea
          id="clinicalIndication"
          value={order.clinicalIndication || ""}
          onChange={(e) => handleInputChange("clinicalIndication", e.target.value)}
          placeholder="Reason for this order..."
        />
      </div>
    </div>
  );
}

function MedicationEditFields({ order, onChange }: { order: Order; onChange: (field: string, value: any) => void }) {
  const [validationResult, setValidationResult] = useState<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
    suggestions: string[];
    insuranceConsiderations?: string[];
    deaSchedule?: string;
    calculatedDaysSupply?: number;
    missingFieldRecommendations?: {
      sig?: string;
      quantity?: number;
      quantity_unit?: string;
      refills?: number;
      daysSupply?: number;
      route?: string;
      clinicalIndication?: string;
    };
  } | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const debounceTimer = useRef<NodeJS.Timeout>();

  // Validate medication order
  const validateOrder = useCallback(async () => {
    if (!order.medicationName) {
      return; // Only skip if no medication name at all
    }

    setIsValidating(true);
    try {
      const response = await fetch("/api/medications/validate-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          medicationName: order.medicationName,
          strength: order.dosage,
          dosageForm: order.form || "tablet",
          sig: order.sig,
          quantity: order.quantity || 30,
          quantityUnit: order.quantityUnit,
          refills: order.refills || 0,
          daysSupply: order.daysSupply,
          route: order.routeOfAdministration || "oral",
          clinicalIndication: order.clinicalIndication,
          patientId: order.patientId
        })
      });

      if (response.ok) {
        const result = await response.json();
        setValidationResult(result);
        
        // Auto-update days supply if calculated
        if (result.calculatedDaysSupply && !order.daysSupply) {
          onChange("daysSupply", result.calculatedDaysSupply);
        }
      }
    } catch (error) {
      console.error("Validation error:", error);
    } finally {
      setIsValidating(false);
    }
  }, [order, onChange]);

  // Debounced validation on field changes
  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    
    debounceTimer.current = setTimeout(() => {
      validateOrder();
    }, 1000); // 1 second debounce

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [order.medicationName, order.dosage, order.sig, order.quantity, order.refills, order.daysSupply, validateOrder]);

  // Apply GPT recommendations for missing fields
  useEffect(() => {
    console.log("📋 [MedicationEditFields] Validation result:", validationResult);
    console.log("📋 [MedicationEditFields] Missing field recommendations:", validationResult?.missingFieldRecommendations);
    
    if (validationResult?.missingFieldRecommendations) {
      const recommendations = validationResult.missingFieldRecommendations;
      
      // Only apply recommendations if fields are truly missing
      if (recommendations.sig && !order.sig) {
        console.log("📋 [MedicationEditFields] Applying sig recommendation:", recommendations.sig);
        onChange("sig", recommendations.sig);
      }
      if (recommendations.quantity && (!order.quantity || order.quantity === 0)) {
        console.log("📋 [MedicationEditFields] Applying quantity recommendation:", recommendations.quantity);
        onChange("quantity", recommendations.quantity);
      }
      if (recommendations.refills !== undefined && (order.refills === undefined || order.refills === null)) {
        console.log("📋 [MedicationEditFields] Applying refills recommendation:", recommendations.refills);
        onChange("refills", recommendations.refills);
      }
      if (recommendations.daysSupply && (!order.daysSupply || order.daysSupply === 0)) {
        console.log("📋 [MedicationEditFields] Applying daysSupply recommendation:", recommendations.daysSupply);
        onChange("daysSupply", recommendations.daysSupply);
      }
      if (recommendations.quantity_unit && !order.quantityUnit) {
        console.log("📋 [MedicationEditFields] Applying quantity_unit recommendation:", recommendations.quantity_unit);
        onChange("quantityUnit", recommendations.quantity_unit);
      }
      if (recommendations.route && !order.routeOfAdministration) {
        console.log("📋 [MedicationEditFields] Applying route recommendation:", recommendations.route);
        onChange("routeOfAdministration", recommendations.route);
      }
      if (recommendations.clinicalIndication && !order.clinicalIndication) {
        console.log("📋 [MedicationEditFields] Applying clinicalIndication recommendation:", recommendations.clinicalIndication);
        onChange("clinicalIndication", recommendations.clinicalIndication);
      }
    }
  }, [validationResult?.missingFieldRecommendations]);

  const handleIntelligentUpdate = (updates: any) => {
    // Apply intelligent medication updates
    Object.keys(updates).forEach(key => {
      if (updates[key] !== undefined) {
        onChange(key, updates[key]);
      }
    });
  };

  // Helper to determine if a field should show red border (missing required field)
  const shouldShowRedBorder = (fieldName: string): boolean => {
    // Only show red border if field is truly missing AND it's a required field
    if (fieldName === 'sig' && !order.sig) return true;
    if (fieldName === 'quantity' && (!order.quantity || order.quantity === 0)) return true;
    if (fieldName === 'refills' && (order.refills === undefined || order.refills === null)) return true;
    if (fieldName === 'daysSupply' && (!order.daysSupply || order.daysSupply === 0)) return true;
    if (fieldName === 'routeOfAdministration' && !order.routeOfAdministration) return true;
    if (fieldName === 'clinicalIndication' && !order.clinicalIndication) return true;
    return false;
  };

  // Helper to determine if a field value came from GPT recommendation
  const isGptRecommendation = (fieldName: string, value: any): boolean => {
    if (!validationResult?.missingFieldRecommendations) return false;
    const recommendations = validationResult.missingFieldRecommendations;
    
    if (fieldName === 'sig' && value === recommendations.sig) return true;
    if (fieldName === 'quantity' && value === recommendations.quantity) return true;
    if (fieldName === 'refills' && value === recommendations.refills) return true;
    if (fieldName === 'daysSupply' && value === recommendations.daysSupply) return true;
    if (fieldName === 'routeOfAdministration' && value === recommendations.route) return true;
    if (fieldName === 'clinicalIndication' && value === recommendations.clinicalIndication) return true;
    return false;
  };

  return (
    <>
      <div className="mb-4">
        <Label htmlFor="medicationName">Medication Name *</Label>
        <Input
          id="medicationName"
          value={order.medicationName || ""}
          onChange={(e) => onChange("medicationName", e.target.value)}
          placeholder="e.g., Hydrochlorothiazide"
          required
          className={!order.medicationName ? "border-red-300" : ""}
        />
        <div className="text-xs text-gray-500 mt-1">Enter generic name only - intelligent dosing will activate</div>
      </div>

      {/* Fast Medication Intelligence System - Instant dropdowns and auto-sig */}
      {order.medicationName && (
        <FastMedicationIntelligence
          medicationName={order.medicationName}
          initialStrength={order.dosage || ""}
          initialForm={order.form || ""}
          initialRoute={order.routeOfAdministration || ""}
          initialSig={order.sig || ""}
          initialQuantity={order.quantity || 30}
          initialQuantityUnit={order.quantityUnit || ""}
          initialRefills={order.refills || 2}
          initialDaysSupply={order.daysSupply || 90}
          onChange={handleIntelligentUpdate}
          missingFields={{
            sig: shouldShowRedBorder('sig'),
            quantity: shouldShowRedBorder('quantity'),
            refills: shouldShowRedBorder('refills'),
            daysSupply: shouldShowRedBorder('daysSupply'),
            route: shouldShowRedBorder('route')
          }}
          gptRecommendations={{
            sig: shouldShowRedBorder('sig') ? validationResult?.missingFieldRecommendations?.sig : undefined,
            quantity: shouldShowRedBorder('quantity') ? validationResult?.missingFieldRecommendations?.quantity : undefined,
            refills: shouldShowRedBorder('refills') ? validationResult?.missingFieldRecommendations?.refills : undefined,
            daysSupply: shouldShowRedBorder('daysSupply') ? validationResult?.missingFieldRecommendations?.daysSupply : undefined,
            route: shouldShowRedBorder('routeOfAdministration') ? validationResult?.missingFieldRecommendations?.route : undefined
          }}
        />
      )}



      <div className="text-xs text-gray-500 mb-2 h-4">
        {isValidating && (
          <span className="inline-block animate-pulse">Validating prescription...</span>
        )}
      </div>
      
      <div>
        <Label htmlFor="clinicalIndication">Clinical Indication *</Label>
        <Input
          id="clinicalIndication"
          value={order.clinicalIndication || ""}
          onChange={(e) => onChange("clinicalIndication", e.target.value)}
          placeholder="e.g., HTN, T2DM, Neuropathy"
          required
          className={shouldShowRedBorder('clinicalIndication') ? "border-red-300" : isGptRecommendation('clinicalIndication', order.clinicalIndication) ? "text-red-600" : ""}
        />
        <div className="text-xs text-gray-500 mt-1">Required for pharmacy compliance</div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="diagnosisCode">Diagnosis Code (ICD-10)</Label>
          <Input
            id="diagnosisCode"
            value={order.diagnosisCode || ""}
            onChange={(e) => onChange("diagnosisCode", e.target.value)}
            placeholder="e.g., I10 (Essential hypertension)"
          />
        </div>
        <div className="flex items-center space-x-2 pt-6">
          <input
            type="checkbox"
            id="requiresPriorAuth"
            checked={order.requiresPriorAuth || false}
            onChange={(e) => onChange("requiresPriorAuth", e.target.checked)}
            className="rounded border border-gray-300"
          />
          <Label htmlFor="requiresPriorAuth">Requires Prior Authorization</Label>
        </div>
      </div>
      
      {order.requiresPriorAuth && (
        <div>
          <Label htmlFor="priorAuthNumber">Prior Authorization Number</Label>
          <Input
            id="priorAuthNumber"
            value={order.priorAuthNumber || ""}
            onChange={(e) => onChange("priorAuthNumber", e.target.value)}
            placeholder="Enter prior auth number if available"
          />
        </div>
      )}
    </>
  );
}

function LabEditFields({ order, onChange }: { order: Order; onChange: (field: string, value: any) => void }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="testName">Test Name *</Label>
          <Input
            id="testName"
            value={order.testName || ""}
            onChange={(e) => onChange("testName", e.target.value)}
            placeholder="e.g., Complete Blood Count"
            required
          />
        </div>
        <div>
          <Label htmlFor="labName">Lab/Panel Name</Label>
          <Input
            id="labName"
            value={order.labName || ""}
            onChange={(e) => onChange("labName", e.target.value)}
            placeholder="e.g., Comprehensive Metabolic Panel"
          />
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="specimenType">Specimen Type *</Label>
          <Select value={order.specimenType || ""} onValueChange={(value) => onChange("specimenType", value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select specimen type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="blood">Blood (Serum/Plasma)</SelectItem>
              <SelectItem value="whole_blood">Whole Blood</SelectItem>
              <SelectItem value="urine">Urine</SelectItem>
              <SelectItem value="tissue">Tissue Biopsy</SelectItem>
              <SelectItem value="swab">Swab (Throat/Nasal)</SelectItem>
              <SelectItem value="stool">Stool</SelectItem>
              <SelectItem value="csf">Cerebrospinal Fluid</SelectItem>
              <SelectItem value="sputum">Sputum</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Label htmlFor="testCode">Test Code (LOINC/CPT)</Label>
          <Input
            id="testCode"
            value={order.testCode || ""}
            onChange={(e) => onChange("testCode", e.target.value)}
            placeholder="e.g., 80053"
          />
        </div>
        
        <div className="flex items-center space-x-2 pt-6">
          <input
            type="checkbox"
            id="fastingRequired"
            checked={order.fastingRequired || false}
            onChange={(e) => onChange("fastingRequired", e.target.checked)}
            className="rounded border border-gray-300"
          />
          <Label htmlFor="fastingRequired">Fasting Required</Label>
        </div>
      </div>
      
      <div>
        <Label htmlFor="providerNotes">Provider Notes</Label>
        <Textarea
          id="providerNotes"
          value={order.providerNotes || ""}
          onChange={(e) => onChange("providerNotes", e.target.value)}
          placeholder="Additional instructions for lab processing..."
          rows={2}
        />
      </div>
    </>
  );
}

function ImagingEditFields({ order, onChange }: { order: Order; onChange: (field: string, value: any) => void }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="studyType">Study Type *</Label>
          <Select value={order.studyType || ""} onValueChange={(value) => onChange("studyType", value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select study type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="X-ray">X-ray (Radiography)</SelectItem>
              <SelectItem value="CT">CT Scan (Computed Tomography)</SelectItem>
              <SelectItem value="MRI">MRI (Magnetic Resonance Imaging)</SelectItem>
              <SelectItem value="Ultrasound">Ultrasound (Sonography)</SelectItem>
              <SelectItem value="Nuclear">Nuclear Medicine</SelectItem>
              <SelectItem value="Mammography">Mammography</SelectItem>
              <SelectItem value="Fluoroscopy">Fluoroscopy</SelectItem>
              <SelectItem value="PET">PET Scan</SelectItem>
              <SelectItem value="DEXA">DEXA (Bone Density)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="region">Region/Body Part *</Label>
          <Input
            id="region"
            value={order.region || ""}
            onChange={(e) => onChange("region", e.target.value)}
            placeholder="e.g., Chest, Abdomen, Left Knee"
            required
          />
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="laterality">Laterality</Label>
          <Select value={order.laterality || ""} onValueChange={(value) => onChange("laterality", value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select laterality" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Not Applicable</SelectItem>
              <SelectItem value="left">Left</SelectItem>
              <SelectItem value="right">Right</SelectItem>
              <SelectItem value="bilateral">Bilateral</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center space-x-2 pt-6">
          <input
            type="checkbox"
            id="contrastNeeded"
            checked={order.contrastNeeded || false}
            onChange={(e) => onChange("contrastNeeded", e.target.checked)}
            className="rounded border border-gray-300"
          />
          <Label htmlFor="contrastNeeded">Contrast Required</Label>
        </div>
        
        <div>
          <Label htmlFor="urgency">Urgency Level</Label>
          <Select value={order.urgency || ""} onValueChange={(value) => onChange("urgency", value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select urgency" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="routine">Routine</SelectItem>
              <SelectItem value="urgent">Urgent (24 hours)</SelectItem>
              <SelectItem value="stat">STAT (Immediate)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div>
        <Label htmlFor="providerNotes">Provider Notes & Prep Instructions</Label>
        <Textarea
          id="providerNotes"
          value={order.providerNotes || ""}
          onChange={(e) => onChange("providerNotes", e.target.value)}
          placeholder="Special instructions, prep requirements, clinical context..."
          rows={3}
        />
      </div>
    </>
  );
}

function ReferralEditFields({ order, onChange }: { order: Order; onChange: (field: string, value: any) => void }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="specialtyType">Specialty *</Label>
          <Select value={order.specialtyType || ""} onValueChange={(value) => onChange("specialtyType", value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select specialty" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cardiology">Cardiology</SelectItem>
              <SelectItem value="dermatology">Dermatology</SelectItem>
              <SelectItem value="endocrinology">Endocrinology</SelectItem>
              <SelectItem value="gastroenterology">Gastroenterology</SelectItem>
              <SelectItem value="neurology">Neurology</SelectItem>
              <SelectItem value="oncology">Oncology</SelectItem>
              <SelectItem value="orthopedics">Orthopedics</SelectItem>
              <SelectItem value="psychiatry">Psychiatry</SelectItem>
              <SelectItem value="pulmonology">Pulmonology</SelectItem>
              <SelectItem value="rheumatology">Rheumatology</SelectItem>
              <SelectItem value="urology">Urology</SelectItem>
              <SelectItem value="ophthalmology">Ophthalmology</SelectItem>
              <SelectItem value="otolaryngology">ENT (Otolaryngology)</SelectItem>
              <SelectItem value="physical_therapy">Physical Therapy</SelectItem>
              <SelectItem value="other">Other Specialty</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="urgency">Urgency Level *</Label>
          <Select value={order.urgency || ""} onValueChange={(value) => onChange("urgency", value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select urgency" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="routine">Routine (2-4 weeks)</SelectItem>
              <SelectItem value="urgent">Urgent (1-2 weeks)</SelectItem>
              <SelectItem value="stat">STAT (Same day/24 hours)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div>
        <Label htmlFor="providerName">Preferred Provider (Optional)</Label>
        <Input
          id="providerName"
          value={order.providerName || ""}
          onChange={(e) => onChange("providerName", e.target.value)}
          placeholder="Specific provider name if requested"
        />
      </div>
      
      <div>
        <Label htmlFor="providerNotes">Referral Notes & Clinical Context</Label>
        <Textarea
          id="providerNotes"
          value={order.providerNotes || ""}
          onChange={(e) => onChange("providerNotes", e.target.value)}
          placeholder="Clinical background, specific concerns, requested consultation focus..."
          rows={3}
        />
      </div>
    </>
  );
}

function NewOrderForm({ onSubmit, isSubmitting, isExpanded = false }: {
  onSubmit: (orderData: Partial<Order>) => void;
  isSubmitting: boolean;
  isExpanded?: boolean;
}) {
  const [aiText, setAiText] = useState("");
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [aiParsedData, setAiParsedData] = useState<any>(null);
  const [typingTimer, setTypingTimer] = useState<NodeJS.Timeout | null>(null);
  const [activeTab, setActiveTab] = useState("all");

  // Real-time parsing effect with debounce
  useEffect(() => {
    // Clear existing timer if user is still typing
    if (typingTimer) {
      clearTimeout(typingTimer);
    }

    // Clear parsed data immediately when text is empty
    if (!aiText.trim()) {
      setAiParsedData(null);
      return;
    }

    // Set a new timer to parse after 1.5 seconds of no typing
    const timer = setTimeout(() => {
      processAIText();
    }, 1500);

    setTypingTimer(timer);

    // Cleanup timer on unmount or when aiText changes
    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [aiText]); // Only depend on aiText to avoid infinite loops

  // Helper functions to filter and organize parsed orders
  const getOrdersByType = (type: string) => {
    if (!aiParsedData || !aiParsedData.orders) return [];
    return aiParsedData.orders.filter((order: any) => order.orderType === type);
  };

  const getSortedAndGroupedOrders = () => {
    if (!aiParsedData || !aiParsedData.orders) return [];
    
    const orderTypeOrder = ['lab', 'imaging', 'medication', 'referral'];
    
    return aiParsedData.orders
      .slice()
      .sort((a: any, b: any) => {
        const aTypeIndex = orderTypeOrder.indexOf(a.orderType);
        const bTypeIndex = orderTypeOrder.indexOf(b.orderType);
        
        if (aTypeIndex !== bTypeIndex) {
          return aTypeIndex - bTypeIndex;
        }
        
        return 0;
      });
  };

  const getOrderIcon = (orderType: string) => {
    switch (orderType) {
      case "medication": return Pill;
      case "lab": return FlaskConical;
      case "imaging": return Scan;
      case "referral": return UserCheck;
      default: return null;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (aiParsedData && aiParsedData.orders) {
      // Submit all orders or filtered by type
      const ordersToSubmit = activeTab === 'all' 
        ? aiParsedData.orders 
        : getOrdersByType(activeTab);
      
      console.log(`[NewOrderForm] Submitting ${ordersToSubmit.length} ${activeTab} orders`);
      ordersToSubmit.forEach((order: any) => {
        onSubmit(order);
      });
    }
  };

  const handleSubmitByType = (orderType: string) => {
    const ordersToSubmit = getOrdersByType(orderType);
    console.log(`[NewOrderForm] Submitting ${ordersToSubmit.length} ${orderType} orders`);
    ordersToSubmit.forEach((order: any) => {
      onSubmit(order);
    });
  };

  const processAIText = async () => {
    if (!aiText.trim()) return;
    
    setIsProcessingAI(true);
    try {
      const response = await fetch('/api/orders/parse-ai-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: aiText
        })
      });

      if (response.ok) {
        const parsed = await response.json();
        console.log("[AI Parser] Raw response:", parsed);
        
        // Convert the multi-type response into individual orders
        const allOrders = [];
        
        // Process medications
        if (parsed.medications && parsed.medications.length > 0) {
          for (const med of parsed.medications) {
            allOrders.push({
              orderType: 'medication',
              priority: 'routine',
              medicationName: med.medication_name,
              dosage: med.dosage,
              sig: med.sig,
              quantity: med.quantity,
              quantityUnit: med.quantity_unit,
              refills: med.refills,
              form: med.form,
              routeOfAdministration: med.route_of_administration,
              daysSupply: med.days_supply,
            });
          }
        }
        
        // Process labs
        if (parsed.labs && parsed.labs.length > 0) {
          for (const lab of parsed.labs) {
            allOrders.push({
              orderType: 'lab',
              priority: lab.priority || 'routine',
              testName: lab.test_name,
              labName: lab.lab_name,
              specimenType: lab.specimen_type,
              fastingRequired: lab.fasting_required,
            });
          }
        }
        
        // Process imaging
        if (parsed.imaging && parsed.imaging.length > 0) {
          for (const img of parsed.imaging) {
            allOrders.push({
              orderType: 'imaging',
              priority: img.priority || 'routine',
              studyType: img.study_type,
              region: img.region,
              laterality: img.laterality,
              contrastNeeded: img.contrast_needed,
            });
          }
        }
        
        // Process referrals
        if (parsed.referrals && parsed.referrals.length > 0) {
          for (const ref of parsed.referrals) {
            allOrders.push({
              orderType: 'referral',
              urgency: ref.urgency || 'routine',
              specialtyType: ref.specialty_type,
              providerName: ref.provider_name,
            });
          }
        }
        
        // Remove undefined values from each order
        const cleanedOrders = allOrders.map(order => 
          Object.fromEntries(
            Object.entries(order).filter(([_, value]) => value !== undefined)
          )
        );
        
        setAiParsedData({ orders: cleanedOrders, totalCount: cleanedOrders.length });
        console.log("[AI Parser] Processed orders:", cleanedOrders);
      } else {
        throw new Error('Failed to parse AI text');
      }
    } catch (error) {
      console.error('AI parsing error:', error);
      // Error will be handled by toast notification
    } finally {
      setIsProcessingAI(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label className="font-semibold text-navy-blue-800 mb-2 block">
          Quick Order Entry (AI-Powered)
        </Label>
        <p className="text-xs text-navy-blue-600 mb-3">
          Type orders in natural language. AI will automatically parse and categorize them as you type.
        </p>
        <div className="space-y-3">
          <Textarea
            className={`bg-white ${isExpanded ? "h-40" : "h-24"}`}
            placeholder="Example: Lisinopril 10mg daily, HCTZ 25mg daily, Aspirin 81mg, CMP, CBC with diff, Chest X-ray PA and lateral, Cardiology consultation for chest pain"
            value={aiText}
            onChange={(e) => setAiText(e.target.value)}
          />
          {isProcessingAI && (
            <div className="flex items-center justify-center text-sm text-navy-blue-600">
              <div className="animate-pulse">AI is parsing your orders...</div>
            </div>
          )}
        </div>
      </div>

      {aiParsedData && aiParsedData.orders && aiParsedData.orders.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Parsed Orders</h3>
            <span className="text-sm text-gray-600">
              {aiParsedData.totalCount} total orders
            </span>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="all">
                All ({aiParsedData.totalCount})
              </TabsTrigger>
              <TabsTrigger value="medication">
                Meds ({getOrdersByType('medication').length})
              </TabsTrigger>
              <TabsTrigger value="lab">
                Labs ({getOrdersByType('lab').length})
              </TabsTrigger>
              <TabsTrigger value="imaging">
                Imaging ({getOrdersByType('imaging').length})
              </TabsTrigger>
              <TabsTrigger value="referral">
                Referrals ({getOrdersByType('referral').length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-4">
              <div className="space-y-3">
                {getSortedAndGroupedOrders().map((order: any, index: number) => (
                  <Card key={index} className="p-4">
                    <OrderContent order={order} />
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="medication" className="mt-4">
              <div className="space-y-3">
                {getOrdersByType('medication').length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No medication orders</p>
                ) : (
                  getOrdersByType('medication').map((order: any, index: number) => (
                    <Card key={index} className="p-4">
                      <OrderContent order={order} />
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="lab" className="mt-4">
              <div className="space-y-3">
                {getOrdersByType('lab').length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No lab orders</p>
                ) : (
                  getOrdersByType('lab').map((order: any, index: number) => (
                    <Card key={index} className="p-4">
                      <OrderContent order={order} />
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="imaging" className="mt-4">
              <div className="space-y-3">
                {getOrdersByType('imaging').length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No imaging orders</p>
                ) : (
                  getOrdersByType('imaging').map((order: any, index: number) => (
                    <Card key={index} className="p-4">
                      <OrderContent order={order} />
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="referral" className="mt-4">
              <div className="space-y-3">
                {getOrdersByType('referral').length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No referral orders</p>
                ) : (
                  getOrdersByType('referral').map((order: any, index: number) => (
                    <Card key={index} className="p-4">
                      <OrderContent order={order} />
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex items-center gap-2 pt-2">
            <Button
              type="submit"
              className="bg-navy-blue-600 hover:bg-navy-blue-700 text-white"
              disabled={isSubmitting}
            >
              Create {activeTab === 'all' ? 'All' : activeTab === 'medication' ? 'Medication' : activeTab === 'lab' ? 'Lab' : activeTab === 'imaging' ? 'Imaging' : 'Referral'} Orders ({activeTab === 'all' ? aiParsedData.totalCount : getOrdersByType(activeTab).length})
            </Button>
            {activeTab !== 'all' && getOrdersByType(activeTab).length > 0 && (
              <Button
                type="button"
                variant="outline"
                onClick={() => handleSubmitByType(activeTab)}
              >
                Create Only {activeTab === 'medication' ? 'Medications' : activeTab === 'lab' ? 'Labs' : activeTab === 'imaging' ? 'Imaging' : 'Referrals'}
              </Button>
            )}
          </div>
        </div>
      )}

      {(!aiParsedData || !aiParsedData.orders || aiParsedData.orders.length === 0) && aiText && !isProcessingAI && (
        <div className="text-center py-4">
          <p className="text-gray-500">No orders parsed yet. Keep typing...</p>
        </div>
      )}
    </form>
  );
}

function getOrderIcon(orderType: string) {
  switch (orderType) {
    case "medication": return <Pill className="h-4 w-4" />;
    case "lab": return <FlaskConical className="h-4 w-4" />;
    case "imaging": return <Scan className="h-4 w-4" />;
    case "referral": return <UserCheck className="h-4 w-4" />;
    default: return null;
  }
}