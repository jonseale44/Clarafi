import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { RefreshCw, Settings, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useState } from "react";

interface SignedOrdersProps {
  patientId: number;
}

interface SignedOrder {
  signedOrder: {
    id: number;
    orderId: number;
    deliveryMethod: string;
    deliveryStatus: string;
    canChangeDelivery: boolean;
    deliveryLockReason?: string;
    signedAt: string;
    deliveryChanges: any[];
  };
  order: {
    id: number;
    orderType: string;
    medicationName?: string;
    testName?: string;
    studyType?: string;
    dosage?: string;
    sig?: string;
  };
  signedByUser: {
    firstName: string;
    lastName: string;
    credentials?: string;
  };
}

export function SignedOrders({ patientId }: SignedOrdersProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedOrder, setSelectedOrder] = useState<SignedOrder | null>(null);
  const [newDeliveryMethod, setNewDeliveryMethod] = useState<string>("");

  const { data: signedOrders = [], isLoading } = useQuery({
    queryKey: [`/api/patients/${patientId}/signed-orders`],
    queryFn: async () => {
      const response = await fetch(`/api/patients/${patientId}/signed-orders`);
      if (!response.ok) throw new Error("Failed to fetch signed orders");
      const result = await response.json();
      return result.data || [];
    },
  });

  const changeDeliveryMutation = useMutation({
    mutationFn: async ({ signedOrderId, newMethod }: { signedOrderId: number; newMethod: string }) => {
      const response = await fetch(`/api/signed-orders/${signedOrderId}/change-delivery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          newDeliveryMethod: newMethod,
          reason: "Provider requested change"
        }),
      });
      if (!response.ok) throw new Error("Failed to change delivery method");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/patients/${patientId}/signed-orders`] });
      setSelectedOrder(null);
      toast({ title: "Delivery method changed successfully" });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to change delivery method",
        description: error.message,
      });
    },
  });

  const getDeliveryStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getDeliveryMethodOptions = (orderType: string) => {
    switch (orderType) {
      case 'medication':
        return [
          { value: 'preferred_pharmacy', label: 'Preferred Pharmacy' },
          { value: 'print_pdf', label: 'Print PDF' }
        ];
      case 'lab':
        return [
          { value: 'mock_service', label: 'Mock Lab Service' },
          { value: 'real_service', label: 'Real Lab Service' },
          { value: 'print_pdf', label: 'Print PDF' }
        ];
      case 'imaging':
        return [
          { value: 'mock_service', label: 'Mock Imaging Service' },
          { value: 'real_service', label: 'Real Imaging Service' },
          { value: 'print_pdf', label: 'Print PDF' }
        ];
      default:
        return [];
    }
  };

  const formatDeliveryMethod = (method: string) => {
    switch (method) {
      case 'preferred_pharmacy':
        return 'Preferred Pharmacy';
      case 'print_pdf':
        return 'Print PDF';
      case 'mock_service':
        return 'Mock Service';
      case 'real_service':
        return 'Real Service';
      default:
        return method;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
            Loading Signed Orders...
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Signed Orders ({signedOrders.length})</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => queryClient.invalidateQueries({ queryKey: [`/api/patients/${patientId}/signed-orders`] })}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {signedOrders.length === 0 ? (
            <p className="text-center text-gray-500 py-4">No signed orders</p>
          ) : (
            <div className="space-y-3">
              {signedOrders.map((signedOrder: SignedOrder) => (
                <div
                  key={signedOrder.signedOrder.id}
                  className="border rounded-lg p-4 hover:bg-gray-50"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <Badge variant="outline" className="capitalize">
                          {signedOrder.order.orderType}
                        </Badge>
                        <div className="flex items-center space-x-1">
                          {getDeliveryStatusIcon(signedOrder.signedOrder.deliveryStatus)}
                          <span className="text-sm text-gray-600 capitalize">
                            {signedOrder.signedOrder.deliveryStatus}
                          </span>
                        </div>
                      </div>
                      
                      <div className="text-sm font-medium">
                        {signedOrder.order.orderType === 'medication' && signedOrder.order.medicationName}
                        {signedOrder.order.orderType === 'lab' && signedOrder.order.testName}
                        {signedOrder.order.orderType === 'imaging' && signedOrder.order.studyType}
                      </div>
                      
                      <div className="text-xs text-gray-500 mt-1">
                        Delivery: {formatDeliveryMethod(signedOrder.signedOrder.deliveryMethod)}
                      </div>
                      
                      <div className="text-xs text-gray-500">
                        Signed {format(new Date(signedOrder.signedOrder.signedAt), "MMM d, yyyy 'at' h:mm a")} 
                        by {signedOrder.signedByUser.firstName} {signedOrder.signedByUser.lastName}
                      </div>
                      
                      {signedOrder.signedOrder.deliveryChanges.length > 0 && (
                        <Badge variant="secondary" className="mt-1 text-xs">
                          Delivery changed {signedOrder.signedOrder.deliveryChanges.length} time(s)
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {signedOrder.signedOrder.canChangeDelivery ? (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedOrder(signedOrder);
                                setNewDeliveryMethod(signedOrder.signedOrder.deliveryMethod);
                              }}
                            >
                              <Settings className="h-4 w-4 mr-1" />
                              Change Delivery
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Change Delivery Method</DialogTitle>
                              <DialogDescription>
                                Select a new delivery method for this order.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label>Current Method</Label>
                                <p className="text-sm text-gray-600">
                                  {formatDeliveryMethod(signedOrder.signedOrder.deliveryMethod)}
                                </p>
                              </div>
                              
                              <div>
                                <Label htmlFor="delivery-method">New Delivery Method</Label>
                                <Select value={newDeliveryMethod} onValueChange={setNewDeliveryMethod}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select delivery method" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {getDeliveryMethodOptions(signedOrder.order.orderType).map((option) => (
                                      <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              
                              <div className="flex justify-end space-x-2">
                                <Button variant="outline" onClick={() => setSelectedOrder(null)}>
                                  Cancel
                                </Button>
                                <Button
                                  onClick={() => {
                                    if (selectedOrder && newDeliveryMethod !== signedOrder.signedOrder.deliveryMethod) {
                                      changeDeliveryMutation.mutate({
                                        signedOrderId: selectedOrder.signedOrder.id,
                                        newMethod: newDeliveryMethod
                                      });
                                    }
                                  }}
                                  disabled={changeDeliveryMutation.isPending || newDeliveryMethod === signedOrder.signedOrder.deliveryMethod}
                                >
                                  {changeDeliveryMutation.isPending ? "Changing..." : "Change Delivery"}
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          {signedOrder.signedOrder.deliveryLockReason || "Delivery locked"}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}