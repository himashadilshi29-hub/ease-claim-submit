import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  CheckCircle, Upload, X, Globe, Loader2, 
  AlertCircle, FileText, Brain, Shield, Calculator 
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
import Logo from "@/components/shared/Logo";
import LanguageSelector from "@/components/shared/LanguageSelector";
import { cn } from "@/lib/utils";
import { useLanguage, Language } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";

// Input validation schemas
const nicRegex = /^([0-9]{9}[vVxX]|[0-9]{12})$/;
const policyRegex = /^POL-?[0-9]{4}-?[0-9]{3,6}$/i;

const nicOrPolicySchema = z.string()
  .min(1, "NIC or Policy number is required")
  .max(50, "Input too long")
  .refine(
    (val) => nicRegex.test(val) || policyRegex.test(val),
    "Please enter a valid NIC (9 digits + V/X or 12 digits) or Policy number (e.g., POL-2024-001)"
  );

const claimAmountSchema = z.string()
  .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, "Claim amount must be a positive number")
  .refine((val) => parseFloat(val) <= 10000000, "Claim amount exceeds maximum limit");

interface Policy {
  id: string;
  policy_number: string;
  policy_type: string;
  holder_name: string;
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

interface UploadedDoc {
  file: File;
  status: 'uploading' | 'processing' | 'accepted' | 'error';
  ocrConfidence?: number;
  documentType?: string;
}

const BranchPortal = () => {
  const navigate = useNavigate();
  const { t, setLanguage } = useLanguage();
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [members, setMembers] = useState<PolicyMember[]>([]);
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);
  const [selectedMember, setSelectedMember] = useState<PolicyMember | null>(null);
  
  const [formData, setFormData] = useState({
    nicOrPolicy: "",
    policyId: "",
    claimType: "",
    hospitalizationType: "",
    memberId: "",
    mobileNumber: "",
    bankName: "",
    accountNumber: "",
    hospitalName: "",
    doctorName: "",
    diagnosis: "",
    admissionDate: "",
    dischargeDate: "",
    dateOfTreatment: "",
    claimAmount: "",
  });
  
