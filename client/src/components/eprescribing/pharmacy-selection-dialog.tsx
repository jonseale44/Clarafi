import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Store, 
  MapPin, 
  Phone, 
  Clock, 
  CheckCircle2, 
  XCircle,
  Sparkles,
  AlertTriangle,
  Search,
  Loader2
} from 'lucide-react';

interface PharmacySelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPharmacySelect: (pharmacyId: number) => void;
  patientId: number;
  medicationIds: number[];
  isControlled?: boolean;
  urgency?: 'routine' | 'urgent' | 'emergency';
}

interface Pharmacy {
  id: number;
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone?: string;
  fax?: string;
  pharmacyType: string;
  acceptsEprescribe: boolean;
  acceptsControlled: boolean;
  acceptsCompounding: boolean;
  hours?: string;
  distance?: number;
}

interface PharmacyRecommendation {
  pharmacy: Pharmacy;
  reasoning: string;
  confidence: number;
  alternatives: Pharmacy[];
}

export function PharmacySelectionDialog({
  open,
  onOpenChange,
  onPharmacySelect,
  patientId,
  medicationIds,
  isControlled = false,
  urgency = 'routine',
}: PharmacySelectionDialogProps) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPharmacyId, setSelectedPharmacyId] = useState<number | null>(null);
  const [useAiRecommendation, setUseAiRecommendation] = useState(true);

  // Get AI pharmacy recommendation
  const aiRecommendationQuery = useQuery({
    queryKey: ['/api/eprescribing/pharmacy/select', patientId, medicationIds, isControlled, urgency],
    queryFn: async () => {
      const response = await apiRequest('POST', '/api/eprescribing/pharmacy/select', {
        patientId,
        medicationIds,
        isControlled,
        urgency,
      });
      const data = await response.json();
      return data as PharmacyRecommendation;
    },
    enabled: open && useAiRecommendation,
  });

  // Get all pharmacies for manual selection
  const pharmaciesQuery = useQuery({
    queryKey: ['/api/eprescribing/pharmacies'],
    enabled: open && !useAiRecommendation,
  });

  // Search pharmacies
  const searchPharmaciesQuery = useQuery({
    queryKey: ['/api/eprescribing/pharmacy/search', searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams({ query: searchQuery });
      const response = await apiRequest('GET', `/api/eprescribing/pharmacy/search?${params}`);
      return response.json();
    },
    enabled: searchQuery.length > 2 && !useAiRecommendation,
  });

  // Validate pharmacy capability
  const validatePharmacyMutation = useMutation({
    mutationFn: async (pharmacyId: number) => {
      return apiRequest('/api/eprescribing/pharmacy/validate', {
        method: 'POST',
        body: JSON.stringify({
          pharmacyId,
          requirements: {
            hasControlled: isControlled,
            needsCompounding: false, // Would be determined from medications
            medications: [], // Would include medication details
          },
        }),
      });
    },
  });

  useEffect(() => {
    if (aiRecommendationQuery.data && useAiRecommendation) {
      setSelectedPharmacyId(aiRecommendationQuery.data.pharmacy.id);
    }
  }, [aiRecommendationQuery.data, useAiRecommendation]);

  const handlePharmacySelect = async () => {
    if (!selectedPharmacyId) {
      toast({
        title: 'No Pharmacy Selected',
        description: 'Please select a pharmacy to continue',
        variant: 'destructive',
      });
      return;
    }

    // Validate pharmacy before selection
    try {
      const validation = await validatePharmacyMutation.mutateAsync(selectedPharmacyId);
      
      if (!validation.canFill) {
        toast({
          title: 'Pharmacy Cannot Fill Prescription',
          description: validation.issues.join('\n'),
          variant: 'destructive',
        });
        return;
      }

      onPharmacySelect(selectedPharmacyId);
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Validation Error',
        description: 'Failed to validate pharmacy capability',
        variant: 'destructive',
      });
    }
  };

  const renderPharmacyCard = (pharmacy: Pharmacy, isRecommended = false) => (
    <Card 
      key={pharmacy.id}
      className={`cursor-pointer transition-all ${
        selectedPharmacyId === pharmacy.id ? 'ring-2 ring-primary' : ''
      }`}
      onClick={() => setSelectedPharmacyId(pharmacy.id)}
    >
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex items-start gap-2">
            <RadioGroupItem 
              value={pharmacy.id.toString()} 
              checked={selectedPharmacyId === pharmacy.id}
              className="mt-1"
            />
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                {pharmacy.name}
                {isRecommended && (
                  <Badge variant="secondary" className="gap-1">
                    <Sparkles className="h-3 w-3" />
                    AI Recommended
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>{pharmacy.pharmacyType}</CardDescription>
            </div>
          </div>
          <div className="flex gap-2">
            {pharmacy.acceptsEprescribe ? (
              <Badge variant="outline" className="text-green-600">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                E-Prescribe
              </Badge>
            ) : (
              <Badge variant="outline" className="text-red-600">
                <XCircle className="h-3 w-3 mr-1" />
                Print Only
              </Badge>
            )}
            {isControlled && (
              pharmacy.acceptsControlled ? (
                <Badge variant="outline" className="text-green-600">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  DEA
                </Badge>
              ) : (
                <Badge variant="outline" className="text-red-600">
                  <XCircle className="h-3 w-3 mr-1" />
                  No DEA
                </Badge>
              )
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4" />
          <span>{pharmacy.address}, {pharmacy.city}, {pharmacy.state} {pharmacy.zipCode}</span>
        </div>
        {pharmacy.phone && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Phone className="h-4 w-4" />
            <span>{pharmacy.phone}</span>
          </div>
        )}
        {pharmacy.hours && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{pharmacy.hours}</span>
          </div>
        )}
        {pharmacy.distance && (
          <div className="text-sm text-muted-foreground">
            Distance: {pharmacy.distance.toFixed(1)} miles
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Store className="h-5 w-5 text-primary" />
            Select Pharmacy
          </DialogTitle>
          <DialogDescription>
            Choose where to send this prescription
            {urgency !== 'routine' && (
              <Badge variant={urgency === 'emergency' ? 'destructive' : 'default'} className="ml-2">
                {urgency.toUpperCase()}
              </Badge>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={useAiRecommendation}
                onChange={(e) => setUseAiRecommendation(e.target.checked)}
                className="rounded"
              />
              Use AI Recommendation
            </Label>
          </div>

          {!useAiRecommendation && (
            <div className="space-y-2">
              <Label htmlFor="pharmacy-search">Search Pharmacies</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="pharmacy-search"
                  placeholder="Search by name or location..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
          )}

          <ScrollArea className="h-[400px] pr-4">
            {aiRecommendationQuery.isLoading && useAiRecommendation && (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2">Getting AI recommendation...</span>
              </div>
            )}

            {aiRecommendationQuery.data && useAiRecommendation && (
              <div className="space-y-4">
                {aiRecommendationQuery.data.confidence >= 0.8 && (
                  <Alert>
                    <Sparkles className="h-4 w-4" />
                    <AlertDescription>
                      <strong>AI Reasoning:</strong> {aiRecommendationQuery.data.reasoning}
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-3">
                  {renderPharmacyCard(aiRecommendationQuery.data.pharmacy, true)}
                  
                  {aiRecommendationQuery.data.alternatives.length > 0 && (
                    <>
                      <div className="text-sm font-medium text-muted-foreground mt-4">
                        Alternative Options:
                      </div>
                      {aiRecommendationQuery.data.alternatives.map(pharmacy => 
                        renderPharmacyCard(pharmacy)
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {!useAiRecommendation && (
              <div className="space-y-3">
                {(searchQuery ? searchPharmaciesQuery.data : pharmaciesQuery.data || []).map((pharmacy: Pharmacy) =>
                  renderPharmacyCard(pharmacy)
                )}
              </div>
            )}
          </ScrollArea>

          {isControlled && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This prescription contains controlled substances. Only DEA-registered pharmacies
                can dispense these medications.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={handlePharmacySelect}
            disabled={!selectedPharmacyId || validatePharmacyMutation.isPending}
          >
            {validatePharmacyMutation.isPending ? 'Validating...' : 'Select Pharmacy'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}