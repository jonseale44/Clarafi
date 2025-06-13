import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { 
  PenTool, 
  Pill, 
  TestTube, 
  Camera,
  Stethoscope,
  CheckCircle,
  AlertTriangle,
  Clock
} from "lucide-react";

interface Order {
  id: number;
  orderType: string;
  orderStatus: string;
  medicationName?: string;
  dosage?: string;
  sig?: string;
  testName?: string;
  studyType?: string;
  priority: string;
  clinicalIndication?: string;
  createdAt: string;
}

interface OrderSigningPanelProps {
  encounterId: number;
  patientId: number;
  onOrdersSigned: () => void;
}

export function OrderSigningPanel({ encounterId, patientId, onOrdersSigned }: OrderSigningPanelProps) {
  const [selectedOrders, setSelectedOrders] = useState<number[]>([]);
  const [signatureNote, setSignatureNote] = useState("");
  const [selectAll, setSelectAll] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query unsigned orders
  const { data: unsignedOrders, isLoading, refetch } = useQuery<Order[]>({
    queryKey: [`/api/encounters/${encounterId}/unsigned-orders`]
  });

  // Sign individual order mutation
  const signOrderMutation = useMutation({
    mutationFn: async (orderId: number) => {
      const response = await fetch(`/api/orders/${orderId}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signatureNote: signatureNote.trim() || undefined })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to sign order');
      }

      return response.json();
    },
    onSuccess: (data, orderId) => {
      toast({
        title: "Order Signed",
        description: data.message,
      });
      refetch();
      onOrdersSigned();
      queryClient.invalidateQueries({ queryKey: [`/api/encounters/${encounterId}/validation`] });
      // Invalidate medications using the patientId parameter
      queryClient.invalidateQueries({ queryKey: [`/api/patients/${patientId}/medications-enhanced`] });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Signing Failed",
        description: error.message,
      });
    }
  });

  // Bulk sign orders mutation
  const bulkSignMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/orders/bulk-sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          orderIds: selectedOrders,
          signatureNote: signatureNote.trim() || undefined 
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to bulk sign orders');
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Orders Signed",
        description: data.message,
      });
      setSelectedOrders([]);
      setSelectAll(false);
      refetch();
      onOrdersSigned();
      queryClient.invalidateQueries({ queryKey: [`/api/encounters/${encounterId}/validation`] });
      // Invalidate medications using the patientId parameter
      queryClient.invalidateQueries({ queryKey: [`/api/patients/${patientId}/medications-enhanced`] });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Bulk Signing Failed",
        description: error.message,
      });
    }
  });

  const getOrderIcon = (orderType: string) => {
    switch (orderType) {
      case 'medication':
        return Pill;
      case 'lab':
        return TestTube;
      case 'imaging':
        return Camera;
      default:
        return Stethoscope;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'stat':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'urgent':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const handleSelectOrder = (orderId: number, checked: boolean) => {
    if (checked) {
      setSelectedOrders([...selectedOrders, orderId]);
    } else {
      setSelectedOrders(selectedOrders.filter(id => id !== orderId));
      setSelectAll(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      setSelectedOrders(unsignedOrders?.map(order => order.id) || []);
    } else {
      setSelectedOrders([]);
    }
  };

  if (!unsignedOrders || unsignedOrders.length === 0) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="flex items-center text-green-800">
            <CheckCircle className="h-5 w-5 mr-2" />
            All Orders Signed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-green-700">
            No pending orders require signature.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-orange-200">
      <CardHeader>
        <CardTitle className="flex items-center">
          <AlertTriangle className="h-5 w-5 mr-2 text-orange-600" />
          Order Signatures Required
        </CardTitle>
        <p className="text-sm text-gray-600 mt-1">
          {unsignedOrders.length} orders require provider signature before encounter can be completed.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">

        {/* Bulk Actions */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-2">
            <Checkbox
              checked={selectAll}
              onCheckedChange={handleSelectAll}
            />
            <span className="text-sm font-medium">
              Select All ({unsignedOrders.length} orders)
            </span>
          </div>
          <Button
            onClick={() => bulkSignMutation.mutate()}
            disabled={selectedOrders.length === 0 || bulkSignMutation.isPending}
            size="sm"
          >
            {bulkSignMutation.isPending ? (
              <>
                <Clock className="h-4 w-4 mr-2 animate-spin" />
                Signing...
              </>
            ) : (
              <>
                <PenTool className="h-4 w-4 mr-2" />
                Sign Selected ({selectedOrders.length})
              </>
            )}
          </Button>
        </div>

        {/* Orders List */}
        <div className="space-y-3">
          {unsignedOrders.map((order) => {
            const Icon = getOrderIcon(order.orderType);
            const isSelected = selectedOrders.includes(order.id);
            
            return (
              <div key={order.id} className={`p-4 border rounded-lg ${isSelected ? 'border-blue-300 bg-blue-50' : 'border-gray-200'}`}>
                <div className="flex items-start space-x-3">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={(checked) => handleSelectOrder(order.id, checked as boolean)}
                  />
                  <Icon className="h-5 w-5 mt-0.5 text-gray-600" />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="capitalize">
                          {order.orderType}
                        </Badge>
                        <Badge className={getPriorityColor(order.priority)}>
                          {order.priority}
                        </Badge>
                      </div>
                      <Button
                        onClick={() => signOrderMutation.mutate(order.id)}
                        disabled={signOrderMutation.isPending}
                        size="sm"
                        variant="outline"
                      >
                        <PenTool className="h-3 w-3 mr-1" />
                        Sign
                      </Button>
                    </div>

                    <div className="space-y-1">
                      {order.orderType === 'medication' && (
                        <>
                          <p className="font-medium">
                            {order.medicationName} {order.dosage}
                          </p>
                          <p className="text-sm text-gray-600">
                            <strong>Sig:</strong> {order.sig}
                          </p>
                        </>
                      )}
                      
                      {order.orderType === 'lab' && (
                        <p className="font-medium">{order.testName}</p>
                      )}
                      
                      {order.orderType === 'imaging' && (
                        <p className="font-medium">{order.studyType}</p>
                      )}

                      {order.clinicalIndication && (
                        <p className="text-sm text-gray-600">
                          <strong>Indication:</strong> {order.clinicalIndication}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Signature Note */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            Signature Note (Optional)
          </label>
          <Textarea
            value={signatureNote}
            onChange={(e) => setSignatureNote(e.target.value)}
            placeholder="Add any additional notes with your signature..."
            rows={2}
          />
        </div>

        {/* Help Text */}
        <div className="text-xs text-gray-500 border-t pt-3">
          <p>
            Orders must be signed before the encounter can be completed. Medication orders will be sent to pharmacy, 
            lab orders to laboratory, and imaging orders to radiology upon signature.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}