import { forwardRef } from "react";
import { Shield } from "lucide-react";
import { cn } from "@/lib/utils";

interface LogoProps {
  variant?: "light" | "dark";
  className?: string;
  onClick?: () => void;
}

const Logo = forwardRef<HTMLDivElement, LogoProps>(
  ({ variant = "light", className, onClick }, ref) => {
    const isDark = variant === "dark";

    return (
      <div
        ref={ref}
        className={cn("flex items-center gap-3 cursor-pointer", className)}
        onClick={onClick}
      >
        <div
          className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center",
            isDark ? "bg-primary" : "gradient-primary"
          )}
        >
          <Shield
            className={cn(
              "w-5 h-5",
              isDark ? "text-primary-foreground" : "text-white"
            )}
          />
        </div>
        <div>
          <h1
            className={cn(
              "font-bold text-base",
              isDark ? "text-primary-foreground" : "text-foreground"
            )}
          >
            Janashakthi
          </h1>
          <p
            className={cn(
              "text-xs",
              isDark ? "text-primary-foreground/70" : "text-muted-foreground"
            )}
          >
            Smart Claims System
          </p>
        </div>
      </div>
    );
  }
);

Logo.displayName = "Logo";

export default Logo;
