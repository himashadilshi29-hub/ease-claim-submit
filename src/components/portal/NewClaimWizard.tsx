import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, CheckCircle, Plus, Upload, X, Loader2, 
  AlertCircle, FileText, RefreshCw, Brain, Shield, Calculator
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface NewClaimWizardProps {
  onComplete: () => void;
}

interface Policy {
  id: string;
  policy_number: string;
  policy_type: string;
  hospitalization_limit: number;
  opd_limit: number;
}

interface PolicyMember {
  id: string;
  member_name: string;
  relationship: string;
  bank_name: string;
  account_number: string;
  mobile_number: string;
}

interface UploadedDocument {
  file: File;
  status: 'uploading' | 'processing' | 'accepted' | 'reupload_required' | 'rejected' | 'error';
  ocrConfidence?: number;
  documentType?: string;
  issues?: string[];
}

const STEPS = ["Policy Selection", "Claim Details", "Documents Upload", "AI Processing"];

const NewClaimWizard = ({ onComplete }: NewClaimWizardProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [members, setMembers] = useState<PolicyMember[]>([]);
  const [selectedMember, setSelectedMember] = useState<PolicyMember | null>(null);
  
  const [formData, setFormData] = useState({
    policyId: "",
    claimType: "",
    hospitalizationType: "",
    memberId: "",
    mobileNumber: "",
    accountNumber: "",
    bankName: "",
    dateOfTreatment: "",
    admissionDate: "",
    dischargeDate: "",
    hospitalName: "",
    doctorName: "",
    diagnosis: "",
    claimAmount: "",
  });
  
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [claimReference, setClaimReference] = useState("");
  const [processingStatus, setProcessingStatus] = useState<string>("");
  const [processingProgress, setProcessingProgress] = useState(0);
  const [aiResults, setAiResults] = useState<any>(null);

  // Fetch user's policies
  useEffect(() => {
    const fetchPolicies = async () => {
      // For demo, fetch all policies - in production, filter by user
      const { data, error } = await supabase
        .from("policies")
        .select("*")
        .eq("is_active", true);
      
      if (data) {
        setPolicies(data);
      }
    };
    fetchPolicies();
  }, []);

  // Fetch policy members when policy is selected
  useEffect(() => {
    const fetchMembers = async () => {
      if (!formData.policyId) return;
      
      const { data, error } = await supabase
        .from("policy_members")
        .select("*")
        .eq("policy_id", formData.policyId);
      
      if (data) {
        setMembers(data);
      }
    };
    fetchMembers();
  }, [formData.policyId]);

  // Auto-fill member details when member is selected
  useEffect(() => {
    if (formData.memberId && members.length > 0) {
      const member = members.find(m => m.id === formData.memberId);
      if (member) {
        setSelectedMember(member);
        setFormData(prev => ({
          ...prev,
          mobileNumber: member.mobile_number || "",
          bankName: member.bank_name || "",
          accountNumber: member.account_number || "",
        }));
      }
    }
  }, [formData.memberId, members]);

  const updateFormData = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).map(file => ({
        file,
        status: 'uploading' as const,
      }));
      setDocuments(prev => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setDocuments((prev) => prev.filter((_, i) => i !== index));
  };

  const nextStep = () => setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1));
  const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 0));

  const handleSubmit = async () => {
    if (!user) {
      toast.error("Please log in to submit a claim");
      return;
    }

    setIsLoading(true);
    setCurrentStep(3); // Move to AI Processing step
    setProcessingStatus("Creating claim...");
    setProcessingProgress(10);

    try {
      // Create the claim
      const claimData: any = {
        user_id: user.id,
        policy_number: policies.find(p => p.id === formData.policyId)?.policy_number || "",
        claim_type: formData.claimType,
        relationship: selectedMember?.relationship || "self",
        claim_amount: parseFloat(formData.claimAmount) || 0,
        diagnosis: formData.diagnosis,
        hospital_name: formData.hospitalName,
        doctor_name: formData.doctorName,
        mobile_number: formData.mobileNumber,
        bank_name: formData.bankName,
        account_number: formData.accountNumber,
      };

      if (formData.policyId) claimData.policy_id = formData.policyId;
      if (formData.memberId) claimData.member_id = formData.memberId;
      if (formData.hospitalizationType) claimData.hospitalization_type = formData.hospitalizationType;
      if (formData.dateOfTreatment) claimData.date_of_treatment = formData.dateOfTreatment;
      if (formData.admissionDate) claimData.admission_date = formData.admissionDate;
      if (formData.dischargeDate) claimData.discharge_date = formData.dischargeDate;

      const { data: claim, error: claimError } = await supabase
        .from("claims")
        .insert(claimData)
        .select()
        .single();

      if (claimError) throw claimError;

      setClaimReference(claim.reference_number);
      setProcessingProgress(25);
      setProcessingStatus("Uploading documents...");

      // Upload documents
      for (let i = 0; i < documents.length; i++) {
        const doc = documents[i];
        const fileName = `${claim.id}/${Date.now()}-${doc.file.name}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("claim-documents")
          .upload(fileName, doc.file);

        if (uploadError) {
          console.error("Upload error:", uploadError);
          continue;
        }

        // Create document record
        const { data: docRecord, error: docError } = await supabase
          .from("claim_documents")
          .insert({
            claim_id: claim.id,
            file_name: doc.file.name,
            file_path: uploadData.path,
            file_type: doc.file.type,
            file_size: doc.file.size,
          })
          .select()
          .single();

        if (docRecord) {
          setDocuments(prev => prev.map((d, idx) => 
            idx === i ? { ...d, status: 'processing' } : d
          ));
        }

        setProcessingProgress(25 + ((i + 1) / documents.length) * 25);
      }

      setProcessingProgress(50);
      setProcessingStatus("Running AI document analysis...");

      // Trigger the AI processing pipeline
      const { data: pipelineResult, error: pipelineError } = await supabase.functions
        .invoke("process-claim-pipeline", {
          body: { claimId: claim.id },
        });

      if (pipelineError) {
        console.error("Pipeline error:", pipelineError);
        // Continue anyway - claim is created
      }

      setProcessingProgress(100);
      setAiResults(pipelineResult);
      setProcessingStatus("Complete!");
      setIsSubmitted(true);

      toast.success("Claim submitted successfully!");
    } catch (error) {
      console.error("Submission error:", error);
      toast.error("Failed to submit claim. Please try again.");
      setIsLoading(false);
    }
  };

  const progress = ((currentStep + 1) / STEPS.length) * 100;

  if (isSubmitted) {
    const decision = aiResults?.pipeline_results?.decision || "pending";
    const insurerPayment = aiResults?.pipeline_results?.insurer_payment || 0;
    const validationScore = aiResults?.pipeline_results?.validation_score || 0;
    const fraudScore = aiResults?.pipeline_results?.fraud_score || 0;

    return (
      <div className="glass-card p-8">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className={cn(
            "w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6",
            decision === "auto_approve" ? "bg-green-500" :
            decision === "reject" ? "bg-red-500" : "bg-amber-500"
          )}
        >
          {decision === "auto_approve" ? (
            <CheckCircle className="w-10 h-10 text-white" />
          ) : decision === "reject" ? (
            <X className="w-10 h-10 text-white" />
          ) : (
            <AlertCircle className="w-10 h-10 text-white" />
          )}
        </motion.div>
        
        <h2 className="text-2xl font-bold text-foreground mb-2 text-center">
          {decision === "auto_approve" ? "Claim Approved!" :
           decision === "reject" ? "Claim Rejected" : "Claim Under Review"}
        </h2>
        
        <div className="bg-muted rounded-xl p-4 mb-6 text-center">
          <p className="text-sm text-muted-foreground">Reference Number:</p>
          <p className="text-xl font-bold text-primary">{claimReference}</p>
        </div>

        {/* AI Processing Results */}
        <div className="space-y-4 mb-6">
          <h3 className="font-semibold text-foreground">AI Analysis Summary</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-muted rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Brain className="w-4 h-4 text-primary" />
                <span className="text-sm text-muted-foreground">Validation Score</span>
              </div>
              <p className="text-2xl font-bold text-foreground">
                {Math.round((validationScore || 0) * 100)}%
              </p>
            </div>
            
            <div className="bg-muted rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-primary" />
                <span className="text-sm text-muted-foreground">Fraud Risk</span>
              </div>
              <p className={cn(
                "text-2xl font-bold",
                fraudScore >= 0.7 ? "text-red-500" :
                fraudScore >= 0.4 ? "text-amber-500" : "text-green-500"
              )}>
                {fraudScore >= 0.7 ? "High" : fraudScore >= 0.4 ? "Medium" : "Low"}
              </p>
            </div>
          </div>

          {decision === "auto_approve" && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Calculator className="w-4 h-4 text-green-600" />
                <span className="text-sm text-green-600">Approved Amount</span>
              </div>
              <p className="text-2xl font-bold text-green-600">
                LKR {insurerPayment.toLocaleString()}
              </p>
            </div>
          )}
        </div>

        <Button variant="hero" onClick={onComplete} className="w-full">
          View My Claims
        </Button>
      </div>
    );
  }

  // AI Processing Step
  if (currentStep === 3 && isLoading) {
    return (
      <div className="glass-card p-8">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-20 h-20 rounded-full gradient-primary flex items-center justify-center mx-auto mb-6"
          >
            <Brain className="w-10 h-10 text-white" />
          </motion.div>
          
          <h2 className="text-xl font-bold text-foreground mb-2">AI Processing Your Claim</h2>
          <p className="text-muted-foreground mb-6">{processingStatus}</p>
          
          <Progress value={processingProgress} className="mb-4" />
          
          <div className="space-y-3 text-left max-w-md mx-auto">
            <div className="flex items-center gap-3">
              {processingProgress >= 10 ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              )}
              <span className={processingProgress >= 10 ? "text-foreground" : "text-muted-foreground"}>
                Creating claim record
              </span>
            </div>
            
            <div className="flex items-center gap-3">
              {processingProgress >= 50 ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : processingProgress >= 25 ? (
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              ) : (
                <div className="w-5 h-5 rounded-full border-2 border-muted-foreground" />
              )}
              <span className={processingProgress >= 25 ? "text-foreground" : "text-muted-foreground"}>
                Uploading & OCR processing documents
              </span>
            </div>
            
            <div className="flex items-center gap-3">
              {processingProgress >= 75 ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : processingProgress >= 50 ? (
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              ) : (
                <div className="w-5 h-5 rounded-full border-2 border-muted-foreground" />
              )}
              <span className={processingProgress >= 50 ? "text-foreground" : "text-muted-foreground"}>
                Validating claim & checking policy
              </span>
            </div>
            
            <div className="flex items-center gap-3">
              {processingProgress >= 90 ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : processingProgress >= 75 ? (
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              ) : (
                <div className="w-5 h-5 rounded-full border-2 border-muted-foreground" />
              )}
              <span className={processingProgress >= 75 ? "text-foreground" : "text-muted-foreground"}>
                Fraud detection & anomaly analysis
              </span>
            </div>
            
            <div className="flex items-center gap-3">
              {processingProgress >= 100 ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : processingProgress >= 90 ? (
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              ) : (
                <div className="w-5 h-5 rounded-full border-2 border-muted-foreground" />
              )}
              <span className={processingProgress >= 90 ? "text-foreground" : "text-muted-foreground"}>
                Calculating settlement
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-4 mb-4">
          {currentStep > 0 && (
            <button onClick={prevStep}>
              <ArrowLeft className="w-5 h-5 text-muted-foreground hover:text-foreground" />
            </button>
          )}
          <div>
            <h2 className="text-xl font-bold text-foreground">Submit New Claim</h2>
            <p className="text-sm text-muted-foreground">AI-powered claim submission with instant verification</p>
          </div>
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Step {currentStep + 1} of {STEPS.length}</span>
            <span>{Math.round(progress)}% Complete</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full gradient-primary"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            {STEPS.map((step, i) => (
              <span key={i} className={cn(i === currentStep && "text-primary font-medium")}>
                {step}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Form Content */}
      <div className="glass-card p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            {currentStep === 0 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-1">Step 1: Policy Selection</h3>
                  <p className="text-sm text-muted-foreground">Select your policy and claim type</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label>Select Policy *</Label>
                    <Select value={formData.policyId} onValueChange={(v) => updateFormData("policyId", v)}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select your policy" />
                      </SelectTrigger>
                      <SelectContent>
                        {policies.map((policy) => (
                          <SelectItem key={policy.id} value={policy.id}>
                            {policy.policy_number} - {policy.policy_type} 
                            (HOSP: LKR {policy.hospitalization_limit?.toLocaleString()}, 
                            OPD: LKR {policy.opd_limit?.toLocaleString()})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.policyId && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-green-100 text-green-700">
                      <CheckCircle className="w-4 h-4" />
                      <span className="text-sm font-medium">Policy verified and active</span>
                    </div>
                  )}

                  <div>
                    <Label>Claim Type *</Label>
                    <Select value={formData.claimType} onValueChange={(v) => updateFormData("claimType", v)}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select type of claim" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hospitalization">Hospitalization (HOSP)</SelectItem>
                        <SelectItem value="opd">OPD (Out-Patient)</SelectItem>
                        <SelectItem value="dental">Dental</SelectItem>
                        <SelectItem value="spectacles">Spectacles</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.claimType === "hospitalization" && (
                    <div>
                      <Label>Hospitalization Type *</Label>
                      <Select value={formData.hospitalizationType} onValueChange={(v) => updateFormData("hospitalizationType", v)}>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select hospitalization type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cashless">Cashless</SelectItem>
                          <SelectItem value="reimbursement">Reimbursement</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div>
                    <Label>Claimant (Covered Member) *</Label>
                    <Select value={formData.memberId} onValueChange={(v) => updateFormData("memberId", v)}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select covered member" />
                      </SelectTrigger>
                      <SelectContent>
                        {members.map((member) => (
                          <SelectItem key={member.id} value={member.id}>
                            {member.member_name} ({member.relationship})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={onComplete}>Cancel</Button>
                  <Button
                    variant="hero"
                    onClick={nextStep}
                    disabled={!formData.policyId || !formData.claimType || !formData.memberId}
                  >
                    Continue to Details
                  </Button>
                </div>
              </div>
            )}

            {currentStep === 1 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-1">Step 2: Claim Details</h3>
                  <p className="text-sm text-muted-foreground">Provide treatment and payment details</p>
                </div>

                <div className="space-y-6">
                  {/* Contact Information */}
                  <div>
                    <h4 className="font-medium text-foreground mb-3">Contact & Bank Details</h4>
                    <div className="grid md:grid-cols-3 gap-4">
                      <div>
                        <Label>Mobile Number *</Label>
                        <Input
                          value={formData.mobileNumber}
                          onChange={(e) => updateFormData("mobileNumber", e.target.value)}
                          className="mt-1"
                          placeholder="+94 77 123 4567"
                        />
                      </div>
                      <div>
                        <Label>Bank Name *</Label>
                        <Select value={formData.bankName} onValueChange={(v) => updateFormData("bankName", v)}>
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Select bank" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Bank of Ceylon">Bank of Ceylon</SelectItem>
                            <SelectItem value="People's Bank">People's Bank</SelectItem>
                            <SelectItem value="Commercial Bank">Commercial Bank</SelectItem>
                            <SelectItem value="Hatton National Bank">Hatton National Bank</SelectItem>
                            <SelectItem value="Sampath Bank">Sampath Bank</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Account Number *</Label>
                        <Input
                          placeholder="1234567890"
                          value={formData.accountNumber}
                          onChange={(e) => updateFormData("accountNumber", e.target.value)}
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Treatment Details */}
                  <div>
                    <h4 className="font-medium text-foreground mb-3">Treatment Details</h4>
                    <div className="space-y-4">
                      {formData.claimType === "hospitalization" ? (
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <Label>Admission Date *</Label>
                            <Input
                              type="date"
                              value={formData.admissionDate}
                              onChange={(e) => updateFormData("admissionDate", e.target.value)}
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label>Discharge Date</Label>
                            <Input
                              type="date"
                              value={formData.dischargeDate}
                              onChange={(e) => updateFormData("dischargeDate", e.target.value)}
                              className="mt-1"
                            />
                          </div>
                        </div>
                      ) : (
                        <div>
                          <Label>Date of Treatment *</Label>
                          <Input
                            type="date"
                            value={formData.dateOfTreatment}
                            onChange={(e) => updateFormData("dateOfTreatment", e.target.value)}
                            className="mt-1"
                          />
                        </div>
                      )}
                      
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <Label>Hospital / Clinic Name *</Label>
                          <Input
                            placeholder="Enter hospital name"
                            value={formData.hospitalName}
                            onChange={(e) => updateFormData("hospitalName", e.target.value)}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label>Doctor Name</Label>
                          <Input
                            placeholder="Dr. ..."
                            value={formData.doctorName}
                            onChange={(e) => updateFormData("doctorName", e.target.value)}
                            className="mt-1"
                          />
                        </div>
                      </div>
                      
                      <div>
                        <Label>Diagnosis / Reason for Treatment *</Label>
                        <Input
                          placeholder="Enter diagnosis or reason"
                          value={formData.diagnosis}
                          onChange={(e) => updateFormData("diagnosis", e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      
                      <div>
                        <Label>Claim Amount (LKR) *</Label>
                        <Input
                          type="number"
                          placeholder="0.00"
                          value={formData.claimAmount}
                          onChange={(e) => updateFormData("claimAmount", e.target.value)}
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={prevStep}>Back</Button>
                  <Button
                    variant="hero"
                    onClick={nextStep}
                    disabled={
                      !formData.accountNumber || 
                      !formData.bankName || 
                      !formData.claimAmount ||
                      !formData.hospitalName ||
                      !formData.diagnosis ||
                      (formData.claimType === "hospitalization" ? !formData.admissionDate : !formData.dateOfTreatment)
                    }
                  >
                    Continue to Documents
                  </Button>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-1">Step 3: Upload Documents</h3>
                  <p className="text-sm text-muted-foreground">Upload your claim documents for AI verification</p>
                </div>

                {/* Required Documents Info */}
                <div className="bg-muted rounded-lg p-4">
                  <h4 className="font-medium text-foreground mb-2">Required Documents</h4>
                  <div className="grid md:grid-cols-2 gap-2 text-sm">
                    {formData.claimType === "hospitalization" ? (
                      <>
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-primary" />
                          <span>Claim Form (with doctor's signature)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-primary" />
                          <span>Diagnosis Card</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-primary" />
                          <span>Admission Card</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-primary" />
                          <span>Medical Bill / Invoice</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-primary" />
                          <span>Prescription</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-primary" />
                          <span>Payment Receipt</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-primary" />
                          <span>Prescription</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-primary" />
                          <span>Medical Bill / Invoice</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Upload Zone */}
                <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary transition-colors">
                  <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    multiple
                    onChange={handleFileChange}
                    accept="image/*,.pdf"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-foreground font-medium">Drag & drop files or Browse</p>
                    <p className="text-sm text-muted-foreground mt-1">Supports PDF, JPG, PNG (Max 10MB each)</p>
                  </label>
                </div>

                {/* File List */}
                {documents.length > 0 && (
                  <div className="space-y-2">
                    {documents.map((doc, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-muted-foreground" />
                          <div>
                            <span className="text-sm text-foreground">{doc.file.name}</span>
                            {doc.documentType && (
                              <Badge variant="outline" className="ml-2">{doc.documentType}</Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {doc.status === 'processing' && (
                            <Loader2 className="w-4 h-4 animate-spin text-primary" />
                          )}
                          {doc.status === 'accepted' && (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          )}
                          {doc.status === 'reupload_required' && (
                            <AlertCircle className="w-4 h-4 text-amber-500" />
                          )}
                          <button onClick={() => removeFile(i)}>
                            <X className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-3">
                  <Button variant="outline" onClick={prevStep}>Back</Button>
                  <Button 
                    variant="hero" 
                    onClick={handleSubmit}
                    disabled={documents.length === 0 || isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      "Submit Claim"
                    )}
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default NewClaimWizard;
