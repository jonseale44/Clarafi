import { useState, useCallback, useEffect } from "react";
import { Search, MapPin, Building2, Loader2, Plus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface MedicalFacility {
  place_id: string;
  name: string;
  formatted_address: string;
  geometry: {
    location: { lat: number; lng: number };
  };
  types: string[];
  formatted_phone_number?: string;
  website?: string;
  distance?: number;
  place_details?: {
    npi?: string;
    hours?: string;
  };
}

interface Props {
  onSelectFacility: (facility: MedicalFacility, healthSystemId?: number) => void;
  showCreateNew?: boolean;
}

export function DynamicClinicSearch({ onSelectFacility, showCreateNew = true }: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [facilities, setFacilities] = useState<MedicalFacility[]>([]);
  const [loading, setLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedFacility, setSelectedFacility] = useState<MedicalFacility | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [checkingExistence, setCheckingExistence] = useState(false);
  const { toast } = useToast();

  // Get user's location
  const getUserLocation = useCallback(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          // Automatically search when location is obtained
          searchFacilities("", {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.error("Error getting location:", error);
          toast({
            title: "Location Error",
            description: "Could not get your location. You can still search by name.",
            variant: "destructive",
          });
        }
      );
    }
  }, [toast]);

  // Search for medical facilities
  const searchFacilities = async (query: string, location?: { lat: number; lng: number }) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) params.append("query", query);
      if (location || userLocation) {
        const loc = location || userLocation!;
        params.append("lat", loc.lat.toString());
        params.append("lng", loc.lng.toString());
      }

      const response = await fetch(`/api/places/search-medical?${params}`);
      const data = await response.json();

      if (data.status === "OK") {
        setFacilities(data.results);
      } else {
        throw new Error(data.error || "Failed to search facilities");
      }
    } catch (error) {
      console.error("Search error:", error);
      toast({
        title: "Search Error",
        description: "Failed to search for medical facilities. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle facility selection
  const handleSelectFacility = async (facility: MedicalFacility) => {
    setSelectedFacility(facility);
    setShowConfirmDialog(true);
  };

  // Confirm facility selection and check if it exists
  const confirmFacilitySelection = async () => {
    if (!selectedFacility) return;

    setCheckingExistence(true);
    try {
      // Check if this facility already exists in our system
      const response = await fetch("/api/places/create-health-system", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          placeData: selectedFacility,
          joinAsAdmin: showCreateNew,
        }),
      });

      const data = await response.json();

      if (data.exists) {
        // Facility exists - let user know they can join it
        toast({
          title: "Health System Exists",
          description: "This health system is already in our system. You can join it during registration.",
        });
        onSelectFacility(selectedFacility, data.healthSystemId);
      } else if (data.success) {
        // New facility created
        toast({
          title: "Success",
          description: "Health system registered successfully. Proceed with your registration.",
        });
        onSelectFacility(selectedFacility, data.healthSystemId);
      }
      
      setShowConfirmDialog(false);
    } catch (error) {
      console.error("Error checking facility:", error);
      toast({
        title: "Error",
        description: "Failed to process facility selection. Please try again.",
        variant: "destructive",
      });
    } finally {
      setCheckingExistence(false);
    }
  };

  // Initial search on mount if we have location
  useEffect(() => {
    getUserLocation();
  }, [getUserLocation]);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search for your clinic or hospital..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                searchFacilities(searchQuery);
              }
            }}
            className="pl-10"
          />
        </div>
        <Button
          onClick={() => searchFacilities(searchQuery)}
          disabled={loading}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
        </Button>
        <Button
          variant="outline"
          onClick={getUserLocation}
          title="Search nearby clinics"
        >
          <MapPin className="h-4 w-4" />
        </Button>
      </div>

      {userLocation && (
        <Alert>
          <MapPin className="h-4 w-4" />
          <AlertTitle>Location detected</AlertTitle>
          <AlertDescription>
            Showing medical facilities near your current location
          </AlertDescription>
        </Alert>
      )}

      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      )}

      {!loading && facilities.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Found {facilities.length} medical facilities
          </p>
          <div className="grid gap-2 max-h-[400px] overflow-y-auto">
            {facilities.map((facility) => (
              <Card
                key={facility.place_id}
                className="p-4 cursor-pointer hover:bg-accent transition-colors"
                onClick={() => handleSelectFacility(facility)}
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <h4 className="font-medium">{facility.name}</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {facility.formatted_address}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      {facility.formatted_phone_number && (
                        <span>{facility.formatted_phone_number}</span>
                      )}
                      {facility.distance && (
                        <span>{facility.distance.toFixed(1)} miles away</span>
                      )}
                      {facility.place_details?.npi && (
                        <Badge variant="secondary" className="text-xs">
                          NPI: {facility.place_details.npi}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Check className="h-5 w-5 text-primary opacity-0" />
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {!loading && searchQuery && facilities.length === 0 && (
        <Alert>
          <AlertDescription>
            No medical facilities found. Try a different search term or use your location.
          </AlertDescription>
        </Alert>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Health System Selection</DialogTitle>
            <DialogDescription>
              You've selected: <strong>{selectedFacility?.name}</strong>
              <br />
              {selectedFacility?.formatted_address}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              {showCreateNew
                ? "We'll check if this health system is already in our database. If not, we'll create it for you."
                : "We'll check if this health system exists so you can join it."}
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
              disabled={checkingExistence}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmFacilitySelection}
              disabled={checkingExistence}
            >
              {checkingExistence ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Checking...
                </>
              ) : (
                "Confirm Selection"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}