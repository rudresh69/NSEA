import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Loader2, Monitor, Smartphone, Tablet, Trash2, Shield, Clock, Globe, LogOut } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";

// Helper function to detect device type from user agent
function getDeviceType(userAgent: string | null): { type: string; icon: React.ReactNode } {
  if (!userAgent) {
    return { type: "Unknown", icon: <Monitor className="h-4 w-4" /> };
  }
  
  const ua = userAgent.toLowerCase();
  if (ua.includes("mobile") || ua.includes("android") || ua.includes("iphone")) {
    return { type: "Mobile", icon: <Smartphone className="h-4 w-4" /> };
  }
  if (ua.includes("tablet") || ua.includes("ipad")) {
    return { type: "Tablet", icon: <Tablet className="h-4 w-4" /> };
  }
  return { type: "Desktop", icon: <Monitor className="h-4 w-4" /> };
}

// Helper function to format date
function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleString();
}

// Helper function to format relative time
function formatRelativeTime(date: Date | string): string {
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} day${days > 1 ? "s" : ""} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
  return "Just now";
}

export default function Sessions() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const { data: sessions = [], isLoading } = trpc.sessions.list.useQuery();
  const { data: loginHistory = [] } = trpc.loginHistory.list.useQuery({ limit: 20 });

  const revokeSession = trpc.sessions.revoke.useMutation({
    onSuccess: () => {
      toast.success("Session revoked successfully");
      utils.sessions.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to revoke session");
    },
  });

  const revokeAllSessions = trpc.sessions.revokeAll.useMutation({
    onSuccess: () => {
      toast.success("All other sessions revoked successfully");
      utils.sessions.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to revoke sessions");
    },
  });

  const handleRevokeSession = async (sessionId: string) => {
    try {
      await revokeSession.mutateAsync({ sessionId });
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleRevokeAllSessions = async () => {
    try {
      await revokeAllSessions.mutateAsync();
    } catch (error) {
      // Error handled by mutation
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="container mx-auto py-8 max-w-6xl">
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="animate-spin w-8 h-8" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Session Management</h1>
        <p className="text-muted-foreground mt-2">Manage your active sessions and view login history</p>
      </div>

      <div className="grid gap-6">
        {/* Active Sessions */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Active Sessions
                </CardTitle>
                <CardDescription>Manage your active sessions across different devices</CardDescription>
              </div>
              {sessions.length > 1 && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <LogOut className="h-4 w-4 mr-2" />
                      Revoke All Others
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Revoke All Other Sessions?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will revoke all other active sessions. You will remain logged in on this device.
                        Are you sure you want to continue?
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleRevokeAllSessions}
                        disabled={revokeAllSessions.isPending}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {revokeAllSessions.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Revoking...
                          </>
                        ) : (
                          "Revoke All"
                        )}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {sessions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No active sessions</p>
              </div>
            ) : (
              <div className="space-y-4">
                {sessions.map((session, index) => {
                  const deviceType = getDeviceType(session.userAgent);
                  // Mark the first session (most recently accessed) as current session
                  const isCurrentSession = index === 0;
                  
                  return (
                    <div
                      key={session.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          {deviceType.icon}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold">{deviceType.type}</p>
                            {isCurrentSession && (
                              <Badge variant="default" className="text-xs">
                                Current Session
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {session.userAgent || "Unknown device"}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Globe className="h-3 w-3" />
                              {session.ipAddress || "Unknown IP"}
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Last accessed: {formatRelativeTime(session.lastAccessedAt)}
                            </div>
                          </div>
                        </div>
                      </div>
                      {!isCurrentSession && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Revoke Session?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will revoke the session on {deviceType.type}. The user will need to log in again.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleRevokeSession(session.id)}
                                disabled={revokeSession.isPending}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                {revokeSession.isPending ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Revoking...
                                  </>
                                ) : (
                                  "Revoke"
                                )}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Login History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Login History
            </CardTitle>
            <CardDescription>Recent login attempts and activities</CardDescription>
          </CardHeader>
          <CardContent>
            {loginHistory.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No login history available</p>
              </div>
            ) : (
              <div className="space-y-4">
                {loginHistory.map((history) => {
                  const deviceType = getDeviceType(history.userAgent);
                  const isSuccess = history.loginStatus === "success";
                  
                  return (
                    <div
                      key={history.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div className={`p-2 rounded-lg ${isSuccess ? "bg-green-100" : "bg-red-100"}`}>
                          {deviceType.icon}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold">{deviceType.type}</p>
                            <Badge variant={isSuccess ? "default" : "destructive"}>
                              {history.loginStatus}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {history.userAgent || "Unknown device"}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Globe className="h-3 w-3" />
                              {history.ipAddress || "Unknown IP"}
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDate(history.createdAt)}
                            </div>
                          </div>
                          {history.failureReason && (
                            <p className="text-xs text-red-600 mt-1">
                              Reason: {history.failureReason}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      </div>
    </DashboardLayout>
  );
}

