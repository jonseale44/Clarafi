import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";

interface OrderPreferencesIndicatorProps {
  patientId: number;
  orderType: "lab" | "imaging" | "medication";
}

export function OrderPreferencesIndicator({ patientId, orderType }: OrderPreferencesIndicatorProps) {
  const { data: preferences } = useQuery({
    queryKey: [`/api/patients/${patientId}/order-preferences`],
  });

  const getPreferenceDisplay = () => {
    if (!preferences?.data) {
      // Show defaults
      switch (orderType) {
        case "lab":
          return { method: "Mock Service", variant: "secondary" as const };
        case "imaging":
          return { method: "Print PDF", variant: "secondary" as const };
        case "medication":
          return { method: "Pharmacy", variant: "secondary" as const };
        default:
          return null;
      }
    }

    const prefs = preferences.data;
    
    switch (orderType) {
      case "lab":
        const labMethod = prefs.labDeliveryMethod || "mock_service";
        return {
          method: labMethod === "mock_service" ? "Mock Service" : 
                  labMethod === "real_service" ? "Real Service" : "Print PDF",
          variant: labMethod === "mock_service" ? "secondary" : 
                   labMethod === "real_service" ? "default" : "outline"
        } as const;
        
      case "imaging":
        const imagingMethod = prefs.imagingDeliveryMethod || "print_pdf";
        return {
          method: imagingMethod === "mock_service" ? "Mock Service" : 
                  imagingMethod === "real_service" ? "Real Service" : "Print PDF",
          variant: imagingMethod === "print_pdf" ? "secondary" : "default"
        } as const;
        
      case "medication":
        const medMethod = prefs.medicationDeliveryMethod || "preferred_pharmacy";
        const pharmacyName = prefs.preferredPharmacy;
        return {
          method: medMethod === "preferred_pharmacy" ? 
                  (pharmacyName ? pharmacyName.split(',')[0].trim() : "Pharmacy") : "Print PDF",
          variant: medMethod === "preferred_pharmacy" ? "default" : "outline"
        } as const;
        
      default:
        return null;
    }
  };

  const display = getPreferenceDisplay();
  
  if (!display) return null;

  return (
    <Badge variant={display.variant} className="text-xs ml-1 px-1.5 py-0.5">
      {display.method}
    </Badge>
  );
}