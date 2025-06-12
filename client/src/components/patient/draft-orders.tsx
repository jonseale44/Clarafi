import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Pill, FlaskConical, Scan, UserCheck, Edit, Trash2, Plus, Save, X, RefreshCw } from "lucide-react";

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
}

export function DraftOrders({ patientId, encounterId, isAutoGenerating = false }: DraftOrdersProps) {
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [showNewOrderDialog, setShowNewOrderDialog] = useState(false);
  const [newOrderType, setNewOrderType] = useState<string>("medication");
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

  // Update order mutation
  const updateOrderMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<Order> }) => {
      const response = await fetch(`/api/orders/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error("Failed to update order");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients", patientId, "draft-orders"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/patients", patientId, "draft-orders"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/patients", patientId, "draft-orders"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/patients", patientId, "draft-orders"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/patients", patientId, "draft-orders"] });
      
      // Handle new deduplication response format
      const totalProcessed = (data.created?.length || 0) + (data.merged?.length || 0);
      const skippedCount = data.skipped?.length || 0;
      
      let description = `Processed ${totalProcessed} orders`;
      if (skippedCount > 0) {
        description += ` (${skippedCount} duplicates skipped)`;
      }
      
      toast({ 
        title: "Orders Updated from SOAP", 
        description: data.summary || description
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

  // Cleanup duplicates mutation
  const cleanupDuplicatesMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/patients/${patientId}/orders/cleanup-duplicates`, {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to cleanup duplicates");
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients", patientId, "draft-orders"] });
      toast({ 
        title: "Duplicates Cleaned", 
        description: `Removed ${data.duplicatesRemoved} duplicate orders from ${data.ordersProcessed} total orders` 
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to cleanup duplicates",
        description: error.message,
      });
    },
  });

  const handleCleanupDuplicates = () => {
    if (confirm("Clean up duplicate orders? This will remove exact duplicates while preserving unique orders.")) {
      cleanupDuplicatesMutation.mutate();
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
          <CardTitle>Orders</CardTitle>
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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
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
              className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${(updateFromSOAPMutation.isPending || isAutoGenerating) ? 'animate-spin' : ''}`} />
              {(updateFromSOAPMutation.isPending || isAutoGenerating) ? "Generating..." : "Update from SOAP"}
            </Button>
          )}
          {orders.length > 0 && (
            <>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleCleanupDuplicates}
                className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                disabled={cleanupDuplicatesMutation.isPending}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${cleanupDuplicatesMutation.isPending ? 'animate-spin' : ''}`} />
                {cleanupDuplicatesMutation.isPending ? "Cleaning..." : "Clean Duplicates"}
              </Button>
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
            </>
          )}
          <Dialog open={showNewOrderDialog} onOpenChange={setShowNewOrderDialog}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Order
              </Button>
            </DialogTrigger>
            <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Order</DialogTitle>
            </DialogHeader>
            <NewOrderForm
              orderType={newOrderType}
              onOrderTypeChange={setNewOrderType}
              onSubmit={(orderData) => createOrderMutation.mutate(orderData)}
              isSubmitting={createOrderMutation.isPending}
            />
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
              <TabsTrigger value="medication">
                Meds ({getOrdersByType("medication").length})
              </TabsTrigger>
              <TabsTrigger value="lab">
                Labs ({getOrdersByType("lab").length})
              </TabsTrigger>
              <TabsTrigger value="imaging">
                Imaging ({getOrdersByType("imaging").length})
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
                  isEditing={editingOrder?.id === order.id}
                  onSave={handleSaveOrder}
                  onCancelEdit={() => setEditingOrder(null)}
                />
              ))}
            </TabsContent>

            {["medication", "lab", "imaging", "referral"].map((type) => (
              <TabsContent key={type} value={type} className="space-y-2">
                {getOrdersByType(type).map((order: Order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onEdit={setEditingOrder}
                    onDelete={handleDeleteOrder}
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
  );
}

interface OrderCardProps {
  order: Order;
  onEdit: (order: Order) => void;
  onDelete: (id: number) => void;
  isEditing: boolean;
  onSave: (order: Order) => void;
  onCancelEdit: () => void;
}

function OrderCard({ order, onEdit, onDelete, isEditing, onSave, onCancelEdit }: OrderCardProps) {
  const [editedOrder, setEditedOrder] = useState<Order>(order);

  useEffect(() => {
    setEditedOrder(order);
  }, [order]);

  if (isEditing) {
    return (
      <Card className="border-blue-200">
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
          <div className="font-medium">{order.medicationName}</div>
          <div className="text-sm text-gray-600">
            {order.dosage} {order.form && `(${order.form})`} - {order.routeOfAdministration || 'oral'}
          </div>
          <div className="text-sm text-gray-600 mb-1">{order.sig}</div>
          <div className="text-xs text-gray-500 space-x-4">
            <span>Qty: {order.quantity}</span>
            <span>Refills: {order.refills}</span>
            {order.daysSupply && <span>Days: {order.daysSupply}</span>}
          </div>
          {order.diagnosisCode && (
            <div className="text-xs text-blue-600 mt-1">ICD-10: {order.diagnosisCode}</div>
          )}
          {order.requiresPriorAuth && (
            <div className="text-xs text-orange-600 mt-1 font-medium">Prior Authorization Required</div>
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
            <div className="text-xs text-blue-600 mt-1 font-medium">Fasting Required</div>
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
  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="medicationName">Medication Name *</Label>
          <Input
            id="medicationName"
            value={order.medicationName || ""}
            onChange={(e) => onChange("medicationName", e.target.value)}
            placeholder="e.g., Lisinopril"
            required
          />
        </div>
        <div>
          <Label htmlFor="dosage">Dosage/Strength *</Label>
          <Input
            id="dosage"
            value={order.dosage || ""}
            onChange={(e) => onChange("dosage", e.target.value)}
            placeholder="e.g., 10mg"
            required
          />
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="form">Dosage Form *</Label>
          <Select value={order.form || ""} onValueChange={(value) => onChange("form", value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select dosage form" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tablet">Tablet</SelectItem>
              <SelectItem value="capsule">Capsule</SelectItem>
              <SelectItem value="liquid">Liquid/Solution</SelectItem>
              <SelectItem value="injection">Injection</SelectItem>
              <SelectItem value="cream">Topical Cream</SelectItem>
              <SelectItem value="ointment">Ointment</SelectItem>
              <SelectItem value="patch">Transdermal Patch</SelectItem>
              <SelectItem value="inhaler">Inhaler</SelectItem>
              <SelectItem value="drops">Eye/Ear Drops</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="routeOfAdministration">Route *</Label>
          <Select value={order.routeOfAdministration || ""} onValueChange={(value) => onChange("routeOfAdministration", value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select route" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="oral">Oral (PO)</SelectItem>
              <SelectItem value="topical">Topical</SelectItem>
              <SelectItem value="injection">Injection (IM/IV/SQ)</SelectItem>
              <SelectItem value="inhalation">Inhalation</SelectItem>
              <SelectItem value="ophthalmic">Ophthalmic</SelectItem>
              <SelectItem value="otic">Otic (Ear)</SelectItem>
              <SelectItem value="nasal">Nasal</SelectItem>
              <SelectItem value="rectal">Rectal</SelectItem>
              <SelectItem value="transdermal">Transdermal</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div>
        <Label htmlFor="sig">Patient Instructions (Sig) *</Label>
        <Textarea
          id="sig"
          value={order.sig || ""}
          onChange={(e) => onChange("sig", e.target.value)}
          placeholder="e.g., Take 1 tablet by mouth once daily with food"
          required
          rows={2}
        />
      </div>
      
      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="quantity">Quantity *</Label>
          <Input
            id="quantity"
            type="number"
            value={order.quantity || ""}
            onChange={(e) => onChange("quantity", parseInt(e.target.value) || 0)}
            placeholder="30"
            min="1"
            required
          />
        </div>
        <div>
          <Label htmlFor="refills">Refills</Label>
          <Input
            id="refills"
            type="number"
            value={order.refills || ""}
            onChange={(e) => onChange("refills", parseInt(e.target.value) || 0)}
            placeholder="0"
            min="0"
            max="11"
          />
        </div>
        <div>
          <Label htmlFor="daysSupply">Days Supply</Label>
          <Input
            id="daysSupply"
            type="number"
            value={order.daysSupply || ""}
            onChange={(e) => onChange("daysSupply", parseInt(e.target.value) || 0)}
            placeholder="30"
            min="1"
          />
        </div>
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

function NewOrderForm({ orderType, onOrderTypeChange, onSubmit, isSubmitting }: {
  orderType: string;
  onOrderTypeChange: (type: string) => void;
  onSubmit: (orderData: Partial<Order>) => void;
  isSubmitting: boolean;
}) {
  const [orderData, setOrderData] = useState<Partial<Order>>({
    orderType,
    priority: "routine",
  });
  const [entryMode, setEntryMode] = useState<"ai" | "standard">("ai");
  const [aiText, setAiText] = useState("");
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [aiParsedData, setAiParsedData] = useState<any>(null);

  useEffect(() => {
    setOrderData({ orderType, priority: "routine" });
    setAiParsedData(null);
    setAiText("");
  }, [orderType]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (aiParsedData && aiParsedData.orders) {
      // Submit multiple orders from AI parsing
      console.log("[NewOrderForm] Submitting multiple AI-parsed orders:", aiParsedData.orders);
      aiParsedData.orders.forEach((order: any) => {
        onSubmit(order);
      });
    } else {
      // Submit single manual order
      const finalData = aiParsedData || orderData;
      console.log("[NewOrderForm] Submitting single order:", finalData);
      onSubmit(finalData);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setOrderData({ ...orderData, [field]: value });
  };

  const processAIText = async () => {
    if (!aiText.trim()) return;
    
    setIsProcessingAI(true);
    try {
      const response = await fetch('/api/orders/parse-ai-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: aiText,
          orderType: orderType // Still send as a hint, but AI will auto-detect
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
              priority: orderData.priority,
              medicationName: med.medication_name,
              dosage: med.dosage,
              sig: med.sig,
              quantity: med.quantity,
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
              priority: lab.priority || orderData.priority,
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
              priority: img.priority || orderData.priority,
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
              urgency: ref.urgency || orderData.priority,
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
      // Fall back to manual entry
      setEntryMode("standard");
    } finally {
      setIsProcessingAI(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="orderType">Order Type</Label>
        <Select value={orderType} onValueChange={onOrderTypeChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="medication">Medication</SelectItem>
            <SelectItem value="lab">Lab Test</SelectItem>
            <SelectItem value="imaging">Imaging</SelectItem>
            <SelectItem value="referral">Referral</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Entry Mode Selection */}
      <div className="border rounded-md p-3 bg-gray-50">
        <Label className="font-semibold text-gray-700 mb-2 block">Entry Mode</Label>
        <div className="flex gap-4">
          <div className="flex items-center space-x-2">
            <input
              type="radio"
              id="ai-entry"
              checked={entryMode === "ai"}
              onChange={() => setEntryMode("ai")}
              className="w-4 h-4"
            />
            <Label htmlFor="ai-entry" className="text-sm cursor-pointer">
              AI Entry (Natural Language)
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="radio"
              id="standard-entry"
              checked={entryMode === "standard"}
              onChange={() => setEntryMode("standard")}
              className="w-4 h-4"
            />
            <Label htmlFor="standard-entry" className="text-sm cursor-pointer">
              Standard Entry
            </Label>
          </div>
        </div>
      </div>

      {entryMode === "ai" ? (
        <div className="border rounded-md p-3 bg-blue-50">
          <Label className="font-semibold text-blue-800 mb-2 block">
            Quick Order Entry (AI-Powered)
          </Label>
          <p className="text-xs text-blue-600 mb-3">
            Enter mixed orders in natural language. AI will automatically detect and categorize different order types.
          </p>
          <div className="space-y-3">
            <Textarea
              className="h-24 bg-white"
              placeholder="Example: Lisinopril 10mg daily, HCTZ 25mg daily, Aspirin 81mg, CMP, CBC with diff, Chest X-ray PA and lateral, Cardiology consultation for chest pain"
              value={aiText}
              onChange={(e) => setAiText(e.target.value)}
            />
            <Button
              type="button"
              onClick={processAIText}
              disabled={!aiText.trim() || isProcessingAI}
              className="w-full"
            >
              {isProcessingAI ? "Processing..." : "Parse with AI"}
            </Button>
          </div>

          {aiParsedData && aiParsedData.orders && (
            <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded">
              <Label className="font-semibold text-green-800 mb-2 block">
                AI Parsed Orders ({aiParsedData.totalCount}):
              </Label>
              <div className="space-y-3 max-h-40 overflow-y-auto">
                {aiParsedData.orders.map((order: any, index: number) => (
                  <div key={index} className="p-2 bg-white rounded border text-sm">
                    <div className="font-medium text-blue-800 mb-1">
                      {order.orderType === 'medication' && '💊 Medication'}
                      {order.orderType === 'lab' && '🧪 Lab Test'}
                      {order.orderType === 'imaging' && '📸 Imaging'}
                      {order.orderType === 'referral' && '👨‍⚕️ Referral'}
                    </div>
                    {order.orderType === 'medication' && (
                      <div className="space-y-1">
                        <div><strong>Name:</strong> {order.medicationName}</div>
                        <div><strong>Dosage:</strong> {order.dosage}</div>
                        {order.sig && <div><strong>Instructions:</strong> {order.sig}</div>}
                        <div><strong>Quantity:</strong> {order.quantity} | <strong>Refills:</strong> {order.refills}</div>
                      </div>
                    )}
                    {order.orderType === 'lab' && (
                      <div className="space-y-1">
                        <div><strong>Test:</strong> {order.testName}</div>
                        {order.labName && <div><strong>Lab Panel:</strong> {order.labName}</div>}
                        {order.fastingRequired && <div><strong>Fasting:</strong> Required</div>}
                      </div>
                    )}
                    {order.orderType === 'imaging' && (
                      <div className="space-y-1">
                        <div><strong>Study:</strong> {order.studyType}</div>
                        <div><strong>Region:</strong> {order.region}</div>
                        {order.contrastNeeded && <div><strong>Contrast:</strong> Needed</div>}
                      </div>
                    )}
                    {order.orderType === 'referral' && (
                      <div className="space-y-1">
                        <div><strong>Specialty:</strong> {order.specialtyType}</div>
                        {order.providerName && <div><strong>Provider:</strong> {order.providerName}</div>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
          {orderType === "medication" && (
            <MedicationEditFields order={orderData as Order} onChange={handleInputChange} />
          )}
          {orderType === "lab" && (
            <LabEditFields order={orderData as Order} onChange={handleInputChange} />
          )}
          {orderType === "imaging" && (
            <ImagingEditFields order={orderData as Order} onChange={handleInputChange} />
          )}
          {orderType === "referral" && (
            <ReferralEditFields order={orderData as Order} onChange={handleInputChange} />
          )}

          <div>
            <Label htmlFor="clinicalIndication">Clinical Indication</Label>
            <Textarea
              id="clinicalIndication"
              value={orderData.clinicalIndication || ""}
              onChange={(e) => handleInputChange("clinicalIndication", e.target.value)}
              placeholder="Reason for this order..."
            />
          </div>
        </>
      )}

      <Button type="submit" disabled={isSubmitting || (entryMode === "ai" && !aiParsedData)} className="w-full">
        {isSubmitting ? "Creating..." : 
         aiParsedData && aiParsedData.orders ? 
         `Create ${aiParsedData.totalCount} Orders` : 
         "Create Order"}
      </Button>
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