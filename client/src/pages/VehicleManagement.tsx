import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";


/**
 * Vehicle Management page for adding and managing vehicles
 */
export default function VehicleManagement() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [showForm, setShowForm] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [vehicleToDelete, setVehicleToDelete] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    make: "",
    model: "",
    fuelType: "",
    deviceId: "",
  });

  // Fetch user's vehicles (auth not required)
  const { data: vehicles, isLoading: vehiclesLoading, refetch } = trpc.vehicles.list.useQuery();

  // Create vehicle mutation
  const createVehicleMutation = trpc.vehicles.create.useMutation({
    onSuccess: (data) => {
      console.log('Vehicle created successfully:', data);
      toast.success('Vehicle registered successfully!');
      setFormData({ make: "", model: "", fuelType: "", deviceId: "" });
      setShowForm(false);
      refetch();
    },
    onError: (error) => {
      console.error('Failed to create vehicle:', error);
      toast.error(`Failed to register vehicle: ${error.message}`);
    },
  });

  // Delete vehicle mutation
  const deleteVehicleMutation = trpc.vehicles.delete.useMutation({
    onSuccess: () => {
      toast.success('Vehicle deleted successfully!');
      setDeleteDialogOpen(false);
      setVehicleToDelete(null);
      refetch();
    },
    onError: (error) => {
      console.error('Failed to delete vehicle:', error);
      toast.error(`Failed to delete vehicle: ${error.message}`);
    },
  });

  const handleDeleteClick = (vehicleId: number) => {
    setVehicleToDelete(vehicleId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (vehicleToDelete) {
      deleteVehicleMutation.mutate({ vehicleId: vehicleToDelete });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.make || !formData.model || !formData.fuelType || !formData.deviceId) {
      toast.error('Please fill in all fields');
      return;
    }
    console.log('Submitting vehicle:', formData);
    createVehicleMutation.mutate(formData);
  };

  if (authLoading || vehiclesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin w-8 h-8 text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900">Manage Vehicles</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Add Vehicle Form */}
        {!showForm ? (
          <Button
            onClick={() => setShowForm(true)}
            className="mb-8 bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add New Vehicle
          </Button>
        ) : (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Add New Vehicle</CardTitle>
              <CardDescription>
                Register a new vehicle with its IoT device information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Vehicle Make
                    </label>
                    <Input
                      type="text"
                      placeholder="e.g., Maruti, Hyundai, Toyota"
                      value={formData.make}
                      onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                      disabled={createVehicleMutation.isPending}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Vehicle Model
                    </label>
                    <Input
                      type="text"
                      placeholder="e.g., Swift, Creta, Fortuner"
                      value={formData.model}
                      onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                      disabled={createVehicleMutation.isPending}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fuel Type
                    </label>
                    <select
                      value={formData.fuelType}
                      onChange={(e) => setFormData({ ...formData, fuelType: e.target.value })}
                      disabled={createVehicleMutation.isPending}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Fuel Type</option>
                      <option value="Petrol">Petrol</option>
                      <option value="Diesel">Diesel</option>
                      <option value="CNG">CNG</option>
                      <option value="LPG">LPG</option>
                      <option value="Electric">Electric</option>
                      <option value="Hybrid">Hybrid</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      IoT Device ID
                    </label>
                    <Input
                      type="text"
                      placeholder="e.g., DEVICE-001"
                      value={formData.deviceId}
                      onChange={(e) => setFormData({ ...formData, deviceId: e.target.value })}
                      disabled={createVehicleMutation.isPending}
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    type="submit"
                    disabled={createVehicleMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {createVehicleMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      "Add Vehicle"
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowForm(false)}
                    disabled={createVehicleMutation.isPending}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Vehicles List */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">Your Vehicles</h2>
          {vehicles && vehicles.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {vehicles.map((vehicle) => (
                <Card key={vehicle.id}>
                  <CardHeader>
                    <CardTitle>
                      {vehicle.make} {vehicle.model}
                    </CardTitle>
                    <CardDescription>
                      {vehicle.fuelType} • Device ID: {vehicle.deviceId}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Make:</span>
                        <span className="font-medium">{vehicle.make}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Model:</span>
                        <span className="font-medium">{vehicle.model}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Fuel Type:</span>
                        <span className="font-medium">{vehicle.fuelType}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Device ID:</span>
                        <span className="font-medium text-sm">{vehicle.deviceId}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Registered:</span>
                        <span className="font-medium">
                          {new Date(vehicle.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => setLocation(`/dashboard?vehicle=${vehicle.id}`)}
                      >
                        View Dashboard
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => handleDeleteClick(vehicle.id)}
                        disabled={deleteVehicleMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="text-center py-12">
              <CardHeader>
                <CardTitle>No Vehicles Registered</CardTitle>
                <CardDescription>
                  Add your first vehicle to start monitoring emissions
                </CardDescription>
              </CardHeader>
            </Card>
          )}
        </div>
      </main>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the vehicle
              and all associated emission readings and alerts.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteVehicleMutation.isPending}
            >
              {deleteVehicleMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
