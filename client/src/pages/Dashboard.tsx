import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Loader2, AlertTriangle, CheckCircle, TrendingUp, Download, 
  Gauge, Activity, Wind, Droplets, RefreshCcw, Calendar,
  ArrowLeft, FileCheck
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useState, useEffect, useRef } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from "recharts";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";

/**
 * Enhanced Professional Dashboard for monitoring vehicle emissions
 */
export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const [currentLocation] = useLocation();
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);
  const [isLivePlotting, setIsLivePlotting] = useState<boolean>(true);
  const liveDataIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Parse vehicle ID from URL query params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const vehicleParam = params.get("vehicle");
    if (vehicleParam) {
      const vehicleId = parseInt(vehicleParam, 10);
      if (!isNaN(vehicleId)) {
        setSelectedVehicleId(vehicleId);
      }
    }
  }, [currentLocation]);

  // Helper to convert string or number to number
  const toNumber = (val: any): number | null => {
    if (val === null || val === undefined) return null;
    return typeof val === 'string' ? parseFloat(val) : val;
  };

  // Fetch user's vehicles
  const { data: vehicles, isLoading: vehiclesLoading } = trpc.vehicles.list.useQuery();

  // Set first vehicle as default
  const vehicleId = selectedVehicleId || vehicles?.[0]?.id;

  // Fetch latest emission reading
  const { data: latestReading = null, refetch: refetchLatest } = trpc.emissions.latest.useQuery(
    { vehicleId: vehicleId || 0 },
    { enabled: !!vehicleId, refetchInterval: 3000 } // Auto-refresh every 3s for smooth updates
  );

  // Fetch emission history with auto-refresh
  const { data: history = [], refetch: refetchHistory } = trpc.emissions.history.useQuery(
    { vehicleId: vehicleId || 0, hoursBack: 24 },
    { enabled: !!vehicleId, refetchInterval: 3000 } // Auto-refresh every 3s to match generation
  );

  // Mock data generation - separate mutations for manual and automatic
  const generateMockMutation = trpc.emissions.generateMock.useMutation({
    onError: (error) => {
      toast.error(`Failed to generate mock data: ${error.message}`);
    },
  });

  // Separate mutation for continuous generation (no toasts)
  const continuousMockMutation = trpc.emissions.generateMock.useMutation({
    onError: () => {
      // Silent error handling for continuous generation
    },
  });

  // Auto-generate initial data if no data exists (only once on mount)
  useEffect(() => {
    if (vehicleId && !latestReading && !vehiclesLoading && history.length === 0) {
      // Small delay to avoid race conditions
      const timer = setTimeout(() => {
        continuousMockMutation.mutate({ vehicleId });
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [vehicleId, latestReading, vehiclesLoading, history.length]);

  // Continuous live data generation for plotting
  useEffect(() => {
    // Clear any existing interval first
    if (liveDataIntervalRef.current) {
      clearInterval(liveDataIntervalRef.current);
      liveDataIntervalRef.current = null;
    }

    if (isLivePlotting && vehicleId) {
      // Generate new data every 3 seconds for smoother plotting
      const interval = setInterval(() => {
        // Don't wait for pending state - queue requests smoothly
        if (!continuousMockMutation.isPending) {
          continuousMockMutation.mutate(
            { vehicleId },
            {
              onSuccess: () => {
                // Silently update without toast notification
                refetchLatest();
                refetchHistory();
              },
            }
          );
        }
      }, 3000); // Generate every 3 seconds for smoother updates

      liveDataIntervalRef.current = interval;

      return () => {
        if (liveDataIntervalRef.current) {
          clearInterval(liveDataIntervalRef.current);
          liveDataIntervalRef.current = null;
        }
      };
    }
  }, [isLivePlotting, vehicleId]);

  // Fetch vehicle alerts
  const { data: alerts = [] } = trpc.alerts.vehicleAlerts.useQuery(
    { vehicleId: vehicleId || 0 },
    { enabled: !!vehicleId }
  );

  if (authLoading || vehiclesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-green-50 to-blue-50">
        <div className="text-center">
          <Loader2 className="animate-spin w-12 h-12 text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  if (!vehicles || vehicles.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-green-50 to-blue-50 p-8">
        <div className="max-w-3xl mx-auto">
          <Card className="text-center py-16 shadow-2xl border-none">
            <CardHeader>
              <Gauge className="h-20 w-20 mx-auto text-blue-600 mb-4" />
              <CardTitle className="text-3xl">No Vehicles Registered</CardTitle>
              <CardDescription className="text-lg mt-2">
                Start monitoring emissions by registering your first vehicle
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/my-vehicles">
                <Button className="bg-blue-600 hover:bg-blue-700 text-lg px-8 py-6 shadow-lg">
                  <Activity className="mr-2 h-5 w-5" />
                  Register Your First Vehicle
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const selectedVehicle = vehicles.find(v => v.id === vehicleId);
  const thresholds = { co2: 1000, co: 50, nox: 100, pmLevel: 100 };

  // Determine compliance status
  const isCompliant = (alerts && alerts.length === 0) || !alerts;

  // Prepare chart data - show last 2 hours for better live plotting visualization
  const recentHistory = (history && Array.isArray(history) ? history : []).slice(-48); // Last 48 points (2 hours at 2.5 min intervals)
  const chartData = recentHistory.map(reading => {
    const timestamp = reading.timestamp instanceof Date ? reading.timestamp : new Date(reading.timestamp);
    return {
      time: timestamp.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit'
      }),
      timestamp: timestamp.getTime(),
      CO2: toNumber(reading.co2),
      CO: toNumber(reading.co),
      NOx: toNumber(reading.nox),
      PM: toNumber(reading.pmLevel),
    };
  }).sort((a, b) => a.timestamp - b.timestamp);

  // Handle certificate download
  const handleDownloadCertificate = () => {
    if (!selectedVehicle || !isCompliant) {
      toast.error("Certificate is not available for this vehicle");
      return;
    }

    // Create certificate data
    const certificateData = {
      vehicle: {
        make: selectedVehicle.make,
        model: selectedVehicle.model,
        fuelType: selectedVehicle.fuelType,
        deviceId: selectedVehicle.deviceId,
      },
      date: new Date().toLocaleDateString(),
      complianceStatus: "COMPLIANT",
      emissionReadings: latestReading ? {
        co2: toNumber(latestReading.co2),
        co: toNumber(latestReading.co),
        nox: toNumber(latestReading.nox),
        pmLevel: toNumber(latestReading.pmLevel),
      } : null,
    };

    // Create a simple text-based certificate
    const certificateText = `
╔════════════════════════════════════════════════════════════════╗
║           POLLUTION UNDER CONTROL (PUC) CERTIFICATE            ║
╚════════════════════════════════════════════════════════════════╝

Vehicle Information:
  Make: ${certificateData.vehicle.make}
  Model: ${certificateData.vehicle.model}
  Fuel Type: ${certificateData.vehicle.fuelType}
  Device ID: ${certificateData.vehicle.deviceId}

Compliance Status: ${certificateData.complianceStatus}
Issue Date: ${certificateData.date}

Latest Emission Readings:
  CO2: ${certificateData.emissionReadings?.co2?.toFixed(1) || "N/A"} ppm
  CO: ${certificateData.emissionReadings?.co?.toFixed(1) || "N/A"} ppm
  NOx: ${certificateData.emissionReadings?.nox?.toFixed(1) || "N/A"} ppm
  PM: ${certificateData.emissionReadings?.pmLevel?.toFixed(1) || "N/A"} µg/m³

This certificate confirms that the above vehicle meets the emission
standards as per CPCB guidelines and is valid for the day of issue.

Certificate ID: PUC-${selectedVehicle.deviceId}-${new Date().toISOString().split('T')[0]}

═══════════════════════════════════════════════════════════════════
This is a digital certificate generated by the Emission Monitoring System.
    `;

    // Create a blob and download
    const blob = new Blob([certificateText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `PUC-Certificate-${selectedVehicle.deviceId}-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success("Certificate downloaded successfully!");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-green-50 to-blue-50">
      {/* Enhanced Header */}
      <header className="bg-white/80 backdrop-blur-lg shadow-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
                  Vehicle Dashboard
                </h1>
                <p className="text-sm text-gray-600 mt-1">Real-time emission monitoring & analytics</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                onClick={() => setIsLivePlotting(!isLivePlotting)}
                variant={isLivePlotting ? "default" : "outline"}
                size="sm"
              >
                <Activity className={`h-4 w-4 mr-2 ${isLivePlotting ? "animate-pulse" : ""}`} />
                {isLivePlotting ? "Live Plotting ON" : "Live Plotting OFF"}
              </Button>
              <Button 
                onClick={() => {
                  if (vehicleId) {
                    generateMockMutation.mutate(
                      { vehicleId },
                      {
                        onSuccess: () => {
                          toast.success("Mock data generated successfully!");
                          refetchLatest();
                          refetchHistory();
                        },
                      }
                    );
                  }
                }}
                variant="outline" 
                size="sm"
                disabled={!vehicleId || generateMockMutation.isPending}
              >
                <Activity className="h-4 w-4 mr-2" />
                {generateMockMutation.isPending ? "Generating..." : "Generate Data"}
              </Button>
              <Button onClick={() => {
                refetchLatest();
                refetchHistory();
              }} variant="outline" size="sm">
                <RefreshCcw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* User Profile Card */}
        <Card className="mb-8 shadow-lg border-none bg-white/80 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-600" />
              User Profile
            </CardTitle>
            <CardDescription>Your account information</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-gradient-to-r from-blue-600 to-green-600 flex items-center justify-center text-white text-2xl font-bold">
                  {user?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || "U"}
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{user?.name || "No name"}</h3>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={user?.role === "admin" ? "default" : "secondary"} className="text-xs">
                      {user?.role === "admin" ? "Administrator" : "User"}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      Last signed in: {user?.lastSignedIn ? new Date(user.lastSignedIn).toLocaleDateString() : "N/A"}
                    </span>
                  </div>
                </div>
              </div>
              <Link href="/profile">
                <Button variant="outline" size="sm">
                  View Profile
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Vehicle Selector with Enhanced UI */}
        <Card className="mb-8 shadow-lg border-none bg-white/80 backdrop-blur">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Gauge className="h-5 w-5 text-blue-600" />
                  Select Vehicle
                </CardTitle>
                <CardDescription>Choose a vehicle to monitor emissions</CardDescription>
              </div>
              <Badge variant={isCompliant ? "outline" : "destructive"} className="text-sm px-4 py-2">
                {vehicles.length} Vehicle{vehicles.length > 1 ? 's' : ''} Registered
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {vehicles.map(vehicle => (
                <Button
                  key={vehicle.id}
                  variant={vehicleId === vehicle.id ? "default" : "outline"}
                  onClick={() => {
                    setSelectedVehicleId(vehicle.id);
                    // Update URL query params
                    const url = new URL(window.location.href);
                    url.searchParams.set("vehicle", vehicle.id.toString());
                    window.history.pushState({}, "", url.toString());
                  }}
                  className={`h-auto py-4 px-4 justify-start ${
                    vehicleId === vehicle.id 
                      ? "bg-gradient-to-r from-blue-600 to-blue-500 shadow-lg" 
                      : "hover:bg-blue-50"
                  }`}
                >
                  <div className="text-left">
                    <p className="font-semibold">{vehicle.make} {vehicle.model}</p>
                    <p className="text-xs opacity-80">{vehicle.fuelType} • {vehicle.deviceId}</p>
                  </div>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Compliance Status Banner */}
        <Card className={`mb-8 border-2 shadow-lg ${
          isCompliant 
            ? "border-green-400 bg-gradient-to-r from-green-50 to-green-100" 
            : "border-red-400 bg-gradient-to-r from-red-50 to-red-100"
        }`}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-3 text-2xl">
                {isCompliant ? (
                  <>
                    <div className="p-2 bg-green-600 rounded-full">
                      <CheckCircle className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <span className="text-green-700">COMPLIANT</span>
                      <p className="text-sm font-normal text-green-600 mt-1">
                        All emission levels within acceptable limits
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="p-2 bg-red-600 rounded-full animate-pulse">
                      <AlertTriangle className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <span className="text-red-700">NON-COMPLIANT</span>
                      <p className="text-sm font-normal text-red-600 mt-1">
                        {alerts?.length || 0} emission violation{(alerts?.length || 0) > 1 ? 's' : ''} detected
                      </p>
                    </div>
                  </>
                )}
              </CardTitle>
              <Badge variant="outline" className="text-sm px-4 py-2 bg-white">
                {selectedVehicle?.make} {selectedVehicle?.model}
              </Badge>
            </div>
          </CardHeader>
          {!isCompliant && alerts && alerts.length > 0 && (
            <CardContent>
              <div className="bg-white/80 rounded-lg p-4 border border-red-200">
                <p className="font-semibold text-red-700 mb-3 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Active Violations:
                </p>
                <ul className="space-y-2">
                  {alerts.map(alert => (
                    <li key={alert.id} className="flex items-center justify-between text-sm bg-red-50 p-2 rounded">
                      <span className="font-medium text-red-900">{alert.gasType}</span>
                      <span className="text-red-700">
                        {toNumber(alert.measuredValue)?.toFixed(1)} ppm
                        <span className="text-gray-600 mx-1">→</span>
                        Limit: {toNumber(alert.thresholdValue)?.toFixed(0)} ppm
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Real-Time Emission Gauges - Enhanced */}
        <Card className="mb-8 shadow-lg border-none bg-white/80 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Activity className="w-5 h-5 text-blue-600" />
              Real-Time Gas Levels
            </CardTitle>
            <CardDescription>Current emission readings from your vehicle sensors</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* CO2 Card */}
              <Card className={`hover:shadow-xl transition-all border-2 ${
                latestReading?.co2 && toNumber(latestReading.co2)! > thresholds.co2
                  ? "border-red-500 bg-red-50"
                  : "border-blue-200 bg-blue-50/50"
              }`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold text-gray-700">Carbon Dioxide (CO₂)</CardTitle>
                    <div className={`p-2 rounded-lg ${
                      latestReading?.co2 && toNumber(latestReading.co2)! > thresholds.co2
                        ? "bg-red-100"
                        : "bg-blue-100"
                    }`}>
                      <Wind className={`h-5 w-5 ${
                        latestReading?.co2 && toNumber(latestReading.co2)! > thresholds.co2
                          ? "text-red-600"
                          : "text-blue-600"
                      }`} />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className={`text-5xl font-bold mb-3 ${
                    latestReading?.co2 && toNumber(latestReading.co2)! > thresholds.co2
                      ? "text-red-600"
                      : "text-blue-600"
                  }`}>
                    {latestReading?.co2 ? toNumber(latestReading.co2)?.toFixed(1) : "—"}
                  </div>
                  <p className="text-xs text-gray-600 mb-3">ppm (parts per million)</p>
                  
                  {/* Progress Bar */}
                  {latestReading?.co2 && (
                    <div className="w-full bg-gray-200 rounded-full h-2.5 mb-3">
                      <div
                        className={`h-2.5 rounded-full transition-all ${
                          toNumber(latestReading.co2)! > thresholds.co2
                            ? "bg-red-600"
                            : toNumber(latestReading.co2)! > thresholds.co2 * 0.8
                            ? "bg-yellow-500"
                            : "bg-green-500"
                        }`}
                        style={{
                          width: `${Math.min((toNumber(latestReading.co2)! / thresholds.co2) * 100, 100)}%`
                        }}
                      />
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">Threshold:</span>
                    <span className="font-semibold">{thresholds.co2} ppm</span>
                  </div>
                  {latestReading?.co2 && toNumber(latestReading.co2)! > thresholds.co2 && (
                    <Badge variant="destructive" className="w-full mt-3 justify-center">
                      ⚠️ Exceeds Limit
                    </Badge>
                  )}
                  {latestReading?.co2 && toNumber(latestReading.co2)! <= thresholds.co2 && (
                    <Badge variant="outline" className="w-full mt-3 justify-center border-green-500 text-green-700">
                      ✓ Within Limit
                    </Badge>
                  )}
                </CardContent>
              </Card>

              {/* CO Card */}
              <Card className={`hover:shadow-xl transition-all border-2 ${
                latestReading?.co && toNumber(latestReading.co)! > thresholds.co
                  ? "border-red-500 bg-red-50"
                  : "border-amber-200 bg-amber-50/50"
              }`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold text-gray-700">Carbon Monoxide (CO)</CardTitle>
                    <div className={`p-2 rounded-lg ${
                      latestReading?.co && toNumber(latestReading.co)! > thresholds.co
                        ? "bg-red-100"
                        : "bg-amber-100"
                    }`}>
                      <Droplets className={`h-5 w-5 ${
                        latestReading?.co && toNumber(latestReading.co)! > thresholds.co
                          ? "text-red-600"
                          : "text-amber-600"
                      }`} />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className={`text-5xl font-bold mb-3 ${
                    latestReading?.co && toNumber(latestReading.co)! > thresholds.co
                      ? "text-red-600"
                      : "text-amber-600"
                  }`}>
                    {latestReading?.co ? toNumber(latestReading.co)?.toFixed(1) : "—"}
                  </div>
                  <p className="text-xs text-gray-600 mb-3">ppm (parts per million)</p>
                  
                  {/* Progress Bar */}
                  {latestReading?.co && (
                    <div className="w-full bg-gray-200 rounded-full h-2.5 mb-3">
                      <div
                        className={`h-2.5 rounded-full transition-all ${
                          toNumber(latestReading.co)! > thresholds.co
                            ? "bg-red-600"
                            : toNumber(latestReading.co)! > thresholds.co * 0.8
                            ? "bg-yellow-500"
                            : "bg-green-500"
                        }`}
                        style={{
                          width: `${Math.min((toNumber(latestReading.co)! / thresholds.co) * 100, 100)}%`
                        }}
                      />
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">Threshold:</span>
                    <span className="font-semibold">{thresholds.co} ppm</span>
                  </div>
                  {latestReading?.co && toNumber(latestReading.co)! > thresholds.co && (
                    <Badge variant="destructive" className="w-full mt-3 justify-center">
                      ⚠️ Exceeds Limit
                    </Badge>
                  )}
                  {latestReading?.co && toNumber(latestReading.co)! <= thresholds.co && (
                    <Badge variant="outline" className="w-full mt-3 justify-center border-green-500 text-green-700">
                      ✓ Within Limit
                    </Badge>
                  )}
                </CardContent>
              </Card>

              {/* NOx Card */}
              <Card className={`hover:shadow-xl transition-all border-2 ${
                latestReading?.nox && toNumber(latestReading.nox)! > thresholds.nox
                  ? "border-red-500 bg-red-50"
                  : "border-orange-200 bg-orange-50/50"
              }`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold text-gray-700">Nitrogen Oxides (NOx)</CardTitle>
                    <div className={`p-2 rounded-lg ${
                      latestReading?.nox && toNumber(latestReading.nox)! > thresholds.nox
                        ? "bg-red-100"
                        : "bg-orange-100"
                    }`}>
                      <Activity className={`h-5 w-5 ${
                        latestReading?.nox && toNumber(latestReading.nox)! > thresholds.nox
                          ? "text-red-600"
                          : "text-orange-600"
                      }`} />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className={`text-5xl font-bold mb-3 ${
                    latestReading?.nox && toNumber(latestReading.nox)! > thresholds.nox
                      ? "text-red-600"
                      : "text-orange-600"
                  }`}>
                    {latestReading?.nox ? toNumber(latestReading.nox)?.toFixed(1) : "—"}
                  </div>
                  <p className="text-xs text-gray-600 mb-3">ppm (parts per million)</p>
                  
                  {/* Progress Bar */}
                  {latestReading?.nox && (
                    <div className="w-full bg-gray-200 rounded-full h-2.5 mb-3">
                      <div
                        className={`h-2.5 rounded-full transition-all ${
                          toNumber(latestReading.nox)! > thresholds.nox
                            ? "bg-red-600"
                            : toNumber(latestReading.nox)! > thresholds.nox * 0.8
                            ? "bg-yellow-500"
                            : "bg-green-500"
                        }`}
                        style={{
                          width: `${Math.min((toNumber(latestReading.nox)! / thresholds.nox) * 100, 100)}%`
                        }}
                      />
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">Threshold:</span>
                    <span className="font-semibold">{thresholds.nox} ppm</span>
                  </div>
                  {latestReading?.nox && toNumber(latestReading.nox)! > thresholds.nox && (
                    <Badge variant="destructive" className="w-full mt-3 justify-center">
                      ⚠️ Exceeds Limit
                    </Badge>
                  )}
                  {latestReading?.nox && toNumber(latestReading.nox)! <= thresholds.nox && (
                    <Badge variant="outline" className="w-full mt-3 justify-center border-green-500 text-green-700">
                      ✓ Within Limit
                    </Badge>
                  )}
                </CardContent>
              </Card>

              {/* PM Card */}
              <Card className={`hover:shadow-xl transition-all border-2 ${
                latestReading?.pmLevel && toNumber(latestReading.pmLevel)! > thresholds.pmLevel
                  ? "border-red-500 bg-red-50"
                  : "border-gray-200 bg-gray-50/50"
              }`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold text-gray-700">Particulate Matter (PM)</CardTitle>
                    <div className={`p-2 rounded-lg ${
                      latestReading?.pmLevel && toNumber(latestReading.pmLevel)! > thresholds.pmLevel
                        ? "bg-red-100"
                        : "bg-gray-100"
                    }`}>
                      <Gauge className={`h-5 w-5 ${
                        latestReading?.pmLevel && toNumber(latestReading.pmLevel)! > thresholds.pmLevel
                          ? "text-red-600"
                          : "text-gray-600"
                      }`} />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className={`text-5xl font-bold mb-3 ${
                    latestReading?.pmLevel && toNumber(latestReading.pmLevel)! > thresholds.pmLevel
                      ? "text-red-600"
                      : "text-gray-600"
                  }`}>
                    {latestReading?.pmLevel ? toNumber(latestReading.pmLevel)?.toFixed(1) : "—"}
                  </div>
                  <p className="text-xs text-gray-600 mb-3">µg/m³ (microgram per cubic meter)</p>
                  
                  {/* Progress Bar */}
                  {latestReading?.pmLevel && (
                    <div className="w-full bg-gray-200 rounded-full h-2.5 mb-3">
                      <div
                        className={`h-2.5 rounded-full transition-all ${
                          toNumber(latestReading.pmLevel)! > thresholds.pmLevel
                            ? "bg-red-600"
                            : toNumber(latestReading.pmLevel)! > thresholds.pmLevel * 0.8
                            ? "bg-yellow-500"
                            : "bg-green-500"
                        }`}
                        style={{
                          width: `${Math.min((toNumber(latestReading.pmLevel)! / thresholds.pmLevel) * 100, 100)}%`
                        }}
                      />
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">Threshold:</span>
                    <span className="font-semibold">{thresholds.pmLevel} µg/m³</span>
                  </div>
                  {latestReading?.pmLevel && toNumber(latestReading.pmLevel)! > thresholds.pmLevel && (
                    <Badge variant="destructive" className="w-full mt-3 justify-center">
                      ⚠️ Exceeds Limit
                    </Badge>
                  )}
                  {latestReading?.pmLevel && toNumber(latestReading.pmLevel)! <= thresholds.pmLevel && (
                    <Badge variant="outline" className="w-full mt-3 justify-center border-green-500 text-green-700">
                      ✓ Within Limit
                    </Badge>
                  )}
                </CardContent>
              </Card>
            </div>
            
            {/* Last Updated Timestamp */}
            {latestReading && (
              <div className="mt-6 pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-500 text-center">
                  Last updated: {new Date(latestReading.timestamp).toLocaleString()}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Enhanced Emission History Chart */}
        <Card className="mb-8 shadow-lg border-none bg-white/80 backdrop-blur">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                  Live Emission Plotting
                </CardTitle>
                <CardDescription className="mt-2">
                  Real-time emission data visualization (Last 2 hours)
                </CardDescription>
              </div>
              <Badge variant="outline" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Last 24h
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <Badge variant="outline" className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${isLivePlotting ? "bg-green-500 animate-pulse" : "bg-gray-400"}`} />
                    {isLivePlotting ? "Live Plotting Active" : "Live Plotting Paused"}
                  </Badge>
                  <p className="text-xs text-gray-500">
                    {isLivePlotting 
                      ? "New data points added every 3 seconds" 
                      : "Click 'Live Plotting ON' to start"}
                  </p>
                </div>
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart 
                    data={chartData}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <defs>
                      <linearGradient id="colorCO2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorCO" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorNOx" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorPM" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6b7280" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#6b7280" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="time" 
                      stroke="#6b7280" 
                      style={{ fontSize: '11px' }}
                      interval="preserveStartEnd"
                      tick={{ fill: '#6b7280' }}
                    />
                    <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                      animationDuration={200}
                    />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="CO2" 
                      stroke="#3b82f6" 
                      strokeWidth={2.5}
                      fillOpacity={0.6} 
                      fill="url(#colorCO2)" 
                      dot={false}
                      activeDot={{ r: 5, fill: '#3b82f6' }}
                      animationDuration={300}
                      isAnimationActive={true}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="CO" 
                      stroke="#f59e0b" 
                      strokeWidth={2.5}
                      fillOpacity={0.6} 
                      fill="url(#colorCO)" 
                      dot={false}
                      activeDot={{ r: 5, fill: '#f59e0b' }}
                      animationDuration={300}
                      isAnimationActive={true}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="NOx" 
                      stroke="#f97316" 
                      strokeWidth={2.5}
                      fillOpacity={0.6} 
                      fill="url(#colorNOx)" 
                      dot={false}
                      activeDot={{ r: 5, fill: '#f97316' }}
                      animationDuration={300}
                      isAnimationActive={true}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="PM" 
                      stroke="#6b7280" 
                      strokeWidth={2.5}
                      fillOpacity={0.6} 
                      fill="url(#colorPM)" 
                      dot={false}
                      activeDot={{ r: 5, fill: '#6b7280' }}
                      animationDuration={300}
                      isAnimationActive={true}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-gray-500">
                <Activity className="h-16 w-16 mb-4 opacity-20" />
                <p className="text-lg font-medium">No emission data available</p>
                <p className="text-sm">Data will appear once your IoT sensors start reporting</p>
                {vehicleId && (
                  <Button 
                    onClick={() => generateMockMutation.mutate({ vehicleId })}
                    className="mt-4"
                    variant="outline"
                    disabled={generateMockMutation.isPending}
                  >
                    {generateMockMutation.isPending ? "Generating..." : "Generate Sample Data"}
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Digital PUC Certificate */}
        <Card className="shadow-lg border-none bg-gradient-to-r from-green-50 to-blue-50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <FileCheck className="w-5 h-5 text-green-600" />
                  Digital PUC Certificate
                </CardTitle>
                <CardDescription className="mt-2">
                  Download your vehicle's pollution under control certificate
                </CardDescription>
              </div>
              {isCompliant && (
                <Badge className="bg-green-600">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Available
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isCompliant ? (
              <div className="flex items-center justify-between bg-white p-6 rounded-lg border border-green-200">
                <div>
                  <p className="font-semibold text-gray-900 mb-1">Certificate Ready for Download</p>
                  <p className="text-sm text-gray-600">
                    Valid for: {selectedVehicle?.make} {selectedVehicle?.model} • Device: {selectedVehicle?.deviceId}
                  </p>
                </div>
                <Button 
                  className="bg-green-600 hover:bg-green-700 shadow-lg"
                  onClick={handleDownloadCertificate}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Certificate
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-4 bg-amber-50 p-6 rounded-lg border border-amber-200">
                <AlertTriangle className="h-12 w-12 text-amber-600 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-amber-900 mb-1">Certificate Not Available</p>
                  <p className="text-sm text-amber-700">
                    Your vehicle currently has {alerts?.length || 0} emission violation{(alerts?.length || 0) > 1 ? 's' : ''}. 
                    Resolve the issues to download your PUC certificate.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
