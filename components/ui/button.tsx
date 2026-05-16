"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full border text-sm font-semibold transition-[transform,background,border-color,color,box-shadow] duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#020511] disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[linear-gradient(135deg,rgba(93,218,255,0.24),rgba(122,124,255,0.18))] text-white shadow-[0_18px_48px_rgba(17,120,255,0.16)] hover:border-cyan-200/35 hover:shadow-[0_18px_52px_rgba(68,180,255,0.22)]",
        outline:
          "border-cyan-300/18 bg-white/[0.03] text-slate-100 hover:border-cyan-200/36 hover:bg-white/[0.07]",
        ghost:
          "border-transparent bg-transparent text-slate-300 hover:border-cyan-300/18 hover:bg-white/[0.05] hover:text-white",
      },
      size: {
        default: "h-11 px-5",
        sm: "h-9 px-4 text-xs",
        lg: "h-12 px-6 text-sm",
        icon: "size-10 rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size }), className)}
        ref={ref}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";

export { Button, buttonVariants };
