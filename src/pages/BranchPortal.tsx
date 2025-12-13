import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, Upload, X, Globe } from "lucide-react";
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
import { useLanguage, Language } from "@/lib/i18n";

const BranchPortal = () => {
  const navigate = useNavigate();
  const { t, setLanguage } = useLanguage();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    policyNumber: "",
    claimType: "",
    relationship: "",
    bankAccount: "",
  });
  const [documents, setDocuments] = useState<File[]>([]);
  const [referenceNumber, setReferenceNumber] = useState("");

  const STEPS = [t.stepLanguage, t.stepVerify, t.stepDetails, t.stepUpload, t.stepComplete];

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
    setFormData({ policyNumber: "", claimType: "", relationship: "", bankAccount: "" });
    setDocuments([]);
    setReferenceNumber("");
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
          {/* Header - Centered */}
          <div className="text-center mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              {t.customerPortalBranch}
            </h1>
            <p className="text-muted-foreground mt-1">
              {t.submitWithAI}
            </p>
          </div>

          {/* Step Indicator - Centered Circles */}
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
                  {i < currentStep ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    i + 1
                  )}
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
                        value={formData.policyNumber}
                        onChange={(e) => updateFormData("policyNumber", e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div className="flex gap-3">
                      <Button variant="outline" onClick={prevStep}>{t.btnBack}</Button>
                      <Button variant="hero" onClick={nextStep} disabled={!formData.policyNumber}>
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
                            <SelectItem value="spectacles">{t.claimTypeSpectacles}</SelectItem>
                            <SelectItem value="dental">{t.claimTypeDental}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>{t.labelRelationship} *</Label>
                        <Select value={formData.relationship} onValueChange={(v) => updateFormData("relationship", v)}>
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder={t.placeholderRelationship} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="self">{t.relationSelf}</SelectItem>
                            <SelectItem value="spouse">{t.relationSpouse}</SelectItem>
                            <SelectItem value="child">{t.relationChild}</SelectItem>
                            <SelectItem value="parent">{t.relationParent}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>{t.labelBankAccount}</Label>
                        <Input
                          placeholder={t.placeholderBankAccount}
                          value={formData.bankAccount}
                          onChange={(e) => updateFormData("bankAccount", e.target.value)}
                          className="mt-1"
                        />
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <Button variant="outline" onClick={prevStep}>{t.btnBack}</Button>
                      <Button
                        variant="hero"
                        onClick={nextStep}
                        disabled={!formData.claimType || !formData.relationship}
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
                      <Button variant="outline" onClick={prevStep}>{t.btnBack}</Button>
                      <Button variant="hero" onClick={handleSubmit}>
                        {t.btnSubmitClaim2}
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
                    <h2 className="text-2xl font-bold text-foreground mb-2">{t.claimSubmitted}</h2>
                    <div className="bg-muted rounded-xl p-4 inline-block mb-4">
                      <p className="text-sm text-muted-foreground">{t.claimReference}</p>
                      <p className="text-xl font-bold text-primary">{referenceNumber}</p>
                    </div>
                    <p className="text-muted-foreground mb-6">
                      {t.claimReviewMsg}
                    </p>
                    <Button variant="hero" onClick={handleReset} className="w-full max-w-xs">
                      {t.btnSubmitAnother}
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
