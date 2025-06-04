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
import { Pill, FlaskConical, Scan, UserCheck, Edit, Trash2, Plus, Save, X } from "lucide-react";

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
}

export function DraftOrders({ patientId, encounterId }: DraftOrdersProps) {
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
    refetchInterval: 5000, // Auto-refresh every 5 seconds to catch new draft orders
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

  const handleSaveOrder = (order: Order) => {
    updateOrderMutation.mutate({ id: order.id, updates: order });
  };

  const handleDeleteOrder = (id: number) => {
    if (confirm("Are you sure you want to delete this order?")) {
      deleteOrderMutation.mutate(id);
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

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Draft Orders</CardTitle>
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
          Draft Orders
          {orders.length > 0 && (
            <Badge variant="secondary">{orders.length}</Badge>
          )}
        </CardTitle>
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
      </CardHeader>
      <CardContent>
        {orders.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="text-sm">No draft orders yet</div>
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
              {orders.map((order: Order) => (
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
            {order.dosage} - {order.sig}
          </div>
          <div className="text-xs text-gray-500">
            Qty: {order.quantity}, Refills: {order.refills}
          </div>
        </div>
      );
    case "lab":
      return (
        <div>
          <div className="font-medium">{order.testName}</div>
          {order.labName && (
            <div className="text-sm text-gray-600">{order.labName}</div>
          )}
          {order.specimenType && (
            <div className="text-xs text-gray-500">Specimen: {order.specimenType}</div>
          )}
        </div>
      );
    case "imaging":
      return (
        <div>
          <div className="font-medium">{order.studyType}</div>
          <div className="text-sm text-gray-600">{order.region}</div>
          {order.laterality && (
            <div className="text-xs text-gray-500">Laterality: {order.laterality}</div>
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
          <Label htmlFor="medicationName">Medication Name</Label>
          <Input
            id="medicationName"
            value={order.medicationName || ""}
            onChange={(e) => onChange("medicationName", e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="dosage">Dosage</Label>
          <Input
            id="dosage"
            value={order.dosage || ""}
            onChange={(e) => onChange("dosage", e.target.value)}
          />
        </div>
      </div>
      <div>
        <Label htmlFor="sig">Instructions (Sig)</Label>
        <Input
          id="sig"
          value={order.sig || ""}
          onChange={(e) => onChange("sig", e.target.value)}
        />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="quantity">Quantity</Label>
          <Input
            id="quantity"
            type="number"
            value={order.quantity || ""}
            onChange={(e) => onChange("quantity", parseInt(e.target.value) || 0)}
          />
        </div>
        <div>
          <Label htmlFor="refills">Refills</Label>
          <Input
            id="refills"
            type="number"
            value={order.refills || ""}
            onChange={(e) => onChange("refills", parseInt(e.target.value) || 0)}
          />
        </div>
        <div>
          <Label htmlFor="daysSupply">Days Supply</Label>
          <Input
            id="daysSupply"
            type="number"
            value={order.daysSupply || ""}
            onChange={(e) => onChange("daysSupply", parseInt(e.target.value) || 0)}
          />
        </div>
      </div>
    </>
  );
}

function LabEditFields({ order, onChange }: { order: Order; onChange: (field: string, value: any) => void }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="testName">Test Name</Label>
          <Input
            id="testName"
            value={order.testName || ""}
            onChange={(e) => onChange("testName", e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="labName">Lab/Panel Name</Label>
          <Input
            id="labName"
            value={order.labName || ""}
            onChange={(e) => onChange("labName", e.target.value)}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="specimenType">Specimen Type</Label>
          <Select value={order.specimenType || ""} onValueChange={(value) => onChange("specimenType", value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select specimen type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="blood">Blood</SelectItem>
              <SelectItem value="urine">Urine</SelectItem>
              <SelectItem value="tissue">Tissue</SelectItem>
              <SelectItem value="swab">Swab</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </>
  );
}

function ImagingEditFields({ order, onChange }: { order: Order; onChange: (field: string, value: any) => void }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="studyType">Study Type</Label>
          <Select value={order.studyType || ""} onValueChange={(value) => onChange("studyType", value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select study type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="X-ray">X-ray</SelectItem>
              <SelectItem value="CT">CT Scan</SelectItem>
              <SelectItem value="MRI">MRI</SelectItem>
              <SelectItem value="Ultrasound">Ultrasound</SelectItem>
              <SelectItem value="Nuclear">Nuclear Medicine</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="region">Region/Body Part</Label>
          <Input
            id="region"
            value={order.region || ""}
            onChange={(e) => onChange("region", e.target.value)}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="laterality">Laterality</Label>
          <Select value={order.laterality || ""} onValueChange={(value) => onChange("laterality", value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select laterality" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="left">Left</SelectItem>
              <SelectItem value="right">Right</SelectItem>
              <SelectItem value="bilateral">Bilateral</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </>
  );
}

function ReferralEditFields({ order, onChange }: { order: Order; onChange: (field: string, value: any) => void }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="specialtyType">Specialty</Label>
          <Input
            id="specialtyType"
            value={order.specialtyType || ""}
            onChange={(e) => onChange("specialtyType", e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="providerName">Provider Name (Optional)</Label>
          <Input
            id="providerName"
            value={order.providerName || ""}
            onChange={(e) => onChange("providerName", e.target.value)}
          />
        </div>
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
  const [aiParsedData, setAiParsedData] = useState<Partial<Order> | null>(null);

  useEffect(() => {
    setOrderData({ orderType, priority: "routine" });
    setAiParsedData(null);
    setAiText("");
  }, [orderType]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Use AI parsed data if available, otherwise use manual data
    const finalData = aiParsedData || orderData;
    console.log("[NewOrderForm] Submitting order data:", finalData);
    onSubmit(finalData);
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
          orderType: orderType
        })
      });

      if (response.ok) {
        const parsed = await response.json();
        // Map AI parser field names to our Order interface field names
        const mappedData = {
          orderType,
          priority: orderData.priority,
          // Medication fields
          medicationName: parsed.medication_name,
          dosage: parsed.dosage,
          sig: parsed.sig,
          quantity: parsed.quantity,
          refills: parsed.refills,
          form: parsed.form,
          routeOfAdministration: parsed.route_of_administration,
          daysSupply: parsed.days_supply,
          // Lab fields
          testName: parsed.test_name,
          labName: parsed.lab_name,
          specimenType: parsed.specimen_type,
          fastingRequired: parsed.fasting_required,
          // Imaging fields
          studyType: parsed.study_type,
          region: parsed.region,
          laterality: parsed.laterality,
          contrastNeeded: parsed.contrast_needed,
          // Referral fields
          specialtyType: parsed.specialty_type,
          providerName: parsed.provider_name,
          urgency: parsed.urgency,
        };
        
        // Remove undefined values
        const cleanedData = Object.fromEntries(
          Object.entries(mappedData).filter(([_, value]) => value !== undefined)
        );
        
        setAiParsedData(cleanedData);
        console.log("[AI Parser] Mapped data:", cleanedData);
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
            Enter orders in natural language. AI will parse and structure the information.
          </p>
          <div className="space-y-3">
            <Textarea
              className="h-24 bg-white"
              placeholder={
                orderType === "medication" 
                  ? "Example: Atorvastatin 40mg daily, take with dinner, 30 tablets, 2 refills"
                  : orderType === "lab"
                  ? "Example: CBC with differential, basic metabolic panel, fasting required"
                  : orderType === "imaging"
                  ? "Example: Chest X-ray PA and lateral, no contrast needed"
                  : "Example: Cardiology consultation for chest pain evaluation"
              }
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

          {aiParsedData && (
            <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded">
              <Label className="font-semibold text-green-800 mb-2 block">
                AI Parsed Information:
              </Label>
              <div className="text-sm space-y-1">
                {orderType === "medication" && (
                  <>
                    <div><strong>Medication:</strong> {aiParsedData.medicationName}</div>
                    <div><strong>Dosage:</strong> {aiParsedData.dosage}</div>
                    <div><strong>Instructions:</strong> {aiParsedData.sig}</div>
                    <div><strong>Quantity:</strong> {aiParsedData.quantity}</div>
                    <div><strong>Refills:</strong> {aiParsedData.refills}</div>
                  </>
                )}
                {orderType === "lab" && (
                  <>
                    <div><strong>Test:</strong> {aiParsedData.testName}</div>
                    <div><strong>Lab:</strong> {aiParsedData.labName}</div>
                    {aiParsedData.fastingRequired && <div><strong>Fasting Required:</strong> Yes</div>}
                  </>
                )}
                {orderType === "imaging" && (
                  <>
                    <div><strong>Study:</strong> {aiParsedData.studyType}</div>
                    <div><strong>Region:</strong> {aiParsedData.region}</div>
                    {aiParsedData.contrastNeeded && <div><strong>Contrast:</strong> Yes</div>}
                  </>
                )}
                {orderType === "referral" && (
                  <>
                    <div><strong>Specialty:</strong> {aiParsedData.specialtyType}</div>
                    {aiParsedData.providerName && <div><strong>Provider:</strong> {aiParsedData.providerName}</div>}
                  </>
                )}
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
        {isSubmitting ? "Creating..." : "Create Order"}
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