import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, CheckCircle, Plus, Upload, X } from "lucide-react";
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
import { cn } from "@/lib/utils";

interface NewClaimWizardProps {
  onComplete: () => void;
}

const STEPS = ["Policy Selection", "Claim Details", "Documents Upload"];

const NewClaimWizard = ({ onComplete }: NewClaimWizardProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    policy: "",
    claimType: "",
    relationship: "",
    mobileNumber: "+94 77 123 4567",
    accountNumber: "",
    bankName: "",
    dateOfTreatment: "",
    diagnosis: "",
    claimAmount: "",
  });
  const [documents, setDocuments] = useState<File[]>([]);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const updateFormData = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setDocuments((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeFile = (index: number) => {
    setDocuments((prev) => prev.filter((_, i) => i !== index));
  };

  const nextStep = () => setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1));
  const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 0));

  const handleSubmit = () => {
    setIsSubmitted(true);
  };

  const progress = ((currentStep + 1) / STEPS.length) * 100;

  if (isSubmitted) {
    return (
      <div className="glass-card p-8 text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-20 h-20 rounded-full bg-success flex items-center justify-center mx-auto mb-6"
        >
          <CheckCircle className="w-10 h-10 text-white" />
        </motion.div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Claim Submitted Successfully!</h2>
        <p className="text-muted-foreground mb-4">Your claim has been submitted for processing.</p>
        <div className="bg-muted rounded-xl p-4 mb-6">
          <p className="text-sm text-muted-foreground">Reference Number:</p>
          <p className="text-xl font-bold text-primary">CR{Math.floor(Math.random() * 100000).toString().padStart(6, "0")}</p>
        </div>
        <Button variant="hero" onClick={onComplete} className="w-full">
          View My Claims
        </Button>
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
                  <h3 className="text-lg font-semibold mb-1">Step 1: Policy Selection & Basic Information</h3>
                  <p className="text-sm text-muted-foreground">Select your policy and provide claimant details</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label>Select Policy *</Label>
                    <Select value={formData.policy} onValueChange={(v) => updateFormData("policy", v)}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select your policy" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="POL-2024-8899">POL-2024-8899 - Family Health Plan</SelectItem>
                        <SelectItem value="POL-2024-7788">POL-2024-7788 - Individual Health Plan</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.policy && (
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
                        <SelectItem value="opd">OPD (Out-Patient)</SelectItem>
                        <SelectItem value="spectacles">Spectacles</SelectItem>
                        <SelectItem value="dental">Dental</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Relationship with Insured (Claimant) *</Label>
                    <Select value={formData.relationship} onValueChange={(v) => updateFormData("relationship", v)}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select your relationship" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="self">Self</SelectItem>
                        <SelectItem value="spouse">Spouse</SelectItem>
                        <SelectItem value="child">Child</SelectItem>
                        <SelectItem value="parent">Parent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={onComplete}>Cancel</Button>
                  <Button
                    variant="hero"
                    onClick={nextStep}
                    disabled={!formData.policy || !formData.claimType || !formData.relationship}
                  >
                    Continue to Details
                  </Button>
                </div>
              </div>
            )}

            {currentStep === 1 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-1">Step 2: Contact & Treatment Details</h3>
                  <p className="text-sm text-muted-foreground">Provide your contact information and treatment details</p>
                </div>

                <div className="space-y-6">
                  {/* Contact Information */}
                  <div>
                    <h4 className="font-medium text-foreground mb-3">Contact Information</h4>
                    <div>
                      <Label>Mobile Number *</Label>
                      <Input
                        value={formData.mobileNumber}
                        onChange={(e) => updateFormData("mobileNumber", e.target.value)}
                        className="mt-1"
                      />
                    </div>
                  </div>

                  {/* Bank Account Details */}
                  <div>
                    <h4 className="font-medium text-foreground mb-3">Bank Account Details</h4>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label>Account Number *</Label>
                        <Input
                          placeholder="1234567890"
                          value={formData.accountNumber}
                          onChange={(e) => updateFormData("accountNumber", e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label>Bank Name *</Label>
                        <Select value={formData.bankName} onValueChange={(v) => updateFormData("bankName", v)}>
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Select bank" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="boc">Bank of Ceylon</SelectItem>
                            <SelectItem value="peoples">People's Bank</SelectItem>
                            <SelectItem value="commercial">Commercial Bank</SelectItem>
                            <SelectItem value="hnb">Hatton National Bank</SelectItem>
                            <SelectItem value="sampath">Sampath Bank</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Treatment Details */}
                  <div>
                    <h4 className="font-medium text-foreground mb-3">Treatment Details</h4>
                    <div className="space-y-4">
                      <div>
                        <Label>Date of Treatment *</Label>
                        <Input
                          type="date"
                          value={formData.dateOfTreatment}
                          onChange={(e) => updateFormData("dateOfTreatment", e.target.value)}
                          className="mt-1"
                        />
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
                    disabled={!formData.accountNumber || !formData.bankName || !formData.dateOfTreatment || !formData.claimAmount}
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
                    {documents.map((file, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <span className="text-sm text-foreground">{file.name}</span>
                        <button onClick={() => removeFile(i)}>
                          <X className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-3">
                  <Button variant="outline" onClick={prevStep}>Back</Button>
                  <Button variant="hero" onClick={handleSubmit}>
                    Submit Claim
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
