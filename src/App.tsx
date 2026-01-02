import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import DigitalPortal from "./pages/DigitalPortal";
import AdminDashboard from "./pages/AdminDashboard";
import AdminClaimReview from "./pages/AdminClaimReview";
import ClaimDetails from "./pages/ClaimDetails";
import BranchPortal from "./pages/BranchPortal";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/digital-portal" element={<DigitalPortal />} />
          <Route path="/digital-portal/claim/:claimId" element={<ClaimDetails />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/claim/:claimId" element={<AdminClaimReview />} />
          <Route path="/branch" element={<BranchPortal />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
