import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, User, FileText, CheckCircle, Clock, Building, Calendar, CreditCard, Phone, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/shared/Navbar";
import { cn } from "@/lib/utils";

const ClaimDetails = () => {
  const navigate = useNavigate();
  const { claimId } = useParams();

  // Mock claim data based on claim ID
  const getClaimData = () => {
    if (claimId === "CR123456") {
      return {
        id: "CR123456",
        status: "approved",
        patientName: "Anil Perera",
        memberId: "987654321V",
        policyNumber: "POL-2024-8899",
        claimType: "OPD",
        relationship: "Self",
        claimedAmount: "LKR 45,000",
        approvedAmount: "LKR 45,000",
        hospital: "Asiri Hospital Colombo",
        diagnosis: "Pneumonia Treatment",
        admissionDate: "2024-10-12",
        dischargeDate: "2024-10-14",
        lengthOfStay: "2 days",
        bankAccount: "1234567890 (BOC)",
        mobileNumber: "+94 77 123 4567",
        rejectionReason: "",
        documents: [
          { name: "Claim Form", status: "verified" },
          { name: "Discharge Summary", status: "verified" },
          { name: "Medical Bill", status: "verified" },
          { name: "Prescription", status: "verified" },
        ],
        aiVerification: { overallScore: 95, documentAccuracy: 98, fraudRisk: "Low" },
        timeline: [
          { title: "Claim Submitted", date: "2024-10-15", completed: true, icon: "submit" },
          { title: "Approved", date: "2024-10-18", completed: true, icon: "approved" },
        ],
      };
    } else if (claimId === "CR123455") {
      return {
        id: "CR123455",
        status: "processing",
        patientName: "Anil Perera",
        memberId: "987654321V",
        policyNumber: "POL-2024-8899",
        claimType: "OPD",
        relationship: "Self",
        claimedAmount: "LKR 12,500",
        approvedAmount: "-",
        hospital: "Nawaloka Hospital",
        diagnosis: "Consultation & Lab Tests",
        admissionDate: "2024-09-20",
        dischargeDate: "2024-09-20",
        lengthOfStay: "Same Day",
        bankAccount: "1234567890 (BOC)",
        mobileNumber: "+94 77 123 4567",
        rejectionReason: "",
        documents: [
          { name: "Claim Form", status: "verified" },
          { name: "Medical Bill", status: "verified" },
          { name: "Lab Reports", status: "processing" },
          { name: "Prescription", status: "verified" },
        ],
        aiVerification: { overallScore: 88, documentAccuracy: 92, fraudRisk: "Low" },
        timeline: [
          { title: "Claim Submitted", date: "2024-09-20", completed: true, icon: "submit" },
        ],
      };
    } else {
      return {
        id: claimId || "CR123454",
        status: "rejected",
        patientName: "Anil Perera",
        memberId: "987654321V",
        policyNumber: "POL-2024-8899",
        claimType: "OPD",
        relationship: "Self",
        claimedAmount: "LKR 25,000",
        approvedAmount: "LKR 0",
        hospital: "Private Medical Center",
        diagnosis: "Surgery Consultation",
        admissionDate: "2024-08-08",
        dischargeDate: "2024-08-09",
        lengthOfStay: "1 day",
        bankAccount: "1234567890 (BOC)",
        mobileNumber: "+94 77 123 4567",
        rejectionReason: "Missing mandatory documents: Discharge summary and medical bill not readable",
        documents: [
          { name: "Claim Form", status: "verified" },
          { name: "Discharge Summary", status: "failed" },
          { name: "Medical Bill", status: "failed" },
          { name: "Prescription", status: "verified" },
        ],
        aiVerification: { overallScore: 42, documentAccuracy: 58, fraudRisk: "Medium" },
        timeline: [
          { title: "Claim Submitted", date: "2024-08-10", completed: true, icon: "submit" },
          { title: "Rejected", date: "2024-08-15", completed: true, icon: "rejected" },
        ],
      };
    }
  };

  const claimData = getClaimData();

  const getStatusBadge = (status: string) => {
    const styles = {
      processing: "bg-amber-100 text-amber-700",
      approved: "bg-green-100 text-green-700",
      rejected: "bg-red-500 text-white",
    };
    const labels = {
      processing: "Processing",
      approved: "Approved",
      rejected: "Rejected",
    };
    const icons = {
      processing: <Clock className="w-3 h-3" />,
      approved: <CheckCircle className="w-3 h-3" />,
      rejected: <XCircle className="w-3 h-3" />,
    };
    return (
      <span className={cn("px-3 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1", styles[status as keyof typeof styles])}>
        {icons[status as keyof typeof icons]}
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  const getDocumentStatusBadge = (status: string) => {
    if (status === "verified") {
      return (
        <Badge className="bg-green-500 text-white">
          <CheckCircle className="w-3 h-3 mr-1" />
          Verified
        </Badge>
      );
    }
    if (status === "processing") {
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

  const getFraudRiskColor = (risk: string) => {
    if (risk === "Low") return "text-green-600";
    if (risk === "Medium") return "text-amber-600";
    return "text-red-500";
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

            {/* Treatment Details */}
            <div className="glass-card p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">Treatment Details</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <Building className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Hospital</p>
                    <p className="font-medium text-primary">{claimData.hospital}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <FileText className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Diagnosis</p>
                    <p className="font-medium text-foreground">{claimData.diagnosis}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Calendar className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Admission Date</p>
                    <p className="font-medium text-foreground">{claimData.admissionDate}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Calendar className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Discharge Date</p>
                    <p className="font-medium text-foreground">{claimData.dischargeDate}</p>
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

            {/* Submitted Documents */}
            <div className="glass-card p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">Submitted Documents</h2>
              <div className="space-y-3">
                {claimData.documents.map((doc, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-border">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-amber-100 flex items-center justify-center">
                        <FileText className="w-4 h-4 text-amber-600" />
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
                  <p className={cn("text-3xl font-bold", getScoreColor(claimData.aiVerification.overallScore))}>
                    {claimData.aiVerification.overallScore}%
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Overall Score</p>
                </div>
                <div className="text-center p-4 rounded-xl bg-muted/30">
                  <p className={cn("text-3xl font-bold", getScoreColor(claimData.aiVerification.documentAccuracy))}>
                    {claimData.aiVerification.documentAccuracy}%
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Document Accuracy</p>
                </div>
                <div className="text-center p-4 rounded-xl bg-muted/30">
                  <p className={cn("text-3xl font-bold", getFraudRiskColor(claimData.aiVerification.fraudRisk))}>
                    {claimData.aiVerification.fraudRisk}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Fraud Risk</p>
                </div>
              </div>
            </div>

            {/* Rejection Reason */}
            {claimData.status === "rejected" && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-red-600 mb-3">Rejection Reason</h2>
                <div className="flex items-start gap-3">
                  <XCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-700">{claimData.rejectionReason}</p>
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
                  <p className="text-2xl font-bold text-primary">{claimData.claimedAmount}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Approved Amount</p>
                  <p className={cn(
                    "text-lg font-bold",
                    claimData.approvedAmount === "LKR 0" ? "text-red-500" : "text-green-600"
                  )}>
                    {claimData.approvedAmount}
                  </p>
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
                    <p className="font-medium text-foreground">{claimData.bankAccount}</p>
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
              <div className="space-y-4">
                {claimData.timeline.map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                      item.icon === "rejected" ? "bg-red-100" : item.icon === "approved" ? "bg-green-100" : "bg-amber-100"
                    )}>
                      {item.icon === "rejected" ? (
                        <XCircle className="w-4 h-4 text-red-500" />
                      ) : item.icon === "approved" ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <FileText className="w-4 h-4 text-amber-600" />
                      )}
                    </div>
                    <div>
                      <p className={cn(
                        "font-medium text-sm",
                        item.icon === "rejected" ? "text-red-600" : item.icon === "approved" ? "text-green-600" : "text-primary"
                      )}>
                        {item.title}
                      </p>
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
