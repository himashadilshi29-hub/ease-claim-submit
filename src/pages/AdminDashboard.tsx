import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Eye, Search, Download, Filter, User, RefreshCw, 
  Brain, Shield, FileText, CheckCircle, XCircle, Clock,
  AlertTriangle, TrendingUp, Activity, LogIn, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/shared/Navbar";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface Claim {
  id: string;
  reference_number: string;
  claim_type: string;
  claim_amount: number;
  approved_amount: number | null;
  status: string;
  processing_status: string;
  risk_score: number | null;
  risk_level: string | null;
  fraud_status: string | null;
  fraud_flags: number | null;
  ocr_confidence: number | null;
  ocr_level: string | null;
  created_at: string;
  diagnosis: string | null;
  profiles?: { full_name: string; nic: string } | null;
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, portal, loading, signIn, signOut } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [claims, setClaims] = useState<Claim[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    highRisk: 0,
    fraudAlerts: 0,
    avgRiskScore: 0,
    approved: 0,
    pending: 0,
    rejected: 0,
    autoApproved: 0,
    manualReview: 0,
    avgOcrConfidence: 0,
  });
  const { t } = useLanguage();

  // Check if user is authenticated and has admin role
  const isAdmin = user && portal === 'admin';
  const isAuthenticated = !!user;

  // Redirect non-admin users after auth check completes
  useEffect(() => {
    if (!loading && isAuthenticated && portal && portal !== 'admin') {
      toast.error("Access denied. Admin privileges required.");
      navigate("/");
    }
  }, [loading, isAuthenticated, portal, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error("Please enter email and password");
      return;
    }
    
    setIsSigningIn(true);
    
    const { error } = await signIn(email, password);
    
    if (error) {
      toast.error(error.message || "Failed to sign in");
    } else {
      toast.success("Signed in successfully");
    }
    
    setIsSigningIn(false);
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  useEffect(() => {
    if (isAdmin) {
      fetchClaims();
    }
  }, [isAdmin, statusFilter]);

  const fetchClaims = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from("claims")
        .select("*")
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter as any);
      }

      const { data: claimsData, error: claimsError } = await query;

      if (claimsError) throw claimsError;

      // Fetch profiles to get customer names
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("user_id, full_name, nic");

      // Map profiles to claims
      const profilesMap = new Map(
        (profilesData || []).map(p => [p.user_id, { full_name: p.full_name, nic: p.nic }])
      );

      const claimsWithProfiles = (claimsData || []).map(claim => ({
        ...claim,
        profiles: profilesMap.get(claim.user_id) || null
      }));

      setClaims(claimsWithProfiles as any);

      // Calculate stats
      const data = claimsData;
      const total = data?.length || 0;
      const highRisk = data?.filter(c => c.risk_level === "high").length || 0;
      const fraudAlerts = data?.filter(c => c.fraud_status === "flagged" || c.fraud_status === "suspicious").length || 0;
      const avgRiskScore = total > 0 
        ? Math.round(data?.reduce((sum, c) => sum + (c.risk_score || 0), 0) / total) 
        : 0;
      const approved = data?.filter(c => c.status === "approved").length || 0;
      const pending = data?.filter(c => c.status === "pending").length || 0;
      const rejected = data?.filter(c => c.status === "rejected").length || 0;
      const autoApproved = data?.filter(c => c.processing_status === "auto_approved").length || 0;
      const manualReview = data?.filter(c => c.processing_status === "manual_review").length || 0;
      const avgOcrConfidence = total > 0
        ? Math.round(data?.reduce((sum, c) => sum + (c.ocr_confidence || 0), 0) / total)
        : 0;

      setStats({ 
        total, highRisk, fraudAlerts, avgRiskScore, 
        approved, pending, rejected, autoApproved, manualReview, avgOcrConfidence 
      });
    } catch (error) {
      console.error("Error fetching claims:", error);
      toast.error("Failed to load claims");
    }
    setIsLoading(false);
  };

  const handleApprove = async (claimId: string) => {
    try {
      const { error } = await supabase
        .from("claims")
        .update({ status: "approved", processing_status: "settled" })
        .eq("id", claimId);

      if (error) throw error;
      toast.success("Claim approved successfully");
      fetchClaims();
    } catch (error) {
      toast.error("Failed to approve claim");
    }
  };

  const handleReject = async (claimId: string) => {
    try {
      const { error } = await supabase
        .from("claims")
        .update({ status: "rejected", processing_status: "auto_rejected" })
        .eq("id", claimId);

      if (error) throw error;
      toast.success("Claim rejected");
      fetchClaims();
    } catch (error) {
      toast.error("Failed to reject claim");
    }
  };

  // Filter claims by search
  const filteredClaims = claims.filter(claim => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      claim.reference_number?.toLowerCase().includes(query) ||
      claim.profiles?.full_name?.toLowerCase().includes(query) ||
      claim.profiles?.nic?.toLowerCase().includes(query) ||
      claim.diagnosis?.toLowerCase().includes(query)
    );
  });

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Login Screen - Show when not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar variant="gradient" />
        
        <main className="container mx-auto px-4 py-16 flex items-center justify-center min-h-[calc(100vh-80px)]">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md"
          >
            <div className="glass-card p-8 text-center">
              <div className="w-16 h-16 rounded-full gradient-primary mx-auto mb-6 flex items-center justify-center">
                <LogIn className="w-8 h-8 text-white" />
              </div>
              
              <h1 className="text-2xl font-bold text-foreground mb-2">
                {t.adminLogin}
              </h1>
              <p className="text-muted-foreground mb-6">
                Sign in with your admin credentials
              </p>
              
              <form onSubmit={handleLogin} className="space-y-4 text-left">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isSigningIn}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password">{t.password}</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder={t.enterPassword}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isSigningIn}
                  />
                </div>
                
                <Button type="submit" className="w-full" variant="hero" disabled={isSigningIn}>
                  {isSigningIn ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    t.login
                  )}
                </Button>
              </form>
              
              <p className="text-xs text-muted-foreground mt-4">
                Only users with admin role can access this dashboard
              </p>
            </div>
          </motion.div>
        </main>
      </div>
    );
  }

  // Access denied - authenticated but not admin
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">Access Denied</h2>
          <p className="text-muted-foreground mb-4">You don't have admin privileges to access this page.</p>
          <Button variant="outline" onClick={() => navigate("/")}>
            Go to Home
          </Button>
        </div>
      </div>
    );
  }

  const topStats = [
    { label: "Total Claims", value: stats.total, subtitle: "All submitted claims", color: "text-primary", icon: FileText },
    { label: "High Risk", value: stats.highRisk, subtitle: "Require immediate review", color: "text-destructive", icon: AlertTriangle },
    { label: "Fraud Alerts", value: stats.fraudAlerts, subtitle: "Flagged for verification", color: "text-amber-500", icon: Shield },
    { label: "Avg Risk Score", value: stats.avgRiskScore, subtitle: stats.avgRiskScore < 40 ? "Low risk overall" : "Elevated risk", color: stats.avgRiskScore < 40 ? "text-green-500" : "text-amber-500", icon: Activity },
  ];

  const metrics = [
    {
      title: "OCR Accuracy",
      value: `${stats.avgOcrConfidence}%`,
      valueColor: stats.avgOcrConfidence >= 90 ? "text-green-500" : "text-amber-500",
      subtitle: "Average document recognition rate",
      icon: Brain,
      items: [
        { label: "High Confidence (90%+)", value: claims.filter(c => (c.ocr_confidence || 0) >= 90).length },
        { label: "Medium (50-89%)", value: claims.filter(c => (c.ocr_confidence || 0) >= 50 && (c.ocr_confidence || 0) < 90).length },
        { label: "Low (<50%)", value: claims.filter(c => (c.ocr_confidence || 0) < 50).length },
      ],
    },
    {
      title: "Fraud Detection",
      value: `${stats.fraudAlerts} Alerts`,
      valueColor: stats.fraudAlerts > 0 ? "text-destructive" : "text-green-500",
      subtitle: "AI-powered fraud patterns detected",
      icon: Shield,
      items: [
        { label: "Flagged (High Risk)", value: claims.filter(c => c.fraud_status === "flagged").length },
        { label: "Suspicious", value: claims.filter(c => c.fraud_status === "suspicious").length },
        { label: "Clean", value: claims.filter(c => c.fraud_status === "clean" || !c.fraud_status).length },
      ],
    },
    {
      title: "Processing Status",
      value: `${Math.round((stats.autoApproved / Math.max(stats.total, 1)) * 100)}% Auto`,
      valueColor: "text-primary",
      subtitle: "AI automation rate",
      icon: TrendingUp,
      items: [
        { label: "Auto-Approved", value: stats.autoApproved },
        { label: "Manual Review", value: stats.manualReview },
        { label: "Pending", value: stats.pending },
      ],
    },
  ];

  const getRiskBadge = (riskScore: number | null, riskLevel: string | null) => {
    const level = riskLevel || (riskScore && riskScore >= 70 ? "high" : riskScore && riskScore >= 40 ? "medium" : "low");
    const colors: Record<string, string> = {
      low: "bg-green-100 text-green-700",
      medium: "bg-amber-100 text-amber-700",
      high: "bg-red-100 text-red-700",
    };
    return (
      <Badge variant="outline" className={cn("text-xs", colors[level])}>
        {level.charAt(0).toUpperCase() + level.slice(1)} ({riskScore || 0})
      </Badge>
    );
  };

  const getFraudBadge = (status: string | null, flags: number | null) => {
    if (!status || status === "clean") {
      return <Badge variant="outline" className="text-xs bg-green-100 text-green-700">Clean</Badge>;
    }
    if (status === "flagged") {
      return <Badge variant="destructive" className="text-xs">{flags || 0} Flag(s)</Badge>;
    }
    return <Badge variant="outline" className="text-xs bg-amber-100 text-amber-700">Suspicious</Badge>;
  };

  const getOcrBadge = (confidence: number | null) => {
    const level = (confidence || 0) >= 90 ? "high" : (confidence || 0) >= 50 ? "medium" : "low";
    const colors: Record<string, string> = {
      low: "bg-red-100 text-red-700",
      medium: "bg-amber-100 text-amber-700",
      high: "bg-green-100 text-green-700",
    };
    return (
      <Badge variant="outline" className={cn("text-xs", colors[level])}>
        {confidence || 0}%
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      approved: "bg-green-100 text-green-700",
      pending: "bg-amber-100 text-amber-700",
      processing: "bg-blue-100 text-blue-700",
      rejected: "bg-red-100 text-red-700",
    };
    return (
      <Badge variant="outline" className={cn("text-xs capitalize", styles[status] || "bg-muted")}>
        {status}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar variant="gradient" showLogout onLogout={handleLogout} />

      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              Admin Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">
              AI-powered claims management & fraud detection
            </p>
          </div>
          <Button variant="outline" onClick={fetchClaims} disabled={isLoading}>
            <RefreshCw className={cn("w-4 h-4 mr-2", isLoading && "animate-spin")} />
            Refresh
          </Button>
        </div>

        {/* Top Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {topStats.map((stat, i) => (
            <motion.div 
              key={i} 
              className="glass-card p-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <div className="flex items-center gap-3">
                <div className={cn("p-2 rounded-lg", stat.color === "text-primary" ? "bg-primary/10" : "bg-muted")}>
                  <stat.icon className={cn("w-5 h-5", stat.color)} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className={cn("text-2xl font-bold", stat.color)}>{stat.value}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">{stat.subtitle}</p>
            </motion.div>
          ))}
        </div>

        {/* Metrics Row */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          {metrics.map((metric, i) => (
            <motion.div 
              key={i} 
              className="glass-card p-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + i * 0.1 }}
            >
              <div className="flex items-center gap-2 mb-2">
                <metric.icon className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-foreground">{metric.title}</h3>
              </div>
              <p className={cn("text-2xl font-bold", metric.valueColor)}>{metric.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{metric.subtitle}</p>
              <div className="mt-4 space-y-2">
                {metric.items.map((item, j) => (
                  <div key={j} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className="text-foreground font-medium">{item.value}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Claims Table */}
        <div className="glass-card p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div>
              <h2 className="text-xl font-bold text-foreground">All Claims</h2>
              <p className="text-sm text-muted-foreground">Review and manage submitted claims</p>
            </div>
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Search by ID, Customer, or NIC" 
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon">
                <Download className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Loading claims...</p>
            </div>
          ) : filteredClaims.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No Claims Found</h3>
              <p className="text-muted-foreground">No claims match your search criteria</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Claim ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Risk Score</TableHead>
                    <TableHead>Fraud Check</TableHead>
                    <TableHead>OCR</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClaims.map((claim) => (
                    <TableRow key={claim.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">
                        <button 
                          onClick={() => navigate(`/admin/claim/${claim.id}`)}
                          className="text-primary hover:underline"
                        >
                          {claim.reference_number}
                        </button>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{claim.profiles?.full_name || "N/A"}</p>
                          <p className="text-xs text-muted-foreground">{claim.profiles?.nic || "—"}</p>
                        </div>
                      </TableCell>
                      <TableCell className="capitalize">{claim.claim_type}</TableCell>
                      <TableCell>LKR {claim.claim_amount?.toLocaleString()}</TableCell>
                      <TableCell>{getRiskBadge(claim.risk_score, claim.risk_level)}</TableCell>
                      <TableCell>{getFraudBadge(claim.fraud_status, claim.fraud_flags)}</TableCell>
                      <TableCell>{getOcrBadge(claim.ocr_confidence)}</TableCell>
                      <TableCell>{getStatusBadge(claim.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate(`/admin/claim/${claim.id}`)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {claim.status === "pending" && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-green-600 hover:text-green-700"
                                onClick={() => handleApprove(claim.id)}
                              >
                                <CheckCircle className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-red-600 hover:text-red-700"
                                onClick={() => handleReject(claim.id)}
                              >
                                <XCircle className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
