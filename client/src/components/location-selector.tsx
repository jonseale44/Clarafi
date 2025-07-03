import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Building2, MapPin, Phone, Users, Clock } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface UserLocation {
  id: number;
  userId: number;
  locationId: number;
  roleAtLocation: string;
  isPrimary: boolean;
  canSchedule: boolean;
  canViewAllPatients: boolean;
  canCreateOrders: boolean;
  locationName: string;
  locationShortName: string;
  locationType: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  services: string[];
  organizationName?: string;
  healthSystemName?: string;
}

interface LocationSelectorProps {
  onLocationSelected: (location: UserLocation) => void;
}

export function LocationSelector({ onLocationSelected }: LocationSelectorProps) {
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null);
  const [rememberSelection, setRememberSelection] = useState(false);
  const queryClient = useQueryClient();

  const { data: userLocations, isLoading } = useQuery<UserLocation[]>({
    queryKey: ["/api/user/locations"],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const setSessionLocationMutation = useMutation({
    mutationFn: async (data: { locationId: number; rememberSelection: boolean }) => {
      return apiRequest("POST", "/api/user/session-location", data);
    },
    onSuccess: (data) => {
      const selectedLocation = userLocations?.find(loc => loc.locationId === selectedLocationId);
      if (selectedLocation) {
        onLocationSelected(selectedLocation);
      }
      queryClient.invalidateQueries({ queryKey: ["/api/user/session-location"] });
    },
  });

  const handleLocationSelect = () => {
    if (selectedLocationId) {
      setSessionLocationMutation.mutate({
        locationId: selectedLocationId,
        rememberSelection
      });
    }
  };

  const getLocationTypeIcon = (type: string) => {
    switch (type) {
      case "hospital":
        return "🏥";
      case "clinic":
        return "🏢";
      case "urgent_care":
        return "⚡";
      default:
        return "📍";
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "primary_provider":
        return "bg-blue-100 text-blue-800";
      case "covering_provider":
        return "bg-green-100 text-green-800";
      case "nurse":
        return "bg-purple-100 text-purple-800";
      case "admin":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-sm text-gray-600">Loading your locations...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Group locations by health system and organization
  const groupedLocations = userLocations?.reduce((groups, location) => {
    const systemKey = location.healthSystemName || "Independent";
    const orgKey = location.organizationName || "Direct";
    
    if (!groups[systemKey]) {
      groups[systemKey] = {};
    }
    if (!groups[systemKey][orgKey]) {
      groups[systemKey][orgKey] = [];
    }
    groups[systemKey][orgKey].push(location);
    
    return groups;
  }, {} as Record<string, Record<string, UserLocation[]>>) || {};

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-gray-900">
            Select Your Working Location
          </CardTitle>
          <CardDescription>
            Choose which location you'll be working at today. This determines your patient schedules, 
            available resources, and clinical workflows.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {Object.entries(groupedLocations).map(([healthSystem, organizations]) => (
            <div key={healthSystem} className="space-y-4">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900">{healthSystem}</h3>
              </div>

              {Object.entries(organizations).map(([organization, locations]) => (
                <div key={organization} className="ml-6 space-y-3">
                  {organization !== "Direct" && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Users className="h-4 w-4" />
                      <span>{organization}</span>
                    </div>
                  )}

                  <div className="grid gap-3 md:grid-cols-2">
                    {locations.map((location) => (
                      <Card
                        key={location.locationId}
                        className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                          selectedLocationId === location.locationId
                            ? "ring-2 ring-blue-500 bg-blue-50"
                            : "hover:bg-gray-50"
                        } ${location.isPrimary ? "border-blue-200" : ""}`}
                        onClick={() => setSelectedLocationId(location.locationId)}
                      >
                        <CardContent className="p-4">
                          <div className="space-y-3">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-lg">
                                  {getLocationTypeIcon(location.locationType)}
                                </span>
                                <div>
                                  <h4 className="font-semibold text-gray-900">
                                    {location.locationName}
                                  </h4>
                                  <p className="text-sm text-gray-600">
                                    {location.locationShortName}
                                  </p>
                                </div>
                              </div>
                              {location.isPrimary && (
                                <Badge variant="outline" className="text-xs bg-blue-100">
                                  Primary
                                </Badge>
                              )}
                            </div>

                            <div className="space-y-1 text-xs text-gray-600">
                              <div className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                <span>{location.address}, {location.city}, {location.state}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                <span>{location.phone}</span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between">
                              <Badge 
                                className={`text-xs ${getRoleColor(location.roleAtLocation)}`}
                                variant="secondary"
                              >
                                {location.roleAtLocation.replace('_', ' ')}
                              </Badge>
                              
                              <div className="text-xs text-gray-500">
                                {location.locationType}
                              </div>
                            </div>

                            {location.services && location.services.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {location.services.slice(0, 3).map((service) => (
                                  <Badge 
                                    key={service} 
                                    variant="outline" 
                                    className="text-xs bg-gray-50"
                                  >
                                    {service.replace('_', ' ')}
                                  </Badge>
                                ))}
                                {location.services.length > 3 && (
                                  <Badge variant="outline" className="text-xs bg-gray-50">
                                    +{location.services.length - 3} more
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}

              {Object.keys(groupedLocations).length > 1 && (
                <Separator className="my-4" />
              )}
            </div>
          ))}

          <div className="space-y-4 pt-4 border-t">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="remember"
                checked={rememberSelection}
                onCheckedChange={(checked) => setRememberSelection(checked as boolean)}
              />
              <label
                htmlFor="remember"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Remember this location for future logins
              </label>
            </div>

            <div className="flex justify-center">
              <Button
                onClick={handleLocationSelect}
                disabled={!selectedLocationId || setSessionLocationMutation.isPending}
                className="px-8 py-2"
              >
                {setSessionLocationMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Setting Location...
                  </>
                ) : (
                  <>
                    <Clock className="h-4 w-4 mr-2" />
                    Start Working Here
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="text-center text-xs text-gray-500">
            <p>Your location selection determines patient schedules, billing codes, and available resources.</p>
            <p>You can change your location later from the main navigation.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}