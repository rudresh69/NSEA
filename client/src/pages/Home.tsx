import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Activity, AlertCircle, Leaf, TrendingUp, Gauge, Shield, FileCheck, MapPin, Bell, BarChart3, Users, Zap, LogIn, UserPlus, Car, AlertTriangle, Database, LogOut } from "lucide-react";
import { APP_LOGO, APP_TITLE } from "@/const";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useEffect } from "react";

/**
 * Enhanced Home page - Professional emission monitoring dashboard
 */
export default function Home() {
  const { user, loading, logout } = useAuth();
  const [, setLocation] = useLocation();
  
  // Fetch admin stats if user is admin
  const { data: adminStats, isLoading: statsLoading, error: statsError, refetch: refetchStats } = trpc.admin.stats.useQuery(undefined, {
    enabled: !!user && user.role === "admin",
    retry: 1,
    refetchOnWindowFocus: false,
  });

  // Debug logging for admin stats
  useEffect(() => {
    console.log("[Home] User state:", { 
      user: user ? { id: user.id, email: user.email, role: user.role, name: user.name } : null,
      loading,
      isAdmin: user?.role === "admin"
    });
    if (user?.role === "admin") {
      console.log("[Home] Admin user detected, fetching stats");
      console.log("[Home] Stats loading:", statsLoading);
      console.log("[Home] Stats error:", statsError);
      console.log("[Home] Stats data:", adminStats);
    } else if (user) {
      console.log("[Home] User is not admin, role:", user.role);
    } else {
      console.log("[Home] No user logged in");
    }
  }, [user, loading, statsLoading, statsError, adminStats]);


  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Logged out successfully");
      setLocation("/");
    } catch (error) {
      toast.error("Failed to log out");
      console.error("Logout error:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-green-50 to-blue-50">
        <div className="text-center">
          <Loader2 className="animate-spin w-12 h-12 text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-green-50 to-blue-50">
      {/* Enhanced Header */}
      <header className="bg-white/80 backdrop-blur-lg shadow-lg border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {APP_LOGO && (
                <div className="p-2 bg-gradient-to-br from-blue-600 to-green-600 rounded-xl shadow-md">
                  <Gauge className="h-6 w-6 text-white" />
                </div>
              )}
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
                  {APP_TITLE}
                </h1>
                <p className="text-xs text-gray-600">Real-Time Emission Monitoring System</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {user ? (
                <div className="flex items-center gap-3">
                  <div className="text-right hidden sm:block">
                    <p className="text-sm font-semibold text-gray-900">{user.name || "User"}</p>
                    <Badge variant={user.role === "admin" ? "default" : "secondary"} className="text-xs">
                      {user.role === "admin" ? "Administrator" : "User"}
                    </Badge>
                  </div>
                  <Link href="/dashboard">
                    <Button variant="outline" className="gap-2">
                      <Activity className="h-4 w-4" />
                      Dashboard
                    </Button>
                  </Link>
                  <Button 
                    variant="outline" 
                    className="gap-2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                    onClick={handleLogout}
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Link href="/login">
                    <Button variant="outline" className="gap-2">
                      <LogIn className="h-4 w-4" />
                      Login
                    </Button>
                  </Link>
                  <Link href="/register">
                    <Button className="bg-blue-600 hover:bg-blue-700 gap-2">
                      <UserPlus className="h-4 w-4" />
                      Sign Up
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section with Stats */}
      <div className="bg-gradient-to-r from-blue-600 via-blue-500 to-green-600 text-white">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="text-center mb-8">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Smart Emission Monitoring</h2>
            <p className="text-xl text-blue-100 max-w-3xl mx-auto">
              Track, analyze, and optimize vehicle emissions in real-time with AI-powered insights
            </p>
          </div>
          
          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 text-center">
              <Gauge className="h-8 w-8 mx-auto mb-2" />
              <p className="text-2xl font-bold">Real-Time</p>
              <p className="text-sm text-blue-100">Monitoring</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 text-center">
              <Shield className="h-8 w-8 mx-auto mb-2" />
              <p className="text-2xl font-bold">CPCB</p>
              <p className="text-sm text-blue-100">Compliant</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 text-center">
              <Bell className="h-8 w-8 mx-auto mb-2" />
              <p className="text-2xl font-bold">Instant</p>
              <p className="text-sm text-blue-100">Alerts</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 text-center">
              <FileCheck className="h-8 w-8 mx-auto mb-2" />
              <p className="text-2xl font-bold">Digital</p>
              <p className="text-sm text-blue-100">PUC</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Dashboard Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Primary Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Vehicle Dashboard Card */}
          <Link href="/dashboard">
            <Card className="hover:shadow-2xl transition-all duration-300 cursor-pointer border-2 hover:border-blue-500 group h-full">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="p-3 bg-blue-100 rounded-xl group-hover:bg-blue-600 transition-colors">
                    <Activity className="w-6 h-6 text-blue-600 group-hover:text-white" />
                  </div>
                  <Badge variant="outline" className="bg-blue-50">Active</Badge>
                </div>
                <CardTitle className="mt-4 text-xl">Vehicle Dashboard</CardTitle>
                <CardDescription>Real-time emission monitoring & analytics</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
                    Live emission readings (CO₂, CO, NOx, PM)
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
                    24-hour historical trends
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
                    Compliance status tracking
                  </li>
                </ul>
                <Button className="w-full mt-4 bg-blue-600 hover:bg-blue-700 group-hover:shadow-lg transition-all">
                  Open Dashboard →
                </Button>
              </CardContent>
            </Card>
          </Link>

          {/* Vehicle Management Card */}
          <Link href="/my-vehicles">
            <Card className="hover:shadow-2xl transition-all duration-300 cursor-pointer border-2 hover:border-green-500 group h-full">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="p-3 bg-green-100 rounded-xl group-hover:bg-green-600 transition-colors">
                    <Leaf className="w-6 h-6 text-green-600 group-hover:text-white" />
                  </div>
                  <Badge variant="outline" className="bg-green-50">Manage</Badge>
                </div>
                <CardTitle className="mt-4 text-xl">Fleet Management</CardTitle>
                <CardDescription>Register and manage your vehicles</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-green-600 rounded-full"></div>
                    Add new vehicles with IoT devices
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-green-600 rounded-full"></div>
                    Update vehicle information
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-green-600 rounded-full"></div>
                    Manage device assignments
                  </li>
                </ul>
                <Button variant="outline" className="w-full mt-4 group-hover:bg-green-50 group-hover:border-green-600 transition-all">
                  Manage Fleet →
                </Button>
              </CardContent>
            </Card>
          </Link>

          {/* Admin Dashboard Card */}
          <Card className="hover:shadow-2xl transition-all duration-300 cursor-pointer border-2 hover:border-amber-500 group h-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="p-3 bg-amber-100 rounded-xl group-hover:bg-amber-600 transition-colors">
                  <Users className="w-6 h-6 text-amber-600 group-hover:text-white" />
                </div>
                <Badge variant="outline" className="bg-amber-50">Admin</Badge>
              </div>
              <CardTitle className="mt-4 text-xl">Admin Overview</CardTitle>
              <CardDescription>Monitor all vehicles & compliance</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Debug info - remove in production */}
              {process.env.NODE_ENV === "development" && (
                <div className="mb-2 p-2 bg-gray-100 rounded text-xs">
                  Debug: user={user ? "logged in" : "not logged in"}, 
                  role={user?.role || "none"}, 
                  isAdmin={String(user?.role === "admin")},
                  statsLoading={String(statsLoading)},
                  hasStats={String(!!adminStats)},
                  hasError={String(!!statsError)}
                </div>
              )}
              {user?.role === "admin" ? (
                statsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="animate-spin w-6 h-6 text-amber-600" />
                  </div>
                ) : statsError ? (
                  <div className="text-center py-4 space-y-2">
                    <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
                    <p className="text-sm font-medium text-red-600">Failed to load statistics</p>
                    <p className="text-xs text-gray-500">
                      {statsError instanceof Error ? statsError.message : "An error occurred"}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => refetchStats()}
                      className="mt-2"
                    >
                      Retry
                    </Button>
                  </div>
                ) : adminStats ? (
                  <div className="space-y-4">
                    {/* Quick Stats Grid */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
                        <div className="flex items-center gap-2 mb-1">
                          <Users className="w-4 h-4 text-amber-600" />
                          <span className="text-xs font-medium text-gray-600">Users</span>
                        </div>
                        <p className="text-2xl font-bold text-amber-600">{adminStats.totalUsers}</p>
                      </div>
                      <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
                        <div className="flex items-center gap-2 mb-1">
                          <Car className="w-4 h-4 text-amber-600" />
                          <span className="text-xs font-medium text-gray-600">Vehicles</span>
                        </div>
                        <p className="text-2xl font-bold text-amber-600">{adminStats.totalVehicles}</p>
                      </div>
                      <div className="bg-red-50 rounded-lg p-3 border border-red-200">
                        <div className="flex items-center gap-2 mb-1">
                          <AlertTriangle className="w-4 h-4 text-red-600" />
                          <span className="text-xs font-medium text-gray-600">Alerts</span>
                        </div>
                        <p className="text-2xl font-bold text-red-600">{adminStats.activeAlerts}</p>
                      </div>
                      <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                        <div className="flex items-center gap-2 mb-1">
                          <Database className="w-4 h-4 text-green-600" />
                          <span className="text-xs font-medium text-gray-600">Readings</span>
                        </div>
                        <p className="text-2xl font-bold text-green-600">{adminStats.totalReadings}</p>
                      </div>
                    </div>
                    
                    {/* Compliance Rate */}
                    <div className="bg-gradient-to-r from-amber-50 to-green-50 rounded-lg p-3 border border-amber-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium text-gray-600 mb-1">Compliance Rate</p>
                          <p className="text-xl font-bold text-green-600">
                            {adminStats.totalVehicles > 0 
                              ? ((adminStats.totalVehicles - adminStats.activeAlerts) / adminStats.totalVehicles * 100).toFixed(1)
                              : "100.0"}%
                          </p>
                        </div>
                        <TrendingUp className="w-8 h-8 text-green-600 opacity-50" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 text-sm text-gray-500">
                    Unable to load statistics
                  </div>
                )
              ) : (
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-amber-600 rounded-full"></div>
                    Global emission statistics
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-amber-600 rounded-full"></div>
                    Active violation alerts
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-amber-600 rounded-full"></div>
                    Compliance enforcement
                  </li>
                </ul>
              )}
              <Button 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log("[Home] Admin Overview button clicked");
                  console.log("[Home] Current user:", user);
                  console.log("[Home] User role:", user?.role);
                  console.log("[Home] Navigating to /admin/overview");
                  setLocation("/admin/overview");
                }}
                className="w-full mt-4 bg-amber-600 hover:bg-amber-700 group-hover:shadow-lg transition-all"
              >
                {user?.role === "admin" ? "View Full Dashboard →" : "View Analytics →"}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Feature Highlights */}
        <div className="mb-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">Platform Features</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="text-center hover:shadow-lg transition-all">
              <CardHeader>
                <Gauge className="h-12 w-12 mx-auto text-blue-600 mb-2" />
                <CardTitle className="text-lg">Real-Time Monitoring</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-gray-600">
                Continuous tracking of CO₂, CO, NOx, and PM levels with instant updates
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-lg transition-all">
              <CardHeader>
                <Shield className="h-12 w-12 mx-auto text-green-600 mb-2" />
                <CardTitle className="text-lg">Compliance Tracking</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-gray-600">
                Automated compliance monitoring against CPCB and WHO standards
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-lg transition-all">
              <CardHeader>
                <FileCheck className="h-12 w-12 mx-auto text-purple-600 mb-2" />
                <CardTitle className="text-lg">Digital PUC</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-gray-600">
                Generate and download daily digital pollution certificates
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-lg transition-all">
              <CardHeader>
                <BarChart3 className="h-12 w-12 mx-auto text-orange-600 mb-2" />
                <CardTitle className="text-lg">Analytics & Insights</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-gray-600">
                Historical data analysis and trend prediction for optimization
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Technology Stack */}
        <Card className="bg-gradient-to-r from-gray-50 to-blue-50 border-none shadow-lg">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Zap className="h-6 w-6 text-blue-600" />
              <CardTitle className="text-xl">Powered by Advanced Technology</CardTitle>
            </div>
            <CardDescription>Enterprise-grade emission monitoring infrastructure</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div className="p-4 bg-white rounded-lg shadow-sm">
                <p className="font-semibold text-gray-900">IoT Sensors</p>
                <p className="text-xs text-gray-600 mt-1">Real-time data</p>
              </div>
              <div className="p-4 bg-white rounded-lg shadow-sm">
                <p className="font-semibold text-gray-900">Cloud Platform</p>
                <p className="text-xs text-gray-600 mt-1">Scalable infrastructure</p>
              </div>
              <div className="p-4 bg-white rounded-lg shadow-sm">
                <p className="font-semibold text-gray-900">AI Analytics</p>
                <p className="text-xs text-gray-600 mt-1">Predictive insights</p>
              </div>
              <div className="p-4 bg-white rounded-lg shadow-sm">
                <p className="font-semibold text-gray-900">Mobile Apps</p>
                <p className="text-xs text-gray-600 mt-1">On-the-go access</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 mt-16">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h4 className="text-white font-semibold mb-4 flex items-center gap-2">
                <Gauge className="h-5 w-5" />
                {APP_TITLE}
              </h4>
              <p className="text-sm text-gray-400">
                Advanced emission monitoring system for cleaner environment and regulatory compliance.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/dashboard" className="hover:text-white transition">Dashboard</Link></li>
                <li><Link href="/my-vehicles" className="hover:text-white transition">My Vehicles</Link></li>
                <li><Link href="/admin/overview" className="hover:text-white transition">Admin Panel</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Contact</h4>
              <p className="text-sm text-gray-400">
                For support and inquiries:<br />
                support@emissions.local<br />
                Available 24/7
              </p>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-6 text-center text-sm text-gray-500">
            © {new Date().getFullYear()} {APP_TITLE}. All rights reserved. | Committed to a cleaner future.
          </div>
        </div>
      </footer>
    </div>
  );
}
