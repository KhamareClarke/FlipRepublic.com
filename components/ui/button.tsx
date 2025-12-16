import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (
      <button
        className={cn(
          "inline-flex items-center justify-center font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg",
          {
            "bg-gradient-gold text-black hover:shadow-lg hover:shadow-gold/50 active:scale-95 hover:scale-105": variant === "primary",
            "bg-white text-black hover:bg-gray-100 active:scale-95": variant === "secondary",
            "border-2 border-gold text-gold hover:bg-gold hover:text-black active:scale-95 hover:shadow-lg hover:shadow-gold/30": variant === "outline",
            "text-gold hover:text-gold-light": variant === "ghost",
          },
          {
            "px-4 py-2 text-sm": size === "sm",
            "px-6 py-3 text-base": size === "md",
            "px-8 py-4 text-lg tracking-wide": size === "lg",
          },
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";

export { Button };
