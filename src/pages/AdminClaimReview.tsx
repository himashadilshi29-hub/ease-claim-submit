import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, User, FileText, CheckCircle, Eye, Download, Clock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Navbar from "@/components/shared/Navbar";
import { cn } from "@/lib/utils";

const AdminClaimReview = () => {
  const navigate = useNavigate();
  const { claimId } = useParams();
  const [assessorNotes, setAssessorNotes] = useState("");

  // Mock claim data
  const claimData = {
    id: claimId || "CR123455",
    status: "pending",
    patientName: "John Perera",
    policyNumber: "POL-2025-5678",
    claimAmount: "LKR 125,000",
    submittedDate: "2025-01-15 10:30 AM",
    hospital: "National Hospital",
    diagnosis: "Appendectomy",
    lengthOfStay: "3 days",
  };

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
    { name: "Claim Form.pdf", type: "Claim Form", size: "245 KB" },
    { name: "Discharge Summary.pdf", type: "Discharge", size: "189 KB" },
    { name: "Hospital Bill.pdf", type: "Bill", size: "312 KB" },
    { name: "Prescription.pdf", type: "Prescription", size: "156 KB" },
    { name: "Lab Reports.pdf", type: "Reports", size: "423 KB" },
  ];

  const handleDownload = (fileName: string) => {
    // Create a mock file download
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
    const styles = {
      pending: "bg-amber-100 text-amber-700",
      approved: "bg-green-100 text-green-700",
      rejected: "bg-red-100 text-red-700",
    };
    const labels = {
      pending: "Pending Review",
      approved: "Approved",
      rejected: "Rejected",
    };
    return (
      <span className={cn("px-3 py-1 rounded-full text-xs font-medium", styles[status as keyof typeof styles])}>
        {labels[status as keyof typeof labels]}
      </span>
    );
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
          {getStatusBadge(claimData.status)}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Claim Information */}
            <div className="glass-card p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">Claim Information</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <User className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Patient Name</p>
                    <p className="font-medium text-foreground">{claimData.patientName}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <FileText className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Policy Number</p>
                    <p className="font-medium text-foreground">{claimData.policyNumber}</p>
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
                  <Clock className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Submitted</p>
                    <p className="font-medium text-foreground">{claimData.submittedDate}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <FileText className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Hospital</p>
                    <p className="font-medium text-primary">{claimData.hospital}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <FileText className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Diagnosis</p>
                    <p className="font-medium text-primary">{claimData.diagnosis}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Length of Stay</p>
                    <p className="font-medium text-foreground">{claimData.lengthOfStay}</p>
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

                <TabsContent value="documents">
                  <p className="text-muted-foreground">Document verification details...</p>
                </TabsContent>

                <TabsContent value="policy">
                  <p className="text-muted-foreground">Policy matching details...</p>
                </TabsContent>

                <TabsContent value="fraud">
                  <p className="text-muted-foreground">Fraud detection analysis...</p>
                </TabsContent>

                <TabsContent value="matching">
                  <p className="text-muted-foreground">Data matching results...</p>
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
              <h2 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h2>
              <div className="space-y-3">
                <Button variant="success" className="w-full">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve Claim
                </Button>
                <Button variant="destructive" className="w-full">
                  Reject Claim
                </Button>
                <Button variant="outline" className="w-full">
                  <Clock className="w-4 h-4 mr-2" />
                  Request More Info
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
                        <p className="text-sm font-medium text-foreground">{doc.name}</p>
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
