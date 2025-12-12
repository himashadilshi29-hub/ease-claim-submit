import { Globe, Zap, Clock, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LandingPageProps {
  onSubmitClaim: () => void;
}

const LandingPage = ({ onSubmitClaim }: LandingPageProps) => {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-bold text-foreground">Janashakthi</h1>
              <p className="text-xs text-muted-foreground">Smart Claims System</p>
            </div>
          </div>
          <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <Globe className="w-4 h-4" />
            <span>English</span>
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-16 min-h-[60vh] flex items-center gradient-hero overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-10 w-32 h-32 border-4 border-primary-foreground/20 rounded-full" />
          <div className="absolute top-40 left-20 w-16 h-16 bg-primary-foreground/10 rounded-lg rotate-45" />
          <div className="absolute bottom-20 right-20 w-24 h-24 border-4 border-primary-foreground/20 rounded-full" />
          <div className="absolute top-32 right-40 text-primary-foreground/20 text-6xl">✦</div>
          <div className="absolute bottom-32 left-1/4 text-primary-foreground/20 text-4xl">✦</div>
        </div>

        <div className="container mx-auto px-4 py-20 text-center relative z-10">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-primary-foreground mb-6 animate-fade-in">
            Janashakthi Smart Claims
          </h1>
          <p className="text-lg md:text-xl text-primary-foreground/90 max-w-2xl mx-auto mb-10 animate-fade-in">
            Submit and track your claims with AI-powered document verification. Fast, secure, and simple.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in">
            <Button 
              size="xl" 
              onClick={onSubmitClaim} 
              className="bg-white text-primary hover:bg-white/90 shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 font-bold rounded-full px-8"
            >
              Submit New Claim
            </Button>
            <Button variant="heroOutline" size="xl" className="rounded-full">
              Digital Portal
            </Button>
          </div>
        </div>
      </section>

      {/* Portal Selection */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-foreground mb-12">
            Choose Your Portal
          </h2>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <PortalCard
              icon={<Shield className="w-8 h-8" />}
              title="Branch Portal"
              subtitle="For branch staff and walk-in customers"
              description="Submit claims at your nearest branch with assisted document verification"
              buttonText="Access Portal"
              onClick={onSubmitClaim}
            />
            <PortalCard
              icon={<Zap className="w-8 h-8" />}
              title="Digital Portal"
              subtitle="For mobile and online submissions"
              description="Submit and track claims anytime, anywhere through our digital platform"
              buttonText="Login Now"
            />
            <PortalCard
              icon={<Clock className="w-8 h-8" />}
              title="Admin View"
              subtitle="For administrators and staff"
              description="Review and manage all claims with comprehensive analytics and reporting"
              buttonText="Admin Login"
            />
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-muted/50 border-t border-border">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto text-center">
            <StatItem value="100%" label="AI-Powered Verification" />
            <StatItem value="24/7" label="Available Anytime" />
            <StatItem value="3" label="Languages Supported" />
            <StatItem value="Fast" label="Quick Processing" />
          </div>
        </div>
      </section>
    </div>
  );
};

interface PortalCardProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  description: string;
  buttonText: string;
  onClick?: () => void;
}

const PortalCard = ({ icon, title, subtitle, description, buttonText, onClick }: PortalCardProps) => (
  <div className="glass-card p-6 flex flex-col hover-lift">
    <div className="w-14 h-14 rounded-xl bg-secondary flex items-center justify-center text-primary mb-4 mx-auto">
      {icon}
    </div>
    <h3 className="text-xl font-bold text-foreground text-center mb-1">{title}</h3>
    <p className="text-sm text-muted-foreground text-center mb-4">{subtitle}</p>
    <p className="text-sm text-muted-foreground text-center mb-6 flex-1">{description}</p>
    <Button variant="hero" className="w-full" onClick={onClick}>
      {buttonText}
    </Button>
  </div>
);

const StatItem = ({ value, label }: { value: string; label: string }) => (
  <div>
    <p className="text-3xl md:text-4xl font-bold text-primary mb-2">{value}</p>
    <p className="text-sm text-muted-foreground">{label}</p>
  </div>
);

export default LandingPage;
