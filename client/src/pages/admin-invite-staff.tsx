import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Mail, Copy, Check, Send, Users, AlertCircle, Trash2, Plus } from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/use-auth';
import { Link } from 'wouter';

interface InvitationFormData {
  emails: string[];
  role: 'provider' | 'nurse' | 'ma' | 'clinicalStaff' | 'admin';
  subject: string;
  message: string;
}

interface SubscriptionKey {
  id: number;
  key: string;
  createdAt: string;
  usedAt: string | null;
  usedBy: number | null;
  role: string;
  maxUses: number;
  currentUses: number;
  expiresAt: string | null;
}

export default function AdminInviteStaff() {
  const { user } = useAuth();
  const [emailInput, setEmailInput] = useState('');
  const [emails, setEmails] = useState<string[]>([]);
  const [selectedRole, setSelectedRole] = useState<InvitationFormData['role']>('provider');
  const [customSubject, setCustomSubject] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Fetch health system info
  const { data: healthSystem } = useQuery<{ name: string }>({
    queryKey: ['/api/clinic-admin/health-system'],
  });

  // Fetch invitation templates
  const { data: templates } = useQuery({
    queryKey: ['/api/clinic-admin/invitation-templates'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/clinic-admin/invitation-templates');
      if (!response.ok) throw new Error('Failed to fetch templates');
      return response.json();
    },
  });

  // Fetch available subscription keys
  const { data: subscriptionKeys, isLoading: keysLoading } = useQuery<SubscriptionKey[]>({
    queryKey: ['/api/subscription-keys'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/subscription-keys');
      if (!response.ok) throw new Error('Failed to fetch subscription keys');
      return response.json();
    },
  });

  // Generate subscription keys mutation
  const generateKeysMutation = useMutation({
    mutationFn: async (count: number) => {
      const response = await apiRequest('POST', '/api/subscription-keys/generate', {
        providerCount: selectedRole === 'provider' ? count : 0,
        staffCount: selectedRole !== 'provider' ? count : 0,
      });
      if (!response.ok) throw new Error('Failed to generate subscription keys');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/subscription-keys'] });
      toast({
        title: 'Keys generated successfully',
        description: 'New subscription keys have been created.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to generate keys',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Get unused keys for the selected role
  const unusedKeys = subscriptionKeys?.filter(key => 
    !key.usedAt && 
    (selectedRole === 'provider' ? key.role === 'provider' : key.role === 'staff')
  ) || [];

  // Load template when role changes
  const loadTemplate = () => {
    if (templates && selectedRole) {
      const template = templates[selectedRole as keyof typeof templates];
      if (template) {
        setCustomSubject(template.subject
          .replace('[HealthSystemName]', healthSystem?.name || 'Clarafi EMR'));
        setCustomMessage(template.body
          .replace(/\[HealthSystemName\]/g, healthSystem?.name || 'Clarafi EMR')
          .replace('[AdminName]', user?.email || '')
          .replace('[RegistrationLink]', `${window.location.origin}/auth`)
        );
      }
    }
  };

  const handleAddEmail = () => {
    const emailsToAdd = emailInput.split(/[,;\s]+/).filter(email => {
      const trimmed = email.trim();
      return trimmed && !emails.includes(trimmed) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
    });
    
    if (emailsToAdd.length > 0) {
      setEmails([...emails, ...emailsToAdd]);
      setEmailInput('');
    }
  };

  const handleRemoveEmail = (email: string) => {
    setEmails(emails.filter(e => e !== email));
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(text);
      setTimeout(() => setCopiedKey(null), 2000);
      toast({
        title: 'Copied to clipboard',
        description: 'The subscription key has been copied.',
      });
    } catch (error) {
      toast({
        title: 'Failed to copy',
        description: 'Please copy the key manually.',
        variant: 'destructive',
      });
    }
  };

  const sendInvitations = () => {
    if (emails.length === 0) {
      toast({
        title: 'No recipients',
        description: 'Please add at least one email address.',
        variant: 'destructive',
      });
      return;
    }

    if (unusedKeys.length < emails.length) {
      toast({
        title: 'Insufficient keys',
        description: `You need ${emails.length} keys but only have ${unusedKeys.length} available.`,
        variant: 'destructive',
      });
      return;
    }

    // In a real implementation, this would send emails
    // For now, we'll show the invitation details
    const invitationText = emails.map((email, index) => {
      const key = unusedKeys[index];
      return `
To: ${email}
${customSubject}

${customMessage.replace('[SubscriptionKey]', key.key).replace('[StaffName]', email.split('@')[0])}
`;
    }).join('\n---\n');

    // Copy to clipboard
    navigator.clipboard.writeText(invitationText).then(() => {
      toast({
        title: 'Invitations prepared',
        description: 'The invitation text has been copied to your clipboard. You can paste it into your email client.',
      });
      setEmails([]);
    });
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Invite Staff Members</h1>
        <p className="text-muted-foreground mt-2">
          Send invitations to new staff members to join your health system
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column - Invitation Form */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Create Invitations</CardTitle>
              <CardDescription>
                Add recipients and customize the invitation message
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Role Selection */}
              <div className="space-y-2">
                <Label>Staff Role</Label>
                <Select value={selectedRole} onValueChange={(value: any) => setSelectedRole(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="provider">Provider</SelectItem>
                    <SelectItem value="nurse">Nurse</SelectItem>
                    <SelectItem value="ma">Medical Assistant</SelectItem>
                    <SelectItem value="clinicalStaff">Clinical Staff</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Email Input */}
              <div className="space-y-2">
                <Label>Email Addresses</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter email addresses (comma or space separated)"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddEmail();
                      }
                    }}
                  />
                  <Button onClick={handleAddEmail} size="icon">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Email List */}
              {emails.length > 0 && (
                <div className="space-y-2">
                  <Label>Recipients ({emails.length})</Label>
                  <div className="border rounded-md p-2 max-h-32 overflow-y-auto space-y-1">
                    {emails.map((email) => (
                      <div key={email} className="flex items-center justify-between">
                        <span className="text-sm">{email}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleRemoveEmail(email)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Load Template Button */}
              <Button 
                onClick={loadTemplate} 
                variant="outline" 
                className="w-full"
                disabled={!templates}
              >
                Load Template for {selectedRole}
              </Button>

              {/* Subject */}
              <div className="space-y-2">
                <Label>Subject</Label>
                <Input
                  value={customSubject}
                  onChange={(e) => setCustomSubject(e.target.value)}
                  placeholder="Invitation subject"
                />
              </div>

              {/* Message */}
              <div className="space-y-2">
                <Label>Message</Label>
                <Textarea
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder="Invitation message"
                  rows={10}
                />
              </div>

              {/* Send Button */}
              <Button 
                onClick={sendInvitations} 
                className="w-full"
                disabled={emails.length === 0 || unusedKeys.length < emails.length}
              >
                <Mail className="mr-2 h-4 w-4" />
                Prepare {emails.length} Invitation{emails.length !== 1 ? 's' : ''}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Available Keys */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Available Subscription Keys</CardTitle>
              <CardDescription>
                Keys that can be used for invitations
              </CardDescription>
            </CardHeader>
            <CardContent>
              {unusedKeys.length < emails.length && (
                <Alert className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    You need {emails.length - unusedKeys.length} more key{emails.length - unusedKeys.length !== 1 ? 's' : ''} 
                    for the selected recipients.
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex justify-between items-center mb-4">
                <div>
                  <p className="text-sm text-muted-foreground">
                    {unusedKeys.length} unused {selectedRole} key{unusedKeys.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <Button
                  onClick={() => generateKeysMutation.mutate(Math.max(5, emails.length))}
                  disabled={generateKeysMutation.isPending}
                  size="sm"
                >
                  Generate Keys
                </Button>
              </div>

              {keysLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading keys...
                </div>
              ) : unusedKeys.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">
                    No unused {selectedRole} keys available
                  </p>
                  <Button
                    onClick={() => generateKeysMutation.mutate(5)}
                    disabled={generateKeysMutation.isPending}
                    className="mt-4"
                  >
                    Generate 5 Keys
                  </Button>
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {unusedKeys.slice(0, 10).map((key) => (
                    <div key={key.id} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex-1">
                        <code className="text-xs">{key.key}</code>
                        {key.expiresAt && (
                          <p className="text-xs text-muted-foreground">
                            Expires {format(new Date(key.expiresAt), 'MMM d, yyyy')}
                          </p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => copyToClipboard(key.key)}
                      >
                        {copiedKey === key.key ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  ))}
                  {unusedKeys.length > 10 && (
                    <p className="text-sm text-muted-foreground text-center py-2">
                      And {unusedKeys.length - 10} more...
                    </p>
                  )}
                </div>
              )}

              <div className="mt-4 pt-4 border-t">
                <Link href="/admin/subscription-keys">
                  <Button variant="outline" className="w-full">
                    Manage All Subscription Keys
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Instructions Card */}
          <Card>
            <CardHeader>
              <CardTitle>How It Works</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-3">
                <Badge className="h-6 w-6 rounded-full flex items-center justify-center">1</Badge>
                <p className="text-sm">Select the role and add email addresses</p>
              </div>
              <div className="flex gap-3">
                <Badge className="h-6 w-6 rounded-full flex items-center justify-center">2</Badge>
                <p className="text-sm">Customize the invitation message using the template</p>
              </div>
              <div className="flex gap-3">
                <Badge className="h-6 w-6 rounded-full flex items-center justify-center">3</Badge>
                <p className="text-sm">Click prepare invitations to copy the text</p>
              </div>
              <div className="flex gap-3">
                <Badge className="h-6 w-6 rounded-full flex items-center justify-center">4</Badge>
                <p className="text-sm">Paste into your email client and send</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}