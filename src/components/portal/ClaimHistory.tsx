import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  CheckCircle, Clock, XCircle, AlertCircle, 
  Brain, Shield, FileText, ChevronRight, RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Claim {
  id: string;
  reference_number: string;
  status: string;
  processing_status: string;
  claim_type: string;
  claim_amount: number;
  approved_amount: number | null;
  created_at: string;
  diagnosis: string | null;
  risk_level: string | null;
  fraud_status: string | null;
  ai_summary: string | null;
}

const ClaimHistory = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    approved: 0,
    processing: 0,
    rejected: 0,
    totalClaimed: 0,
    totalApproved: 0,
  });

  useEffect(() => {
    fetchClaims();
  }, [user]);

  const fetchClaims = async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const { data, error } = await supabase
      .from("claims")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching claims:", error);
    } else if (data) {
      setClaims(data);
      
      // Calculate stats
      const approved = data.filter(c => c.status === "approved").length;
      const processing = data.filter(c => c.status === "pending" || c.status === "processing").length;
      const rejected = data.filter(c => c.status === "rejected").length;
      const totalClaimed = data.reduce((sum, c) => sum + (c.claim_amount || 0), 0);
      const totalApproved = data.reduce((sum, c) => sum + (c.approved_amount || 0), 0);
      
      setStats({ approved, processing, rejected, totalClaimed, totalApproved });
    }
    setIsLoading(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case "pending":
      case "processing":
        return <Clock className="w-5 h-5 text-amber-600" />;
      case "rejected":
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <AlertCircle className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      approved: "bg-green-100 text-green-700",
      pending: "bg-amber-100 text-amber-700",
      processing: "bg-blue-100 text-blue-700",
      rejected: "bg-red-100 text-red-700",
    };
    return (
      <span className={cn("px-2 py-1 rounded-full text-xs font-medium capitalize", styles[status] || "bg-muted text-muted-foreground")}>
        {status}
      </span>
    );
  };

  const getProcessingStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; color: string }> = {
      uploaded: { label: "Uploaded", color: "bg-gray-100 text-gray-700" },
      ocr_processing: { label: "OCR Processing", color: "bg-blue-100 text-blue-700" },
      ocr_complete: { label: "OCR Complete", color: "bg-blue-100 text-blue-700" },
      validation_in_progress: { label: "Validating", color: "bg-purple-100 text-purple-700" },
      validation_complete: { label: "Validated", color: "bg-purple-100 text-purple-700" },
      fraud_check_in_progress: { label: "Fraud Check", color: "bg-orange-100 text-orange-700" },
      fraud_check_complete: { label: "Checked", color: "bg-orange-100 text-orange-700" },
      auto_approved: { label: "AI Approved", color: "bg-green-100 text-green-700" },
      auto_rejected: { label: "AI Rejected", color: "bg-red-100 text-red-700" },
      manual_review: { label: "Under Review", color: "bg-amber-100 text-amber-700" },
      settled: { label: "Settled", color: "bg-green-100 text-green-700" },
    };
    
    const config = statusMap[status] || { label: status, color: "bg-muted text-muted-foreground" };
    return (
      <Badge variant="outline" className={cn("text-xs", config.color)}>
        {config.label}
      </Badge>
    );
  };

  const getRiskBadge = (riskLevel: string | null, fraudStatus: string | null) => {
    if (!riskLevel && !fraudStatus) return null;
    
    const isHighRisk = riskLevel === "high" || fraudStatus === "flagged";
    const isMediumRisk = riskLevel === "medium" || fraudStatus === "suspicious";
    
    if (isHighRisk) {
      return (
        <Badge variant="destructive" className="text-xs">
          <Shield className="w-3 h-3 mr-1" /> High Risk
        </Badge>
      );
    }
    if (isMediumRisk) {
      return (
        <Badge variant="outline" className="text-xs bg-amber-100 text-amber-700">
          <Shield className="w-3 h-3 mr-1" /> Medium Risk
        </Badge>
      );
    }
    return null;
  };

  const quickStats = [
    { label: "Approved", value: stats.approved, bgColor: "bg-green-100", textColor: "text-green-600", icon: CheckCircle },
    { label: "Processing", value: stats.processing, bgColor: "bg-amber-100", textColor: "text-amber-600", icon: Clock },
    { label: "Total Claimed", value: `LKR ${stats.totalClaimed.toLocaleString()}`, bgColor: "bg-secondary", textColor: "text-primary", icon: FileText },
  ];

  if (isLoading) {
    return (
      <div className="glass-card p-6 text-center">
        <RefreshCw className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Loading your claims...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="glass-card p-6 text-center">
        <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">Please Log In</h3>
        <p className="text-muted-foreground">Log in to view your claim history</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="glass-card p-6">
        <h2 className="text-xl font-bold text-foreground mb-4">Quick Stats</h2>
        <div className="grid grid-cols-3 gap-4">
          {quickStats.map((stat, i) => (
            <div key={i} className={cn("rounded-xl p-4 text-center", stat.bgColor)}>
              <stat.icon className={cn("w-6 h-6 mx-auto mb-2", stat.textColor)} />
              <p className={cn("text-2xl font-bold", stat.textColor)}>{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Claim History */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-foreground">Claim History</h2>
            <p className="text-sm text-muted-foreground">View and track all your submitted claims</p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchClaims}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {claims.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No Claims Yet</h3>
            <p className="text-muted-foreground">Submit your first claim to see it here</p>
          </div>
        ) : (
          <div className="space-y-4">
            {claims.map((claim) => (
              <div
                key={claim.id}
                className="flex items-start justify-between p-4 rounded-xl border border-border hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => navigate(`/digital-portal/claim/${claim.reference_number}`)}
              >
                <div className="flex items-start gap-3">
                  {getStatusIcon(claim.status)}
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-foreground">{claim.reference_number}</span>
                      {getStatusBadge(claim.status)}
                      {claim.processing_status && getProcessingStatusBadge(claim.processing_status)}
                      {getRiskBadge(claim.risk_level, claim.fraud_status)}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {claim.claim_type?.toUpperCase()} • {new Date(claim.created_at).toLocaleDateString()}
                    </p>
                    {claim.diagnosis && (
                      <p className="text-sm text-muted-foreground">
                        {claim.diagnosis}
                      </p>
                    )}
                    {claim.ai_summary && (
                      <div className="flex items-start gap-2 mt-2 p-2 bg-muted rounded-lg">
                        <Brain className="w-4 h-4 text-primary mt-0.5" />
                        <p className="text-xs text-muted-foreground line-clamp-2">{claim.ai_summary}</p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right flex items-center gap-4">
                  <div>
                    <p className="font-semibold text-foreground">LKR {claim.claim_amount?.toLocaleString()}</p>
                    {claim.approved_amount && (
                      <p className="text-sm text-green-600">
                        Approved: LKR {claim.approved_amount.toLocaleString()}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ClaimHistory;
