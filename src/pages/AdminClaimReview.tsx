import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, User, FileText, CheckCircle, Eye, Download, Clock, AlertTriangle, Building, Calendar, XCircle, CheckCircle2, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/shared/Navbar";
import { cn } from "@/lib/utils";
import { translations, type Language } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ClaimData {
  id: string;
  reference_number: string;
  status: string;
  processing_status: string;
  claim_type: string;
  claim_amount: number;
  approved_amount: number;
  settled_amount: number;
  hospital_name: string;
  diagnosis: string;
  date_of_treatment: string;
  admission_date: string;
  discharge_date: string;
  doctor_name: string;
  risk_score: number;
  fraud_flags: number;
  ocr_confidence: number;
  risk_level: string;
  fraud_status: string;
  ai_summary: string;
  admin_notes: string;
  rejection_reason: string;
  policy_number: string;
  mobile_number: string;
  bank_name: string;
  account_number: string;
  created_at: string;
  member_id: string;
  policy_id: string;
}

const AdminClaimReview = () => {
  const navigate = useNavigate();
  const { claimId } = useParams();
  const [assessorNotes, setAssessorNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [language] = useState<Language>(() => {
    const stored = localStorage.getItem("selectedLanguage");
    return (stored as Language) || "en";
  });
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [claim, setClaim] = useState<ClaimData | null>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [ocrResults, setOcrResults] = useState<any[]>([]);
  const [validation, setValidation] = useState<any>(null);
  const [fraudResult, setFraudResult] = useState<any>(null);
  const [settlement, setSettlement] = useState<any>(null);
  const [policy, setPolicy] = useState<any>(null);
  const [member, setMember] = useState<any>(null);
  const { toast } = useToast();
  
  const t = translations[language];

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
      setAssessorNotes(claimData.admin_notes || "");

      // Fetch related data in parallel
      const [docsRes, ocrRes, validationRes, fraudRes, settlementRes] = await Promise.all([
        supabase.from("claim_documents").select("*").eq("claim_id", claimId),
        supabase.from("claim_ocr_results").select("*").eq("claim_id", claimId),
        supabase.from("claim_validations").select("*").eq("claim_id", claimId).order("created_at", { ascending: false }).limit(1),
        supabase.from("fraud_detection_results").select("*").eq("claim_id", claimId).order("created_at", { ascending: false }).limit(1),
        supabase.from("settlement_calculations").select("*").eq("claim_id", claimId).order("created_at", { ascending: false }).limit(1),
      ]);

      setDocuments(docsRes.data || []);
      setOcrResults(ocrRes.data || []);
      setValidation(validationRes.data?.[0] || null);
      setFraudResult(fraudRes.data?.[0] || null);
      setSettlement(settlementRes.data?.[0] || null);

      // Fetch policy and member if available
      if (claimData.policy_id) {
        const { data: policyData } = await supabase
          .from("policies")
          .select("*")
          .eq("id", claimData.policy_id)
          .single();
        setPolicy(policyData);
      }

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

  const handleApprove = async () => {
    if (!claim) return;
    setProcessing(true);
    try {
      const { error } = await supabase
        .from("claims")
        .update({
          status: "approved",
          processing_status: "settled",
          admin_notes: assessorNotes,
          approved_amount: settlement?.insurer_payment || claim.claim_amount,
          settled_amount: settlement?.insurer_payment || claim.claim_amount,
        })
        .eq("id", claim.id);

      if (error) throw error;

      await supabase.from("claim_history").insert([{
        claim_id: claim.id,
        action: "Claim Approved",
        previous_status: claim.status as any,
        new_status: "approved" as any,
        notes: assessorNotes,
      }]);

      toast({
        title: t.claimApprovedSuccess,
        description: "The claim has been approved and the customer will be notified.",
      });
      fetchClaimData();
    } catch (error) {
      console.error("Error approving claim:", error);
      toast({ title: "Error", description: "Failed to approve claim", variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!claim) return;
    if (!rejectionReason.trim()) {
      toast({ title: "Error", description: "Please provide a rejection reason", variant: "destructive" });
      return;
    }
    setProcessing(true);
    try {
      const { error } = await supabase
        .from("claims")
        .update({
          status: "rejected",
          processing_status: "closed",
          admin_notes: assessorNotes,
          rejection_reason: rejectionReason,
          approved_amount: 0,
          settled_amount: 0,
        })
        .eq("id", claim.id);

      if (error) throw error;

      await supabase.from("claim_history").insert([{
        claim_id: claim.id,
        action: "Claim Rejected",
        previous_status: claim.status as any,
        new_status: "rejected" as any,
        notes: rejectionReason,
      }]);

      toast({
        title: t.claimRejectedSuccess,
        description: "The claim has been rejected and the customer will be notified.",
        variant: "destructive",
      });
      fetchClaimData();
    } catch (error) {
      console.error("Error rejecting claim:", error);
      toast({ title: "Error", description: "Failed to reject claim", variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const handleRerunPipeline = async () => {
    if (!claim) return;
    setProcessing(true);
    try {
      const response = await supabase.functions.invoke("process-claim-pipeline", {
        body: { claimId: claim.id },
      });

      if (response.error) throw response.error;

      toast({
        title: "Pipeline Complete",
        description: `Decision: ${response.data?.pipeline_results?.decision || "Complete"}`,
      });
      fetchClaimData();
    } catch (error) {
      console.error("Error running pipeline:", error);
      toast({ title: "Error", description: "Failed to run AI pipeline", variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: "bg-amber-100 text-amber-700",
      approved: "bg-green-100 text-green-700",
      rejected: "bg-red-100 text-red-700",
      processing: "bg-blue-100 text-blue-700",
    };
    return (
      <span className={cn("px-3 py-1 rounded-full text-xs font-medium", styles[status] || styles.pending)}>
        {status?.charAt(0).toUpperCase() + status?.slice(1) || "Pending"}
      </span>
    );
  };

  const formatCurrency = (amount: number) => `LKR ${(amount || 0).toLocaleString()}`;
  const formatDate = (date: string) => date ? new Date(date).toLocaleDateString() : "-";
  const formatPercent = (value: number) => `${Math.round((value || 0) * 100)}%`;

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
          <Button onClick={() => navigate("/admin")}>Back to Dashboard</Button>
        </div>
      </div>
    );
  }

  const overallScore = validation?.overall_validation_score || 0;
  const fraudScore = fraudResult?.fraud_score || 0;
  const anomalyScore = fraudResult?.anomaly_score || 0;

  return (
    <div className="min-h-screen bg-background">
      <Navbar variant="gradient" showLogout onLogout={() => navigate("/")} />

      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Claim Review</h1>
              <p className="text-sm text-muted-foreground">Reference: {claim.reference_number}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge(claim.status)}
            <Badge variant="outline">{claim.processing_status}</Badge>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Claim Information */}
            <div className="glass-card p-6 border-l-4 border-l-primary">
              <h2 className="text-lg font-semibold text-foreground mb-4">Claim Information</h2>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="flex items-start gap-3">
                  <User className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Patient</p>
                    <p className="font-medium text-primary">{member?.member_name || "N/A"}</p>
                    <p className="text-xs text-muted-foreground">{member?.member_nic || claim.mobile_number}</p>
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
                  <Calendar className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Submitted</p>
                    <p className="font-medium text-foreground">{formatDate(claim.created_at)}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-muted-foreground font-bold text-sm">$</span>
                  <div>
                    <p className="text-xs text-muted-foreground">Claim Amount</p>
                    <p className="font-bold text-primary text-lg">{formatCurrency(claim.claim_amount)}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Building className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Hospital</p>
                    <p className="font-medium text-primary">{claim.hospital_name || "N/A"}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Diagnosis</p>
                  <p className="font-medium text-foreground">{claim.diagnosis || "N/A"}</p>
                </div>
              </div>
            </div>

            {/* AI Analysis & Verification */}
            <div className="glass-card p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">AI Analysis & Verification</h2>
                  <p className="text-xs text-muted-foreground">Automated checks performed by the AI system</p>
                </div>
                <Button variant="outline" size="sm" onClick={handleRerunPipeline} disabled={processing}>
                  <RefreshCw className={cn("w-4 h-4 mr-2", processing && "animate-spin")} />
                  Re-run AI
                </Button>
              </div>

              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-5 mb-6">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="documents">Documents</TabsTrigger>
                  <TabsTrigger value="policy">Policy</TabsTrigger>
                  <TabsTrigger value="fraud">Fraud</TabsTrigger>
                  <TabsTrigger value="matching">Matching</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6">
                  <div className="grid grid-cols-3 gap-4">
                    <div className={cn("rounded-xl p-4", overallScore >= 0.7 ? "bg-green-50" : overallScore >= 0.5 ? "bg-amber-50" : "bg-red-50")}>
                      <div className="flex items-center gap-2 mb-1">
                        <CheckCircle className={cn("w-4 h-4", overallScore >= 0.7 ? "text-green-600" : overallScore >= 0.5 ? "text-amber-600" : "text-red-600")} />
                        <span className="text-xs text-muted-foreground">Validation Score</span>
                      </div>
                      <p className={cn("text-3xl font-bold", overallScore >= 0.7 ? "text-green-600" : overallScore >= 0.5 ? "text-amber-600" : "text-red-600")}>
                        {formatPercent(overallScore)}
                      </p>
                    </div>
                    <div className={cn("rounded-xl p-4", anomalyScore >= 0.7 ? "bg-green-50" : "bg-amber-50")}>
                      <div className="flex items-center gap-2 mb-1">
                        <FileText className="w-4 h-4 text-green-600" />
                        <span className="text-xs text-muted-foreground">Anomaly Score</span>
                      </div>
                      <p className="text-3xl font-bold text-green-600">{formatPercent(anomalyScore)}</p>
                    </div>
                    <div className={cn("rounded-xl p-4", fraudScore < 0.3 ? "bg-green-50" : fraudScore < 0.6 ? "bg-amber-50" : "bg-red-50")}>
                      <div className="flex items-center gap-2 mb-1">
                        <AlertTriangle className={cn("w-4 h-4", fraudScore < 0.3 ? "text-green-600" : fraudScore < 0.6 ? "text-amber-600" : "text-red-600")} />
                        <span className="text-xs text-muted-foreground">Fraud Score</span>
                      </div>
                      <p className={cn("text-3xl font-bold", fraudScore < 0.3 ? "text-green-600" : fraudScore < 0.6 ? "text-amber-600" : "text-red-600")}>
                        {formatPercent(fraudScore)}
                      </p>
                    </div>
                  </div>

                  {claim.ai_summary && (
                    <div className="bg-muted/30 rounded-lg p-4">
                      <h3 className="text-sm font-semibold text-foreground mb-2">AI Summary</h3>
                      <p className="text-sm text-muted-foreground">{claim.ai_summary}</p>
                    </div>
                  )}

                  {settlement && (
                    <div className="bg-primary/5 rounded-lg p-4">
                      <h3 className="text-sm font-semibold text-foreground mb-3">Settlement Calculation</h3>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Decision</span>
                          <Badge variant={settlement.decision === "auto_approve" ? "default" : "secondary"}>
                            {settlement.decision}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Max Payable</span>
                          <span className="font-medium">{formatCurrency(settlement.max_payable_amount)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Co-Payment</span>
                          <span className="font-medium">{formatCurrency(settlement.co_payment_amount)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Insurer Payment</span>
                          <span className="font-bold text-primary">{formatCurrency(settlement.insurer_payment)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="documents" className="space-y-4">
                  {ocrResults.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">No OCR results available</p>
                  ) : (
                    ocrResults.map((ocr, i) => (
                      <div key={i} className="border-l-4 border-l-amber-400 rounded-lg bg-muted/20 p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-amber-600" />
                            <span className="font-semibold text-amber-600">{ocr.document_type || "Document"}</span>
                          </div>
                          <Badge className={cn("text-white", ocr.ocr_confidence >= 90 ? "bg-green-500" : ocr.ocr_confidence >= 50 ? "bg-amber-500" : "bg-red-500")}>
                            {ocr.status}
                          </Badge>
                        </div>
                        <div className="mb-3">
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-muted-foreground">OCR Confidence</span>
                            <span className="font-medium">{ocr.ocr_confidence}%</span>
                          </div>
                          <Progress value={ocr.ocr_confidence} className="h-2" />
                        </div>
                        <div className="text-xs text-muted-foreground">
                          <p>Language: {ocr.language_detected || "Unknown"}</p>
                          <p>Handwritten: {ocr.is_handwritten ? "Yes" : "No"}</p>
                        </div>
                      </div>
                    ))
                  )}
                </TabsContent>

                <TabsContent value="policy" className="space-y-6">
                  <div className="border-l-4 border-l-green-500 rounded-lg bg-muted/20 p-4">
                    <div className="flex items-center gap-2 mb-4">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <h3 className="font-semibold text-foreground">Policy Verification</h3>
                    </div>
                    
                    {policy ? (
                      <>
                        <div className="grid md:grid-cols-2 gap-4 mb-6">
                          <div>
                            <p className="text-xs text-muted-foreground">Policy Number</p>
                            <p className="font-medium text-primary">{policy.policy_number}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Policy Type</p>
                            <Badge>{policy.policy_type}</Badge>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Hospitalization Limit</p>
                            <p className="font-medium">{formatCurrency(policy.hospitalization_limit)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">OPD Limit</p>
                            <p className="font-medium">{formatCurrency(policy.opd_limit)}</p>
                          </div>
                        </div>

                        {validation && (
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-xs text-muted-foreground">Previous Claims Total</span>
                              <span className="font-medium">{formatCurrency(validation.previous_claims_total)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-xs text-muted-foreground">Remaining Coverage</span>
                              <span className="font-medium text-green-600">{formatCurrency(validation.remaining_coverage)}</span>
                            </div>
                            <div className="flex justify-between border-t pt-2">
                              <span className="text-sm font-semibold">Max Payable</span>
                              <span className="font-bold text-primary">{formatCurrency(validation.max_payable_amount)}</span>
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-muted-foreground">Policy data not available</p>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="fraud" className="space-y-6">
                  <div className={cn("border-l-4 rounded-lg bg-muted/20 p-4", fraudScore < 0.3 ? "border-l-green-500" : fraudScore < 0.6 ? "border-l-amber-500" : "border-l-red-500")}>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-foreground">Fraud Analysis</h3>
                      <Badge className={cn("text-white", fraudScore < 0.3 ? "bg-green-500" : fraudScore < 0.6 ? "bg-amber-500" : "bg-red-500")}>
                        {claim.risk_level} Risk
                      </Badge>
                    </div>

                    {fraudResult ? (
                      <>
                        <div className="grid md:grid-cols-2 gap-4 mb-6">
                          <div className={cn("rounded-lg p-4", anomalyScore >= 0.7 ? "bg-green-50" : "bg-amber-50")}>
                            <p className="text-xs text-muted-foreground">Anomaly Score</p>
                            <p className="text-3xl font-bold text-green-600">{formatPercent(anomalyScore)}</p>
                          </div>
                          <div className={cn("rounded-lg p-4", fraudScore < 0.3 ? "bg-green-50" : "bg-red-50")}>
                            <p className="text-xs text-muted-foreground">Fraud Score</p>
                            <p className={cn("text-3xl font-bold", fraudScore < 0.3 ? "text-green-600" : "text-red-600")}>
                              {formatPercent(fraudScore)}
                            </p>
                          </div>
                        </div>

                        {fraudResult.alerts && fraudResult.alerts.length > 0 && (
                          <div className="mb-4">
                            <h4 className="font-semibold text-foreground mb-2">Alerts</h4>
                            <div className="space-y-2">
                              {fraudResult.alerts.map((alert: string, i: number) => (
                                <div key={i} className="flex items-center gap-2 text-sm">
                                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                                  <span className="text-muted-foreground">{alert}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-muted-foreground">Duplicate Check:</span>
                          <Badge variant={fraudResult.duplicate_hash_match ? "destructive" : "secondary"}>
                            {fraudResult.duplicate_hash_match ? "Duplicate Found" : "No Duplicates"}
                          </Badge>
                        </div>

                        {fraudResult.llm_analysis && (
                          <div className="mt-4 bg-muted/30 rounded-lg p-3">
                            <p className="text-xs text-muted-foreground">{fraudResult.llm_analysis}</p>
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-muted-foreground">Fraud analysis not available</p>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="matching" className="space-y-4">
                  {validation ? (
                    <>
                      <div className="border-l-4 border-l-green-500 rounded-lg bg-muted/20 p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-foreground">Prescription vs Diagnosis</span>
                          <Badge className="bg-green-500 text-white">{formatPercent(validation.prescription_diagnosis_score)}</Badge>
                        </div>
                        <Progress value={(validation.prescription_diagnosis_score || 0) * 100} className="h-2" />
                      </div>
                      <div className="border-l-4 border-l-green-500 rounded-lg bg-muted/20 p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-foreground">Prescription vs Bill</span>
                          <Badge className="bg-green-500 text-white">{formatPercent(validation.prescription_bill_score)}</Badge>
                        </div>
                        <Progress value={(validation.prescription_bill_score || 0) * 100} className="h-2" />
                      </div>
                      <div className="border-l-4 border-l-green-500 rounded-lg bg-muted/20 p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-foreground">Diagnosis vs Treatment</span>
                          <Badge className="bg-green-500 text-white">{formatPercent(validation.diagnosis_treatment_score)}</Badge>
                        </div>
                        <Progress value={(validation.diagnosis_treatment_score || 0) * 100} className="h-2" />
                      </div>
                      <div className="border-l-4 border-l-green-500 rounded-lg bg-muted/20 p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-foreground">Billing vs Policy</span>
                          <Badge className="bg-green-500 text-white">{formatPercent(validation.billing_policy_score)}</Badge>
                        </div>
                        <Progress value={(validation.billing_policy_score || 0) * 100} className="h-2" />
                      </div>
                    </>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">No validation data available</p>
                  )}
                </TabsContent>
              </Tabs>
            </div>

            {/* Assessor Notes */}
            <div className="glass-card p-6">
              <h2 className="text-lg font-semibold text-foreground mb-1">Assessor Notes</h2>
              <p className="text-xs text-muted-foreground mb-4">Add your review notes</p>
              <Textarea
                placeholder="Enter your assessment notes here..."
                value={assessorNotes}
                onChange={(e) => setAssessorNotes(e.target.value)}
                className="min-h-[100px] mb-4"
              />
              
              {claim.status === "pending" && (
                <>
                  <h3 className="text-sm font-semibold text-foreground mb-2">Rejection Reason (if rejecting)</h3>
                  <Textarea
                    placeholder="Enter rejection reason..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="min-h-[80px]"
                  />
                </>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="glass-card p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">{t.quickActions}</h2>
              <div className="space-y-3">
                <Button 
                  variant="success" 
                  className="w-full"
                  onClick={handleApprove}
                  disabled={processing || claim.status !== "pending"}
                >
                  {processing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                  {t.approveClaim}
                </Button>
                <Button 
                  variant="destructive" 
                  className="w-full"
                  onClick={handleReject}
                  disabled={processing || claim.status !== "pending"}
                >
                  {processing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <XCircle className="w-4 h-4 mr-2" />}
                  {t.rejectClaim}
                </Button>
              </div>
            </div>

            {/* Submitted Documents */}
            <div className="glass-card p-6">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-foreground">Submitted Documents</h2>
                <p className="text-xs text-muted-foreground">{documents.length} documents uploaded</p>
              </div>
              <div className="space-y-3">
                {documents.map((doc, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-red-100 flex items-center justify-center">
                        <FileText className="w-4 h-4 text-red-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-primary">{doc.file_name}</p>
                        <p className="text-xs text-muted-foreground">{doc.file_type}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {doc.ocr_confidence && (
                        <Badge variant="outline" className="text-xs">{doc.ocr_confidence}%</Badge>
                      )}
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Settlement Summary */}
            {settlement && (
              <div className="glass-card p-6">
                <h2 className="text-lg font-semibold text-foreground mb-4">Settlement Summary</h2>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Claimed Amount</span>
                    <span className="font-medium">{formatCurrency(claim.claim_amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Max Payable</span>
                    <span className="font-medium">{formatCurrency(settlement.max_payable_amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Deductible</span>
                    <span className="font-medium">-{formatCurrency(settlement.deductible_amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Co-Payment</span>
                    <span className="font-medium">-{formatCurrency(settlement.co_payment_amount)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-sm font-semibold">Insurer Payment</span>
                    <span className="font-bold text-primary">{formatCurrency(settlement.insurer_payment)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminClaimReview;
