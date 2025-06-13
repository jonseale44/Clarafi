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
    refetchInterval: 2000, // Auto-refresh every 2 seconds
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
      queryClient.invalidateQueries({ queryKey: ["/api/patients", patientId, "draft-orders"] });
      queryClient.invalidateQueries({ queryKey: [`/api/encounters/${encounterId}/validation`] });
      queryClient.invalidateQueries({ queryKey: [`/api/encounters/${encounterId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/patients", patientId, "encounters"] });
      
      // Dispatch custom event to trigger immediate validation refresh
      window.dispatchEvent(new CustomEvent('orderSigned'));
      
      toast({ 
        title: "Order signed successfully",
        description: `Order ID ${data.orderId} has been signed`
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to sign order",
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
      toast({ 
        title: "Orders extracted successfully",
        description: `${data.totalExtracted || 0} orders extracted from SOAP note`
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to extract orders",
        description: error.message,
      });
    },
  });

  const handleEditOrder = (order: Order) => {
    setEditingOrder(order);
  };

  const handleSaveEdit = (updatedOrder: Order) => {
    updateOrderMutation.mutate({ id: updatedOrder.id, updates: updatedOrder });
  };

  const handleDeleteOrder = (id: number) => {
    deleteOrderMutation.mutate(id);
  };

  const handleCreateOrder = (orderData: Partial<Order>) => {
    createOrderMutation.mutate(orderData);
  };

  const handleSignOrder = (orderId: number) => {
    signOrderMutation.mutate(orderId);
  };

  const ordersByType = orders.reduce((acc: Record<string, Order[]>, order: Order) => {
    if (!acc[order.orderType]) acc[order.orderType] = [];
    acc[order.orderType].push(order);
    return acc;
  }, {});

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin" />
            Loading Draft Orders...
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Pill className="w-5 h-5" />
            Draft Orders ({orders.length})
          </span>
          <div className="flex gap-2">
            <Button
              onClick={() => updateFromSOAPMutation.mutate()}
              disabled={updateFromSOAPMutation.isPending || !encounterId}
              variant="outline"
              size="sm"
            >
              {updateFromSOAPMutation.isPending ? (
                <RefreshCw className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Extract from SOAP
            </Button>
            <Dialog open={showNewOrderDialog} onOpenChange={setShowNewOrderDialog}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Order
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create New Order</DialogTitle>
                </DialogHeader>
                <NewOrderForm
                  orderType={newOrderType}
                  onOrderTypeChange={setNewOrderType}
                  onSubmit={handleCreateOrder}
                  isSubmitting={createOrderMutation.isPending}
                />
              </DialogContent>
            </Dialog>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {orders.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Pill className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No draft orders found</p>
            <p className="text-sm">Extract orders from SOAP note or add manually</p>
          </div>
        ) : (
          <Tabs defaultValue={Object.keys(ordersByType)[0] || "medication"} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="medication" className="flex items-center gap-2">
                <Pill className="w-4 h-4" />
                Medications ({ordersByType.medication?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="lab" className="flex items-center gap-2">
                <FlaskConical className="w-4 h-4" />
                Labs ({ordersByType.lab?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="imaging" className="flex items-center gap-2">
                <Scan className="w-4 h-4" />
                Imaging ({ordersByType.imaging?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="referral" className="flex items-center gap-2">
                <UserCheck className="w-4 h-4" />
                Referrals ({ordersByType.referral?.length || 0})
              </TabsTrigger>
            </TabsList>

            {Object.entries(ordersByType).map(([type, typeOrders]) => (
              <TabsContent key={type} value={type} className="space-y-4">
                {typeOrders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    isEditing={editingOrder?.id === order.id}
                    onEdit={handleEditOrder}
                    onSave={handleSaveEdit}
                    onCancel={() => setEditingOrder(null)}
                    onDelete={handleDeleteOrder}
                    onSign={handleSignOrder}
                    isUpdating={updateOrderMutation.isPending}
                    isSigning={signOrderMutation.isPending}
                  />
                ))}
              </TabsContent>
            ))}
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}

// Order Card Component
function OrderCard({
  order,
  isEditing,
  onEdit,
  onSave,
  onCancel,
  onDelete,
  onSign,
  isUpdating,
  isSigning,
}: {
  order: Order;
  isEditing: boolean;
  onEdit: (order: Order) => void;
  onSave: (order: Order) => void;
  onCancel: () => void;
  onDelete: (id: number) => void;
  onSign: (id: number) => void;
  isUpdating: boolean;
  isSigning: boolean;
}) {
  const [editedOrder, setEditedOrder] = useState(order);

  useEffect(() => {
    setEditedOrder(order);
  }, [order]);

  if (isEditing) {
    return (
      <Card className="border-blue-200">
        <CardContent className="p-4">
          <EditOrderForm
            order={editedOrder}
            onChange={setEditedOrder}
            onSave={() => onSave(editedOrder)}
            onCancel={onCancel}
            isUpdating={isUpdating}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline">{order.orderType}</Badge>
              <Badge variant={order.orderStatus === 'signed' ? 'default' : 'secondary'}>
                {order.orderStatus}
              </Badge>
              {order.priority && (
                <Badge variant={order.priority === 'urgent' ? 'destructive' : 'outline'}>
                  {order.priority}
                </Badge>
              )}
            </div>
            <OrderDetails order={order} />
          </div>
          <div className="flex gap-2 ml-4">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onEdit(order)}
              disabled={isUpdating}
            >
              <Edit className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onSign(order.id)}
              disabled={isSigning || order.orderStatus === 'signed'}
            >
              {isSigning ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onDelete(order.id)}
              disabled={isUpdating}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Order Details Component
function OrderDetails({ order }: { order: Order }) {
  switch (order.orderType) {
    case 'medication':
      return (
        <div className="space-y-1 text-sm">
          <div className="font-medium">{order.medicationName}</div>
          {order.dosage && <div><strong>Dosage:</strong> {order.dosage}</div>}
          {order.sig && <div><strong>Instructions:</strong> {order.sig}</div>}
          {order.quantity && <div><strong>Quantity:</strong> {order.quantity}</div>}
          {order.refills !== undefined && <div><strong>Refills:</strong> {order.refills}</div>}
        </div>
      );
    case 'lab':
      return (
        <div className="space-y-1 text-sm">
          <div className="font-medium">{order.labName || order.testName}</div>
          {order.testCode && <div><strong>Code:</strong> {order.testCode}</div>}
          {order.specimenType && <div><strong>Specimen:</strong> {order.specimenType}</div>}
          {order.fastingRequired !== undefined && (
            <div><strong>Fasting:</strong> {order.fastingRequired ? 'Yes' : 'No'}</div>
          )}
        </div>
      );
    case 'imaging':
      return (
        <div className="space-y-1 text-sm">
          <div className="font-medium">{order.studyType}</div>
          {order.region && <div><strong>Region:</strong> {order.region}</div>}
          {order.laterality && <div><strong>Laterality:</strong> {order.laterality}</div>}
          {order.contrastNeeded !== undefined && (
            <div><strong>Contrast:</strong> {order.contrastNeeded ? 'Yes' : 'No'}</div>
          )}
        </div>
      );
    case 'referral':
      return (
        <div className="space-y-1 text-sm">
          <div className="font-medium">{order.specialtyType}</div>
          {order.providerName && <div><strong>Provider:</strong> {order.providerName}</div>}
          {order.urgency && <div><strong>Urgency:</strong> {order.urgency}</div>}
        </div>
      );
    default:
      return <div className="text-sm text-gray-500">No details available</div>;
  }
}

// New Order Form Component
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

  useEffect(() => {
    setOrderData({ orderType, priority: "routine" });
  }, [orderType]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("[NewOrderForm] Submitting order:", orderData);
    onSubmit(orderData);
  };

  const handleInputChange = (field: string, value: any) => {
    setOrderData({ ...orderData, [field]: value });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="orderType">Order Type</Label>
          <Select
            value={orderType}
            onValueChange={onOrderTypeChange}
          >
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
        <div>
          <Label htmlFor="priority">Priority</Label>
          <Select
            value={orderData.priority || "routine"}
            onValueChange={(value) => handleInputChange("priority", value)}
          >
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

      {orderType === "medication" && (
        <MedicationOrderFields orderData={orderData} onChange={handleInputChange} />
      )}
      {orderType === "lab" && (
        <LabOrderFields orderData={orderData} onChange={handleInputChange} />
      )}
      {orderType === "imaging" && (
        <ImagingOrderFields orderData={orderData} onChange={handleInputChange} />
      )}
      {orderType === "referral" && (
        <ReferralOrderFields orderData={orderData} onChange={handleInputChange} />
      )}

      <div className="flex justify-end gap-2 pt-4">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Creating..." : "Create Order"}
        </Button>
      </div>
    </form>
  );
}

// Edit Order Form Component
function EditOrderForm({
  order,
  onChange,
  onSave,
  onCancel,
  isUpdating,
}: {
  order: Order;
  onChange: (order: Order) => void;
  onSave: () => void;
  onCancel: () => void;
  isUpdating: boolean;
}) {
  const handleInputChange = (field: string, value: any) => {
    onChange({ ...order, [field]: value });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="priority">Priority</Label>
          <Select
            value={order.priority || "routine"}
            onValueChange={(value) => handleInputChange("priority", value)}
          >
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

      {order.orderType === "medication" && (
        <MedicationOrderFields orderData={order} onChange={handleInputChange} />
      )}
      {order.orderType === "lab" && (
        <LabOrderFields orderData={order} onChange={handleInputChange} />
      )}
      {order.orderType === "imaging" && (
        <ImagingOrderFields orderData={order} onChange={handleInputChange} />
      )}
      {order.orderType === "referral" && (
        <ReferralOrderFields orderData={order} onChange={handleInputChange} />
      )}

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={onSave} disabled={isUpdating}>
          {isUpdating ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}

// Order type-specific field components
function MedicationOrderFields({ orderData, onChange }: { orderData: any; onChange: (field: string, value: any) => void }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="col-span-2">
        <Label htmlFor="medicationName">Medication Name</Label>
        <Input
          id="medicationName"
          value={orderData.medicationName || ""}
          onChange={(e) => onChange("medicationName", e.target.value)}
          placeholder="Enter medication name"
        />
      </div>
      <div>
        <Label htmlFor="dosage">Dosage</Label>
        <Input
          id="dosage"
          value={orderData.dosage || ""}
          onChange={(e) => onChange("dosage", e.target.value)}
          placeholder="e.g., 10mg"
        />
      </div>
      <div>
        <Label htmlFor="quantity">Quantity</Label>
        <Input
          id="quantity"
          type="number"
          value={orderData.quantity || ""}
          onChange={(e) => onChange("quantity", parseInt(e.target.value))}
          placeholder="30"
        />
      </div>
      <div className="col-span-2">
        <Label htmlFor="sig">Instructions</Label>
        <Textarea
          id="sig"
          value={orderData.sig || ""}
          onChange={(e) => onChange("sig", e.target.value)}
          placeholder="Take twice daily with food"
        />
      </div>
      <div>
        <Label htmlFor="refills">Refills</Label>
        <Input
          id="refills"
          type="number"
          value={orderData.refills || ""}
          onChange={(e) => onChange("refills", parseInt(e.target.value))}
          placeholder="2"
        />
      </div>
    </div>
  );
}

function LabOrderFields({ orderData, onChange }: { orderData: any; onChange: (field: string, value: any) => void }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="col-span-2">
        <Label htmlFor="labName">Lab Test Name</Label>
        <Input
          id="labName"
          value={orderData.labName || ""}
          onChange={(e) => onChange("labName", e.target.value)}
          placeholder="Enter lab test name"
        />
      </div>
      <div>
        <Label htmlFor="testCode">Test Code</Label>
        <Input
          id="testCode"
          value={orderData.testCode || ""}
          onChange={(e) => onChange("testCode", e.target.value)}
          placeholder="CPT code"
        />
      </div>
      <div>
        <Label htmlFor="specimenType">Specimen Type</Label>
        <Input
          id="specimenType"
          value={orderData.specimenType || ""}
          onChange={(e) => onChange("specimenType", e.target.value)}
          placeholder="Blood, Urine, etc."
        />
      </div>
    </div>
  );
}

function ImagingOrderFields({ orderData, onChange }: { orderData: any; onChange: (field: string, value: any) => void }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="col-span-2">
        <Label htmlFor="studyType">Study Type</Label>
        <Input
          id="studyType"
          value={orderData.studyType || ""}
          onChange={(e) => onChange("studyType", e.target.value)}
          placeholder="X-ray, CT, MRI, etc."
        />
      </div>
      <div>
        <Label htmlFor="region">Region</Label>
        <Input
          id="region"
          value={orderData.region || ""}
          onChange={(e) => onChange("region", e.target.value)}
          placeholder="Chest, Abdomen, etc."
        />
      </div>
      <div>
        <Label htmlFor="laterality">Laterality</Label>
        <Select
          value={orderData.laterality || ""}
          onValueChange={(value) => onChange("laterality", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select laterality" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="bilateral">Bilateral</SelectItem>
            <SelectItem value="left">Left</SelectItem>
            <SelectItem value="right">Right</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function ReferralOrderFields({ orderData, onChange }: { orderData: any; onChange: (field: string, value: any) => void }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <Label htmlFor="specialtyType">Specialty</Label>
        <Input
          id="specialtyType"
          value={orderData.specialtyType || ""}
          onChange={(e) => onChange("specialtyType", e.target.value)}
          placeholder="Cardiology, Neurology, etc."
        />
      </div>
      <div>
        <Label htmlFor="providerName">Provider Name</Label>
        <Input
          id="providerName"
          value={orderData.providerName || ""}
          onChange={(e) => onChange("providerName", e.target.value)}
          placeholder="Dr. Smith"
        />
      </div>
      <div className="col-span-2">
        <Label htmlFor="urgency">Urgency</Label>
        <Select
          value={orderData.urgency || "routine"}
          onValueChange={(value) => onChange("urgency", value)}
        >
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
  );
}