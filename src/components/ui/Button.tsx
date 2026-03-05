"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", loading, disabled, children, ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center justify-center gap-2 font-semibold rounded-lg transition-all whitespace-nowrap cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed active:translate-y-px";

    const variants = {
      primary: "bg-brand-primary text-white hover:opacity-90 shadow-sm",
      secondary: "bg-red-600 text-white hover:bg-red-700 shadow-sm",
      outline: "border-2 border-gray-300 bg-white text-gray-700 hover:border-brand-primary hover:text-brand-primary",
      ghost: "text-gray-600 hover:bg-gray-100",
      danger: "bg-red-50 text-red-600 border border-red-200 hover:bg-red-100",
    };

    const sizes = {
      sm: "px-3 py-1.5 text-xs",
      md: "px-4 py-2 text-sm",
      lg: "px-6 py-3 text-base",
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

export default Button;
