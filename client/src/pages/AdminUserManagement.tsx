import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Search, Users, Building2, MapPin, Shield, UserPlus, Edit, Trash2, AlertCircle } from "lucide-react";

interface User {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  npi?: string;
  credentials?: string;
  active: boolean;
  lastLogin?: string;
  createdAt: string;
  locationCount?: number;
}

interface Location {
  id: number;
  name: string;
  shortName?: string;
  locationType: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone?: string;
  healthSystemName?: string;
  organizationName?: string;
}

interface UserLocation {
  id: number;
  userId: number;
  locationId: number;
  roleAtLocation: string;
  isPrimary: boolean;
  canSchedule: boolean;
  canViewAllPatients: boolean;
  canCreateOrders: boolean;
  active: boolean;
  startDate?: string;
  endDate?: string;
  location?: Location;
}

export function AdminUserManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showLocationDialog, setShowLocationDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch all users
  const { data: users = [], isLoading: loadingUsers } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
  });

  // Fetch all locations
  const { data: locations = [], isLoading: loadingLocations } = useQuery<Location[]>({
    queryKey: ["/api/admin/locations"],
  });

  // Fetch user locations when a user is selected
  const { data: userLocations = [] } = useQuery<UserLocation[]>({
    queryKey: ["/api/admin/users", selectedUser?.id, "locations"],
    enabled: !!selectedUser,
  });

  // Filter locations to only show ones from the selected user's health system
  const availableLocations = selectedUser 
    ? locations.filter(location => location.healthSystemId === selectedUser.healthSystemId)
    : [];

  // Toggle user active status
  const toggleUserStatusMutation = useMutation({
    mutationFn: async ({ userId, active }: { userId: number; active: boolean }) => {
      return apiRequest("PUT", `/api/admin/users/${userId}/status`, { active });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "User status updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update user status", variant: "destructive" });
    },
  });

  // Assign user to location
  const assignLocationMutation = useMutation({
    mutationFn: async (data: {
      userId: number;
      locationId: number;
      roleAtLocation: string;
      isPrimary: boolean;
      permissions: {
        canSchedule: boolean;
        canViewAllPatients: boolean;
        canCreateOrders: boolean;
      };
    }) => {
      return apiRequest("POST", `/api/admin/users/${data.userId}/locations`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users", selectedUser?.id, "locations"] });
      setShowLocationDialog(false);
      toast({ title: "Location assigned successfully" });
    },
    onError: () => {
      toast({ title: "Failed to assign location", variant: "destructive" });
    },
  });

  // Remove user from location
  const removeLocationMutation = useMutation({
    mutationFn: async ({ userId, locationId }: { userId: number; locationId: number }) => {
      return apiRequest("DELETE", `/api/admin/users/${userId}/locations/${locationId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users", selectedUser?.id, "locations"] });
      toast({ title: "Location removed successfully" });
    },
    onError: () => {
      toast({ title: "Failed to remove location", variant: "destructive" });
    },
  });

  // Delete user
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      return apiRequest("DELETE", `/api/admin/users/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setShowDeleteDialog(false);
      setUserToDelete(null);
      toast({ title: "User deleted successfully" });
    },
    onError: (error: any) => {
      // Display detailed error message from server
      const message = error?.message || "Failed to delete user";
      toast({ 
        title: "Cannot Delete User", 
        description: message,
        variant: "destructive" 
      });
    },
  });

  const filteredUsers = users.filter(user => 
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    `${user.firstName} ${user.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleBadgeColor = (role: string) => {
    const colors: Record<string, string> = {
      admin: "bg-red-100 text-red-800",
      provider: "bg-blue-100 text-blue-800",
      nurse: "bg-purple-100 text-purple-800",
      ma: "bg-green-100 text-green-800",
      staff: "bg-gray-100 text-gray-800",
      front_desk: "bg-yellow-100 text-yellow-800",
      billing: "bg-orange-100 text-orange-800",
      lab_tech: "bg-indigo-100 text-indigo-800",
      referral_coordinator: "bg-pink-100 text-pink-800",
      practice_manager: "bg-cyan-100 text-cyan-800",
      read_only: "bg-gray-100 text-gray-800",
    };
    return colors[role] || "bg-gray-100 text-gray-800";
  };

  // Get appropriate location roles based on system role
  const getLocationRolesForSystemRole = (systemRole: string): Array<{value: string, label: string}> => {
    switch (systemRole) {
      case 'provider':
        return [
          { value: 'primary_provider', label: 'Primary Provider' },
          { value: 'covering_provider', label: 'Covering Provider' },
          { value: 'specialist', label: 'Specialist' }
        ];
      case 'nurse':
        return [
          { value: 'nurse', label: 'Nurse' }
        ];
      case 'ma':
        return [
          { value: 'ma', label: 'Medical Assistant (MA)' }
        ];
      case 'admin':
      case 'front_desk':
      case 'billing':
      case 'lab_tech':
      case 'referral_coordinator':
      case 'practice_manager':
      case 'read_only':
      default:
        return [
          { value: 'staff', label: 'Staff' }
        ];
    }
  };

  const LocationAssignmentDialog = () => {
    const [selectedLocationId, setSelectedLocationId] = useState<string>("");
    const [roleAtLocation, setRoleAtLocation] = useState(() => {
      if (selectedUser) {
        const roles = getLocationRolesForSystemRole(selectedUser.role);
        return roles.length > 0 ? roles[0].value : "staff";
      }
      return "staff";
    });
    const [isPrimary, setIsPrimary] = useState(false);
    const [permissions, setPermissions] = useState({
      canSchedule: true,
      canViewAllPatients: true,
      canCreateOrders: true,
    });

    // Update default role when dialog opens or user changes
    useEffect(() => {
      if (showLocationDialog && selectedUser) {
        const roles = getLocationRolesForSystemRole(selectedUser.role);
        if (roles.length > 0) {
          setRoleAtLocation(roles[0].value);
        }
      }
    }, [showLocationDialog, selectedUser]);

    const handleAssign = () => {
      if (!selectedUser || !selectedLocationId) return;
      
      assignLocationMutation.mutate({
        userId: selectedUser.id,
        locationId: parseInt(selectedLocationId),
        roleAtLocation,
        isPrimary,
        permissions,
      });
    };

    return (
      <Dialog open={showLocationDialog} onOpenChange={setShowLocationDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Assign Location to {selectedUser?.firstName} {selectedUser?.lastName}</DialogTitle>
            <DialogDescription>
              Configure location access and permissions for this user
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="location">Location</Label>
              <Select value={selectedLocationId} onValueChange={setSelectedLocationId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a location" />
                </SelectTrigger>
                <SelectContent>
                  {availableLocations.map((location) => (
                    <SelectItem key={location.id} value={location.id.toString()}>
                      <div className="flex flex-col">
                        <span className="font-medium">{location.name}</span>
                        <span className="text-sm text-gray-500">
                          {location.city}, {location.state} - {location.healthSystemName || "Independent"}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                  {availableLocations.length === 0 && (
                    <div className="p-2 text-sm text-gray-500">
                      No locations available in user's health system
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="role">Role at Location</Label>
              <Select value={roleAtLocation} onValueChange={setRoleAtLocation}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {selectedUser && getLocationRolesForSystemRole(selectedUser.role).map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox 
                id="primary" 
                checked={isPrimary} 
                onCheckedChange={(checked) => setIsPrimary(checked as boolean)}
              />
              <Label htmlFor="primary">Set as primary location</Label>
            </div>

            <div className="space-y-2">
              <Label>Permissions at this location</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="schedule" 
                    checked={permissions.canSchedule}
                    onCheckedChange={(checked) => 
                      setPermissions(prev => ({ ...prev, canSchedule: checked as boolean }))
                    }
                  />
                  <Label htmlFor="schedule">Can schedule appointments</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="viewAll" 
                    checked={permissions.canViewAllPatients}
                    onCheckedChange={(checked) => 
                      setPermissions(prev => ({ ...prev, canViewAllPatients: checked as boolean }))
                    }
                  />
                  <Label htmlFor="viewAll">Can view all patients (vs only assigned)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="orders" 
                    checked={permissions.canCreateOrders}
                    onCheckedChange={(checked) => 
                      setPermissions(prev => ({ ...prev, canCreateOrders: checked as boolean }))
                    }
                  />
                  <Label htmlFor="orders">Can create orders</Label>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLocationDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssign} disabled={!selectedLocationId}>
              Assign Location
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  if (loadingUsers || loadingLocations) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">User Management</h1>
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">User Management</h1>
        <p className="text-muted-foreground mt-2">
          Manage users, assign locations, and configure permissions
        </p>
      </div>

      {/* Search and filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search users by name, username, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              Invite User
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Users table */}
      <Card>
        <CardHeader>
          <CardTitle>All Users ({filteredUsers.length})</CardTitle>
          <CardDescription>
            Click on a user to manage their location assignments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Locations</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow 
                  key={user.id} 
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => setSelectedUser(user)}
                >
                  <TableCell className="font-medium">
                    {user.firstName} {user.lastName}
                    {user.credentials && (
                      <span className="text-sm text-gray-500 ml-1">
                        , {user.credentials}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>{user.username}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge className={getRoleBadgeColor(user.role)} variant="secondary">
                      {user.role.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {user.locationCount || 0} locations
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={user.active ? "default" : "secondary"}
                      className={user.active ? "bg-green-100 text-green-800" : ""}
                    >
                      {user.active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : "Never"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleUserStatusMutation.mutate({ 
                          userId: user.id, 
                          active: !user.active 
                        })}
                      >
                        {user.active ? "Deactivate" : "Activate"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600"
                        onClick={() => {
                          setUserToDelete(user);
                          setShowDeleteDialog(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* User details panel */}
      {selectedUser && (
        <Card className="mt-6">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle>
                  {selectedUser.firstName} {selectedUser.lastName}
                  {selectedUser.credentials && `, ${selectedUser.credentials}`}
                </CardTitle>
                <CardDescription>
                  {selectedUser.email} • {selectedUser.role.replace('_', ' ')}
                  {selectedUser.npi && ` • NPI: ${selectedUser.npi}`}
                </CardDescription>
              </div>
              <Button onClick={() => setShowLocationDialog(true)}>
                <MapPin className="h-4 w-4 mr-2" />
                Assign Location
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <h3 className="font-semibold mb-3">Location Assignments</h3>
            {userLocations.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <MapPin className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>No locations assigned</p>
                <p className="text-sm mt-1">Click "Assign Location" to give this user access to a clinic location</p>
              </div>
            ) : (
              <div className="space-y-3">
                {userLocations.map((userLoc) => (
                  <div key={userLoc.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{userLoc.location?.name}</h4>
                          {userLoc.isPrimary && (
                            <Badge className="bg-blue-100 text-blue-800" variant="secondary">
                              Primary
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {userLoc.location?.address}, {userLoc.location?.city}, {userLoc.location?.state}
                        </p>
                        <div className="flex items-center gap-4 mt-2">
                          <Badge variant="outline">
                            {userLoc.roleAtLocation.replace('_', ' ')}
                          </Badge>
                          <div className="flex gap-2 text-sm">
                            {userLoc.canSchedule && (
                              <Badge variant="secondary" className="bg-green-50">
                                Can Schedule
                              </Badge>
                            )}
                            {userLoc.canViewAllPatients && (
                              <Badge variant="secondary" className="bg-green-50">
                                View All Patients
                              </Badge>
                            )}
                            {userLoc.canCreateOrders && (
                              <Badge variant="secondary" className="bg-green-50">
                                Create Orders
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600"
                        onClick={() => removeLocationMutation.mutate({
                          userId: selectedUser.id,
                          locationId: userLoc.locationId,
                        })}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Location assignment dialog */}
      <LocationAssignmentDialog />

      {/* Delete confirmation dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              <div className="flex items-center gap-2 text-red-600 mt-2">
                <AlertCircle className="h-4 w-4" />
                This action cannot be undone
              </div>
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p>Are you sure you want to delete <strong>{userToDelete?.firstName} {userToDelete?.lastName}</strong>?</p>
            <p className="text-sm text-gray-600 mt-2">
              All location assignments and user data will be permanently removed.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => userToDelete && deleteUserMutation.mutate(userToDelete.id)}
            >
              Delete User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}