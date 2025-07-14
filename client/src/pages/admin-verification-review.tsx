import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Building2, 
  Mail, 
  Phone, 
  Globe, 
  MapPin,
  Shield,
  FileText,
  Send,
  Clock,
  User,
  Hash,
  ArrowLeft,
  LogOut
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { toast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';

interface VerificationRequest {
  id: number;
  organizationName: string;
  organizationType: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  website?: string;
  taxId: string;
  npiNumber?: string;
  expectedProviderCount: number;
  status: 'pending' | 'auto-approved' | 'approved' | 'rejected' | 'manual-review';
  verificationScore: number;
  riskScore: number;
  apiVerificationData: any;
  automatedDecisionReason: string;
  reviewerRecommendations: string[];
  createdAt: string;
  expiresAt: string;
}

export default function AdminVerificationReview() {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [selectedRequest, setSelectedRequest] = useState<VerificationRequest | null>(null);
  const [reviewDialog, setReviewDialog] = useState(false);
  const [decision, setDecision] = useState<'approve' | 'reject' | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [communicationDialog, setCommunicationDialog] = useState(false);
  const [message, setMessage] = useState('');

  // Fetch all verification requests
  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['/api/admin-verification/review/list'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin-verification/review/list');
      return response.json();
    }
  });

  // Manual review mutation
  const reviewMutation = useMutation({
    mutationFn: async ({ id, decision, notes }: { id: number; decision: 'approve' | 'reject'; notes: string }) => {
      const response = await apiRequest('POST', `/api/admin-verification/review/${id}`, {
        decision,
        notes
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Review Completed',
        description: `Verification request has been ${decision === 'approve' ? 'approved' : 'rejected'}.`
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin-verification/review/list'] });
      setReviewDialog(false);
      setSelectedRequest(null);
      setReviewNotes('');
    },
    onError: (error: any) => {
      toast({
        title: 'Review Failed',
        description: error.message || 'Failed to submit review',
        variant: 'destructive'
      });
    }
  });

  // Send communication mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({ id, message }: { id: number; message: string }) => {
      const response = await apiRequest('POST', `/api/admin-verification/communicate/${id}`, {
        message
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Message Sent',
        description: 'Your message has been sent to the applicant.'
      });
      setCommunicationDialog(false);
      setMessage('');
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to Send Message',
        description: error.message || 'Could not send message',
        variant: 'destructive'
      });
    }
  });

  const getStatusBadge = (status: string, score: number) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending Review</Badge>;
      case 'auto-approved':
        return <Badge className="bg-blue-500">Auto-Approved</Badge>;
      case 'manual-review':
        return <Badge className="bg-yellow-500">Requires Manual Review</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getRiskBadge = (score: number) => {
    if (score <= 30) return <Badge className="bg-green-500">Low Risk ({score})</Badge>;
    if (score <= 50) return <Badge className="bg-yellow-500">Medium Risk ({score})</Badge>;
    return <Badge variant="destructive">High Risk ({score})</Badge>;
  };

  const pendingRequests = requests.filter(r => r.status === 'pending' || r.status === 'manual-review');
  const processedRequests = requests.filter(r => r.status === 'approved' || r.status === 'rejected');

  // Handle logout
  const handleLogout = async () => {
    try {
      await apiRequest('POST', '/api/logout');
      queryClient.clear();
      setLocation('/auth');
    } catch (error) {
      console.error('Logout failed:', error);
      setLocation('/auth');
    }
  };

  return (
    <div className="container mx-auto p-6">
      {/* Navigation Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => setLocation('/admin')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>
        </div>
        <Button
          variant="ghost"
          onClick={handleLogout}
          className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </Button>
      </div>

      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Clinic Admin Verification Review</h1>
        <p className="text-muted-foreground">Review and approve clinic administrator registration requests</p>
      </div>

      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">
            Pending Review ({pendingRequests.length})
          </TabsTrigger>
          <TabsTrigger value="processed">
            Processed ({processedRequests.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {pendingRequests.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No pending verification requests</p>
              </CardContent>
            </Card>
          ) : (
            pendingRequests.map((request) => (
              <Card key={request.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <CardTitle className="flex items-center gap-2">
                        <Building2 className="w-5 h-5" />
                        {request.organizationName}
                      </CardTitle>
                      <CardDescription>
                        {request.firstName} {request.lastName} • {request.organizationType?.replace('_', ' ').toUpperCase() || 'N/A'}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      {getStatusBadge(request.status, request.verificationScore)}
                      {getRiskBadge(request.riskScore)}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <span>{request.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <span>{request.phone}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <span>{request.city}, {request.state} {request.zip}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span>{request.expectedProviderCount} providers</span>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-semibold mb-2">Verification Summary</h4>
                    <p className="text-sm text-muted-foreground">{request.automatedDecisionReason}</p>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      onClick={() => setSelectedRequest(request)}
                      variant="outline"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      View Full Details
                    </Button>
                    <Button 
                      onClick={() => {
                        setSelectedRequest(request);
                        setDecision('approve');
                        setReviewDialog(true);
                      }}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Approve
                    </Button>
                    <Button 
                      onClick={() => {
                        setSelectedRequest(request);
                        setDecision('reject');
                        setReviewDialog(true);
                      }}
                      variant="destructive"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Reject
                    </Button>
                    <Button 
                      onClick={() => {
                        setSelectedRequest(request);
                        setCommunicationDialog(true);
                      }}
                      variant="secondary"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Contact
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="processed" className="space-y-4">
          {processedRequests.map((request) => (
            <Card key={request.id} className="opacity-75">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{request.organizationName}</CardTitle>
                    <CardDescription>
                      Processed on {new Date(request.createdAt).toLocaleDateString()}
                    </CardDescription>
                  </div>
                  {getStatusBadge(request.status, request.verificationScore)}
                </div>
              </CardHeader>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      {/* Full Details Dialog */}
      <Dialog open={!!selectedRequest && !reviewDialog && !communicationDialog} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Verification Request Details</DialogTitle>
            <DialogDescription>
              Complete verification information and API results
            </DialogDescription>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-6">
              {/* Organization Information */}
              <div>
                <h3 className="font-semibold mb-3">Organization Information</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <Label className="text-muted-foreground">Organization</Label>
                    <p>{selectedRequest.organizationName}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Type</Label>
                    <p>{selectedRequest.organizationType?.replace('_', ' ') || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Tax ID</Label>
                    <p>{selectedRequest.taxId}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">NPI</Label>
                    <p>{selectedRequest.npiNumber || 'Not provided'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Website</Label>
                    <p>{selectedRequest.website || 'Not provided'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Expected Providers</Label>
                    <p>{selectedRequest.expectedProviderCount}</p>
                  </div>
                </div>
              </div>

              {/* API Verification Results */}
              <div>
                <h3 className="font-semibold mb-3">API Verification Results</h3>
                <div className="space-y-2">
                  {selectedRequest.apiVerificationData?.googleVerification && (
                    <div className="flex items-center gap-2">
                      {selectedRequest.apiVerificationData.googleVerification.verified ? 
                        <CheckCircle className="w-4 h-4 text-green-500" /> : 
                        <XCircle className="w-4 h-4 text-red-500" />
                      }
                      <span className="text-sm">
                        Google Business: {selectedRequest.apiVerificationData.googleVerification.verified ? 
                          `Verified (Trust Score: ${selectedRequest.apiVerificationData.googleVerification.data?.trustScore || 'N/A'})` : 
                          selectedRequest.apiVerificationData.googleVerification.reason}
                      </span>
                    </div>
                  )}
                  {selectedRequest.apiVerificationData?.npiVerification && (
                    <div className="flex items-center gap-2">
                      {selectedRequest.apiVerificationData.npiVerification.verified ? 
                        <CheckCircle className="w-4 h-4 text-green-500" /> : 
                        <XCircle className="w-4 h-4 text-red-500" />
                      }
                      <span className="text-sm">
                        NPPES NPI Registry: {selectedRequest.apiVerificationData.npiVerification.verified ? 
                          'Verified' : selectedRequest.apiVerificationData.npiVerification.reason}
                      </span>
                    </div>
                  )}
                  {selectedRequest.apiVerificationData?.einVerification && (
                    <div className="flex items-center gap-2">
                      {selectedRequest.apiVerificationData.einVerification.verified ? 
                        <CheckCircle className="w-4 h-4 text-green-500" /> : 
                        <XCircle className="w-4 h-4 text-red-500" />
                      }
                      <span className="text-sm">
                        IRS EIN: {selectedRequest.apiVerificationData.einVerification.verified ? 
                          selectedRequest.apiVerificationData.einVerification.matchDescription : 
                          'Not verified'}
                      </span>
                    </div>
                  )}
                  {selectedRequest.apiVerificationData?.addressVerification && (
                    <div className="flex items-center gap-2">
                      {selectedRequest.apiVerificationData.addressVerification.verified ? 
                        <CheckCircle className="w-4 h-4 text-green-500" /> : 
                        <XCircle className="w-4 h-4 text-red-500" />
                      }
                      <span className="text-sm">
                        Address: {selectedRequest.apiVerificationData.addressVerification.verified ? 
                          'Valid USPS address' : 'Address verification failed'}
                      </span>
                    </div>
                  )}
                  {selectedRequest.apiVerificationData?.emailVerification && (
                    <div className="flex items-center gap-2">
                      {selectedRequest.apiVerificationData.emailVerification.verified ? 
                        <CheckCircle className="w-4 h-4 text-green-500" /> : 
                        <XCircle className="w-4 h-4 text-red-500" />
                      }
                      <span className="text-sm">
                        Email: {selectedRequest.apiVerificationData.emailVerification.verified ? 
                          'Valid organizational email' : selectedRequest.apiVerificationData.emailVerification.reason}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Reviewer Recommendations */}
              {selectedRequest.reviewerRecommendations?.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3">Reviewer Recommendations</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    {selectedRequest.reviewerRecommendations.map((rec, index) => (
                      <li key={index} className="text-sm text-muted-foreground">{rec}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Risk Factors */}
              {selectedRequest.apiVerificationData?.riskFactors?.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3">Risk Factors</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    {selectedRequest.apiVerificationData.riskFactors.map((risk, index) => (
                      <li key={index} className="text-sm text-red-600">{risk}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Review Decision Dialog */}
      <Dialog open={reviewDialog} onOpenChange={setReviewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {decision === 'approve' ? 'Approve' : 'Reject'} Verification Request
            </DialogTitle>
            <DialogDescription>
              {decision === 'approve' 
                ? 'This will create an admin account for this organization.'
                : 'This will deny access to the EMR system.'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Review Notes</Label>
              <Textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder={decision === 'approve' 
                  ? 'Optional notes about this approval...'
                  : 'Please provide a reason for rejection...'}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => selectedRequest && reviewMutation.mutate({
                id: selectedRequest.id,
                decision: decision!,
                notes: reviewNotes
              })}
              disabled={decision === 'reject' && !reviewNotes}
              className={decision === 'approve' ? 'bg-green-600 hover:bg-green-700' : ''}
              variant={decision === 'reject' ? 'destructive' : 'default'}
            >
              {decision === 'approve' ? 'Approve Request' : 'Reject Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Communication Dialog */}
      <Dialog open={communicationDialog} onOpenChange={setCommunicationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Contact Applicant</DialogTitle>
            <DialogDescription>
              Send a message to {selectedRequest?.firstName} {selectedRequest?.lastName}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Message</Label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Request additional documentation, clarification, or provide status update..."
                rows={6}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCommunicationDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => selectedRequest && sendMessageMutation.mutate({
                id: selectedRequest.id,
                message
              })}
              disabled={!message}
            >
              <Send className="w-4 h-4 mr-2" />
              Send Message
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}