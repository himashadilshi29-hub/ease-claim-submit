import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, User, FileText, CheckCircle, Eye, Download, Clock, AlertTriangle, Building, Calendar, XCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/shared/Navbar";
import { cn } from "@/lib/utils";

const AdminClaimReview = () => {
  const navigate = useNavigate();
  const { claimId } = useParams();
  const [assessorNotes, setAssessorNotes] = useState("");

  // Mock claim data - OPD focused
  const claimData = {
    id: claimId || "CR123455",
    status: "pending",
    patientName: "John Perera",
    memberId: "123456789V",
    policyNumber: "POL-2025-5678",
    claimAmount: "LKR 125,000",
    submittedDate: "2025-01-15 10:30 AM",
    medicalProvider: "National Hospital",
    diagnosis: "Appendectomy",
    treatmentDuration: "3 days",
  };

  const documentAnalysis = [
    { 
      name: "Claim Form", 
      status: "verified", 
      accuracy: 98,
      checks: [
        { text: "Document type classified correctly", passed: true },
        { text: "Key fields extracted successfully", passed: true },
        { text: "No duplicate detected", passed: true },
      ]
    },
    { 
      name: "Discharge Summary", 
      status: "verified", 
      accuracy: 97,
      checks: [
        { text: "Document type classified correctly", passed: true },
        { text: "Key fields extracted successfully", passed: true },
        { text: "No duplicate detected", passed: true },
      ]
    },
    { 
      name: "Hospital Bill", 
      status: "verified", 
      accuracy: 99,
      checks: [
        { text: "Document type classified correctly", passed: true },
        { text: "Key fields extracted successfully", passed: true },
        { text: "No duplicate detected", passed: true },
      ]
    },
    { 
      name: "Prescription", 
      status: "verified", 
      accuracy: 96,
      checks: [
        { text: "Document type classified correctly", passed: true },
        { text: "Key fields extracted successfully", passed: true },
        { text: "No duplicate detected", passed: true },
      ]
    },
    { 
      name: "Lab Reports", 
      status: "verified", 
      accuracy: 95,
      checks: [
        { text: "Document type classified correctly", passed: true },
        { text: "Key fields extracted successfully", passed: true },
        { text: "No duplicate detected", passed: true },
      ]
    },
  ];

  const policyData = {
    policyNumber: "POL-2025-5678",
    policyStatus: "Active",
    claimType: "OPD",
    coverageType: "Family Health Plan",
    annualLimit: "LKR 500,000",
    previousClaimsTotal: "LKR 45,000",
    remainingCoverage: "LKR 455,000",
    currentClaimAmount: "LKR 125,000",
    maxPayable: "LKR 125,000",
    memberVerification: [
      { text: "Member is covered under the policy", passed: true },
      { text: "Relationship verified: Self", passed: true },
      { text: "Policy is active and valid", passed: true },
      { text: "Procedure is covered", passed: true },
    ],
    coveredItems: ["Appendectomy", "Room Charges", "Surgery Fee", "Anesthesia", "Lab Tests", "Medication"],
  };

  const fraudAnalysis = {
    riskLevel: "Low Risk",
    anomalyScore: 0.92,
    fraudRiskScore: 0.8,
    historicalComparison: [
      { text: "Claim amount within normal range for procedure", passed: true },
      { text: "Treatment duration is appropriate (3 days)", passed: true },
      { text: "No duplicate claims detected", passed: true },
      { text: "Normal claim frequency for this member", passed: true },
    ],
    riskIndicators: [
      { label: "Claim Amount Deviation", status: "Within $", color: "green" },
      { label: "Hospital Pattern", status: "Normal", color: "green" },
      { label: "Doctor Pattern", status: "Normal", color: "green" },
      { label: "Member History", status: "Clean", color: "green" },
    ],
    duplicateCheck: [
      { text: "Hash based matching: No duplicates found", passed: true },
      { text: "Content based matching: Pass", passed: true },
      { text: "No previous claims for same procedure", passed: true },
    ],
    recommendation: "This claim shows no signs of fraud. All validations passed successfully. Recommended for auto approval based on high confidence score (92%).",
  };

  const matchingData = [
    {
      title: "Prescription vs Diagnosis",
      percentage: 95,
      status: "Valid",
      description: "Prescribed medicines match diagnosed condition appropriately",
      checks: [
        { text: "Paracetamol appropriate for post surgery pain management", passed: true },
        { text: "Antibiotics match surgical procedure requirements", passed: true },
        { text: "All medicines are relevant to appendectomy recovery", passed: true },
      ],
    },
    {
      title: "Prescription vs Bill",
      percentage: 93,
      status: "Valid",
      description: "Billed items match prescribed medicines and quantities",
      checks: [
        { text: "All billed medicines are in prescription", passed: true },
        { text: "Quantities match prescribed dosages", passed: true },
        { text: "No non-covered or cosmetic drugs detected", passed: true },
      ],
    },
    {
      title: "Diagnosis vs Treatments",
      percentage: 90,
      status: "Valid",
      description: "Treatment procedures align with diagnosis",
      checks: [
        { text: "Surgery type matches diagnosis (Appendectomy)", passed: true },
        { text: "Lab reports support diagnosis", passed: true },
        { text: "Hospital stay duration is appropriate", passed: true },
      ],
    },
    {
      title: "Billing vs Policy Limits",
      percentage: 94,
      status: "Valid",
      description: "Claim amount within policy coverage limits",
      checks: [
        { text: "Total claim amount within annual limit", passed: true },
        { text: "Room charges within policy allowance", passed: true },
        { text: "Surgery fees within coverage limits", passed: true },
      ],
    },
  ];

  const aiAnalysis = {
    overallScore: 92,
    documentsVerified: "5/5",
    fraudRisk: "Low",
    fraudRiskScore: "0.8%",
    processingSteps: [
      { title: "Document Verification Complete", description: "All required documents validated with 98% OCR accuracy", completed: true },
      { title: "Policy Eligibility Confirmed", description: "Active policy with sufficient coverage for appendectomy", completed: true },
      { title: "Amount Validation Passed", description: "Claim amount within expected range for procedure (3-day stay)", completed: true },
      { title: "Duplicate Check", description: "No duplicate claims found in the system", completed: true },
      { title: "Fraud Pattern Analysis", description: "No suspicious patterns detected", completed: true },
    ],
  };

  const documents = [
    { name: "Claim Form.pdf", type: "claim form", size: "245 KB" },
    { name: "Discharge Summary.pdf", type: "discharge", size: "189 KB" },
    { name: "Hospital Bill.pdf", type: "bill", size: "312 KB" },
    { name: "Prescription.pdf", type: "prescription", size: "156 KB" },
    { name: "Lab Reports.pdf", type: "reports", size: "423 KB" },
  ];

  const handleDownload = (fileName: string) => {
    const content = `This is a mock PDF content for ${fileName}`;
    const blob = new Blob([content], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: "bg-amber-100 text-amber-700",
      approved: "bg-green-100 text-green-700",
      rejected: "bg-red-100 text-red-700",
      "info-requested": "bg-blue-100 text-blue-700",
    };
    const labels: Record<string, string> = {
      pending: t.pendingReview,
      approved: t.approved,
      rejected: t.rejected,
      "info-requested": t.requestMoreInfo,
    };
    return (
      <span className={cn("px-3 py-1 rounded-full text-xs font-medium", styles[status] || styles.pending)}>
        {labels[status] || labels.pending}
      </span>
    );
  };

  const getDocStatusColor = (status: string) => {
    return status === "verified" ? "bg-green-500" : "bg-red-500";
  };

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
              <p className="text-sm text-muted-foreground">Reference: {claimData.id}</p>
            </div>
          </div>
          {getStatusBadge(claimStatus)}
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
                    <p className="text-xs text-muted-foreground">Patient Name</p>
                    <p className="font-medium text-primary">{claimData.patientName}</p>
                    <p className="text-xs text-muted-foreground">{claimData.memberId}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <FileText className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Policy Number</p>
                    <p className="font-medium text-primary">{claimData.policyNumber}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Calendar className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Submitted</p>
                    <p className="font-medium text-foreground">{claimData.submittedDate}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-muted-foreground font-bold text-sm">$</span>
                  <div>
                    <p className="text-xs text-muted-foreground">Claim Amount</p>
                    <p className="font-bold text-primary text-lg">{claimData.claimAmount}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Building className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Medical Provider</p>
                    <p className="font-medium text-primary">{claimData.medicalProvider}</p>
                  </div>
                </div>
                <div className="col-span-1">
                  <div className="flex gap-6">
                    <div>
                      <p className="text-xs text-muted-foreground">Diagnosis</p>
                      <p className="font-medium text-foreground">{claimData.diagnosis}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Treatment Duration</p>
                      <p className="font-medium text-foreground">{claimData.treatmentDuration}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* AI Analysis & Verification */}
            <div className="glass-card p-6">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-foreground">AI Analysis & Verification</h2>
                <p className="text-xs text-muted-foreground">Automated checks and validations performed by the AI system</p>
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
                  {/* Score Cards */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-green-50 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-xs text-muted-foreground">Overall Score</span>
                      </div>
                      <p className="text-3xl font-bold text-green-600">{aiAnalysis.overallScore}%</p>
                      <p className="text-xs text-muted-foreground">High Confidence</p>
                    </div>
                    <div className="bg-green-50 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <FileText className="w-4 h-4 text-green-600" />
                        <span className="text-xs text-muted-foreground">Documents</span>
                      </div>
                      <p className="text-3xl font-bold text-green-600">{aiAnalysis.documentsVerified}</p>
                      <p className="text-xs text-muted-foreground">All Verified</p>
                    </div>
                    <div className="bg-green-50 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <AlertTriangle className="w-4 h-4 text-green-600" />
                        <span className="text-xs text-muted-foreground">Fraud Risk</span>
                      </div>
                      <p className="text-3xl font-bold text-green-600">{aiAnalysis.fraudRisk}</p>
                      <p className="text-xs text-muted-foreground">{aiAnalysis.fraudRiskScore} Risk Score</p>
                    </div>
                  </div>

                  {/* AI Processing Summary */}
                  <div>
                    <h3 className="text-sm font-semibold text-foreground mb-3">AI Processing Summary</h3>
                    <div className="space-y-3">
                      {aiAnalysis.processingSteps.map((step, i) => (
                        <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                          <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                          <div>
                            <p className="font-medium text-foreground text-sm">{step.title}</p>
                            <p className="text-xs text-muted-foreground">{step.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="documents" className="space-y-4">
                  {documentAnalysis.map((doc, i) => (
                    <div key={i} className="border-l-4 border-l-amber-400 rounded-lg bg-muted/20 p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-amber-600" />
                          <span className="font-semibold text-amber-600">{doc.name}</span>
                        </div>
                        <Badge className={cn("text-white", getDocStatusColor(doc.status))}>
                          {doc.status === "verified" ? "Verified" : "Failed"}
                        </Badge>
                      </div>
                      <div className="mb-3">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-muted-foreground">OCR Accuracy</span>
                          <span className="font-medium">{doc.accuracy}%</span>
                        </div>
                        <Progress value={doc.accuracy} className="h-2" />
                      </div>
                      <div className="space-y-1">
                        {doc.checks.map((check, j) => (
                          <div key={j} className="flex items-center gap-2 text-xs">
                            <CheckCircle2 className="w-3 h-3 text-green-600" />
                            <span className="text-muted-foreground">{check.text}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </TabsContent>

                <TabsContent value="policy" className="space-y-6">
                  <div className="border-l-4 border-l-green-500 rounded-lg bg-muted/20 p-4">
                    <div className="flex items-center gap-2 mb-4">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <h3 className="font-semibold text-foreground">Policy Verification Status</h3>
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-4 mb-6">
                      <div>
                        <p className="text-xs text-amber-600">Policy Number</p>
                        <p className="font-medium text-amber-600">{policyData.policyNumber}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Policy Status</p>
                        <Badge className="bg-green-500 text-white">{policyData.policyStatus}</Badge>
                      </div>
                      <div>
                        <p className="text-xs text-amber-600">Claim Type</p>
                        <p className="font-medium text-amber-600">{policyData.claimType}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Coverage Type</p>
                        <p className="font-medium text-primary">{policyData.coverageType}</p>
                      </div>
                    </div>

                    <h4 className="font-semibold text-foreground mb-3">Coverage Details</h4>
                    <div className="space-y-2 mb-6">
                      <div className="flex justify-between">
                        <span className="text-xs text-amber-600">Annual Limit</span>
                        <span className="font-medium">{policyData.annualLimit}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-amber-600">Previous Claims Total</span>
                        <span className="font-medium">{policyData.previousClaimsTotal}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-amber-600">Remaining Coverage</span>
                        <span className="font-medium text-green-600">{policyData.remainingCoverage}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-amber-600">Current Claim Amount</span>
                        <span className="font-medium">{policyData.currentClaimAmount}</span>
                      </div>
                      <div className="flex justify-between border-t pt-2">
                        <span className="text-sm font-semibold">Max Payable</span>
                        <span className="font-bold text-primary">{policyData.maxPayable}</span>
                      </div>
                    </div>

                    <h4 className="font-semibold text-foreground mb-3">Member Verification</h4>
                    <div className="space-y-2 mb-6">
                      {policyData.memberVerification.map((item, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                          <span className="text-muted-foreground">{item.text}</span>
                        </div>
                      ))}
                    </div>

                    <h4 className="font-semibold text-foreground mb-3">Covered Items</h4>
                    <div className="flex flex-wrap gap-2">
                      {policyData.coveredItems.map((item, i) => (
                        <Badge key={i} variant="outline" className="border-amber-400 text-amber-600">
                          {item}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="fraud" className="space-y-6">
                  <div className="border-l-4 border-l-green-500 rounded-lg bg-muted/20 p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <h3 className="font-semibold text-foreground">Fraud Analysis Report</h3>
                      </div>
                      <Badge className="bg-green-500 text-white">{fraudAnalysis.riskLevel}</Badge>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4 mb-6">
                      <div className="bg-green-50 rounded-lg p-4">
                        <p className="text-xs text-amber-600">Anomaly Score</p>
                        <p className="text-3xl font-bold text-green-600">{fraudAnalysis.anomalyScore}</p>
                        <p className="text-xs text-muted-foreground">High confidence</p>
                      </div>
                      <div className="bg-green-50 rounded-lg p-4">
                        <p className="text-xs text-amber-600">Fraud Risk Score</p>
                        <p className="text-3xl font-bold text-green-600">{fraudAnalysis.fraudRiskScore}</p>
                        <p className="text-xs text-muted-foreground">Very low risk</p>
                      </div>
                    </div>

                    <h4 className="font-semibold text-amber-600 mb-3">Historical Comparison</h4>
                    <div className="space-y-2 mb-6">
                      {fraudAnalysis.historicalComparison.map((item, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                          <span className="text-muted-foreground">{item.text}</span>
                        </div>
                      ))}
                    </div>

                    <h4 className="font-semibold text-foreground mb-3">Risk Indicators</h4>
                    <div className="grid md:grid-cols-2 gap-3 mb-6">
                      {fraudAnalysis.riskIndicators.map((indicator, i) => (
                        <div key={i} className="flex items-center justify-between">
                          <span className="text-xs text-amber-600">{indicator.label}</span>
                          <Badge className={cn("text-white", indicator.color === "green" ? "bg-green-500" : "bg-red-500")}>
                            {indicator.status}
                          </Badge>
                        </div>
                      ))}
                    </div>

                    <h4 className="font-semibold text-foreground mb-3">Duplicate Check</h4>
                    <div className="space-y-2 mb-6">
                      {fraudAnalysis.duplicateCheck.map((item, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                          <span className="text-muted-foreground">{item.text}</span>
                        </div>
                      ))}
                    </div>

                    <div className="bg-green-50 border-l-4 border-l-green-500 rounded-lg p-4">
                      <h4 className="font-semibold text-green-700 mb-2">AI Recommendation</h4>
                      <p className="text-sm text-green-700">{fraudAnalysis.recommendation}</p>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="matching" className="space-y-4">
                  <h3 className="font-semibold text-foreground mb-4">Document Cross-Validation Report</h3>
                  {matchingData.map((match, i) => (
                    <div key={i} className="border-l-4 border-l-green-500 rounded-lg bg-muted/20 p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-amber-600">{match.title}</span>
                          <Badge variant="outline" className="text-xs border-green-500 text-green-600">{Math.round(match.percentage * 0.9 + 10)}%</Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-foreground">{match.percentage}%</span>
                          <Badge className="bg-green-500 text-white">{match.status}</Badge>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mb-3">{match.description}</p>
                      <Progress value={match.percentage} className="h-2 mb-3" />
                      <div className="space-y-1">
                        {match.checks.map((check, j) => (
                          <div key={j} className="flex items-center gap-2 text-xs">
                            <CheckCircle2 className="w-3 h-3 text-green-600" />
                            <span className="text-muted-foreground">{check.text}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
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
                className="min-h-[120px]"
              />
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
                  disabled={actionTaken}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  {t.approveClaim}
                </Button>
                <Button 
                  variant="destructive" 
                  className="w-full"
                  onClick={handleReject}
                  disabled={actionTaken}
                >
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  {t.rejectClaim}
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full border-amber-400 text-amber-600 hover:bg-amber-50"
                  onClick={handleRequestInfo}
                  disabled={actionTaken}
                >
                  <Clock className="w-4 h-4 mr-2" />
                  {t.requestMoreInfo}
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
                        <p className="text-sm font-medium text-primary">{doc.name}</p>
                        <p className="text-xs text-muted-foreground">{doc.type}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={() => handleDownload(doc.name)}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminClaimReview;
