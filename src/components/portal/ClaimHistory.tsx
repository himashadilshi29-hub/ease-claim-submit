import { useNavigate } from "react-router-dom";
import { CheckCircle, Clock, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const ClaimHistory = () => {
  const navigate = useNavigate();
  
  const claims = [
    {
      id: "CR123456",
      status: "approved",
      type: "Hospitalization",
      date: "2024-10-15",
      amount: "LKR 45,000",
    },
    {
      id: "CR123455",
      status: "processing",
      type: "OPD",
      date: "2024-09-20",
      amount: "LKR 12,500",
    },
    {
      id: "CR123454",
      status: "rejected",
      type: "Hospitalization",
      date: "2024-08-10",
      amount: "LKR 25,000",
      reason: "Missing documents",
    },
  ];

  const quickStats = [
    { label: "Approved", value: 2, bgColor: "bg-green-100", textColor: "text-green-600" },
    { label: "Processing", value: 1, bgColor: "bg-amber-100", textColor: "text-amber-600" },
    { label: "Total Claimed", value: "LKR 57,500", bgColor: "bg-secondary", textColor: "text-primary" },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case "processing":
        return <Clock className="w-5 h-5 text-amber-600" />;
      case "rejected":
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      approved: "bg-green-100 text-green-700",
      processing: "bg-amber-100 text-amber-700",
      rejected: "bg-red-100 text-red-700",
    };
    return (
      <span className={cn("px-2 py-1 rounded-full text-xs font-medium capitalize", styles[status as keyof typeof styles])}>
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Claim History */}
      <div className="glass-card p-6">
        <h2 className="text-xl font-bold text-foreground mb-2">Claim History</h2>
        <p className="text-sm text-muted-foreground mb-6">View and track all your submitted claims</p>

        <div className="space-y-4">
          {claims.map((claim) => (
            <div
              key={claim.id}
              className="flex items-start justify-between p-4 rounded-xl border border-border hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-start gap-3">
                {getStatusIcon(claim.status)}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">{claim.id}</span>
                    {getStatusBadge(claim.status)}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {claim.type} • {claim.date}
                  </p>
                  {claim.reason && (
                    <p className="text-sm text-primary mt-1">Reason: {claim.reason}</p>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold text-foreground">{claim.amount}</p>
                <button 
                  className="text-sm text-primary hover:underline mt-1"
                  onClick={() => navigate(`/digital-portal/claim/${claim.id}`)}
                >
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="glass-card p-6">
        <h2 className="text-xl font-bold text-foreground mb-4">Quick Stats</h2>
        <div className="grid grid-cols-3 gap-4">
          {quickStats.map((stat, i) => (
            <div key={i} className={cn("rounded-xl p-4 text-center", stat.bgColor)}>
              <p className={cn("text-2xl font-bold", stat.textColor)}>{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ClaimHistory;
