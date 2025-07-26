import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Search, ShoppingCart, FileText, CheckCircle } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface LabTest {
  id: number;
  loincCode: string;
  loincName: string;
  commonName: string;
  category: string;
  specimen: string;
  units?: string;
  questCode?: string;
  labcorpCode?: string;
  availableAt: {
    quest: boolean;
    labcorp: boolean;
    hospital: boolean;
  };
}

interface OrderSet {
  id: number;
  setCode: string;
  setName: string;
  description?: string;
  tests: string[];
  department?: string;
  usageCount: number;
}

export function IntegratedLabView({ patientId }: { patientId: number }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLab, setSelectedLab] = useState<'all' | 'quest' | 'labcorp' | 'hospital'>('all');
  const [cart, setCart] = useState<LabTest[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Search lab tests
  const { data: searchResults = [], isLoading: isSearching } = useQuery({
    queryKey: ['/api/lab-catalog/search', searchTerm, selectedLab],
    enabled: searchTerm.length > 2,
  });

  // Get order sets
  const { data: orderSets = [] } = useQuery<OrderSet[]>({
    queryKey: ['/api/lab-catalog/order-sets'],
  });

  // Create lab order mutation
  const createLabOrder = useMutation({
    mutationFn: async (tests: LabTest[]) => {
      const orders = tests.map(test => ({
        testCode: test.loincCode,
        testName: test.loincName,
        priority: 'routine',
        notes: `Ordered from catalog: ${test.commonName}`,
      }));

      return apiRequest('/api/lab-orders', {
        method: 'POST',
        body: JSON.stringify({
          patientId,
          orders,
          source: 'lab_catalog',
        }),
      });
    },
    onSuccess: () => {
      toast({
        title: 'Lab Orders Created',
        description: `Successfully ordered ${cart.length} tests`,
      });
      setCart([]);
      queryClient.invalidateQueries({ queryKey: ['/api/patients', patientId, 'lab-results'] });
    },
    onError: (error) => {
      toast({
        title: 'Order Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Add test to cart
  const addToCart = (test: LabTest) => {
    if (!cart.find(t => t.id === test.id)) {
      setCart([...cart, test]);
      toast({
        title: 'Added to Cart',
        description: `${test.commonName} added to order cart`,
      });
    }
  };

  // Add order set to cart
  const addOrderSetToCart = async (orderSet: OrderSet) => {
    try {
      // Fetch tests for the order set
      const tests = await Promise.all(
        orderSet.tests.map(async (loincCode) => {
          const response = await fetch(`/api/lab-catalog/tests/loinc/${loincCode}`);
          if (response.ok) {
            return response.json();
          }
          return null;
        })
      );

      const validTests = tests.filter(Boolean);
      const newTests = validTests.filter(test => !cart.find(t => t.id === test.id));
      
      setCart([...cart, ...newTests]);
      
      // Track order set usage
      await apiRequest(`/api/lab-catalog/order-sets/${orderSet.setCode}/track-usage`, {
        method: 'POST',
      });

      toast({
        title: 'Order Set Added',
        description: `Added ${newTests.length} tests from ${orderSet.setName}`,
      });
    } catch (error) {
      toast({
        title: 'Failed to Add Order Set',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="search" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="search">Test Search</TabsTrigger>
          <TabsTrigger value="order-sets">Order Sets</TabsTrigger>
          <TabsTrigger value="cart">Cart ({cart.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="search" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Search Lab Tests</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by LOINC code, test name, or description..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <select
                  value={selectedLab}
                  onChange={(e) => setSelectedLab(e.target.value as any)}
                  className="px-3 py-2 border rounded-md"
                >
                  <option value="all">All Labs</option>
                  <option value="quest">Quest Only</option>
                  <option value="labcorp">LabCorp Only</option>
                  <option value="hospital">Hospital Only</option>
                </select>
              </div>

              {isSearching && <div>Searching...</div>}

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {searchResults.map((test: LabTest) => (
                  <div
                    key={test.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex-1">
                      <div className="font-medium">{test.commonName}</div>
                      <div className="text-sm text-gray-600">
                        LOINC: {test.loincCode} | {test.loincName}
                      </div>
                      <div className="flex gap-2 mt-1">
                        {test.availableAt.quest && (
                          <Badge variant="secondary" className="text-xs">
                            Quest: {test.questCode}
                          </Badge>
                        )}
                        {test.availableAt.labcorp && (
                          <Badge variant="secondary" className="text-xs">
                            LabCorp: {test.labcorpCode}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => addToCart(test)}
                      disabled={cart.some(t => t.id === test.id)}
                    >
                      {cart.some(t => t.id === test.id) ? 'Added' : 'Add to Cart'}
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="order-sets" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Common Order Sets</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {orderSets.map((set) => (
                  <div
                    key={set.id}
                    className="p-4 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium">{set.setName}</h3>
                        {set.description && (
                          <p className="text-sm text-gray-600 mt-1">{set.description}</p>
                        )}
                        <div className="flex items-center gap-4 mt-2">
                          <span className="text-sm text-gray-500">
                            {set.tests.length} tests
                          </span>
                          {set.department && (
                            <Badge variant="outline">{set.department}</Badge>
                          )}
                          <span className="text-sm text-gray-500">
                            Used {set.usageCount} times
                          </span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => addOrderSetToCart(set)}
                      >
                        Add Set
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cart" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Order Cart</CardTitle>
            </CardHeader>
            <CardContent>
              {cart.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  No tests in cart. Add tests from search or order sets.
                </p>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    {cart.map((test) => (
                      <div
                        key={test.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div>
                          <div className="font-medium">{test.commonName}</div>
                          <div className="text-sm text-gray-600">
                            LOINC: {test.loincCode}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setCart(cart.filter(t => t.id !== test.id))}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      className="flex-1"
                      onClick={() => createLabOrder.mutate(cart)}
                      disabled={createLabOrder.isPending}
                    >
                      <ShoppingCart className="w-4 h-4 mr-2" />
                      Place Order ({cart.length} tests)
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setCart([])}
                    >
                      Clear Cart
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}