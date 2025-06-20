

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Clock, ExternalLink, FlaskConical, Truck, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';

interface LabOrderStatusProps {
  patientId: number;
  encounterId: number;
}

interface LabOrderStatus {
  id: number;
  testName: string;
  orderStatus: string;
  priority: string;
  orderedAt: string;
  externalOrderId?: string;
  requisitionNumber?: string;
  collectionDate?: string;
}

export function LabOrderStatusTracker({ patientId, encounterId }: LabOrderStatusProps) {
  const [expandedOrder, setExpandedOrder] = useState<number | null>(null);

  // Fetch lab orders for this encounter
  const { data: labOrders = [], isLoading } = useQuery<LabOrderStatus[]>({
    queryKey: [`/api/patients/${patientId}/lab-orders`],
    refetchInterval: 30000, // Refresh every 30 seconds for real-time updates
  });

  // Filter orders for this encounter (if needed)
  const encounterLabOrders = labOrders.filter(order => 
    // For now, show all patient lab orders - can be filtered by encounter later
    true
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'transmitted': return 'blue';
      case 'pending': return 'yellow';
      case 'results_available': return 'green';
      case 'completed': return 'green';
      default: return 'gray';
    }
  };

  const getStatusProgress = (status: string) => {
    switch (status) {
      case 'draft': return 10;
      case 'signed': return 25;
      case 'transmitted': return 50;
      case 'pending': return 75;
      case 'results_available': return 100;
      case 'completed': return 100;
      default: return 0;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'transmitted': return <Truck className="h-4 w-4" />;
      case 'pending': return <FlaskConical className="h-4 w-4" />;
      case 'results_available': return <CheckCircle className="h-4 w-4" />;
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5" />
            Lab Order Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (encounterLabOrders.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5" />
            Lab Order Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">
            No lab orders for this encounter
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FlaskConical className="h-5 w-5" />
          Lab Order Status ({encounterLabOrders.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {encounterLabOrders.map((order) => (
          <div key={order.id} className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {getStatusIcon(order.orderStatus)}
                <div>
                  <h4 className="font-medium">{order.testName}</h4>
                  <p className="text-sm text-muted-foreground">
                    Ordered {format(new Date(order.orderedAt), 'MMM dd, yyyy HH:mm')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={order.priority === 'STAT' ? 'destructive' : 'secondary'}>
                  {order.priority}
                </Badge>
                <Badge variant={getStatusColor(order.orderStatus) as any}>
                  {order.orderStatus.replace('_', ' ').toUpperCase()}
                </Badge>
              </div>
            </div>

            {/* Progress bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Order Progress</span>
                <span>{getStatusProgress(order.orderStatus)}%</span>
              </div>
              <Progress value={getStatusProgress(order.orderStatus)} className="h-2" />
            </div>

            {/* External lab tracking info */}
            {order.externalOrderId && (
              <div className="bg-blue-50 p-3 rounded border-l-4 border-blue-400">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-800">
                      External Lab Tracking
                    </p>
                    <p className="text-sm text-blue-600">
                      Order ID: {order.externalOrderId}
                    </p>
                    {order.requisitionNumber && (
                      <p className="text-sm text-blue-600">
                        Requisition: {order.requisitionNumber}
                      </p>
                    )}
                  </div>
                  <Button variant="outline" size="sm" className="text-blue-600">
                    <ExternalLink className="h-4 w-4 mr-1" />
                    Track
                  </Button>
                </div>
              </div>
            )}

            {/* Collection info */}
            {order.collectionDate && (
              <div className="text-sm text-muted-foreground">
                Specimen collected: {format(new Date(order.collectionDate), 'MMM dd, yyyy HH:mm')}
              </div>
            )}

            {/* Status-specific messages */}
            {order.orderStatus === 'transmitted' && (
              <div className="text-sm text-blue-600">
                Order transmitted to external lab. Results expected in 2-4 hours.
              </div>
            )}
            
            {order.orderStatus === 'pending' && (
              <div className="text-sm text-orange-600">
                Specimen processing in progress. Results available soon.
              </div>
            )}
            
            {order.orderStatus === 'results_available' && (
              <div className="text-sm text-green-600">
                Results are available for review.
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}