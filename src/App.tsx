import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider } from "@/lib/i18n";
import { AuthProvider } from "@/hooks/useAuth";
import LandingPage from "./pages/LandingPage";
import DigitalPortal from "./pages/DigitalPortal";
import AdminDashboard from "./pages/AdminDashboard";
import AdminClaimReview from "./pages/AdminClaimReview";
import ClaimDetails from "./pages/ClaimDetails";
import BranchPortal from "./pages/BranchPortal";
import AuthPage from "./pages/AuthPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/digital-portal" element={<DigitalPortal />} />
              <Route path="/digital-portal/claim/:claimId" element={<ClaimDetails />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/claim/:claimId" element={<AdminClaimReview />} />
              <Route path="/branch" element={<BranchPortal />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
