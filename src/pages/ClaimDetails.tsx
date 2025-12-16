import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, User, FileText, CheckCircle, Clock, Calendar, CreditCard, Phone, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import Navbar from "@/components/shared/Navbar";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const ClaimDetails = () => {
  const navigate = useNavigate();
  const { claimId } = useParams();
  const [loading, setLoading] = useState(true);
  const [claim, setClaim] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [ocrResults, setOcrResults] = useState<any[]>([]);
  const [validation, setValidation] = useState<any>(null);
  const [fraudResult, setFraudResult] = useState<any>(null);
  const [settlement, setSettlement] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [member, setMember] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (claimId) {
      fetchClaimData();
    }
  }, [claimId]);

  const fetchClaimData = async () => {
    setLoading(true);
    try {
      // Fetch claim
      const { data: claimData, error: claimError } = await supabase
        .from("claims")
        .select("*")
        .eq("id", claimId)
        .single();
      
      if (claimError) throw claimError;
      setClaim(claimData);

      // Fetch related data in parallel
      const [docsRes, ocrRes, validationRes, fraudRes, settlementRes, historyRes] = await Promise.all([
        supabase.from("claim_documents").select("*").eq("claim_id", claimId),
        supabase.from("claim_ocr_results").select("*").eq("claim_id", claimId),
        supabase.from("claim_validations").select("*").eq("claim_id", claimId).order("created_at", { ascending: false }).limit(1),
        supabase.from("fraud_detection_results").select("*").eq("claim_id", claimId).order("created_at", { ascending: false }).limit(1),
        supabase.from("settlement_calculations").select("*").eq("claim_id", claimId).order("created_at", { ascending: false }).limit(1),
        supabase.from("claim_history").select("*").eq("claim_id", claimId).order("created_at", { ascending: true }),
      ]);

      setDocuments(docsRes.data || []);
      setOcrResults(ocrRes.data || []);
      setValidation(validationRes.data?.[0] || null);
      setFraudResult(fraudRes.data?.[0] || null);
      setSettlement(settlementRes.data?.[0] || null);
      setHistory(historyRes.data || []);

      // Fetch member if available
      if (claimData.member_id) {
        const { data: memberData } = await supabase
          .from("policy_members")
          .select("*")
          .eq("id", claimData.member_id)
          .single();
        setMember(memberData);
      }
    } catch (error) {
      console.error("Error fetching claim:", error);
      toast({
        title: "Error",
        description: "Failed to load claim data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => `LKR ${(amount || 0).toLocaleString()}`;
  const formatDate = (date: string) => date ? new Date(date).toLocaleDateString() : "-";

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      processing: "bg-amber-100 text-amber-700",
      pending: "bg-amber-100 text-amber-700",
      approved: "bg-green-100 text-green-700",
      rejected: "bg-red-500 text-white",
    };
    const icons: Record<string, React.ReactNode> = {
      processing: <Clock className="w-3 h-3" />,
      pending: <Clock className="w-3 h-3" />,
      approved: <CheckCircle className="w-3 h-3" />,
      rejected: <XCircle className="w-3 h-3" />,
    };
    return (
      <span className={cn("px-3 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1", styles[status] || styles.pending)}>
        {icons[status] || icons.pending}
        {status?.charAt(0).toUpperCase() + status?.slice(1) || "Pending"}
      </span>
    );
  };

  const getDocumentStatusBadge = (doc: any) => {
    const ocr = ocrResults.find(o => o.document_id === doc.id);
    const confidence = ocr?.ocr_confidence || doc.ocr_confidence || 0;
    
    if (confidence >= 90) {
      return (
        <Badge className="bg-green-500 text-white">
          <CheckCircle className="w-3 h-3 mr-1" />
          Verified
        </Badge>
      );
    }
    if (confidence >= 50) {
      return (
        <Badge className="bg-amber-500 text-white">
          <Clock className="w-3 h-3 mr-1" />
          Processing
        </Badge>
      );
    }
    return (
      <Badge className="bg-red-500 text-white">
        <XCircle className="w-3 h-3 mr-1" />
        Failed
      </Badge>
    );
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return "text-green-600";
    if (score >= 50) return "text-amber-600";
    return "text-red-500";
  };

  const getRiskColor = (level: string) => {
    if (level === "low") return "text-green-600";
    if (level === "medium") return "text-amber-600";
    return "text-red-500";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!claim) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-2">Claim Not Found</h2>
          <Button onClick={() => navigate("/digital-portal")}>Back to Portal</Button>
        </div>
      </div>
    );
  }

  const overallScore = validation ? Math.round((validation.overall_validation_score || 0) * 100) : 0;
  const avgOcrConfidence = ocrResults.length > 0 
    ? Math.round(ocrResults.reduce((acc, o) => acc + (o.ocr_confidence || 0), 0) / ocrResults.length)
    : (claim.ocr_confidence || 0);

  return (
    <div className="min-h-screen bg-background">
      <Navbar variant="gradient" showLogout onLogout={() => navigate("/")} />

      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/digital-portal")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Claim Details</h1>
              <p className="text-sm text-muted-foreground">Reference: {claim.reference_number}</p>
            </div>
          </div>
          {getStatusBadge(claim.status)}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Patient & Policy Information */}
            <div className="glass-card p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">Patient & Policy Information</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <User className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Patient Name</p>
                    <p className="font-medium text-primary">{member?.member_name || "N/A"}</p>
                    <p className="text-xs text-muted-foreground">{member?.member_nic || ""}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <FileText className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Policy Number</p>
                    <p className="font-medium text-primary">{claim.policy_number}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <FileText className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Claim Type</p>
                    <p className="font-medium text-foreground">{claim.claim_type}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <User className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Relationship</p>
                    <p className="font-medium text-foreground">{claim.relationship}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Treatment Details */}
            <div className="glass-card p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">Treatment Details</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <FileText className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Diagnosis</p>
                    <p className="font-medium text-foreground">{claim.diagnosis || "N/A"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Calendar className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Admission Date</p>
                    <p className="font-medium text-foreground">{formatDate(claim.admission_date)}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Calendar className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Discharge Date</p>
                    <p className="font-medium text-foreground">{formatDate(claim.discharge_date)}</p>
                  </div>
                </div>
                {claim.doctor_name && (
                  <div className="flex items-start gap-3">
                    <User className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">Doctor</p>
                      <p className="font-medium text-foreground">{claim.doctor_name}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Submitted Documents */}
            <div className="glass-card p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">Submitted Documents</h2>
              <div className="space-y-3">
                {documents.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">No documents uploaded</p>
                ) : (
                  documents.map((doc, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-border">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-amber-100 flex items-center justify-center">
                          <FileText className="w-4 h-4 text-amber-600" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{doc.file_name}</p>
                          <p className="text-xs text-muted-foreground">{doc.file_type}</p>
                        </div>
                      </div>
                      {getDocumentStatusBadge(doc)}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* AI Verification Status */}
            <div className="glass-card p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">AI Verification Status</h2>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 rounded-xl bg-muted/30">
                  <p className={cn("text-3xl font-bold", getScoreColor(overallScore))}>
                    {overallScore}%
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Overall Score</p>
                </div>
                <div className="text-center p-4 rounded-xl bg-muted/30">
                  <p className={cn("text-3xl font-bold", getScoreColor(avgOcrConfidence))}>
                    {avgOcrConfidence}%
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Document Accuracy</p>
                </div>
                <div className="text-center p-4 rounded-xl bg-muted/30">
                  <p className={cn("text-3xl font-bold capitalize", getRiskColor(claim.risk_level))}>
                    {claim.risk_level || "Low"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Fraud Risk</p>
                </div>
              </div>

              {claim.ai_summary && (
                <div className="mt-4 p-4 rounded-lg bg-muted/20">
                  <h3 className="text-sm font-semibold text-foreground mb-2">AI Summary</h3>
                  <p className="text-sm text-muted-foreground">{claim.ai_summary}</p>
                </div>
              )}
            </div>

            {/* Rejection Reason */}
            {claim.status === "rejected" && claim.rejection_reason && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-red-600 mb-3">Rejection Reason</h2>
                <div className="flex items-start gap-3">
                  <XCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-700">{claim.rejection_reason}</p>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Claim Amount */}
            <div className="glass-card p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">Claim Amount</h2>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                    <span className="font-bold">$</span>
                    <span>Claimed Amount</span>
                  </div>
                  <p className="text-2xl font-bold text-primary">{formatCurrency(claim.claim_amount)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Approved Amount</p>
                  <p className={cn(
                    "text-lg font-bold",
                    claim.approved_amount === 0 && claim.status === "rejected" ? "text-red-500" : "text-green-600"
                  )}>
                    {formatCurrency(claim.approved_amount)}
                  </p>
                </div>
                {settlement && (
                  <>
                    <div className="border-t pt-3">
                      <p className="text-xs text-muted-foreground mb-1">Co-Payment</p>
                      <p className="font-medium">{formatCurrency(settlement.co_payment_amount)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Insurer Payment</p>
                      <p className="font-bold text-green-600">{formatCurrency(settlement.insurer_payment)}</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Payment Details */}
            <div className="glass-card p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">Payment Details</h2>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <CreditCard className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Bank Account</p>
                    <p className="font-medium text-foreground">
                      {claim.account_number ? `${claim.account_number} (${claim.bank_name || "N/A"})` : "N/A"}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Mobile Number</p>
                    <p className="font-medium text-foreground">{claim.mobile_number || "N/A"}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Claim Timeline */}
            <div className="glass-card p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">Claim Timeline</h2>
              <div className="space-y-4">
                {/* Submitted */}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-4 h-4 text-amber-600" />
                  </div>
                  <div>
                    <p className="font-medium text-sm text-primary">Claim Submitted</p>
                    <p className="text-xs text-muted-foreground">{formatDate(claim.created_at)}</p>
                  </div>
                </div>

                {/* History entries */}
                {history.map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                      item.new_status === "rejected" ? "bg-red-100" : item.new_status === "approved" ? "bg-green-100" : "bg-blue-100"
                    )}>
                      {item.new_status === "rejected" ? (
                        <XCircle className="w-4 h-4 text-red-500" />
                      ) : item.new_status === "approved" ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <Clock className="w-4 h-4 text-blue-600" />
                      )}
                    </div>
                    <div>
                      <p className={cn(
                        "font-medium text-sm",
                        item.new_status === "rejected" ? "text-red-600" : item.new_status === "approved" ? "text-green-600" : "text-primary"
                      )}>
                        {item.action}
                      </p>
                      <p className="text-xs text-muted-foreground">{formatDate(item.created_at)}</p>
                    </div>
                  </div>
                ))}

                {/* Processing status if not completed */}
                {claim.status === "pending" && (
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <Clock className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-sm text-blue-600">Under Review</p>
                      <p className="text-xs text-muted-foreground">{claim.processing_status}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ClaimDetails;
