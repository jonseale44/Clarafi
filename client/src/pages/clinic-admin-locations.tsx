import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Edit2, Trash2, MapPin, Phone, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { AppLayout } from "@/components/layout/app-layout";

const locationSchema = z.object({
  name: z.string().min(1, "Location name is required"),
  shortName: z.string().optional(),
  locationType: z.enum(['clinic', 'hospital', 'urgent_care', 'specialty_center', 'outpatient_center']),
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(2, "State is required").max(2),
  zipCode: z.string().min(5, "Zip code is required"),
  phone: z.string().optional(),
  fax: z.string().optional(),
  npi: z.string().optional(),
  facilityCode: z.string().optional(),
});

type LocationFormData = z.infer<typeof locationSchema>;

const locationTypeLabels = {
  clinic: "Clinic",
  hospital: "Hospital",
  urgent_care: "Urgent Care",
  specialty_center: "Specialty Center",
  outpatient_center: "Outpatient Center",
};

export default function ClinicAdminLocations() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<any>(null);

  // Fetch locations
  const { data: locations = [], isLoading } = useQuery({
    queryKey: ["/api/clinic-admin/locations"],
  });

  const form = useForm<LocationFormData>({
    resolver: zodResolver(locationSchema),
    defaultValues: {
      name: "",
      shortName: "",
      locationType: "clinic",
      address: "",
      city: "",
      state: "",
      zipCode: "",
      phone: "",
      fax: "",
      npi: "",
      facilityCode: "",
    },
  });

  // Create/Update location mutation
  const saveLocationMutation = useMutation({
    mutationFn: async (data: LocationFormData) => {
      const url = editingLocation 
        ? `/api/clinic-admin/locations/${editingLocation.id}`
        : "/api/clinic-admin/locations";
      const method = editingLocation ? "PUT" : "POST";
      
      const response = await apiRequest(method, url, data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save location");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clinic-admin/locations"] });
      toast({
        title: editingLocation ? "Location Updated" : "Location Created",
        description: "The location has been saved successfully.",
      });
      setIsDialogOpen(false);
      setEditingLocation(null);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete location mutation
  const deleteLocationMutation = useMutation({
    mutationFn: async (locationId: number) => {
      const response = await apiRequest("DELETE", `/api/clinic-admin/locations/${locationId}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete location");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clinic-admin/locations"] });
      toast({
        title: "Location Deleted",
        description: "The location has been removed.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleEdit = (location: any) => {
    setEditingLocation(location);
    form.reset({
      name: location.name,
      shortName: location.shortName || "",
      locationType: location.locationType,
      address: location.address,
      city: location.city,
      state: location.state,
      zipCode: location.zipCode,
      phone: location.phone || "",
      fax: location.fax || "",
      npi: location.npi || "",
      facilityCode: location.facilityCode || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (locationId: number) => {
    if (confirm("Are you sure you want to delete this location?")) {
      deleteLocationMutation.mutate(locationId);
    }
  };

  const onSubmit = (data: LocationFormData) => {
    saveLocationMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="container mx-auto py-8">
          <div className="text-center">Loading locations...</div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Locations</h1>
            <p className="text-muted-foreground">
              Manage your health system's physical locations
            </p>
          </div>
          <Button onClick={() => {
            setEditingLocation(null);
            form.reset();
            setIsDialogOpen(true);
          }}>
            <Plus className="mr-2 h-4 w-4" />
            Add Location
          </Button>
        </div>

        {locations.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <MapPin className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No locations yet</h3>
                <p className="text-muted-foreground mb-4">
                  Add your first location to get started
                </p>
                <Button onClick={() => setIsDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Your First Location
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {locations.map((location: any) => (
              <Card key={location.id}>
                <CardHeader className="pb-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{location.name}</CardTitle>
                      <Badge variant="secondary" className="mt-1">
                        {locationTypeLabels[location.locationType as keyof typeof locationTypeLabels]}
                      </Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleEdit(location)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleDelete(location.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <div>
                      <div>{location.address}</div>
                      <div>{location.city}, {location.state} {location.zipCode}</div>
                    </div>
                  </div>
                  {location.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{location.phone}</span>
                    </div>
                  )}
                  {location.npi && (
                    <div className="text-sm text-muted-foreground">
                      NPI: {location.npi}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingLocation ? "Edit Location" : "Add New Location"}
              </DialogTitle>
              <DialogDescription>
                {editingLocation 
                  ? "Update the information for this location"
                  : "Add a new physical location for your health system"}
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Main Clinic" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="shortName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Short Name (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Main" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="locationType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select location type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(locationTypeLabels).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Street Address</FormLabel>
                      <FormControl>
                        <Input placeholder="123 Main Street" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <Input placeholder="Austin" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State</FormLabel>
                        <FormControl>
                          <Input placeholder="TX" maxLength={2} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="zipCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Zip Code</FormLabel>
                        <FormControl>
                          <Input placeholder="78701" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="(512) 555-0123" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="fax"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fax (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="(512) 555-0124" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="npi"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>NPI Number (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="1234567890" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="facilityCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Facility Code (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="FAC-001" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saveLocationMutation.isPending}>
                    {saveLocationMutation.isPending ? "Saving..." : "Save Location"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}