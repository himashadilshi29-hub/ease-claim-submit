import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, CheckCircle, Upload, X, Globe } from "lucide-react";
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
import Logo from "@/components/shared/Logo";
import LanguageSelector from "@/components/shared/LanguageSelector";
import { cn } from "@/lib/utils";

const STEPS = ["Language", "Verify", "Details", "Upload", "Complete"];

const BranchPortal = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [language, setLanguage] = useState("");
  const [formData, setFormData] = useState({
    policyNumber: "",
    claimType: "",
    relationship: "",
    bankAccount: "",
  });
  const [documents, setDocuments] = useState<File[]>([]);
  const [referenceNumber, setReferenceNumber] = useState("");

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
    setReferenceNumber(`CR${Math.floor(Math.random() * 100000).toString().padStart(6, "0")}`);
    nextStep();
  };

  const handleReset = () => {
    setCurrentStep(0);
    setLanguage("");
    setFormData({ policyNumber: "", claimType: "", relationship: "", bankAccount: "" });
    setDocuments([]);
    setReferenceNumber("");
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
          <div className="mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              Customer Portal - Branch
            </h1>
            <p className="text-muted-foreground mt-1">
              Submit your claim with AI-powered verification
            </p>
          </div>

          {/* Step Indicator */}
          <div className="flex justify-between items-center mb-8">
            {STEPS.map((step, i) => (
              <div key={i} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      "step-circle",
                      i < currentStep && "step-circle-completed",
                      i === currentStep && "step-circle-active",
                      i > currentStep && "step-circle-pending"
                    )}
                  >
                    {i < currentStep ? <CheckCircle className="w-5 h-5" /> : i + 1}
                  </div>
                  <span className="text-xs text-muted-foreground mt-1 hidden md:block">{step}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={cn("w-12 md:w-24 h-0.5 mx-2", i < currentStep ? "bg-success" : "bg-border")} />
                )}
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
                    <h2 className="text-xl font-bold text-foreground">Select Language</h2>
                    <div className="grid md:grid-cols-3 gap-4">
                      {[
                        { code: "en", label: "English" },
                        { code: "si", label: "සිංහල (Sinhala)" },
                        { code: "ta", label: "தமிழ் (Tamil)" },
                      ].map((lang) => (
                        <button
                          key={lang.code}
                          onClick={() => {
                            setLanguage(lang.code);
                            nextStep();
                          }}
                          className={cn(
                            "p-6 rounded-xl border-2 text-center transition-all hover:border-primary hover:bg-secondary",
                            language === lang.code ? "border-primary bg-secondary" : "border-border"
                          )}
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
                    <h2 className="text-xl font-bold text-foreground">Verify Policy</h2>
                    <div>
                      <Label>Policy Number / Mobile Number</Label>
                      <Input
                        placeholder="Enter policy or mobile number"
                        value={formData.policyNumber}
                        onChange={(e) => updateFormData("policyNumber", e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div className="flex gap-3">
                      <Button variant="outline" onClick={prevStep}>Back</Button>
                      <Button variant="hero" onClick={nextStep} disabled={!formData.policyNumber}>
                        Next
                      </Button>
                    </div>
                  </div>
                )}

                {/* Step 2: Claim Details */}
                {currentStep === 2 && (
                  <div className="space-y-6">
                    <h2 className="text-xl font-bold text-foreground">Claim Details</h2>
                    <div className="space-y-4">
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
                        <Label>Relationship *</Label>
                        <Select value={formData.relationship} onValueChange={(v) => updateFormData("relationship", v)}>
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Select relationship" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="self">Self</SelectItem>
                            <SelectItem value="spouse">Spouse</SelectItem>
                            <SelectItem value="child">Child</SelectItem>
                            <SelectItem value="parent">Parent</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Bank Account Number</Label>
                        <Input
                          placeholder="1234567890 (BOC)"
                          value={formData.bankAccount}
                          onChange={(e) => updateFormData("bankAccount", e.target.value)}
                          className="mt-1"
                        />
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <Button variant="outline" onClick={prevStep}>Back</Button>
                      <Button
                        variant="hero"
                        onClick={nextStep}
                        disabled={!formData.claimType || !formData.relationship}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}

                {/* Step 3: Upload Documents */}
                {currentStep === 3 && (
                  <div className="space-y-6">
                    <h2 className="text-xl font-bold text-foreground">Upload Documents</h2>
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
                        <p className="text-sm text-muted-foreground mt-1">Supports PDF, JPG, PNG</p>
                      </label>
                    </div>

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

                {/* Step 4: Success */}
                {currentStep === 4 && (
                  <div className="text-center py-8">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-20 h-20 rounded-full bg-success flex items-center justify-center mx-auto mb-6"
                    >
                      <CheckCircle className="w-10 h-10 text-white" />
                    </motion.div>
                    <h2 className="text-2xl font-bold text-foreground mb-2">Claim Submitted Successfully!</h2>
                    <div className="bg-muted rounded-xl p-4 inline-block mb-4">
                      <p className="text-sm text-muted-foreground">Claim Reference Number:</p>
                      <p className="text-xl font-bold text-primary">{referenceNumber}</p>
                    </div>
                    <p className="text-muted-foreground mb-6">
                      We will review your claim and notify you via SMS within 24 hours.
                    </p>
                    <Button variant="hero" onClick={handleReset} className="w-full max-w-xs">
                      Submit Another Claim
                    </Button>
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
