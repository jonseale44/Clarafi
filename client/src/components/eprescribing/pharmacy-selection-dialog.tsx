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
  onPharmacySelect: (pharmacyId: string | number) => void;
  patientId: number;
  medicationIds: number[];
  isControlled?: boolean;
  urgency?: 'routine' | 'urgent' | 'emergency';
}

interface Pharmacy {
  id: string | number;
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
  const [selectedPharmacyId, setSelectedPharmacyId] = useState<string | number | null>(null);
  const [useAiRecommendation, setUseAiRecommendation] = useState(false);
  
  // Debug logging
  useEffect(() => {
    if (open) {
      console.log("PharmacySelectionDialog opened with:", {
        patientId,
        medicationIds,
        isControlled,
        urgency,
        useAiRecommendation
      });
    }
  }, [open, patientId, medicationIds, isControlled, urgency, useAiRecommendation]);

  // Get AI pharmacy recommendation
  const aiRecommendationQuery = useQuery({
    queryKey: ['/api/eprescribing/pharmacy/select', patientId, medicationIds, isControlled, urgency],
    queryFn: async () => {
      console.log('Calling AI pharmacy recommendation with:', {
        patientId,
        medicationIds,
        isControlled,
        urgency,
      });
      const response = await apiRequest('POST', '/api/eprescribing/pharmacy/select', {
        patientId,
        medicationIds,
        isControlled,
        urgency,
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('AI recommendation failed:', response.status, errorText);
        throw new Error(errorText);
      }
      
      const data = await response.json();
      console.log('AI recommendation response:', data);
      return data as PharmacyRecommendation;
    },
    enabled: open && useAiRecommendation,
  });

  // Get all pharmacies for manual selection
  const pharmaciesQuery = useQuery({
    queryKey: ['/api/eprescribing/pharmacies'],
    enabled: open && (!useAiRecommendation || !!aiRecommendationQuery.error || (!!aiRecommendationQuery.data && !aiRecommendationQuery.data?.pharmacy)),
  });

  // Search pharmacies with fax numbers
  const searchPharmaciesQuery = useQuery({
    queryKey: ['/api/eprescribing/pharmacies/search', searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams({ 
        name: searchQuery,
        limit: '20'
      });
      const response = await apiRequest('GET', `/api/eprescribing/pharmacies/search?${params}`);
      return response.json();
    },
    enabled: searchQuery.length > 2,
  });

  // Validate pharmacy capability
  const validatePharmacyMutation = useMutation({
    mutationFn: async (pharmacyId: string | number) => {
      const response = await apiRequest('POST', '/api/eprescribing/pharmacy/validate', {
        pharmacyId,
        requirements: {
          hasControlled: isControlled,
          needsCompounding: false, // Would be determined from medications
          medications: [], // Would include medication details
        },
      });
      return response.json();
    },
  });

  useEffect(() => {
    if (aiRecommendationQuery.data?.pharmacy && useAiRecommendation) {
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

    // Handle Google Places pharmacies (string IDs starting with 'google_')
    if (typeof selectedPharmacyId === 'string' && selectedPharmacyId.startsWith('google_')) {
      try {
        // Find the pharmacy in the search results
        const googlePlaceId = selectedPharmacyId.replace('google_', '');
        const searchResults = searchPharmaciesQuery.data || [];
        const selectedPharmacy = searchResults.find((p: any) => p.id === selectedPharmacyId);
        
        if (!selectedPharmacy) {
          toast({
            title: 'Error',
            description: 'Could not find pharmacy details',
            variant: 'destructive',
          });
          return;
        }

        // Save the Google Places pharmacy to our database
        const response = await apiRequest('POST', '/api/eprescribing/pharmacies/save-google-place', {
          placeId: googlePlaceId,
          name: selectedPharmacy.name,
          address: selectedPharmacy.address,
        });

        const savedPharmacy = await response.json();
        
        // Use the saved pharmacy's database ID
        onPharmacySelect(savedPharmacy.id);
        onOpenChange(false);
        
        toast({
          title: 'Pharmacy Saved',
          description: `${selectedPharmacy.name} has been added to your pharmacy network`,
        });
        
        return;
      } catch (error) {
        console.error('Error saving pharmacy:', error);
        toast({
          title: 'Error',
          description: 'Failed to save pharmacy. Please try again.',
          variant: 'destructive',
        });
        return;
      }
    }

    // Validate pharmacy before selection (for numeric IDs from database)
    try {
      const validation = await validatePharmacyMutation.mutateAsync(selectedPharmacyId);
      
      if (!validation.canFill) {
        // Show more accurate error message about our system limitations
        const message = validation.issues.length > 0 
          ? validation.issues.join('\n')
          : 'SureScripts e-prescribing is coming soon! For now, you can send prescriptions by fax or print PDF.';
          
        toast({
          title: 'E-Prescribing Not Available',
          description: message,
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
    <div key={pharmacy.id} className="relative">
      <Card 
        className={`transition-all hover:shadow-md cursor-pointer ${
          selectedPharmacyId === pharmacy.id ? 'ring-2 ring-primary bg-primary/5' : ''
        } ${isRecommended ? 'border-primary' : ''}`}
        onClick={() => setSelectedPharmacyId(pharmacy.id)}
      >
          <CardHeader className="pb-3">
            <div className="flex justify-between items-start">
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
                <CardDescription>
                  {pharmacy.city}, {pharmacy.state}
                </CardDescription>
              </div>
              <div className="flex gap-2">
            {pharmacy.acceptsEprescribe ? (
              <Badge variant="outline" className="text-green-600">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                E-Prescribe
              </Badge>
            ) : (!pharmacy.fax && (
              <Badge variant="outline" className="text-red-600">
                <XCircle className="h-3 w-3 mr-1" />
                Print Only
              </Badge>
            ))}
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
        {pharmacy.fax && (
          <div className="flex items-center gap-2 text-sm font-medium">
            <Phone className="h-4 w-4 text-blue-600" />
            <span className="text-blue-600">Fax: {pharmacy.fax}</span>
            <Badge variant="secondary" className="ml-auto">Fax Available</Badge>
          </div>
        )}
        {pharmacy.is24Hour && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Open 24 Hours</span>
          </div>
        )}
        {pharmacy.distance && (
          <div className="text-sm text-muted-foreground">
            Distance: {pharmacy.distance.toFixed(1)} miles
          </div>
        )}
      </CardContent>
    </Card>
    </div>
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
            <div className="space-y-2">
              <p>Choose where to send this prescription</p>
              <p className="text-xs text-blue-600 font-medium">
                🚀 SureScripts e-prescribing coming soon! Currently supporting fax and print delivery.
              </p>
            </div>
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

          {(!useAiRecommendation || (aiRecommendationQuery.data && !aiRecommendationQuery.data.pharmacy)) && (
            <div className="space-y-2">
              <Label htmlFor="pharmacy-search">
                {useAiRecommendation && aiRecommendationQuery.data && !aiRecommendationQuery.data.pharmacy
                  ? 'No pharmacies found. Search to add your first pharmacy:'
                  : 'Search Pharmacies'}
              </Label>
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

            <div className="space-y-3">
              {aiRecommendationQuery.error && useAiRecommendation && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <p>Unable to get AI recommendations. Please select a pharmacy manually.</p>
                      {process.env.NODE_ENV === 'development' && (
                        <p className="text-xs font-mono">
                          Error: {aiRecommendationQuery.error.message || 'Unknown error'}
                        </p>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}
              
              {aiRecommendationQuery.data && useAiRecommendation && !aiRecommendationQuery.error && (
                <div className="space-y-4">
                  {aiRecommendationQuery.data.confidence >= 0.8 && aiRecommendationQuery.data.reasoning && (
                    <Alert>
                      <Sparkles className="h-4 w-4" />
                      <AlertDescription>
                        <strong>AI Reasoning:</strong> {aiRecommendationQuery.data.reasoning}
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-3">
                    {aiRecommendationQuery.data.pharmacy && renderPharmacyCard(aiRecommendationQuery.data.pharmacy, true)}
                    
                    {aiRecommendationQuery.data.alternatives && aiRecommendationQuery.data.alternatives.length > 0 && (
                      <>
                        <div className="text-sm font-medium text-muted-foreground mt-4">
                          Alternative Options:
                        </div>
                        {aiRecommendationQuery.data.alternatives.map((pharmacy: Pharmacy) => 
                          renderPharmacyCard(pharmacy)
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}

              {(!useAiRecommendation || (useAiRecommendation && (aiRecommendationQuery.error || (aiRecommendationQuery.data && !aiRecommendationQuery.data.pharmacy)))) && (
                <>
                  {searchQuery.length === 0 && (
                    <div className="text-center py-8 space-y-4">
                      <Store className="h-12 w-12 text-muted-foreground mx-auto" />
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">
                          Start typing to search for pharmacies
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Try searching for: "CVS", "Walgreens", "HEB", or your local pharmacy name
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {searchQuery.length > 0 && searchQuery.length < 3 && (
                    <div className="text-center py-8">
                      <p className="text-sm text-muted-foreground">
                        Type at least 3 characters to search...
                      </p>
                    </div>
                  )}
                  
                  {searchQuery.length >= 3 && searchPharmaciesQuery.isLoading && (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin" />
                      <span className="ml-2">Searching pharmacies...</span>
                    </div>
                  )}
                  
                  {searchQuery.length >= 3 && !searchPharmaciesQuery.isLoading && searchPharmaciesQuery.data && searchPharmaciesQuery.data.length === 0 && (
                    <div className="text-center py-8 space-y-4">
                      <p className="text-sm text-muted-foreground">
                        No pharmacies found matching "{searchQuery}"
                      </p>
                      <div className="text-xs text-muted-foreground space-y-2">
                        <p>Tips for better results:</p>
                        <ul className="list-disc list-inside space-y-1">
                          <li>Try a shorter search term (e.g., "CVS" instead of "CVS Pharmacy")</li>
                          <li>Search by street name or city</li>
                          <li>Check your spelling</li>
                        </ul>
                      </div>
                    </div>
                  )}
                  
                  {searchPharmaciesQuery.data && searchPharmaciesQuery.data.length > 0 && 
                    searchPharmaciesQuery.data.map((pharmacy: Pharmacy) =>
                      renderPharmacyCard(pharmacy)
                    )
                  }
                </>
              )}
            </div>
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