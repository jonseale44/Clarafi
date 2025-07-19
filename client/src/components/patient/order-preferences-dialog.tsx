import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings, Check, X, Store } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PharmacySelectionDialog } from "@/components/eprescribing/pharmacy-selection-dialog";

interface OrderPreferencesDialogProps {
  patientId: number;
  orderType: "lab" | "imaging" | "medication";
  children?: React.ReactNode;
}

interface PatientOrderPreferences {
  id?: number;
  patientId: number;
  labDeliveryMethod: string;
  labServiceProvider?: string;
  imagingDeliveryMethod: string;
  imagingServiceProvider?: string;
  medicationDeliveryMethod: string;
  preferredPharmacy?: string;
  pharmacyPhone?: string;
  pharmacyFax?: string;
  createdAt?: string;
  updatedAt?: string;
  lastUpdatedBy?: number;
}

export function OrderPreferencesDialog({ patientId, orderType, children }: OrderPreferencesDialogProps) {
  const [open, setOpen] = useState(false);
  const [preferences, setPreferences] = useState<PatientOrderPreferences | null>(null);
  const [showPharmacyDialog, setShowPharmacyDialog] = useState(false);
  const [selectedPharmacy, setSelectedPharmacy] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch current preferences
  const { data: currentPreferences, isLoading } = useQuery({
    queryKey: [`/api/patients/${patientId}/order-preferences`],
    enabled: open,
  });

  // Update preferences mutation
  const updatePreferencesMutation = useMutation({
    mutationFn: async (newPreferences: Partial<PatientOrderPreferences>) => {
      const response = await fetch(`/api/patients/${patientId}/order-preferences`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newPreferences),
      });
      
      if (!response.ok) {
        throw new Error("Failed to update preferences");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/patients/${patientId}/order-preferences`] });
      toast({
        title: "Preferences Updated",
        description: `${orderType} delivery preferences have been saved.`,
      });
      setOpen(false);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update preferences",
      });
    },
  });

  useEffect(() => {
    if (currentPreferences?.data) {
      setPreferences(currentPreferences.data);
    }
  }, [currentPreferences]);

  const handlePharmacySelect = async (pharmacyId: number | string) => {
    try {
      // If it's a Google Places ID (string), save it to our database first
      if (typeof pharmacyId === 'string') {
        const response = await fetch('/api/eprescribing/pharmacies/save-google-place', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ placeId: pharmacyId }),
        });
        
        if (!response.ok) {
          throw new Error('Failed to save pharmacy');
        }
        
        const { pharmacy } = await response.json();
        
        setSelectedPharmacy(pharmacy);
        setShowPharmacyDialog(false);
        
        // Update preferences with pharmacy details
        if (preferences) {
          setPreferences({
            ...preferences,
            preferredPharmacyId: pharmacy.id,
            preferredPharmacy: `${pharmacy.name} - ${pharmacy.address}, ${pharmacy.city}, ${pharmacy.state} ${pharmacy.zipCode}`,
            pharmacyPhone: pharmacy.phone || '',
            pharmacyFax: pharmacy.fax || ''
          });
        }
      } else {
        // It's a database pharmacy ID, fetch the details
        const response = await fetch(`/api/eprescribing/pharmacies/${pharmacyId}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch pharmacy details');
        }
        
        const pharmacy = await response.json();
        
        setSelectedPharmacy(pharmacy);
        setShowPharmacyDialog(false);
        
        // Update preferences with pharmacy details
        if (preferences) {
          setPreferences({
            ...preferences,
            preferredPharmacyId: pharmacy.id,
            preferredPharmacy: `${pharmacy.name} - ${pharmacy.address}, ${pharmacy.city}, ${pharmacy.state} ${pharmacy.zipCode}`,
            pharmacyPhone: pharmacy.phone || '',
            pharmacyFax: pharmacy.fax || ''
          });
        }
      }
    } catch (error) {
      console.error('Error selecting pharmacy:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to select pharmacy. Please try again.",
      });
    }
  };

  const handleSave = () => {
    if (preferences) {
      updatePreferencesMutation.mutate(preferences);
    }
  };

  const getOrderTypeOptions = () => {
    switch (orderType) {
      case "lab":
        return [
          { value: "mock_service", label: "Mock Lab Service (Default)" },
          { value: "real_service", label: "Real Lab Service (Coming Soon)" },
          { value: "print_pdf", label: "Print PDF" },
        ];
      case "imaging":
        return [
          { value: "mock_service", label: "Mock Imaging Service (Coming Soon)" },
          { value: "real_service", label: "Real Imaging Service (Coming Soon)" },
          { value: "print_pdf", label: "Print PDF (Default)" },
        ];
      case "medication":
        return [
          { value: "preferred_pharmacy", label: "Send to Preferred Pharmacy" },
          { value: "print_pdf", label: "Print PDF" },
        ];
      default:
        return [];
    }
  };

  const getCurrentValue = () => {
    if (!preferences) return "";
    
    switch (orderType) {
      case "lab":
        return preferences.labDeliveryMethod || "mock_service";
      case "imaging":
        return preferences.imagingDeliveryMethod || "print_pdf";
      case "medication":
        return preferences.medicationDeliveryMethod || "preferred_pharmacy";
      default:
        return "";
    }
  };

  const handleValueChange = (value: string) => {
    if (!preferences) return;
    
    const updates = { ...preferences };
    
    switch (orderType) {
      case "lab":
        updates.labDeliveryMethod = value;
        if (value !== "real_service") {
          updates.labServiceProvider = undefined;
        }
        break;
      case "imaging":
        updates.imagingDeliveryMethod = value;
        if (value !== "real_service") {
          updates.imagingServiceProvider = undefined;
        }
        break;
      case "medication":
        updates.medicationDeliveryMethod = value;
        break;
    }
    
    setPreferences(updates);
  };

  if (!preferences && !isLoading) {
    return null;
  }

  return (
    <div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          {children || (
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
              <Settings className="h-3 w-3" />
            </Button>
          )}
        </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            {orderType.charAt(0).toUpperCase() + orderType.slice(1)} Order Preferences
          </DialogTitle>
        </DialogHeader>
        
        {isLoading ? (
          <div className="text-center py-4">Loading preferences...</div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label htmlFor="delivery-method">Delivery Method</Label>
              <Select value={getCurrentValue()} onValueChange={handleValueChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getOrderTypeOptions().map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Lab service provider input */}
            {orderType === "lab" && getCurrentValue() === "real_service" && (
              <div>
                <Label htmlFor="lab-provider">Lab Service Provider</Label>
                <Input
                  id="lab-provider"
                  placeholder="Enter lab service name"
                  value={preferences?.labServiceProvider || ""}
                  onChange={(e) =>
                    setPreferences(prev => prev ? { ...prev, labServiceProvider: e.target.value } : null)
                  }
                />
              </div>
            )}

            {/* Imaging service provider input */}
            {orderType === "imaging" && getCurrentValue() === "real_service" && (
              <div>
                <Label htmlFor="imaging-provider">Imaging Service Provider</Label>
                <Input
                  id="imaging-provider"
                  placeholder="Enter imaging service name"
                  value={preferences?.imagingServiceProvider || ""}
                  onChange={(e) =>
                    setPreferences(prev => prev ? { ...prev, imagingServiceProvider: e.target.value } : null)
                  }
                />
              </div>
            )}

            {/* Pharmacy details for medications */}
            {orderType === "medication" && getCurrentValue() === "preferred_pharmacy" && (
              <div className="space-y-3">
                <div>
                  <Label>Preferred Pharmacy</Label>
                  {selectedPharmacy ? (
                    <div className="border rounded-md p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Store className="h-4 w-4 text-primary" />
                          <span className="font-medium">{selectedPharmacy.name}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowPharmacyDialog(true)}
                        >
                          Change
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {selectedPharmacy.address}, {selectedPharmacy.city}, {selectedPharmacy.state} {selectedPharmacy.zipCode}
                      </p>
                      {selectedPharmacy.phone && (
                        <p className="text-sm text-muted-foreground">Phone: {selectedPharmacy.phone}</p>
                      )}
                      {selectedPharmacy.fax && (
                        <p className="text-sm text-muted-foreground">Fax: {selectedPharmacy.fax}</p>
                      )}
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => {
                        console.log("Opening pharmacy selection dialog");
                        setShowPharmacyDialog(true);
                      }}
                    >
                      <Store className="h-4 w-4 mr-2" />
                      Select Pharmacy
                    </Button>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setOpen(false)}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={updatePreferencesMutation.isPending}>
                <Check className="h-4 w-4 mr-2" />
                {updatePreferencesMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>

    {/* Pharmacy Selection Dialog */}
    <PharmacySelectionDialog
      open={showPharmacyDialog}
      onOpenChange={setShowPharmacyDialog}
      onPharmacySelect={handlePharmacySelect}
      patientId={patientId}
      medicationIds={[]} // In real implementation, we'd pass actual medication IDs
    />
    </div>
  );
}