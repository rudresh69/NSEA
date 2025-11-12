import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Loader2, 
  AlertTriangle, 
  TrendingUp, 
  Users, 
  Car, 
  Activity,
  Database,
  Shield,
  Clock,
  CheckCircle2,
  XCircle,
  BarChart3
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell } from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

/**
 * Admin Dashboard - Comprehensive overview of system statistics and monitoring
 */
export default function AdminDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [location, setLocation] = useLocation();

  // Debug logging
  useEffect(() => {
    console.log("[AdminDashboard] Route loaded:", location);
    console.log("[AdminDashboard] User:", user);
    console.log("[AdminDashboard] Auth loading:", authLoading);
    console.log("[AdminDashboard] User role:", user?.role);
  }, [location, user, authLoading]);

  // Check if user is admin
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        console.log("[AdminDashboard] No user, redirecting to login");
        setLocation("/login");
        return;
      }
      if (user.role !== "admin") {
        console.log("[AdminDashboard] User is not admin, redirecting to home");
        setLocation("/");
        return;
      }
      console.log("[AdminDashboard] User is admin, rendering dashboard");
    }
  }, [authLoading, user, setLocation]);

  // Fetch admin data
  const { data: stats, isLoading: statsLoading } = trpc.admin.stats.useQuery(undefined, {
    enabled: !!user && user.role === "admin",
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const { data: allUsers = [] } = trpc.admin.users.useQuery(undefined, {
    enabled: !!user && user.role === "admin",
  });

  const { data: allVehicles = [] } = trpc.admin.allVehicles.useQuery(undefined, {
    enabled: !!user && user.role === "admin",
  });

  const { data: alerts = [], refetch: refetchAlerts } = trpc.alerts.active.useQuery(undefined, {
    enabled: !!user && user.role === "admin",
    refetchInterval: 10000, // Auto-refresh every 10s
  });

  const { data: recentReadings = [], refetch: refetchRecentReadings } = trpc.admin.recentReadings.useQuery(
    { limit: 20 },
    { enabled: !!user && user.role === "admin", refetchInterval: 10000 } // Auto-refresh every 10s
  );

  // Mock data generation
  const generateMockMutation = trpc.emissions.generateMock.useMutation({
    onSuccess: () => {
      toast.success("Mock data generated successfully!");
      refetchRecentReadings();
      refetchAlerts();
    },
    onError: (error) => {
      toast.error(`Failed to generate mock data: ${error.message}`);
    },
  });

  const populateHistoryMutation = trpc.emissions.populateHistory.useMutation({
    onSuccess: () => {
      toast.success("Historical data populated successfully!");
      refetchRecentReadings();
    },
    onError: (error) => {
      toast.error(`Failed to populate history: ${error.message}`);
    },
  });

  // Show loading state
  if (authLoading || statsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin w-8 h-8 text-blue-600" />
      </div>
    );
  }

  // Show loading while checking auth
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin w-8 h-8 text-blue-600" />
      </div>
    );
  }

  // Show message if not admin (while redirecting)
  if (user.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Access denied. Redirecting...</p>
        </div>
      </div>
    );
  }

  // Calculate derived statistics
  const complianceRate = stats && stats.totalVehicles > 0 
    ? ((stats.totalVehicles - stats.activeAlerts) / stats.totalVehicles * 100).toFixed(1) 
    : "100.0";
  
  const regularUsers = allUsers.filter(u => u.role === "user").length;
  const adminUsers = allUsers.filter(u => u.role === "admin").length;

  // Prepare chart data
  const gasTypeDistribution = useMemo(() => {
    const distribution: Record<string, number> = {};
    alerts.forEach(alert => {
      distribution[alert.gasType] = (distribution[alert.gasType] || 0) + 1;
    });
    return Object.entries(distribution).map(([name, value]) => ({ name, value }));
  }, [alerts]);

  const recentActivityData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return {
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        readings: 0,
        alerts: 0,
      };
    });

    recentReadings.forEach(reading => {
      const readingDate = new Date(reading.timestamp);
      const dayIndex = Math.floor((Date.now() - readingDate.getTime()) / (1000 * 60 * 60 * 24));
      if (dayIndex >= 0 && dayIndex < 7) {
        last7Days[6 - dayIndex].readings++;
      }
    });

    alerts.forEach(alert => {
      const alertDate = new Date(alert.timestamp);
      const dayIndex = Math.floor((Date.now() - alertDate.getTime()) / (1000 * 60 * 60 * 24));
      if (dayIndex >= 0 && dayIndex < 7) {
        last7Days[6 - dayIndex].alerts++;
      }
    });

    return last7Days;
  }, [recentReadings, alerts]);

  const chartConfig = {
    readings: {
      label: "Readings",
      color: "hsl(var(--chart-1))",
    },
    alerts: {
      label: "Alerts",
      color: "hsl(var(--chart-2))",
    },
  };

  const COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#8b5cf6'];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Admin Overview</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                System-wide monitoring and statistics dashboard
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => generateMockMutation.mutate({ generateForAll: true })}
                variant="outline"
                size="sm"
                disabled={generateMockMutation.isPending}
              >
                <Activity className="w-4 h-4 mr-2" />
                {generateMockMutation.isPending ? "Generating..." : "Generate Mock Data"}
              </Button>
              <Button
                onClick={() => populateHistoryMutation.mutate({ hoursBack: 24, intervalMinutes: 5 })}
                variant="outline"
                size="sm"
                disabled={populateHistoryMutation.isPending}
              >
                <Database className="w-4 h-4 mr-2" />
                {populateHistoryMutation.isPending ? "Populating..." : "Populate History"}
              </Button>
              <Badge variant="outline" className="text-sm">
                <Shield className="w-4 h-4 mr-2" />
                Administrator
              </Badge>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Key Statistics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                Total Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{stats?.totalUsers || 0}</div>
              <div className="flex items-center gap-2 mt-2 text-xs text-gray-600 dark:text-gray-400">
                <span>{regularUsers} regular</span>
                <span>•</span>
                <span>{adminUsers} admin</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Car className="w-4 h-4 text-green-600" />
                Total Vehicles
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{stats?.totalVehicles || 0}</div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Registered vehicles</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                Active Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">{stats?.activeAlerts || 0}</div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                {stats?.totalAlerts || 0} total alerts
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-purple-600" />
                Compliance Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600">{complianceRate}%</div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Vehicles compliant</p>
            </CardContent>
          </Card>
        </div>

        {/* Secondary Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Database className="w-4 h-4 text-indigo-600" />
                Total Readings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-indigo-600">{stats?.totalReadings || 0}</div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                {stats?.recentReadings || 0} in last 24h
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Activity className="w-4 h-4 text-amber-600" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">{stats?.recentReadings || 0}</div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Readings (24h)</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Shield className="w-4 h-4 text-cyan-600" />
                Admin Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-cyan-600">{stats?.adminUsers || 0}</div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Administrators</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Activity Chart */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    7-Day Activity Overview
                  </CardTitle>
                  <CardDescription>Readings and alerts over the past week</CardDescription>
                </div>
                <Badge variant="outline" className="flex items-center gap-2">
                  <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                  Live
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig}>
                <BarChart data={recentActivityData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="readings" fill="var(--color-readings)" />
                  <Bar dataKey="alerts" fill="var(--color-alerts)" />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Gas Type Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                Alert Distribution by Gas Type
              </CardTitle>
              <CardDescription>Breakdown of active alerts</CardDescription>
            </CardHeader>
            <CardContent>
              {gasTypeDistribution.length > 0 ? (
                <ChartContainer config={chartConfig}>
                  <PieChart>
                    <Pie
                      data={gasTypeDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {gasTypeDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <ChartTooltip />
                  </PieChart>
                </ChartContainer>
              ) : (
                <div className="flex items-center justify-center h-64 text-gray-500">
                  No active alerts to display
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Alerts Table */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              Active Emission Alerts
            </CardTitle>
            <CardDescription>
              Real-time list of vehicles exceeding emission limits
            </CardDescription>
          </CardHeader>
          <CardContent>
            {alerts && Array.isArray(alerts) && alerts.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vehicle ID</TableHead>
                      <TableHead>Gas Type</TableHead>
                      <TableHead>Recorded Value</TableHead>
                      <TableHead>Limit</TableHead>
                      <TableHead>Excess</TableHead>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {alerts.slice(0, 10).map((alert) => {
                      const excess = ((alert.measuredValue - alert.thresholdValue) / alert.thresholdValue * 100).toFixed(1);
                      return (
                        <TableRow key={alert.id}>
                          <TableCell className="font-medium">{alert.vehicleId}</TableCell>
                          <TableCell>
                            <Badge variant="destructive" className="text-xs">
                              {alert.gasType}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-semibold text-red-600">
                            {alert.measuredValue.toFixed(2)} ppm
                          </TableCell>
                          <TableCell>{alert.thresholdValue} ppm</TableCell>
                          <TableCell className="text-red-600 font-semibold">
                            +{excess}%
                          </TableCell>
                          <TableCell className="text-xs text-gray-600 dark:text-gray-400">
                            {new Date(alert.timestamp).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            {alert.isActive ? (
                              <Badge variant="destructive" className="text-xs">
                                <XCircle className="w-3 h-3 mr-1" />
                                Active
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Resolved
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12">
                <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">
                  ✓ All vehicles are compliant. No active alerts.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Users and Vehicles Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Users */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Recent Users
              </CardTitle>
              <CardDescription>Latest registered users</CardDescription>
            </CardHeader>
            <CardContent>
              {allUsers.length > 0 ? (
                <div className="space-y-3">
                  {allUsers.slice(0, 5).map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{user.name || "No name"}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">{user.email}</p>
                      </div>
                      <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                        {user.role}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600 dark:text-gray-400 text-center py-8">
                  No users registered yet
                </p>
              )}
            </CardContent>
          </Card>

          {/* Recent Vehicles */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Car className="w-5 h-5" />
                Recent Vehicles
              </CardTitle>
              <CardDescription>Latest registered vehicles</CardDescription>
            </CardHeader>
            <CardContent>
              {allVehicles.length > 0 ? (
                <div className="space-y-3">
                  {allVehicles.slice(0, 5).map((vehicle) => {
                    const vehicleAlerts = alerts.filter(a => a.vehicleId === vehicle.id);
                    const isCompliant = vehicleAlerts.length === 0;
                    return (
                      <div key={vehicle.id} className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="flex-1">
                          <p className="font-medium text-sm">
                            {vehicle.make} {vehicle.model}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            {vehicle.fuelType} • Device: {vehicle.deviceId}
                          </p>
                        </div>
                        <Badge variant={isCompliant ? "outline" : "destructive"}>
                          {isCompliant ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Compliant
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3 mr-1" />
                              {vehicleAlerts.length} alert{vehicleAlerts.length !== 1 ? 's' : ''}
                            </>
                          )}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-gray-600 dark:text-gray-400 text-center py-8">
                  No vehicles registered yet
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
