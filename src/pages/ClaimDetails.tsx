import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, User, FileText, CheckCircle, Clock, Building, Calendar, CreditCard, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/shared/Navbar";
import { cn } from "@/lib/utils";

const ClaimDetails = () => {
  const navigate = useNavigate();
  const { claimId } = useParams();

  // Mock claim data
  const claimData = {
    id: claimId || "CR123455",
    status: "processing",
    patientName: "Anil Perera",
    policyNumber: "POL-2024-8899",
    nic: "981564321V",
    claimType: "OPD",
    relationship: "Self",
    claimedAmount: "LKR 12,500",
    approvedAmount: "-",
    medicalProvider: "Nawaloka Hospital",
    reasonForVisit: "Consultation & Lab Tests",
    visitDate: "2024-09-20",
    attendingDoctor: "Dr. Samantha Fernando",
    bankAccount: "1234567890 (BOC)",
    mobileNumber: "+94 77 123 4567",
  };

  const documents = [
    { name: "Claim Form", status: "verified" },
    { name: "Medical Bill", status: "verified" },
    { name: "Lab Reports", status: "processing" },
    { name: "Prescription", status: "verified" },
  ];

  const aiVerification = {
    overallScore: 88,
    documentAccuracy: 92,
    fraudRisk: "Low",
  };

  const timeline = [
    { title: "Claim Submitted", date: "2024-09-20", completed: true },
  ];

  const getStatusBadge = (status: string) => {
    const styles = {
      processing: "bg-amber-100 text-amber-700",
      approved: "bg-green-100 text-green-700",
      rejected: "bg-red-100 text-red-700",
    };
    const labels = {
      processing: "Processing",
      approved: "Approved",
      rejected: "Rejected",
    };
    return (
      <span className={cn("px-3 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1", styles[status as keyof typeof styles])}>
        <Clock className="w-3 h-3" />
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  const getDocumentStatusBadge = (status: string) => {
    if (status === "verified") {
      return (
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 inline-flex items-center gap-1">
          <CheckCircle className="w-3 h-3" />
          Verified
        </span>
      );
    }
    return (
      <span className="px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 inline-flex items-center gap-1">
        <Clock className="w-3 h-3" />
        Processing
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
            <Button variant="ghost" size="icon" onClick={() => navigate("/digital-portal")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Claim Details</h1>
              <p className="text-sm text-muted-foreground">Reference: {claimData.id}</p>
            </div>
          </div>
          {getStatusBadge(claimData.status)}
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
                    <p className="font-medium text-foreground">{claimData.patientName}</p>
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
                  <FileText className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">NIC</p>
                    <p className="font-medium text-foreground">{claimData.nic}</p>
                  </div>
                </div>
                <div />
                <div className="flex items-start gap-3">
                  <FileText className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Claim Type</p>
                    <p className="font-medium text-foreground">{claimData.claimType}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <User className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Relationship</p>
                    <p className="font-medium text-foreground">{claimData.relationship}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Medical Details */}
            <div className="glass-card p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">Medical Details</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <Building className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Medical Provider</p>
                    <p className="font-medium text-primary">{claimData.medicalProvider}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <FileText className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Reason for Visit</p>
                    <p className="font-medium text-primary">{claimData.reasonForVisit}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Calendar className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Visit Date</p>
                    <p className="font-medium text-foreground">{claimData.visitDate}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <User className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Attending Doctor</p>
                    <p className="font-medium text-foreground">{claimData.attendingDoctor}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Submitted Documents */}
            <div className="glass-card p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">Submitted Documents</h2>
              <div className="space-y-3">
                {documents.map((doc, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-border">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-red-100 flex items-center justify-center">
                        <FileText className="w-4 h-4 text-red-600" />
                      </div>
                      <p className="font-medium text-foreground">{doc.name}</p>
                    </div>
                    {getDocumentStatusBadge(doc.status)}
                  </div>
                ))}
              </div>
            </div>

            {/* AI Verification Status */}
            <div className="glass-card p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">AI Verification Status</h2>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 rounded-xl bg-muted/30">
                  <p className="text-3xl font-bold text-primary">{aiVerification.overallScore}%</p>
                  <p className="text-xs text-muted-foreground mt-1">Overall Score</p>
                </div>
                <div className="text-center p-4 rounded-xl bg-muted/30">
                  <p className="text-3xl font-bold text-primary">{aiVerification.documentAccuracy}%</p>
                  <p className="text-xs text-muted-foreground mt-1">Document Accuracy</p>
                </div>
                <div className="text-center p-4 rounded-xl bg-muted/30">
                  <p className="text-3xl font-bold text-green-600">{aiVerification.fraudRisk}</p>
                  <p className="text-xs text-muted-foreground mt-1">Fraud Risk</p>
                </div>
              </div>
            </div>
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
                  <p className="text-2xl font-bold text-primary">{claimData.claimedAmount}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Approved Amount</p>
                  <p className="text-lg font-medium text-foreground">{claimData.approvedAmount}</p>
                </div>
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
                    <p className="font-medium text-primary">{claimData.bankAccount}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Mobile Number</p>
                    <p className="font-medium text-foreground">{claimData.mobileNumber}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Claim Timeline */}
            <div className="glass-card p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">Claim Timeline</h2>
              <div className="space-y-3">
                {timeline.map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-3 h-3 rounded-full bg-primary mt-1" />
                    <div>
                      <p className="font-medium text-primary text-sm">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.date}</p>
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

export default ClaimDetails;
