import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Search, Building2, Phone, Clock, Star, Navigation, AlertTriangle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface ClinicResult {
  place_id: string;
  name: string;
  formatted_address: string;
  geometry: {
    location: { lat: number; lng: number };
  };
  types: string[];
  formatted_phone_number?: string;
  website?: string;
  opening_hours?: {
    weekday_text?: string[];
  };
  place_details?: {
    hours?: string;
    rating?: number;
    user_ratings_total?: number;
  };
  distance?: number;
}

interface LocationBasedClinicSearchProps {
  onClinicSelect: (clinic: ClinicResult) => void;
  className?: string;
}

export function LocationBasedClinicSearch({ onClinicSelect, className }: LocationBasedClinicSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string>('');
  const [searchMode, setSearchMode] = useState<'nearby' | 'search'>('nearby');

  // Get user's location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error('Geolocation error:', error);
          setLocationError('Unable to get your location. You can still search by name.');
        }
      );
    } else {
      setLocationError('Location services not supported by your browser.');
    }
  }, []);

  // Search for clinics
  const { data: searchResults, isLoading: searchLoading, error: searchError } = useQuery({
    queryKey: ['/api/places/search-medical', searchQuery, userLocation],
    enabled: (searchMode === 'search' && searchQuery.length > 2) || 
              (searchMode === 'nearby' && userLocation !== null),
    queryFn: async () => {
      const params = new URLSearchParams();
      
      if (searchMode === 'search') {
        params.append('query', searchQuery);
      }
      
      if (userLocation) {
        params.append('lat', userLocation.lat.toString());
        params.append('lng', userLocation.lng.toString());
        params.append('radius', '50000'); // 50km radius
      }

      const response = await fetch(`/api/places/search-medical?${params}`);
      const data = await response.json();
      
      if (data.status === 'OK') {
        return data.results as ClinicResult[];
      } else {
        throw new Error(data.error || 'Failed to search for clinics');
      }
    }
  });

  const handleSearch = () => {
    setSearchMode('search');
  };

  const handleNearbySearch = () => {
    setSearchMode('nearby');
  };

  const formatDistance = (distance?: number) => {
    if (!distance) return '';
    return distance < 1 ? `${(distance * 1000).toFixed(0)}m` : `${distance.toFixed(1)} miles`;
  };

  const getClinicTypeIcon = (types: string[]) => {
    if (types.includes('hospital')) return '🏥';
    if (types.includes('doctor')) return '👨‍⚕️';
    if (types.includes('dentist')) return '🦷';
    if (types.includes('physiotherapist')) return '🏃‍♂️';
    return '⚕️';
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Find Your Clinic
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search Input */}
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                placeholder="Search for your clinic name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <Button onClick={handleSearch} disabled={searchQuery.length < 3}>
              <Search className="w-4 h-4 mr-2" />
              Search
            </Button>
          </div>

          {/* Nearby Search Button */}
          {userLocation && (
            <Button 
              variant="outline" 
              onClick={handleNearbySearch}
              className="w-full flex items-center gap-2"
            >
              <Navigation className="w-4 h-4" />
              Find Clinics Near Me
            </Button>
          )}

          {/* Location Error */}
          {locationError && (
            <Alert>
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription>{locationError}</AlertDescription>
            </Alert>
          )}

          {/* Loading State */}
          {searchLoading && (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          )}

          {/* Search Results */}
          {searchResults && searchResults.length > 0 && (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              <p className="text-sm text-muted-foreground">
                Found {searchResults.length} healthcare facilities
              </p>
              {searchResults.map((clinic) => (
                <Card key={clinic.place_id} className="hover:bg-accent cursor-pointer" onClick={() => onClinicSelect(clinic)}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{getClinicTypeIcon(clinic.types)}</span>
                          <h3 className="font-semibold">{clinic.name}</h3>
                          {clinic.distance && (
                            <Badge variant="secondary" className="text-xs">
                              {formatDistance(clinic.distance)}
                            </Badge>
                          )}
                        </div>
                        
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {clinic.formatted_address}
                        </p>

                        {clinic.formatted_phone_number && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {clinic.formatted_phone_number}
                          </p>
                        )}

                        {clinic.place_details?.hours && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {clinic.place_details.hours}
                          </p>
                        )}

                        {clinic.place_details?.rating && (
                          <div className="flex items-center gap-1 text-sm">
                            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                            <span>{clinic.place_details.rating}</span>
                            {clinic.place_details.user_ratings_total && (
                              <span className="text-muted-foreground">({clinic.place_details.user_ratings_total})</span>
                            )}
                          </div>
                        )}

                        {/* Clinic Types */}
                        <div className="flex flex-wrap gap-1 mt-2">
                          {clinic.types.slice(0, 3).map((type) => (
                            <Badge key={type} variant="outline" className="text-xs capitalize">
                              {type.replace('_', ' ')}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <Button variant="outline" size="sm">
                        Select
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* No Results */}
          {searchResults && searchResults.length === 0 && (
            <Alert>
              <Search className="w-4 h-4" />
              <AlertDescription>
                No clinics found. Try adjusting your search terms or location.
              </AlertDescription>
            </Alert>
          )}

          {/* Search Error */}
          {searchError && (
            <Alert variant="destructive">
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription>
                Error searching for clinics: {(searchError as Error).message}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}