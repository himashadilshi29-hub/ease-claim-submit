import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Navbar from "@/components/shared/Navbar";
import ClaimHistory from "@/components/portal/ClaimHistory";
import NewClaimWizard from "@/components/portal/NewClaimWizard";

const DigitalPortal = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [nic, setNic] = useState("");
  const [activeTab, setActiveTab] = useState("my-claims");
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (nic.trim()) {
      setIsLoggedIn(true);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar variant="gradient" />
        
        <main className="container mx-auto px-4 py-16 flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md"
          >
            <div className="glass-card p-8 text-center">
              <div className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center mx-auto mb-6">
                <LogIn className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-2">
                Digital Portal Login
              </h1>
              <p className="text-muted-foreground mb-6">
                Enter your NIC to access your account
              </p>

              <form onSubmit={handleLogin} className="space-y-4">
                <div className="text-left">
                  <Label htmlFor="nic">National Identity Card (NIC)</Label>
                  <Input
                    id="nic"
                    placeholder="Enter your NIC (e.g., 123456789V)"
                    value={nic}
                    onChange={(e) => setNic(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <Button type="submit" variant="hero" className="w-full">
                  Login
                </Button>
              </form>

              <p className="text-xs text-muted-foreground mt-4">
                By logging in, you agree to our Terms of Service and Privacy Policy
              </p>
            </div>
          </motion.div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar variant="gradient" showLogout onLogout={() => setIsLoggedIn(false)} />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            Digital Portal
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your claims online
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2 mb-8">
            <TabsTrigger value="my-claims">My Claims</TabsTrigger>
            <TabsTrigger value="new-claim">New Claim</TabsTrigger>
          </TabsList>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <TabsContent value="my-claims" className="mt-0">
                <ClaimHistory />
              </TabsContent>
              <TabsContent value="new-claim" className="mt-0">
                <NewClaimWizard onComplete={() => setActiveTab("my-claims")} />
              </TabsContent>
            </motion.div>
          </AnimatePresence>
        </Tabs>
      </main>
    </div>
  );
};

export default DigitalPortal;
