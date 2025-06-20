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
import { Settings, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
                  <Label htmlFor="pharmacy-name">Preferred Pharmacy</Label>
                  <Input
                    id="pharmacy-name"
                    placeholder="Enter pharmacy name and address"
                    value={preferences?.preferredPharmacy || ""}
                    onChange={(e) =>
                      setPreferences(prev => prev ? { ...prev, preferredPharmacy: e.target.value } : null)
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="pharmacy-phone">Phone</Label>
                    <Input
                      id="pharmacy-phone"
                      placeholder="(555) 123-4567"
                      value={preferences?.pharmacyPhone || ""}
                      onChange={(e) =>
                        setPreferences(prev => prev ? { ...prev, pharmacyPhone: e.target.value } : null)
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="pharmacy-fax">Fax</Label>
                    <Input
                      id="pharmacy-fax"
                      placeholder="(555) 123-4568"
                      value={preferences?.pharmacyFax || ""}
                      onChange={(e) =>
                        setPreferences(prev => prev ? { ...prev, pharmacyFax: e.target.value } : null)
                      }
                    />
                  </div>
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
  );
}