import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, Search, Download, Filter, User } from "lucide-react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Navbar from "@/components/shared/Navbar";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n";
import { motion } from "framer-motion";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const { t } = useLanguage();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username && password) {
      setIsLoggedIn(true);
    }
  };

  // Login Screen
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar variant="gradient" />
        
        <main className="container mx-auto px-4 py-16 flex items-center justify-center min-h-[calc(100vh-80px)]">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md"
          >
            <div className="glass-card p-8 text-center">
              {/* Orange Circle Icon */}
              <div className="w-16 h-16 rounded-full gradient-primary mx-auto mb-6 flex items-center justify-center">
                <User className="w-8 h-8 text-white" />
              </div>
              
              <h1 className="text-2xl font-bold text-foreground mb-2">
                {t.adminLogin}
              </h1>
              <p className="text-muted-foreground mb-6">
                {t.adminLoginSubtitle}
              </p>
              
              <form onSubmit={handleLogin} className="space-y-4 text-left">
                <div className="space-y-2">
                  <Label htmlFor="username">{t.username}</Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder={t.enterUsername}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password">{t.password}</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder={t.enterPassword}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                
                <Button type="submit" className="w-full" variant="hero">
                  {t.login}
                </Button>
              </form>
            </div>
          </motion.div>
        </main>
      </div>
    );
  }

  const stats = [
    { label: "Total Claims", value: "245", subtitle: "+12% from last month", color: "text-primary" },
    { label: "High Risk", value: "8", subtitle: "Require immediate review", color: "text-destructive" },
    { label: "Fraud Alerts", value: "12", subtitle: "Flagged for verification", color: "text-primary" },
    { label: "Avg Risk Score", value: "28", subtitle: "Low risk overall", color: "text-success" },
  ];

  const metrics = [
    {
      title: "OCR Accuracy",
      value: "94.2%",
      valueColor: "text-primary",
      subtitle: "Average document recognition rate",
      items: [
        { label: "High Confidence", value: "187 claims" },
        { label: "Medium Confidence", value: "45 claims" },
        { label: "Low Confidence", value: "13 claims" },
      ],
    },
    {
      title: "Fraud Detection",
      value: "12 Alerts",
      valueColor: "text-destructive",
      subtitle: "AI-powered fraud patterns detected",
      items: [
        { label: "Duplicate Claims", value: "3" },
        { label: "Suspicious Patterns", value: "5" },
        { label: "Document Issues", value: "4" },
      ],
    },
    {
      title: "Processing Speed",
      value: "2.3 mins",
      valueColor: "text-success",
      subtitle: "Average claim processing time",
      items: [
        { label: "Auto-Approved", value: "198 (80.8%)" },
        { label: "Manual Review", value: "35 (14.3%)" },
        { label: "Time Saved", value: "89%" },
      ],
    },
  ];

  const claims = [
    {
      id: "CR123456",
      customer: "John Perera",
      nic: "123458789V",
      type: "OPD",
      amount: "LKR 45,000",
      riskScore: { value: 32, level: "medium" },
      fraudCheck: { status: "clean", flags: 0 },
      ocr: { confidence: 95, level: "high" },
      status: "processing",
    },
    {
      id: "CR123455",
      customer: "Nadeesha Silva",
      nic: "987654321V",
      type: "OPD",
      amount: "LKR 12,500",
      riskScore: { value: 15, level: "low" },
      fraudCheck: { status: "clean", flags: 0 },
      ocr: { confidence: 98, level: "high" },
      status: "approved",
    },
    {
      id: "CR123454",
      customer: "Kamal Fernando",
      nic: "456789123V",
      type: "OPD",
      amount: "LKR 75,000",
      riskScore: { value: 68, level: "high" },
      fraudCheck: { status: "flagged", flags: 2 },
      ocr: { confidence: 67, level: "medium" },
      status: "manual-review",
    },
    {
      id: "CR123453",
      customer: "Saman Kumara",
      nic: "789123456V",
      type: "OPD",
      amount: "LKR 8,500",
      riskScore: { value: 89, level: "high" },
      fraudCheck: { status: "flagged", flags: 3 },
      ocr: { confidence: 45, level: "low" },
      status: "rejected",
    },
    {
      id: "CR123452",
      customer: "Nimal Perera",
      nic: "321654987V",
      type: "OPD",
      amount: "LKR 125,000",
      riskScore: { value: 25, level: "low" },
      fraudCheck: { status: "clean", flags: 0 },
      ocr: { confidence: 96, level: "high" },
      status: "approved",
    },
  ];

  const getRiskBadge = (score: number, level: string) => {
    const colors = {
      low: "bg-green-100 text-green-700",
      medium: "bg-amber-100 text-amber-700",
      high: "bg-red-100 text-red-700",
    };
    return (
      <span className={cn("px-2 py-1 rounded-full text-xs font-medium", colors[level as keyof typeof colors])}>
        {level.charAt(0).toUpperCase() + level.slice(1)} ({score})
      </span>
    );
  };

  const getFraudBadge = (status: string, flags: number) => {
    if (status === "clean") {
      return <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">Clean</span>;
    }
    return <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">{flags} Flag(s)</span>;
  };

  const getOcrBadge = (confidence: number, level: string) => {
    const colors = {
      low: "bg-red-100 text-red-700",
      medium: "bg-amber-100 text-amber-700",
      high: "bg-green-100 text-green-700",
    };
    return (
      <span className={cn("px-2 py-1 rounded-full text-xs font-medium", colors[level as keyof typeof colors])}>
        {level.charAt(0).toUpperCase() + level.slice(1)} ({confidence}%)
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      approved: "bg-green-100 text-green-700",
      processing: "bg-amber-100 text-amber-700",
      "manual-review": "bg-gray-100 text-gray-700",
      rejected: "bg-red-100 text-red-700",
    };
    const labels = {
      approved: "Approved",
      processing: "Processing",
      "manual-review": "Manual Review",
      rejected: "Rejected",
    };
    return (
      <span className={cn("px-2 py-1 rounded-full text-xs font-medium", styles[status as keyof typeof styles])}>
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar variant="gradient" showLogout onLogout={() => navigate("/")} />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            Admin Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage and review all claims
          </p>
        </div>

        {/* Top Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {stats.map((stat, i) => (
            <div key={i} className="glass-card p-4">
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className={cn("text-3xl font-bold mt-1", stat.color)}>{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{stat.subtitle}</p>
            </div>
          ))}
        </div>

        {/* Metrics Row */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          {metrics.map((metric, i) => (
            <div key={i} className="glass-card p-4">
              <h3 className="font-semibold text-foreground">{metric.title}</h3>
              <p className={cn("text-2xl font-bold mt-2", metric.valueColor)}>{metric.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{metric.subtitle}</p>
              <div className="mt-4 space-y-2">
                {metric.items.map((item, j) => (
                  <div key={j} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className="text-foreground font-medium">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Claims Table */}
        <div className="glass-card p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div>
              <h2 className="text-xl font-bold text-foreground">All Claims</h2>
              <p className="text-sm text-muted-foreground">Review and manage submitted claims</p>
            </div>
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search by Claim ID, Customer, or NIC" className="pl-9" />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon">
                <Download className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Claim ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Risk Score</TableHead>
                  <TableHead>Fraud Check</TableHead>
                  <TableHead>OCR</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {claims.map((claim) => (
                  <TableRow key={claim.id}>
                    <TableCell className="font-medium">{claim.id}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{claim.customer}</p>
                        <p className="text-xs text-muted-foreground">{claim.nic}</p>
                      </div>
                    </TableCell>
                    <TableCell>{claim.type}</TableCell>
                    <TableCell>{claim.amount}</TableCell>
                    <TableCell>{getRiskBadge(claim.riskScore.value, claim.riskScore.level)}</TableCell>
                    <TableCell>{getFraudBadge(claim.fraudCheck.status, claim.fraudCheck.flags)}</TableCell>
                    <TableCell>{getOcrBadge(claim.ocr.confidence, claim.ocr.level)}</TableCell>
                    <TableCell>{getStatusBadge(claim.status)}</TableCell>
                    <TableCell>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => navigate(`/admin/claim/${claim.id}`)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
