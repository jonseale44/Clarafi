import { useState, useEffect, useCallback } from "react";
import { Check, ChevronDown, MapPin, Phone, Building2, Search, Loader2, Navigation } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Location {
  id: number;
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone?: string;
  npi?: string;
  locationType?: string;
  distance?: number;
}

interface HealthSystem {
  id: number;
  name: string;
  systemType?: string;
  subscriptionTier?: number;
  locations: Location[];
}

interface SearchableHealthSystemSelectorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export default function SearchableHealthSystemSelector({
  value,
  onChange,
  placeholder = "Search clinics near you...",
  className
}: SearchableHealthSystemSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [healthSystems, setHealthSystems] = useState<HealthSystem[]>([]);
  const [loading, setLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  const { toast } = useToast();

  // Get user's location
  const getUserLocation = useCallback(() => {
    setGettingLocation(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          setGettingLocation(false);
          // Reload data with location
          fetchHealthSystems(searchQuery, position.coords.latitude, position.coords.longitude);
        },
        (error) => {
          console.error("Error getting location:", error);
          setGettingLocation(false);
          toast({
            title: "Location Access Denied",
            description: "We'll show all available clinics instead.",
            variant: "default"
          });
        }
      );
    }
  }, [searchQuery]);

  // Fetch health systems with search and location
  const fetchHealthSystems = useCallback(async (search: string = "", lat?: number, lng?: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (lat && lng) {
        params.append("lat", lat.toString());
        params.append("lng", lng.toString());
      }

      const response = await apiRequest("GET", `/api/health-systems/public-with-locations?${params}`);
      const data = await response.json();
      
      setHealthSystems(data.healthSystems || []);
    } catch (error) {
      console.error("Error fetching health systems:", error);
      toast({
        title: "Error",
        description: "Failed to load health systems",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Initial load
  useEffect(() => {
    fetchHealthSystems();
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchHealthSystems(searchQuery, userLocation?.lat, userLocation?.lng);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, userLocation]);

  // Get display text for selected value
  const getDisplayText = () => {
    if (!value) return placeholder;
    
    // Check if it's a health system ID
    const healthSystem = healthSystems.find(hs => hs.id.toString() === value);
    if (healthSystem && healthSystem.locations.length === 0) {
      return healthSystem.name;
    }
    
    // Check if it's a location ID
    for (const hs of healthSystems) {
      const location = hs.locations.find(loc => `location-${loc.id}` === value);
      if (location) {
        return `${location.name} - ${location.city}, ${location.state}`;
      }
    }
    
    return placeholder;
  };

  const totalLocations = healthSystems.reduce((sum, hs) => sum + hs.locations.length, 0);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
        >
          <span className="truncate">{getDisplayText()}</span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[600px] p-0" align="start">
        <Command shouldFilter={false}>
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <input
              placeholder={placeholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            />
            <Button
              size="sm"
              variant="ghost"
              onClick={getUserLocation}
              disabled={gettingLocation}
              className="ml-2"
              title="Use my location"
            >
              {gettingLocation ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Navigation className="h-4 w-4" />
              )}
            </Button>
          </div>
          
          <CommandList className="max-h-[400px] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : healthSystems.length === 0 ? (
              <CommandEmpty>No clinics found. Try a different search.</CommandEmpty>
            ) : (
              <>
                <div className="px-3 py-2 text-xs text-muted-foreground">
                  {totalLocations} clinic{totalLocations !== 1 ? 's' : ''} found
                  {userLocation && " • Sorted by distance"}
                </div>
                
                {healthSystems.map((hs) => (
                  <CommandGroup key={hs.id} heading={hs.name}>
                    {/* Health system option (if no locations) */}
                    {hs.locations.length === 0 && (
                      <CommandItem
                        value={hs.id.toString()}
                        onSelect={() => {
                          onChange(hs.id.toString());
                          setOpen(false);
                        }}
                        className="flex items-center gap-2"
                      >
                        <Building2 className="h-4 w-4" />
                        <div className="flex-1">
                          <div className="font-medium">{hs.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {hs.systemType || "Health System"}
                          </div>
                        </div>
                        <Check
                          className={cn(
                            "ml-auto h-4 w-4",
                            value === hs.id.toString() ? "opacity-100" : "opacity-0"
                          )}
                        />
                      </CommandItem>
                    )}
                    
                    {/* Location options */}
                    {hs.locations.map((location) => {
                      const locationValue = `location-${location.id}`;
                      return (
                        <CommandItem
                          key={location.id}
                          value={locationValue}
                          onSelect={() => {
                            onChange(locationValue);
                            setOpen(false);
                          }}
                          className="flex items-start gap-2 py-3"
                        >
                          <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
                          <div className="flex-1 space-y-1">
                            <div className="font-medium">{location.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {location.address}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {location.city}, {location.state} {location.zipCode}
                            </div>
                            <div className="flex items-center gap-3 mt-1">
                              {location.phone && (
                                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Phone className="h-3 w-3" />
                                  {location.phone}
                                </span>
                              )}
                              {location.npi && (
                                <Badge variant="secondary" className="text-xs">
                                  NPI: {location.npi}
                                </Badge>
                              )}
                              {location.locationType && (
                                <Badge variant="outline" className="text-xs">
                                  {location.locationType}
                                </Badge>
                              )}
                              {location.distance && (
                                <span className="text-xs text-muted-foreground">
                                  {location.distance.toFixed(1)} mi
                                </span>
                              )}
                            </div>
                          </div>
                          <Check
                            className={cn(
                              "ml-auto h-4 w-4",
                              value === locationValue ? "opacity-100" : "opacity-0"
                            )}
                          />
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                ))}
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}