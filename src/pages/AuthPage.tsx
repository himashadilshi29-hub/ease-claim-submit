import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Shield, Building, User, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import LanguageSelector from "@/components/shared/LanguageSelector";
import { useLanguage } from "@/lib/i18n";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { z } from "zod";

type PortalType = "admin" | "branch" | "customer";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required").max(255),
  password: z.string().min(1, "Password is required").max(100),
});

// Demo credentials - only available in development mode
const DEMO_CREDENTIALS: Record<string, { password: string; portal: PortalType; email: string }> = 
  import.meta.env.DEV ? {
    customer: { password: "customer123", portal: "customer", email: "customer@insurance.lk" },
    staff: { password: "staff123", portal: "branch", email: "staff@insurance.lk" },
    admin: { password: "admin123", portal: "admin", email: "admin@insurance.lk" },
  } : {};

const AuthPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const portalParam = searchParams.get("portal") as PortalType | null;

  const { t } = useLanguage();
  const { signIn, user, portal: userPortal, loading } = useAuth();

  const [isLoading, setIsLoading] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // Redirect if already logged in
  useEffect(() => {
    if (!loading && user && userPortal) {
      redirectToPortal(userPortal);
    }
  }, [user, userPortal, loading]);

  const redirectToPortal = (portalType: PortalType) => {
    switch (portalType) {
      case "admin":
        navigate("/admin");
        break;
      case "branch":
        navigate("/branch");
        break;
      case "customer":
        navigate("/digital-portal");
        break;
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      loginSchema.parse({ username, password });
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast.error(err.errors[0].message);
        return;
      }
    }

    // Check if it's a demo credential (only in dev mode)
    const demoUser = DEMO_CREDENTIALS[username.toLowerCase()];
    if (demoUser && password === demoUser.password) {
      setIsLoading(true);
      const { error } = await signIn(demoUser.email, demoUser.password);
      setIsLoading(false);

      if (error) {
        toast.error("Authentication failed. Please try again.");
        return;
      }

      toast.success(t.authLoginSuccess || "Login successful!");
      return;
    }

    // Regular email login
    setIsLoading(true);
    const { error } = await signIn(username, password);
    setIsLoading(false);

    if (error) {
      if (error.message.includes("Invalid login credentials")) {
        toast.error(t.authInvalidCredentials || "Invalid username or password");
      } else {
        toast.error("Authentication failed. Please try again.");
      }
      return;
    }

    toast.success(t.authLoginSuccess || "Login successful!");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const isDev = import.meta.env.DEV;

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-green-100 via-background to-orange-100" />
      <div className="absolute top-0 left-0 w-1/2 h-full bg-gradient-to-br from-green-200/50 to-transparent" />
      <div className="absolute bottom-0 right-0 w-1/2 h-full bg-gradient-to-tl from-orange-200/50 to-transparent" />

      {/* Top Bar with Language Selector */}
      <div className="absolute top-4 right-4 z-10">
        <LanguageSelector variant="light" />
      </div>

      {/* Login Card */}
      <main className="relative z-10 min-h-screen flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="bg-card/80 backdrop-blur-sm rounded-3xl shadow-xl p-8 text-center border border-border/50">
            {/* Shield Icon */}
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center mx-auto mb-6 shadow-lg">
              <Shield className="w-10 h-10 text-white" />
            </div>

            <h1 className="text-2xl font-bold text-foreground mb-2">
              Welcome Back
            </h1>
            <p className="text-muted-foreground mb-8">
              Sign in to access your portal
            </p>

            <form onSubmit={handleLogin} className="space-y-5 text-left">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-foreground font-medium">
                  Username
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="username"
                    type="text"
                    placeholder="Enter username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-10 h-12 rounded-xl border-border/50 bg-background/50"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-foreground font-medium">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 h-12 rounded-xl border-border/50 bg-background/50"
                    required
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 rounded-xl text-base font-semibold bg-gradient-to-r from-orange-500 to-amber-400 hover:from-orange-600 hover:to-amber-500 text-white shadow-lg" 
                disabled={isLoading}
              >
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>
            </form>

            {/* Demo Credentials - Only show in development */}
            {isDev && (
              <div className="mt-8 p-4 bg-muted/50 rounded-xl text-left">
                <p className="text-sm font-semibold text-foreground mb-3">Demo Credentials (Dev Only):</p>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      <span className="font-mono">customer</span> / <span className="font-mono">customer123</span> → Digital Portal
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Building className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      <span className="font-mono">staff</span> / <span className="font-mono">staff123</span> → Branch Portal
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      <span className="font-mono">admin</span> / <span className="font-mono">admin123</span> → Admin Portal
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default AuthPage;