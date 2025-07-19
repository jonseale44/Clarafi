import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
        let methodDisplay = "Pharmacy";
        let fullDisplay = "Pharmacy";
        let variantType: "default" | "outline" | "secondary" = "default";
        
        if (medMethod === "preferred_pharmacy") {
          fullDisplay = pharmacyName ? pharmacyName.split(',')[0].trim() : "Pharmacy";
          // Truncate long pharmacy names to prevent UI overflow
          methodDisplay = fullDisplay.length > 20 
            ? fullDisplay.substring(0, 20) + "..." 
            : fullDisplay;
          variantType = "default";
        } else if (medMethod === "print") {
          methodDisplay = "Print PDF";
          fullDisplay = methodDisplay;
          variantType = "outline";
        } else if (medMethod === "fax") {
          methodDisplay = "Fax to Pharmacy";
          fullDisplay = methodDisplay;
          variantType = "secondary";
        }
        
        return {
          method: methodDisplay,
          fullMethod: fullDisplay,
          variant: variantType
        } as const;
        
      default:
        return null;
    }
  };

  const display = getPreferenceDisplay();
  
  if (!display) return null;

  // For medication orders, show tooltip if pharmacy name is truncated
  if (orderType === "medication" && 'fullMethod' in display && display.method !== display.fullMethod) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge 
              variant={display.variant} 
              className="text-xs ml-1 px-1.5 py-0.5 max-w-[120px] truncate"
            >
              {display.method}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>{display.fullMethod}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Badge 
      variant={display.variant} 
      className="text-xs ml-1 px-1.5 py-0.5 max-w-[120px] truncate"
    >
      {display.method}
    </Badge>
  );
}