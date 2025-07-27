import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  CreditCard,
  Building2,
  FileText,
  Download,
  Plus,
  Check,
  AlertCircle,
  Clock,
  DollarSign,
  Shield,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { Link } from 'wouter';

interface PaymentMethod {
  id: string;
  type: 'card' | 'bank_account';
  brand?: string;
  bankName?: string;
  last4: string;
  expMonth?: number;
  expYear?: number;
  isDefault: boolean;
  accountType?: string;
}

interface PaymentHistory {
  id: string;
  date: Date;
  amount: number;
  status: string;
  pdfUrl: string;
  paymentMethod: string;
  description: string;
}

export default function BillingManagement() {
  const [selectedTab, setSelectedTab] = useState('overview');

  // Fetch payment methods
  const { data: paymentMethods, isLoading: methodsLoading } = useQuery<{
    cards: PaymentMethod[];
    bankAccounts: PaymentMethod[];
  }>({
    queryKey: ['/api/billing/payment-methods'],
  });

  // Fetch payment history
  const { data: paymentHistory } = useQuery<PaymentHistory[]>({
    queryKey: ['/api/billing/history'],
  });

  // Fetch current subscription
  const { data: subscription } = useQuery<{
    tier: number;
    monthlyTotal: number;
    nextBillingDate: string;
    status: string;
  }>({
    queryKey: ['/api/billing/current-subscription'],
  });

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Billing & Payment Management</h1>
        <p className="text-muted-foreground">
          Manage your payment methods, view billing history, and configure automated billing preferences.
        </p>
      </div>

      {/* Payment Method Comparison */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Modern Payment Options</CardTitle>
          <CardDescription>
            Choose the payment method that works best for your organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <CreditCard className="h-5 w-5 text-blue-600" />
                <h3 className="font-semibold">Credit Card</h3>
                <Badge variant="secondary" className="text-xs">Most Popular</Badge>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Check className="h-3 w-3 text-green-600" />
                  Instant approval
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-3 w-3 text-green-600" />
                  Automatic card updates
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-3 w-3 text-green-600" />
                  Rewards points eligible
                </li>
                <li className="flex items-center gap-2">
                  <AlertCircle className="h-3 w-3 text-orange-600" />
                  2.9% + $0.30 fee
                </li>
              </ul>
            </div>

            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Building2 className="h-5 w-5 text-green-600" />
                <h3 className="font-semibold">ACH Bank Transfer</h3>
                <Badge variant="outline" className="text-xs">Enterprise</Badge>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Check className="h-3 w-3 text-green-600" />
                  Lower fees (0.8% cap $5)
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-3 w-3 text-green-600" />
                  Direct from bank account
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-3 w-3 text-green-600" />
                  Higher payment limits
                </li>
                <li className="flex items-center gap-2">
                  <Clock className="h-3 w-3 text-orange-600" />
                  3-5 day processing
                </li>
              </ul>
            </div>

            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="h-5 w-5 text-purple-600" />
                <h3 className="font-semibold">NET Terms Invoice</h3>
                <Badge variant="outline" className="text-xs">Upon Request</Badge>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Check className="h-3 w-3 text-green-600" />
                  NET 30/60 available
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-3 w-3 text-green-600" />
                  Purchase orders accepted
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-3 w-3 text-green-600" />
                  Automated reminders
                </li>
                <li className="flex items-center gap-2">
                  <Shield className="h-3 w-3 text-blue-600" />
                  Credit check required
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="methods">Payment Methods</TabsTrigger>
          <TabsTrigger value="history">Billing History</TabsTrigger>
          <TabsTrigger value="automation">Automation</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Current Monthly Bill</CardDescription>
                <CardTitle className="text-3xl">
                  ${subscription?.monthlyTotal || 0}
                  <span className="text-sm font-normal text-muted-foreground">/month</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Next billing date: {subscription?.nextBillingDate || 'N/A'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Payment Status</CardDescription>
                <CardTitle className="flex items-center gap-2">
                  <Badge
                    variant={subscription?.status === 'active' ? 'default' : 'destructive'}
                    className="text-lg py-1"
                  >
                    {subscription?.status || 'No Subscription'}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  All payments up to date
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Default Payment Method</CardDescription>
                <CardTitle className="flex items-center gap-2">
                  {paymentMethods?.cards?.[0] ? (
                    <>
                      <CreditCard className="h-5 w-5" />
                      <span>•••• {paymentMethods.cards[0].last4}</span>
                    </>
                  ) : (
                    <span className="text-muted-foreground">Not set</span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Button size="sm" variant="outline" asChild>
                  <Link href="/billing/payment-methods">
                    Update Payment Method
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Benefits of Automation */}
          <Card>
            <CardHeader>
              <CardTitle>Why Automated Billing?</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex gap-3">
                  <Zap className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold mb-1">Never Miss a Payment</h4>
                    <p className="text-sm text-muted-foreground">
                      Automatic monthly charges ensure uninterrupted service access
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold mb-1">Secure & Compliant</h4>
                    <p className="text-sm text-muted-foreground">
                      PCI-compliant processing with bank-level encryption
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <TrendingUp className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold mb-1">Save on Fees</h4>
                    <p className="text-sm text-muted-foreground">
                      ACH payments save up to 70% on transaction fees
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Clock className="h-5 w-5 text-purple-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold mb-1">Save Time</h4>
                    <p className="text-sm text-muted-foreground">
                      No manual invoicing, check processing, or payment follow-ups
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payment Methods Tab */}
        <TabsContent value="methods" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Payment Methods</CardTitle>
                  <CardDescription>
                    Manage your payment methods for automated billing
                  </CardDescription>
                </div>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Payment Method
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Payment Method</DialogTitle>
                      <DialogDescription>
                        Choose your preferred payment method
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <Button variant="outline" className="justify-start">
                        <CreditCard className="mr-2 h-4 w-4" />
                        Add Credit Card
                      </Button>
                      <Button variant="outline" className="justify-start">
                        <Building2 className="mr-2 h-4 w-4" />
                        Add Bank Account (ACH)
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {methodsLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading payment methods...
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Credit Cards */}
                  {paymentMethods?.cards?.map((card) => (
                    <div
                      key={card.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <CreditCard className="h-5 w-5 text-blue-600" />
                        <div>
                          <p className="font-medium">
                            {card.brand} •••• {card.last4}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Expires {card.expMonth}/{card.expYear}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {card.isDefault && (
                          <Badge variant="secondary">Default</Badge>
                        )}
                        <Button variant="ghost" size="sm">
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}

                  {/* Bank Accounts */}
                  {paymentMethods?.bankAccounts?.map((account) => (
                    <div
                      key={account.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Building2 className="h-5 w-5 text-green-600" />
                        <div>
                          <p className="font-medium">
                            {account.bankName} •••• {account.last4}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {account.accountType} account
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {account.isDefault && (
                          <Badge variant="secondary">Default</Badge>
                        )}
                        <Button variant="ghost" size="sm">
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}

                  {(!paymentMethods?.cards?.length && !paymentMethods?.bankAccounts?.length) && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        No payment methods on file. Add a payment method to enable automatic billing.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Billing History Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Billing History</CardTitle>
              <CardDescription>
                View and download past invoices and receipts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {paymentHistory?.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <DollarSign className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="font-medium">{payment.description}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(payment.date).toLocaleDateString()} • {payment.paymentMethod}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-medium">${payment.amount}</span>
                      <Badge
                        variant={payment.status === 'paid' ? 'default' : 'secondary'}
                      >
                        {payment.status}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(payment.pdfUrl, '_blank')}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}

                {!paymentHistory?.length && (
                  <div className="text-center py-8 text-muted-foreground">
                    No billing history available
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Automation Settings Tab */}
        <TabsContent value="automation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Billing Automation Settings</CardTitle>
              <CardDescription>
                Configure how your account is billed automatically
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Smart Retry</h4>
                    <p className="text-sm text-muted-foreground">
                      Automatically retry failed payments with intelligent scheduling
                    </p>
                  </div>
                  <Badge variant="default">Enabled</Badge>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Payment Reminders</h4>
                    <p className="text-sm text-muted-foreground">
                      Receive email reminders 3 days before billing
                    </p>
                  </div>
                  <Badge variant="default">Enabled</Badge>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Card Updater</h4>
                    <p className="text-sm text-muted-foreground">
                      Automatically update expired or replaced cards
                    </p>
                  </div>
                  <Badge variant="default">Enabled</Badge>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Invoice Delivery</h4>
                    <p className="text-sm text-muted-foreground">
                      Automatically email invoices after successful payment
                    </p>
                  </div>
                  <Badge variant="default">Enabled</Badge>
                </div>
              </div>

              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  All billing automation features are included at no extra charge and help ensure
                  uninterrupted access to your EMR system.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}