  const [documents, setDocuments] = useState<UploadedDoc[]>([]);
  const [referenceNumber, setReferenceNumber] = useState("");
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingStatus, setProcessingStatus] = useState("");
  const [aiResults, setAiResults] = useState<any>(null);

  const STEPS = [t.stepLanguage, t.stepVerify, t.stepDetails, t.stepUpload, t.stepComplete];

  // Verify policy when NIC/Policy number is entered
  const verifyPolicy = async () => {
    if (!formData.nicOrPolicy) return;
    
    // Validate input before querying
    const validationResult = nicOrPolicySchema.safeParse(formData.nicOrPolicy);
    if (!validationResult.success) {
      toast.error(validationResult.error.errors[0].message);
      return;
    }
    
    setIsLoading(true);
    try {
      // Use separate queries instead of string interpolation
      const sanitizedInput = formData.nicOrPolicy.trim();
      
      const { data: byPolicy } = await supabase
        .from("policies")
        .select("*")
        .eq("policy_number", sanitizedInput)
        .eq("is_active", true);
      
      const { data: byNic } = await supabase
        .from("policies")
        .select("*")
        .eq("holder_nic", sanitizedInput)
        .eq("is_active", true);
      
      const data = [...(byPolicy || []), ...(byNic || [])];
      
      if (data && data.length > 0) {
        setPolicies(data);
        setSelectedPolicy(data[0]);
        setFormData(prev => ({ ...prev, policyId: data[0].id }));
        toast.success("Policy verified successfully!");
        nextStep();
      } else {
        toast.error("No active policy found with this NIC/Policy number");
      }
    } catch (error) {
      toast.error("Unable to verify policy. Please try again.");
    }
    setIsLoading(false);
  };

  // Fetch members when policy is selected
  useEffect(() => {
    const fetchMembers = async () => {
      if (!formData.policyId) return;
      
      const { data } = await supabase
        .from("policy_members")
        .select("*")
        .eq("policy_id", formData.policyId);
      
      if (data) setMembers(data);
    };
    fetchMembers();
  }, [formData.policyId]);

  // Auto-fill member details
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
    // Validate claim amount before submission
    const amountValidation = claimAmountSchema.safeParse(formData.claimAmount);
    if (!amountValidation.success) {
      toast.error(amountValidation.error.errors[0].message);
      return;
    }

    setIsLoading(true);
    setCurrentStep(4);
    setProcessingStatus("Creating claim...");
    setProcessingProgress(10);

    try {
      // Create claim for branch submissions
      const claimData: any = {
        policy_number: selectedPolicy?.policy_number || formData.nicOrPolicy,
        claim_type: formData.claimType,
        relationship: selectedMember?.relationship || "self",
        claim_amount: parseFloat(formData.claimAmount),
        diagnosis: formData.diagnosis?.substring(0, 500),
        hospital_name: formData.hospitalName?.substring(0, 255),
        doctor_name: formData.doctorName?.substring(0, 255),
        mobile_number: formData.mobileNumber?.substring(0, 20),
        bank_name: formData.bankName?.substring(0, 100),
        account_number: formData.accountNumber?.substring(0, 50),
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

      if (claimError) {
        if (claimError.message.includes("user_id")) {
          toast.error("Branch submissions require authentication. Please use the Digital Portal.");
          setIsLoading(false);
          return;
        }
        throw claimError;
      }

      setReferenceNumber(claim.reference_number);
      setProcessingProgress(30);
      setProcessingStatus("Uploading documents...");

      // Upload documents
      for (let i = 0; i < documents.length; i++) {
        const doc = documents[i];
        const fileName = `${claim.id}/${Date.now()}-${doc.file.name}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("claim-documents")
          .upload(fileName, doc.file);

        if (!uploadError && uploadData) {
          await supabase.from("claim_documents").insert({
            claim_id: claim.id,
            file_name: doc.file.name,
            file_path: uploadData.path,
            file_type: doc.file.type,
            file_size: doc.file.size,
          });

          setDocuments(prev => prev.map((d, idx) => 
            idx === i ? { ...d, status: 'processing' } : d
          ));
        }

        setProcessingProgress(30 + ((i + 1) / documents.length) * 30);
      }

      setProcessingProgress(60);
      setProcessingStatus("Running AI analysis...");

      // Trigger AI pipeline
      const { data: pipelineResult, error: pipelineError } = await supabase.functions
        .invoke("process-claim-pipeline", {
          body: { claimId: claim.id },
        });

      if (!pipelineError) {
        setAiResults(pipelineResult);
      }

      setProcessingProgress(100);
      setProcessingStatus("Complete!");
      toast.success("Claim submitted successfully!");
    } catch (error) {
      toast.error("Failed to submit claim. Please try again.");
    }
    setIsLoading(false);
  };

  const handleReset = () => {
    setCurrentStep(0);
    setFormData({
      nicOrPolicy: "",
      policyId: "",
      claimType: "",
      hospitalizationType: "",
      memberId: "",
      mobileNumber: "",
      bankName: "",
      accountNumber: "",
      hospitalName: "",
      doctorName: "",
      diagnosis: "",
      admissionDate: "",
      dischargeDate: "",
      dateOfTreatment: "",
      claimAmount: "",
    });
    setDocuments([]);
    setReferenceNumber("");
    setPolicies([]);
    setMembers([]);
    setSelectedPolicy(null);
    setSelectedMember(null);
    setAiResults(null);
    setProcessingProgress(0);
  };

  const handleLanguageSelect = (langCode: Language) => {
    setLanguage(langCode);
    nextStep();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="bg-gradient-to-r from-orange-500 to-amber-400 sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Logo variant="dark" onClick={() => navigate("/")} />
          <LanguageSelector variant="dark" />
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              {t.customerPortalBranch}
            </h1>
            <p className="text-muted-foreground mt-1">
              {t.submitWithAI}
            </p>
          </div>

          {/* Step Indicator */}
          <div className="flex justify-center items-center gap-4 md:gap-8 mb-8">
            {STEPS.map((step, i) => (
              <div key={i} className="flex flex-col items-center">
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300",
                    i < currentStep && "gradient-primary text-white shadow-md",
                    i === currentStep && "gradient-primary text-white shadow-lg",
                    i > currentStep && "bg-white border-2 border-border text-muted-foreground"
                  )}
                >
                  {i < currentStep ? <CheckCircle className="w-5 h-5" /> : i + 1}
                </div>
                <span className={cn(
                  "text-xs mt-2 hidden md:block",
                  i === currentStep ? "text-primary font-medium" : "text-muted-foreground"
                )}>
                  {step}
                </span>
              </div>
            ))}
          </div>

          {/* Wizard Content */}
          <div className="glass-card p-6 md:p-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                {/* Step 0: Language Selection */}
                {currentStep === 0 && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-xl font-bold text-foreground">{t.selectLanguage}</h2>
                      <p className="text-sm text-muted-foreground mt-1">{t.selectLanguageDesc}</p>
                    </div>
                    <div className="grid md:grid-cols-3 gap-4">
                      {[
                        { code: "en" as Language, label: t.langEnglish },
                        { code: "si" as Language, label: t.langSinhala },
                        { code: "ta" as Language, label: t.langTamil },
                      ].map((lang) => (
                        <button
                          key={lang.code}
                          onClick={() => handleLanguageSelect(lang.code)}
                          className="p-6 rounded-xl border-2 border-border text-center transition-all hover:border-primary hover:bg-secondary"
                        >
                          <Globe className="w-8 h-8 text-primary mx-auto mb-2" />
                          <p className="font-semibold text-foreground">{lang.label}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Step 1: Verify Policy */}
                {currentStep === 1 && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-xl font-bold text-foreground">{t.verifyPolicy}</h2>
                      <p className="text-sm text-muted-foreground mt-1">{t.verifyPolicyDesc}</p>
                    </div>
                    <div>
                      <Label>{t.labelNICPolicy}</Label>
                      <Input
                        placeholder={t.placeholderNICPolicy}
                        value={formData.nicOrPolicy}
                        onChange={(e) => updateFormData("nicOrPolicy", e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    
                    {selectedPolicy && (
                      <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle className="w-5 h-5 text-green-600" />
                          <span className="font-medium text-green-700">Policy Verified</span>
                        </div>
                        <div className="text-sm text-green-600 space-y-1">
                          <p>Policy: {selectedPolicy.policy_number}</p>
                          <p>Holder: {selectedPolicy.holder_name}</p>
                          <p>Type: {selectedPolicy.policy_type}</p>
                          <p>HOSP Limit: LKR {selectedPolicy.hospitalization_limit?.toLocaleString()}</p>
                          <p>OPD Limit: LKR {selectedPolicy.opd_limit?.toLocaleString()}</p>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex gap-3">
                      <Button variant="outline" onClick={prevStep}>{t.btnBack}</Button>
                      <Button 
                        variant="hero" 
                        onClick={verifyPolicy} 
                        disabled={!formData.nicOrPolicy || isLoading}
                      >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        {t.btnContinue}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Step 2: Claim Details */}
                {currentStep === 2 && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-xl font-bold text-foreground">{t.claimDetails}</h2>
                      <p className="text-sm text-muted-foreground mt-1">{t.claimDetailsDesc}</p>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <Label>{t.labelClaimType} *</Label>
                        <Select value={formData.claimType} onValueChange={(v) => updateFormData("claimType", v)}>
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder={t.placeholderClaimType} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="opd">{t.claimTypeOPD}</SelectItem>
                            <SelectItem value="dental">{t.claimTypeDental}</SelectItem>
                            <SelectItem value="spectacles">{t.claimTypeSpectacles}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {/* OPD specific fields */}
                      {formData.claimType && (
                        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                          <p className="text-sm text-blue-700">
                            <strong>OPD Claim Requirements:</strong> Prescription + Medical Bill are mandatory. 
                            Lab reports and channelling bills are optional.
                          </p>
                        </div>
                      )}
                      
                      <div>
                        <Label>{t.labelRelationship} *</Label>
                        <Select value={formData.memberId} onValueChange={(v) => updateFormData("memberId", v)}>
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder={t.placeholderRelationship} />
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
                      
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <Label>Hospital Name *</Label>
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
                        <Label>Diagnosis *</Label>
                        <Input
                          placeholder="Enter diagnosis"
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
                      
                      <div>
                        <Label>{t.labelBankAccount}</Label>
                        <Input
                          placeholder={t.placeholderBankAccount}
                          value={formData.accountNumber}
                          onChange={(e) => updateFormData("accountNumber", e.target.value)}
                          className="mt-1"
                        />
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <Button variant="outline" onClick={prevStep}>{t.btnBack}</Button>
                      <Button
                        variant="hero"
                        onClick={nextStep}
                        disabled={!formData.claimType || !formData.memberId || !formData.claimAmount}
                      >
                        {t.btnContinue}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Step 3: Upload Documents */}
                {currentStep === 3 && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-xl font-bold text-foreground">{t.uploadDocuments}</h2>
                      <p className="text-sm text-muted-foreground mt-1">{t.uploadDocumentsDesc}</p>
                    </div>
                    
                    {/* Required Documents Info */}
                    <div className="bg-muted rounded-lg p-4">
                      <h4 className="font-medium text-foreground mb-2">Required Documents</h4>
                      <div className="grid md:grid-cols-2 gap-2 text-sm">
                        {formData.claimType === "hospitalization" ? (
                          <>
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-primary" />
                              <span>Claim Form (with doctor signature)</span>
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
                        <p className="text-foreground font-medium">{t.dragDropFiles}</p>
                        <p className="text-sm text-muted-foreground mt-1">{t.supportedFormats}</p>
                      </label>
                    </div>

                    {documents.length > 0 && (
                      <div className="space-y-2">
                        {documents.map((doc, i) => (
                          <div key={i} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                            <div className="flex items-center gap-3">
                              <FileText className="w-5 h-5 text-muted-foreground" />
                              <span className="text-sm text-foreground">{doc.file.name}</span>
                              {doc.status === 'processing' && (
                                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                              )}
                              {doc.status === 'accepted' && (
                                <CheckCircle className="w-4 h-4 text-green-500" />
                              )}
                            </div>
                            <button onClick={() => removeFile(i)}>
                              <X className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-3">
                      <Button variant="outline" onClick={prevStep}>{t.btnBack}</Button>
                      <Button 
                        variant="hero" 
                        onClick={handleSubmit}
                        disabled={documents.length === 0 || isLoading}
                      >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        {t.btnSubmitClaim2}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Step 4: Success / Processing */}
                {currentStep === 4 && (
                  <div className="text-center py-8">
                    {isLoading ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                          className="w-20 h-20 rounded-full gradient-primary flex items-center justify-center mx-auto mb-6"
                        >
                          <Brain className="w-10 h-10 text-white" />
                        </motion.div>
                        <h2 className="text-xl font-bold text-foreground mb-2">AI Processing Your Claim</h2>
                        <p className="text-muted-foreground mb-4">{processingStatus}</p>
                        <Progress value={processingProgress} className="max-w-md mx-auto" />
                      </>
                    ) : (
                      <>
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className={cn(
                            "w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6",
                            aiResults?.pipeline_results?.decision === "auto_approve" ? "bg-green-500" :
                            aiResults?.pipeline_results?.decision === "reject" ? "bg-red-500" : "bg-amber-500"
                          )}
                        >
                          {aiResults?.pipeline_results?.decision === "auto_approve" ? (
                            <CheckCircle className="w-10 h-10 text-white" />
                          ) : aiResults?.pipeline_results?.decision === "reject" ? (
                            <X className="w-10 h-10 text-white" />
                          ) : (
                            <AlertCircle className="w-10 h-10 text-white" />
                          )}
                        </motion.div>
                        
                        <h2 className="text-2xl font-bold text-foreground mb-2">{t.claimSubmitted}</h2>
                        <div className="bg-muted rounded-xl p-4 inline-block mb-4">
                          <p className="text-sm text-muted-foreground">{t.claimReference}</p>
                          <p className="text-xl font-bold text-primary">{referenceNumber}</p>
                        </div>

                        {/* AI Results */}
                        {aiResults?.pipeline_results && (
                          <div className="max-w-md mx-auto space-y-4 mb-6 text-left">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="bg-muted rounded-lg p-4 text-center">
                                <Brain className="w-5 h-5 text-primary mx-auto mb-2" />
                                <p className="text-2xl font-bold">
                                  {Math.round((aiResults.pipeline_results.validation_score || 0) * 100)}%
                                </p>
                                <p className="text-xs text-muted-foreground">Validation Score</p>
                              </div>
                              <div className={cn(
                                "rounded-lg p-4 text-center",
                                aiResults.pipeline_results.fraud_score >= 0.7 ? "bg-red-100" :
                                aiResults.pipeline_results.fraud_score >= 0.4 ? "bg-amber-100" : "bg-green-100"
                              )}>
                                <Shield className="w-5 h-5 text-primary mx-auto mb-2" />
                                <p className={cn(
                                  "text-2xl font-bold",
                                  aiResults.pipeline_results.fraud_score >= 0.7 ? "text-red-600" :
                                  aiResults.pipeline_results.fraud_score >= 0.4 ? "text-amber-600" : "text-green-600"
                                )}>
                                  {aiResults.pipeline_results.fraud_score >= 0.7 ? "High" :
                                   aiResults.pipeline_results.fraud_score >= 0.4 ? "Medium" : "Low"}
                                </p>
                                <p className="text-xs text-muted-foreground">Fraud Risk</p>
                              </div>
                            </div>
                            
                            {aiResults.pipeline_results.decision === "auto_approve" && (
                              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                <div className="flex items-center gap-2 mb-2">
                                  <Calculator className="w-4 h-4 text-green-600" />
                                  <span className="text-sm text-green-600">Approved Amount</span>
                                </div>
                                <p className="text-2xl font-bold text-green-600">
                                  LKR {aiResults.pipeline_results.insurer_payment?.toLocaleString()}
                                </p>
                              </div>
                            )}
                          </div>
                        )}

                        <p className="text-muted-foreground mb-6">
                          {t.claimReviewMsg}
                        </p>
                        <Button variant="hero" onClick={handleReset} className="w-full max-w-xs">
                          {t.btnSubmitAnother}
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  );
};

export default BranchPortal;
