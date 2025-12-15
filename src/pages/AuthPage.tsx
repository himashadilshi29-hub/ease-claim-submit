import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { LogIn, UserPlus, Shield, Building, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Navbar from "@/components/shared/Navbar";
import LanguageSelector from "@/components/shared/LanguageSelector";
import Logo from "@/components/shared/Logo";
import { useLanguage } from "@/lib/i18n";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { z } from "zod";

type PortalType = "admin" | "branch" | "customer";

const loginSchema = z.object({
  email: z.string().email("Invalid email address").max(255),
  password: z.string().min(6, "Password must be at least 6 characters").max(100),
});

const signupSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Invalid email address").max(255),
  password: z.string().min(6, "Password must be at least 6 characters").max(100),
  nic: z.string().optional(),
});

const AuthPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const portalParam = searchParams.get("portal") as PortalType | null;
  const portal: PortalType = portalParam && ["admin", "branch", "customer"].includes(portalParam) 
    ? portalParam 
    : "customer";

  const { t } = useLanguage();
  const { signIn, signUp, user, portal: userPortal, loading } = useAuth();

  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"login" | "signup">("login");

  // Login form
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Signup form
  const [signupFullName, setSignupFullName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupNic, setSignupNic] = useState("");

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
      loginSchema.parse({ email: loginEmail, password: loginPassword });
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast.error(err.errors[0].message);
        return;
      }
    }

    setIsLoading(true);
    const { error } = await signIn(loginEmail, loginPassword);
    setIsLoading(false);

    if (error) {
      if (error.message.includes("Invalid login credentials")) {
        toast.error(t.authInvalidCredentials || "Invalid email or password");
      } else {
        toast.error(error.message);
      }
      return;
    }

    toast.success(t.authLoginSuccess || "Login successful!");
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      signupSchema.parse({
        fullName: signupFullName,
        email: signupEmail,
        password: signupPassword,
        nic: signupNic,
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast.error(err.errors[0].message);
        return;
      }
    }

    setIsLoading(true);
    const { error } = await signUp(signupEmail, signupPassword, signupFullName, portal, signupNic);
    setIsLoading(false);

    if (error) {
      if (error.message.includes("already registered")) {
        toast.error(t.authEmailExists || "This email is already registered. Please login instead.");
      } else {
        toast.error(error.message);
      }
      return;
    }

    toast.success(t.authSignupSuccess || "Account created successfully!");
  };

  const getPortalInfo = () => {
    switch (portal) {
      case "admin":
        return {
          icon: Shield,
          title: t.adminLogin,
          subtitle: t.adminLoginSubtitle,
          color: "text-primary",
          bgColor: "gradient-primary",
        };
      case "branch":
        return {
          icon: Building,
          title: t.branchLogin || "Branch Portal Login",
          subtitle: t.branchLoginSubtitle || "For branch staff only",
          color: "text-primary",
          bgColor: "gradient-primary",
        };
      default:
        return {
          icon: User,
          title: t.customerLogin || "Customer Portal Login",
          subtitle: t.customerLoginSubtitle || "Access your insurance claims",
          color: "text-primary",
          bgColor: "gradient-primary",
        };
    }
  };

  const portalInfo = getPortalInfo();
  const PortalIcon = portalInfo.icon;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="bg-gradient-to-r from-orange-500 to-amber-400 sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Logo variant="dark" onClick={() => navigate("/")} />
          <LanguageSelector variant="dark" />
        </div>
      </nav>

      <main className="container mx-auto px-4 py-16 flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="glass-card p-8 text-center">
            {/* Portal Icon */}
            <div className={`w-16 h-16 rounded-full ${portalInfo.bgColor} flex items-center justify-center mx-auto mb-6`}>
              <PortalIcon className="w-8 h-8 text-white" />
            </div>

            <h1 className="text-2xl font-bold text-foreground mb-2">
              {portalInfo.title}
            </h1>
            <p className="text-muted-foreground mb-6">
              {portalInfo.subtitle}
            </p>

            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "login" | "signup")} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login" className="flex items-center gap-2">
                  <LogIn className="w-4 h-4" />
                  {t.login}
                </TabsTrigger>
                <TabsTrigger value="signup" className="flex items-center gap-2">
                  <UserPlus className="w-4 h-4" />
                  {t.signup || "Sign Up"}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4 text-left">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">{t.email || "Email"}</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder={t.enterEmail || "Enter your email"}
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="login-password">{t.password}</Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder={t.enterPassword}
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                    />
                  </div>

                  <Button type="submit" className="w-full" variant="hero" disabled={isLoading}>
                    {isLoading ? (t.loggingIn || "Logging in...") : t.login}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignup} className="space-y-4 text-left">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">{t.fullName || "Full Name"}</Label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder={t.enterFullName || "Enter your full name"}
                      value={signupFullName}
                      onChange={(e) => setSignupFullName(e.target.value)}
                      required
                    />
                  </div>

                  {portal === "customer" && (
                    <div className="space-y-2">
                      <Label htmlFor="signup-nic">{t.nic || "NIC Number"}</Label>
                      <Input
                        id="signup-nic"
                        type="text"
                        placeholder={t.enterNic || "Enter your NIC (e.g., 123456789V)"}
                        value={signupNic}
                        onChange={(e) => setSignupNic(e.target.value)}
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="signup-email">{t.email || "Email"}</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder={t.enterEmail || "Enter your email"}
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-password">{t.password}</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder={t.createPassword || "Create a password"}
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      required
                    />
                  </div>

                  <Button type="submit" className="w-full" variant="hero" disabled={isLoading}>
                    {isLoading ? (t.creatingAccount || "Creating account...") : (t.createAccount || "Create Account")}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            <p className="text-xs text-muted-foreground mt-6">
              {t.authTerms || "By continuing, you agree to our Terms of Service and Privacy Policy"}
            </p>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default AuthPage;
